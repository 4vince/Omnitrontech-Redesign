import { THREE, COLOR, seg, easeOut, easeInOut, window01 } from "./kit.js";
import { box, merge, rbox, grid, envelopeGlyph, gridGlyph, bustGlyph, pageGlyph, cardGlyph } from "./shapes.js";

/**
 * AI Agents: an AI processor on a board of tools.
 *
 * The agent is a processor package at the centre of a circuit board. Its
 * approved tools are cartridges in sockets along the board (email,
 * calendar, customer records, documents). A task card settles onto the
 * processor; traces carry the work to each tool in turn and a row of step
 * lights ticks teal. The next step, payments, sits inside a sealed
 * hardware enclosure: the trace stops red at its wall and the processor
 * asks for approval. A person's amber security key slides into the port,
 * the enclosure opens teal, and the task completes. No people, no text.
 */

export const story = {
  cycle: 14,
  marks: [0, 3.2, 6.8, 9.6],
};

const PI = Math.PI;
const CHIP = { x: -0.55, z: 0.55 };
const TOOLS = [
  { x: -2.6, z: -0.75, ry: 0.35, glyph: () => envelopeGlyph(1.05) },
  { x: -1.45, z: -1.15, ry: 0.15, glyph: () => gridGlyph(1.1) },
  { x: -0.25, z: -1.2, ry: 0, glyph: () => bustGlyph(1.25) },
  { x: 0.9, z: -1.0, ry: -0.15, glyph: () => pageGlyph(1.05) },
];
const VAULT = { x: 2.35, z: 0.2, w: 1.35, h: 1.15, d: 1.2 };
const PORT = { x: VAULT.x - 0.25, y: 0.32, z: VAULT.z + VAULT.d / 2 };
const STEPS_Z = 1.75;

// Beats.
const GOAL = [0.5, 2.0];
const TOOL_AT = [3.3, 4.1, 4.9, 5.7];
const TOOL_LEN = 0.95;
const LIMIT = [7.0, 7.5];
const ASK = [7.9, 8.5];
const KEY = [9.7, 10.3];
const OPEN = [10.4, 10.8];
const PAY = [10.8, 11.3];
const DONE = 11.5;
const OUT = 13.2;

/** A tool cartridge in its socket, facing +z; origin at the socket's base centre. */
function cartridgeGeo() {
  const parts = [
    rbox(1.0, 0.14, 0.3, 0, 0, 0, 0.02),
    rbox(0.86, 0.74, 0.07, 0, 0.12, 0, 0.015),
    ...grid(12, 1, 0.035, 0.05, 0.062, 0, -0.34, 0.15, 0.045, 0.008),
  ];
  for (let i = 0; i < 7; i += 1) parts.push(box(0.84, 0.012, 0.09, 0, 0.3 + i * 0.075, -0.075));
  return merge(parts);
}
const cartLedGeo = () => merge([0, 1, 2].map((i) => box(0.05, 0.025, 0.01, -0.36 + i * 0.07, 0.05, 0.155)));

/** The processor package: substrate, components around it, heat spreader; origin at the board. */
function chipGeo() {
  const parts = [rbox(1.5, 0.06, 1.5, 0, 0, 0, 0.02), rbox(1.08, 0.08, 1.08, 0, 0.06, 0, 0.03)];
  for (let i = 0; i < 8; i += 1) {
    const u = -0.6 + i * 0.17;
    parts.push(box(0.07, 0.03, 0.04, u, 0.06, 0.68), box(0.07, 0.03, 0.04, u, 0.06, -0.68), box(0.04, 0.03, 0.07, 0.68, 0.06, u), box(0.04, 0.03, 0.07, -0.68, 0.06, u));
  }
  return merge(parts);
}
// The die's cores: a 4×4 grid on the heat spreader.
const coresGeo = () => merge(grid(4, 4, 0.18, 0.18, 0.22, 0.22, -0.33, -0.33, 0, 0.02).map((g) => g.rotateX(-PI / 2).translate(0, 0.15, 0)));

export function build(kit) {
  const { scene, camera, holo, line, points, segments, mix } = kit;
  const root = new THREE.Group();
  scene.add(root);

  /* The circuit board: a bevelled slab, mounting holes, fine traces */
  const board = holo(merge([rbox(6.6, 0.08, 3.9, 0.05, -0.08, 0.2, 0.04), ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => new THREE.CylinderGeometry(0.08, 0.08, 0.02, 20).translate(0.05 + sx * 3.05, 0.0, 0.2 + sz * 1.7)))]), {
    color: COLOR.ice,
    face: 0.04,
    edge: 0.5,
    level: 0.6,
    occlude: false,
    threshold: 30,
  });
  const fine = [];
  for (let i = 0; i < 18; i += 1) {
    const z = -1.55 + i * 0.2;
    const x0 = -3.1 + (i % 3) * 0.2;
    const x1 = -1.6 - (i % 4) * 0.25;
    fine.push([[x0, 0.004, z], [x1, 0.004, z]], [[x1, 0.004, z], [x1 + 0.15, 0.004, z + 0.15]]);
    const xr = 3.1 - (i % 3) * 0.15;
    fine.push([[xr, 0.004, z], [xr - 0.5 - (i % 2) * 0.3, 0.004, z]]);
  }
  const fineLines = segments(fine, { color: COLOR.cobalt, level: 0.18 });
  root.add(board.group, fineLines.object);

  /* The processor */
  const chip = holo(chipGeo().translate(CHIP.x, 0, CHIP.z), { color: COLOR.cobalt, face: 0.1, level: 0.8, threshold: 30 });
  const cores = holo(coresGeo().translate(CHIP.x, 0, CHIP.z), { color: COLOR.cobalt, face: 0.9, edge: 0.5, level: 0.35, occlude: false });
  root.add(chip.group, cores.group);

  /* Step lights along the front edge: one per step, ticking teal */
  const steps = [0, 1, 2, 3, 4].map((i) => {
    const h = holo(rbox(0.22, 0.04, 0.12, -1.55 + i * 0.36, 0, STEPS_Z, 0.015), { color: COLOR.cobalt, face: 0.6, level: 0.4 });
    root.add(h.group);
    return h;
  });

  /* Tool cartridges */
  const tools = TOOLS.map((tl) => {
    const g = new THREE.Group();
    g.position.set(tl.x, 0, tl.z);
    g.rotation.y = tl.ry;
    const cart = holo(cartridgeGeo(), { color: COLOR.cobalt, face: 0.1, level: 0.7, threshold: 30 });
    const glyph = holo(tl.glyph().translate(0, 0.56, 0.05), { color: COLOR.ice, face: 0.25, level: 0.6, threshold: 30, occlude: false });
    const led = holo(cartLedGeo(), { color: COLOR.ice, face: 1.2, edge: 0, level: 0.35, occlude: false });
    g.add(cart.group, glyph.group, led.group);
    root.add(g);
    return { ...tl, g, cart, glyph, led };
  });

  /* Payments: a cartridge inside a sealed hardware enclosure with a key port */
  const payG = new THREE.Group();
  payG.position.set(VAULT.x, 0, VAULT.z - 0.15);
  payG.rotation.y = -0.2;
  const payCart = holo(cartridgeGeo(), { color: COLOR.cobalt, face: 0.1, level: 0.5, threshold: 30 });
  const payGlyph = holo(cardGlyph(1.1).translate(0, 0.62, 0.05), { color: COLOR.ice, face: 0.25, level: 0.45, threshold: 30, occlude: false });
  const payLed = holo(cartLedGeo(), { color: COLOR.ice, face: 1.2, edge: 0, level: 0.3, occlude: false });
  payG.add(payCart.group, payGlyph.group, payLed.group);
  const { w: vw, h: vh, d: vd } = VAULT;
  const vaultFrame = holo(
    merge([
      rbox(vw + 0.08, 0.1, vd + 0.08, VAULT.x, 0, VAULT.z, 0.02),
      ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => box(0.06, vh, 0.06, VAULT.x + (sx * vw) / 2, 0.08, VAULT.z + (sz * vd) / 2))),
      rbox(0.3, 0.16, 0.05, PORT.x, PORT.y - 0.08, PORT.z + 0.01, 0.015),
    ]),
    { color: COLOR.ice, face: 0.08, level: 0.7, threshold: 30 },
  );
  const glassGeo = merge([
    new THREE.PlaneGeometry(vw, vh).translate(VAULT.x, 0.08 + vh / 2, VAULT.z + vd / 2),
    new THREE.PlaneGeometry(vw, vh).translate(VAULT.x, 0.08 + vh / 2, VAULT.z - vd / 2),
    new THREE.PlaneGeometry(vd, vh).rotateY(PI / 2).translate(VAULT.x - vw / 2, 0.08 + vh / 2, VAULT.z),
    new THREE.PlaneGeometry(vd, vh).rotateY(PI / 2).translate(VAULT.x + vw / 2, 0.08 + vh / 2, VAULT.z),
  ]);
  const glass = holo(glassGeo, { color: COLOR.red, face: 0.22, edge: 0, level: 0.6, side: THREE.DoubleSide, occlude: false });
  // The lid lifts on its own when it opens.
  const lid = holo(rbox(vw + 0.08, 0.06, vd + 0.08, 0, 0, 0, 0.02), { color: COLOR.red, face: 0.05, level: 0.8, threshold: 30 });
  lid.group.position.set(VAULT.x, 0.08 + vh, VAULT.z);
  const portLight = holo(box(0.2, 0.025, 0.012, PORT.x, PORT.y + 0.04, PORT.z + 0.04), { color: COLOR.amber, face: 1.2, edge: 0, level: 0, occlude: false });
  root.add(payG, vaultFrame.group, glass.group, lid.group, portLight.group);

  /* The security key: a hardware key with a ring, sliding into the port */
  const key = holo(
    merge([
      rbox(0.16, 0.05, 0.34, 0, 0, 0.17, 0.02),
      new THREE.TorusGeometry(0.05, 0.016, 8, 20).rotateX(PI / 2).translate(0, 0.025, 0.4),
      box(0.1, 0.02, 0.14, 0, 0.015, -0.07),
      new THREE.CylinderGeometry(0.03, 0.03, 0.012, 16).translate(0, 0.055, 0.2),
    ]),
    { color: COLOR.amber, face: 0.7, level: 0, threshold: 30 },
  );
  root.add(key.group);

  /* The goal: a task card that settles onto the processor */
  const goal = holo(merge([rbox(0.7, 0.46, 0.02, 0, -0.23, 0, 0.02), box(0.32, 0.04, 0.01, -0.13, 0.13, 0.015), ...[0, 1, 2].map((i) => box(0.44, 0.03, 0.01, -0.02, 0.03 - i * 0.08, 0.015))]), {
    color: COLOR.ice,
    face: 0.35,
    level: 0,
    occlude: false,
  });
  root.add(goal.group);

  /* Traces from the processor: right-angled routes with a 45° jog */
  const Y = 0.012;
  const edge = (dx, dz) => [CHIP.x + dx, Y, CHIP.z + dz];
  const traceTo = (tl, i) => {
    const ex = -0.45 + i * 0.3;
    const sx = tl.x + Math.sin(tl.ry) * 0.17;
    const sz = tl.z + Math.cos(tl.ry) * 0.17;
    return [edge(ex, -0.76), [CHIP.x + ex, Y, CHIP.z - 1.0 + Math.abs(i - 1.5) * 0.06], [sx, Y, sz + 0.25], [sx, Y, sz]];
  };
  const tracePts = TOOLS.map(traceTo);
  const traces = tracePts.map((p) => {
    const ln = line(p, { color: COLOR.ice });
    const dim = segments(
      p.slice(1).map((q, j) => [p[j], q]),
      { color: COLOR.cobalt, level: 0.4 },
    );
    root.add(dim.object, ln.object);
    return { ln, dim };
  });
  const wallX = VAULT.x - vw / 2;
  const payPts = [edge(0.76, 0.0), [0.8, Y, CHIP.z], [1.15, Y, VAULT.z + 0.1], [wallX, Y, VAULT.z + 0.1], [VAULT.x - 0.1, Y, VAULT.z - 0.05]];
  const payTrace = line(payPts, { color: COLOR.ice });
  const payDim = segments(
    payPts.slice(1).map((q, j) => [payPts[j], q]),
    { color: COLOR.cobalt, level: 0.4 },
  );
  // Asking for approval: a trace from the processor to the key port.
  const askPts = [edge(0.76, 0.5), [1.3, Y, CHIP.z + 0.5], [PORT.x, Y, CHIP.z + 0.5], [PORT.x, Y, PORT.z + 0.05]];
  const askTrace = line(askPts, { color: COLOR.amber });
  const stepTrace = segments(
    [
      [edge(-0.4, 0.76), [CHIP.x - 0.4, Y, STEPS_Z - 0.1]],
      [[-1.55, Y, STEPS_Z - 0.1], [-0.11, Y, STEPS_Z - 0.1]],
    ],
    { color: COLOR.cobalt, level: 0.35 },
  );
  root.add(payDim.object, payTrace.object, askTrace.object, stepTrace.object);
  const sparks = points(2, { color: COLOR.ice, size: 1.0 });
  root.add(sparks.object);

  const v = new THREE.Vector3();
  const LIMIT_U = 0.68; // where the payments trace meets the enclosure wall

  function update(t, dt, clock) {
    const still = kit.still;
    const out = 1 - easeOut(seg(t, OUT, OUT + 0.8));
    const vis = easeOut(seg(t, 0, 0.6)) * out;
    const done = window01(t, DONE, OUT, 0.5);
    const blink = still ? 1 : 0.65 + 0.35 * Math.sin(clock * 7);
    const teal = (c, k = done) => (k > 0.01 ? mix(c, COLOR.teal, k) : c);

    board.set(0.6 * vis);
    fineLines.set(0.18 * vis);
    stepTrace.set(0.35 * vis);
    vaultFrame.set(0.7 * vis);

    /* The goal settles onto the processor */
    const gu = seg(t, GOAL[0], GOAL[1]);
    const settle = easeInOut(gu);
    goal.group.position.set(CHIP.x, 1.6 - settle * 1.3, CHIP.z + 0.1);
    goal.group.quaternion.copy(camera.quaternion);
    goal.group.scale.setScalar(1 - easeInOut(seg(t, GOAL[1] - 0.3, GOAL[1] + 0.3)) * 0.6);
    goal.set(Math.min(1, gu * 5) * (1 - seg(t, GOAL[1], GOAL[1] + 0.35)) * out);

    /* The processor: wakes with the goal, works, turns red at the limit */
    const awake = seg(t, GOAL[1] - 0.1, GOAL[1] + 0.3);
    const blocked = window01(t, LIMIT[1], KEY[1], 0.25);
    const work = Math.max(...TOOL_AT.map((a) => window01(t, a, a + TOOL_LEN, 0.2)), window01(t, PAY[0], PAY[1], 0.2));
    const pulse = still ? 1 : 0.8 + 0.2 * Math.sin(clock * 9);
    let coreColor = mix(COLOR.cobalt, COLOR.ice, awake * 0.35 + work * 0.3);
    if (blocked > 0.01) coreColor = mix(coreColor, COLOR.red, blocked);
    coreColor = teal(coreColor);
    cores.set((0.35 + awake * 0.4 + work * 0.35 * pulse + blocked * 0.3 * blink) * vis, coreColor);
    chip.set((0.8 + awake * 0.15) * vis, teal(COLOR.cobalt, done * 0.6));

    /* Each tool in turn: the trace carries the work, the cartridge lights, a step ticks */
    let sparkSet = false;
    tools.forEach((tl, i) => {
      const a = TOOL_AT[i];
      const u = easeInOut(seg(t, a, a + 0.45));
      const lit = window01(t, a + 0.35, a + TOOL_LEN, 0.2);
      const used = seg(t, a + TOOL_LEN - 0.1, a + TOOL_LEN + 0.2);
      traces[i].ln.show(u);
      traces[i].ln.set((0.9 * window01(t, a, a + TOOL_LEN, 0.2) + done * 0.6) * out, done > 0.01 ? COLOR.teal : COLOR.ice);
      if (done > 0.01) traces[i].ln.show(1);
      traces[i].dim.set(0.4 * vis);
      if (u > 0 && u < 1 && !still) {
        traces[i].ln.at(u, v);
        sparks.set(0, v.x, v.y + 0.02, v.z, 1);
        sparkSet = true;
      }
      tl.cart.set((0.7 + lit * 0.35) * vis, teal(mix(COLOR.cobalt, COLOR.ice, lit * 0.4), done * 0.6));
      tl.glyph.set((0.6 + lit * 0.6) * vis, used > 0 ? mix(COLOR.ice, COLOR.teal, used * 0.6) : COLOR.ice);
      tl.glyph.group.position.y = lit * 0.06;
      tl.led.set((0.35 + lit * 0.65 * pulse + used * 0.3) * vis, used > 0.01 ? mix(COLOR.ice, COLOR.teal, used) : COLOR.ice);
      const on = seg(t, a + TOOL_LEN - 0.1, a + TOOL_LEN + 0.15);
      steps[i].set((0.4 + on * 0.6) * vis, on > 0.01 ? mix(COLOR.cobalt, COLOR.teal, on) : COLOR.cobalt);
    });

    /* Payments: the trace stops at the wall, then completes after approval */
    const toWall = easeInOut(seg(t, LIMIT[0], LIMIT[1])) * LIMIT_U;
    const through = easeInOut(seg(t, PAY[0], PAY[1]));
    const pu = through > 0 ? LIMIT_U + (1 - LIMIT_U) * through : toWall;
    payTrace.show(pu);
    const opened = easeInOut(seg(t, OPEN[0], OPEN[1]));
    payTrace.set((0.9 * window01(t, LIMIT[0], OUT, 0.2)) * out, blocked > 0.01 && opened < 0.5 ? mix(COLOR.ice, COLOR.red, blocked) : opened > 0.5 ? COLOR.teal : COLOR.ice);
    payDim.set(0.4 * vis);
    if (!still && ((t > LIMIT[0] && t < LIMIT[1]) || (t > PAY[0] && t < PAY[1]))) {
      payTrace.at(pu, v);
      sparks.set(0, v.x, v.y + 0.02, v.z, 1);
      sparkSet = true;
    }
    const wallColor = opened > 0.01 ? mix(COLOR.red, COLOR.teal, opened) : COLOR.red;
    glass.set((0.55 + blocked * 0.5 * blink * (1 - opened)) * vis * (1 - opened * 0.5), wallColor);
    lid.set(0.8 * vis, wallColor);
    lid.group.position.y = 0.08 + vh + opened * 0.45;
    const payLit = window01(t, PAY[1] - 0.1, OUT, 0.25);
    payCart.set((0.5 + opened * 0.2 + payLit * 0.3) * vis, teal(mix(COLOR.cobalt, COLOR.ice, payLit * 0.4), done * 0.6));
    payGlyph.set((0.45 + opened * 0.25 + payLit * 0.5) * vis, payLit > 0.01 ? mix(COLOR.ice, COLOR.teal, payLit * 0.6) : COLOR.ice);
    payLed.set((0.3 + payLit * 0.7) * vis, payLit > 0.01 ? COLOR.teal : COLOR.ice);
    const last = seg(t, PAY[1], PAY[1] + 0.25);
    steps[4].set((0.4 + last * 0.6 + blocked * 0.4 * blink) * vis, last > 0.01 ? mix(COLOR.amber, COLOR.teal, last) : blocked > 0.01 ? mix(COLOR.cobalt, COLOR.amber, blocked) : COLOR.cobalt);

    /* Asking: an amber trace to the key port, which blinks until the key arrives */
    const askU = easeInOut(seg(t, ASK[0], ASK[1]));
    askTrace.show(askU);
    askTrace.set(0.9 * window01(t, ASK[0], OPEN[1], 0.25) * (t < KEY[0] ? blink : 1) * out);
    if (!still && askU > 0 && askU < 1) {
      askTrace.at(askU, v);
      sparks.set(1, v.x, v.y + 0.02, v.z, 1);
    } else sparks.hide(1);
    if (!sparkSet) sparks.hide(0);
    sparks.commit();
    portLight.set(window01(t, ASK[1] - 0.1, OPEN[1] + 0.2, 0.2) * (t < KEY[1] ? blink : 1) * out, t > KEY[1] ? mix(COLOR.amber, COLOR.teal, seg(t, OPEN[0], OPEN[1])) : COLOR.amber);

    /* The key slides in from the front */
    const kin = easeInOut(seg(t, KEY[0], KEY[1]));
    const kOn = seg(t, KEY[0] - 0.4, KEY[0]) * (1 - seg(t, OUT - 0.6, OUT));
    key.group.position.set(PORT.x, PORT.y - 0.03, PORT.z + 0.75 - kin * 0.62);
    key.set((0.8 + kin * 0.3) * kOn * out);
  }

  return {
    frame: { w: 7.6, h: 3.9, target: [0.1, 0.35, 0.3], yaw: 0.22, elev: 0.55 },
    story,
    staticTime: 8.8,
    update,
  };
}

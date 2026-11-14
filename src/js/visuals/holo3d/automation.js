import { THREE, COLOR, seg, lerp, easeOut, easeInOut, window01 } from "./kit.js";
import { box, merge, barXY, rbox, grid, vents, rowGeo, envelopeGlyph, pageGlyph, formGlyph } from "./shapes.js";

/**
 * Workflow Automation: the integration server rack.
 *
 * A detailed rack sits on a raised data-centre floor. Cables run in from
 * the systems requests come from (a mail server, a document scanner, a form
 * kiosk) and out to the systems they update (a storage array, a finance
 * terminal). Requests arrive as light along the cables, the read and match
 * modules light up, and records go out on their own. One record is flagged
 * red and routed to the review console; a person's amber security key
 * turns, it clears teal and carries on. Then every status light goes teal.
 * No people, no text.
 */

export const story = {
  cycle: 14,
  marks: [0, 3.2, 6.6, 10.2],
};

const PI = Math.PI;
const RW = 0.78; // module width
const FRONT = 0.425; // module front face (z)
const U = 0.09;

// Beats.
const ARRIVE = [
  [0.5, 1.7],
  [1.1, 2.3],
  [1.7, 2.9],
];
const READ = [3.3, 4.3];
const MATCH = [4.0, 5.0];
const TO_STORE = [4.8, 5.9];
const TO_FIN = [5.4, 6.5];
const FLAG = 6.8;
const TO_REVIEW = [7.0, 8.0];
const TURN = [8.6, 9.1];
const BACK = [9.4, 10.5];
const DONE = 10.8;
const OUT = 13.1;

/* The rack's modules, bottom up: [base y, units, kind]. */
const MODULES = [
  [0.14, 3, "power"],
  [0.43, 3, "storage"],
  [0.73, 2, "match"],
  [0.93, 2, "read"],
  [1.13, 1, "gateway"],
  [1.24, 1, "patch"],
  [1.35, 1, "switch"],
  [1.48, 4, "blank"],
  [1.86, 2, "blank"],
  [2.06, 2, "blank"],
];

function moduleGeo(kind, h) {
  const z = FRONT + 0.006;
  const mid = h / 2;
  const parts = [rbox(RW, h - 0.012, 0.85, 0, 0, 0, 0.012), box(0.03, h - 0.03, 0.02, -RW / 2 + 0.03, 0.012, z), box(0.03, h - 0.03, 0.02, RW / 2 - 0.03, 0.012, z)];
  if (kind === "power") parts.push(...vents(3, 8, 0.15, -0.26, 0.05, 0.19, 0.022, z), rbox(0.08, 0.08, 0.02, 0.27, mid - 0.04, z, 0.01));
  if (kind === "storage") {
    for (let i = 0; i < 6; i += 1) {
      const x = -0.3 + i * 0.1;
      parts.push(rbox(0.085, h - 0.06, 0.02, x, 0.025, z, 0.006), box(0.05, 0.012, 0.03, x, h - 0.07, z + 0.01));
    }
  }
  if (kind === "match" || kind === "read") parts.push(...vents(2, 5, 0.17, -0.26, 0.035, 0.2, 0.024, z), rbox(0.18, h - 0.07, 0.02, 0.13, 0.035, z, 0.008));
  if (kind === "gateway") parts.push(...grid(8, 1, 0.034, 0.03, 0.045, 0, -0.3, mid - 0.015, z));
  if (kind === "patch") parts.push(...grid(12, 2, 0.026, 0.02, 0.046, 0.032, -0.3, mid - 0.032, z));
  if (kind === "switch") parts.push(...grid(10, 1, 0.034, 0.03, 0.044, 0, -0.3, mid - 0.015, z), box(0.1, 0.03, 0.012, 0.22, mid - 0.015, z));
  if (kind === "blank") parts.push(...vents(4, Math.max(2, Math.round(h / 0.04)), 0.12, -0.27, 0.03, 0.18, 0.03, z));
  return merge(parts);
}

/** Four status lights on a module's right-hand bezel. */
function ledGeo(h) {
  return merge([0, 1, 2, 3].map((i) => box(0.022, 0.018, 0.01, 0.3 + (i % 2) * 0.034, h / 2 - 0.02 + Math.floor(i / 2) * 0.03 - 0.01, FRONT + 0.02)));
}

export function build(kit) {
  const { scene, camera, holo, line, points, segments, mix } = kit;
  const root = new THREE.Group();
  scene.add(root);

  /* A raised data-centre floor */
  const floor = holo(rbox(6.4, 0.1, 3.5, 0, -0.1, 0.15, 0.03), { color: COLOR.ice, face: 0.03, edge: 0.45, level: 0.6, occlude: false });
  const tiles = [];
  for (let x = -3.2; x <= 3.21; x += 0.5) tiles.push([[x, 0.003, -1.6], [x, 0.003, 1.9]]);
  for (let z = -1.6; z <= 1.91; z += 0.5) tiles.push([[-3.2, 0.003, z], [3.2, 0.003, z]]);
  const tileLines = segments(tiles, { color: COLOR.ice, level: 0.07 });
  root.add(floor.group, tileLines.object);

  /* The rack: frame, side panels, top and plinth */
  const frame = holo(
    merge([
      rbox(0.94, 0.12, 1.02, 0, 0, 0, 0.02),
      rbox(0.94, 0.1, 1.02, 0, 2.28, 0, 0.02),
      ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => box(0.05, 2.16, 0.05, sx * 0.43, 0.12, sz * 0.47))),
      box(0.02, 2.16, 0.9, -0.46, 0.12, 0),
      box(0.02, 2.16, 0.9, 0.46, 0.12, 0),
    ]),
    { color: COLOR.ice, face: 0.05, level: 0.7, threshold: 30 },
  );
  root.add(frame.group);
  const modules = MODULES.map(([y, units, kind]) => {
    const h = units * U;
    const body = holo(moduleGeo(kind, h).translate(0, y, 0), { color: COLOR.cobalt, face: 0.1, level: kind === "blank" ? 0.45 : 0.75, threshold: 30 });
    const led = kind === "blank" ? null : holo(ledGeo(h).translate(0, y, 0), { color: COLOR.ice, face: 1.2, edge: 0, level: 0.5, occlude: false });
    root.add(body.group);
    if (led) root.add(led.group);
    return { y, h, kind, body, led };
  });
  const mod = (kind) => modules.find((m) => m.kind === kind);

  /* Where requests come from */
  // A mail server tower with an envelope on its front.
  const mail = holo(
    merge([rbox(0.42, 0.82, 0.66, 0, 0, 0, 0.03), ...vents(1, 10, 0.26, 0, 0.08, 0, 0.03, 0.335), envelopeGlyph(0.5).translate(0, 0.68, 0.34), new THREE.CylinderGeometry(0.025, 0.025, 0.02, 16).rotateX(PI / 2).translate(0.13, 0.5, 0.335)]),
    { color: COLOR.ice, face: 0.08, level: 0.65, threshold: 30 },
  );
  mail.group.position.set(-2.55, 0, -0.75);
  mail.group.rotation.y = 0.35;
  // A document scanner on a pedestal: body, an angled input tray with pages, an output tray.
  const scanner = holo(
    merge([
      rbox(0.62, 0.6, 0.5, 0, 0, 0, 0.02),
      rbox(0.66, 0.2, 0.48, 0, 0.6, 0, 0.04),
      box(0.5, 0.012, 0.32, 0, 0, 0).rotateX(-0.6).translate(0, 0.86, -0.3),
      box(0.42, 0.006, 0.28, 0, 0, 0).rotateX(-0.6).translate(0, 0.885, -0.29),
      box(0.42, 0.006, 0.28, 0, 0, 0).rotateX(-0.6).translate(0, 0.9, -0.28),
      box(0.5, 0.012, 0.26, 0, 0.66, 0.34),
      box(0.12, 0.03, 0.01, 0.18, 0.7, 0.245),
    ]),
    { color: COLOR.ice, face: 0.08, level: 0.65, threshold: 30 },
  );
  scanner.group.position.set(-2.75, 0, 0.4);
  scanner.group.rotation.y = 0.5;
  // A form kiosk: base, column, a tablet showing a form.
  const kiosk = holo(
    merge([
      rbox(0.42, 0.04, 0.34, 0, 0, 0, 0.015),
      new THREE.CylinderGeometry(0.03, 0.03, 0.95, 12).translate(0, 0.5, -0.04),
      rbox(0.4, 0.3, 0.025, 0, 0, 0, 0.012).translate(0, -0.15, 0).rotateX(-0.45).translate(0, 1.1, 0.02),
      formGlyph(0.7).rotateX(-0.45).translate(0, 1.07, 0.04),
    ]),
    { color: COLOR.ice, face: 0.08, level: 0.65, threshold: 30 },
  );
  kiosk.group.position.set(-2.15, 0, 1.55);
  kiosk.group.rotation.y = 0.6;
  root.add(mail.group, scanner.group, kiosk.group);

  /* Where records go */
  const store = holo(
    merge([rbox(0.62, 1.15, 0.72, 0, 0, 0, 0.025), ...[0, 1, 2, 3].flatMap((r) => [0, 1, 2].map((c) => rbox(0.16, 0.2, 0.02, -0.18 + c * 0.18, 0.12 + r * 0.25, 0.365, 0.008)))]),
    { color: COLOR.cobalt, face: 0.1, level: 0.7, threshold: 30 },
  );
  store.group.position.set(2.2, 0, -0.85);
  store.group.rotation.y = -0.3;
  const storeLeds = holo(merge([0, 1, 2, 3].flatMap((r) => [0, 1, 2].map((c) => box(0.03, 0.018, 0.01, -0.13 + c * 0.18, 0.26 + r * 0.25, 0.385)))), {
    color: COLOR.ice,
    face: 1.2,
    edge: 0,
    level: 0.4,
    occlude: false,
  });
  store.group.add(storeLeds.group);
  // The finance terminal: a pedestal and a monitor showing a ledger.
  const fin = new THREE.Group();
  fin.position.set(2.55, 0, 0.45);
  fin.rotation.y = -0.55;
  const finBody = holo(merge([rbox(0.44, 0.04, 0.34, 0, 0, 0, 0.015), new THREE.CylinderGeometry(0.03, 0.03, 0.95, 12).translate(0, 0.5, 0), rbox(0.86, 0.54, 0.05, 0, 0.98, 0, 0.02)]), {
    color: COLOR.cobalt,
    face: 0.1,
    level: 0.75,
    threshold: 30,
  });
  const finGlow = holo(new THREE.PlaneGeometry(0.78, 0.46).translate(0, 1.25, 0.027), { color: COLOR.cobalt, face: 0.5, edge: 0, level: 0.25, occlude: false });
  const finRows = [0.3, 0.6, 0.48, 0.56, 0.42].map((len, i) => {
    const row = holo(rowGeo(len, i === 0 ? 0.05 : 0.035), { color: COLOR.ice, face: 0.9, edge: 0.6, level: 0, occlude: false });
    row.group.position.set(-0.33, 1.42 - i * 0.075, 0.034);
    fin.add(row.group);
    return row;
  });
  fin.add(finBody.group, finGlow.group);
  root.add(store.group, fin);

  /* The review console: a slanted desk panel with a screen, keypad and key switch */
  const con = new THREE.Group();
  con.position.set(1.55, 0, 1.4);
  con.rotation.y = -0.45;
  con.scale.setScalar(0.85);
  const conBody = holo(merge([rbox(0.95, 0.72, 0.5, 0, 0, 0, 0.03), box(0.95, 0.04, 0.62, 0, 0, 0).rotateX(0.5).translate(0, 0.86, 0.02)]), {
    color: COLOR.ice,
    face: 0.07,
    level: 0.65,
    threshold: 30,
  });
  const panel = new THREE.Group(); // the slanted top, in its own frame
  panel.position.set(0, 0.89, 0.02);
  panel.rotation.x = -PI / 2 + 0.5;
  const conScreen = holo(merge([rbox(0.42, 0.3, 0.015, -0.18, -0.15, 0, 0.01)]), { color: COLOR.cobalt, face: 0.35, level: 0.7 });
  const keypad = holo(merge(grid(3, 3, 0.05, 0.04, 0.065, 0.055, 0.12, -0.12, 0.012)), { color: COLOR.ice, face: 0.15, level: 0.6 });
  const lockBody = holo(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 24).rotateX(PI / 2).translate(0.38, 0.02, 0.015), { color: COLOR.ice, face: 0.2, level: 0.7 });
  const key = new THREE.Group();
  key.position.set(0.38, 0.02, 0.035);
  const keyH = holo(merge([new THREE.TorusGeometry(0.035, 0.012, 8, 20).translate(0, 0.075, 0.02), box(0.016, 0.06, 0.012, 0, 0, 0.02)]), { color: COLOR.amber, face: 0.8, level: 0.75, threshold: 30 });
  key.add(keyH.group);
  const flagCard = holo(merge([box(0.3, 0.17, 0.01, -0.18, -0.235, 0.012), box(0.18, 0.025, 0.006, -0.22, -0.11, 0.02), box(0.22, 0.025, 0.006, -0.2, -0.16, 0.02)]), {
    color: COLOR.red,
    face: 0.8,
    level: 0,
    occlude: false,
  });
  panel.add(conScreen.group, keypad.group, lockBody.group, key, flagCard.group);
  con.add(conBody.group, panel);
  root.add(con);

  /* Cables: tubes routed along the floor, each with a light path on top */
  const RAD = 0.022;
  const cables = [];
  function cable(pts, color = COLOR.cobalt) {
    const v3 = pts.map((p) => new THREE.Vector3(...p));
    const curve = new THREE.CatmullRomCurve3(v3, false, "centripetal");
    const tube = holo(new THREE.TubeGeometry(curve, 80, RAD, 6, false), { color, face: 0.45, edge: 0, level: 0.6, occlude: false });
    const path = line(v3, { color: COLOR.ice, samples: 90 });
    root.add(tube.group, path.object);
    const c = { tube, path };
    cables.push(c);
    return c;
  }
  const gw = mod("gateway").y + 0.05;
  const mt = mod("match").y + 0.09;
  const inMail = cable([[-2.45, 0.7, -1.0], [-2.3, 0.05, -1.15], [-1.0, 0.03, -0.6], [-0.6, 0.6, -0.2], [-0.47, gw, -0.12]]);
  const inScan = cable([[-2.55, 0.5, 0.2], [-2.0, 0.03, 0.2], [-0.95, 0.03, 0.1], [-0.6, 0.6, 0.05], [-0.47, gw, 0.02]]);
  const inKiosk = cable([[-2.05, 0.04, 1.4], [-1.3, 0.03, 0.9], [-0.75, 0.25, 0.35], [-0.47, gw, 0.16]]);
  const outStore = cable([[0.47, mt, -0.15], [0.8, 0.4, -0.45], [1.3, 0.03, -0.7], [1.9, 0.4, -0.85], [1.95, 0.8, -0.85]]);
  const outFin = cable([[0.47, mt, 0.05], [0.85, 0.35, 0.25], [1.5, 0.03, 0.45], [2.25, 0.03, 0.5], [2.5, 0.5, 0.45]]);
  const toCon = cable([[0.47, mt - 0.05, 0.25], [0.7, 0.25, 0.7], [1.1, 0.03, 1.05], [1.35, 0.35, 1.3], [1.42, 0.76, 1.42]]);
  const conToFin = cable([[1.42, 0.76, 1.42], [1.75, 0.3, 1.3], [2.2, 0.03, 0.9], [2.5, 0.03, 0.55], [2.5, 0.5, 0.45]]);
  conToFin.tube.group.visible = false; // the console and terminal already share the floor run

  /* What travels: requests in (as what they are), records out */
  const inGlyphs = [envelopeGlyph(0.6), pageGlyph(0.6), formGlyph(0.6)].map((g) => {
    const h = holo(g, { color: COLOR.ice, face: 0.3, level: 0, occlude: false });
    root.add(h.group);
    return h;
  });
  const recGeo = () => merge([box(0.2, 0.14, 0.012, 0, -0.07, 0), box(0.12, 0.02, 0.006, -0.03, 0.03, 0.01), box(0.14, 0.02, 0.006, -0.02, -0.02, 0.01)]);
  const recs = [0, 1, 2].map(() => {
    const h = holo(recGeo(), { color: COLOR.cobalt, face: 0.6, level: 0, occlude: false });
    root.add(h.group);
    return h;
  });
  const sparks = points(4, { color: COLOR.ice, size: 1.0 });
  root.add(sparks.object);

  const v = new THREE.Vector3();
  const INS = [inMail, inScan, inKiosk];

  function travel(h, c, a, b, t, color, level, spark) {
    const u = seg(t, a, b);
    if (u <= 0 || u >= 1) {
      h.set(0);
      sparks.hide(spark);
      return false;
    }
    c.path.at(easeInOut(u), v);
    h.group.position.copy(v).y += 0.12;
    h.group.quaternion.copy(camera.quaternion);
    h.set(level * Math.min(1, u * 6) * (1 - seg(u, 0.88, 1)), color);
    if (kit.still) sparks.hide(spark);
    else sparks.set(spark, v.x, v.y, v.z, 0.9);
    return true;
  }

  function update(t, dt, clock) {
    const still = kit.still;
    const out = 1 - easeOut(seg(t, OUT, OUT + 0.8));
    const vis = easeOut(seg(t, 0, 0.6)) * out;
    const done = window01(t, DONE, OUT, 0.5);
    const blink = still ? 1 : 0.7 + 0.3 * Math.sin(clock * 7);
    const teal = (c, k = done) => (k > 0.01 ? mix(c, COLOR.teal, k) : c);

    floor.set(0.6 * vis);
    tileLines.set(0.07 * vis);
    frame.set(0.7 * vis);
    [mail, scanner, kiosk].forEach((d) => d.set(0.65 * vis));

    /* Requests come in along their cables */
    INS.forEach((c, i) => {
      travel(inGlyphs[i], c, ARRIVE[i][0], ARRIVE[i][1], t, COLOR.ice, out, i);
      c.path.show(easeInOut(seg(t, ARRIVE[i][0], ARRIVE[i][1])));
      c.path.set(0.5 * window01(t, ARRIVE[i][0], ARRIVE[i][1] + 0.2, 0.2) * out);
    });

    /* Modules: the gateway takes requests, read and match light in turn; at the end all go teal, top down */
    const gatewayOn = Math.max(...ARRIVE.map(([, b]) => window01(t, b - 0.15, b + 0.45, 0.15)));
    const flagged = window01(t, FLAG, TURN[1] + 0.1, 0.2);
    modules.forEach((m, i) => {
      let k = 0;
      if (m.kind === "gateway") k = gatewayOn;
      if (m.kind === "read") k = window01(t, READ[0], READ[1], 0.25);
      if (m.kind === "match") k = window01(t, MATCH[0], MATCH[1], 0.25);
      const wave = seg(t, DONE + (MODULES.length - i) * 0.06, DONE + 0.3 + (MODULES.length - i) * 0.06) * done;
      const base = m.kind === "blank" ? 0.45 : 0.75;
      m.body.set((base + k * 0.35) * vis, teal(mix(COLOR.cobalt, COLOR.ice, k * 0.4), wave * 0.5));
      if (m.led) {
        let c = k > 0.01 ? COLOR.ice : COLOR.cobalt;
        let lv = 0.45 + k * 0.55 * (still ? 1 : 0.75 + 0.25 * Math.sin(clock * 11 + i));
        if (m.kind === "match" && flagged > 0.01) {
          c = mix(COLOR.ice, COLOR.red, flagged);
          lv = 0.5 + 0.5 * flagged * blink;
        }
        if (wave > 0.01) {
          c = teal(c, wave);
          lv = 0.6 + wave * 0.4;
        }
        m.led.set(lv * vis, c);
      }
    });

    /* Records go out on their own */
    const r0 = travel(recs[0], outStore, TO_STORE[0], TO_STORE[1], t, teal(COLOR.cobalt), out, 3);
    let r1 = travel(recs[1], outFin, TO_FIN[0], TO_FIN[1], t, COLOR.cobalt, out, 3);
    // The flagged one goes to the console, waits, then on to the terminal.
    const atConsole = t >= TO_REVIEW[1] && t < BACK[0];
    const checked = seg(t, TURN[1] - 0.15, TURN[1] + 0.1);
    let r2 = travel(recs[2], toCon, TO_REVIEW[0], TO_REVIEW[1], t, COLOR.red, out, 3);
    if (!r2) r2 = travel(recs[2], conToFin, BACK[0], BACK[1], t, COLOR.teal, out, 3);
    if (!r0 && !r1 && !r2) sparks.hide(3);
    sparks.commit();
    [
      [outStore, TO_STORE, COLOR.ice],
      [outFin, TO_FIN, COLOR.ice],
      [toCon, TO_REVIEW, COLOR.red],
      [conToFin, BACK, COLOR.teal],
    ].forEach(([c, [a, b], col]) => {
      c.path.show(easeInOut(seg(t, a, b)));
      c.path.set(0.55 * window01(t, a, b + 0.25, 0.2) * out, col);
    });
    cables.forEach((c, i) => {
      const wave = seg(t, DONE + i * 0.08, DONE + 0.4 + i * 0.08) * done;
      c.tube.set((0.55 + wave * 0.35) * vis, teal(COLOR.cobalt, wave * 0.8));
    });

    /* Destinations fill in */
    const storeLit = window01(t, TO_STORE[1] - 0.1, TO_STORE[1] + 0.8, 0.2);
    store.set((0.7 + storeLit * 0.3) * vis, teal(COLOR.cobalt, done * 0.8));
    storeLeds.set((0.4 + storeLit * 0.6 * blink + done * 0.4) * vis, teal(storeLit > 0.01 ? COLOR.ice : COLOR.cobalt));
    const finFill = [TO_FIN[1], TO_FIN[1] + 0.12, TO_FIN[1] + 0.24, TO_FIN[1] + 0.36, BACK[1]];
    const finLit = Math.min(1, window01(t, TO_FIN[1] - 0.1, TO_FIN[1] + 0.8, 0.2) + window01(t, BACK[1] - 0.1, BACK[1] + 0.7, 0.2));
    finBody.set((0.75 + finLit * 0.25) * vis, teal(COLOR.cobalt, done * 0.8));
    finGlow.set((0.22 + finLit * 0.35 + done * 0.3) * vis, teal(COLOR.cobalt));
    finRows.forEach((row, j) => {
      const g = easeOut(seg(t, finFill[j], finFill[j] + 0.35));
      row.group.scale.x = Math.max(0.001, g);
      row.set(g > 0 ? (0.75 + done * 0.25) * out : 0, teal(COLOR.ice));
    });

    /* The review console: the flagged record shows, the amber key turns, it clears */
    const review = window01(t, TO_REVIEW[1] - 0.15, BACK[0] + 0.1, 0.2);
    conBody.set((0.65 + review * 0.15) * vis);
    conScreen.set((0.7 + review * 0.4) * vis, review > 0.01 ? mix(COLOR.cobalt, checked > 0 ? COLOR.teal : COLOR.red, review * 0.6) : COLOR.cobalt);
    flagCard.set(review * (checked > 0 ? 1 : blink) * out, checked > 0 ? mix(COLOR.red, COLOR.teal, checked) : COLOR.red);
    keypad.set(0.6 * vis);
    lockBody.set(0.7 * vis);
    const turn = easeInOut(seg(t, TURN[0], TURN[1])) * (1 - easeInOut(seg(t, BACK[1], BACK[1] + 0.5)));
    key.rotation.z = -PI / 2 * turn;
    keyH.set((0.75 + review * 0.35) * vis);
  }

  return {
    frame: { w: 7.0, h: 4.2, target: [0, 0.68, 0.15], yaw: 0.28, elev: 0.32 },
    story,
    staticTime: 8.4,
    update,
  };
}

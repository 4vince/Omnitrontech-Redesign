import { C, FONT, HEX, HUE, chip, drawIcon, easeBack, easeInOut, easeOut, fitText, pastel, rr, seg } from "./kit.js";

/**
 * AI Agents: bounded autonomy, shown literally.
 *
 * An agent works a goal across a board of tools. Its approved tools sit
 * inside a glass boundary; it visits them in turn and ticks off its
 * checklist. When the next step (a refund) is outside its limits, it stops
 * at the boundary and a person approves before it carries on.
 */

const TOOLS = [
  { id: "email", name: "Email", icon: "ph-envelope-simple", hue: "sky", x: -3.4, z: -1.35 },
  { id: "crm", name: "Customer records", icon: "ph-address-book", hue: "rose", x: -0.9, z: -1.6 },
  { id: "orders", name: "Orders", icon: "ph-package", hue: "coral", x: -3.1, z: 1.25 },
  { id: "docs", name: "Documents", icon: "ph-file-text", hue: "lime", x: -0.6, z: 1.15 },
];

const ZONE = { x0: -4.45, x1: 0.95, z0: -2.65, z1: 2.5 };
const PAYMENTS = { x: 2.85, z: -1.05 };
const PERSON = { x: 3.15, z: 1.55 };

// Where the agent is at each moment of the loop.
const PATH = [
  { t: 0.3, x: -2.0, z: 0.0 },
  { t: 1.6, x: -3.4, z: -0.65 },
  { t: 3.9, x: -3.4, z: -0.65 },
  { t: 4.7, x: -0.9, z: -0.9 },
  { t: 5.3, x: -0.9, z: -0.9 },
  { t: 6.1, x: -3.1, z: 1.95 },
  { t: 6.6, x: -3.1, z: 1.95 },
  { t: 7.3, x: -0.6, z: 1.85 },
  { t: 7.8, x: -0.6, z: 1.85 },
  { t: 8.8, x: 0.55, z: -0.4 },
  { t: 13.4, x: 0.55, z: -0.4 },
  { t: 14.6, x: -2.0, z: 0.0 },
];

export const story = {
  cycle: 16,
  marks: [0, 3.6, 8.2, 11.6],
};

function paintBoard(ctx, W, H) {
  const m = 10;
  rr(ctx, m, m, W - m * 2, H - m * 2, 40);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = C.line;
  ctx.stroke();

  // the approved zone, in board pixels
  const sx = W / 9.8;
  const sz = H / 6.4;
  const px = (x) => (x + 4.9) * sx;
  const pz = (z) => (z + 3.2) * sz;
  rr(ctx, px(ZONE.x0), pz(ZONE.z0), (ZONE.x1 - ZONE.x0) * sx, (ZONE.z1 - ZONE.z0) * sz, 30);
  ctx.fillStyle = C.successTint;
  ctx.fill();
  ctx.fillStyle = C.success;
  ctx.font = `600 30px ${FONT.mono}`;
  ctx.textAlign = "left";
  ctx.fillText("APPROVED TOOLS", px(ZONE.x0) + 30, pz(ZONE.z1) - 30);
  ctx.fillStyle = "#a86200";
  ctx.fillText("NEEDS A PERSON", px(1.55), pz(ZONE.z1) - 30);
}

function paintChecklist(done) {
  const rows = ["Find the order", "Draft the reply", "Refund: ask a person"];
  return (ctx, W, H) => {
    rr(ctx, 3, 3, W - 6, H - 6, 40);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = C.line;
    ctx.stroke();
    const pad = W * 0.07;
    ctx.textAlign = "left";
    ctx.fillStyle = C.blue;
    ctx.font = `600 ${H * 0.085}px ${FONT.mono}`;
    ctx.fillText("GOAL", pad, H * 0.17);
    ctx.fillStyle = C.ink;
    fitText(ctx, "Answer a late-delivery email", pad, H * 0.31, W - pad * 2, H * 0.12, 650);
    rows.forEach((row, i) => {
      const y = H * (0.5 + i * 0.17);
      const r = H * 0.055;
      const ok = i < done;
      ctx.beginPath();
      ctx.arc(pad + r, y - r * 0.4, r, 0, Math.PI * 2);
      ctx.fillStyle = ok ? C.success : "#ffffff";
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = ok ? C.success : "rgba(23,25,31,0.3)";
      ctx.stroke();
      if (ok) drawIcon(ctx, "ph-check", pad + r, y - r * 0.4, r * 1.4, "#ffffff");
      ctx.fillStyle = ok ? C.ink : C.muted;
      fitText(ctx, row, pad + r * 2 + W * 0.04, y, W - pad * 2 - r * 3, H * 0.095, 560, FONT.body);
    });
  };
}

export function build(kit) {
  const { THREE, root, box, card, tile, line, faceCamera, mat } = kit;

  root.add(tile({ w: 9.8, d: 6.4, paint: paintBoard, scale: 130 }));

  /* The boundary: low glass walls around the approved zone */
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: HEX.success,
    transparent: true,
    opacity: 0.18,
    roughness: 0.2,
    depthWrite: false,
  });
  const rimMaterial = new THREE.LineBasicMaterial({ color: HEX.success, transparent: true, opacity: 0.9 });
  const zw = ZONE.x1 - ZONE.x0;
  const zd = ZONE.z1 - ZONE.z0;
  const cx = (ZONE.x0 + ZONE.x1) / 2;
  const cz = (ZONE.z0 + ZONE.z1) / 2;
  const WALL_H = 0.42;
  [
    [cx, ZONE.z0, zw, 0.04],
    [cx, ZONE.z1, zw, 0.04],
    [ZONE.x0, cz, 0.04, zd],
    [ZONE.x1, cz, 0.04, zd],
  ].forEach(([x, z, w, d]) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, WALL_H, d), wallMaterial);
    wall.position.set(x, WALL_H / 2, z);
    root.add(wall);
  });
  const rim = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(zw, WALL_H, zd)), rimMaterial);
  rim.position.set(cx, WALL_H / 2, cz);
  root.add(rim);

  /* Tools */
  const tools = TOOLS.map((tool) => {
    const pad = box(1.3, 0.22, 1.3, pastel(tool.hue, 0.55), 0.07);
    pad.position.set(tool.x, 0.11, tool.z);
    const label = card({ w: 2.1, h: 0.56, paint: chip({ icon: tool.icon, title: tool.name, hue: tool.hue, solid: true }) });
    label.group.position.set(tool.x, 0.85, tool.z);
    root.add(pad, label.group);
    return { ...tool, pad, label, heat: 0, rest: new THREE.Color(pastel(tool.hue, 0.55)), lit: new THREE.Color(HUE[tool.hue].hex) };
  });

  const payPad = box(1.3, 0.22, 1.3, HEX.slab, 0.07);
  payPad.position.set(PAYMENTS.x, 0.11, PAYMENTS.z);
  const payLabel = card({ w: 1.9, h: 0.56, paint: chip({ icon: "ph-credit-card", title: "Payments", tone: "muted" }) });
  payLabel.group.position.set(PAYMENTS.x, 0.85, PAYMENTS.z);
  const lock = card({ w: 1.8, h: 0.46, paint: chip({ icon: "ph-lock-simple", title: "Not allowed", tone: "danger" }) });
  lock.group.position.set(PAYMENTS.x, 1.45, PAYMENTS.z);
  root.add(payPad, payLabel.group, lock.group);

  const desk = box(1.7, 0.45, 0.9, pastel("amber", 0.55), 0.08);
  desk.position.set(PERSON.x, 0.225, PERSON.z);
  const person = card({
    w: 2.4,
    h: 0.66,
    paints: [
      chip({ icon: "ph-user", title: "Team lead", sub: "On hand", tone: "person" }),
      chip({ icon: "ph-user", title: "Approve a refund?", sub: "Asked by the agent", tone: "amber" }),
      chip({ icon: "ph-user-check", title: "Approved", sub: "By a person", tone: "success" }),
    ],
  });
  person.group.position.set(PERSON.x, 1.05, PERSON.z);
  root.add(desk, person.group);

  const checklist = card({ w: 3.0, h: 1.75, paints: [0, 1, 2, 3].map(paintChecklist) });
  checklist.group.position.set(-1.6, 2.3, -3.55);
  root.add(checklist.group);

  /* The agent: a small hovering unit with a visor */
  const agent = new THREE.Group();
  const shell = box(0.78, 0.62, 0.66, HEX.blue, 0.2);
  const visor = box(0.6, 0.26, 0.06, HEX.navy, 0.08);
  visor.position.set(0, 0.04, 0.33);
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xdfe6ff, toneMapped: false });
  [-0.13, 0.13].forEach((x) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), eyeMaterial);
    eye.position.set(x, 0, 0.04);
    visor.add(eye);
  });
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8), mat(HEX.navy));
  mast.position.y = 0.42;
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), eyeMaterial);
  tip.position.y = 0.55;
  agent.add(shell, visor, mast, tip);
  root.add(agent);

  const trail = line(HEX.blue, 0.75);
  const ask = line(HEX.amber, 0.95);
  root.add(trail.object, ask.object);

  function agentAt(t) {
    if (t <= PATH[0].t) return { x: PATH[0].x, z: PATH[0].z, moving: false, index: 0 };
    for (let i = 1; i < PATH.length; i += 1) {
      const a = PATH[i - 1];
      const b = PATH[i];
      if (t <= b.t) {
        const k = easeInOut((t - a.t) / (b.t - a.t));
        return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, moving: a.x !== b.x || a.z !== b.z, index: i };
      }
    }
    const end = PATH[PATH.length - 1];
    return { x: end.x, z: end.z, moving: false, index: PATH.length };
  }

  const teal = new THREE.Color(HEX.success);
  const red = new THREE.Color(HEX.danger);

  function update(t, dt, total) {
    const out = 1 - easeOut(seg(t, 15.2, 15.9));
    const here = agentAt(t);
    const appear = easeBack(seg(t, 0.1, 0.6)) * out;
    agent.position.set(here.x, 0.95 + Math.sin(total * 2.4) * 0.05, here.z);
    agent.scale.setScalar(Math.max(0.0001, appear));
    // Face the direction of travel, settle facing the camera when idle.
    const ahead = agentAt(t + 0.15);
    const heading = here.moving ? Math.atan2(ahead.x - here.x, ahead.z - here.z) : 0;
    const turn = Math.atan2(Math.sin(heading - agent.rotation.y), Math.cos(heading - agent.rotation.y));
    agent.rotation.y += turn * Math.min(1, dt * 6 || 1);
    agent.rotation.z = here.moving ? Math.sin(total * 8) * 0.03 : 0;

    // trail of where it has been this loop
    const points = [];
    for (let i = 0; i < Math.min(here.index, PATH.length); i += 1) {
      points.push(new THREE.Vector3(PATH[i].x, 0.04, PATH[i].z));
    }
    points.push(new THREE.Vector3(here.x, 0.04, here.z));
    trail.setPoints(points);
    trail.object.material.opacity = 0.7 * out;

    tools.forEach((tool) => {
      const near = Math.hypot(here.x - tool.x, here.z - (tool.z + 0.7)) < 0.35 ? 1 : 0;
      tool.heat += (near - tool.heat) * Math.min(1, dt * 6 || 1);
      tool.pad.material.color.copy(tool.rest).lerp(tool.lit, tool.heat * 0.85);
      tool.pad.position.y = 0.11 + tool.heat * 0.06;
      tool.label.group.scale.setScalar(1 + tool.heat * 0.06);
      // In use: the name lifts above the agent so it stays readable.
      tool.label.group.position.y = 0.85 + tool.heat * 0.95;
      faceCamera(tool.label.group);
    });

    // Stopped at the limit: the boundary flashes and the lock shows.
    const blocked = seg(t, 8.7, 9.0) * (1 - seg(t, 12.0, 12.4));
    const flash = blocked * (0.55 + 0.45 * Math.sin(total * 7));
    wallMaterial.color.copy(teal).lerp(red, flash);
    wallMaterial.opacity = 0.18 + flash * 0.12;
    rimMaterial.color.copy(teal).lerp(red, flash);
    lock.group.scale.setScalar(Math.max(0.0001, easeBack(seg(t, 8.8, 9.2)) * (1 - seg(t, 13.6, 14))));
    faceCamera(lock.group);
    faceCamera(payLabel.group);

    // It asks a person, who approves.
    const asking = seg(t, 9.5, 10.3) * (1 - seg(t, 13.4, 13.8));
    const from = new THREE.Vector3(here.x, 0.95, here.z);
    const to = new THREE.Vector3(PERSON.x, 1.05, PERSON.z);
    ask.setPoints([from, from.clone().lerp(to, asking)]);
    ask.object.visible = asking > 0.001;
    person.show(t >= 12.2 && t < 15.2 ? 2 : t >= 10.2 && t < 15.2 ? 1 : 0);
    person.group.scale.setScalar(1 + (seg(t, 10.2, 10.5) - seg(t, 13.5, 14)) * 0.08);
    faceCamera(person.group);

    faceCamera(checklist.group);
    checklist.show(t >= 12.6 && t < 15.4 ? 3 : t >= 7.6 && t < 15.4 ? 2 : t >= 6.0 && t < 15.4 ? 1 : 0);
  }

  return {
    frame: { w: 12.4, h: 7.4, target: [-0.5, 0.7, 0], yaw: 0.22, elev: 0.66 },
    story,
    staticTime: 12.9,
    update,
  };
}

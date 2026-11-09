import { C, FONT, HEX, chip, easeBack, easeInOut, easeOut, pastel, rr, seg } from "./kit.js";

/**
 * Strategy & Consulting: an opportunity map.
 *
 * A value / effort board. Each everyday task rises as a column (taller =
 * more valuable), a review pass picks the quick win, a boundary of data
 * rules goes up around it, and a rollout path is laid from the pilot to the
 * next task to expand into.
 */

const TASKS = [
  { id: "invoice", name: "Invoice entry", icon: "ph-receipt", hue: "coral", x: -3.0, z: -1.6, h: 2.3, pick: true },
  { id: "emails", name: "Customer emails", icon: "ph-envelope-simple", hue: "sky", x: 1.4, z: -0.2, h: 1.7, next: true },
  { id: "contracts", name: "Contract review", icon: "ph-file-text", hue: "rose", x: 2.9, z: -1.9, h: 2.0 },
  { id: "reports", name: "Weekly reports", icon: "ph-chart-line-up", hue: "lime", x: -3.7, z: 2.1, h: 0.8 },
  { id: "stock", name: "Stock forecasts", icon: "ph-package", hue: "green", x: 3.0, z: 1.6, h: 0.9 },
];

const MILESTONES = [
  { name: "Pilot", icon: "ph-flag", x: -2.0, z: 0.35 },
  { name: "Measure", icon: "ph-target", x: -0.3, z: 0.95 },
];

export const story = {
  cycle: 15,
  marks: [0, 3.6, 7.2, 10.8],
};

function paintBoard(ctx, W, H) {
  const m = 10;
  rr(ctx, m, m, W - m * 2, H - m * 2, 40);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = C.line;
  ctx.stroke();

  // Quick-win quadrant: high value (far side), low effort (left)
  ctx.save();
  rr(ctx, m, m, W - m * 2, H - m * 2, 40);
  ctx.clip();
  ctx.fillStyle = C.blueTint;
  ctx.fillRect(0, 0, W / 2, H / 2);
  ctx.restore();

  ctx.strokeStyle = "rgba(23, 25, 31, 0.12)";
  ctx.lineWidth = 3;
  ctx.setLineDash([18, 14]);
  ctx.beginPath();
  ctx.moveTo(W / 2, m + 20);
  ctx.lineTo(W / 2, H - m - 20);
  ctx.moveTo(m + 20, H / 2);
  ctx.lineTo(W - m - 20, H / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = C.blue;
  ctx.font = `600 34px ${FONT.mono}`;
  ctx.textAlign = "left";
  ctx.fillText("QUICK WINS", 70, H / 2 - 40);

  ctx.fillStyle = C.muted;
  ctx.font = `600 30px ${FONT.mono}`;
  ctx.textAlign = "right";
  ctx.fillText("MORE EFFORT  →", W - 70, H - 48);
  ctx.save();
  ctx.translate(52, H - 70);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "left";
  ctx.fillText("MORE VALUE  →", 0, 0);
  ctx.restore();
}

export function build(kit) {
  const { THREE, root, box, card, tile, faceCamera } = kit;

  root.add(tile({ w: 9.6, d: 6.4, paint: paintBoard, scale: 130 }));

  const dim = new THREE.Color(HEX.steel);
  const blue = new THREE.Color(HEX.blue);

  const pillars = TASKS.map((task) => {
    // Each task is its own colour until the review: the pick turns cobalt,
    // the rest step back to grey.
    const own = new THREE.Color(pastel(task.hue, 0.32));
    const column = box(0.82, 1, 0.82, own.getHex(), 0.06);
    column.position.set(task.x, 0, task.z);
    root.add(column);

    const label = card({ w: 2.1, h: 0.58, paint: chip({ icon: task.icon, title: task.name, hue: task.hue, solid: true }) });
    root.add(label.group);

    let tag = null;
    if (task.pick || task.next) {
      tag = card({
        w: 1.5,
        h: 0.44,
        paint: chip({ icon: task.pick ? "ph-check" : "ph-arrow-right", title: task.pick ? "Start here" : "Next", tone: "blue" }),
      });
      root.add(tag.group);
    }
    return { task, column, label, tag, own };
  });

  // Review pass: a sheet of light sweeping the board from left to right.
  const scan = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 3.0, 6.2),
    new THREE.MeshBasicMaterial({ color: HEX.blue, transparent: true, opacity: 0, depthWrite: false }),
  );
  root.add(scan);

  // Data rules: a glass boundary around the chosen task.
  const pick = pillars.find((p) => p.task.pick);
  const fence = new THREE.Group();
  const glass = new THREE.MeshStandardMaterial({
    color: HEX.success,
    transparent: true,
    opacity: 0.18,
    roughness: 0.2,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const S = 1.7;
  const H = 1;
  [
    [0, -S / 2, S, 0.04],
    [0, S / 2, S, 0.04],
    [-S / 2, 0, 0.04, S],
    [S / 2, 0, 0.04, S],
  ].forEach(([x, z, w, d]) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, H, d), glass);
    wall.position.set(x, H / 2, z);
    fence.add(wall);
  });
  const rim = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(S, H, S)),
    new THREE.LineBasicMaterial({ color: HEX.success, transparent: true, opacity: 0.9 }),
  );
  rim.position.y = H / 2;
  fence.add(rim);
  fence.position.set(pick.task.x, 0, pick.task.z);
  root.add(fence);

  const rules = card({ w: 2.4, h: 0.62, paint: chip({ icon: "ph-shield-check", title: "Data rules", sub: "Who sees what, who checks", tone: "success" }) });
  rules.group.position.set(pick.task.x - 1.1, 0.75, pick.task.z + 0.2);
  root.add(rules.group);

  // Rollout path: pilot → measure → expand into the next task.
  const next = pillars.find((p) => p.task.next);
  const route = [
    new THREE.Vector3(pick.task.x, 0.03, pick.task.z),
    ...MILESTONES.map((m) => new THREE.Vector3(m.x, 0.03, m.z)),
    new THREE.Vector3(next.task.x, 0.03, next.task.z),
  ];
  const curve = new THREE.CatmullRomCurve3(route, false, "centripetal", 0.4);
  const DOTS = 34;
  const dotGeometry = new THREE.CylinderGeometry(0.075, 0.075, 0.03, 14);
  const dotMaterial = new THREE.MeshStandardMaterial({ color: HEX.blue, roughness: 0.4 });
  const dots = Array.from({ length: DOTS }, (_, i) => {
    const dot = new THREE.Mesh(dotGeometry, dotMaterial);
    dot.position.copy(curve.getPoint((i + 0.5) / DOTS));
    root.add(dot);
    return dot;
  });
  const flags = MILESTONES.map((m) => {
    const post = box(0.07, 1.0, 0.07, HEX.navy, 0.02);
    post.position.set(m.x, 0.5, m.z);
    const flag = card({ w: 1.55, h: 0.5, paint: chip({ icon: m.icon, title: m.name, hue: "cobalt", solid: true }) });
    flag.group.position.set(m.x + 0.6, 1.0, m.z);
    root.add(post, flag.group);
    return { post, flag, m };
  });

  const pop = (object, k) => object.scale.setScalar(Math.max(0.0001, easeBack(k)));

  function update(t) {
    const out = 1 - easeInOut(seg(t, 14.2, 14.9));

    // 1. Map the work: columns rise, names pop above them.
    pillars.forEach((p, i) => {
      const grow = easeOut(seg(t, 0.25 + i * 0.28, 1.25 + i * 0.28)) * out;
      const h = Math.max(0.001, p.task.h * grow);
      p.column.scale.y = h;
      p.column.position.y = h / 2;

      // 2. Review: the sweep reaches each column, the picks turn blue and
      //    the rest step back.
      const reached = seg(t, 3.9 + ((p.task.x + 4.5) / 9) * 1.8, 4.3 + ((p.task.x + 4.5) / 9) * 1.8);
      const toBlue = p.task.pick ? reached : p.task.next ? seg(t, 13.2, 13.8) : 0;
      p.column.material.color.copy(p.own).lerp(dim, p.task.pick || p.task.next ? 0 : reached * 0.75).lerp(blue, toBlue);

      p.label.group.position.set(p.task.x, h + 0.5, p.task.z);
      pop(p.label.group, seg(t, 0.8 + i * 0.28, 1.3 + i * 0.28) * out);
      faceCamera(p.label.group);

      if (p.tag) {
        p.tag.group.position.set(p.task.x, h + 1.12, p.task.z);
        const at = p.task.pick ? 4.7 : 13.4;
        pop(p.tag.group, seg(t, at, at + 0.45) * out);
        faceCamera(p.tag.group);
      }
    });

    const sweep = seg(t, 3.7, 5.9);
    scan.position.set(-4.6 + sweep * 9.2, 1.5, 0);
    scan.material.opacity = 0.32 * Math.sin(Math.PI * sweep);
    scan.visible = sweep > 0 && sweep < 1;

    // 3. Safe-use rules go up around the pilot.
    const walls = easeOut(seg(t, 7.3, 8.3)) * out;
    fence.scale.set(1, Math.max(0.001, walls * 1.1), 1);
    fence.visible = walls > 0.001;
    pop(rules.group, seg(t, 8.0, 8.5) * out);
    faceCamera(rules.group);

    // 4. Roll out: the path is laid dot by dot, with milestones on the way.
    const laid = seg(t, 10.9, 13.2);
    dots.forEach((dot, i) => {
      const k = seg(laid * DOTS, i, i + 1.5) * out;
      dot.scale.setScalar(Math.max(0.0001, easeBack(k)));
    });
    flags.forEach(({ post, flag }, i) => {
      const k = seg(t, 11.5 + i * 0.75, 12.0 + i * 0.75) * out;
      post.scale.set(1, Math.max(0.001, easeOut(k)), 1);
      post.position.y = 0.5 * easeOut(k);
      pop(flag.group, k);
      faceCamera(flag.group);
    });
  }

  return {
    frame: { w: 11.6, h: 7.2, target: [0, 0.8, 0.3], yaw: -0.3, elev: 0.68 },
    story,
    staticTime: 13.9,
    update,
  };
}

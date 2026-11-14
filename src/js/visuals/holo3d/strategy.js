import { THREE, COLOR, mergeGeometries, seg, lerp, easeOut, easeInOut, easeBack, window01 } from "./kit.js";

/**
 * Strategy & Consulting: a hologram of the business itself.
 *
 * A miniature office floor (reception, the finance team's desks, a meeting
 * room, support desks, the warehouse) with its people at work. A scan
 * passes over it and maps how work gets done; three areas light up where
 * AI could help; a pin drops on the quick win (finance); a fence of light
 * goes up around it (the data rules); and a route grows from it to the next
 * area (support). No text: the floor tells it.
 */

export const story = {
  cycle: 15,
  marks: [0, 3.6, 7.2, 10.8],
};

const FLOOR = { w: 12.4, d: 7.8 };
const X0 = -FLOOR.w / 2;
const Z0 = -FLOOR.d / 2;
const WALL_H = 0.55;

// Rooms on the floor (x0, x1, z0, z1).
const AREAS = {
  finance: [-6.2, -1, -3.9, 0.5],
  reception: [-6.2, -1, 0.5, 3.9],
  meeting: [-1, 2.5, -3.9, -0.5],
  support: [-1, 2.5, -0.5, 3.9],
  warehouse: [2.5, 6.2, -3.9, 3.9],
};
// Where AI could help, in the order they light up; the first is the pick.
const SPOTS = ["finance", "support", "warehouse"];

const SCAN_FROM = 0.5;
const SCAN_TO = 3.3;
const OUT = 14.2;

/* ── Geometry helpers ── */
function box(w, h, d, x, y, z) {
  return new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z);
}
function cyl(r, h, x, y, z, seg = 20) {
  return new THREE.CylinderGeometry(r, r, h, seg).translate(x, y + h / 2, z);
}
function merge(list) {
  const g = mergeGeometries(list.map((x) => x.toNonIndexed()), false);
  list.forEach((x) => x.dispose());
  return g;
}

/** A desk with a monitor and a chair; the person sits at the chair. */
function workstation(x, z, facing = 1) {
  return [
    box(1.0, 0.36, 0.56, x, 0, z),
    box(0.5, 0.32, 0.05, x, 0.36, z - 0.16 * facing),
    box(0.06, 0.06, 0.06, x, 0.36, z - 0.1 * facing),
    box(0.36, 0.22, 0.36, x, 0, z + 0.55 * facing),
  ];
}
function person(x, z) {
  return [
    new THREE.CapsuleGeometry(0.11, 0.22, 4, 10).translate(x, 0.45, z),
    new THREE.SphereGeometry(0.1, 14, 10).translate(x, 0.78, z),
  ];
}

export function build(kit) {
  const { scene, holo, line, points, segments, mix } = kit;
  const root = new THREE.Group();
  scene.add(root);

  /* Floor and a faint grid on it */
  const floor = holo(new THREE.BoxGeometry(FLOOR.w, 0.1, FLOOR.d).translate(0, -0.05, 0), { face: 0.03, level: 0.6, occlude: false });
  root.add(floor.group);
  const grid = [];
  for (let x = X0 + 0.6; x < -X0; x += 0.6) grid.push([[x, 0.005, Z0], [x, 0.005, -Z0]]);
  for (let z = Z0 + 0.6; z < -Z0; z += 0.6) grid.push([[X0, 0.005, z], [-X0, 0.005, z]]);
  const gridLines = segments(grid, { level: 0.08 });
  root.add(gridLines.object);

  /* Walls, with door gaps */
  const W = 0.08;
  const walls = [];
  const wall = (x1, z1, x2, z2) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const g = box(x1 === x2 ? W : len, WALL_H, x1 === x2 ? len : W, (x1 + x2) / 2, 0, (z1 + z2) / 2);
    walls.push(g);
  };
  // Outer shell, entrance at the front of reception.
  wall(X0, Z0, -X0, Z0);
  wall(X0, Z0, X0, -Z0);
  wall(-X0, Z0, -X0, -Z0);
  wall(X0, -Z0, -3.6, -Z0);
  wall(-2.4, -Z0, -X0, -Z0);
  // Finance | meeting, finance | reception, meeting | support, warehouse.
  wall(-1, Z0, -1, 0.5);
  wall(X0, 0.5, -2.7, 0.5);
  wall(-1.7, 0.5, -1, 0.5);
  wall(-1, -0.5, 0.2, -0.5);
  wall(1.2, -0.5, 2.5, -0.5);
  wall(2.5, Z0, 2.5, 0.4);
  wall(2.5, 1.6, 2.5, -Z0);
  const wallHolo = holo(merge(walls), { color: COLOR.ice, face: 0.05, level: 0.75 });
  root.add(wallHolo.group);

  /* Furniture and people, per area */
  const furniture = {
    finance: [
      ...workstation(-5.1, -2.9), ...workstation(-3.7, -2.9), ...workstation(-2.3, -2.9),
      ...workstation(-5.1, -1.1), ...workstation(-3.7, -1.1), ...workstation(-2.3, -1.1),
      box(0.5, 1.0, 0.4, -5.8, 0, 0.1), box(0.5, 1.0, 0.4, -5.2, 0, 0.1),
    ],
    reception: [
      box(2.3, 0.5, 0.42, -4.2, 0, 1.7), box(0.42, 0.5, 1.1, -5.15, 0, 2.25),
      box(0.4, 0.22, 0.4, -2.0, 0, 3.2), box(0.4, 0.22, 0.4, -2.6, 0, 3.2), box(0.4, 0.22, 0.4, -3.2, 0, 3.2),
      cyl(0.17, 0.3, -1.45, 0, 1.0), new THREE.IcosahedronGeometry(0.32, 0).translate(-1.45, 0.62, 1.0),
    ],
    meeting: [
      cyl(0.95, 0.36, 0.75, 0, -2.2, 28),
      ...Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return box(0.34, 0.22, 0.34, 0.75 + Math.cos(a) * 1.4, 0, -2.2 + Math.sin(a) * 1.15);
      }),
      box(1.6, 0.9, 0.06, 0.75, 0.1, -3.75),
    ],
    support: [
      ...workstation(0.0, 0.7), ...workstation(1.5, 0.7),
      ...workstation(0.0, 2.9, -1), ...workstation(1.5, 2.9, -1),
    ],
    warehouse: [
      // Three racks of shelves with boxes on them.
      ...[3.35, 4.45, 5.55].flatMap((x) => [
        box(0.06, 1.3, 0.06, x - 0.3, 0, -3.3), box(0.06, 1.3, 0.06, x + 0.3, 0, -3.3),
        box(0.06, 1.3, 0.06, x - 0.3, 0, -0.5), box(0.06, 1.3, 0.06, x + 0.3, 0, -0.5),
        box(0.66, 0.04, 2.86, x, 0.3, -1.9), box(0.66, 0.04, 2.86, x, 0.75, -1.9), box(0.66, 0.04, 2.86, x, 1.2, -1.9),
        box(0.4, 0.3, 0.4, x, 0.34, -2.8), box(0.4, 0.26, 0.5, x, 0.34, -1.4), box(0.4, 0.3, 0.4, x, 0.79, -2.2),
        box(0.4, 0.3, 0.4, x, 0.79, -0.9), box(0.4, 0.25, 0.4, x, 1.24, -2.6),
      ]),
      // A pallet with stacked boxes, and a trolley.
      box(1.2, 0.12, 1.0, 4.0, 0, 2.4), box(0.5, 0.4, 0.45, 3.75, 0.12, 2.2), box(0.5, 0.4, 0.45, 4.3, 0.12, 2.2),
      box(0.5, 0.4, 0.45, 3.75, 0.12, 2.65), box(0.5, 0.35, 0.45, 4.0, 0.52, 2.4),
      box(0.7, 0.06, 0.5, 5.4, 0.2, 2.6), box(0.06, 0.8, 0.5, 5.75, 0.2, 2.6),
    ],
  };
  const people = {
    finance: [[-5.1, -2.35], [-3.7, -2.35], [-2.3, -2.35], [-5.1, -0.55], [-3.7, -0.55], [-2.3, -0.55]],
    reception: [[-4.2, 1.2], [-2.6, 3.2]],
    meeting: [[0.75 + 1.4, -2.2], [0.75 - 0.7, -2.2 - 1.0]],
    support: [[0.0, 1.25], [1.5, 1.25], [0.0, 2.35], [1.5, 2.35]],
    warehouse: [[4.45, 0.4], [3.9, 1.6]],
  };

  const rooms = {};
  Object.keys(AREAS).forEach((name) => {
    const [x0, x1, z0, z1] = AREAS[name];
    const things = holo(merge(furniture[name]), { face: 0.05 });
    const folk = holo(merge(people[name].flatMap(([x, z]) => person(x, z))), { color: COLOR.amber, face: 0.7, level: 1, threshold: 70 });
    // A patch of light on the floor of the room, for when it is picked out.
    const patch = holo(new THREE.BoxGeometry(x1 - x0 - 0.2, 0.02, z1 - z0 - 0.2).translate((x0 + x1) / 2, 0.012, (z0 + z1) / 2), {
      color: COLOR.ice,
      face: 0.1,
      edge: 0.7,
      level: 0,
      occlude: false,
    });
    root.add(things.group, folk.group, patch.group);
    rooms[name] = { things, folk, patch, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, x0, x1 };
  });

  /* The scan beam: a sheet of light that crosses the floor. */
  const beam = holo(new THREE.PlaneGeometry(FLOOR.d + 0.6, 2.4).rotateY(Math.PI / 2).translate(0, 1.2, 0), {
    face: 0.3,
    level: 0,
    side: THREE.DoubleSide,
    occlude: false,
  });
  root.add(beam.group);

  /* The pin on the quick win, and a ripple where it lands. */
  const F = rooms.finance;
  const pinGeo = merge([
    new THREE.SphereGeometry(0.34, 24, 16).translate(0, 0.95, 0),
    new THREE.ConeGeometry(0.24, 0.8, 24).rotateX(Math.PI).translate(0, 0.42, 0),
  ]);
  const pin = holo(pinGeo.clone().scale(1.5, 1.5, 1.5), { color: COLOR.ice, face: 0.5, level: 0, threshold: 40 });
  pin.group.position.set(F.cx, 0, F.cz - 0.3);
  root.add(pin.group);
  const ripple = holo(new THREE.RingGeometry(0.5, 0.56, 48).rotateX(-Math.PI / 2), { color: COLOR.ice, face: 0.6, level: 0, side: THREE.DoubleSide, occlude: false });
  ripple.group.position.set(F.cx, 0.03, F.cz - 0.3);
  root.add(ripple.group);

  /* The fence of data rules around the finance room. */
  const [fx0, fx1, fz0, fz1] = [AREAS.finance[0] + 0.25, AREAS.finance[1] - 0.25, AREAS.finance[2] + 0.25, AREAS.finance[3] - 0.25];
  const posts = [];
  const postAt = (x, z) => posts.push(box(0.05, 1.1, 0.05, x, 0, z));
  for (let x = fx0; x <= fx1 + 0.01; x += (fx1 - fx0) / 10) {
    postAt(x, fz0);
    postAt(x, fz1);
  }
  for (let z = fz0 + (fz1 - fz0) / 8; z < fz1 - 0.01; z += (fz1 - fz0) / 8) {
    postAt(fx0, z);
    postAt(fx1, z);
  }
  [0.55, 1.1].forEach((y) => {
    posts.push(box(fx1 - fx0, 0.04, 0.04, (fx0 + fx1) / 2, y - 0.04, fz0));
    posts.push(box(fx1 - fx0, 0.04, 0.04, (fx0 + fx1) / 2, y - 0.04, fz1));
    posts.push(box(0.04, 0.04, fz1 - fz0, fx0, y - 0.04, (fz0 + fz1) / 2));
    posts.push(box(0.04, 0.04, fz1 - fz0, fx1, y - 0.04, (fz0 + fz1) / 2));
  });
  const fence = holo(merge(posts), { color: COLOR.teal, face: 0.15, level: 0 });
  // A faint sheet of light between the posts.
  const sheetGeo = merge([
    new THREE.PlaneGeometry(fx1 - fx0, 1.1).translate((fx0 + fx1) / 2, 0.55, fz0),
    new THREE.PlaneGeometry(fx1 - fx0, 1.1).translate((fx0 + fx1) / 2, 0.55, fz1),
    new THREE.PlaneGeometry(fz1 - fz0, 1.1).rotateY(Math.PI / 2).translate(fx0, 0.55, (fz0 + fz1) / 2),
    new THREE.PlaneGeometry(fz1 - fz0, 1.1).rotateY(Math.PI / 2).translate(fx1, 0.55, (fz0 + fz1) / 2),
  ]);
  const sheet = holo(sheetGeo, { color: COLOR.teal, face: 0.05, level: 0, edge: 0, side: THREE.DoubleSide, occlude: false });
  const fenceGroup = new THREE.Group();
  fenceGroup.add(fence.group, sheet.group);
  root.add(fenceGroup);

  /* The rollout route: out of finance, through reception, to support. */
  const S = rooms.support;
  const routePts = [
    [-2.2, 0.08, -0.6],
    [-2.2, 0.08, 0.5],
    [-2.0, 0.08, 1.15],
    [-0.6, 0.08, 1.2],
    [0.75, 0.08, 1.8],
  ].map((v) => new THREE.Vector3(...v));
  const route = line(routePts, { color: COLOR.ice, samples: 120 });
  const ribbonGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(routePts, false, "centripetal"), 160, 0.07, 6, false);
  const ribbon = holo(ribbonGeo, { color: COLOR.ice, face: 0.55, edge: 0, level: 0, occlude: false });
  const ribbonCount = ribbonGeo.index.count;
  root.add(route.object, ribbon.group);
  const nextPin = holo(pinGeo.clone().scale(0.7, 0.7, 0.7), { color: COLOR.cobalt, face: 0.6, level: 0, threshold: 40 });
  nextPin.group.position.set(0.75, 0, 1.8);
  root.add(nextPin.group);

  /* Light: packets on the route, sparks rising from picked rooms. */
  const packets = points(6, { color: COLOR.ice, size: 1.1 });
  const sparks = points(36, { color: COLOR.ice, size: 0.55 });
  root.add(packets.object, sparks.object);
  const seeds = Array.from({ length: sparks.count }, (_, i) => {
    const [x0, x1, z0, z1] = AREAS[SPOTS[i % 3]];
    return { room: i % 3, x: lerp(x0 + 0.4, x1 - 0.4, ((i * 37) % 23) / 23), z: lerp(z0 + 0.4, z1 - 0.4, ((i * 53) % 29) / 29), off: (i * 0.61) % 1 };
  });

  /* ── The story ── */
  function update(t, dt, clock) {
    const out = 1 - seg(t, OUT, OUT + 0.7);

    // 1. The floor maps in under a passing scan.
    const scanU = easeInOut(seg(t, SCAN_FROM, SCAN_TO));
    const scanOn = window01(t, SCAN_FROM - 0.2, SCAN_TO - 0.25, 0.3);
    const scanX = lerp(X0 - 0.6, -X0 + 0.6, scanU);
    beam.group.position.x = scanX;
    beam.set(0.55 * scanOn * (kit.still ? 0 : 1));
    kit.scan(scanX, scanOn * (kit.still ? 0 : 1), 1.4);

    const build = easeOut(seg(t, 0, 0.6));
    floor.set(0.6 * build);
    gridLines.set(0.1 * build);
    wallHolo.set(0.75 * build);

    // 2. Where AI could help: three rooms light up, finance is pinned.
    const lit = SPOTS.map((_, i) => window01(t, 3.8 + i * 0.35, OUT, 0.5) * out);
    const settle = seg(t, 5.6, 6.2); // the other two step back once the pick is made
    const quiet = seg(t, 3.8, 4.4) * out; // rooms that are not candidates fade back

    Object.entries(rooms).forEach(([name, room]) => {
      // Mapped once the scan has passed over the room's middle.
      const mapped = kit.still ? 1 : seg(scanX, room.x0 - 0.4, room.x1 + 0.2);
      const tail = 1 - 0.55 * seg(t, OUT, OUT + 0.7);
      const spot = SPOTS.indexOf(name);
      const pickedLevel = spot < 0 ? 0 : lit[spot] * (spot === 0 ? 1 : 1 - settle * 0.55);
      const nextOn = name === "support" ? window01(t, 12.3, OUT, 0.5) * out : 0;
      const base = lerp(0.35, 0.85, mapped) * tail;
      const level = spot < 0 ? base * (1 - quiet * 0.4) : base + pickedLevel * 0.15 + nextOn * 0.15;
      room.things.set(level, spot >= 0 && pickedLevel > 0.05 ? mix(COLOR.cobalt, COLOR.ice, pickedLevel * 0.6) : COLOR.cobalt);
      room.folk.set((0.4 + mapped * 0.4) * tail * (spot < 0 ? 1 - quiet * 0.3 : 1));
      room.folk.group.position.y = kit.still ? 0 : Math.sin(clock * 2 + room.cx) * 0.015;
      room.patch.set(Math.max(pickedLevel, nextOn) * 0.5, name === "finance" || nextOn > 0 ? COLOR.teal : COLOR.ice);
    });

    const drop = seg(t, 5.0, 5.7);
    pin.set(easeOut(seg(t, 5.0, 5.2)) * out);
    pin.group.position.y = lerp(3.4, 1.25, easeBack(drop)) + (kit.still ? 0 : Math.sin(clock * 1.6) * 0.05 * seg(t, 5.8, 6.4));
    pin.group.rotation.y = clock * 0.6;
    const rip = seg(t, 5.6, 6.6);
    ripple.group.scale.setScalar(1 + rip * 2.6);
    ripple.set((1 - rip) * (rip > 0 ? 1 : 0) * out);

    // 3. The rules: a fence of light goes up around finance.
    const rise = easeOut(seg(t, 7.4, 8.5));
    fenceGroup.scale.y = Math.max(0.001, rise);
    fenceGroup.visible = rise > 0.001;
    const hum = kit.still ? 1 : 0.85 + 0.15 * Math.sin(clock * 3);
    fence.set(rise * out * 0.9);
    sheet.set(rise * out * hum);

    // 4. The rollout: a route grows from the pick to the next area.
    const grow = easeInOut(seg(t, 11.0, 12.4));
    route.show(grow);
    route.set(1.2 * out);
    ribbonGeo.setDrawRange(0, Math.floor((grow * ribbonCount) / 6) * 6);
    ribbon.set(0.9 * out * (grow > 0 ? 1 : 0));
    nextPin.set(easeOut(seg(t, 12.3, 12.7)) * out);
    nextPin.group.position.y = lerp(1.8, 0.35, easeBack(seg(t, 12.3, 12.9)));
    nextPin.group.rotation.y = -clock * 0.6;
    for (let i = 0; i < packets.count; i += 1) {
      const u = (clock * 0.32 + i / packets.count) % 1;
      if (grow < 1 || kit.still || u > grow) {
        packets.hide(i);
        continue;
      }
      const p = route.at(u);
      packets.set(i, p.x, p.y + 0.04, p.z, out * Math.sin(u * Math.PI));
    }
    packets.commit();

    // Sparks rise from the rooms while they are picked out.
    seeds.forEach((s, i) => {
      const on = s.room === 0 ? lit[0] : lit[s.room] * (1 - settle * 0.7);
      if (kit.still || on < 0.05) {
        sparks.hide(i);
        return;
      }
      const u = (clock * 0.35 + s.off) % 1;
      sparks.set(i, s.x, 0.2 + u * 1.6, s.z, on * Math.sin(u * Math.PI) * 0.5);
    });
    sparks.commit();
  }

  return {
    frame: { w: 16, h: 9.4, target: [0, 0.2, 0.95], yaw: -0.52, elev: 0.74 },
    story,
    staticTime: 13.4,
    update,
  };
}

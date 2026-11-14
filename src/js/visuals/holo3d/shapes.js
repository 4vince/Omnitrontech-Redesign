import { THREE, mergeGeometries, seg, lerp, easeInOut } from "./kit.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/* Shared building blocks for the service holograms. */

const PI_2 = Math.PI / 2;

/** A box standing on y (its base at y), centred on x and z. */
export function box(w, h, d, x, y, z) {
  return new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z);
}

/** Merge parts into one geometry (one draw call) and free the parts. */
export function merge(list) {
  const g = mergeGeometries(
    list.map((x) => (x.index ? x.toNonIndexed() : x)),
    false,
  );
  list.forEach((x) => x.dispose());
  return g;
}

/** A thin bar in the XY plane from (x1, y1) to (x2, y2), at depth z. */
export function barXY(x1, y1, x2, y2, w = 0.04, z = 0, d = 0.02) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return new THREE.BoxGeometry(Math.hypot(dx, dy), w, d)
    .rotateZ(Math.atan2(dy, dx))
    .translate((x1 + x2) / 2, (y1 + y2) / 2, z);
}

/** A standing person facing +z; origin at the feet. The right arm is separate. */
export function personGeo() {
  return merge([
    new THREE.CapsuleGeometry(0.09, 0.62, 4, 10).translate(-0.11, 0.42, 0),
    new THREE.CapsuleGeometry(0.09, 0.62, 4, 10).translate(0.11, 0.42, 0),
    new THREE.CapsuleGeometry(0.21, 0.42, 6, 14).translate(0, 1.17, 0),
    new THREE.SphereGeometry(0.16, 18, 12).translate(0, 1.72, 0),
    new THREE.CapsuleGeometry(0.06, 0.5, 4, 8).rotateZ(0.12).translate(-0.3, 1.16, 0),
  ]);
}

/** The right arm, hanging from the shoulder (origin), hand at the end. */
export function armGeo() {
  return merge([
    new THREE.CapsuleGeometry(0.06, 0.52, 4, 8).translate(0, -0.33, 0),
    new THREE.SphereGeometry(0.08, 12, 8).translate(0, -0.66, 0),
  ]);
}

/**
 * An amber person built from `kit.holo`, with a right arm that can reach.
 * Returns { group, body, arm, tip }: put `group` in the scene, rotate
 * `arm.group.rotation.x` negative to raise the arm forward.
 */
export function makePerson(kit, { color, level = 0.6, scale = 1.3 } = {}) {
  const body = kit.holo(personGeo(), { color, face: 0.85, level, threshold: 40 });
  const arm = kit.holo(armGeo(), { color, face: 0.85, level, threshold: 40 });
  arm.group.position.set(0.3, 1.5, 0);
  const tip = new THREE.Object3D();
  tip.position.set(0, -0.72, 0);
  arm.group.add(tip);
  const group = new THREE.Group();
  group.add(body.group, arm.group);
  group.scale.setScalar(scale);
  return {
    group,
    body,
    arm,
    tip,
    set(v) {
      body.set(v);
      arm.set(v);
    },
  };
}

/* Keyframed values: keys are [t, ...values]; eases in and out between,
   holds before the first key and after the last. */
export function keyed(keys, t, out = []) {
  const n = keys[0].length - 1;
  let a = keys[0];
  let b = keys[0];
  let k = 0;
  if (t > keys[0][0]) {
    a = keys[keys.length - 1];
    b = a;
    for (let i = 1; i < keys.length; i += 1) {
      if (t <= keys[i][0]) {
        a = keys[i - 1];
        b = keys[i];
        k = easeInOut(seg(t, a[0], b[0]));
        break;
      }
    }
  }
  for (let i = 0; i < n; i += 1) out[i] = lerp(a[i + 1], b[i + 1], k);
  return out;
}

/** A seated person facing +z; origin at the floor under the seat. Right arm separate. */
export function seatedGeo() {
  return merge([
    new THREE.CapsuleGeometry(0.2, 0.36, 6, 14).translate(0, 1.0, -0.05),
    new THREE.SphereGeometry(0.15, 18, 12).translate(0, 1.5, -0.03),
    new THREE.CapsuleGeometry(0.085, 0.36, 4, 10).rotateX(PI_2).translate(-0.11, 0.6, 0.2),
    new THREE.CapsuleGeometry(0.085, 0.36, 4, 10).rotateX(PI_2).translate(0.11, 0.6, 0.2),
    new THREE.CapsuleGeometry(0.075, 0.4, 4, 10).translate(-0.11, 0.3, 0.42),
    new THREE.CapsuleGeometry(0.075, 0.4, 4, 10).translate(0.11, 0.3, 0.42),
    new THREE.CapsuleGeometry(0.06, 0.44, 4, 8).rotateX(-0.9).translate(-0.27, 1.05, 0.12),
  ]);
}

/** An office chair facing +z; origin at the floor. */
export function chairGeo() {
  return merge([
    box(0.5, 0.07, 0.48, 0, 0.44, 0),
    box(0.48, 0.55, 0.06, 0, 0.56, -0.24),
    new THREE.CylinderGeometry(0.035, 0.035, 0.36, 8).translate(0, 0.26, 0),
    box(0.56, 0.04, 0.06, 0, 0.04, 0),
    box(0.06, 0.04, 0.56, 0, 0.04, 0),
  ]);
}

/** A seated person in amber with a right arm that can reach forward. */
export function makeSeated(kit, { color, level = 0.6, scale = 1 } = {}) {
  const body = kit.holo(seatedGeo(), { color, face: 0.85, level, threshold: 40 });
  const arm = kit.holo(armGeo(), { color, face: 0.85, level, threshold: 40 });
  arm.group.position.set(0.27, 1.3, -0.05);
  const group = new THREE.Group();
  group.add(body.group, arm.group);
  group.scale.setScalar(scale);
  return {
    group,
    body,
    arm,
    set(v) {
      body.set(v);
      arm.set(v);
    },
  };
}

/* ── Office furniture and app glyphs, shared by the office scenes ── */

/** A desk: top at 0.74, side panels and a modesty panel; origin at the floor centre. */
export function deskGeo(w = 2, d = 0.85) {
  return merge([
    box(w, 0.05, d, 0, 0.7, 0),
    box(0.05, 0.7, d - 0.06, -w / 2 + 0.06, 0, 0),
    box(0.05, 0.7, d - 0.06, w / 2 - 0.06, 0, 0),
    box(w - 0.2, 0.36, 0.03, 0, 0.3, -d / 2 + 0.06),
  ]);
}
export const DESK_TOP = 0.75;

/** A monitor on a stand, screen facing +z; origin at the stand's foot. */
export function monitorGeo(w = 0.95, h = 0.58) {
  return merge([
    box(0.32, 0.02, 0.2, 0, 0, 0),
    box(0.05, 0.3, 0.04, 0, 0.02, -0.03),
    box(w, h, 0.04, 0, 0.3, 0),
  ]);
}
/** Height of a monitor screen's centre above the stand's foot. */
export const screenMid = (h = 0.58) => 0.3 + h / 2;

/** A bar that grows from its left end (scale.x 0 → 1). */
export function rowGeo(len, h = 0.05) {
  return new THREE.BoxGeometry(len, h, 0.012).translate(len / 2, 0, 0);
}

/** A laptop, lid open towards +z's opposite (the user sits at -z); origin at its base centre. */
export function laptopGeo() {
  return merge([box(0.52, 0.02, 0.36, 0, 0, 0), box(0.52, 0.34, 0.015, 0, 0, 0).rotateX(-0.25).translate(0, 0.02, 0.17)]);
}

/** A floating app window frame: a panel with a title bar; centred, facing +z. */
export function windowGeo(w = 1, h = 0.72) {
  return merge([box(w, h, 0.02, 0, -h / 2, 0), barXY(-w / 2 + 0.04, h / 2 - 0.08, w / 2 - 0.04, h / 2 - 0.08, 0.012, 0.012)]);
}

/* Glyphs, each centred on its origin in the XY plane, about 0.4 across. */
export function envelopeGlyph(s = 1) {
  const w = 0.42 * s;
  const h = 0.28 * s;
  return merge([box(w, h, 0.02, 0, -h / 2, 0), barXY(-w / 2, h / 2, 0, -h * 0.1, 0.02 * s, 0.015), barXY(w / 2, h / 2, 0, -h * 0.1, 0.02 * s, 0.015)]);
}
export function pageGlyph(s = 1, lines = 4) {
  const w = 0.3 * s;
  const h = 0.4 * s;
  const parts = [box(w, h, 0.02, 0, -h / 2, 0)];
  for (let i = 0; i < lines; i += 1) {
    const y = h * 0.3 - i * h * 0.17;
    parts.push(barXY(-w * 0.32, y, i % 2 ? w * 0.12 : w * 0.32, y, 0.022 * s, 0.015));
  }
  return merge(parts);
}
export function formGlyph(s = 1) {
  const w = 0.3 * s;
  const h = 0.4 * s;
  const parts = [box(w, h, 0.02, 0, -h / 2, 0)];
  for (let i = 0; i < 3; i += 1) {
    const y = h * 0.28 - i * h * 0.22;
    parts.push(box(w * 0.14, w * 0.14, 0.02, -w * 0.28, y - w * 0.07, 0.012));
    parts.push(barXY(-w * 0.12, y, w * 0.34, y, 0.022 * s, 0.015));
  }
  return merge(parts);
}
export function cardGlyph(s = 1) {
  const w = 0.44 * s;
  const h = 0.28 * s;
  return merge([box(w, h, 0.02, 0, -h / 2, 0), box(w, 0.05 * s, 0.01, 0, h * 0.12, 0.012), box(0.08 * s, 0.06 * s, 0.01, -w * 0.28, -h * 0.22, 0.012)]);
}
export function gridGlyph(s = 1) {
  const c = 0.09 * s;
  const parts = [box(0.36 * s, 0.05 * s, 0.02, 0, 0.14 * s, 0)];
  for (let r = 0; r < 3; r += 1) for (let k = 0; k < 3; k += 1) parts.push(box(c, c * 0.8, 0.02, (k - 1) * c * 1.3, 0.04 * s - r * c * 1.1 - c * 0.4, 0));
  return merge(parts);
}
export function bustGlyph(s = 1) {
  return merge([
    new THREE.SphereGeometry(0.07 * s, 14, 10).translate(-0.1 * s, 0.06 * s, 0),
    new THREE.CapsuleGeometry(0.075 * s, 0.05 * s, 4, 10).rotateZ(PI_2).translate(-0.1 * s, -0.1 * s, 0),
    barXY(0.04 * s, 0.06 * s, 0.2 * s, 0.06 * s, 0.03 * s, 0),
    barXY(0.04 * s, -0.04 * s, 0.16 * s, -0.04 * s, 0.03 * s, 0),
  ]);
}

/* ── Hardware detail ── */

/** A rounded, bevelled box standing on y (its base at y). */
export function rbox(w, h, d, x = 0, y = 0, z = 0, r = 0.02) {
  return new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)).translate(x, y + h / 2, z);
}

/** A grid of small flat parts on a front face at depth z (ports, keys, bays). */
export function grid(cols, rows, cw, ch, gx, gy, x0, y0, z, depth = 0.012) {
  const parts = [];
  for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) parts.push(box(cw, ch, depth, x0 + c * gx, y0 + r * gy, z));
  return parts;
}

/** Vent slots: rows of thin horizontal slits on a front face. */
export function vents(cols, rows, w, x0, y0, gx, gy, z) {
  return grid(cols, rows, w, 0.007, gx, gy, x0, y0, z, 0.008);
}

import { HEX, HUE, chip, easeBack, easeInOut, easeOut, pastel, seg } from "./kit.js";

/**
 * Data & Reporting: scattered sources become one early warning.
 *
 * Four business systems stream records into one cleaning step, and a
 * weekly chart builds from them. The usual range is learned, one week
 * breaks out of it, and the team is alerted while there is still time.
 */

const SOURCES = [
  { name: "Sales", icon: "ph-storefront", hue: "coral", z: -2.1 },
  { name: "Finance", icon: "ph-coins", hue: "lime", z: -0.7 },
  { name: "Equipment", icon: "ph-factory", hue: "rose", z: 0.7 },
  { name: "Service desk", icon: "ph-headset", hue: "sky", z: 2.1 },
];
const SOURCE_X = -4.7;
const MERGE = { x: -1.9, y: 0.95, z: 0 };
const CHART = { x0: 0.45, x1: 4.75, z: 0.15 };

// Weekly values; the band is what "normal" looks like.
const WEEKS = [1.05, 1.2, 0.95, 1.15, 1.3, 1.1, 1.0, 1.25, 1.15, 2.45, 1.2, 1.1];
const SPIKE = 9;
const BAND = { lo: 0.8, hi: 1.5 };

const STREAM = 14;

export const story = {
  cycle: 15,
  marks: [0, 3.6, 7.2, 10.8],
};

export function build(kit) {
  const { THREE, root, box, card, faceCamera, mat } = kit;

  /* Sources */
  const sources = SOURCES.map((s) => {
    const block = box(1.05, 0.55, 0.85, pastel(s.hue, 0.5), 0.08);
    block.position.set(SOURCE_X, 0.275, s.z);
    const label = card({ w: 1.95, h: 0.54, paint: chip({ icon: s.icon, title: s.name, hue: s.hue, solid: true }) });
    label.group.position.set(SOURCE_X, 1.05, s.z);
    root.add(block, label.group);
    return { ...s, block, label };
  });

  /* Cleaning step: an open funnel the streams pour through */
  const funnel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.3, 0.7, 40, 1, true),
    mat(HEX.navy, { side: THREE.DoubleSide, roughness: 0.45 }),
  );
  funnel.castShadow = true;
  funnel.position.set(MERGE.x, MERGE.y, MERGE.z);
  const stand = box(0.16, MERGE.y - 0.3, 0.16, HEX.slab, 0.04);
  stand.position.set(MERGE.x, (MERGE.y - 0.3) / 2, MERGE.z);
  const mergeLabel = card({ w: 2.2, h: 0.54, paint: chip({ icon: "ph-arrows-split", title: "Cleaned, joined" }) });
  mergeLabel.group.position.set(MERGE.x, 1.85, MERGE.z);
  root.add(funnel, stand, mergeLabel.group);

  /* Chart */
  const base = box(CHART.x1 - CHART.x0 + 0.7, 0.16, 2.4, HEX.white, 0.08);
  base.position.set((CHART.x0 + CHART.x1) / 2, 0.08, CHART.z);
  root.add(base);

  const step = (CHART.x1 - CHART.x0) / (WEEKS.length - 1);
  const bars = WEEKS.map((v, i) => {
    const bar = box(0.24, 1, 0.5, HEX.blue, 0.04);
    bar.position.set(CHART.x0 + i * step, 0.16, CHART.z);
    root.add(bar);
    return { bar, v, i };
  });

  const band = new THREE.Mesh(
    new THREE.BoxGeometry(CHART.x1 - CHART.x0 + 0.5, BAND.hi - BAND.lo, 0.9),
    new THREE.MeshStandardMaterial({ color: HEX.success, transparent: true, opacity: 0, depthWrite: false, roughness: 0.3 }),
  );
  band.position.set((CHART.x0 + CHART.x1) / 2, 0.16 + (BAND.lo + BAND.hi) / 2, CHART.z);
  const bandEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(band.geometry),
    new THREE.LineBasicMaterial({ color: HEX.success, transparent: true, opacity: 0 }),
  );
  bandEdges.position.copy(band.position);
  const bandLabel = card({ w: 1.9, h: 0.5, paint: chip({ icon: "ph-chart-line-up", title: "Usual range", hue: "teal" }) });
  bandLabel.group.position.set(CHART.x0 + 0.5, 0.16 + BAND.hi + 0.45, CHART.z - 0.6);
  root.add(band, bandEdges, bandLabel.group);

  const spikeX = CHART.x0 + SPIKE * step;
  const alert = card({ w: 2.4, h: 0.64, paint: chip({ icon: "ph-warning", title: "Delays rising", sub: "Line 2, this week", tone: "danger" }) });
  alert.group.position.set(spikeX - 0.2, 0.16 + WEEKS[SPIKE] + 0.65, CHART.z);
  const told = card({ w: 2.5, h: 0.64, paint: chip({ icon: "ph-bell-ringing", title: "Operations told", sub: "Before it hits the line", tone: "person" }) });
  told.group.position.set(spikeX - 0.6, 0.16 + WEEKS[SPIKE] + 1.45, CHART.z - 0.3);
  root.add(alert.group, told.group);

  /* Record particles: one instanced mesh for every stream */
  const count = SOURCES.length * STREAM;
  const records = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.06, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
    count,
  );
  // Each record keeps its source colour until the cleaning step, then
  // comes out cobalt: one consistent set of numbers.
  const sourceColors = SOURCES.map((s) => new THREE.Color(HUE[s.hue].hex));
  const cleanColor = new THREE.Color(HEX.blue);
  records.frustumCulled = false;
  root.add(records);

  const red = new THREE.Color(HEX.danger);
  const blue = new THREE.Color(HEX.blue);
  const muted = new THREE.Color(0x9aa9e6);
  const dummy = new THREE.Object3D();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const quad = (p0, p1, p2, k, out) =>
    out.set(
      (1 - k) ** 2 * p0.x + 2 * (1 - k) * k * p1.x + k * k * p2.x,
      (1 - k) ** 2 * p0.y + 2 * (1 - k) * k * p1.y + k * k * p2.y,
      (1 - k) ** 2 * p0.z + 2 * (1 - k) * k * p1.z + k * k * p2.z,
    );

  const mergeTop = new THREE.Vector3(MERGE.x, MERGE.y + 0.3, MERGE.z);
  const mergeBottom = new THREE.Vector3(MERGE.x, MERGE.y - 0.3, MERGE.z);
  const chartIn = new THREE.Vector3(CHART.x0 - 0.35, 0.5, CHART.z);
  c.set((MERGE.x + CHART.x0 - 0.35) / 2, 0.75, 0);
  const p = new THREE.Vector3();

  function update(t, _dt, total) {
    const out = 1 - easeOut(seg(t, 14.3, 14.9));
    const flow = seg(t, 0.2, 1.0) * out;

    // Streams: source → funnel → chart, continuously while connected.
    sources.forEach((s, si) => {
      a.set(SOURCE_X + 0.5, 0.6, s.z);
      b.set((SOURCE_X + MERGE.x) / 2, 1.5, s.z * 0.6);
      for (let k = 0; k < STREAM; k += 1) {
        const id = si * STREAM + k;
        const phase = (total * 0.32 + k / STREAM + si * 0.13) % 1;
        if (phase < 0.6) {
          quad(a, b, mergeTop, phase / 0.6, p);
          records.setColorAt(id, sourceColors[si]);
        } else {
          quad(mergeBottom, c, chartIn, (phase - 0.6) / 0.4, p);
          records.setColorAt(id, cleanColor);
        }
        dummy.position.copy(p);
        dummy.scale.setScalar(Math.max(0.0001, flow));
        dummy.updateMatrix();
        records.setMatrixAt(id, dummy.matrix);
      }
    });
    records.instanceMatrix.needsUpdate = true;
    if (records.instanceColor) records.instanceColor.needsUpdate = true;
    funnel.rotation.y = total * 0.6;

    // Bars arrive week by week; the spike breaks out of the usual range.
    bars.forEach(({ bar, v, i }) => {
      const at = i < SPIKE ? 0.9 + i * 0.62 : i === SPIKE ? 7.4 : 9.6 + (i - SPIKE) * 0.6;
      const grow = easeOut(seg(t, at, at + (i === SPIKE ? 1.1 : 0.55))) * out;
      const h = Math.max(0.001, v * grow);
      bar.scale.y = h;
      bar.position.y = 0.16 + h / 2;
      if (i === SPIKE) {
        const hot = seg(t, 8.0, 8.4);
        bar.material.color.copy(blue).lerp(red, hot);
      } else {
        const learned = seg(t, 3.8, 4.6);
        bar.material.color.copy(blue).lerp(muted, learned * 0.55);
      }
    });

    const bandK = easeInOut(seg(t, 3.8, 4.8)) * out;
    band.material.opacity = 0.13 * bandK;
    bandEdges.material.opacity = 0.7 * bandK;
    band.scale.set(Math.max(0.001, bandK), 1, 1);
    bandEdges.scale.copy(band.scale);
    band.position.x = CHART.x0 - 0.25 + ((CHART.x1 - CHART.x0 + 0.5) * band.scale.x) / 2;
    bandEdges.position.x = band.position.x;
    bandLabel.group.scale.setScalar(Math.max(0.0001, easeBack(seg(t, 4.4, 4.8)) * out));

    const alertK = easeBack(seg(t, 8.3, 8.7)) * out;
    alert.group.scale.setScalar(Math.max(0.0001, alertK));
    alert.group.position.y = 0.16 + WEEKS[SPIKE] + 0.65 + Math.sin(total * 3) * 0.03 * alertK;
    told.group.scale.setScalar(Math.max(0.0001, easeBack(seg(t, 11.0, 11.4)) * out));

    sources.forEach((s, i) => {
      s.block.position.y = 0.275 + Math.max(0, Math.sin(total * 3 - i * 1.2)) * 0.04 * flow;
      faceCamera(s.label.group);
    });
    [mergeLabel, bandLabel, alert, told].forEach((item) => faceCamera(item.group));
  }

  return {
    frame: { w: 11.4, h: 5.8, target: [0, 1.1, 0], yaw: 0.26, elev: 0.52 },
    story,
    staticTime: 12.5,
    update,
  };
}

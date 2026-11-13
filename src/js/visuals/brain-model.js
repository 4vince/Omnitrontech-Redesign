import * as THREE from "three";
import { SimplexNoise } from "three/addons/math/SimplexNoise.js";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

/**
 * The holographic brain for the homepage hero (brain-scene.js).
 *
 * Built procedurally so it needs no model download:
 *   - cerebrum: a sphere shaped into two hemispheres (flat underside,
 *     temporal lobe, longitudinal fissure), with gyri raised along the
 *     zero-crossings of 3D noise. The same noise values ride along as
 *     vertex attributes, so the shader can draw every sulcus as a crisp,
 *     anti-aliased line (fwidth) at any distance.
 *   - cerebellum: a squashed ellipsoid with fine folia lines.
 *   - brainstem: a tapering tube reaching down toward the chip.
 *   - neural network: a few amber nodes on the near cortex, wired to
 *     their neighbours, with pulses running along the wires.
 *   - circuit traces: PCB-style runs leaving the brain left and right,
 *     each ending in a pad.
 *   - interior: a deeper amber network suspended inside the cerebrum, for
 *     the hero's opening, where the camera starts inside the brain and
 *     pulls back out through the cortex (brain-scene.js). Faint afterwards.
 *
 * Local frame: front of the brain faces -x (toward the headline), up is +y,
 * the camera looks along -z. Everything shares one frame so the reveal and
 * the "thought" wave can work in a single coordinate (local x / y).
 */

export const BRAIN_BOUNDS = { bottom: -1.5, top: 1.02, front: -1.36, back: 1.32 };

const smooth = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── Shaders ───────────────────────────────────────────────────────── */

const HOLO_VERTEX = /* glsl */ `
  attribute float aN1;
  attribute float aN2;
  attribute vec4 aFeat;
  varying float vN1;
  varying float vN2;
  varying vec4 vFeat;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying vec3 vPosL;

  void main() {
    vN1 = aN1;
    vN2 = aN2;
    vFeat = aFeat;
    vPosL = position;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPosW = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const HOLO_FRAGMENT = /* glsl */ `
  uniform float uReveal;
  uniform float uWave;
  uniform float uWaveAmp;
  uniform float uFace;
  uniform float uExitFlash;
  uniform vec3 uDeep;
  uniform vec3 uCobalt;
  uniform vec3 uLine;
  uniform vec3 uIce;
  varying float vN1;
  varying float vN2;
  varying vec4 vFeat;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying vec3 vPosL;

  // A crisp line where a smooth field crosses zero, ~constant pixel width.
  float zeroLine(float v, float width) {
    float w = fwidth(v);
    return 1.0 - smoothstep(width * w, (width + 1.25) * w, abs(v));
  }

  void main() {
    // Bottom-up reveal (intro), with a bright scan edge riding the front.
    float front = mix(${BRAIN_BOUNDS.bottom.toFixed(2)} - 0.05, ${BRAIN_BOUNDS.top.toFixed(2)} + 0.05, uReveal);
    float ahead = vPosL.y - front;
    if (ahead > 0.0) discard;
    float scan = exp(ahead * 16.0) * (1.0 - step(0.999, uReveal));

    vec3 N = normalize(vNormalW);
    vec3 V = normalize(cameraPosition - vPosW);
    float ndv = abs(dot(N, V));
    float fres = pow(max(1.0 - ndv, 0.0), 2.4);

    float sulci = zeroLine(vN1, 0.35);
    float sulciGlow = exp(-abs(vN1) * 26.0);
    float fine = zeroLine(vN2, 0.15) * smoothstep(0.05, 0.14, abs(vN1));
    float feature = max(zeroLine(vFeat.x, 0.6) * vFeat.y, zeroLine(vFeat.z, 0.5) * vFeat.w);

    vec3 L = normalize(vec3(-0.55, 0.75, 0.45));
    float diff = max(dot(N, L), 0.0);
    float spec = pow(max(dot(reflect(-L, N), V), 0.0), 28.0);

    // The "thought": a band of light sweeping front to back.
    float wave = uWaveAmp * exp(-pow(abs((vPosL.x - uWave) * 2.4), 2.0));

    float lines = sulci * 0.8 + feature * 1.0 + sulciGlow * 0.1 + fine * 0.22;
    vec3 col = uDeep * 0.35 + uCobalt * (fres * 0.5 + diff * 0.05);
    col += uLine * lines * (0.3 + 0.55 * fres + 1.5 * wave);
    col += uCobalt * wave * 0.25;
    // The camera passing out through the cortex wall lights the folds.
    col += uLine * (sulci + feature * 0.6) * uExitFlash * 1.3;
    col += uIce * spec * 0.3;
    col += uIce * scan * 1.4;

    gl_FragColor = vec4(col * uFace, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const SPARK_VERTEX = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uReveal;
  uniform float uPx;
  varying float vA;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float tw = 0.5 + 0.5 * sin(uTime * (0.7 + aSeed * 1.9) + aSeed * 40.0);
    tw = pow(max(tw, 0.0), 7.0);
    float front = mix(${BRAIN_BOUNDS.bottom.toFixed(2)}, ${BRAIN_BOUNDS.top.toFixed(2)}, uReveal);
    vA = (0.12 + 0.88 * tw) * step(position.y, front - 0.04);
    // Capped: from inside the brain the near wall is very close.
    gl_PointSize = min(uPx * (1.1 + 2.4 * tw) * (14.0 / -mv.z), uPx * 14.0);
  }
`;

const SPARK_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying float vA;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColor * a * a * vA * 0.9, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/* Wires: base glow plus pulses running from aT 0 → 1. */
const WIRE_VERTEX = /* glsl */ `
  attribute float aT;
  attribute float aSeed;
  varying float vT;
  varying float vSeed;

  void main() {
    vT = aT;
    vSeed = aSeed;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const WIRE_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uReveal;
  uniform float uBurst;
  uniform float uBurstPos;
  uniform float uBase;
  uniform float uTailFade;
  uniform float uGain;
  uniform vec3 uColor;
  uniform vec3 uHot;
  varying float vT;
  varying float vSeed;

  void main() {
    // Grows outward from its start during the reveal.
    float grow = uReveal * 1.25 - vSeed * 0.25;
    if (vT > grow) discard;

    float p = fract(uTime * (0.16 + vSeed * 0.14) + vSeed * 9.0);
    float pulse = exp(-pow(abs((vT - p) * 11.0), 2.0));
    float burst = uBurst * exp(-pow(abs((vT - uBurstPos) * 7.0), 2.0));
    float tail = 1.0 - uTailFade * smoothstep(0.35, 1.0, vT);

    vec3 col = uColor * uBase * tail + uHot * (pulse * 0.85 + burst * 2.4) * tail;
    gl_FragColor = vec4(col * uGain, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/* Nodes and pads: a hot core inside a soft halo. */
const NODE_VERTEX = /* glsl */ `
  attribute float aSeed;
  attribute float aSize;
  uniform float uTime;
  uniform float uReveal;
  uniform float uThought;
  uniform float uPx;
  varying float vFlare;
  varying float vA;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float flare = pow(max(0.5 + 0.5 * sin(uTime * (0.45 + aSeed * 0.9) + aSeed * 31.0), 0.0), 9.0);
    flare = max(flare, uThought * (0.55 + 0.45 * fract(aSeed * 7.13)));
    vFlare = flare;
    vA = smoothstep(aSeed * 0.5, aSeed * 0.5 + 0.5, uReveal);
    // Capped so a node the camera passes close to never fills the screen.
    gl_PointSize = min(uPx * aSize * (0.75 + 0.65 * flare) * (14.0 / -mv.z), uPx * 72.0);
  }
`;

const NODE_FRAGMENT = /* glsl */ `
  uniform vec3 uCore;
  uniform vec3 uHalo;
  uniform float uGain;
  varying float vFlare;
  varying float vA;

  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float core = exp(-d * d * 38.0);
    float halo = exp(-d * d * 6.0) * 0.32;
    float rays = exp(-abs(gl_PointCoord.x - 0.5) * 60.0) + exp(-abs(gl_PointCoord.y - 0.5) * 60.0);
    rays *= (1.0 - d) * vFlare * 0.5;
    vec3 col = uCore * core * (1.4 + 2.2 * vFlare) + uHalo * (halo * (0.6 + vFlare) + rays);
    gl_FragColor = vec4(col * vA * uGain, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/* Light adds in colour only; alpha is derived from brightness at the end
   of brain-scene.js, so the hologram composites over the hero photograph. */
const additive = {
  transparent: true,
  depthWrite: false,
  blending: THREE.CustomBlending,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.ZeroFactor,
  blendDstAlpha: THREE.OneFactor,
};

/* ── Geometry ──────────────────────────────────────────────────────── */

function addFieldAttributes(geometry, n1, n2, feat) {
  geometry.setAttribute("aN1", new THREE.BufferAttribute(n1, 1));
  geometry.setAttribute("aN2", new THREE.BufferAttribute(n2, 1));
  geometry.setAttribute("aFeat", new THREE.BufferAttribute(feat, 4));
}

function weldedSphere(w, h) {
  const raw = new THREE.SphereGeometry(1, w, h);
  raw.deleteAttribute("uv");
  raw.deleteAttribute("normal");
  const welded = mergeVertices(raw);
  raw.dispose();
  return welded;
}

function buildCerebrum(simplex) {
  const geometry = weldedSphere(240, 168);
  const pos = geometry.attributes.position;
  const count = pos.count;
  const n1 = new Float32Array(count);
  const n2 = new Float32Array(count);
  const feat = new Float32Array(count * 4);
  const sylvianDir = new THREE.Vector2(1, 0.4).normalize();
  const sylvianAt = new THREE.Vector2(-0.4, -0.16);

  for (let i = 0; i < count; i += 1) {
    const dx = pos.getX(i);
    const dy = pos.getY(i);
    const dz = pos.getZ(i);

    let px = dx * 1.32;
    let py = dy * 0.9;
    let pz = dz * 1.04;
    if (py < 0) py *= 0.7;
    py -= 0.07 * px; // frontal lobe sits a touch higher than occipital

    // Temporal lobe: the lower-middle bulge.
    const temporal = Math.exp(-(((px - 0.05) / 0.62) ** 2)) * smooth(0.0, -0.55, py);
    py -= 0.17 * temporal;
    // Lift the frontal underside so the frontal and temporal lobes read apart.
    const notch = Math.exp(-(((px + 0.62) / 0.3) ** 2)) * smooth(-0.1, -0.5, py);
    py += 0.1 * notch;

    // Longitudinal fissure between the hemispheres.
    const fissureW = smooth(-0.1, 0.5, dy);
    py -= 0.11 * Math.exp(-((pz / 0.08) ** 2)) * fissureW;

    // Lateral (Sylvian) fissure on each side.
    const sx = px - sylvianAt.x;
    const sy = py - sylvianAt.y;
    const sylvian = (-sx * sylvianDir.y + sy * sylvianDir.x) * 1.6;
    const sylvianW = smooth(0.35, 0.7, Math.abs(dz)) * smooth(-0.85, -0.55, px) * smooth(0.6, 0.25, px);

    // Gyri: raised away from the noise zero-crossings (the sulci).
    const s1 = simplex.noise3d(px * 2.3, py * 2.3, pz * 2.3);
    const s2 = simplex.noise3d(px * 5.2 + 7.3, py * 5.2, pz * 5.2 - 3.1);
    let h = 0.058 * smooth(0, 0.32, Math.abs(s1)) + 0.02 * smooth(0, 0.3, Math.abs(s2)) - 0.04;
    h -= 0.05 * Math.exp(-((sylvian / 0.08) ** 2)) * sylvianW;

    const len = Math.hypot(px, py, pz) || 1;
    px += (px / len) * h;
    py += (py / len) * h;
    pz += (pz / len) * h;

    pos.setXYZ(i, px, py, pz);
    n1[i] = s1;
    n2[i] = s2;
    feat[i * 4] = pz * 2.4;
    feat[i * 4 + 1] = fissureW;
    feat[i * 4 + 2] = sylvian;
    feat[i * 4 + 3] = sylvianW;
  }

  geometry.computeVertexNormals();
  addFieldAttributes(geometry, n1, n2, feat);
  return geometry;
}

function buildCerebellum(simplex) {
  const geometry = weldedSphere(110, 76);
  const pos = geometry.attributes.position;
  const count = pos.count;
  const n1 = new Float32Array(count);
  const n2 = new Float32Array(count);
  const feat = new Float32Array(count * 4);

  for (let i = 0; i < count; i += 1) {
    let px = pos.getX(i) * 0.46;
    let py = pos.getY(i) * 0.3;
    let pz = pos.getZ(i) * 0.8;
    // Folia: tight arcs around the cerebellum's lateral axis.
    const angle = Math.atan2(py, px);
    const warp = simplex.noise3d(px * 3, py * 3, pz * 3);
    const folia = Math.sin(angle * 15 + warp * 1.3);
    const h = 0.016 * smooth(0, 0.7, Math.abs(folia));
    const len = Math.hypot(px, py, pz) || 1;
    px += (px / len) * h;
    py += (py / len) * h;
    pz += (pz / len) * h;
    pos.setXYZ(i, px, py, pz);
    n1[i] = folia * 0.3;
    n2[i] = 1;
  }

  geometry.computeVertexNormals();
  addFieldAttributes(geometry, n1, n2, feat);
  geometry.applyMatrix4(new THREE.Matrix4().makeRotationZ(-0.32).setPosition(0.8, -0.52, 0));
  return geometry;
}

function buildBrainstem() {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.28, -0.25, 0),
    new THREE.Vector3(0.38, -0.72, 0),
    new THREE.Vector3(0.46, -1.15, 0),
    new THREE.Vector3(0.5, -1.5, 0),
  ]);
  const tubular = 40;
  const radial = 28;
  const base = 0.16;
  const geometry = new THREE.TubeGeometry(curve, tubular, base, radial, false);
  geometry.deleteAttribute("uv");
  const pos = geometry.attributes.position;
  const count = pos.count;
  const n1 = new Float32Array(count);
  const n2 = new Float32Array(count);
  const feat = new Float32Array(count * 4);
  const center = new THREE.Vector3();
  const v = new THREE.Vector3();

  for (let i = 0; i <= tubular; i += 1) {
    const t = i / tubular;
    curve.getPointAt(t, center);
    const radius = THREE.MathUtils.lerp(0.21, 0.09, t);
    for (let j = 0; j <= radial; j += 1) {
      const k = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, k).sub(center).multiplyScalar(radius / base).add(center);
      pos.setXYZ(k, v.x, v.y, v.z);
      n1[k] = Math.sin((j / radial) * Math.PI * 2 * 4) * 0.3;
      n2[k] = 1;
    }
  }

  geometry.computeVertexNormals();
  addFieldAttributes(geometry, n1, n2, feat);
  return geometry;
}

/* Sparkles: points sampled on gyral crests of the cerebrum. */
function buildSparkles(cerebrum, rng, palette, uniforms) {
  const pos = cerebrum.attributes.position;
  const nrm = cerebrum.attributes.normal;
  const n1 = cerebrum.attributes.aN1;
  const points = [];
  const seeds = [];
  const target = 1300;
  let guard = 0;
  while (points.length < target * 3 && guard < 200000) {
    guard += 1;
    const i = Math.floor(rng() * pos.count);
    if (Math.abs(n1.getX(i)) < 0.18 && rng() > 0.15) continue;
    points.push(
      pos.getX(i) + nrm.getX(i) * 0.012,
      pos.getY(i) + nrm.getY(i) * 0.012,
      pos.getZ(i) + nrm.getZ(i) * 0.012,
    );
    seeds.push(rng());
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  geometry.setAttribute("aSeed", new THREE.Float32BufferAttribute(seeds, 1));
  const material = new THREE.ShaderMaterial({
    ...additive,
    uniforms: {
      uTime: uniforms.uTime,
      uReveal: uniforms.uReveal,
      uPx: uniforms.uPx,
      uColor: { value: palette.ice.clone() },
    },
    vertexShader: SPARK_VERTEX,
    fragmentShader: SPARK_FRAGMENT,
  });
  return new THREE.Points(geometry, material);
}

/* Neural network: amber nodes on the near cortex, wired to neighbours. */
function buildNetwork(cerebrum, rng, palette, uniforms) {
  const pos = cerebrum.attributes.position;
  const nrm = cerebrum.attributes.normal;
  const nodes = [];
  const p = new THREE.Vector3();
  let guard = 0;
  while (nodes.length < 9 && guard < 40000) {
    guard += 1;
    const i = Math.floor(rng() * pos.count);
    p.fromBufferAttribute(pos, i);
    if (p.z < 0.45 || p.y < -0.32 || p.x < -1.05 || p.x > 1.0) continue;
    if (nodes.some((n) => n.distanceTo(p) < 0.42)) continue;
    // Sit just under the glass.
    const n = new THREE.Vector3().fromBufferAttribute(nrm, i);
    nodes.push(p.clone().addScaledVector(n, -0.03));
  }

  const edges = new Set();
  nodes.forEach((a, i) => {
    nodes
      .map((b, j) => ({ j, d: a.distanceTo(b) }))
      .filter(({ j }) => j !== i)
      .sort((x, y) => x.d - y.d)
      .slice(0, 2)
      .forEach(({ j }) => edges.add(i < j ? `${i}-${j}` : `${j}-${i}`));
  });

  const linePos = [];
  const lineT = [];
  const lineSeed = [];
  const steps = 14;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  [...edges].forEach((key) => {
    const [i, j] = key.split("-").map(Number);
    // Each wire fires in one direction, picked at random.
    const [from, to] = rng() > 0.5 ? [nodes[i], nodes[j]] : [nodes[j], nodes[i]];
    const seed = rng();
    for (let s = 0; s < steps; s += 1) {
      const t0 = s / steps;
      const t1 = (s + 1) / steps;
      // Bow the wire outward a little so it hugs the cortex.
      a.lerpVectors(from, to, t0);
      a.multiplyScalar(1 + Math.sin(t0 * Math.PI) * 0.035);
      b.lerpVectors(from, to, t1);
      b.multiplyScalar(1 + Math.sin(t1 * Math.PI) * 0.035);
      linePos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      lineT.push(t0, t1);
      lineSeed.push(seed, seed);
    }
  });

  const wireGeometry = new THREE.BufferGeometry();
  wireGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePos, 3));
  wireGeometry.setAttribute("aT", new THREE.Float32BufferAttribute(lineT, 1));
  wireGeometry.setAttribute("aSeed", new THREE.Float32BufferAttribute(lineSeed, 1));
  const wireMaterial = new THREE.ShaderMaterial({
    ...additive,
    uniforms: {
      uTime: uniforms.uTime,
      uReveal: uniforms.uNetwork,
      uBurst: uniforms.uThought,
      uBurstPos: uniforms.uThoughtPos,
      uBase: { value: 0.12 },
      uTailFade: { value: 0 },
      uGain: { value: 1 },
      uColor: { value: palette.amberDim.clone() },
      uHot: { value: palette.amber.clone() },
    },
    vertexShader: WIRE_VERTEX,
    fragmentShader: WIRE_FRAGMENT,
  });
  const wires = new THREE.LineSegments(wireGeometry, wireMaterial);

  const nodeGeometry = new THREE.BufferGeometry().setFromPoints(nodes);
  nodeGeometry.setAttribute("aSeed", new THREE.Float32BufferAttribute(nodes.map(() => rng()), 1));
  nodeGeometry.setAttribute("aSize", new THREE.Float32BufferAttribute(nodes.map(() => 16 + rng() * 10), 1));
  const nodeMaterial = new THREE.ShaderMaterial({
    ...additive,
    uniforms: {
      uTime: uniforms.uTime,
      uReveal: uniforms.uNetwork,
      uThought: uniforms.uThought,
      uPx: uniforms.uPx,
      uCore: { value: palette.amberCore.clone() },
      uHalo: { value: palette.amber.clone() },
      uGain: { value: 1 },
    },
    vertexShader: NODE_VERTEX,
    fragmentShader: NODE_FRAGMENT,
  });
  const points = new THREE.Points(nodeGeometry, nodeMaterial);
  return { wires, points };
}

/*
 * Circuit traces leaving the brain: horizontal runs with a 45° jog, ending
 * in a pad. Left runs are short (they point at the headline and must stop
 * well short of it); right runs reach toward the frame edge.
 */
function buildTraces(rng, palette, uniforms, { leftReach, rightReach }) {
  const linePos = [];
  const lineT = [];
  const lineSeed = [];
  const pads = [];
  const padSeeds = [];

  function addRun(side, y, z) {
    const dir = side < 0 ? -1 : 1;
    const startX = side < 0 ? -0.95 - 0.18 * Math.abs(y) : 0.95 + 0.22 * Math.abs(y);
    const reach = (side < 0 ? leftReach : rightReach) * (0.55 + rng() * 0.45);
    const jog = (rng() - 0.5) * 0.36;
    const run1 = reach * (0.25 + rng() * 0.35);
    const pts = [
      new THREE.Vector3(startX, y, z),
      new THREE.Vector3(startX + dir * run1, y, z),
      new THREE.Vector3(startX + dir * (run1 + Math.abs(jog)), y + jog, z),
      new THREE.Vector3(startX + dir * reach, y + jog, z),
    ];
    const lengths = [0];
    for (let i = 1; i < pts.length; i += 1) lengths.push(lengths[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const total = lengths[lengths.length - 1];
    const seed = rng();
    for (let i = 1; i < pts.length; i += 1) {
      const a = pts[i - 1];
      const b = pts[i];
      linePos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      lineT.push(lengths[i - 1] / total, lengths[i] / total);
      lineSeed.push(seed, seed);
    }
    pads.push(pts[3]);
    padSeeds.push(seed);
  }

  for (let i = 0; i < 8; i += 1) addRun(-1, -0.38 + i * 0.12 + (rng() - 0.5) * 0.04, -0.15 + rng() * 0.3);
  for (let i = 0; i < 11; i += 1) addRun(1, -0.42 + i * 0.105 + (rng() - 0.5) * 0.04, -0.15 + rng() * 0.3);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(linePos, 3));
  geometry.setAttribute("aT", new THREE.Float32BufferAttribute(lineT, 1));
  geometry.setAttribute("aSeed", new THREE.Float32BufferAttribute(lineSeed, 1));
  const material = new THREE.ShaderMaterial({
    ...additive,
    uniforms: {
      uTime: uniforms.uTime,
      uReveal: uniforms.uTraces,
      uBurst: uniforms.uTraceBurst,
      uBurstPos: uniforms.uTraceBurstPos,
      uBase: { value: 0.42 },
      uTailFade: { value: 0.45 },
      uGain: { value: 1 },
      uColor: { value: palette.line.clone() },
      uHot: { value: palette.ice.clone() },
    },
    vertexShader: WIRE_VERTEX,
    fragmentShader: WIRE_FRAGMENT,
  });
  const lines = new THREE.LineSegments(geometry, material);

  const padGeometry = new THREE.BufferGeometry().setFromPoints(pads);
  // Seeds pushed late so pads light once their run has grown in.
  padGeometry.setAttribute("aSeed", new THREE.Float32BufferAttribute(padSeeds.map((s) => 0.85 + s * 0.15), 1));
  padGeometry.setAttribute("aSize", new THREE.Float32BufferAttribute(pads.map(() => 6 + rng() * 3), 1));
  const padMaterial = new THREE.ShaderMaterial({
    ...additive,
    uniforms: {
      uTime: uniforms.uTime,
      uReveal: uniforms.uTraces,
      uThought: uniforms.uTraceBurst,
      uPx: uniforms.uPx,
      uCore: { value: palette.ice.clone() },
      uHalo: { value: palette.line.clone() },
      uGain: { value: 0.55 },
    },
    vertexShader: NODE_VERTEX,
    fragmentShader: NODE_FRAGMENT,
  });
  return { lines, pads: new THREE.Points(padGeometry, padMaterial) };
}

/*
 * The interior: nodes suspended inside the cerebrum, each wired to its
 * nearest neighbours. The hero opens with the camera at INTERIOR_EYE, so
 * nodes keep clear of it, and their seeds are ordered by distance from it:
 * on load the network ignites outward from behind the headline.
 */
export const INTERIOR_EYE = new THREE.Vector3(0, 0.12, 0.35);

function buildInterior(rng, palette, uniforms) {
  const nodes = [];
  const p = new THREE.Vector3();
  let guard = 0;
  while (nodes.length < 72 && guard < 20000) {
    guard += 1;
    p.set((rng() * 2 - 1) * 1.08, 0.1 + (rng() * 2 - 1) * 0.62, (rng() * 2 - 1) * 0.84);
    const e = (p.x / 1.08) ** 2 + ((p.y - 0.1) / 0.62) ** 2 + (p.z / 0.84) ** 2;
    if (e > 1) continue;
    if (p.distanceTo(INTERIOR_EYE) < 0.5) continue;
    if (nodes.some((n) => n.distanceTo(p) < 0.2)) continue;
    nodes.push(p.clone());
  }

  const far = Math.max(...nodes.map((n) => n.distanceTo(INTERIOR_EYE)));
  const seeds = nodes.map((n) => Math.min(1, (n.distanceTo(INTERIOR_EYE) / far) * 0.85 + rng() * 0.15));

  const edges = new Set();
  nodes.forEach((a, i) => {
    nodes
      .map((b, j) => ({ j, d: a.distanceTo(b) }))
      .filter(({ j }) => j !== i)
      .sort((x, y) => x.d - y.d)
      .slice(0, 3)
      .forEach(({ j }) => edges.add(i < j ? `${i}-${j}` : `${j}-${i}`));
  });

  const linePos = [];
  const lineT = [];
  const lineSeed = [];
  const steps = 10;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const bow = new THREE.Vector3();
  [...edges].forEach((key) => {
    const [i, j] = key.split("-").map(Number);
    // Fire away from the eye, so pulses read as thought spreading outward.
    const [from, to, seed] = seeds[i] <= seeds[j] ? [nodes[i], nodes[j], seeds[i]] : [nodes[j], nodes[i], seeds[j]];
    bow.set(rng() - 0.5, rng() - 0.5, rng() - 0.5).multiplyScalar(0.12);
    for (let s = 0; s < steps; s += 1) {
      const t0 = s / steps;
      const t1 = (s + 1) / steps;
      a.lerpVectors(from, to, t0).addScaledVector(bow, Math.sin(t0 * Math.PI));
      b.lerpVectors(from, to, t1).addScaledVector(bow, Math.sin(t1 * Math.PI));
      linePos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      lineT.push(t0, t1);
      lineSeed.push(seed, seed);
    }
  });

  const wireGeometry = new THREE.BufferGeometry();
  wireGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePos, 3));
  wireGeometry.setAttribute("aT", new THREE.Float32BufferAttribute(lineT, 1));
  wireGeometry.setAttribute("aSeed", new THREE.Float32BufferAttribute(lineSeed, 1));
  const wires = new THREE.LineSegments(
    wireGeometry,
    new THREE.ShaderMaterial({
      ...additive,
      uniforms: {
        uTime: uniforms.uTime,
        uReveal: uniforms.uInteriorReveal,
        uBurst: uniforms.uThought,
        uBurstPos: uniforms.uThoughtPos,
        uBase: { value: 0.16 },
        uTailFade: { value: 0 },
        uGain: uniforms.uInteriorGain,
        uColor: { value: palette.amberDim.clone() },
        uHot: { value: palette.amber.clone() },
      },
      vertexShader: WIRE_VERTEX,
      fragmentShader: WIRE_FRAGMENT,
    }),
  );

  // Mostly amber (thought); one in five cobalt (the machine).
  const makePoints = (list, core, halo) => {
    const geometry = new THREE.BufferGeometry().setFromPoints(list.map((k) => nodes[k]));
    geometry.setAttribute("aSeed", new THREE.Float32BufferAttribute(list.map((k) => seeds[k]), 1));
    geometry.setAttribute("aSize", new THREE.Float32BufferAttribute(list.map(() => 2.6 + rng() * 2.2), 1));
    return new THREE.Points(
      geometry,
      new THREE.ShaderMaterial({
        ...additive,
        uniforms: {
          uTime: uniforms.uTime,
          uReveal: uniforms.uInteriorReveal,
          uThought: uniforms.uThought,
          uPx: uniforms.uPx,
          uCore: { value: core.clone() },
          uHalo: { value: halo.clone() },
          uGain: uniforms.uInteriorGain,
        },
        vertexShader: NODE_VERTEX,
        fragmentShader: NODE_FRAGMENT,
      }),
    );
  };
  const amber = [];
  const cobalt = [];
  nodes.forEach((_, k) => (rng() < 0.2 ? cobalt : amber).push(k));
  return {
    wires,
    amber: makePoints(amber, palette.amberCore, palette.amber),
    cobalt: makePoints(cobalt, palette.ice, palette.line),
  };
}

/**
 * Build the brain. `uniforms` are shared uniform objects owned by the
 * scene (time, reveal stages, thought wave), so one update drives every part.
 */
export function buildBrain({ palette, uniforms, traceReach }) {
  const rng = mulberry32(20261113);
  const simplex = new SimplexNoise({ random: rng });

  const cerebrum = buildCerebrum(simplex);
  const cerebellum = buildCerebellum(simplex);
  const stem = buildBrainstem();
  const shell = mergeGeometries([cerebrum, cerebellum, stem]);
  cerebellum.dispose();
  stem.dispose();

  const makeShell = (side, face) =>
    new THREE.ShaderMaterial({
      ...additive,
      side,
      uniforms: {
        uReveal: uniforms.uReveal,
        uWave: uniforms.uWave,
        uWaveAmp: uniforms.uWaveAmp,
        uFace: face,
        uExitFlash: uniforms.uExitFlash,
        uDeep: { value: palette.deep.clone() },
        uCobalt: { value: palette.cobalt.clone() },
        uLine: { value: palette.line.clone() },
        uIce: { value: palette.ice.clone() },
      },
      vertexShader: HOLO_VERTEX,
      fragmentShader: HOLO_FRAGMENT,
    });

  const root = new THREE.Group();
  root.name = "brain";

  // Far wall first, dimmer: the folds behind read through the glass.
  // From inside the brain this is the wall you see; the scene raises it
  // (uniforms.uBackFace) while the camera is in there.
  const back = new THREE.Mesh(shell, makeShell(THREE.BackSide, uniforms.uBackFace));
  back.renderOrder = 1;
  const front = new THREE.Mesh(shell, makeShell(THREE.FrontSide, { value: 1 }));
  front.renderOrder = 2;
  root.add(back, front);

  const sparkles = buildSparkles(cerebrum, rng, palette, uniforms);
  sparkles.renderOrder = 3;
  const network = buildNetwork(cerebrum, rng, palette, uniforms);
  network.wires.renderOrder = 3;
  network.points.renderOrder = 4;
  const traces = buildTraces(rng, palette, uniforms, traceReach);
  traces.lines.renderOrder = 0;
  traces.pads.renderOrder = 0;
  root.add(sparkles, network.wires, network.points, traces.lines, traces.pads);

  const interior = buildInterior(rng, palette, uniforms);
  interior.wires.renderOrder = 3;
  interior.amber.renderOrder = 4;
  interior.cobalt.renderOrder = 4;
  root.add(interior.wires, interior.amber, interior.cobalt);

  cerebrum.dispose();
  return { root };
}

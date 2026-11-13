import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { getRendererInfo } from "../core/scene-quality.js";
import { buildBrain } from "./brain-model.js";
import { createMatrixRain } from "./matrix-rain.js";

/**
 * Homepage hero figure — a holographic brain running on a processor.
 *
 * Modelled on public/Holographic AI Brain Over CPU Platform.png. The canvas
 * is transparent: it sits over the Singapore office photograph (index.html,
 * .hero-photo), with faint Matrix glyph rain (matrix-rain.js) behind the
 * figure. Only light is drawn; everything dark stays see-through.
 *
 * Colour carries meaning: cobalt and ice are the machine (chip, streams,
 * circuitry), amber is thought (the neural nodes and their wires).
 *
 * Motion, in order of importance:
 *   1. Power-on (once, ~3 s): chip lights → streams rise → the brain
 *      scans in from the stem up → traces grow outward → nodes ignite;
 *      the camera settles back a touch as it finishes.
 *   2. The thought cycle (every 7 s): a packet leaves the chip, runs up
 *      the streams, a band of light sweeps the cortex front to back while
 *      the nodes flare, and the signal leaves along the circuit traces.
 *   3. Ambient: the brain floats and turns a few degrees, sparkles
 *      twinkle, LEDs chase, the rain falls.
 *   4. Pointer parallax (desktop) and a gentle scroll lift.
 *
 * Reduced motion renders one composed still frame mid-thought.
 */

const FOV = 28;
const BRAIN_SCALE = 1.3;
const BRAIN_Y = 1.3;
const CHIP = new THREE.Vector3(0.35, -1.1, 0.3); // die top centre
const BASE_Y = -1.42; // underside of the chip substrate
const THOUGHT_EVERY = 7;
const THOUGHT_FIRST = 3.4;
const INTRO_STILL_TIME = 4.65; // the frame reduced motion shows

const lerp = THREE.MathUtils.lerp;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const damp = (current, target, lambda, dt) => lerp(current, target, 1 - Math.exp(-lambda * dt));
const span = (t, a, b) => clamp01((t - a) / (b - a));
const easeOut = (t) => 1 - (1 - t) ** 3;
const easeInOut = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
const bump = (t) => (t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI));

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

const PALETTE = {
  deep: new THREE.Color("#060f33"),
  cobalt: new THREE.Color("#2852ff"),
  line: new THREE.Color("#5f93ff"),
  ice: new THREE.Color("#d6e6ff"),
  amber: new THREE.Color("#ff9f45"),
  amberDim: new THREE.Color("#b8642a"),
  amberCore: new THREE.Color("#fff1dc"),
};

/* Light adds in colour only; alpha is left alone and derived from
   brightness at the very end (AlphaShader), so glows composite over the
   photograph instead of painting dark panels on it. */
const ADDITIVE = {
  transparent: true,
  depthWrite: false,
  blending: THREE.CustomBlending,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.ZeroFactor,
  blendDstAlpha: THREE.OneFactor,
};

const OUTPUT = /* glsl */ `
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
`;

/* ── The processor ─────────────────────────────────────────────────── */

function buildChip(uniforms) {
  const group = new THREE.Group();
  const dark = (color, metalness = 0.6, roughness = 0.4) => new THREE.MeshStandardMaterial({ color, metalness, roughness });

  const substrate = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.1, 2.7), dark("#0b1636", 0.5, 0.5));
  substrate.position.set(CHIP.x, BASE_Y + 0.11, CHIP.z);
  const pkg = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.16, 1.8), dark("#101c42", 0.75, 0.28));
  pkg.position.set(CHIP.x, CHIP.y - 0.08, CHIP.z);
  group.add(substrate, pkg);

  // Contact pins along the substrate's long edges.
  const pinCount = 40;
  const pins = new THREE.InstancedMesh(new THREE.BoxGeometry(0.035, 0.022, 0.16), dark("#7f8bb3", 1, 0.3), pinCount * 2);
  const m = new THREE.Matrix4();
  for (let i = 0; i < pinCount; i += 1) {
    const x = CHIP.x - 1.8 + (i / (pinCount - 1)) * 3.6;
    m.makeTranslation(x, BASE_Y + 0.17, CHIP.z + 1.18);
    pins.setMatrixAt(i, m);
    m.makeTranslation(x, BASE_Y + 0.17, CHIP.z - 1.18);
    pins.setMatrixAt(pinCount + i, m);
  }
  group.add(pins);

  // The substrate's rim, traced in light so the base reads over the photo.
  const rim = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(4.0, 0.1, 2.7)),
    new THREE.LineBasicMaterial({ color: PALETTE.line.clone().multiplyScalar(0.55), ...ADDITIVE }),
  );
  rim.position.copy(substrate.position);
  group.add(rim);

  // Die top: microcircuitry under a pool of light.
  const die = new THREE.Mesh(
    new THREE.PlaneGeometry(2.62, 1.62),
    new THREE.ShaderMaterial({
      ...ADDITIVE,
      uniforms: {
        uTime: uniforms.uTime,
        uPower: uniforms.uPower,
        uFlash: uniforms.uChipFlash,
        uCobalt: { value: PALETTE.cobalt.clone() },
        uLine: { value: PALETTE.line.clone() },
        uIce: { value: PALETTE.ice.clone() },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uPower;
        uniform float uFlash;
        uniform vec3 uCobalt;
        uniform vec3 uLine;
        uniform vec3 uIce;
        varying vec2 vUv;

        float hash(vec2 p) {
          p = fract(p * vec2(233.34, 851.73));
          p += dot(p, p + 23.45);
          return fract(p.x * p.y);
        }

        void main() {
          vec2 c = (vUv - 0.5) * vec2(2.62, 1.62);
          float pool = exp(-dot(c, c) * 1.5);
          vec2 g = vUv * vec2(48.0, 30.0);
          vec2 id = floor(g);
          vec2 f = fract(g) - 0.5;
          float on = step(0.55, hash(id));
          float w = fwidth(g.x) * 1.2;
          float traces = on * (1.0 - smoothstep(0.0, w, abs(f.y) - 0.04)) + step(0.8, hash(id + 3.0)) * (1.0 - smoothstep(0.0, w, abs(f.x) - 0.04));
          vec2 e = min(vUv, 1.0 - vUv) * vec2(2.62, 1.62);
          float frame = exp(-min(e.x, e.y) * 28.0);
          float shimmer = 0.85 + 0.15 * sin(uTime * 1.3 + c.x * 2.0);
          vec3 col = uCobalt * (0.16 + pool * 0.85) * shimmer;
          col += uLine * traces * (0.16 + pool * 0.45);
          col += uIce * frame * 0.5;
          col += uIce * pool * uFlash * 0.75;
          gl_FragColor = vec4(col * uPower, 1.0);
          ${OUTPUT}
        }
      `,
    }),
  );
  die.rotation.x = -Math.PI / 2;
  die.position.set(CHIP.x, CHIP.y + 0.003, CHIP.z);
  group.add(die);

  // Light rising off the die: an open, elliptical column fading upward.
  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0, 1.15, 2.4, 48, 1, true),
    new THREE.ShaderMaterial({
      ...ADDITIVE,
      side: THREE.DoubleSide,
      uniforms: { uPower: uniforms.uPower, uFlash: uniforms.uChipFlash, uColor: { value: PALETTE.cobalt.clone() } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uPower;
        uniform float uFlash;
        uniform vec3 uColor;
        varying vec2 vUv;
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          float facing = abs(dot(normalize(vN), normalize(vV)));
          float body = pow(max(1.0 - vUv.y, 0.0), 2.6) * (0.35 + 0.65 * facing);
          gl_FragColor = vec4(uColor * body * (0.09 + 0.12 * uFlash) * uPower, 1.0);
          ${OUTPUT}
        }
      `,
    }),
  );
  column.scale.set(1, 1, 0.62);
  column.position.set(CHIP.x, CHIP.y + 1.2, CHIP.z);
  column.renderOrder = 1;
  group.add(column);

  // LED rows on the package front: a dotted amber line with a slow chase.
  const ledCount = 40;
  const leds = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.042, 0.016),
    new THREE.MeshBasicMaterial({ color: "#ffffff" }),
    ledCount,
  );
  for (let i = 0; i < ledCount; i += 1) {
    const half = i < ledCount / 2;
    const k = half ? i : i - ledCount / 2;
    const x = half ? CHIP.x - 1.22 + k * 0.052 : CHIP.x + 0.22 + k * 0.052;
    m.makeTranslation(x, CHIP.y - 0.045, CHIP.z + 0.902);
    leds.setMatrixAt(i, m);
    leds.setColorAt(i, new THREE.Color(0, 0, 0));
  }
  group.add(leds);

  return { group, leds, ledCount };
}

/* ── Data streams from the die up into the brain ───────────────────── */

function buildStreams(rng, uniforms) {
  const pos = [];
  const t = [];
  const seed = [];
  for (let i = 0; i < 78; i += 1) {
    const x = CHIP.x + (rng() - 0.5) * 2.0;
    const z = CHIP.z + (rng() - 0.5) * 1.1;
    // Taller toward the stem, under the brain's centre.
    const reach = 1 - Math.min(1, Math.abs(x - 0.55) / 1.3);
    const top = CHIP.y + 0.5 + reach * 1.1 + rng() * 0.45;
    pos.push(x, CHIP.y, z, x, top, z);
    t.push(0, 1);
    const s = rng();
    seed.push(s, s);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute("aT", new THREE.Float32BufferAttribute(t, 1));
  geometry.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 1));
  const material = new THREE.ShaderMaterial({
    ...ADDITIVE,
    uniforms: {
      uTime: uniforms.uTime,
      uReveal: uniforms.uStreams,
      uBurst: uniforms.uStreamBurst,
      uBurstPos: uniforms.uStreamBurstPos,
      uColor: { value: PALETTE.line.clone() },
      uIce: { value: PALETTE.ice.clone() },
    },
    vertexShader: /* glsl */ `
      attribute float aT;
      attribute float aSeed;
      varying float vT;
      varying float vSeed;
      void main() {
        vT = aT;
        vSeed = aSeed;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uReveal;
      uniform float uBurst;
      uniform float uBurstPos;
      uniform vec3 uColor;
      uniform vec3 uIce;
      varying float vT;
      varying float vSeed;
      void main() {
        if (vT > uReveal * (1.15 - vSeed * 0.15)) discard;
        float speed = 0.22 + vSeed * 0.3;
        float p1 = fract(uTime * speed + vSeed * 7.0);
        float p2 = fract(uTime * speed + vSeed * 7.0 + 0.5);
        float packets = exp(-pow(abs((vT - p1) * 9.0), 2.0)) + 0.55 * exp(-pow(abs((vT - p2) * 13.0), 2.0));
        float burst = uBurst * exp(-pow(abs((vT - uBurstPos) * 6.0), 2.0));
        float fade = smoothstep(1.0, 0.7, vT);
        vec3 col = uColor * (0.16 * (1.0 - vT * 0.5) + packets * 0.75) + mix(uColor, uIce, 0.5) * burst * 0.85;
        gl_FragColor = vec4(col * fade, 1.0);
        ${OUTPUT}
      }
    `,
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.renderOrder = 2;
  return lines;
}

/* ── Final pass: alpha from brightness ─────────────────────────────── */

/* Runs after OutputPass, on display values. Opaque parts (the chip) keep
   their alpha; light gets alpha equal to its brightest channel, which with
   the canvas's premultiplied alpha composites as glow over the photo. */
const AlphaShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 rgb = max(c.rgb, 0.0);
      float a = clamp(max(c.a, max(rgb.r, max(rgb.g, rgb.b))), 0.0, 1.0);
      gl_FragColor = vec4(min(rgb, vec3(a)), a);
    }
  `,
};

/* ── Scene ─────────────────────────────────────────────────────────── */

export async function createBrainScene(canvas, { animate = true } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
  } catch (error) {
    console.error("Could not initialise the homepage hero visual.", error);
    return null;
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.setClearColor(0x000000, 0);

  const rng = mulberry32(7741);
  const state = {
    animate: Boolean(animate),
    running: false,
    disposed: false,
    contextLost: false,
    layout: "wide", // "wide" (brain right of the headline) | "stacked" (brain centred)
    aspect: 16 / 9,
    clock: 0,
    pointerX: 0,
    pointerY: 0,
    lookX: 0,
    lookY: 0,
    scroll: 0,
    scrollEased: 0,
  };

  const uniforms = {
    uTime: { value: 0 },
    uPx: { value: 1 },
    uPower: { value: 0 },
    uChipFlash: { value: 0 },
    uStreams: { value: 0 },
    uStreamBurst: { value: 0 },
    uStreamBurstPos: { value: 0 },
    uReveal: { value: 0 },
    uWave: { value: -2 },
    uWaveAmp: { value: 0 },
    uNetwork: { value: 0 },
    uThought: { value: 0 },
    uThoughtPos: { value: 0 },
    uTraces: { value: 0 },
    uTraceBurst: { value: 0 },
    uTraceBurstPos: { value: 0 },
  };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 80);

  // A dim neutral environment gives the chip's metal a sheen to catch.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  scene.environmentIntensity = 0.08;
  room.dispose();
  pmrem.dispose();

  const chipLight = new THREE.PointLight("#3d6dff", 0, 0, 2);
  chipLight.position.set(CHIP.x, CHIP.y + 0.6, CHIP.z);
  const keyLight = new THREE.DirectionalLight("#9db8ff", 0.4);
  keyLight.position.set(-9, 11, 4);
  const rimLight = new THREE.DirectionalLight("#2c50ff", 0.7);
  rimLight.position.set(5, 3, -9);
  const hemi = new THREE.HemisphereLight("#1a2c6e", "#02040d", 0.3);
  scene.add(chipLight, keyLight, rimLight, hemi);

  // The rain stays put behind the figure while the brain floats.
  const rain = createMatrixRain({ opacity: 0.5 });
  rain.mesh.scale.set(1.25, 1.1, 1.25);
  rain.mesh.position.set(0.25, 0.3, 1.6);
  scene.add(rain.mesh);

  const chip = buildChip(uniforms);
  scene.add(chip.group, buildStreams(rng, uniforms));

  const brain = buildBrain({ palette: PALETTE, uniforms, traceReach: { leftReach: 0.95, rightReach: 2.1 } });
  brain.root.scale.setScalar(BRAIN_SCALE);
  brain.root.position.set(0, BRAIN_Y, 0);
  scene.add(brain.root);

  /* Post: bloom on an MSAA half-float target, tone map, then alpha. */
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.55, 0.3);
  // Its composite normally weights the glow by alpha, which is 0 wherever
  // only light was drawn: add the glow's colour outright instead.
  Object.assign(bloom.blendMaterial, {
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
  });
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  composer.addPass(new ShaderPass(AlphaShader));

  /* ── Camera framing ───────────────────────────────────────────────
     The brain's on-screen size and place are set as fractions of the
     frame, so the composition holds at any aspect ratio. */
  const halfTan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const lookAt = new THREE.Vector3();
  const BRAIN_W = 2.64 * BRAIN_SCALE;

  function framing() {
    if (state.layout === "stacked") {
      // Brain centred, filling about half the width, chip in frame.
      const w = BRAIN_W / 0.5;
      const h = Math.max(w / state.aspect, 7.2);
      return { distance: h / (2 * halfTan), shiftX: 0.04, shiftY: 0.12, pitch: 0.1 };
    }
    // Brain ~27% of the width, centred ~73% across and ~38% down.
    const w = BRAIN_W / 0.27;
    const h = Math.max(w / state.aspect, 6.9);
    return { distance: h / (2 * halfTan), shiftX: 0.46, shiftY: 0.24, pitch: 0.1 };
  }

  function placeCamera(intro) {
    const f = framing();
    // Power-on: start a touch closer and lower, settle back.
    const settle = 1 - easeOut(intro);
    const distance = f.distance * (1 - 0.07 * settle) * (1 - 0.04 * state.scrollEased);
    const halfH = distance * halfTan;
    const halfW = halfH * state.aspect;
    const centerY = BRAIN_Y + 0.05 * BRAIN_SCALE;
    lookAt.set(-halfW * f.shiftX, centerY - halfH * f.shiftY + state.scrollEased * 0.9, 0);
    const pitch = f.pitch - 0.03 * settle;
    camera.position.set(
      lookAt.x + state.lookX * 0.45,
      lookAt.y + Math.sin(pitch) * distance - state.lookY * 0.25 - 0.2 * settle,
      Math.cos(pitch) * distance,
    );
    camera.lookAt(lookAt);
  }

  /* ── Timeline ────────────────────────────────────────────────────── */
  const ledColor = new THREE.Color();
  const amberLed = new THREE.Color("#ffb067");

  function update(dt) {
    const t = state.animate ? state.clock : INTRO_STILL_TIME;
    uniforms.uTime.value = t;

    // 1. Power-on.
    const power = easeOut(span(t, 0.0, 0.8));
    const streams = easeOut(span(t, 0.35, 1.3));
    const reveal = easeInOut(span(t, 0.9, 2.6));
    const traces = easeOut(span(t, 2.0, 3.1));
    const network = easeOut(span(t, 2.3, 3.2));
    const intro = span(t, 0, 3.4);

    // 2. The thought cycle: chip → streams → cortex → traces.
    const since = t - THOUGHT_FIRST;
    const tc = since >= 0 ? since % THOUGHT_EVERY : -1;
    const chipFlash = tc >= 0 ? bump(span(tc, 0, 0.55)) : 0;
    const streamU = tc >= 0 ? span(tc, 0.15, 0.95) : 0;
    const waveU = tc >= 0 ? span(tc, 0.75, 2.6) : 0;
    const thoughtU = tc >= 0 ? span(tc, 0.9, 2.3) : 0;
    const traceU = tc >= 0 ? span(tc, 1.7, 3.0) : 0;

    uniforms.uPower.value = power * (0.92 + 0.08 * Math.sin(t * 0.9));
    uniforms.uChipFlash.value = chipFlash;
    uniforms.uStreams.value = streams;
    uniforms.uStreamBurst.value = Math.min(1, bump(streamU) * 2);
    uniforms.uStreamBurstPos.value = streamU * 1.1;
    uniforms.uReveal.value = reveal;
    uniforms.uWave.value = lerp(-1.7, 1.7, easeInOut(waveU));
    uniforms.uWaveAmp.value = bump(waveU);
    uniforms.uNetwork.value = network;
    uniforms.uThought.value = bump(thoughtU);
    uniforms.uThoughtPos.value = thoughtU;
    uniforms.uTraces.value = traces;
    uniforms.uTraceBurst.value = Math.min(1, bump(traceU) * 1.6);
    uniforms.uTraceBurstPos.value = traceU * 1.1;

    chipLight.intensity = (8 + 5 * chipFlash) * power;
    rain.update(t);

    // 3. Ambient: float and a few degrees of turn, out of phase.
    const step = state.animate ? dt : 1;
    state.lookX = damp(state.lookX, state.pointerX, 2.2, step);
    state.lookY = damp(state.lookY, state.pointerY, 2.2, step);
    state.scrollEased = damp(state.scrollEased, state.scroll, 6, step);
    brain.root.position.y = BRAIN_Y + Math.sin(t * 0.55) * 0.07 + state.scrollEased * 0.25;
    brain.root.rotation.y = -0.16 + Math.sin(t * 0.13) * 0.12 + state.lookX * 0.1;
    brain.root.rotation.x = Math.sin(t * 0.21 + 1.2) * 0.025 + state.lookY * 0.05;

    // Front LEDs: a slow amber chase, brighter on the flash.
    for (let i = 0; i < chip.ledCount; i += 1) {
      const k = (i % (chip.ledCount / 2)) / (chip.ledCount / 2);
      const chase = 0.5 + 0.5 * Math.sin(k * 18 - t * 2.4);
      const level = (0.6 + 1.6 * chase * chase + 2 * chipFlash) * power;
      chip.leds.setColorAt(i, ledColor.copy(amberLed).multiplyScalar(level));
    }
    chip.leds.instanceColor.needsUpdate = true;

    placeCamera(state.animate ? intro : 1);
  }

  /* ── Sizing ──────────────────────────────────────────────────────── */
  function pixelRatio(width, height) {
    // Bloom + MSAA are fill-rate heavy: cap the ratio, and the total pixels.
    const dpr = Math.min(window.devicePixelRatio || 1, width < 1200 ? 1.5 : 1.75);
    const budget = 3.4e6;
    return Math.max(1, Math.min(dpr, Math.sqrt(budget / (width * height))));
  }

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height || state.disposed || state.contextLost) return;
    state.aspect = width / height;
    camera.aspect = state.aspect;
    camera.updateProjectionMatrix();
    const pr = pixelRatio(width, height);
    renderer.setPixelRatio(pr);
    renderer.setSize(width, height, false);
    composer.setPixelRatio(pr);
    composer.setSize(width, height);
    uniforms.uPx.value = pr;
    draw(0);
  }

  function draw(dt) {
    if (state.disposed || state.contextLost) return;
    update(dt);
    composer.render(dt);
  }

  const timer = new THREE.Timer();
  timer.connect(document);
  function loop() {
    if (state.disposed || state.contextLost || !state.running) return;
    timer.update();
    const dt = Math.min(0.05, timer.getDelta());
    state.clock += dt;
    draw(dt);
  }

  function pause() {
    state.running = false;
    renderer.setAnimationLoop(null);
  }

  function resume() {
    if (state.disposed || state.contextLost) return;
    if (!state.animate) {
      draw(0);
      return;
    }
    if (state.running) return;
    state.running = true;
    timer.update();
    renderer.setAnimationLoop(loop);
  }

  function onContextLost(event) {
    event.preventDefault();
    state.contextLost = true;
    pause();
    canvas.closest("[data-hero-stage]")?.classList.remove("has-webgl");
  }

  function onContextRestored() {
    if (state.disposed) return;
    state.contextLost = false;
    canvas.closest("[data-hero-stage]")?.classList.add("has-webgl");
    resize();
    resume();
  }

  // Compile every program up front so the first animated frames don't stall.
  await renderer.compileAsync(scene, camera);

  const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
  resizeObserver?.observe(canvas);
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);
  resize();

  return {
    getStats: () => getRendererInfo(renderer),
    /** Start (or continue) the animation loop. */
    resume,
    pause,
    /** "wide" (brain right of the headline) or "stacked" (brain centred). */
    setLayout(layout) {
      state.layout = layout;
      if (!state.running) draw(0);
    },
    /** How far the hero has scrolled out of view, 0-1. */
    setScroll(value) {
      state.scroll = clamp01(value);
      if (!state.running) {
        state.scrollEased = state.scroll;
        draw(0);
      }
    },
    /** Pointer position over the hero, each axis -1..1. */
    setPointer(nx, ny) {
      state.pointerX = Math.max(-1, Math.min(1, nx));
      state.pointerY = Math.max(-1, Math.min(1, ny));
    },
    setMotionEnabled(enabled) {
      state.animate = Boolean(enabled);
      if (state.animate) resume();
      else {
        pause();
        draw(0);
      }
    },
    dispose() {
      if (state.disposed) return;
      state.disposed = true;
      pause();
      resizeObserver?.disconnect();
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      const geometries = new Set();
      const materials = new Set();
      scene.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) materials.add(object.material);
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => {
        Object.values(m).forEach((value) => value?.isTexture && value.dispose());
        m.dispose();
      });
      scene.environment?.dispose();
      composer.dispose();
      target.dispose();
      timer.dispose();
      renderer.dispose();
    },
  };
}

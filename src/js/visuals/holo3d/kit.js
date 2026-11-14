import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/**
 * Holographic stage for the AI Solutions services.
 *
 * Each service is one literal object made of light, in the same world as
 * the home page's brain over the CPU: sharp cobalt edges, faint
 * see-through faces with a rim, a scan band that passes over them, a light
 * bloom, amber for people. Nothing in the scene is text.
 *
 * `createHoloStage` returns the control object solutions.js drives:
 *   pause, resume, restart, setScroll, setMotionEnabled, dispose (+ seek).
 *
 * A scene module exports `build(kit)` and returns:
 *   frame      { w, h, target, yaw, elev }  what the camera must fit
 *   story      { cycle, marks }              one loop and its four steps
 *   staticTime t shown as the single reduced-motion frame
 *   update(local, dt, t)                     pose the scene at loop time `local`
 */

export { THREE, mergeGeometries };

/* Meaning, as in DESIGN.md: cobalt the system, amber a person, teal safe
   or done, red a limit or an anomaly. */
export const COLOR = {
  cobalt: new THREE.Color("#5f93ff"),
  deep: new THREE.Color("#2852ff"),
  ice: new THREE.Color("#d6e6ff"),
  amber: new THREE.Color("#ff9f45"),
  teal: new THREE.Color("#3fe0bd"),
  red: new THREE.Color("#ff5b4d"),
};

export const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeOut = (t) => 1 - (1 - t) ** 3;
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const easeBack = (t) => {
  const c = 1.5;
  return t === 0 ? 0 : 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
};
/** In over [a, a+fade], out over [b, b+fade]. */
export const window01 = (t, a, b, fade = 0.4) => seg(t, a, a + fade) * (1 - seg(t, b, b + fade));

/* Light only adds colour; alpha is derived from brightness at the end
   (AlphaShader), so the hologram composites over the navy behind it. */
const ADDITIVE = {
  transparent: true,
  depthWrite: false,
  blending: THREE.CustomBlending,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.ZeroFactor,
  blendDstAlpha: THREE.OneFactor,
};

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

/* Faces: barely there in the middle, brighter at the rim, faint scan lines,
   and a band of light wherever the scan is passing. */
const FACE_VERT = /* glsl */ `
  varying vec3 vN;
  varying vec3 vView;
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - w.xyz);
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const FACE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uLevel;
  uniform float uFace;
  uniform float uScanX;
  uniform float uScanW;
  uniform float uScan;
  varying vec3 vN;
  varying vec3 vView;
  varying vec3 vWorld;
  void main() {
    float facing = abs(dot(normalize(vN), normalize(vView)));
    float rim = pow(1.0 - facing, 2.2);
    float lines = 0.92 + 0.08 * step(0.5, fract(vWorld.y * 14.0));
    float scan = uScan * smoothstep(uScanW, 0.0, abs(vWorld.x - uScanX));
    vec3 c = uColor * (uFace * (0.3 + rim * 1.4) * lines + scan * 0.35) * uLevel;
    gl_FragColor = vec4(c, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/* Points: soft round dots of light (sparks, packets). */
const POINT_VERT = /* glsl */ `
  attribute float aAlpha;
  attribute float aSize;
  uniform float uPx;
  uniform float uScale;
  varying float vAlpha;
  void main() {
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPx * uScale / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const POINT_FRAG = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float core = smoothstep(0.35, 0.0, d);
    float halo = smoothstep(1.0, 0.0, d) * 0.35;
    vec3 c = mix(uColor, vec3(1.0), core * 0.6) * (core + halo) * vAlpha;
    gl_FragColor = vec4(c, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ build: Function, animate?: boolean, panel?: boolean, host?: Element,
 *           area?: () => ({ x: number, y: number, w: number, h: number } | null),
 *           onStep?: (index: number | null, story: object) => void }} options
 *   area   the box inside the canvas (CSS px) the scene is framed in,
 *          clear of the title and captions over a navy card (measured by
 *          the page); call stage.refit() when it changes. Without it the
 *          scene fills the canvas with a small margin.
 */
export async function createHoloStage(canvas, { build, animate = true, panel = false, host, area, onStep } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
  } catch (error) {
    console.error("Could not start a service hologram.", error);
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  // Where the scene is framed: the page's measured area on navy cards; the
  // whole box (less a margin) inside a light card's display panel.
  function frameBox(width, height) {
    const r = panel ? null : area?.();
    if (r && r.w > 40 && r.h > 40) return r;
    return { x: 0, y: height * 0.05, w: width, h: height * 0.9 };
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 1, 0.5, 200);

  const shared = {
    uScanX: { value: -999 },
    uScanW: { value: 1.2 },
    uScan: { value: 0 },
  };
  const pointUniforms = { uPx: { value: 1 }, uScale: { value: 300 } };
  const disposables = [];
  const occluderMat = new THREE.MeshBasicMaterial({ colorWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  disposables.push(occluderMat);

  /* ── Building blocks handed to the scene ── */

  /**
   * A hologram of `geometry`: sharp edges plus faint rim-lit faces.
   * `set(level, color?)` brightens, dims or recolours it.
   */
  function holo(geometry, { color = COLOR.cobalt, level = 1, face = 0.16, edge = 1, threshold = 20, side = THREE.FrontSide, occlude = true } = {}) {
    const base = new THREE.Color(color);
    const faceMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: base.clone() },
        uLevel: { value: level },
        uFace: { value: face },
        ...shared,
      },
      vertexShader: FACE_VERT,
      fragmentShader: FACE_FRAG,
      side,
      ...ADDITIVE,
    });
    const mesh = new THREE.Mesh(geometry, faceMat);
    const edges = new THREE.EdgesGeometry(geometry, threshold);
    const lineMat = new THREE.LineBasicMaterial({ color: base.clone().multiplyScalar(level * edge), ...ADDITIVE });
    const lines = new THREE.LineSegments(edges, lineMat);
    const group = new THREE.Group();
    group.add(mesh, lines);
    // Hidden lines: an invisible depth-only copy drawn first, so a solid
    // object hides the edges behind it and every shape reads cleanly.
    if (occlude) {
      const blocker = new THREE.Mesh(geometry, occluderMat);
      blocker.renderOrder = -1;
      group.add(blocker);
    }
    disposables.push(geometry, edges, faceMat, lineMat);
    const tint = base.clone();
    const h = {
      group,
      mesh,
      lines,
      level,
      set(nextLevel, nextColor) {
        if (nextColor) tint.copy(nextColor);
        h.level = nextLevel;
        faceMat.uniforms.uColor.value.copy(tint);
        faceMat.uniforms.uLevel.value = nextLevel;
        lineMat.color.copy(tint).multiplyScalar(Math.min(1, nextLevel * edge));
        group.visible = nextLevel > 0.001;
      },
    };
    h.set(level, base);
    return h;
  }

  /** Mix two colours into a scratch colour (for tints between states). */
  const scratch = new THREE.Color();
  function mix(a, b, k) {
    return scratch.copy(a).lerp(b, clamp(k));
  }

  /** A line of light along points, drawn on progressively with `show(u)`. */
  function line(points, { color = COLOR.cobalt, level = 1, samples = 0 } = {}) {
    let pts = points.map((p) => (p.isVector3 ? p : new THREE.Vector3(...p)));
    if (samples) pts = new THREE.CatmullRomCurve3(pts, false, "centripetal").getSpacedPoints(samples);
    const geometry = new THREE.BufferGeometry().setFromPoints(pts);
    const material = new THREE.LineBasicMaterial({ color: new THREE.Color(color).multiplyScalar(level), ...ADDITIVE });
    const object = new THREE.Line(geometry, material);
    disposables.push(geometry, material);
    const base = new THREE.Color(color);
    // Cumulative length, so `at(u)` moves at an even speed.
    const lens = [0];
    for (let i = 1; i < pts.length; i += 1) lens.push(lens[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const total = lens[lens.length - 1] || 1;
    return {
      object,
      points: pts,
      show(u) {
        geometry.setDrawRange(0, Math.max(0, Math.round(clamp(u) * pts.length)));
        object.visible = u > 0;
      },
      set(nextLevel, nextColor) {
        if (nextColor) base.copy(nextColor);
        material.color.copy(base).multiplyScalar(nextLevel);
      },
      at(u, out = new THREE.Vector3()) {
        const d = clamp(u) * total;
        let i = 1;
        while (i < lens.length - 1 && lens[i] < d) i += 1;
        const k = (d - lens[i - 1]) / (lens[i] - lens[i - 1] || 1);
        return out.copy(pts[i - 1]).lerp(pts[i], k);
      },
    };
  }

  /** A pool of soft points (sparks, packets); move them each frame. */
  function points(count, { color = COLOR.ice, size = 1 } = {}) {
    const geometry = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const alpha = new Float32Array(count);
    const sizes = new Float32Array(count).fill(size);
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    const material = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, ...pointUniforms },
      vertexShader: POINT_VERT,
      fragmentShader: POINT_FRAG,
      ...ADDITIVE,
    });
    const object = new THREE.Points(geometry, material);
    object.frustumCulled = false;
    disposables.push(geometry, material);
    return {
      object,
      count,
      set(i, x, y, z, a = 1, s = size) {
        pos[i * 3] = x;
        pos[i * 3 + 1] = y;
        pos[i * 3 + 2] = z;
        alpha[i] = a;
        sizes[i] = s;
      },
      hide(i) {
        alpha[i] = 0;
      },
      commit() {
        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.aAlpha.needsUpdate = true;
        geometry.attributes.aSize.needsUpdate = true;
      },
      color: material.uniforms.uColor.value,
    };
  }

  /** Loose line segments ([[a, b], …]) in one draw call: grids, hatching. */
  function segments(pairs, { color = COLOR.cobalt, level = 0.3 } = {}) {
    const pts = [];
    pairs.forEach(([a, b]) => pts.push(new THREE.Vector3(...a), new THREE.Vector3(...b)));
    const geometry = new THREE.BufferGeometry().setFromPoints(pts);
    const material = new THREE.LineBasicMaterial({ color: new THREE.Color(color).multiplyScalar(level), ...ADDITIVE });
    disposables.push(geometry, material);
    const base = new THREE.Color(color);
    const object = new THREE.LineSegments(geometry, material);
    return {
      object,
      set(nextLevel) {
        material.color.copy(base).multiplyScalar(nextLevel);
      },
    };
  }

  const kit = {
    THREE,
    renderer,
    segments,
    scene,
    camera,
    COLOR,
    holo,
    line,
    points,
    mix,
    /** The scan band that lights faces as it passes: x in world units. */
    scan(x, strength = 1, width = 1.2) {
      shared.uScanX.value = x;
      shared.uScan.value = strength;
      shared.uScanW.value = width;
    },
    get still() {
      return !state.animate;
    },
  };

  const api = build(kit);
  const frame = api.frame;

  /* ── Post: a light bloom, then alpha from brightness ── */
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  // Light and tight: only the bright edges and sparks bloom, faces don't.
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.2, 0.18, 0.72);
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

  const state = {
    animate: Boolean(animate),
    running: false,
    disposed: false,
    contextLost: false,
    t: 0,
    step: undefined,
    scroll: 0,
    scrollTarget: 0,
    tiltX: 0,
    tiltY: 0,
    targetTiltX: 0,
    targetTiltY: 0,
  };

  /* ── Camera ── */
  const look = new THREE.Vector3(...(frame.target ?? [0, 0, 0]));
  const baseYaw = frame.yaw ?? -0.5;
  const baseElev = frame.elev ?? 0.7;
  let distance = 20;

  function fit() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return false;
    const box = frameBox(width, height);
    camera.aspect = box.w / box.h;
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    distance = Math.max(frame.h / 2 / half, frame.w / 2 / (half * camera.aspect));
    // Render the full canvas, with the framed view sitting at the box.
    camera.setViewOffset(box.w, box.h, -box.x, -box.y, width, height);
    camera.updateProjectionMatrix();
    // Bloom and MSAA are fill-rate heavy: cap the ratio and the total pixels.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const pr = Math.max(1, Math.min(dpr, Math.sqrt(3.2e6 / (width * height))));
    renderer.setPixelRatio(pr);
    renderer.setSize(width, height, false);
    composer.setPixelRatio(pr);
    composer.setSize(width, height);
    pointUniforms.uPx.value = pr;
    pointUniforms.uScale.value = height * 0.5;
    return true;
  }

  function placeCamera() {
    const sway = state.animate ? Math.sin(state.t * 0.18) * 0.05 : 0;
    const yaw = baseYaw + sway + state.scroll * 0.22 + state.tiltY;
    const elev = baseElev + state.scroll * -0.05 + state.tiltX;
    camera.position.set(
      look.x + Math.sin(yaw) * Math.cos(elev) * distance,
      look.y + Math.sin(elev) * distance,
      look.z + Math.cos(yaw) * Math.cos(elev) * distance,
    );
    camera.lookAt(look);
  }

  function stepAt(local) {
    const { marks } = api.story;
    let index = 0;
    for (let i = 0; i < marks.length; i += 1) if (local >= marks[i]) index = i;
    return index;
  }

  function draw(dt) {
    if (state.disposed || state.contextLost) return;
    const k = state.animate ? 1 - Math.exp(-4 * dt) : 1;
    state.scroll = lerp(state.scroll, state.scrollTarget, k);
    state.tiltX = lerp(state.tiltX, state.targetTiltX, k);
    state.tiltY = lerp(state.tiltY, state.targetTiltY, k);
    placeCamera();
    const local = state.animate ? state.t % api.story.cycle : api.staticTime;
    api.update(local, state.animate ? dt : 0, state.t);
    composer.render(dt);
    const next = state.animate ? stepAt(local) : null;
    if (next !== state.step) {
      state.step = next;
      onStep?.(next, api.story);
    }
  }

  let last = 0;
  function loop(now) {
    if (!state.running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    state.t += dt;
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
    last = performance.now();
    renderer.setAnimationLoop(loop);
  }

  function resize() {
    if (state.disposed || state.contextLost) return;
    if (fit() && !state.running) draw(0);
  }

  const tiltHost = host ?? canvas;
  function onPointerMove(event) {
    const rect = tiltHost.getBoundingClientRect();
    state.targetTiltY = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1) * 0.08;
    state.targetTiltX = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1) * -0.03;
  }
  function onPointerLeave() {
    state.targetTiltX = 0;
    state.targetTiltY = 0;
  }
  function onContextLost(event) {
    event.preventDefault();
    state.contextLost = true;
    pause();
  }
  function onContextRestored() {
    state.contextLost = false;
    resize();
    resume();
  }

  const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
  resizeObserver?.observe(canvas);
  if (state.animate) {
    tiltHost.addEventListener("pointermove", onPointerMove);
    tiltHost.addEventListener("pointerleave", onPointerLeave);
  }
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);
  fit();
  draw(0);

  return {
    pause,
    resume,
    setScroll(value) {
      state.scrollTarget = state.animate ? clamp(value, -1, 1) : 0;
    },
    restart() {
      state.t = 0;
    },
    setMotionEnabled(enabled) {
      state.animate = Boolean(enabled);
      if (state.animate) resume();
      else {
        pause();
        state.scrollTarget = 0;
        state.targetTiltX = 0;
        state.targetTiltY = 0;
        draw(0);
      }
    },
    /** Test hook: draw the story at a loop time. */
    seek(local) {
      state.t = local;
      draw(0);
    },
    /** Width over height of the scene's framed box, for choosing its area. */
    aspect: frame.w / frame.h,
    /** Re-measure the framing area and reframe (it changed). */
    refit() {
      if (state.disposed || state.contextLost) return;
      if (fit() && !state.running) draw(0);
    },
    dispose() {
      if (state.disposed) return;
      state.disposed = true;
      pause();
      resizeObserver?.disconnect();
      tiltHost.removeEventListener("pointermove", onPointerMove);
      tiltHost.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      api.dispose?.();
      disposables.forEach((d) => d.dispose());
      target.dispose();
      composer.dispose?.();
      renderer.dispose();
    },
  };
}

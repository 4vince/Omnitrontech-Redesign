import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { applyPixelRatio, getRendererInfo } from "../../core/scene-quality.js";

/**
 * Shared stage for the AI Solutions service scenes.
 *
 * Every service gets a small, literal 3D model of what it does (a task map,
 * a conveyor, an agent working a tool board, a support desk, a reporting
 * pipeline). This module owns everything they share: the renderer, a soft
 * contact-shadow floor that lands on the section background, a slow orbit
 * camera that follows scroll and pointer, crisp canvas-textured label cards,
 * and a story clock that tells the page which caption is currently playing.
 *
 * A scene module exports `build(kit)` and returns:
 *   frame      { w, h, target: [x, y, z] }  world extents the camera must fit
 *   story      { cycle, marks: [seconds…] } one loop and where each step starts
 *   staticTime t used for the single frame rendered under reduced motion
 *   update(local, dt, t)                    pose the scene for loop time `local`
 */

export { THREE };

/** Render layer for label cards: drawn a second time, on top. */
const LABEL_LAYER = 1;

/* ── Palette ──
   Colour carries meaning across all five scenes:
     cobalt   the AI / the system doing the work (the brand blue)
     amber    a person: every hand-off, desk and approval
     teal     safe and finished: rules, answered, recorded
     red      blocked or out of range
     sky, coral, rose, lime, green: kinds of input (channels, sources,
     tools, request types), so the eye can follow one thing through. */
export const C = {
  ink: "#17191f",
  muted: "#4e535d",
  blue: "#2b46d6",
  blueTint: "#eef1fc",
  navy: "#0a1b52",
  line: "rgba(23, 25, 31, 0.14)",
  danger: "#d2412f",
  dangerTint: "#fdecea",
  success: "#11917c",
  successTint: "#e1f4f0",
  amber: "#e8900c",
  amberTint: "#fdf0db",
};

/** Hues: `css` for paint, `tint` for icon tiles, `hex` for 3D materials. */
export const HUE = Object.fromEntries(
  Object.entries({
    cobalt: ["#2b46d6", "#eef1fc"],
    amber: ["#e8900c", "#fdf0db"],
    teal: ["#11917c", "#e1f4f0"],
    red: ["#d2412f", "#fdecea"],
    sky: ["#2f8ee0", "#e4f1fc"],
    coral: ["#ec6a4f", "#fdebe6"],
    rose: ["#d24f86", "#fbe8f0"],
    lime: ["#6fa52a", "#edf5df"],
    green: ["#1f9e57", "#e2f5ea"],
    graphite: ["#5b6170", "#eceef2"],
  }).map(([name, [css, tint]]) => [name, { css, tint, hex: parseInt(css.slice(1), 16) }]),
);

/** A light, chalky version of a hue for painted blocks (0 = hue, 1 = white). */
export function pastel(name, k = 0.62) {
  const hue = HUE[name] ?? HUE.cobalt;
  return new THREE.Color(hue.hex).lerp(new THREE.Color(0xffffff), k).getHex();
}

export const HEX = {
  white: 0xffffff,
  paper: 0xfbfaf7,
  slab: 0xe2e6ee,
  steel: 0xc6cdda,
  blue: 0x2b46d6,
  blueSoft: 0x8aa3ff,
  navy: 0x0a1b52,
  danger: 0xd2412f,
  success: 0x11917c,
  amber: 0xe8900c,
  graphite: 0x3a3f4b,
};

/* ── Small math helpers shared by the scenes ── */
export const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
/** 0→1 progress of `t` through the window [a, b]. */
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const easeOut = (t) => 1 - (1 - t) ** 3;
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
/** Overshoot for card pops: lands at exactly 1. */
export const easeBack = (t) => {
  const c = 1.5;
  return t === 0 ? 0 : 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
};
export const damp = (current, target, lambda, dt) =>
  THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
/** In for [a, a+fade], out for [b, b+fade]: a card that is shown for a while. */
export const window01 = (t, a, b, fade = 0.4) => seg(t, a, a + fade) * (1 - seg(t, b, b + fade));

/* ── Canvas painting ── */
export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export const FONT = {
  display: '"Archivo Variable", Arial, sans-serif',
  body: '"Manrope Variable", Arial, sans-serif',
  mono: '"JetBrains Mono Variable", ui-monospace, monospace',
};

/** Draw `text`, shrinking the size until it fits `maxW`. Returns the size used. */
export function fitText(ctx, text, x, y, maxW, size, weight = 650, family = FONT.display) {
  let s = size;
  ctx.font = `${weight} ${s}px ${family}`;
  while (s > 8 && ctx.measureText(text).width > maxW) {
    s -= 1;
    ctx.font = `${weight} ${s}px ${family}`;
  }
  ctx.fillText(text, x, y);
  return s;
}

/* Phosphor glyphs: read each icon's code point from the icon font's own CSS
   so the scenes use the exact icons the rest of the site uses. */
const glyphs = new Map();
export function glyph(name) {
  if (glyphs.has(name)) return glyphs.get(name);
  const probe = document.createElement("i");
  probe.className = `ph ${name}`;
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = "position:absolute;left:-9999px;top:0;opacity:0;pointer-events:none";
  document.body.append(probe);
  const raw = getComputedStyle(probe, "::before").content;
  probe.remove();
  const char = raw && raw !== "none" ? raw.replace(/^["']|["']$/g, "") : "";
  glyphs.set(name, char);
  return char;
}

export function drawIcon(ctx, name, x, y, size, color) {
  const char = glyph(name);
  if (!char) return;
  ctx.save();
  ctx.font = `${size}px Phosphor`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(char, x, y);
  ctx.restore();
}

const TONES = {
  light: { bg: "#ffffff", stroke: C.line, iconBg: C.blueTint, icon: C.blue, ink: C.ink, sub: C.muted },
  blue: { bg: C.blue, stroke: C.blue, iconBg: "rgba(255,255,255,0.18)", icon: "#ffffff", ink: "#ffffff", sub: "#dfe6ff" },
  navy: { bg: C.navy, stroke: C.navy, iconBg: "rgba(255,255,255,0.12)", icon: "#b9c4e5", ink: "#f6f5f1", sub: "#b9c4e5" },
  danger: { bg: "#ffffff", stroke: C.danger, iconBg: C.danger, icon: "#ffffff", ink: C.ink, sub: C.danger },
  success: { bg: "#ffffff", stroke: "rgba(17,145,124,0.55)", iconBg: C.success, icon: "#ffffff", ink: C.ink, sub: C.success },
  person: { bg: "#ffffff", stroke: "rgba(232,144,12,0.6)", iconBg: C.amber, icon: "#ffffff", ink: C.ink, sub: "#a86200" },
  amber: { bg: C.amber, stroke: C.amber, iconBg: "rgba(255,255,255,0.22)", icon: "#ffffff", ink: "#ffffff", sub: "#fff1dc" },
  muted: { bg: "#f4f2ec", stroke: C.line, iconBg: "#e8e5dd", icon: "#8a909a", ink: "#6b717c", sub: "#8a909a" },
};

/**
 * The standard label card: rounded face, icon tile, title and optional sub.
 * Sized from the card's height so every card on every scene reads alike.
 */
export function chip({ icon, title, sub, tone = "light", hue, solid = false }) {
  let pal = TONES[tone] ?? TONES.light;
  // A hue recolours the icon tile: tinted by default, filled when `solid`.
  if (hue && HUE[hue]) {
    const h = HUE[hue];
    pal = { ...pal, iconBg: solid ? h.css : h.tint, icon: solid ? "#ffffff" : h.css };
  }
  return (ctx, W, H) => {
    const r = Math.min(H * 0.24, 44);
    rr(ctx, 3, 3, W - 6, H - 6, r);
    ctx.fillStyle = pal.bg;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = pal.stroke;
    ctx.stroke();

    let x = H * 0.2;
    if (icon) {
      const s = H * 0.6;
      rr(ctx, x, (H - s) / 2, s, s, s * 0.26);
      ctx.fillStyle = pal.iconBg;
      ctx.fill();
      drawIcon(ctx, icon, x + s / 2, H / 2, s * 0.62, pal.icon);
      x += s + H * 0.17;
    }
    const maxW = W - x - H * 0.2;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    if (!title) return;
    if (sub) {
      ctx.fillStyle = pal.ink;
      fitText(ctx, title, x, H * 0.47, maxW, H * 0.27, 700);
      ctx.fillStyle = pal.sub;
      fitText(ctx, sub, x, H * 0.77, maxW, H * 0.2, 620, FONT.body);
    } else {
      ctx.fillStyle = pal.ink;
      fitText(ctx, title, x, H * 0.615, maxW, H * 0.33, 700);
    }
  };
}

async function fontsReady() {
  if (!document.fonts?.load) return;
  try {
    await Promise.all([
      document.fonts.load('650 40px "Archivo Variable"'),
      document.fonts.load('560 40px "Manrope Variable"'),
      document.fonts.load('600 40px "JetBrains Mono Variable"'),
      document.fonts.load("40px Phosphor"),
    ]);
  } catch {
    /* system fallbacks */
  }
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{
 *   build: (kit) => object,
 *   animate?: boolean,
 *   dark?: boolean,
 *   host?: HTMLElement,
 *   padTop?: number,
 *   padBottom?: number,
 *   onStep?: (index: number | null) => void,
 * }} options
 */
export async function createServiceStage(
  canvas,
  { build, animate = true, dark = false, host, padTop = 0.22, padBottom = 0.11, onStep } = {},
) {
  await fontsReady();

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  } catch (error) {
    console.error("Could not start a service visual.", error);
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // Shadows are drawn once per frame, in the first of the two passes below.
  renderer.shadowMap.autoUpdate = false;
  // Neutral tone mapping keeps the hues true while rolling off highlights;
  // label faces opt out (toneMapped: false) so their text stays exact.
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.2;
  applyPixelRatio(renderer);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.5, 120);

  // A soft studio room for image-based light: gives every block a gentle
  // gradient and a faint highlight on its rounded edges, so faces separate.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.environment = envTexture;
  scene.environmentIntensity = dark ? 0.5 : 0.45;

  // Strong warm key over a weak cool fill: clear light, side and shadow
  // faces on every block, which is what makes the shapes read.
  const hemi = new THREE.HemisphereLight(0xf3f6ff, dark ? 0x56649a : 0xcfc8bb, dark ? 0.9 : 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1de, dark ? 2.7 : 2.9);
  sun.position.set(-6, 12, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 6;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 40 });
  scene.add(sun);
  // Lights must sit on the label layer too, or the second pass is unlit.
  hemi.layers.enableAll();

  // Rim light: a cool light from behind and above that traces the far
  // edges of every block, separating shapes from the section behind them
  // (most needed on the navy bands). No shadow: it only shapes edges.
  const rim = new THREE.DirectionalLight(dark ? 0x9db2ff : 0xdfe6ff, dark ? 1.5 : 0.9);
  rim.position.set(4, 7, -10);
  rim.layers.enableAll();
  scene.add(rim);

  // Contact light: straight overhead, barely bright, with a very soft
  // shadow. Its job is the shadow, a soft pool right under each object
  // that grounds it (the cheap stand-in for ambient occlusion).
  const top = new THREE.DirectionalLight(0xffffff, 0.25);
  top.position.set(0.4, 14, 0.6);
  top.castShadow = true;
  top.shadow.mapSize.set(1024, 1024);
  top.shadow.radius = 14;
  top.shadow.bias = -0.0006;
  top.shadow.normalBias = 0.03;
  top.shadow.intensity = dark ? 0.55 : 0.4;
  Object.assign(top.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 30 });
  scene.add(top);
  sun.layers.enableAll();

  // Shadows fall straight onto the section background: no visible floor.
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    // Tinted navy, never black: the same shadow family as the 2D cards.
    new THREE.ShadowMaterial({ color: dark ? 0x01040f : 0x0a1b52, opacity: dark ? 0.5 : 0.2 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const root = new THREE.Group();
  scene.add(root);

  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const textures = new Set();

  /** A canvas texture painted at `scale` px per world unit. */
  // Label and board textures follow the screen's pixel density: sharp on
  // 2x displays without spending 2x memory on 1x ones. Capped to stay
  // within every GPU's texture limit.
  const density = Math.min(1.35, Math.max(0.85, (window.devicePixelRatio || 1) * 0.7));
  const maxTex = Math.min(4096, renderer.capabilities.maxTextureSize);

  function texture(w, h, paint, scale = 340) {
    const c = document.createElement("canvas");
    const k = Math.min(density, maxTex / Math.max(w * scale, h * scale));
    c.width = Math.max(8, Math.round(w * scale * k));
    c.height = Math.max(8, Math.round(h * scale * k));
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("Could not paint a service visual texture.");
    paint(ctx, c.width, c.height);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, maxAniso);
    textures.add(tex);
    return tex;
  }

  /*
   * Blocks: soft-touch plastic with a thin clear coat, so rounded edges
   * catch a crisp highlight from the studio environment. A fresnel term
   * (injected into the standard physical shader) adds a faint rim where
   * a surface turns away from the camera: silhouettes read on light and
   * on navy sections alike. One shared uniform set and one cache key, so
   * every block still compiles to a single shader program.
   */
  const rimUniforms = {
    uRimColor: { value: new THREE.Color(dark ? 0x8fa6ff : 0xffffff) },
    uRimStrength: { value: dark ? 0.32 : 0.1 },
    uRimPower: { value: 2.6 },
  };

  function withRim(material) {
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, rimUniforms);
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          uniform vec3 uRimColor;
          uniform float uRimStrength;
          uniform float uRimPower;`,
        )
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
          float rimFacing = saturate(dot(normal, normalize(vViewPosition)));
          totalEmissiveRadiance += uRimColor * pow(1.0 - rimFacing, uRimPower) * uRimStrength;`,
        );
    };
    material.customProgramCacheKey = () => "svx-rim";
    return material;
  }

  function mat(color, extra = {}) {
    return withRim(
      new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.48,
        metalness: 0,
        clearcoat: 0.35,
        clearcoatRoughness: 0.32,
        ...extra,
      }),
    );
  }

  /*
   * Outlines: an inverted hull. A copy of the mesh, a hair larger, drawn
   * from its back faces in one flat ink colour, leaves a clean silhouette
   * line around rounded shapes where edge detection would find none.
   */
  const outlineMaterial = new THREE.MeshBasicMaterial({
    color: dark ? 0x040a24 : 0x262d4a,
    side: THREE.BackSide,
    toneMapped: false,
  });
  // Label cards get a lighter, finer edge: crisp, without boxing the text in.
  const cardOutlineMaterial = new THREE.MeshBasicMaterial({
    color: dark ? 0x0b1640 : 0xa9b0c2,
    side: THREE.BackSide,
    toneMapped: false,
  });

  function outline(mesh, thickness = 0.022, material = outlineMaterial) {
    const geometry = mesh.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const size = geometry.boundingBox.getSize(new THREE.Vector3());
    const hull = new THREE.Mesh(geometry, material);
    hull.scale.set(
      (size.x + thickness * 2) / Math.max(size.x, 1e-4),
      (size.y + thickness * 2) / Math.max(size.y, 1e-4),
      (size.z + thickness * 2) / Math.max(size.z, 1e-4),
    );
    hull.castShadow = false;
    hull.receiveShadow = false;
    hull.userData.outline = true;
    mesh.add(hull);
    return hull;
  }

  function box(w, h, d, color, radius = Math.min(w, h, d) * 0.18, extra, edge = 0.022, edgeMaterial) {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, radius), mat(color, extra));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (edge) outline(mesh, edge, edgeMaterial);
    return mesh;
  }

  /**
   * An upright card (faces the camera, +z) with a painted face. Several
   * faces can be prepared and swapped (e.g. a checklist ticking off).
   */
  function card({ w, h, paint, paints, depth = 0.07, color = HEX.white, scale }) {
    const group = new THREE.Group();
    const slab = box(w, h, depth, color, Math.min(w, h) * 0.2, undefined, 0.012, cardOutlineMaterial);
    const faces = (paints ?? [paint]).map((p) => texture(w, h, p, scale));
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: faces[0], transparent: true, toneMapped: false }),
    );
    face.position.z = depth / 2 + 0.003;
    group.add(slab, face);
    // Labels also join the overlay pass (layer 1), drawn after the depth is
    // cleared, so nothing in the scene can cut through their text.
    group.traverse((object) => object.layers.enable(LABEL_LAYER));
    let current = 0;
    return {
      group,
      slab,
      face,
      show(index) {
        if (index === current || !faces[index]) return;
        current = index;
        face.material.map = faces[index];
      },
    };
  }

  /** A flat painted tile lying on the floor (boards, belts, labels). */
  function tile({ w, d, paint, scale = 190, y = 0.002 }) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshStandardMaterial({ map: texture(w, d, paint, scale), roughness: 0.9, transparent: true }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = y;
    mesh.receiveShadow = true;
    return mesh;
  }

  /** A line through points (updated by the scene via setPoints). */
  function line(color = HEX.blue, opacity = 0.7, maxPoints = 64) {
    // A fixed-size buffer: setFromPoints() on an existing geometry never
    // grows it, so a line that gains points would be cut short.
    const positions = new Float32Array(maxPoints * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setDrawRange(0, 0);
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
    const object = new THREE.Line(geometry, material);
    object.frustumCulled = false;
    return {
      object,
      setPoints(points) {
        const n = Math.min(points.length, maxPoints);
        for (let i = 0; i < n; i += 1) {
          positions[i * 3] = points[i].x;
          positions[i * 3 + 1] = points[i].y;
          positions[i * 3 + 2] = points[i].z;
        }
        geometry.attributes.position.needsUpdate = true;
        geometry.setDrawRange(0, n);
      },
    };
  }

  /** Square a label card up to the screen so its text never reads skewed. */
  function faceCamera(object) {
    object.quaternion.copy(camera.quaternion);
  }

  const kit = { THREE, root, scene, camera, renderer, texture, mat, box, outline, card, tile, line, faceCamera, dark };
  const api = build(kit);

  // Fit the key light's shadow frustum to this scene, not a fixed box:
  // the same 2048 map then covers less ground and the shadows sharpen.
  {
    const reach = Math.max(api.frame.w, api.frame.h) * 0.62 + 1;
    Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach });
    sun.shadow.camera.updateProjectionMatrix();
  }

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

  const target = new THREE.Vector3(...(api.frame.target ?? [0, 0, 0]));
  const baseYaw = api.frame.yaw ?? -0.32;
  const baseElev = api.frame.elev ?? 0.56;
  let distance = 20;

  function fit() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return false;
    const contentH = height * (1 - padTop - padBottom);
    const aspect = width / contentH;
    camera.aspect = aspect;
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    distance = Math.max(api.frame.h / 2 / half, api.frame.w / 2 / (half * aspect)) * 1.04;
    // The fitted image covers the band between the title and the captions.
    camera.setViewOffset(width, contentH, 0, -padTop * height, width, height);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    applyPixelRatio(renderer);
    return true;
  }

  function placeCamera() {
    const yaw = baseYaw + state.scroll * 0.3 + state.tiltY;
    const elev = baseElev + state.scroll * -0.06 + state.tiltX;
    camera.position.set(
      target.x + Math.sin(yaw) * Math.cos(elev) * distance,
      target.y + Math.sin(elev) * distance,
      target.z + Math.cos(yaw) * Math.cos(elev) * distance,
    );
    camera.lookAt(target);
  }

  function stepAt(local) {
    const { marks } = api.story;
    let index = 0;
    for (let i = 0; i < marks.length; i += 1) if (local >= marks[i]) index = i;
    return index;
  }

  function draw(dt) {
    if (state.disposed || state.contextLost) return;
    const step = state.animate ? dt : 1;
    state.scroll = damp(state.scroll, state.scrollTarget, 5, step);
    state.tiltX = damp(state.tiltX, state.targetTiltX, 3.5, step);
    state.tiltY = damp(state.tiltY, state.targetTiltY, 3.5, step);
    placeCamera();

    const local = state.animate ? state.t % api.story.cycle : api.staticTime;
    api.update(local, state.animate ? dt : 0, state.t);

    const nextStep = state.animate ? stepAt(local) : null;
    if (nextStep !== state.step) {
      state.step = nextStep;
      onStep?.(nextStep, api.story);
    }
    render();
  }

  // Two passes: the whole scene with depth (and its shadows), then only the
  // label cards over it with the depth cleared, so labels always read.
  renderer.autoClear = false;
  function render() {
    renderer.clear();
    renderer.shadowMap.needsUpdate = true;
    camera.layers.set(0);
    renderer.render(scene, camera);
    renderer.clearDepth();
    camera.layers.set(LABEL_LAYER);
    renderer.render(scene, camera);
    camera.layers.set(0);
  }

  let last = performance.now();
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
    const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    state.targetTiltY = clamp(nx, -1, 1) * 0.09;
    state.targetTiltX = clamp(ny, -1, 1) * -0.035;
  }
  function onPointerLeave() {
    state.targetTiltX = 0;
    state.targetTiltY = 0;
  }

  function onContextLost(event) {
    event.preventDefault();
    state.contextLost = true;
    pause();
    canvas.closest("[data-svx]")?.classList.remove("has-webgl");
  }
  function onContextRestored() {
    state.contextLost = false;
    canvas.closest("[data-svx]")?.classList.add("has-webgl");
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
    /** -1 … 1 across the section's pass through the viewport. */
    setScroll(value) {
      state.scrollTarget = state.animate ? clamp(value, -1, 1) : 0;
    },
    /** Restart the story from its first step (first time it is seen). */
    restart() {
      state.t = 0;
    },
    setMotionEnabled(enabled) {
      state.animate = Boolean(enabled);
      if (state.animate) resume();
      else {
        pause();
        state.scrollTarget = 0;
        draw(0);
      }
    },
    getStats: () => getRendererInfo(renderer),
    dispose() {
      if (state.disposed) return;
      state.disposed = true;
      pause();
      resizeObserver?.disconnect();
      tiltHost.removeEventListener("pointermove", onPointerMove);
      tiltHost.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      scene.traverse((object) => {
        object.geometry?.dispose();
        if (object.material) object.material.dispose();
      });
      textures.forEach((tex) => tex.dispose());
      envTexture.dispose();
      renderer.dispose();
    },
  };
}

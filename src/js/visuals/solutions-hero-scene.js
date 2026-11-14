import * as THREE from "three";
import { getRendererInfo } from "../core/scene-quality.js";

/**
 * AI Solutions hero — a crisp, literal overview of the five services.
 *
 * A "Your business" hub card is wired to five solid service cards. Each card
 * says what the service does (icon, name, one-line outcome), small packets
 * travel along the wires, and the whole board tilts gently toward the pointer
 * so the depth reads as real 3D. Clicking a card jumps to that service.
 *
 * Rendering stays deliberately flat and sharp: OrthographicCamera, unlit
 * canvas-textured faces (toneMapped off), no bloom, fog or shadow maps.
 */

const FRUSTUM_H = 7.0;
const CARD_W = 3.3;
const CARD_H = 1.55;
const HUB_W = 2.8;
const HUB_H = 1.3;
const SLAB_DEPTH = 0.16;
const SLAB_BEVEL = 0.025;
// Card artwork is laid out on a 200-px-per-unit design grid; textures are
// rendered at SUPERSAMPLE x the on-screen density (see resize) and mipmapped.
const DESIGN_SCALE = 200;
// Texture pixels per screen pixel. Drawn 2x and sampled through mipmaps, the
// text stays crisp and smooth while the board tilts or a card lifts.
const SUPERSAMPLE = 2;

/* This scene is cheap (no bloom or post), so it renders at the screen's own
   density: a capped ratio gets stretched by the browser and reads as blur. */
function applyPixelRatio(renderer) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
}

const COLORS = {
  ink: "#17191f",
  muted: "#40454e",
  muted2: "#555c67",
  blue: "#2b46d6",
  blueTint: "#eef1fc",
  blueDeep: "#0a1b52",
  ctaInk: "#f6f5f1",
  ctaMuted: "#b9c4e5",
  line: "rgba(23, 25, 31, 0.16)",
};

const OUTCOMES = {
  strategy: "Where AI helps, what it costs, and what to do first",
  automation: "Routine tasks run on their own; exceptions stay visible",
  agentic: "Multi-step tasks done, with people in control",
  experience: "Faster answers, and a person when it matters",
  data: "See what changed and what to check next",
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const damp = (current, target, lambda, dt) =>
  THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function roundRectShape(w, h, r) {
  const x = -w / 2;
  const y = -h / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

/* Line icons, drawn centred on (0,0) inside a ~44px box */
const ICONS = {
  strategy(ctx) {
    ctx.beginPath();
    ctx.arc(0, 0, 19, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(8, -8);
    ctx.lineTo(3, 3);
    ctx.lineTo(-8, 8);
    ctx.lineTo(-3, -3);
    ctx.closePath();
    ctx.stroke();
  },
  automation(ctx) {
    // three connected steps: a small flow chart
    ctx.beginPath();
    ctx.moveTo(-9, -12);
    ctx.lineTo(9, -12);
    ctx.moveTo(14, -6);
    ctx.lineTo(14, 4);
    ctx.lineTo(-8, 13);
    ctx.stroke();
    roundRectPath(ctx, -21, -18, 12, 12, 3);
    ctx.stroke();
    roundRectPath(ctx, 9, -18, 12, 12, 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-14, 13, 6, 0, Math.PI * 2);
    ctx.stroke();
  },
  agentic(ctx) {
    roundRectPath(ctx, -17, -10, 34, 26, 7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(0, -18);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -20, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-7, 2, 3, 0, Math.PI * 2);
    ctx.arc(7, 2, 3, 0, Math.PI * 2);
    ctx.fill();
  },
  experience(ctx) {
    ctx.beginPath();
    ctx.arc(0, 2, 16, Math.PI, 0);
    ctx.stroke();
    roundRectPath(ctx, -20, 0, 8, 14, 3);
    ctx.stroke();
    roundRectPath(ctx, 12, 0, 8, 14, 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(16, 14);
    ctx.quadraticCurveTo(16, 20, 6, 20);
    ctx.stroke();
  },
  data(ctx) {
    ctx.beginPath();
    ctx.moveTo(-19, -19);
    ctx.lineTo(-19, 19);
    ctx.lineTo(19, 19);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-12, 9);
    ctx.lineTo(-3, -1);
    ctx.lineTo(4, 5);
    ctx.lineTo(16, -11);
    ctx.stroke();
  },
  hub(ctx) {
    roundRectPath(ctx, -18, -14, 36, 28, 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-18, -5);
    ctx.lineTo(18, -5);
    ctx.moveTo(-6, -14);
    ctx.lineTo(-6, 14);
    ctx.stroke();
  },
};

function wrapLines(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines;
}

/* Textures are drawn at SUPERSAMPLE x the density they are shown at and
   filtered trilinearly: the GPU reads a clean box-filtered mip level, so text
   and edges neither alias (oversized, unfiltered) nor smear (stretched). */
function canvasTexture(canvas, renderer) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace; // canvas colours are sRGB
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function designCanvas(width, height, scale) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create a hero card texture.");
  const k = scale / DESIGN_SCALE;
  ctx.scale(k, k);
  return { canvas, ctx, W: width * DESIGN_SCALE, H: height * DESIGN_SCALE };
}

/* A soft, navy-tinted drop shadow for a rounded card: blurred once into a
   texture, laid on a plane behind the slab. */
function makeShadowTexture(renderer, width, height) {
  const margin = 0.45;
  const scale = 60;
  const W = Math.round((width + margin * 2) * scale);
  const H = Math.round((height + margin * 2) * scale);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create a card shadow.");
  // Draw the card far off-canvas and keep only its blurred shadow.
  const off = W * 2;
  ctx.shadowColor = "rgba(10, 27, 82, 1)";
  ctx.shadowBlur = 0.3 * scale;
  ctx.shadowOffsetX = off;
  roundRectPath(ctx, margin * scale - off, margin * scale, width * scale, height * scale, 0.15 * scale);
  ctx.fillStyle = "#000";
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { texture, width: width + margin * 2, height: height + margin * 2 };
}

function makeCardTexture(renderer, { index, name, outcome, iconKey }, scale = DESIGN_SCALE) {
  const { canvas, ctx, W, H } = designCanvas(CARD_W, CARD_H, scale);

  const pad = 36;
  roundRectPath(ctx, 2, 2, W - 4, H - 4, 30);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  // A faint top sheen and an inner edge: reads as a finished card.
  const sheen = ctx.createLinearGradient(0, 0, 0, H);
  sheen.addColorStop(0, "rgba(238, 241, 252, 0.9)");
  sheen.addColorStop(0.4, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = sheen;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(23, 25, 31, 0.18)";
  ctx.stroke();
  roundRectPath(ctx, 5, 5, W - 10, H - 10, 27);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.stroke();

  // icon tile
  roundRectPath(ctx, pad, pad - 6, 68, 68, 17);
  ctx.fillStyle = COLORS.blueTint;
  ctx.fill();
  ctx.save();
  ctx.translate(pad + 34, pad + 28);
  ctx.lineWidth = 4.8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = COLORS.blue;
  ctx.fillStyle = COLORS.blue;
  ICONS[iconKey](ctx);
  ctx.restore();

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "right";
  ctx.fillStyle = COLORS.blue;
  ctx.font = '600 32px "JetBrains Mono Variable", ui-monospace, monospace';
  ctx.fillText(index, W - pad, pad + 26);

  ctx.textAlign = "left";
  ctx.fillStyle = COLORS.ink;
  ctx.font = '650 50px "Archivo Variable", Arial, sans-serif';
  ctx.fillText(name, pad, 164);

  ctx.fillStyle = COLORS.muted;
  ctx.font = '560 37px "Manrope Variable", Arial, sans-serif';
  wrapLines(ctx, outcome, W - pad * 2)
    .slice(0, 2)
    .forEach((line, i) => ctx.fillText(line, pad, 218 + i * 45));

  return canvasTexture(canvas, renderer);
}

function makeHubTexture(renderer, scale = DESIGN_SCALE) {
  const { canvas, ctx, W, H } = designCanvas(HUB_W, HUB_H, scale);

  roundRectPath(ctx, 0, 0, W, H, 30);
  const ground = ctx.createLinearGradient(0, 0, 0, H);
  ground.addColorStop(0, "#16307e");
  ground.addColorStop(1, COLORS.blueDeep);
  ctx.fillStyle = ground;
  ctx.fill();
  roundRectPath(ctx, 3, 3, W - 6, H - 6, 27);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
  ctx.stroke();

  ctx.save();
  ctx.translate(W / 2, 58);
  ctx.lineWidth = 4.8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = COLORS.ctaMuted;
  ICONS.hub(ctx);
  ctx.restore();

  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.ctaMuted;
  ctx.font = '600 26px "JetBrains Mono Variable", ui-monospace, monospace';
  ctx.fillText("YOUR BUSINESS", W / 2, 124);

  ctx.fillStyle = COLORS.ctaInk;
  ctx.font = '650 48px "Archivo Variable", Arial, sans-serif';
  ctx.fillText("Day-to-day work", W / 2, 180);

  ctx.fillStyle = "#dfe5f8";
  ctx.font = '560 31px "Manrope Variable", Arial, sans-serif';
  ctx.fillText("Requests · records · customers", W / 2, 228);

  return canvasTexture(canvas, renderer);
}

async function fontsReady() {
  if (!document.fonts?.load) return;
  try {
    await Promise.all([
      document.fonts.load('650 50px "Archivo Variable"'),
      document.fonts.load('500 37px "Manrope Variable"'),
      document.fonts.load('600 28px "JetBrains Mono Variable"'),
    ]);
  } catch {
    /* fall back to the stack's system fonts */
  }
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ services: Array, animate?: boolean, onSelect?: (service) => void }} options
 */
export async function createSolutionsHeroScene(
  canvas,
  { services, animate = true, onSelect } = {},
) {
  await fontsReady();

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
  } catch (error) {
    console.error("Could not initialise the AI Solutions hero visual.", error);
    return null;
  }

  renderer.setClearColor(0x000000, 0);
  applyPixelRatio(renderer);

  const state = {
    animate: Boolean(animate),
    running: false,
    disposed: false,
    contextLost: false,
    halfW: 6,
    layout: "ring",
    tiltX: 0,
    tiltY: 0,
    targetTiltX: 0,
    targetTiltY: 0,
    hovered: null,
    introStart: null,
    texScale: DESIGN_SCALE,
  };

  const timer = new THREE.Timer();
  timer.connect(document);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 40);
  camera.position.z = 12;

  scene.add(new THREE.AmbientLight(0xffffff, 1.7));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(-4, 6, 8);
  scene.add(key);

  const board = new THREE.Group();
  scene.add(board);

  // No dot backplane here: the section's blueprint grid (backdrop.css) is the
  // backdrop, and a second pattern on top of it read as noise.

  const shadows = {
    card: makeShadowTexture(renderer, CARD_W, CARD_H),
    hub: makeShadowTexture(renderer, HUB_W, HUB_H),
  };

  function makeSlabCard({ width, height, texture, slabColor, shadowKind }) {
    const group = new THREE.Group();

    // A thick slab with a fine bevel: the edge catches the key light when
    // the board tilts, so the cards read as objects, not stickers.
    const shape = roundRectShape(width - SLAB_BEVEL * 2, height - SLAB_BEVEL * 2, 0.13);
    const slabGeometry = new THREE.ExtrudeGeometry(shape, {
      depth: SLAB_DEPTH - SLAB_BEVEL * 2,
      bevelEnabled: true,
      bevelThickness: SLAB_BEVEL,
      bevelSize: SLAB_BEVEL,
      bevelSegments: 3,
      curveSegments: 10,
    });
    slabGeometry.translate(0, 0, -SLAB_DEPTH + SLAB_BEVEL);
    const slabMaterial = new THREE.MeshStandardMaterial({ color: slabColor, roughness: 0.55, metalness: 0 });
    const slab = new THREE.Mesh(slabGeometry, slabMaterial);
    group.add(slab);

    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false }),
    );
    face.position.z = 0.004;
    group.add(face);

    const soft = shadows[shadowKind];
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(soft.width, soft.height),
      new THREE.MeshBasicMaterial({ map: soft.texture, transparent: true, opacity: 0.2, depthWrite: false }),
    );
    shadow.position.set(0.1, -0.16, -0.5);
    group.add(shadow);

    return { group, slab, face, shadow };
  }

  /* Hub */
  const hub = makeSlabCard({
    width: HUB_W,
    height: HUB_H,
    texture: makeHubTexture(renderer),
    slabColor: 0x10247e,
    shadowKind: "hub",
  });
  board.add(hub.group);

  /* Service cards, wires and packets */
  const wireMaterialBase = { color: 0x2b46d6, transparent: true, depthWrite: false };
  const cards = services.map((service, i) => {
    const card = makeSlabCard({
      width: CARD_W,
      height: CARD_H,
      texture: makeCardTexture(renderer, {
        index: service.index,
        name: service.name,
        outcome: OUTCOMES[service.id] ?? service.outcome,
        iconKey: service.id,
      }),
      slabColor: 0xd9deea,
      shadowKind: "card",
    });
    card.face.userData.cardIndex = i;
    board.add(card.group);

    const wireGeometry = new THREE.BufferGeometry();
    wireGeometry.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(6), 3));
    const wire = new THREE.Line(
      wireGeometry,
      new THREE.LineBasicMaterial({ ...wireMaterialBase, opacity: 0.45 }),
    );
    board.add(wire);

    const packet = new THREE.Group();
    packet.add(
      new THREE.Mesh(
        new THREE.CircleGeometry(0.1, 20),
        new THREE.MeshBasicMaterial({ color: 0x2b46d6, transparent: true, opacity: 0.2 }),
      ),
      new THREE.Mesh(new THREE.CircleGeometry(0.048, 16), new THREE.MeshBasicMaterial({ color: 0x2b46d6 })),
    );
    board.add(packet);

    return {
      service,
      art: {
        index: service.index,
        name: service.name,
        outcome: OUTCOMES[service.id] ?? service.outcome,
        iconKey: service.id,
      },
      ...card,
      wire,
      packet,
      home: new THREE.Vector3(),
      phase: i * 1.37,
      lift: 0,
      appear: state.animate ? 0 : 1,
    };
  });

  const hubHome = new THREE.Vector3();
  const faces = cards.map((card) => card.face);

  function layout() {
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    state.layout = aspect >= 1.25 ? "ring" : "grid";

    if (state.layout === "ring") {
      hubHome.set(0, 0, 0);
      const rx = 3.75;
      const ry = 2.5;
      const angles = [90, 18, -54, -126, 162];
      cards.forEach((card, i) => {
        const a = THREE.MathUtils.degToRad(angles[i] ?? 90);
        card.home.set(Math.cos(a) * rx, Math.sin(a) * ry, 0);
      });
      // Half extents the camera must fit: cards plus bob, lift and shadow.
      return { halfW: rx + CARD_W / 2 + 0.2, halfH: ry + CARD_H / 2 + 0.35 };
    }

    hubHome.set(0, 2.75, 0);
    const col = CARD_W / 2 + 0.16;
    const rows = [0.95, -0.9, -2.75];
    cards.forEach((card, i) => {
      const row = Math.floor(i / 2);
      const isLastAlone = i === cards.length - 1 && cards.length % 2 === 1;
      card.home.set(isLastAlone ? 0 : i % 2 === 0 ? -col : col, rows[row] ?? -2.75, 0);
    });
    return { halfW: col + CARD_W / 2 + 0.15, halfH: 2.75 + CARD_H / 2 + 0.38 };
  }

  /* Device pixels per world unit as rendered, times SUPERSAMPLE: the card
     artwork is redrawn at this density whenever it drifts by more than 4%. */
  function syncTextureScale(cssHeight) {
    const visibleH = FRUSTUM_H / camera.zoom;
    const wanted = clamp(Math.round(((cssHeight * renderer.getPixelRatio()) / visibleH) * SUPERSAMPLE), 120, 640);
    if (Math.abs(wanted - state.texScale) / state.texScale < 0.04) return;
    state.texScale = wanted;
    const swap = (face, texture) => {
      face.material.map?.dispose();
      face.material.map = texture;
      face.material.needsUpdate = true;
    };
    swap(hub.face, makeHubTexture(renderer, wanted));
    cards.forEach((card) => swap(card.face, makeCardTexture(renderer, card.art, wanted)));
  }

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height || state.disposed || state.contextLost) return;

    const needed = layout();
    const halfH = FRUSTUM_H / 2;
    const halfW = halfH * (width / height);
    state.halfW = halfW;
    camera.left = -halfW;
    camera.right = halfW;
    camera.top = halfH;
    camera.bottom = -halfH;
    // Fit the board in both directions, so no card (or its shadow) is cut
    // off at the canvas edge.
    camera.zoom = Math.min(1, halfW / needed.halfW, halfH / needed.halfH);
    camera.updateProjectionMatrix();

    renderer.setSize(width, height, false);
    applyPixelRatio(renderer);
    syncTextureScale(height);
    draw(0);
  }

  /* Pointer: tilt across the whole hero, hover + click on the cards */
  const pointer = new THREE.Vector2(2, 2);
  const raycaster = new THREE.Raycaster();
  const tiltHost = canvas.closest(".solutions-hero") ?? canvas;

  function onTiltMove(event) {
    const rect = tiltHost.getBoundingClientRect();
    const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    state.targetTiltY = clamp(nx, -1, 1) * 0.2;
    state.targetTiltX = clamp(ny, -1, 1) * 0.14;
    if (!state.running) draw(0);
  }

  function onTiltLeave() {
    state.targetTiltX = 0;
    state.targetTiltY = 0;
  }

  function onCanvasMove(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
  }

  function onCanvasLeave() {
    pointer.set(2, 2);
  }

  function onCanvasClick() {
    if (state.hovered !== null) onSelect?.(cards[state.hovered].service);
  }

  function pick() {
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(faces, false)[0];
    const index = hit ? hit.object.userData.cardIndex : null;
    if (index !== state.hovered) {
      state.hovered = index;
      canvas.style.cursor = index === null ? "" : "pointer";
    }
  }

  const tmp = new THREE.Vector3();

  function update(dt) {
    timer.update();
    const t = state.animate ? timer.getElapsed() : 0;
    if (state.introStart === null) state.introStart = t;
    const intro = t - state.introStart;
    const step = state.animate ? dt : 1;

    // board tilt: pointer target plus a slow idle sway
    const idleY = state.animate ? Math.sin(t * 0.35) * 0.05 : 0;
    const idleX = state.animate ? Math.cos(t * 0.28) * 0.025 : 0;
    state.tiltX = damp(state.tiltX, state.targetTiltX, 4, step);
    state.tiltY = damp(state.tiltY, state.targetTiltY, 4, step);
    board.rotation.x = state.tiltX + idleX;
    board.rotation.y = state.tiltY + idleY;

    board.updateMatrixWorld();
    pick();

    hub.group.position.copy(hubHome);
    hub.group.position.y += state.animate ? Math.sin(t * 0.8) * 0.03 : 0;

    cards.forEach((card, i) => {
      if (state.animate) {
        const local = clamp((intro - 0.15 - i * 0.12) / 0.7, 0, 1);
        card.appear = easeOutCubic(local);
      } else {
        card.appear = 1;
      }

      const isHovered = state.hovered === i;
      card.lift = damp(card.lift, isHovered ? 1 : 0, 10, step);

      const bob = state.animate ? Math.sin(t * 0.9 + card.phase) * 0.04 : 0;
      card.group.position.set(card.home.x, card.home.y + bob, card.lift * 0.35);
      card.group.scale.setScalar(Math.max(0.001, card.appear) * (1 + card.lift * 0.04));
      card.slab.material.color.setHex(isHovered ? 0x2b46d6 : 0xd9deea);
      card.shadow.position.set(0.1 + card.lift * 0.1, -0.16 - card.lift * 0.14, -0.5);
      card.shadow.scale.setScalar(1 + card.lift * 0.06);
      card.shadow.material.opacity = 0.2 + card.lift * 0.06;

      // wire from hub to card, sitting behind both slabs
      const positions = card.wire.geometry.attributes.position;
      positions.setXYZ(0, hub.group.position.x, hub.group.position.y, -0.25);
      positions.setXYZ(1, card.group.position.x, card.group.position.y, -0.25);
      positions.needsUpdate = true;
      card.wire.geometry.computeBoundingSphere();
      card.wire.material.opacity = (isHovered ? 0.85 : 0.45) * card.appear;

      // packet travels hub → card; it shows in the gap between the slabs
      const speed = isHovered ? 0.55 : 0.22;
      const progress = state.animate ? (t * speed + i * 0.21) % 1 : 0.5;
      tmp.lerpVectors(hub.group.position, card.group.position, progress);
      card.packet.position.set(tmp.x, tmp.y, -0.15);
      card.packet.visible = card.appear > 0.95;
    });
  }

  function draw(dt) {
    if (state.disposed || state.contextLost) return;
    update(dt);
    renderer.render(scene, camera);
  }

  let last = performance.now();
  function loop(now) {
    if (state.disposed || state.contextLost || !state.running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
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

  function setMotionEnabled(enabled) {
    state.animate = Boolean(enabled);
    if (state.animate) resume();
    else {
      pause();
      draw(0);
    }
  }

  function onContextLost(event) {
    event.preventDefault();
    state.contextLost = true;
    pause();
    canvas.closest("[data-solutions-visual]")?.classList.remove("has-webgl");
  }

  function onContextRestored() {
    if (state.disposed) return;
    state.contextLost = false;
    canvas.closest("[data-solutions-visual]")?.classList.add("has-webgl");
    resize();
    resume();
  }

  // Static frames still need to follow hover when motion is off.
  function onStaticMove(event) {
    onCanvasMove(event);
    if (!state.running) draw(0);
  }

  const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
  resizeObserver?.observe(canvas);
  tiltHost.addEventListener("pointermove", onTiltMove);
  tiltHost.addEventListener("pointerleave", onTiltLeave);
  canvas.addEventListener("pointermove", onStaticMove);
  canvas.addEventListener("pointerleave", onCanvasLeave);
  canvas.addEventListener("click", onCanvasClick);
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);
  resize();
  resume();

  return {
    getStats: () => getRendererInfo(renderer),
    /** Restart the card build-in (call when the canvas becomes visible). */
    playIntro() {
      state.introStart = null;
      if (state.running) return;
      draw(0);
    },
    setMotionEnabled,
    pause,
    resume,
    dispose() {
      if (state.disposed) return;
      state.disposed = true;
      pause();
      resizeObserver?.disconnect();
      tiltHost.removeEventListener("pointermove", onTiltMove);
      tiltHost.removeEventListener("pointerleave", onTiltLeave);
      canvas.removeEventListener("pointermove", onStaticMove);
      canvas.removeEventListener("pointerleave", onCanvasLeave);
      canvas.removeEventListener("click", onCanvasClick);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);

      const geometries = new Set();
      const materials = new Set();
      scene.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) materials.add(object.material);
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => {
        // material.dispose() leaves its textures alone
        Object.values(material).forEach((value) => value?.isTexture && value.dispose());
        material.dispose();
      });
      timer.dispose();
      renderer.dispose();
    },
  };
}

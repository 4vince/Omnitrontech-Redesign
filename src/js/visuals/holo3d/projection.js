import { THREE, COLOR, seg, easeOut } from "./kit.js";
import { box, merge, rbox, vents } from "./shapes.js";
import { createHoloStage as createBoard } from "../holo/holo-kit.js";

/**
 * A holographic projection: a 2D service board (visuals/holo) shown as a
 * sheet of light standing over a projector, in the same 3D stage as the
 * other services.
 *
 * The projector, the sheet's glow, its corner brackets and the light rays
 * are WebGL. The board itself is drawn natively into its own canvas laid
 * over the stage, and pinned onto the projected sheet every frame with a
 * CSS perspective transform: crisp text at screen resolution, no texture
 * uploads, and it moves with the 3D camera. Scan lines and edge fade are a
 * CSS mask (.svx__board in service-stage.css).
 *
 *   scene: () => import("../holo/experience.js")
 *   const { build } = await prepare(scene);
 */

const W = 10; // the sheet's width in world units
const GAP = 0.38; // between the projector's lens and the sheet
const TILT = -0.04; // the sheet leans back slightly

const SHEET_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
// The sheet of light behind the board: faint, densest at the bottom edge
// where the beam enters, fading out at the rim.
const SHEET_FRAG = /* glsl */ `
  uniform float uLevel;
  uniform vec3 uTint;
  varying vec2 vUv;
  void main() {
    float fy = clamp(1.0 - vUv.y, 0.0, 1.0);
    float sheet = 0.02 + 0.07 * fy * fy * fy;
    float ex = smoothstep(0.0, 0.03, vUv.x) * smoothstep(0.0, 0.03, 1.0 - vUv.x);
    float ey = smoothstep(0.0, 0.03, vUv.y) * smoothstep(0.0, 0.03, 1.0 - vUv.y);
    gl_FragColor = vec4(uTint * sheet * uLevel * ex * ey, 1.0);
  }
`;

export async function prepare(loadBoard) {
  const mod = await loadBoard();
  const board = await createBoard(document.createElement("canvas"), { build: mod.build, surface: { scale: 1, textScale: 1.42 } });
  return { build: (kit) => projection(kit, board) };
}

/** CSS matrix3d taking a w×h box onto the quad tl, tr, br, bl. */
function quadMatrix(w, h, [x0, y0], [x1, y1], [x2, y2], [x3, y3]) {
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1 || 1e-9;
  const g = (dx3 * dy2 - dx2 * dy3) / den;
  const k = (dx1 * dy3 - dx3 * dy1) / den;
  const a = x1 - x0 + g * x1;
  const b = x3 - x0 + k * x3;
  const d = y1 - y0 + g * y1;
  const e = y3 - y0 + k * y3;
  const m = [a / w, d / w, 0, g / w, b / h, e / h, 0, k / h, 0, 0, 1, 0, x0, y0, 0, 1];
  return `matrix3d(${m.map((v) => +v.toFixed(8)).join(",")})`;
}

function projection(kit, board) {
  const { scene, camera, renderer, holo, segments } = kit;
  const H = (W * board.frame.h) / board.frame.w;
  const root = new THREE.Group();
  scene.add(root);
  const stageCanvas = renderer.domElement;

  /* The board's own canvas, over the stage */
  // The layer fades in with the stage canvas (.has-visual); the board inside
  // it carries the per-frame switch-on and flicker.
  const layer = document.createElement("div");
  layer.className = "svx__board-layer";
  layer.setAttribute("aria-hidden", "true");
  const el = board.canvas;
  el.className = "svx__board";
  el.style.width = `${board.frame.w}px`;
  el.style.height = `${board.frame.h}px`;
  layer.append(el);
  stageCanvas.after(layer);

  /* The sheet of light it sits on */
  const tint = new THREE.Color(COLOR.cobalt);
  const sheetMat = new THREE.ShaderMaterial({
    uniforms: { uLevel: { value: 1 }, uTint: { value: tint } },
    vertexShader: SHEET_VERT,
    fragmentShader: SHEET_FRAG,
    side: THREE.DoubleSide,
    // Light only, as the kit's own materials: add colour, leave alpha to the
    // stage's alpha pass (a written alpha would make the sheet opaque).
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
  });
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(W, H), sheetMat);
  const pivot = new THREE.Group(); // hinged at the sheet's bottom edge
  pivot.position.set(0, GAP, 0);
  pivot.rotation.x = TILT;
  sheet.position.y = H / 2;
  pivot.add(sheet);

  // Corner brackets just outside the sheet.
  const arm = 0.32;
  const m = 0.12;
  const [l, r, b, t] = [-W / 2 - m, W / 2 + m, -m, H + m];
  const corners = segments(
    [
      [[l, b + arm, 0], [l, b, 0]],
      [[l, b, 0], [l + arm, b, 0]],
      [[r - arm, b, 0], [r, b, 0]],
      [[r, b, 0], [r, b + arm, 0]],
      [[l, t - arm, 0], [l, t, 0]],
      [[l, t, 0], [l + arm, t, 0]],
      [[r - arm, t, 0], [r, t, 0]],
      [[r, t, 0], [r, t - arm, 0]],
    ],
    { color: COLOR.ice, level: 0.7 },
  );
  pivot.add(corners.object);
  root.add(pivot);

  /* The projector: a low bevelled bar with a lit lens slit */
  const PW = W * 0.62;
  const projector = holo(merge([rbox(PW, 0.16, 0.7, 0, -0.2, 0, 0.04), rbox(PW * 0.92, 0.06, 0.5, 0, -0.04, 0, 0.02), ...vents(6, 2, 0.5, -PW / 2 + 0.55, -0.14, PW / 6.6, 0.05, 0.352)]), {
    color: COLOR.cobalt,
    face: 0.12,
    level: 0.8,
    threshold: 30,
  });
  const lens = holo(box(PW * 0.86, 0.02, 0.06, 0, 0.02, 0), { color: COLOR.ice, face: 1.4, edge: 0, level: 1, occlude: false });
  const lw = (PW * 0.86) / 2;
  const rays = segments(
    [
      [[-lw, 0.03, 0], [-W / 2, GAP, 0]],
      [[lw, 0.03, 0], [W / 2, GAP, 0]],
      [[-lw * 0.5, 0.03, 0], [-W / 4, GAP, 0]],
      [[lw * 0.5, 0.03, 0], [W / 4, GAP, 0]],
    ],
    { color: COLOR.ice, level: 0.16 },
  );
  root.add(projector.group, lens.group, rays.object);

  /* Pin the board onto the sheet: project its corners, map the canvas onto them */
  const corner = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const LOCAL = [
    [-W / 2, H],
    [W / 2, H],
    [W / 2, 0],
    [-W / 2, 0],
  ];
  function pin() {
    const cw = stageCanvas.clientWidth;
    const ch = stageCanvas.clientHeight;
    if (!cw || !ch) return;
    pivot.updateMatrixWorld(true);
    camera.updateMatrixWorld();
    const ox = stageCanvas.offsetLeft;
    const oy = stageCanvas.offsetTop;
    const pts = corner.map((v, i) => {
      v.set(LOCAL[i][0], LOCAL[i][1], 0).applyMatrix4(pivot.matrixWorld).project(camera);
      return [ox + ((v.x + 1) / 2) * cw, oy + ((1 - v.y) / 2) * ch];
    });
    // Draw at about one canvas pixel per screen pixel.
    const across = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
    board.resize(Math.min(2.4, Math.max(0.6, (across * (window.devicePixelRatio || 1)) / board.frame.w)));
    el.style.transform = quadMatrix(board.frame.w, board.frame.h, ...pts);
  }

  function update(local, dt, clock) {
    const still = kit.still;
    // Each loop the projection switches on: the sheet unfolds upwards from the lens.
    const on = still ? 1 : easeOut(seg(local, 0, 0.55));
    pivot.scale.set(1, Math.max(0.002, on), 1);
    const flicker = still ? 1 : 1 + 0.02 * Math.sin(clock * 17.3) * Math.sin(clock * 5.1);
    sheetMat.uniforms.uLevel.value = (0.3 + 0.7 * on) * flicker;
    lens.set(0.8 + 0.4 * (1 - on) + (still ? 0 : 0.08 * Math.sin(clock * 3)));
    el.style.opacity = String((0.2 + 0.8 * on) * flicker);

    board.render(local, dt, clock, !still);
    pin();
  }

  return {
    // From the projector base (y -0.2) to the top corner brackets (GAP + H + 0.12), with a margin.
    frame: { w: W + 0.4, h: H + GAP + 0.46, target: [0, (H + GAP) / 2 - 0.04, 0], yaw: 0.07, elev: 0.1 },
    story: board.story,
    staticTime: board.staticTime,
    update,
    dispose() {
      layer.remove();
    },
  };
}

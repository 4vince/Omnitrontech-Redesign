import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { applyPixelRatio, getRendererInfo } from "../core/scene-quality.js";
import { createHud, hudFontsReady } from "./robot-hud.js";
import { BEATS, clamp01, pullAt, slideAt, smooth, turnAt } from "../home/robot-timing.js";

/**
 * Homepage hero — "through the AI's eyes".
 *
 * A stylised robot wears a wraparound AR visor whose face is a live display
 * (robot-hud.js). At progress 0 the camera sits right up against the visor
 * so the display fills the screen; as progress runs to 1 the camera pulls
 * back through the visor frame, past the head and shoulders, and eases into
 * a slight three-quarter view with the robot on the right of the frame.
 *
 * Rendering stays crisp: no bloom, fog or shadow maps. Shell materials are
 * lit by a generated RoomEnvironment; the display is unlit (toneMapped off)
 * so its text stays sharp.
 */

const lerp = THREE.MathUtils.lerp;
const damp = (current, target, lambda, dt) => lerp(current, target, 1 - Math.exp(-lambda * dt));

const FOV = 35;
// A wide, gently curved visor: flat enough that at the start the display
// covers the whole viewport instead of curving away at the edges.
const VISOR = { radius: 2.2, height: 0.84, arc: THREE.MathUtils.degToRad(58), front: 1.42 };
const VISOR_CENTER_Z = VISOR.front - VISOR.radius;
/* Display redraw interval (s). Every frame while it fills the screen, where
   stepping would show; cheaper once it's a small panel on the visor. */
function hudInterval(progress, layout) {
  if (layout === "stacked") return 1 / 30;
  if (progress < 0.3) return 0;
  if (progress > BEATS.reveal) return 1 / 15;
  return 1 / 30;
}

/*
 * Livery: warm amber head and arms, the complement of the site's blue (and
 * the orange already in the globe logo), so the robot stands out against
 * the blue page instead of blending into it. Amber lives only here; the
 * page itself stays blue. Deep-navy body, warm-bone joints and visor frame,
 * soft navy-accent blue for the small lit details.
 */
const COLORS = {
  shell: 0xcc7a22, // amber: head + arms
  body: 0x0f1d4d, // deep-ops-navy-raised: torso
  trim: 0xefede6, // warm-bone-2: neck, joints, visor rims and caps
  ears: 0x0a1640, // deep-ops-navy: ear modules, antenna
  light: 0x8aa3ff, // navy-accent-lift: ear rings, antenna tip, chest light
  seam: 0x24357a,
  visorBack: 0x0a1023,
};

function cylinderArc(radius, height, arc, segments = 64) {
  // Open arc centred on +Z so its outer face looks at the camera and the
  // texture's u runs left → right as seen from the front.
  return new THREE.CylinderGeometry(radius, radius, height, segments, 1, true, -arc / 2, arc);
}

function buildRobot(hudTexture) {
  const robot = new THREE.Group();
  const head = new THREE.Group();
  robot.add(head);

  // Painted shells get a light clearcoat: a crisp highlight edge reads as a
  // finished product rather than matte clay, without any bloom or glow.
  const shell = new THREE.MeshPhysicalMaterial({
    color: COLORS.shell,
    roughness: 0.38,
    metalness: 0,
    clearcoat: 0.55,
    clearcoatRoughness: 0.28,
  });
  const body = new THREE.MeshPhysicalMaterial({
    color: COLORS.body,
    roughness: 0.42,
    metalness: 0.05,
    clearcoat: 0.5,
    clearcoatRoughness: 0.3,
  });
  const graphite = new THREE.MeshStandardMaterial({ color: COLORS.trim, roughness: 0.48, metalness: 0 });
  const dark = new THREE.MeshStandardMaterial({ color: COLORS.ears, roughness: 0.45, metalness: 0.1 });
  const blue = new THREE.MeshStandardMaterial({ color: COLORS.light, roughness: 0.32, metalness: 0.05 });
  const seamMat = new THREE.MeshStandardMaterial({ color: COLORS.seam, roughness: 0.5 });

  // Head
  const skull = new THREE.Mesh(new RoundedBoxGeometry(2.4, 2.2, 2.1, 6, 0.48), shell);
  head.add(skull);

  // Visor: dark backing, live display face, graphite rims and end caps. The
  // arcs are built around their own axis, so offset the group to put the
  // front of the arc at z = VISOR.front.
  const visor = new THREE.Group();
  visor.position.z = VISOR_CENTER_Z;
  head.add(visor);
  const visorBack = new THREE.Mesh(
    cylinderArc(VISOR.radius - 0.04, VISOR.height + 0.16, VISOR.arc + 0.05),
    new THREE.MeshStandardMaterial({ color: COLORS.visorBack, roughness: 0.3, side: THREE.DoubleSide }),
  );
  visor.add(visorBack);

  const display = new THREE.Mesh(
    cylinderArc(VISOR.radius, VISOR.height, VISOR.arc),
    new THREE.MeshBasicMaterial({ map: hudTexture, toneMapped: false }),
  );
  visor.add(display);

  const rimGeometry = cylinderArc(VISOR.radius + 0.02, 0.07, VISOR.arc + 0.05);
  [1, -1].forEach((side) => {
    const rim = new THREE.Mesh(rimGeometry, graphite);
    rim.position.y = side * (VISOR.height / 2 + 0.04);
    visor.add(rim);
  });
  // Rims are open cylinders: render both faces so they read as solid bands.
  graphite.side = THREE.DoubleSide;

  const capGeometry = new RoundedBoxGeometry(0.16, VISOR.height + 0.2, 0.3, 3, 0.07);
  [1, -1].forEach((side) => {
    const angle = side * (VISOR.arc / 2 + 0.03);
    const cap = new THREE.Mesh(capGeometry, graphite);
    cap.position.set(Math.sin(angle) * VISOR.radius, 0, Math.cos(angle) * VISOR.radius);
    cap.rotation.y = angle;
    visor.add(cap);
  });

  // Ear modules with a blue ring
  const earGeometry = new THREE.CylinderGeometry(0.38, 0.38, 0.24, 40);
  const ringGeometry = new THREE.TorusGeometry(0.27, 0.035, 12, 40);
  [1, -1].forEach((side) => {
    const ear = new THREE.Mesh(earGeometry, dark);
    ear.rotation.z = Math.PI / 2;
    ear.position.set(side * 1.24, 0.05, -0.1);
    head.add(ear);
    const ring = new THREE.Mesh(ringGeometry, blue);
    ring.rotation.y = Math.PI / 2;
    ring.position.set(side * 1.37, 0.05, -0.1);
    head.add(ring);
  });

  // Antenna
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.42, 12), dark);
  antenna.position.set(0.55, 1.28, -0.2);
  head.add(antenna);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 14), blue);
  tip.position.set(0.55, 1.52, -0.2);
  head.add(tip);

  // Neck and upper torso
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.9, 32), graphite);
  neck.position.y = -1.5;
  robot.add(neck);

  const torso = new THREE.Mesh(new RoundedBoxGeometry(3.1, 2.4, 1.8, 6, 0.6), body);
  torso.position.y = -3.05;
  robot.add(torso);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.07, 12, 48), dark);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = -1.88;
  robot.add(collar);

  // Shoulder joints and upper arms, so the silhouette reads as a figure.
  const jointGeometry = new THREE.SphereGeometry(0.42, 32, 20);
  const armGeometry = new THREE.CapsuleGeometry(0.36, 1.25, 8, 24);
  [1, -1].forEach((side) => {
    const joint = new THREE.Mesh(jointGeometry, graphite);
    joint.position.set(side * 1.72, -2.22, 0);
    robot.add(joint);
    const arm = new THREE.Mesh(armGeometry, shell);
    arm.position.set(side * 1.98, -3.2, 0.05);
    arm.rotation.z = side * 0.14;
    robot.add(arm);
  });

  // Chest status light + a thin panel seam
  const emblem = new THREE.Mesh(new THREE.CircleGeometry(0.17, 32), blue);
  emblem.position.set(-0.78, -2.45, 0.905);
  robot.add(emblem);
  const seam = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.035), seamMat);
  seam.position.set(0, -2.95, 0.905);
  robot.add(seam);

  return { robot, head };
}

export async function createRobotScene(canvas, { animate = true } = {}) {
  await hudFontsReady();

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  } catch (error) {
    console.error("Could not initialise the homepage robot visual.", error);
    return null;
  }

  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  applyPixelRatio(renderer, { hero: true });

  const state = {
    animate: Boolean(animate),
    running: false,
    disposed: false,
    contextLost: false,
    progress: 0,
    aspect: 16 / 9,
    layout: "pinned", // "pinned" (desktop sequence) | "stacked" (static, robot centred)
    pointerX: 0,
    pointerY: 0,
    lookX: 0,
    lookY: 0,
    hudClock: 0,
    hudAccum: 1,
  };

  const timer = new THREE.Timer();
  timer.connect(document);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 80);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  scene.environmentIntensity = 0.9;
  room.dispose();
  pmrem.dispose();

  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(-4, 6, 8);
  scene.add(key);

  // Sharper display text on high-density screens (see createHud).
  const hud = createHud({ scale: (window.devicePixelRatio || 1) >= 1.5 ? 1.5 : 1 });
  const hudTexture = new THREE.CanvasTexture(hud.canvas);
  hudTexture.colorSpace = THREE.SRGBColorSpace;
  hudTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  hud.draw(0);
  hudTexture.needsUpdate = true;

  const { robot, head } = buildRobot(hudTexture);
  scene.add(robot);

  /* ── Camera path ─────────────────────────────────────────────────────
     Start: centred on the visor face, close enough that the display (not
     its frame) fills the viewport height. End: a three-quarter view with
     the look target pushed left so the robot sits in the right of frame. */
  const halfTan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const target = new THREE.Vector3();
  const offset = new THREE.Vector3();

  function startDistance() {
    // "Cover" fit: close enough that the display fills both the height (just
    // inside the rims) and the width of the viewport.
    const chord = 2 * VISOR.radius * Math.sin(VISOR.arc / 2);
    const byHeight = (VISOR.height * 0.86) / (2 * halfTan);
    const byWidth = (chord * 0.8) / (2 * halfTan * state.aspect);
    return Math.min(byHeight, byWidth);
  }

  function endFraming() {
    if (state.layout === "stacked") {
      return { distance: 13, shift: 0, drop: 0.28, yaw: -0.22, pitch: 0.05 };
    }
    // shift / drop: where the robot ends up, as fractions of the visible
    // half-width / half-height (shift 0.36 → robot centred at ~68% across;
    // drop 0.35 → look target below the head so the torso is in frame).
    return { distance: 11, shift: 0.36, drop: 0.35, yaw: -0.26, pitch: 0.06 };
  }

  function placeCamera() {
    const p = state.progress;
    const end = endFraming();
    const d0 = startDistance();

    // Pull-back runs from the "pull" beat to the "hold" beat. Distance grows
    // exponentially so the zoom reads as constant speed.
    const u = pullAt(p);
    const distance = d0 * Math.pow(end.distance / d0, u);
    // The robot slides right as the headline lands (robot-timing.js: the
    // headline leads, the robot follows); the three-quarter turn follows
    // once the frame has cleared the edges.
    const slide = slideAt(p);
    const turn = turnAt(p);

    // Measured against the *current* view width, so the robot drifts right
    // at the same on-screen rate however close the camera still is.
    const visibleHalfH = distance * halfTan;
    const visibleHalfW = visibleHalfH * state.aspect;
    target.set(
      -visibleHalfW * end.shift * slide,
      -visibleHalfH * end.drop * slide,
      lerp(VISOR.front, 0, smooth(0, 0.6, u)),
    );
    const yaw = lerp(0, end.yaw, turn);
    const pitch = lerp(0, end.pitch, turn);
    offset.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    camera.position.copy(target).addScaledVector(offset, distance);
    camera.lookAt(target);
  }

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height || state.disposed || state.contextLost) return;
    state.aspect = width / height;
    camera.aspect = state.aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    applyPixelRatio(renderer, { hero: true });
    draw(0);
  }

  function update(dt) {
    timer.update();
    const t = state.animate ? timer.getElapsed() : 0;

    // Display: the canvas redraw + texture upload is the cost, so the rate
    // follows how much of the screen the display covers.
    if (state.animate) {
      state.hudClock += dt;
      state.hudAccum += dt;
      if (state.hudAccum >= hudInterval(state.progress, state.layout)) {
        state.hudAccum = 0;
        hud.draw(state.hudClock);
        hudTexture.needsUpdate = true;
      }
    }

    // Head follows the pointer only once the robot is revealed.
    const follow = state.layout === "stacked" ? 1 : smooth(BEATS.reveal, BEATS.hold, state.progress);
    const step = state.animate ? dt : 1;
    state.lookX = damp(state.lookX, state.pointerX * follow, 3.5, step);
    state.lookY = damp(state.lookY, state.pointerY * follow, 3.5, step);
    head.rotation.y = state.lookX * 0.32;
    head.rotation.x = -state.lookY * 0.16;
    head.position.y = state.animate ? Math.sin(t * 1.1) * 0.03 * follow : 0;

    placeCamera();
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

  const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
  resizeObserver?.observe(canvas);
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);
  resize();
  resume();

  return {
    getStats: () => getRendererInfo(renderer),
    /** Scroll progress through the hero track, 0-1. */
    setProgress(progress) {
      state.progress = clamp01(progress);
      if (!state.running) draw(0);
    },
    /** "pinned" for the desktop sequence, "stacked" for the static layout. */
    setLayout(layout) {
      state.layout = layout;
      if (!state.running) draw(0);
    },
    /** Pointer position over the hero, each axis -1..1. */
    setPointer(nx, ny) {
      state.pointerX = clamp01((nx + 1) / 2) * 2 - 1;
      state.pointerY = clamp01((ny + 1) / 2) * 2 - 1;
    },
    setMotionEnabled(enabled) {
      state.animate = Boolean(enabled);
      if (state.animate) resume();
      else {
        pause();
        draw(0);
      }
    },
    pause,
    resume,
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
      timer.dispose();
      renderer.dispose();
    },
  };
}

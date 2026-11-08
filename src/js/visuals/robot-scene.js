import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { applyPixelRatio, getRendererInfo } from "../core/scene-quality.js";
import { createHud, hudFontsReady } from "./robot-hud.js";
import { createMatrixRain } from "./matrix-rain.js";
import { buildBot, VISOR } from "./bot-model.js";
import { BEATS, clamp01, pullAt, slideAt, smooth, turnAt } from "../home/robot-timing.js";

/**
 * Homepage hero — "through the AI's eyes".
 *
 * A floating toy robot (bot-model.js) reads a task display (robot-hud.js)
 * that hangs in front of its screen face. At progress 0 the camera sits
 * right up against the display so it fills the screen; as progress runs to
 * 1 the camera pulls back, the display fades to reveal the robot's eyes,
 * and the view eases into a slight three-quarter angle with the robot on
 * the right. Behind it, faint columns of falling glyphs (matrix-rain.js).
 *
 * Once it is revealed the robot is never quite still (head and body bob
 * out of phase, arms swing, antenna sways, eyes blink). When the visitor
 * stops scrolling it goes idle: it drifts on a slow figure-8 and spins,
 * looping until scrolling resumes, then hands straight back to its pose.
 *
 * Rendering stays crisp: no bloom, fog or shadow maps. Shell materials are
 * lit by a generated RoomEnvironment; the display is unlit (toneMapped off)
 * so its text stays sharp.
 */

const lerp = THREE.MathUtils.lerp;
const damp = (current, target, lambda, dt) => lerp(current, target, 1 - Math.exp(-lambda * dt));

const FOV = 35;
/* Display redraw interval (s). Every frame while it fills the screen, where
   stepping would show; cheaper once it's a small panel on the visor. */
function hudInterval(progress, layout) {
  if (layout === "stacked") return 1 / 30;
  if (progress < 0.3) return 0;
  if (progress > BEATS.reveal) return 1 / 15;
  return 1 / 30;
}

/* Idle loop: how long without scrolling before the robot starts to roam,
   and how fast it eases in / hands back (exit faster than entrance). */
const IDLE_AFTER_MS = 1200;
const IDLE_IN = 1.4;
const IDLE_OUT = 6;
// The intro run eases in faster: it should be underway the moment the
// visitor is out of the display, not a second and a half later.
const INTRO_IN = 4;

/*
 * The idle routine, a 13 s loop that starts on a greeting:
 *
 *   0.3 - 3.0   wave: the right claw lifts (ease-out), waves three times,
 *               lowers (ease-in-out); the eyes squint happily meanwhile
 *   3.2 - 8.2   fly around: a wide figure-8 swoop, banking into its turns,
 *               heading where it is going, leaning in, thrusters up
 *   8.6 - 10.2  backflip: hop with a full turn about its middle
 *               (ease-in-out), thrust burst on take-off
 *   10.6 - 12.6 spin: one full turn (ease-in-out)
 *   12.6 - 13   settle, then the loop greets again
 *
 * Every beat starts and ends at rest, so beats and loops join seamlessly.
 * Pure function of the routine clock; robot-scene blends it in by the idle
 * weight so scrolling interrupts it at any point.
 */
const ROUTINE_LENGTH = 13;
const TAU = Math.PI * 2;
const clampUnit = (v) => Math.min(1, Math.max(0, v));
const span = (x, a, b) => clampUnit((x - a) / (b - a));
const easeOut = (x) => 1 - (1 - x) ** 3;
const easeInOut = (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
/** Shortest equivalent angle, so blending a pose out unwinds the short way. */
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

function idleRoutine(clock) {
  const ph = clock % ROUTINE_LENGTH;
  const pose = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, wave: 0, swing: 0, squint: 0, thrust: 0 };

  // A gentle float under everything.
  pose.y += Math.sin(clock * 0.9) * 0.12;

  // Wave.
  const lift = easeOut(span(ph, 0.3, 0.85)) * (1 - easeInOut(span(ph, 2.45, 3.0)));
  pose.wave = lift;
  pose.swing = Math.sin(span(ph, 0.85, 2.45) * Math.PI * 2 * 3) * 0.34 * lift;
  pose.squint = lift;
  pose.rz += 0.05 * lift; // a small friendly head-and-body tilt

  // Fly around: positions are zero at both ends of the beat.
  const fly = span(ph, 3.2, 8.2);
  if (fly > 0 && fly < 1) {
    const a = fly * TAU;
    const env = Math.sin(fly * Math.PI); // 0 at both ends
    pose.x += Math.sin(a) * 1.3;
    pose.y += Math.sin(a * 2) * 0.42;
    pose.z += (1 - Math.cos(a)) * 0.38;
    const vx = Math.cos(a); // direction of travel across the frame
    pose.rz += -vx * 0.22 * env; // bank into the turn
    pose.ry += vx * 0.55 * env; // look where it is going
    pose.rx += 0.14 * env; // lean in
    pose.thrust += 0.55 * env;
  }

  // Backflip.
  const hop = span(ph, 8.6, 10.2);
  if (hop > 0 && hop < 1) {
    pose.y += Math.sin(hop * Math.PI) * 0.9;
    pose.rx += -TAU * easeInOut(span(ph, 8.75, 10.05));
    pose.thrust += 0.9 * Math.sin(Math.min(1, hop * 2) * Math.PI);
  }

  // Spin.
  pose.ry += TAU * easeInOut(span(ph, 10.6, 12.6));
  return pose;
}

// Turns pivot about the robot's middle (between head and body), not the
// top of its head, so the flip and spin read as physical.
const ROUTINE_PIVOT = new THREE.Vector3(0, -1.1, 0);

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
    lastScroll: performance.now(),
    idle: 0,
    revealed: false,
    intro: false,
    idleClock: 0,
    blinkAt: -10,
    nextBlink: 2.5,
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

  const bot = buildBot(hudTexture);
  const { root: robot, head } = bot;
  scene.add(robot);
  // In the scene, not on the robot: the rain stays put while it roams.
  const rain = createMatrixRain();
  scene.add(rain.mesh);

  /* ── Camera path ─────────────────────────────────────────────────────
     Start: centred on the visor face, close enough that the display (not
     its frame) fills the viewport height. End: a three-quarter view with
     the look target pushed left so the robot sits in the right of frame. */
  const halfTan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const target = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const pivotOffset = new THREE.Vector3();

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
      return { distance: 12.5, shift: 0, drop: 0.2, yaw: -0.22, pitch: 0.05 };
    }
    // shift / drop: where the robot ends up, as fractions of the visible
    // half-width / half-height (shift 0.36 → robot centred at ~68% across;
    // drop 0.35 → look target below the head so the torso is in frame).
    return { distance: 12, shift: 0.36, drop: 0.22, yaw: -0.26, pitch: 0.06 };
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
    // The display fades as the camera leaves it, revealing the eyes.
    const fade = state.layout === "stacked" ? 0 : 1 - smooth(0.24, 0.4, state.progress);
    bot.display.material.opacity = fade;
    bot.display.visible = fade > 0.005;
    rain.update(t);
    if (state.animate && bot.display.visible) {
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

    // Alive: head and body float as separate parts, slightly out of phase;
    // arms swing from the shoulder; the antenna lags behind the head.
    const live = state.animate ? follow : 0;
    head.position.y = bot.rest.headY + Math.sin(t * 1.4 + 0.7) * 0.06 * live;
    bot.body.position.y = bot.rest.bodyY + Math.sin(t * 1.4) * 0.08 * live;
    bot.arms.forEach((arm, i) => {
      const rest = arm.userData.rest;
      arm.rotation.z = rest.z + Math.sin(t * 1.7 + i * 1.3) * 0.1 * live;
      arm.rotation.x = rest.x + Math.sin(t * 1.2 + i) * 0.08 * live;
    });
    bot.antenna.rotation.z = Math.sin(t * 2.1 - 0.6) * 0.09 * live;
    bot.antenna.rotation.x = Math.sin(t * 1.6) * 0.05 * live;

    // Blink every few seconds: a quick close and open.
    let lid = 1;
    if (state.animate) {
      if (t > state.nextBlink) {
        state.blinkAt = t;
        state.nextBlink = t + 2.6 + Math.random() * 3.4;
      }
      const b = (t - state.blinkAt) / 0.16;
      if (b >= 0 && b < 1) lid = Math.max(0.08, Math.abs(1 - 2 * b));
    }

    // Idle: once revealed and the visitor has stopped scrolling, play the
    // routine (wave, fly around, backflip, spin) on a loop. Its clock only
    // runs while idle and resets once the robot is fully back, so every
    // idle spell starts with the greeting.
    //
    // Intro: the moment the camera is out of the display (it has faded by
    // ~p 0.5), the routine plays once from the greeting straight away, even
    // while the visitor keeps scrolling. Going back into the display cancels
    // it; coming out again replays it. After one full run, the routine only
    // plays on stillness, as above.
    const revealed = state.layout === "stacked" || state.progress >= 0.48;
    if (revealed && !state.revealed && state.animate) {
      state.intro = true;
      state.idleClock = 0;
    }
    if (!revealed) state.intro = false;
    state.revealed = revealed;
    if (state.intro && state.idleClock >= ROUTINE_LENGTH) state.intro = false;

    const still = performance.now() - state.lastScroll > IDLE_AFTER_MS;
    const wantIdle = state.animate && revealed && (state.intro || (still && follow > 0.98)) ? 1 : 0;
    const easeIn = state.intro ? INTRO_IN : IDLE_IN;
    state.idle = damp(state.idle, wantIdle, wantIdle ? easeIn : IDLE_OUT, step);
    if (!wantIdle && state.idle < 0.002) {
      state.idle = 0;
      state.idleClock = 0;
    }
    state.idleClock += step * state.idle;
    const k = state.idle;
    const pose = idleRoutine(state.idleClock);

    // Whole-body pose, blended in by the idle weight; angles wrapped so a
    // hand-back mid-flip or mid-spin unwinds the short way.
    robot.rotation.set(wrapAngle(pose.rx) * k, wrapAngle(pose.ry) * k, pose.rz * k);
    pivotOffset.copy(ROUTINE_PIVOT).applyEuler(robot.rotation);
    robot.position
      .set(pose.x * k, pose.y * k, pose.z * k)
      .add(ROUTINE_PIVOT)
      .sub(pivotOffset);

    // The wave: right claw up and out, a little toward the viewer.
    const waver = bot.arms[0];
    // Lifted out to the side and toward the viewer, clear of the head, so
    // the wave reads from the camera's three-quarter angle.
    waver.rotation.z += (pose.wave * 1.6 + pose.swing) * k;
    waver.rotation.x += -0.8 * pose.wave * k;

    // Eyes: blinks, plus a happy squint while waving.
    const squint = 1 - 0.45 * pose.squint * k;
    bot.eyes.forEach((eye) => (eye.scale.y = Math.min(lid, squint)));

    // Ion thrusters: the burn pushes as the body rises (leads its bob),
    // runs hotter while it roams, and bursts on take-off and in flight.
    bot.thrust.uTime.value = t;
    bot.thrust.uThrust.value = 0.85 + 0.15 * Math.cos(t * 1.4) * live + (0.3 + pose.thrust) * k;

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
      const next = clamp01(progress);
      if (Math.abs(next - state.progress) > 1e-4) state.lastScroll = performance.now();
      state.progress = next;
      if (!state.running) draw(0);
    },
    /** The page scrolled (any layout): restart the idle countdown. */
    noteScroll() {
      state.lastScroll = performance.now();
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

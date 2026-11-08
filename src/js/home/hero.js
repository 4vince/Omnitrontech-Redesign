import {
  createScrubDriver,
  gsap,
  isDesktop,
  prefersReducedMotion,
  refreshMotion,
  ScrollTrigger,
} from "../core/motion.js";
import { initHeroAmbient } from "./hero-ambient.js";
import { BEATS, titleAt } from "./robot-timing.js";

/*
 * Homepage hero — "through the AI's eyes".
 *
 * One scroll clock (createScrubDriver over .hero-track) drives two things:
 *   - the robot scene (robot-scene.js): camera pull-back out of the visor
 *   - a paused GSAP timeline for the HTML layers, scrubbed to the same
 *     progress so copy and 3D can never drift apart
 *
 * Beats (progress p, 0-1; BEATS in robot-timing.js):
 *   0    - 0.08  inside the lens: the display fills the screen, the headline
 *                 sits over it, caption + scroll cue visible
 *   0.08 - 0.55  pull-back: camera backs out through the visor frame; the
 *                 headline glides from centre to the left column
 *   0.55 - 0.9   reveal: robot settles right, subline + CTAs rise in
 *   0.9  - 1     short hold, then the pin releases into the bridge band
 *
 * The headline's glide is not part of the timeline: it reads titleAt(p)
 * from robot-timing.js, sequenced against the robot's slideAt(p) (headline
 * leads, robot follows) so the shrinking visor never crosses the text.
 *
 * Tablets and reduced motion get a static layout instead: copy on top, the
 * robot below in its final framing, no pin.
 *
 * Phones (< 640px) get no robot at all: headline, subline and both CTAs
 * fill the first screen, and Three.js is never downloaded. If the window
 * later widens past the phone breakpoint the scene loads then.
 */

const PHONE = window.matchMedia("(max-width: 639px)");

const { pull: PULL, reveal: REVEAL } = BEATS;
const START_SCALE = 0.78;
const START_Y = 0.25; // headline centre at p=0, as a fraction of stage height

export function initHero() {
  const track = document.querySelector("[data-hero-track]");
  const stage = track?.querySelector("[data-hero-stage]");
  const canvas = track?.querySelector("[data-scene-canvas]");
  const fallback = track?.querySelector("[data-hero-fallback]");
  const title = track?.querySelector("[data-hero-title]");
  const more = track?.querySelector("[data-hero-more]");
  const caption = track?.querySelector("[data-hero-caption]");
  const grid = track?.querySelector("[data-hero-grid]");
  if (!track || !stage || !canvas || !title || !more) return;

  let scene = null;
  let driver = null;
  let timeline = null;
  let fallbackHud = null;
  let visible = true;
  const center = { x: 0, y: 0 };

  const staticMode = () => !isDesktop() || prefersReducedMotion();

  /* Where the headline sits at p=0: horizontally centred, in the upper part
     of the lens. Measured against its resting (left-column) position. */
  function measureCenter() {
    const previous = title.style.transform;
    title.style.transform = "none";
    const s = stage.getBoundingClientRect();
    const r = title.getBoundingClientRect();
    title.style.transform = previous;
    center.x = s.left + s.width / 2 - (r.left + r.width / 2);
    center.y = s.top + s.height * START_Y - (r.top + r.height / 2);
  }

  function buildTimeline() {
    measureCenter();
    timeline = gsap.timeline({ paused: true, defaults: { ease: "none" } });
    timeline
      .addLabel("pull", PULL)
      .addLabel("reveal", REVEAL)
      .to(caption, { opacity: 0, y: 16, duration: 0.07 }, 0.02)
      .fromTo(grid, { opacity: 0 }, { opacity: 1, duration: 0.2 }, "reveal-=0.1")
      .fromTo(more, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.18, ease: "power2.out" }, "reveal")
      // Pad to exactly 1 so timeline progress maps 1:1 onto scroll progress.
      .set({}, {}, 1);
  }

  // Headline glide: centred on the lens (and a touch smaller, so the task
  // flow stays readable under it) → resting left column. Leads the robot's
  // slide (robot-timing.js).
  const setTitleX = gsap.quickSetter(title, "x", "px");
  const setTitleY = gsap.quickSetter(title, "y", "px");
  const setTitleScale = gsap.quickSetter(title, "scale");

  function placeTitle(p) {
    const k = titleAt(p);
    setTitleX(center.x * (1 - k));
    setTitleY(center.y * (1 - k));
    setTitleScale(START_SCALE + (1 - START_SCALE) * k);
  }

  function applyProgress(p) {
    timeline?.progress(p);
    if (timeline) placeTitle(p);
    // Keep the CTAs out of the tab order until they are actually visible.
    if (timeline) more.inert = p < REVEAL;
    scene?.setProgress(p);
  }

  function setupScroll() {
    if (driver) return;
    if (!timeline) buildTimeline();
    driver = createScrubDriver({ trigger: track, onProgress: applyProgress });
  }

  function teardownScroll() {
    driver?.kill();
    driver = null;
    timeline?.revert();
    timeline = null;
    gsap.set(title, { clearProps: "transform" });
    more.inert = false;
  }

  // Layout changes (resize, fonts) move the headline's resting position.
  ScrollTrigger.addEventListener("refresh", () => {
    if (!timeline || !driver) return;
    measureCenter();
    timeline.invalidate();
    applyProgress(driver.progress);
  });

  function applyMode() {
    if (staticMode()) {
      teardownScroll();
      scene?.setLayout("stacked");
      scene?.setProgress(1);
      scene?.setMotionEnabled(!prefersReducedMotion());
    } else {
      scene?.setLayout("pinned");
      scene?.setMotionEnabled(true);
      setupScroll();
      refreshMotion();
    }
  }

  /* No WebGL: mount the display itself as the hero visual. */
  async function mountFallback() {
    if (!fallback || fallbackHud) return;
    const { createHud, hudFontsReady } = await import("../visuals/robot-hud.js");
    await hudFontsReady();
    fallbackHud = createHud();
    fallbackHud.canvas.setAttribute("aria-hidden", "true");
    fallback.append(fallbackHud.canvas);
    fallbackHud.draw(0);
    stage.classList.add("has-fallback");
    if (prefersReducedMotion()) return;
    let clock = 0;
    gsap.ticker.add((time, delta) => {
      if (!visible) return;
      clock += delta / 1000;
      fallbackHud.draw(clock);
    });
  }

  async function setupScene() {
    try {
      const { createRobotScene } = await import("../visuals/robot-scene.js");
      scene = await createRobotScene(canvas, { animate: !prefersReducedMotion() });
    } catch (error) {
      console.error("Could not load the homepage robot visual.", error);
      scene = null;
    }
    if (!scene) {
      await mountFallback();
      return;
    }
    stage.classList.add("has-webgl");
    applyMode();
    applyProgress(driver?.progress ?? 1);
    if (!visible) scene.pause();
  }

  // Head turns toward the cursor once the robot is revealed. Mouse only:
  // on touch, pointermove fires mid-scroll and the head would twitch. The
  // pinned stage fills the viewport, so normalising against the window
  // avoids a layout read on every move.
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const onPointerMove = (event) => {
    scene?.setPointer((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1);
  };
  const onPointerLeave = () => scene?.setPointer(0, 0);
  const syncPointer = () => {
    stage.removeEventListener("pointermove", onPointerMove);
    stage.removeEventListener("pointerleave", onPointerLeave);
    if (finePointer.matches) {
      stage.addEventListener("pointermove", onPointerMove);
      stage.addEventListener("pointerleave", onPointerLeave);
    } else {
      onPointerLeave();
    }
  };
  syncPointer();
  finePointer.addEventListener?.("change", syncPointer);

  if (typeof IntersectionObserver !== "undefined") {
    new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) scene?.resume();
        else scene?.pause();
      },
      { threshold: 0.01 },
    ).observe(stage);
  }

  initHeroAmbient(stage);

  if (!staticMode()) setupScroll();

  let sceneRequested = false;
  const requestScene = () => {
    if (sceneRequested || PHONE.matches) return;
    sceneRequested = true;
    void setupScene();
  };
  requestScene();
  PHONE.addEventListener?.("change", requestScene);

  window.matchMedia("(min-width: 900px)").addEventListener?.("change", applyMode);
  window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener?.("change", applyMode);
}

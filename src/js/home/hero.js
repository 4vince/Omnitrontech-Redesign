import {
  createScrubDriver,
  gsap,
  isDesktop,
  prefersReducedMotion,
  refreshMotion,
  ScrollTrigger,
} from "../core/motion.js";
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
  const photo = track?.querySelector("[data-hero-photo]");
  const nav = document.querySelector("#site-nav");
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
      // The headline starts on the light visor display (dark ink) and ends
      // on the navy field (light ink). The display's edge sweeps under it
      // between p ~0.44 and ~0.55, where no single colour reads on both
      // sides, so it steps out for that sweep, changes ink while unseen,
      // and lands again with the subline and CTAs at the reveal: the whole
      // copy block arrives on navy together.
      .to(title, { opacity: 0, duration: 0.03, ease: "power1.in" }, 0.41)
      .fromTo(
        title,
        { "--h1-ink": "#17191f", "--h1-accent": "#2b46d6", "--h1-halo": "rgba(246, 245, 241, 0.9)" },
        { "--h1-ink": "#f3f5fb", "--h1-accent": "#8aa3ff", "--h1-halo": "rgba(5, 11, 35, 0.5)", duration: 0.01 },
        0.46,
      )
      .to(title, { opacity: 1, duration: 0.07, ease: "power2.out" }, "reveal-=0.01")
      // The photo settles from slightly close to its full frame across the
      // whole track: the room steps back with the camera.
      .fromTo(photo, { scale: 1.12 }, { scale: 1, duration: 1, ease: "none" }, 0)
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
    // Without the pinned lens opening the hero is navy from the first
    // pixel, so the nav needs light ink even before it is scrolled.
    nav?.classList.toggle("is-hero-static", staticMode());
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

  // Any scroll across the hero restarts the robot's idle countdown, in
  // every layout (the stacked layout has no scrub driver to report it).
  ScrollTrigger.create({
    trigger: track,
    start: "top bottom",
    end: "bottom top",
    onUpdate: () => scene?.noteScroll?.(),
  });

  // While the hero is under the nav, the scrolled nav bar turns navy so it
  // belongs to the dark hero instead of sitting on it as a light strip.
  if (nav) {
    // Starts before the track reaches the top, so it is already active at
    // scroll 0 (a start exactly at 0 is not "active" until you scroll).
    ScrollTrigger.create({
      trigger: track,
      start: "top bottom",
      end: () => `bottom top+=${nav.offsetHeight || 76}`,
      toggleClass: { targets: nav, className: "is-on-hero" },
    });
  }

  // Phones never load the robot scene (so applyMode never runs there):
  // set the nav's static-hero state up front, and keep it in sync.
  nav?.classList.toggle("is-hero-static", staticMode());


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

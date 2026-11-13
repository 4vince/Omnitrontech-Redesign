import {
  afterIntro,
  createScrubDriver,
  gsap,
  isDesktop,
  prefersReducedMotion,
  refreshMotion,
  ScrollTrigger,
  scrollToTarget,
} from "../core/motion.js";
import { photoAt, titleAt } from "./hero-timing.js";

/*
 * Homepage hero — "inside the AI's mind".
 *
 * Desktop with full motion: the stage pins for a 200vh track, and one
 * scroll clock (createScrubDriver over .hero-track) drives two things:
 *   - the brain scene (visuals/brain-scene.js): the camera starts inside
 *     the glass brain, among its amber network, and pulls back out through
 *     the cortex to the resting framing, brain on the right
 *   - a paused GSAP timeline for the HTML layers, scrubbed to the same
 *     progress so copy and 3D can never drift apart
 *
 * Beats (progress p, 0-1; BEATS in hero-timing.js):
 *   0    - 0.08  inside: the network surrounds the centred copy block
 *                 (headline, subline and both CTAs, so the offer and the
 *                 next step are there from the first frame), with a
 *                 "Skip intro" control; the photograph is hidden
 *   0.08 - 0.55  pull-back: the copy glides to the left column (it
 *                 leads), the camera crosses the cortex wall, the brain
 *                 resolves and slides right (it follows), the office
 *                 photograph fades up behind it
 *   0.55 - 0.9   rest: the brain settles right of the copy
 *   0.9  - 1     short hold, then the pin releases into the bridge band
 *
 * Tablets (640-899px) stack: copy first, then the figure centred, no pin.
 * Reduced motion: the resting composition as one still frame, no pin.
 * Phones never download Three.js: the photo and copy alone. No WebGL →
 * the resting layout over the photo (.is-static), no pin.
 */

const PHONE = window.matchMedia("(max-width: 639px)");

const START_SCALE = 0.94;
const START_Y = 0.5; // copy-block centre at p=0, as a fraction of stage height

export function initHero() {
  const track = document.querySelector("[data-hero-track]");
  const stage = track?.querySelector("[data-hero-stage]");
  const canvas = track?.querySelector("[data-scene-canvas]");
  const glide = track?.querySelector("[data-hero-glide]");
  const caption = track?.querySelector("[data-hero-caption]");
  const skip = track?.querySelector("[data-hero-skip]");
  const photo = track?.querySelector("[data-hero-photo]");
  const nav = document.querySelector("#site-nav");
  if (!track || !stage || !canvas || !glide) return;

  let scene = null;
  let started = false;
  let failed = false;
  let driver = null;
  let timeline = null;
  let visible = true;
  const center = { x: 0, y: 0 };

  const openingMode = () => isDesktop() && !prefersReducedMotion() && !failed;
  const layout = () => (isDesktop() ? "pinned" : "stacked");

  /* Where the copy block sits at p=0: centred on the stage. Measured
     against its resting (left-column) position. */
  function measureCenter() {
    const previous = glide.style.transform;
    glide.style.transform = "none";
    const s = stage.getBoundingClientRect();
    const r = glide.getBoundingClientRect();
    glide.style.transform = previous;
    center.x = s.left + s.width / 2 - (r.left + r.width / 2);
    center.y = s.top + s.height * START_Y - (r.top + r.height / 2);
  }

  function buildTimeline() {
    measureCenter();
    timeline = gsap.timeline({ paused: true, defaults: { ease: "none" } });
    timeline
      // autoAlpha, so "Skip intro" leaves the tab order once it has faded.
      .fromTo(caption, { y: 0, autoAlpha: 1 }, { y: 16, autoAlpha: 0, duration: 0.07 }, 0.03)
      // The shade that keeps the headline legible over the network lifts
      // once the brain has cleared the left column.
      .fromTo(stage, { "--hero-scrim": 1 }, { "--hero-scrim": 0, duration: 0.2 }, 0.44)
      // Pad to exactly 1 so timeline progress maps 1:1 onto scroll progress.
      .set({}, {}, 1);
  }

  const setTitleX = gsap.quickSetter(glide, "x", "px");
  const setTitleY = gsap.quickSetter(glide, "y", "px");
  const setTitleScale = gsap.quickSetter(glide, "scale");
  const setPhotoOpacity = photo ? gsap.quickSetter(photo, "opacity") : () => {};
  const setPhotoScale = photo ? gsap.quickSetter(photo, "scale") : () => {};

  function placeLayers(p) {
    const k = titleAt(p);
    setTitleX(center.x * (1 - k));
    setTitleY(center.y * (1 - k));
    setTitleScale(START_SCALE + (1 - START_SCALE) * k);
    // The office settles in from slightly close as the camera clears the brain.
    const ph = photoAt(p);
    setPhotoOpacity(ph);
    setPhotoScale(1.12 - 0.12 * ph);
  }

  function applyProgress(p) {
    if (timeline) {
      timeline.progress(p);
      placeLayers(p);
    }
    scene?.setProgress(p);
  }

  function setupScroll() {
    if (driver) return;
    track.classList.add("is-opening");
    if (!timeline) buildTimeline();
    driver = createScrubDriver({ trigger: track, onProgress: applyProgress });
  }

  function teardownScroll() {
    track.classList.remove("is-opening");
    driver?.kill();
    driver = null;
    timeline?.revert();
    timeline = null;
    gsap.set(glide, { clearProps: "transform" });
    if (photo) gsap.set(photo, { clearProps: "opacity,transform" });
  }

  // Layout changes (resize, fonts) move the headline's resting position.
  ScrollTrigger.addEventListener("refresh", () => {
    if (!timeline || !driver) return;
    measureCenter();
    timeline.invalidate();
    applyProgress(driver.progress);
  });

  function applyMode() {
    if (openingMode()) {
      setupScroll();
      refreshMotion();
    } else {
      teardownScroll();
      refreshMotion();
    }
    if (!scene) return;
    scene.setLayout(layout());
    scene.setProgress(driver ? driver.progress : 1);
    if (started) scene.setMotionEnabled(!prefersReducedMotion());
    if (!visible) scene.pause();
  }

  async function setupScene() {
    try {
      const { createBrainScene } = await import("../visuals/brain-scene.js");
      scene = await createBrainScene(canvas, { animate: !prefersReducedMotion() });
    } catch (error) {
      console.error("Could not load the homepage hero visual.", error);
      scene = null;
    }
    if (!scene) {
      // No WebGL: the resting layout over the photograph, no pin.
      failed = true;
      stage.classList.add("has-fallback");
      track.classList.add("is-static");
      applyMode();
      return;
    }
    scene.setLayout(layout());
    scene.setProgress(driver ? driver.progress : 1);
    // Power on once the headline has landed, so the two don't compete.
    await afterIntro("visual");
    stage.classList.add("has-webgl");
    started = true;
    applyMode();
  }

  // The hero is navy from the first pixel: the nav takes light ink at once.
  nav?.classList.add("is-hero-static");
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

  // Parallax toward the cursor (the scene fades it in at the reveal).
  // Mouse only: on touch, pointermove fires mid-scroll and the camera
  // would twitch.
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const onPointerMove = (event) => {
    scene?.setPointer((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1);
  };
  const onPointerLeave = () => scene?.setPointer(0, 0);
  const syncPointer = () => {
    stage.removeEventListener("pointermove", onPointerMove);
    stage.removeEventListener("pointerleave", onPointerLeave);
    if (finePointer.matches && !prefersReducedMotion()) {
      stage.addEventListener("pointermove", onPointerMove);
      stage.addEventListener("pointerleave", onPointerLeave);
    } else {
      onPointerLeave();
    }
  };
  syncPointer();
  finePointer.addEventListener?.("change", syncPointer);

  // Only render while the hero is on screen.
  if (typeof IntersectionObserver !== "undefined") {
    new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (!scene || !started) return;
        if (visible && !prefersReducedMotion()) scene.resume();
        else scene.pause();
      },
      { threshold: 0.01 },
    ).observe(stage);
  }

  // Skip intro: land on the resting composition at the end of the pin.
  skip?.addEventListener("click", () => {
    const end = track.getBoundingClientRect().top + window.scrollY + track.offsetHeight - window.innerHeight;
    scrollToTarget(end, { duration: 1.4 });
  });

  // The pin and the headline's start position are set up straight away,
  // so the first screen is already "inside" while the scene loads.
  if (openingMode()) setupScroll();

  let sceneRequested = false;
  const requestScene = () => {
    if (sceneRequested || PHONE.matches) return;
    sceneRequested = true;
    void setupScene();
  };
  requestScene();
  PHONE.addEventListener?.("change", requestScene);

  const onModeChange = () => {
    syncPointer();
    applyMode();
  };
  window.matchMedia("(min-width: 900px)").addEventListener?.("change", onModeChange);
  window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener?.("change", onModeChange);
}

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
import { photoAt } from "./hero-timing.js";

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
 *   0    - 0.08  inside: the network surrounds the copy block, already
 *                 in its resting left column (headline, subline and both
 *                 CTAs, so the offer and the next step never move), with a
 *                 "Skip intro" control; the photograph is hidden
 *   0.08 - 0.55  pull-back: the camera crosses the cortex wall, the brain
 *                 resolves and slides right, the office photograph fades
 *                 up behind it. A solid shade column holds behind the
 *                 copy until the brain has cleared it
 *   0.55 - 0.9   rest: the brain settles right of the copy
 *   0.9  - 1     short hold, then the pin releases into the bridge band
 *
 * Tablets (640-899px) stack: copy first, then the figure centred, no pin.
 * Reduced motion: the resting composition as one still frame, no pin.
 * Phones never download Three.js: the photo and copy alone. No WebGL →
 * the resting layout over the photo (.is-static), no pin.
 */

const PHONE = window.matchMedia("(max-width: 639px)");
const ROUTE_MIN = window.matchMedia("(min-width: 1200px)");
const ROUTE_GAP = 56; // inputs → chip, px
const ROUTE_DROP = 46; // chip → decision, px

export function initHero() {
  const track = document.querySelector("[data-hero-track]");
  const stage = track?.querySelector("[data-hero-stage]");
  const canvas = track?.querySelector("[data-scene-canvas]");
  const glide = track?.querySelector("[data-hero-glide]");
  const caption = track?.querySelector("[data-hero-caption]");
  const skip = track?.querySelector("[data-hero-skip]");
  const photo = track?.querySelector("[data-hero-photo]");
  const nav = document.querySelector("#site-nav");
  const route = track?.querySelector("[data-hero-route]");
  const routePaths = route?.querySelector("[data-hero-route-paths]");
  if (!track || !stage || !canvas || !glide) return;

  let scene = null;
  let started = false;
  let failed = false;
  let driver = null;
  let timeline = null;
  let visible = true;

  const openingMode = () => isDesktop() && !prefersReducedMotion() && !failed;
  const layout = () => (isDesktop() ? "pinned" : "stacked");

  function buildTimeline() {
    timeline = gsap.timeline({ paused: true, defaults: { ease: "none" } });
    timeline
      // autoAlpha, so "Skip intro" leaves the tab order once it has faded.
      .fromTo(caption, { y: 0, autoAlpha: 1 }, { y: 16, autoAlpha: 0, duration: 0.07 }, 0.03)
      // The shade column that keeps the copy legible over the network and
      // the passing brain lifts only once the brain has settled right
      // (slideAt is ~1 by p 0.7); the photo's own fall-off takes over.
      .fromTo(stage, { "--hero-scrim": 1 }, { "--hero-scrim": 0, duration: 0.16 }, 0.62)
      // The route lands once the brain has settled: inputs, links, decision.
      .fromTo(route ? route.querySelectorAll(".hero-route__inputs, .hero-route__out") : [], { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.08, stagger: 0.04 }, 0.74)
      .fromTo(route ? route.querySelector(".hero-route__links") : [], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.08 }, 0.78)
      // Pad to exactly 1 so timeline progress maps 1:1 onto scroll progress.
      .set({}, {}, 1);
  }

  const setPhotoOpacity = photo ? gsap.quickSetter(photo, "opacity") : () => {};
  const setPhotoScale = photo ? gsap.quickSetter(photo, "scale") : () => {};

  function placeLayers(p) {
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
    queueRoute();
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
    placeRoute();
  }

  /* ── The route ─────────────────────────────────────────────────────
     Three inputs → the processor → "You approve", pinned to the chip's
     resting position on screen (scene.restingAnchors), so the figure
     itself shows the promise: work routed to the person who decides.
     Wide desktops only, and only while it clears the copy column. */
  function placeRoute() {
    if (!route) return;
    const show = Boolean(scene && started && ROUTE_MIN.matches);
    if (!show) {
      stage.classList.remove("has-route");
      return;
    }
    const anchors = scene.restingAnchors();
    const sr = stage.getBoundingClientRect();
    const cr = canvas.getBoundingClientRect();
    const at = (pt) => ({ x: cr.left - sr.left + pt.x * cr.width, y: cr.top - sr.top + pt.y * cr.height });
    const left = at(anchors.left);
    const front = at(anchors.front);

    const inputs = route.querySelector(".hero-route__inputs");
    const out = route.querySelector(".hero-route__out");
    const inX = left.x - ROUTE_GAP - inputs.offsetWidth;
    const inY = left.y - inputs.offsetHeight / 2;
    Object.assign(inputs.style, { left: `${Math.round(inX)}px`, top: `${Math.round(inY)}px` });
    const outX = front.x - out.offsetWidth / 2;
    const outY = front.y + ROUTE_DROP;
    Object.assign(out.style, { left: `${Math.round(outX)}px`, top: `${Math.round(outY)}px` });

    // Hide rather than crowd: the inputs must clear every line of copy.
    const box = { l: sr.left + inX - 48, t: sr.top + inY - 12, r: sr.left + inX + inputs.offsetWidth, b: sr.top + inY + inputs.offsetHeight + 12 };
    const hits = [...glide.querySelectorAll("h1, p, .actions > *")].some((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const r = el.matches("a") ? el.getBoundingClientRect() : range.getBoundingClientRect();
      return r.right > box.l && r.left < box.r && r.bottom > box.t && r.top < box.b;
    });
    const fits = !hits && outY + out.offsetHeight < sr.height - 72;
    stage.classList.toggle("has-route", fits);
    if (!fits) return;

    // Links: each input's right edge curves into the chip's left rim;
    // one line drops from the front rim into the decision.
    const paths = [...inputs.children].map((node, i) => {
      const sx = inX + node.offsetLeft + node.offsetWidth;
      const sy = inY + node.offsetTop + node.offsetHeight / 2;
      const ex = left.x - 6;
      const ey = left.y + (i - 1) * 7;
      const mid = (sx + ex) / 2;
      return `<path class="hero-route__link" d="M${sx.toFixed(1)} ${sy.toFixed(1)} C${mid.toFixed(1)} ${sy.toFixed(1)}, ${mid.toFixed(1)} ${ey.toFixed(1)}, ${ex.toFixed(1)} ${ey.toFixed(1)}"/>`;
    });
    paths.push(`<path class="hero-route__link hero-route__link--out" d="M${front.x.toFixed(1)} ${(front.y + 8).toFixed(1)} V${outY.toFixed(1)}"/>`);
    routePaths.innerHTML = paths.join("");
    route.querySelector("svg").setAttribute("viewBox", `0 0 ${sr.width.toFixed(0)} ${sr.height.toFixed(0)}`);
  }

  // Re-pin after the scene has taken the new size (its own observer runs
  // first, then two frames later the anchors are current).
  let routeFrame = 0;
  const queueRoute = () => {
    cancelAnimationFrame(routeFrame);
    routeFrame = requestAnimationFrame(() => {
      routeFrame = requestAnimationFrame(placeRoute);
    });
  };
  if (route && typeof ResizeObserver !== "undefined") new ResizeObserver(queueRoute).observe(stage);
  ROUTE_MIN.addEventListener?.("change", queueRoute);

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

  // The pin is set up straight away, so the first screen is already
  // "inside" while the scene loads.
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

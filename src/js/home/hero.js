import { afterIntro, gsap, isDesktop, prefersReducedMotion, ScrollTrigger } from "../core/motion.js";

/*
 * Homepage hero — a holographic brain running on a processor.
 *
 * One full screen over the Singapore office photograph: the headline
 * column on the left, the 3D figure (visuals/brain-scene.js) on a
 * transparent canvas with glyph rain behind it, brain on the right. The
 * figure powers on once the copy has landed, then runs its thought cycle.
 *
 * Scroll: as the hero leaves, the camera lifts a little, the photo pushes
 * in slowly and the copy drifts up and dims, so the hand-off into the
 * bridge band is a parallax, not a cut.
 *
 * Tablets (640-899px) stack: copy first, then the figure centred. Phones
 * never download Three.js: the photo and copy alone. Reduced motion gets
 * one composed still frame. No WebGL → the photo alone.
 */

const PHONE = window.matchMedia("(max-width: 639px)");

export function initHero() {
  const track = document.querySelector("[data-hero-track]");
  const stage = track?.querySelector("[data-hero-stage]");
  const canvas = track?.querySelector("[data-scene-canvas]");
  const copy = track?.querySelector("[data-hero-copy]");
  const photo = track?.querySelector("[data-hero-photo]");
  const nav = document.querySelector("#site-nav");
  if (!track || !stage || !canvas) return;

  let scene = null;
  let visible = true;
  let started = false;

  const layout = () => (isDesktop() ? "wide" : "stacked");

  // The hero is navy from the first pixel: the nav takes light ink at once.
  nav?.classList.add("is-hero-static");
  if (nav) {
    ScrollTrigger.create({
      trigger: track,
      start: "top bottom",
      end: () => `bottom top+=${nav.offsetHeight || 76}`,
      toggleClass: { targets: nav, className: "is-on-hero" },
    });
  }

  // Scroll-out parallax (desktop, full motion only).
  const mm = gsap.matchMedia();
  mm.add("(min-width: 900px) and (prefers-reduced-motion: no-preference)", () => {
    const trigger = ScrollTrigger.create({
      trigger: track,
      start: "top top",
      end: "bottom top",
      onUpdate: (self) => scene?.setScroll(self.progress),
    });
    const drift = copy
      ? gsap.to(copy, {
          yPercent: -18,
          opacity: 0.25,
          ease: "none",
          scrollTrigger: { trigger: track, start: "top top", end: "bottom top", scrub: true },
        })
      : null;
    const push = photo
      ? gsap.fromTo(
          photo,
          { scale: 1 },
          { scale: 1.06, ease: "none", scrollTrigger: { trigger: track, start: "top top", end: "bottom top", scrub: true } },
        )
      : null;
    return () => {
      trigger.kill();
      push?.scrollTrigger?.kill();
      push?.kill();
      if (photo) gsap.set(photo, { clearProps: "transform" });
      drift?.scrollTrigger?.kill();
      drift?.kill();
      if (copy) gsap.set(copy, { clearProps: "transform,opacity" });
      scene?.setScroll(0);
    };
  });

  function applyMode() {
    if (!scene) return;
    scene.setLayout(layout());
    scene.setMotionEnabled(!prefersReducedMotion());
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
      stage.classList.add("has-fallback");
      return;
    }
    scene.setLayout(layout());
    // Power on once the headline has landed, so the two don't compete.
    // Until then the stage shows its own navy; the first frame is dark.
    await afterIntro("visual");
    stage.classList.add("has-webgl");
    started = true;
    applyMode();
  }

  // Parallax toward the cursor. Mouse only: on touch, pointermove fires
  // mid-scroll and the camera would twitch.
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
    if (started) applyMode();
    else scene?.setLayout(layout());
  };
  window.matchMedia("(min-width: 900px)").addEventListener?.("change", onModeChange);
  window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener?.("change", onModeChange);
}

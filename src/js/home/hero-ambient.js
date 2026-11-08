import { gsap } from "../core/motion.js";

/**
 * A cursor-reactive glow + micro-tilt confined to the hero stage. Replaces
 * the old page-wide particle canvas, which painted above ordinary content in
 * the stacking order and read as noise over cards and copy. Scoping the
 * effect to the hero keeps it as atmosphere behind the headline, never on
 * top of anything a visitor needs to read.
 */
export function initHeroAmbient(stage, { sceneLayer } = {}) {
  if (!stage) return;

  const pointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  const glow = document.createElement("div");
  glow.className = "hero-glow";
  glow.setAttribute("aria-hidden", "true");
  stage.prepend(glow);

  const setGlowX = gsap.quickTo(glow, "x", { duration: 0.9, ease: "power3.out" });
  const setGlowY = gsap.quickTo(glow, "y", { duration: 0.9, ease: "power3.out" });
  const setTiltX = sceneLayer
    ? gsap.quickTo(sceneLayer, "rotationX", { duration: 0.7, ease: "power3.out" })
    : null;
  const setTiltY = sceneLayer
    ? gsap.quickTo(sceneLayer, "rotationY", { duration: 0.7, ease: "power3.out" })
    : null;

  let enabled = false;

  function onPointerMove(event) {
    const rect = stage.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const nx = rect.width ? x / rect.width : 0.5;
    const ny = rect.height ? y / rect.height : 0.5;

    setGlowX(x - glow.offsetWidth / 2);
    setGlowY(y - glow.offsetHeight / 2);
    setTiltX?.((0.5 - ny) * 6);
    setTiltY?.((nx - 0.5) * 8);
    gsap.to(glow, { opacity: 1, duration: 0.5, overwrite: "auto" });
  }

  function onPointerLeave() {
    gsap.to(glow, { opacity: 0, duration: 0.6, overwrite: "auto" });
    setTiltX?.(0);
    setTiltY?.(0);
  }

  function syncListeners() {
    const next = pointerQuery.matches && !motionQuery.matches;
    if (next === enabled) return;
    enabled = next;

    if (enabled) {
      stage.addEventListener("pointermove", onPointerMove);
      stage.addEventListener("pointerleave", onPointerLeave);
    } else {
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerleave", onPointerLeave);
      onPointerLeave();
    }
  }

  syncListeners();
  pointerQuery.addEventListener("change", syncListeners);
  motionQuery.addEventListener("change", syncListeners);
}

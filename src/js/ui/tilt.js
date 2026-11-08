import { gsap, MOTION_OK } from "../core/motion.js";

/**
 * 3D hover tilt for visual cards ([data-tilt]).
 *
 * The card turns up to ±5° toward the cursor in perspective; its extra
 * shadow layer (backdrop.css, [data-tilt].is-tilting) shifts the opposite
 * way via --tilt-x / --tilt-y, so the light reads as fixed while the card
 * moves. Mouse/trackpad only and never under reduced motion. All transforms
 * go through GSAP, so this composes with the scroll float (y) and entrance
 * (x) tweens already on some of these cards.
 */

const MAX_DEG = 5;

export function initTilt() {
  const cards = [...document.querySelectorAll("[data-tilt]")];
  if (!cards.length) return;

  const mm = gsap.matchMedia();
  mm.add(`${MOTION_OK} and (hover: hover) and (pointer: fine)`, () => {
    const cleanups = cards.map((card) => {
      const rotX = gsap.quickTo(card, "rotationX", { duration: 0.5, ease: "power3.out" });
      const rotY = gsap.quickTo(card, "rotationY", { duration: 0.5, ease: "power3.out" });
      gsap.set(card, { transformPerspective: 1000 });

      // Shadow offset follows the tilt; set on the card itself (not a parent)
      // so only this element restyles.
      const light = { x: 0, y: 0 };
      const paintLight = () => {
        card.style.setProperty("--tilt-x", light.x.toFixed(3));
        card.style.setProperty("--tilt-y", light.y.toFixed(3));
      };
      const toLight = gsap.quickTo(light, "x", { duration: 0.5, ease: "power3.out", onUpdate: paintLight });
      const toLightY = gsap.quickTo(light, "y", { duration: 0.5, ease: "power3.out", onUpdate: paintLight });

      let rect = null;
      const onEnter = () => {
        rect = card.getBoundingClientRect();
        card.classList.add("is-tilting");
      };
      const onMove = (event) => {
        if (!rect) rect = card.getBoundingClientRect();
        const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1; // -1..1
        const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
        rotY(nx * MAX_DEG);
        rotX(-ny * MAX_DEG);
        toLight(nx);
        toLightY(ny);
      };
      const onLeave = () => {
        rect = null;
        rotX(0);
        rotY(0);
        toLight(0);
        toLightY(0);
        card.classList.remove("is-tilting");
      };

      card.addEventListener("pointerenter", onEnter);
      card.addEventListener("pointermove", onMove);
      card.addEventListener("pointerleave", onLeave);
      return () => {
        card.removeEventListener("pointerenter", onEnter);
        card.removeEventListener("pointermove", onMove);
        card.removeEventListener("pointerleave", onLeave);
        card.classList.remove("is-tilting");
        card.style.removeProperty("--tilt-x");
        card.style.removeProperty("--tilt-y");
      };
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  });
}

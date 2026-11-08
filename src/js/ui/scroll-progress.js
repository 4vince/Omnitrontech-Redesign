import { gsap, ScrollTrigger } from "../core/motion.js";

/**
 * Page progress rail. Driven by a page-wide ScrollTrigger so it shares the
 * Lenis/GSAP clock with every other scroll effect (no extra scroll listener,
 * no per-frame layout reads).
 */
export function initScrollProgress() {
  const progress = document.createElement("div");
  progress.className = "scroll-progress";
  progress.setAttribute("aria-hidden", "true");
  progress.innerHTML = `
    <span class="scroll-progress__fill" data-progress-fill></span>
    <span class="scroll-progress__marker" data-progress-marker></span>
  `;
  document.body.append(progress);

  const fill = progress.querySelector("[data-progress-fill]");
  const marker = progress.querySelector("[data-progress-marker]");
  let height = progress.offsetHeight || 240;

  const setFill = gsap.quickSetter(fill, "scaleY");
  const setMarker = gsap.quickSetter(marker, "y", "px");
  const setOpacity = gsap.quickSetter(progress, "opacity");

  const paint = (ratio) => {
    setFill(ratio);
    setMarker(ratio * height);
    setOpacity(ratio > 0.002 ? 1 : 0);
  };

  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => paint(self.progress),
    onRefresh: (self) => {
      height = progress.offsetHeight || 240;
      paint(self.progress);
    },
  });

  paint(0);
}

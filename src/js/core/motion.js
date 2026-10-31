import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isDesktop() {
  return window.matchMedia("(min-width: 900px)").matches;
}

/**
 * Lenis + GSAP share a single clock. Native scrolling remains the source of
 * truth, so browser back/forward and accessibility tools keep working.
 */
export function initSmoothScroll() {
  if (prefersReducedMotion()) return null;

  const lenis = new Lenis({
    lerp: 0.085,
    wheelMultiplier: 0.92,
    touchMultiplier: 1.15,
    smoothWheel: true,
    syncTouch: false,
    autoRaf: false,
    anchors: true,
  });

  lenis.on("scroll", ScrollTrigger.update);

  const tick = (time) => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  window.addEventListener("pagehide", () => {
    gsap.ticker.remove(tick);
    lenis.destroy();
  });

  return lenis;
}

export function initReveal() {
  if (prefersReducedMotion()) return;

  const blocks = gsap.utils.toArray("[data-reveal]");
  const lines = gsap.utils.toArray("[data-reveal-line]");
  const scales = gsap.utils.toArray("[data-reveal-scale]");

  if (!blocks.length && !lines.length && !scales.length) return;

  if (blocks.length) {
    gsap.set(blocks, { opacity: 0, y: 26 });
    ScrollTrigger.batch(blocks, {
      start: "top 88%",
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: 0.95,
          stagger: 0.075,
          ease: "power3.out",
          overwrite: true,
        }),
    });
  }

  if (lines.length) {
    gsap.set(lines, { scaleX: 0, transformOrigin: "left center" });
    ScrollTrigger.batch(lines, {
      start: "top 92%",
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          scaleX: 1,
          duration: 1.15,
          stagger: 0.06,
          ease: "power2.out",
          overwrite: true,
        }),
    });
  }

  if (scales.length) {
    gsap.set(scales, { opacity: 0, scale: 0.965 });
    ScrollTrigger.batch(scales, {
      start: "top 90%",
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          opacity: 1,
          scale: 1,
          duration: 1.05,
          stagger: 0.08,
          ease: "power3.out",
          overwrite: true,
        }),
    });
  }

  ScrollTrigger.refresh();
}

/**
 * Slow, decorative parallax. Only applied to elements without an authored
 * transform so it never fights the layout.
 */
export function initParallax() {
  if (prefersReducedMotion()) return;

  const items = gsap.utils.toArray("[data-parallax]");
  items.forEach((item) => {
    const distance = Number.parseFloat(item.dataset.parallax) || 0;
    if (!distance) return;
    const trigger = item.closest("section") || item.parentElement;
    if (!trigger) return;

    gsap.fromTo(
      item,
      { y: 0 },
      {
        y: distance,
        ease: "none",
        scrollTrigger: {
          trigger,
          start: "top bottom",
          end: "bottom top",
          scrub: 1.2,
          invalidateOnRefresh: true,
        },
      },
    );
  });
}

export function refreshMotion() {
  ScrollTrigger.refresh();
}

export { gsap, ScrollTrigger };

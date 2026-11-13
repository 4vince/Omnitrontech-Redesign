import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

/*
 * One motion vocabulary for the whole site. Every page entrance, section
 * reveal and scroll-linked visual uses these eases and durations, so things
 * land with the same rhythm wherever they are.
 */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";
export const REDUCED = "(prefers-reduced-motion: reduce)";
export const EASE_OUT = "power3.out";
export const EASE_IN_OUT = "power2.inOut";

gsap.defaults({ ease: EASE_OUT, duration: 0.8 });

/** Scrub lag for scroll-driven scenes. Lenis already smooths the wheel, so
    this only needs to absorb the last few frames of jitter. */
export const SCENE_SCRUB = 0.45;

let lenis = null;
let introTimeline = null;

export function prefersReducedMotion() {
  return window.matchMedia(REDUCED).matches;
}

export function isDesktop() {
  return window.matchMedia("(min-width: 900px)").matches;
}

function navOffset() {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--nav-h");
  return -((Number.parseFloat(value) || 76) + 16);
}

const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

/**
 * Lenis + GSAP share a single clock (gsap.ticker). Native scrolling remains
 * the source of truth, so back/forward and assistive tech keep working.
 */
export function initSmoothScroll() {
  if (prefersReducedMotion()) return null;

  lenis = new Lenis({
    lerp: 0.1,
    wheelMultiplier: 0.95,
    touchMultiplier: 1.15,
    smoothWheel: true,
    syncTouch: false,
    autoRaf: false,
    // In-page links settle below the fixed nav, with the same ease as
    // every other programmatic scroll on the site.
    anchors: { offset: navOffset(), duration: 1.2, easing: easeOutQuart },
  });

  lenis.on("scroll", ScrollTrigger.update);

  const tick = (time) => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  window.addEventListener("pagehide", () => {
    gsap.ticker.remove(tick);
    lenis?.destroy();
  });

  return lenis;
}

/** Smoothly scroll to an element or selector, clearing the fixed nav. */
export function scrollToTarget(target, { offset = navOffset(), duration = 1.2 } = {}) {
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el) return;
  if (lenis) {
    lenis.scrollTo(el, { offset, duration, easing: easeOutQuart });
    return;
  }
  const top = el.getBoundingClientRect().top + window.scrollY + offset;
  window.scrollTo({ top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
}

/**
 * Scroll-linked driver for the pinned WebGL scenes.
 *
 * GSAP scrubs a proxy from 0 to 1 across the trigger and calls `onProgress`
 * only while the playhead is moving, so the scenes sit idle (no per-frame
 * work) whenever the page is still.
 */
export function createScrubDriver({
  trigger,
  start = "top top",
  end = "bottom bottom",
  scrub = SCENE_SCRUB,
  onProgress,
}) {
  const proxy = { p: 0 };
  const tween = gsap.to(proxy, {
    p: 1,
    ease: "none",
    duration: 1,
    scrollTrigger: { trigger, start, end, scrub, invalidateOnRefresh: true },
    onUpdate: () => onProgress(proxy.p),
  });
  // Land on the current scroll position straight away (deep links, reloads).
  proxy.p = tween.scrollTrigger?.progress ?? 0;
  tween.progress(proxy.p);
  onProgress(proxy.p);

  return {
    get scrollTrigger() {
      return tween.scrollTrigger;
    },
    get progress() {
      return proxy.p;
    },
    kill() {
      tween.scrollTrigger?.kill();
      tween.kill();
    },
  };
}

/**
 * Page entrance: elements marked [data-intro] (hidden by CSS until JS runs)
 * rise in, in DOM order. Pages can wait on a label to start a heavy visual
 * only once the copy has landed — see afterIntro().
 */
export function initPageIntro() {
  const items = gsap.utils.toArray("[data-intro]");
  if (!items.length) return null;

  if (prefersReducedMotion()) {
    gsap.set(items, { opacity: 1, y: 0 });
    return null;
  }

  introTimeline = gsap.timeline({ delay: 0.12, defaults: { duration: 0.9, ease: EASE_OUT } });
  introTimeline
    .addLabel("copy", 0)
    .fromTo(
      items,
      { opacity: 0, y: 28 },
      { opacity: 1, y: 0, stagger: 0.09 },
      "copy",
    )
    // Visuals start while the last lines are still settling.
    .addLabel("visual", Math.min(0.55, 0.2 + items.length * 0.07));
  return introTimeline;
}

/** Resolves once the page intro reaches `label` (immediately if none). */
export function afterIntro(label = "visual") {
  const tl = introTimeline;
  if (!tl || !tl.isActive() && tl.progress() === 1) return Promise.resolve();
  const at = tl.labels[label] ?? tl.duration();
  if (tl.time() >= at) return Promise.resolve();
  return new Promise((resolve) => tl.call(resolve, null, at));
}

/**
 * Section reveals. Blocks rise in batches as they enter, so a row of cards
 * staggers together instead of popping one by one. Built inside a
 * matchMedia context: switching to reduced motion reverts everything.
 */
export function initReveal() {
  const mm = gsap.matchMedia();
  mm.add(MOTION_OK, () => {
    const blocks = gsap.utils.toArray("[data-reveal]");
    const lines = gsap.utils.toArray("[data-reveal-line]");
    const scales = gsap.utils.toArray("[data-reveal-scale]");

    if (blocks.length) {
      blocks.forEach((block) => {
        const fromLeft = block.dataset.reveal === "left";
        gsap.set(block, { opacity: 0, x: fromLeft ? -28 : 0, y: fromLeft ? 0 : 28 });
      });
      ScrollTrigger.batch(blocks, {
        start: "top 86%",
        once: true,
        interval: 0.08,
        onEnter: (batch) =>
          gsap.to(batch, {
            opacity: 1,
            x: 0,
            y: 0,
            duration: 0.9,
            stagger: 0.08,
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
          gsap.to(batch, { scaleX: 1, duration: 1.1, ease: EASE_IN_OUT, stagger: 0.06, overwrite: true }),
      });
    }

    if (scales.length) {
      gsap.set(scales, { opacity: 0, scale: 0.965 });
      ScrollTrigger.batch(scales, {
        start: "top 88%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, { opacity: 1, scale: 1, duration: 1, stagger: 0.08, overwrite: true }),
      });
    }
  });
}

/**
 * Depth parallax, three layers per section (the backdrop from
 * core/backdrop.js):
 *   grid   slowest  (yPercent 6 → -6 of its own height)
 *   pools  faster   (y 120 → -120px)
 *   cards  [data-float] visual components drift ahead of the text
 *          (y 40 → -40px)
 * Plus the older per-element [data-parallax="px"] hook.
 * The hero and the pinned handoff band keep static backdrops.
 * Reduced motion: none of this runs; the layers simply sit still.
 */
export function initParallax() {
  const mm = gsap.matchMedia();
  mm.add(MOTION_OK, () => {
    gsap.utils.toArray(".backdrop").forEach((backdrop) => {
      const section = backdrop.parentElement;
      if (!section || section.matches(".hero-stage, .handoff-stage")) return;
      const scrollTrigger = { trigger: section, start: "top bottom", end: "bottom top", scrub: true };
      const grid = backdrop.querySelector(".backdrop__grid");
      const pools = backdrop.querySelector(".backdrop__pools");
      if (grid) {
        gsap.fromTo(grid, { yPercent: 6 }, { yPercent: -6, ease: "none", scrollTrigger });
      }
      if (pools) {
        gsap.fromTo(pools, { y: 120 }, { y: -120, ease: "none", scrollTrigger: { ...scrollTrigger } });
      }
    });

    gsap.utils.toArray("[data-float]").forEach((card) => {
      const trigger = card.closest("section") || card.parentElement;
      gsap.fromTo(
        card,
        { y: 40 },
        {
          y: -40,
          ease: "none",
          scrollTrigger: { trigger, start: "top bottom", end: "bottom top", scrub: true },
        },
      );
    });

    gsap.utils.toArray("[data-parallax]").forEach((item) => {
      const distance = Number.parseFloat(item.dataset.parallax) || 0;
      const trigger = item.closest("section") || item.parentElement;
      if (!distance || !trigger) return;
      gsap.fromTo(
        item,
        { y: 0 },
        {
          y: distance,
          ease: "none",
          scrollTrigger: { trigger, start: "top bottom", end: "bottom top", scrub: true },
        },
      );
    });
  });
}

/**
 * Hand-off zoom ([data-zoom]): the element settles from 0.92 to full size as
 * it crosses into view, so it reads as a continuation of the section before.
 */
export function initZoomReveal() {
  const mm = gsap.matchMedia();
  mm.add(MOTION_OK, () => {
    gsap.utils.toArray("[data-zoom]").forEach((item) => {
      gsap.fromTo(
        item,
        // Starts at 0.75, not lower: the bridge sits on navy and its text
        // must stay readable while it settles.
        { scale: 0.92, opacity: 0.75 },
        {
          scale: 1,
          opacity: 1,
          ease: "none",
          scrollTrigger: { trigger: item, start: "top bottom", end: "top 50%", scrub: true },
        },
      );
    });
  });
}

/** Debounced refresh for layout changes that ScrollTrigger cannot see
    (injected content, late fonts). Viewport resizes are handled by GSAP. */
let refreshCall = null;
export function refreshMotion() {
  refreshCall?.kill();
  refreshCall = gsap.delayedCall(0.15, () => ScrollTrigger.refresh());
}

export { gsap, ScrollTrigger };

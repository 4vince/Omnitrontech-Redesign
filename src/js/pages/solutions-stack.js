import { getLenis, ScrollTrigger, scrollToTarget } from "../core/motion.js";

/*
 * AI Solutions: the five service lines file into a stack, like folders.
 *
 * Each service section is a card with a staggered folder tab. Once a card
 * has been read to its bottom edge it sticks, and the next card rises over
 * it; the covered card tips back into the stack (scale, a few degrees of
 * tilt, a navy shade). The closing CTA band is the last card on the pile.
 *
 * Purpose: spatial consistency. The visitor walks a set of five, and the
 * pile shows where they are in it.
 *
 * Mechanics
 *   - Pure CSS sticky does the stacking (no pin spacers). A card's sticky
 *     top is min(0, viewport - card height), so a tall card sticks only
 *     after its bottom edge has scrolled into view; nothing is skipped.
 *   - The recede is scrubbed from live rects of the *covering* card,
 *     read once per frame (all reads, then all writes).
 *   - ScrollTrigger cannot measure a stuck element, so sticky is switched
 *     off around every refresh (refreshInit -> refresh); natural positions
 *     are recorded there too and used for in-page links.
 *   - A fully covered card pauses its WebGL scene ("svx:covered" event) and
 *     becomes inert, so focus can't land on something hidden.
 *
 * Landing: every card comes to rest in the same place, its top edge just
 * under the nav, and a flick never carries past it.
 *   - Detent: a wheel input that would cross the next stop (in the
 *     direction of travel) is cut short and eased onto it; the rest of that
 *     gesture's inertia is swallowed, so one flick moves one card.
 *     Going down the stops are the landings; going up they are the points
 *     where each card has been read to its bottom edge (and the page top).
 *   - Settle: stopping halfway through a hand-over (keyboard, scrollbar,
 *     a slow drag) eases to whichever side the visitor was heading.
 *   Reading inside a card that is taller than the screen stays free.
 *
 * Desktop (>=761px) with full motion only. Phones and reduced motion keep
 * the plain flow.
 */

const STACK = "(min-width: 761px) and (prefers-reduced-motion: no-preference)";

// The recede, at full cover. Small numbers: it should read as "filed",
// not as a page transition.
const SCALE = 0.07;
const TILT = 6; // degrees, top edge away from the viewer
const LIFT = 0.025; // fraction of viewport height
const SHADE = 0.55;
const PERSPECTIVE = 1600;
// Cast shadow on the card below: its opacity while the card is still far
// off, and how much taller (softer) it starts than when it has landed.
const CAST_FAR = 0.3;
const CAST_SPREAD = 1.9;

// Landing motion: a deliberate on-screen move, so a strong ease-out
// (the site's easeOutQuart), scaled a little with distance.
const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
const landDuration = (distance) => Math.min(0.85, 0.38 + distance / 2400);
// Past this share of a hand-over, a resting scroll completes it.
const COMMIT = 0.22;
// A new wheel gesture: a pause this long, or a clearly bigger delta.
const GESTURE_GAP = 160;

const navHeight = () =>
  Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 76;

const smoothstep = (t) => t * t * (3 - 2 * t);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

export function initServiceStack({ mount, sections, closer }) {
  if (!mount || sections.length < 2) return { update: () => {} };

  const media = window.matchMedia(STACK);
  const cards = closer ? [...sections, closer] : [...sections];
  const naturalTop = new Map();
  let downStops = []; // landings: card top just under the nav
  let upStops = []; // card read to its bottom edge, plus the page top
  let zones = []; // [from, to]: hand-overs from a settled card to the next landing
  const state = new Map(); // card -> { p, covered }
  let active = false;
  let vh = window.innerHeight;

  // Folder tabs: one per service, staggered across the width like divider tabs.
  sections.forEach((section, index) => {
    section.style.setProperty("--tab-i", String(index));
    section.style.setProperty("--tab-n", String(sections.length));
    const shade = document.createElement("div");
    shade.className = "svx__shade";
    shade.setAttribute("aria-hidden", "true");
    section.append(shade);
  });
  if (closer) {
    const shade = document.createElement("div");
    shade.className = "svx__shade";
    shade.setAttribute("aria-hidden", "true");
    closer.append(shade);
  }

  // Cast shadow: every card that lands on another throws a soft shadow onto
  // the card below its top edge. Far away it is wide and faint; as the card
  // settles it tightens and darkens, like a sheet coming down on a desk.
  // The CTA band clips its own glow, so it keeps only its layered edge
  // shadow (CSS); the services carry the moving cast.
  sections.slice(1).forEach((card) => {
    const cast = document.createElement("div");
    cast.className = "svx__cast";
    cast.setAttribute("aria-hidden", "true");
    card.prepend(cast);
  });

  /* Natural (un-stuck) layout: sticky tops and document positions. */
  function measure() {
    vh = window.innerHeight;
    unstick();
    const nav = navHeight();
    const max = document.documentElement.scrollHeight - vh;
    const landings = [];
    const settled = [];
    cards.forEach((card) => {
      const r = card.getBoundingClientRect();
      const top = r.top + window.scrollY;
      naturalTop.set(card, top);
      landings.push(Math.min(max, Math.round(top - nav)));
      settled.push(Math.min(max, Math.round(Math.max(top - nav, top + r.height - vh))));
      card.style.top = `${Math.min(0, Math.round(vh - r.height))}px`;
      // Tip back around the middle of the part that stays on screen.
      card.style.transformOrigin = `50% ${Math.max(vh * 0.5, r.height - vh * 0.5)}px`;
    });
    downStops = landings;
    // The CTA band is the last card: its landing doubles as its rest point.
    upStops = [0, ...settled.slice(0, -1), landings[landings.length - 1]];
    // Hero -> first card, then each settled card -> the next landing.
    zones = [[0, landings[0]]];
    for (let i = 0; i < cards.length - 1; i += 1) zones.push([settled[i], landings[i + 1]]);
  }

  /* ── Landing ─────────────────────────────────────────────── */

  let landing = false;
  let swallowing = false;
  let lastWheelAt = 0;
  let lastWheelAbs = 0;
  let lastDir = 1;

  function land(target) {
    const lenis = getLenis();
    const from = lenis ? lenis.animatedScroll : window.scrollY;
    if (Math.abs(target - from) < 1) return;
    landing = true;
    const done = () => {
      landing = false;
      swallowing = true; // the flick that brought us here ends here
    };
    if (lenis) {
      lenis.scrollTo(target, {
        duration: landDuration(Math.abs(target - from)),
        easing: easeOutQuart,
        lock: true,
        force: true,
        onComplete: done,
      });
    } else {
      window.scrollTo({ top: target, behavior: "smooth" });
      setTimeout(done, 600);
    }
  }

  // The first stop a move from `from` to `to` would reach.
  function crossing(from, to) {
    if (to > from) return downStops.find((stop) => stop > from + 1 && stop <= to) ?? null;
    if (to < from) {
      for (let i = upStops.length - 1; i >= 0; i -= 1) {
        if (upStops[i] < from - 1 && upStops[i] >= to) return upStops[i];
      }
    }
    return null;
  }

  // Lenis asks before it applies each wheel/touch input. Returning false
  // only skips Lenis; the native scroll still runs unless we cancel it.
  const drop = (event) => {
    if (event?.cancelable) event.preventDefault();
    return false;
  };
  function onVirtualScroll({ deltaY, event }) {
    if (!active || event?.ctrlKey || !deltaY) return true;
    const now = performance.now();
    const abs = Math.abs(deltaY);
    const newGesture =
      now - lastWheelAt > GESTURE_GAP || abs > lastWheelAbs * 1.5 + 4 || Math.sign(deltaY) !== lastDir;
    lastWheelAt = now;
    lastWheelAbs = abs;
    lastDir = Math.sign(deltaY);
    if (landing) return drop(event);
    if (swallowing) {
      if (!newGesture) return drop(event);
      swallowing = false;
    }
    const lenis = getLenis();
    const from = lenis.targetScroll;
    const stop = crossing(from, from + deltaY); // deltaY already carries wheelMultiplier
    if (stop === null) return true;
    land(stop);
    return drop(event);
  }

  // Settle: a scroll that comes to rest inside a hand-over completes it
  // (or backs out of it) in the direction it was going.
  let idleTimer = 0;
  let pointerDown = false;
  let lastY = window.scrollY;
  let moveDir = 1;
  function onScroll() {
    const y = window.scrollY;
    if (y !== lastY) moveDir = y > lastY ? 1 : -1;
    lastY = y;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(settle, 140);
  }
  function settle() {
    if (!active || landing || pointerDown || getLenis()?.isScrolling === "smooth") return;
    const y = window.scrollY;
    const zone = zones.find(([a, b]) => y > a + 1 && y < b - 1);
    if (!zone) return;
    const [a, b] = zone;
    const t = (y - a) / (b - a);
    const forward = moveDir > 0 ? t > COMMIT : t > 1 - COMMIT;
    land(forward ? b : a);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  // Dragging the scrollbar: wait for the release before settling.
  window.addEventListener("pointerdown", () => {
    pointerDown = true;
  });
  window.addEventListener("pointerup", () => {
    pointerDown = false;
    onScroll();
  });

  function hookLenis() {
    const lenis = getLenis();
    if (lenis) lenis.options.virtualScroll = onVirtualScroll;
    else requestAnimationFrame(hookLenis);
  }
  hookLenis();

  // Natural flow for measuring. `top` must go too: on a relative element
  // it would shift the card by its sticky offset.
  function unstick() {
    cards.forEach((card) => {
      card.style.transform = "";
      card.style.top = "";
      card.style.position = "relative";
    });
  }

  function release() {
    cards.forEach((card) => {
      card.style.position = "";
    });
  }

  function setCovered(card, covered) {
    const s = state.get(card);
    if (s.covered === covered) return;
    s.covered = covered;
    card.inert = covered;
    card.dispatchEvent(new CustomEvent("svx:covered", { detail: covered }));
  }

  function paintCast(card, p) {
    const s = state.get(card);
    if (!s.cast || Math.abs(s.castP - p) < 0.0005) return;
    s.castP = p;
    const e = smoothstep(p);
    // Opacity and a vertical scale from the card's edge: compositor-only.
    s.cast.style.opacity = (CAST_FAR + (1 - CAST_FAR) * e).toFixed(3);
    s.cast.style.transform = `scaleY(${(CAST_SPREAD - (CAST_SPREAD - 1) * e).toFixed(3)})`;
  }

  function paint(card, p) {
    const s = state.get(card);
    if (Math.abs(s.p - p) < 0.0005) return;
    s.p = p;
    const e = smoothstep(p);
    card.style.transform =
      e === 0
        ? ""
        : `perspective(${PERSPECTIVE}px) translate3d(0, ${(-LIFT * vh * e).toFixed(2)}px, 0) ` +
          `rotateX(${(TILT * e).toFixed(3)}deg) scale(${(1 - SCALE * e).toFixed(4)})`;
    s.shade.style.opacity = (SHADE * e).toFixed(3);
  }

  function update() {
    if (!active) return;
    // Reads first.
    const tops = cards.map((card) => card.getBoundingClientRect().top);
    // Then writes: card i recedes as card i+1 rises from the bottom edge.
    for (let i = 0; i < cards.length - 1; i += 1) {
      const p = clamp01((vh - tops[i + 1]) / vh);
      paint(cards[i], p);
      paintCast(cards[i + 1], p);
      setCovered(cards[i], tops[i + 1] <= 1);
    }
  }

  function enable() {
    active = true;
    mount.classList.add("is-stacked");
    cards.forEach((card) => {
      card.classList.add("is-stacked");
      state.set(card, {
        p: -1,
        castP: -1,
        covered: false,
        shade: card.querySelector(":scope > .svx__shade"),
        cast: card.querySelector(":scope > .svx__cast"),
      });
    });
    measure();
    release();
    update();
  }

  function disable() {
    active = false;
    mount.classList.remove("is-stacked");
    cards.forEach((card) => {
      card.classList.remove("is-stacked");
      card.style.removeProperty("top");
      card.style.removeProperty("transform");
      card.style.removeProperty("transform-origin");
      card.style.removeProperty("position");
      if (state.get(card)?.covered) setCovered(card, false);
      const shade = card.querySelector(":scope > .svx__shade");
      if (shade) shade.style.opacity = "";
      const cast = card.querySelector(":scope > .svx__cast");
      if (cast) {
        cast.style.opacity = "";
        cast.style.transform = "";
      }
    });
    naturalTop.clear();
    state.clear();
  }

  // Every ScrollTrigger on the page measures natural positions: sticky off
  // for the duration of a refresh, back on (with fresh tops) afterwards.
  ScrollTrigger.addEventListener("refreshInit", () => {
    if (active) unstick();
  });
  ScrollTrigger.addEventListener("refresh", () => {
    if (!active) return;
    measure();
    release();
    state.forEach((s) => {
      s.p = -1;
      s.castP = -1;
    });
    update();
  });

  // Opening a "Service details" disclosure changes the card's height.
  if (typeof ResizeObserver !== "undefined") {
    let pending = 0;
    const ro = new ResizeObserver(() => {
      if (!active) return;
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => ScrollTrigger.refresh());
    });
    cards.forEach((card) => ro.observe(card));
  }

  ScrollTrigger.create({ start: 0, end: "max", onUpdate: update });

  // Shift-tabbing back into a tall stuck card can focus something above
  // the viewport that scrolling would never reveal: bring the card back.
  cards.forEach((card) => {
    card.addEventListener("focusin", (event) => {
      if (!active) return;
      if (event.target.getBoundingClientRect().top < 0) scrollTo(card, { duration: 0.6 });
    });
  });

  const apply = () => (media.matches ? enable() : disable());
  apply();
  media.addEventListener?.("change", () => {
    apply();
    ScrollTrigger.refresh();
  });

  /** Scroll to a card's landing (a stuck card's own rect lies). */
  function scrollTo(card, options) {
    const i = cards.indexOf(card);
    if (active && i >= 0 && downStops.length) {
      scrollToTarget(downStops[i], options);
    } else {
      scrollToTarget(card, options);
    }
  }

  return { update, scrollTo, isActive: () => active };
}

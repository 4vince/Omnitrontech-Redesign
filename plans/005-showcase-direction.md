# 005 — Make the showcase carousel slide in the direction you navigated

- **Status**: DONE (2026-11-07)
- **Commit**: 870377a (working tree; line numbers from 2026-11-07)
- **Severity**: MEDIUM
- **Category**: Physicality & origin (spatial consistency)
- **Estimated scope**: 1 file, ~25 lines

## Problem

The "Where the system meets the work" carousel (homepage) chooses each panel's exit side from its *index* relative to the new one, not from the direction you moved. Going forward from the last slide (04 → 01, which also happens on auto-advance) plays like going backward: the old panel leaves to the right and the new one enters from the left. The new panel also enters from wherever it last left, which can be the wrong side.

```js
/* src/js/pages/home.js:88-113 — current */
  function render(index, { instant = false } = {}) {
    panels.forEach((panel, panelIndex) => {
      const isActive = panelIndex === index;
      panel.classList.toggle("is-active", isActive);
      panel.setAttribute("aria-hidden", String(!isActive));
      if (prefersReducedMotion() || instant) {
        gsap.set(panel, { opacity: isActive ? 1 : 0, x: 0 });
        return;
      }
      gsap.to(panel, {
        opacity: isActive ? 1 : 0,
        x: isActive ? 0 : (panelIndex < index ? -24 : 24),
        duration: 0.6,
        ease: "power3.out",
        overwrite: true,
      });
    });
    …
  }

  function goTo(index) {
    active = (index + total) % total;
    render(active);
  }
```

`goTo` is called as `goTo(active + 1)` (next button, auto-advance) and `goTo(active - 1)` (previous button), at `src/js/pages/home.js:119, 125, 130`.

## Target

Direction-aware: `dir = +1` for next and auto-advance, `-1` for previous. The outgoing panel exits toward `-24 * dir`. The incoming panel is placed at `+24 * dir` first, then moves to 0. Only the two panels involved animate.

```js
/* src/js/pages/home.js — target */
  function render(index, { instant = false, dir = 1, from = -1 } = {}) {
    panels.forEach((panel, panelIndex) => {
      const isActive = panelIndex === index;
      panel.classList.toggle("is-active", isActive);
      panel.setAttribute("aria-hidden", String(!isActive));
      if (prefersReducedMotion() || instant) {
        gsap.set(panel, { opacity: isActive ? 1 : 0, x: 0 });
        return;
      }
      if (isActive) {
        // Enter from the side we're travelling toward.
        gsap.fromTo(
          panel,
          { opacity: 0, x: 24 * dir },
          { opacity: 1, x: 0, duration: 0.5, ease: "power3.out", overwrite: true },
        );
      } else if (panelIndex === from) {
        // Leave toward the side we came from.
        gsap.to(panel, { opacity: 0, x: -24 * dir, duration: 0.35, ease: "power3.out", overwrite: true });
      } else {
        gsap.set(panel, { opacity: 0, x: 0, overwrite: true });
      }
    });
    …unchanged count/track lines…
  }

  function goTo(index, dir = 1) {
    const from = active;
    active = (index + total) % total;
    render(active, { dir, from });
  }
```

Call sites: next button and auto-advance use `goTo(active + 1, 1)`; the previous button uses `goTo(active - 1, -1)`.

Timing note: the exit is shorter (350ms) than the enter (500ms), so the outgoing slide clears out of the way before the new one finishes settling. That reduces the two-slides-overlapping look of the current symmetric 600ms crossfade.

## Repo conventions to follow

- GSAP is imported in this file from `../core/motion.js` (`import { gsap, prefersReducedMotion } from "../core/motion.js";`, line 6). Keep using it.
- Reduced motion: the existing `prefersReducedMotion() || instant` branch sets state without movement. Keep it as is.

## Steps

1. Replace the `render` function body's `gsap.to(panel, { … })` block with the `if (isActive) … else if … else …` block from Target. Change the signature to `render(index, { instant = false, dir = 1, from = -1 } = {})`.
2. Replace `goTo` with the target version.
3. Update the three call sites: `prevButton` click → `goTo(active - 1, -1)`; `nextButton` click → `goTo(active + 1, 1)`; inside `scheduleAdvance` → `goTo(active + 1, 1)`.
4. Leave `render(active, { instant: true })` (initial render, around line 144) unchanged.

## Boundaries

- Only `src/js/pages/home.js`, only `render`, `goTo` and the three call sites.
- Do NOT change the counter or progress lines inside `render` (plans 007 and 014 handle those).
- Do NOT change auto-advance timing (5200ms).

## Verification

- **Mechanical**: `npx vite build` → `✓ built`. No console errors on `/`.
- **Feel check** (`npx vite`, scroll to "Where the system meets the work"):
  - Click → repeatedly through 04 → 01: every step, including the wrap, has the old slide leave left and the new one enter from the right.
  - Click ← repeatedly, including 01 → 04: the reverse every time.
  - Let it auto-advance across the wrap: it reads as forward.
  - Click → several times quickly: each new slide retargets cleanly (GSAP `overwrite: true`), with no stuck half-visible panels.
  - DevTools Rendering → emulate `prefers-reduced-motion: reduce`: slides swap instantly with no movement.
- **Done when**: direction is consistent in both directions, including the wrap.

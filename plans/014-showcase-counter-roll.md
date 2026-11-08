# 014 — Roll the showcase counter with the slide change

- **Status**: DONE (2026-11-07)
- **Commit**: 870377a (working tree; line numbers from 2026-11-07)
- **Severity**: LOW (missed opportunity)
- **Category**: Missed opportunities (state change that teleports)
- **Depends on**: 005 (adds the `dir` parameter to `render`)
- **Estimated scope**: 2 files, ~15 lines

## Problem

The carousel's "01 / 04" counter (homepage, `index.html:180` `<span data-applied-count aria-live="polite">01 / 04</span>`) swaps its text instantly while the slide below animates. The number teleports, so it doesn't feel connected to the change it's reporting.

```js
/* src/js/pages/home.js:106 — current (inside render) */
    if (countLabel) countLabel.textContent = `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
```

## Target

After the text changes, the counter does a tiny directional roll: it rises 6px into place (or drops, when going back) with a fade, over 200ms, using WAAPI. It's hardware-accelerated and needs no library. The animation runs only on real slide changes, not on the initial render, and not with reduced motion.

```js
/* src/js/pages/home.js — target, replacing the countLabel line inside render() */
    if (countLabel) {
      countLabel.textContent = `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
      if (!instant && !prefersReducedMotion()) {
        countLabel.animate(
          [
            { opacity: 0, transform: `translateY(${6 * dir}px)` },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration: 200, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
        );
      }
    }
```

`dir` comes from plan 005's `render(index, { instant = false, dir = 1, from = -1 } = {})` signature. With `dir = 1` (next) the new number rises from below; with `-1` (previous) it drops from above.

The counter is an inline `<span>`, and transforms don't apply to inline elements, so it must become inline-block:

```css
/* src/styles/home.css — add after the .showcase-meta > span:first-child rule (line 886-888) */
.showcase-meta [data-applied-count] {
  display: inline-block;
}
```

## Repo conventions to follow

- `prefersReducedMotion` is already imported in `src/js/pages/home.js:6`.
- Easing literal matches the site `--ease-out` after plan 001 (`cubic-bezier(0.23, 1, 0.32, 1)`). WAAPI can't read CSS variables, so the literal is correct here.

## Steps

1. Confirm plan 005 is applied (`render` has a `dir` option). If not, STOP.
2. `src/js/pages/home.js`: replace the single `if (countLabel) countLabel.textContent = …;` line inside `render` with the target block.
3. `src/styles/home.css`: add the `.showcase-meta [data-applied-count] { display: inline-block; }` rule after `.showcase-meta > span:first-child { … }`.

## Boundaries

- Do NOT change the counter's markup, text format or `aria-live`.
- Do NOT animate the "Pause" toggle.

## Verification

- **Mechanical**: `npx vite build` → `✓ built`. No console errors.
- **Feel check**: homepage carousel.
  - Click →: the counter's new number rises into place as the slide enters.
  - Click ←: it drops into place.
  - Click rapidly: each change restarts a 200ms roll, which is fine at this size.
  - On page load the counter doesn't animate.
  - With reduced motion: the number just changes.
- **Done when**: the counter rolls in the travel direction on every slide change.

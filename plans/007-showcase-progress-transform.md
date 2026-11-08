# 007 — Animate the showcase progress bar with transform, not width

- **Status**: DONE (2026-11-07)
- **Commit**: 870377a (working tree; line numbers from 2026-11-07)
- **Severity**: LOW
- **Category**: Performance
- **Estimated scope**: 1 file, ~6 lines

## Problem

The showcase carousel's progress rail fills by transitioning `width`, a layout property, so every frame of the 500ms fill triggers layout and paint.

```css
/* src/styles/home.css:1106-1113 — current */
.showcase-panels__track::after {
  content: "";
  position: absolute;
  inset: 0;
  width: calc(var(--progress, 0) * 100%);
  background: var(--blue);
  transition: width 0.5s var(--ease-out);
}
```

`--progress` is set from JS in `src/js/pages/home.js` (`track.style.setProperty("--progress", String((index + 1) / total))`).

## Target

Full-width bar scaled horizontally from the left. Transform-only, compositor-friendly. The JS stays the same because `--progress` is still the input. The duration is the 400ms reveal token, so the fill lands in step with the incoming slide (500ms after plan 005).

```css
/* src/styles/home.css — target */
.showcase-panels__track::after {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--blue);
  transform: scaleX(var(--progress, 0));
  transform-origin: left center;
  transition: transform var(--dur-reveal) var(--ease-out);
}
```

The custom property sits on the track itself, which only has this one pseudo-element child, so the parent-variable recalc concern doesn't apply here.

## Repo conventions to follow

- Same transform-origin-left scale pattern as the nav underline: `src/styles/layout.css:163-174` (`transform: scaleX(0); transform-origin: left;`).
- `--dur-reveal: 400ms` from plan 001. If plan 001 isn't applied, use `400ms` literally.

## Steps

1. Replace the `.showcase-panels__track::after` rule at `src/styles/home.css:1106-1113` with the target rule.

## Boundaries

- Do NOT edit `src/js/pages/home.js`.
- Do NOT change the rail's height or color.

## Verification

- **Mechanical**: `npx vite build` → `✓ built`.
- **Feel check**: homepage carousel. Click → and ←: the blue rail grows and shrinks smoothly from the left edge, reaching 25%, 50%, 75% and 100% for slides 1–4. It looks identical to before but is now transform-only (DevTools Performance: no Layout entries during the fill).
- **Done when**: no `width` transition remains on the track.

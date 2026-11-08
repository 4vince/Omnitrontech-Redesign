# 008 — Tighten the showcase flow-step stagger

- **Status**: DONE (2026-11-07)
- **Commit**: 870377a (working tree; line numbers from 2026-11-07)
- **Severity**: LOW
- **Category**: Cohesion (stagger)
- **Estimated scope**: 1 file, 2 lines

## Problem

Each showcase slide's flow steps (the vertical list on the right) rise in with a 140ms stagger and 600ms per step, after a 150ms delay. With four steps the last one lands at about 1.17s. That's slow for a slide that auto-advances every 5.2s, and it's above the 30–80ms stagger guideline, so the list reads as a slow cascade rather than one motion.

```css
/* src/styles/home.css:1040-1045 — current */
@media (prefers-reduced-motion: no-preference) {
  .applied-panel.is-active .applied-flow__step {
    animation: applied-step-in 0.6s var(--ease-out) both;
    animation-delay: calc(0.15s + var(--i, 0) * 0.14s);
  }
}
```

## Target

60ms stagger, 400ms per step, 120ms lead-in. The last of four steps lands at about 0.70s.

```css
/* src/styles/home.css — target */
@media (prefers-reduced-motion: no-preference) {
  .applied-panel.is-active .applied-flow__step {
    animation: applied-step-in var(--dur-reveal) var(--ease-out) both;
    animation-delay: calc(0.12s + var(--i, 0) * 60ms);
  }
}
```

Keep the existing `@keyframes applied-step-in` (from `opacity: 0; transform: translateY(10px)`) unchanged; a 10px rise is right for list items.

Why keyframes are acceptable here: the animation replays once per slide change, which is occasional, and it is fully decorative. Interrupting it mid-play just restarts the next slide's list, which is correct.

## Repo conventions to follow

- `--dur-reveal: 400ms` from plan 001 (`src/styles/tokens.css`). If plan 001 isn't applied, use `400ms`.
- `--i` is set per step inline in `src/js/pages/home.js:13` (`style="--i:${i}"`).

## Steps

1. `src/styles/home.css:1042`: `animation: applied-step-in 0.6s var(--ease-out) both;` → `animation: applied-step-in var(--dur-reveal) var(--ease-out) both;`.
2. `src/styles/home.css:1043`: `animation-delay: calc(0.15s + var(--i, 0) * 0.14s);` → `animation-delay: calc(0.12s + var(--i, 0) * 60ms);`.

## Boundaries

- Only these two lines. Do NOT edit the keyframes or the JS.

## Verification

- **Mechanical**: `npx vite build` → `✓ built`.
- **Feel check**: homepage carousel. Advance slides: the steps arrive as one quick cascade, finished well before you'd start reading. At 10% speed, each step starts 60ms after the previous one.
- **Done when**: stagger is 60ms and per-step duration is 400ms.

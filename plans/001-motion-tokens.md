# 001 — Strengthen the easing curves and add a motion duration scale

- **Status**: DONE (2026-11-07)
- **Commit**: 870377a (working tree has uncommitted redesign changes; line numbers below are from the working tree on 2026-11-07)
- **Severity**: LOW (but a prerequisite for 002–014)
- **Category**: Cohesion & tokens
- **Estimated scope**: 1 file, ~8 lines

## Problem

Motion values are a single base duration that is too slow for UI feedback, plus a weak in-out curve. Everything else is hand-typed (380, 420, 460, 600, 700, 900ms appear across the CSS).

```css
/* src/styles/tokens.css:41-46 — current */
  /* Motion */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --dur-fast: 180ms;
  --dur: 360ms;
  --dur-slow: 720ms;
```

`--ease-in-out` at `(0.65, 0, 0.35, 1)` is soft. On-screen movement (accordion, sliding panels) should use a strong in-out.

## Target

```css
/* src/styles/tokens.css — target */
  /* Motion
     Curves: strong ease-out for anything entering/exiting or responding;
     strong ease-in-out for things moving/morphing on screen.
     Durations: UI feedback stays under 300ms. */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --dur-press: 120ms;   /* press / active feedback */
  --dur-ui: 200ms;      /* hover, focus, small state changes */
  --dur-panel: 280ms;   /* accordions, menus, panels changing size */
  --dur-reveal: 400ms;  /* content entering (success card, scene fade) */
  --dur-fast: 180ms;
  --dur: 360ms;
  --dur-slow: 720ms;
```

Keep `--dur-fast`, `--dur` and `--dur-slow`: they are still referenced, and plan 002 migrates the UI uses of `--dur` to `--dur-ui`.

## Repo conventions to follow

- All motion tokens live in `src/styles/tokens.css` inside the first `:root { … }` block, under the `/* Motion */` comment (currently lines 40-46).
- Components consume them as `var(--ease-out)`, e.g. `src/styles/layout.css:173` `transition: transform var(--dur) var(--ease-out);`.

## Steps

1. In `src/styles/tokens.css`, replace the `/* Motion */` block (lines 40-46) with the target block above, verbatim.

## Boundaries

- Only edit `src/styles/tokens.css`.
- Do NOT rename or remove `--dur-fast`, `--dur` or `--dur-slow`.
- Do NOT touch the `[data-theme="dark"]` block. Motion tokens are not themed.
- If the `/* Motion */` block doesn't match the "current" excerpt, STOP and report.

## Verification

- **Mechanical**: `npx vite build` completes with `✓ built`.
- **Feel check**: run `npx vite`, open `/` and `/ai-solutions/`, hover buttons and links, scroll through reveals. Nothing should look broken. The ease-out curve is now slightly less abrupt at the start (0.23 vs 0.16), so entrances feel a touch smoother.
- **Done when**: the six new and updated token lines exist and the build passes.

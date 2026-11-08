# 011 — Match the AI Solutions hero's scene entrance to the homepage

- **Status**: DONE (2026-11-07)
- **Commit**: 870377a (working tree; line numbers from 2026-11-07)
- **Severity**: LOW
- **Category**: Cohesion
- **Depends on**: 001 (`--dur-reveal`)
- **Estimated scope**: 2 files, ~12 lines

## Problem

The AI Solutions hero's 3D overview fades in on opacity alone over 700ms. The homepage robot hero was changed to a quicker fade with a settle from slightly zoomed-in. The two heroes should arrive the same way.

```css
/* src/styles/solutions.css:144-155 — current */
.solutions-hero__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 700ms var(--ease-out);
}

.solutions-hero__visual.has-webgl .solutions-hero__canvas {
  opacity: 1;
}
```

## Target

Exemplar to match, `src/styles/home.css:50-59`:

```css
.hero-scene .scene-canvas {
  transform: scale(1.04);
  transition:
    opacity 400ms cubic-bezier(0.23, 1, 0.32, 1),
    transform 500ms cubic-bezier(0.23, 1, 0.32, 1);
}
.has-webgl .hero-scene .scene-canvas {
  transform: none;
}
```

Target for the solutions page:

```css
/* src/styles/solutions.css — target */
.solutions-hero__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transform: scale(1.04);
  transition:
    opacity var(--dur-reveal) var(--ease-out),
    transform 500ms var(--ease-out);
}

.solutions-hero__visual.has-webgl .solutions-hero__canvas {
  opacity: 1;
  transform: none;
}
```

Reduced motion: `src/styles/solutions.css:1815-1820` already sets `.solutions-hero__canvas { transition: none; }`. Add `transform: none;` there too, so reduced-motion users don't get a canvas stuck at 1.04 scale:

```css
@media (prefers-reduced-motion: reduce) {
  .svc__canvas,
  .solutions-hero__canvas {
    transition: none;
    transform: none;
  }
}
```

## Repo conventions to follow

- The exemplar is `src/styles/home.css:50-59` (homepage robot canvas).
- `--ease-out` is `cubic-bezier(0.23, 1, 0.32, 1)` after plan 001, so `var(--ease-out)` equals the exemplar's literal curve.

## Steps

1. Replace the `.solutions-hero__canvas` rule (`src/styles/solutions.css:144-151`) with the target version.
2. Add `transform: none;` to `.solutions-hero__visual.has-webgl .solutions-hero__canvas` (lines 153-155).
3. In the `@media (prefers-reduced-motion: reduce)` block at `src/styles/solutions.css:1815-1820`, add `transform: none;` next to `transition: none;`.

## Boundaries

- Do NOT edit `src/js/pages/solutions.js` or the scene (`src/js/visuals/solutions-hero-scene.js`). The reveal timing (after the intro's "visual" label) stays as is.
- Do NOT touch the `.solutions-hero__canvas` override near line 1306 (it only sets `display: block`).

## Verification

- **Mechanical**: `npx vite build` → `✓ built`.
- **Feel check**: load `/ai-solutions/` at desktop width. Once the headline lands, the 3D overview fades up quickly while settling from slightly zoomed-in, the same as the homepage robot. Reload with reduced motion emulated: the canvas appears without scaling.
- **Done when**: both heroes share the same entrance values.

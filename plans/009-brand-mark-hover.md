# 009 — Reduce the logo's hover spin

- **Status**: DONE (2026-11-07)
- **Commit**: 870377a (working tree; line numbers from 2026-11-07)
- **Severity**: LOW
- **Category**: Purpose & frequency
- **Depends on**: 001 (`--dur-ui`)
- **Estimated scope**: 1 file, ~10 lines

## Problem

The nav logo spins a quarter turn (90°) over 600ms on every hover. It's on every page, and hovered constantly on the way to the nav links. It's decorative and big, and it isn't gated to hover-capable devices, so on touch a tap leaves the logo rotated.

```css
/* src/styles/layout.css:116-128 — current (excerpt) */
.brand-mark {
  …
  box-shadow: 0 0 18px var(--glow-blue);
  transition: transform 600ms var(--ease-out), box-shadow var(--dur);
}

/* src/styles/layout.css:140-143 — current */
.brand:hover .brand-mark {
  transform: rotate(90deg);
  box-shadow: 0 0 28px var(--glow-blue);
}
```

Also note `src/styles/motion.css:44-48` overrides `.brand-mark`'s `transition-property` to `background-color, border-color, color, box-shadow, transform, opacity`. The two durations from `layout.css` then cycle across those six properties. The fix below sets the durations explicitly to avoid that ambiguity.

## Target

A small, quick acknowledgement (a 12° tilt over 200ms) on mouse-hover devices only. The glow brightening stays for everyone.

```css
/* src/styles/layout.css — .brand-mark transition line */
  transition: transform var(--dur-ui) var(--ease-out), box-shadow var(--dur-ui) var(--ease-out);

/* src/styles/layout.css — replace .brand:hover .brand-mark */
.brand:hover .brand-mark {
  box-shadow: 0 0 28px var(--glow-blue);
}

@media (hover: hover) and (pointer: fine) {
  .brand:hover .brand-mark {
    transform: rotate(12deg);
  }
}
```

And in `src/styles/motion.css`, remove `.brand-mark,` from the theme-swap selector list at lines 44-48, so `layout.css` alone owns its transition:

```css
/* src/styles/motion.css — target */
.site-nav::before,
.contact-form-card,
.input,
.textarea {
  transition-property: background-color, border-color, color, box-shadow,
    transform, opacity;
}
```

## Repo conventions to follow

- Pointer gating query `(hover: hover) and (pointer: fine)`, as in plan 004 and `src/js/home/hero-ambient.js:13`.
- `--dur-ui: 200ms` from plan 001.

## Steps

1. `src/styles/layout.css:127`: replace the `.brand-mark` `transition:` line with the target line.
2. `src/styles/layout.css:140-143`: replace the `.brand:hover .brand-mark` rule with the two target rules (ungated glow, gated rotate).
3. `src/styles/motion.css`: delete the `.brand-mark,` line from the selector list above `transition-property: background-color, …`.

## Boundaries

- Do NOT change the logo image, size or glow color.
- Do NOT touch other nav rules.

## Verification

- **Mechanical**: `npx vite build` → `✓ built`.
- **Feel check**: hover the Omnitron logo. It tilts slightly and the glow brightens, both within about 200ms, and returns as quickly on leave. On a touch-emulated device, tapping the logo navigates home with no lingering rotation.
- **Done when**: no 90° rotation and no 600ms duration remain on the brand mark.

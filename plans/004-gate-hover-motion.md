# 004 — Gate hover *movement* to devices that actually hover

- **Status**: DONE (2026-11-07)
- **Commit**: 870377a (working tree; line numbers from 2026-11-07)
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 2 files, ~40 lines (rules split, not rewritten)

## Problem

Hover rules that *move* things (lift, nudge) apply on touch devices too. On a phone a tap triggers `:hover` and leaves the element stuck in its moved state after the finger lifts: buttons stay raised, arrows stay nudged.

```css
/* src/styles/components.css:31-33 */
.btn:hover .ph { transform: translate(2px, -2px); }

/* src/styles/components.css:46-51 (last line moves) */
.btn--primary:hover { background: …; box-shadow: …; transform: translateY(-2px); }

/* src/styles/components.css:59-63 */
.btn--ghost:hover { border-color: var(--ink-soft); background: var(--field-bg); transform: translateY(-2px); }

/* src/styles/components.css:70-73 */
.btn--light:hover { background: #fff; transform: translateY(-2px); }

/* src/styles/components.css:109-111 */
.text-link:hover .ph { transform: translate(2px, -2px); }

/* src/styles/components.css:189-193 */
.tab:hover { border-color: var(--line-control); color: var(--ink); transform: translateY(-1px); }

/* src/styles/solutions.css:299-302 */
.solutions-index__link:hover .ph { color: var(--blue); transform: translate(2px, 2px); }
```

(`src/styles/layout.css:140` `.brand:hover .brand-mark` also moves; plan 009 handles it.)

## Target

Color, background, border and shadow changes stay ungated (harmless on touch). Only the `transform` declarations move into a pointer-gated block:

```css
/* src/styles/components.css — the hover rules keep everything except transform */
.btn--primary:hover {
  background: var(--btn-bg-hover);
  box-shadow: 0 24px 46px -22px rgba(23, 25, 31, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.35);
}
.btn--ghost:hover { border-color: var(--ink-soft); background: var(--field-bg); }
.btn--light:hover { background: #fff; }
.tab:hover { border-color: var(--line-control); color: var(--ink); }

/* Hover movement only where a real pointer hovers (touch fires false hovers on tap). */
@media (hover: hover) and (pointer: fine) {
  .btn:hover .ph,
  .text-link:hover .ph {
    transform: translate(2px, -2px);
  }

  .btn--primary:hover,
  .btn--ghost:hover,
  .btn--light:hover {
    transform: translateY(-2px);
  }

  .tab:hover {
    transform: translateY(-1px);
  }
}
```

Place the `@media` block in `components.css` directly *before* the `.btn:not(:disabled):active` rule from plan 003 if that exists (so the press still wins), otherwise directly after `.btn--light:hover`.

```css
/* src/styles/solutions.css:299-302 — target */
.solutions-index__link:hover .ph {
  color: var(--blue);
}

@media (hover: hover) and (pointer: fine) {
  .solutions-index__link:hover .ph {
    transform: translate(2px, 2px);
  }
}
```

## Repo conventions to follow

- The site already gates pointer-driven motion with this exact query in JS: `src/js/home/hero-ambient.js:13` `window.matchMedia("(hover: hover) and (pointer: fine)")`, and `src/js/home/hero.js` (robot head follow).

## Steps

1. `src/styles/components.css`: delete the `.btn:hover .ph { … }` rule (lines 31-33).
2. Remove the `transform: translateY(-2px);` line from `.btn--primary:hover`, `.btn--ghost:hover` and `.btn--light:hover`.
3. Delete the `.text-link:hover .ph { … }` rule (lines 109-111).
4. Remove `transform: translateY(-1px);` from `.tab:hover`.
5. Insert the components `@media (hover: hover) and (pointer: fine) { … }` block from Target at the position described.
6. `src/styles/solutions.css:299-302`: replace with the two target rules.

## Boundaries

- Do NOT gate color, background, border or shadow changes.
- Do NOT touch `.brand:hover` (plan 009) or the `:active` rules (plan 003).
- Do NOT change durations (plan 002).
- Do NOT touch the second `.solutions-index__link:hover` block later in `solutions.css` (around line 1389); it only changes color and background.

## Verification

- **Mechanical**: `npx vite build` → `✓ built`. `grep -n "translateY(-2px)" src/styles/components.css` returns only lines inside the `@media (hover: hover)` block.
- **Feel check**:
  - Desktop with a mouse: hover behaves exactly as before (buttons lift 2px, arrows nudge).
  - DevTools → device toolbar → a touch device (e.g. iPhone 14), reload, tap "Explore AI solutions": no lifted or stuck state after the tap. The color and background change may flash, which is fine.
- **Done when**: no `transform` change on `:hover` exists outside a `(hover: hover) and (pointer: fine)` block in `components.css` and the edited part of `solutions.css`.

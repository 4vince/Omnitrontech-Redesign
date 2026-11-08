# 003 — Make button press feedback immediate (and actually apply on hovered buttons)

- **Status**: DONE (2026-11-07)
- **Commit**: 870377a (working tree; line numbers from 2026-11-07)
- **Severity**: HIGH
- **Category**: Easing & duration / Interruptibility (asymmetric timing)
- **Depends on**: 001 (`--dur-press`, `--dur-ui`) and 002 (`.btn` transition on `--dur-ui`)
- **Estimated scope**: 2 files, ~20 lines

## Problem

1. The press state animates over the button's full transition (360ms before plan 002, 200ms after). Press feedback should be 100–160ms, or the click feels mushy.
2. **The press never shows on primary, ghost or light buttons.** `.btn:active` (specificity 0,2,0) is declared *before* `.btn--primary:hover` and the other variant hovers (also 0,2,0). While you press, you are also hovering, so the later hover rule wins and the button stays lifted at `translateY(-2px)` instead of pressing in.

```css
/* src/styles/components.css:35-37 — current */
.btn:active {
  transform: translateY(1px) scale(0.985);
}

/* src/styles/components.css:46-51 — declared later, wins while pressing */
.btn--primary:hover {
  background: var(--btn-bg-hover);
  box-shadow: 0 24px 46px -22px rgba(23, 25, 31, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.35);
  transform: translateY(-2px);
}
```

The showcase arrows press to `scale(0.94)` over `--dur-fast` (180ms), which is a bit deep and slightly slow:

```css
/* src/styles/home.css:1095-1097 — current */
.showcase-panels__arrow:active {
  transform: scale(0.94);
}
```

## Target

Press is fast (120ms in). Release eases back over the normal 200ms `--dur-ui` transition. That asymmetry is deliberate: a fast press, then a softer settle.

```css
/* src/styles/components.css — remove the old .btn:active (lines 35-37) and add
   this AFTER the .btn--light:hover rule (after line 73) */
.btn:not(:disabled):active {
  transform: translateY(0) scale(0.97);
  transition-duration: var(--dur-press);
}
```

`.btn:not(:disabled):active` has specificity 0,3,0, so it beats the 0,2,0 variant hover rules regardless of order. Placing it after them also keeps the intent obvious. `transition-duration` only overrides durations; the property list and curve still come from `.btn`.

```css
/* src/styles/home.css — replace lines 1095-1097 */
.showcase-panels__arrow:active {
  transform: scale(0.96);
  transition-duration: var(--dur-press);
}
```

## Repo conventions to follow

- Motion tokens from `src/styles/tokens.css` (`--dur-press: 120ms`, `--dur-ui: 200ms`), consumed via `var()`.
- Press feedback convention: scale between 0.95 and 0.98, transform only.

## Steps

1. `src/styles/components.css`: delete the `.btn:active { transform: translateY(1px) scale(0.985); }` rule (lines 35-37).
2. In the same file, directly after the closing `}` of `.btn--light:hover` (currently line 73), insert the target `.btn:not(:disabled):active` rule verbatim.
3. `src/styles/home.css:1095-1097`: replace the `.showcase-panels__arrow:active` rule with the target version.

## Boundaries

- Do NOT change hover transforms (plan 004 gates them) or durations elsewhere (plan 002).
- Do NOT add JS.
- If `.btn` doesn't already transition `transform` (from `src/styles/components.css:21-23`), STOP.

## Verification

- **Mechanical**: `npx vite build` → `✓ built`.
- **Feel check** (`npx vite`, homepage):
  - Press and hold "Start the conversation": the button visibly presses in (slightly smaller, the hover lift drops) within about a tenth of a second.
  - Release while still hovering: it settles back up to the hover lift over about 200ms. The release is noticeably softer than the press.
  - Repeat on the ghost button ("Explore AI solutions") and the showcase ← → arrows.
  - DevTools Animations panel at 10%: the press completes in about 120ms and the release in about 200ms.
  - Disabled submit button on `/contact/` (during "Sending"): pressing it does nothing.
- **Done when**: the press is visible on every button variant while hovered, and the press is faster than the release.

# 010 — Give the mobile menu a deliberate open and a quick close

- **Status**: DONE (2026-11-07)
- **Commit**: 870377a (working tree; line numbers from 2026-11-07)
- **Severity**: LOW
- **Category**: Interruptibility (asymmetric timing)
- **Estimated scope**: 1 file, ~6 lines

## Problem

The full-screen mobile menu opens and closes with identical 380ms opacity and translate timing. The user opens it on purpose, so a slightly longer, settled entrance reads well. Closing is the system getting out of the way (tap a link, tap close, press Esc), and at 380ms it lingers over the page the user is trying to reach.

```css
/* src/styles/layout.css:227-243 — current (motion lines) */
.mobile-sheet {
  …
  visibility: hidden;
  opacity: 0;
  transform: translateY(-1.5rem);
  transition: opacity 380ms var(--ease-out), transform 380ms var(--ease-out),
    visibility 0s linear 380ms;
}

/* src/styles/layout.css:258-264 — current */
.mobile-sheet.is-open {
  visibility: visible;
  opacity: 1;
  transform: none;
  transition: opacity 380ms var(--ease-out), transform 380ms var(--ease-out),
    visibility 0s;
}
```

## Target

Open: 340ms with the drawer curve. Close: 220ms ease-out. The visibility delay must match the close duration.

```css
/* .mobile-sheet (closing transition) */
  transition: opacity 220ms var(--ease-out), transform 220ms var(--ease-out),
    visibility 0s linear 220ms;

/* .mobile-sheet.is-open (opening transition) */
  transition: opacity 340ms cubic-bezier(0.32, 0.72, 0, 1),
    transform 340ms cubic-bezier(0.32, 0.72, 0, 1), visibility 0s;
```

`cubic-bezier(0.32, 0.72, 0, 1)` is the iOS-style drawer curve. It's used literally here because it has only this one use; don't add a token for it.

## Repo conventions to follow

- The open/close asymmetry pattern is already in place (base rule = closing transition, `.is-open` = opening transition); only the values change.
- `--ease-out` from `src/styles/tokens.css`.

## Steps

1. `src/styles/layout.css:241-242`: replace the `.mobile-sheet` `transition:` declaration with the target closing transition.
2. `src/styles/layout.css:262-263`: replace the `.mobile-sheet.is-open` `transition:` declaration with the target opening transition.

## Boundaries

- Do NOT change the sheet's transform distance (`-1.5rem`), its layout, or `src/js/ui/nav.js`.

## Verification

- **Mechanical**: `npx vite build` → `✓ built`.
- **Feel check**: DevTools device toolbar (any phone width under 960px).
  - Open the menu: it settles down into place with a smooth, iOS-like deceleration.
  - Close it (✕ or a link): it gets out of the way noticeably faster than it arrived.
  - Open then immediately close: the close reverses from the current position without jumping.
  - At 10% speed, the open takes about 340ms and the close about 220ms, and the sheet isn't clickable (visibility hidden) after the close finishes.
- **Done when**: the open is slower than the close, with the values above.

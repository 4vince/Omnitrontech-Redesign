# 006 — Tighten the FAQ accordion and let the answer arrive, not just be uncovered

- **Status**: DONE (2026-11-07)
- **Commit**: 870377a (working tree; line numbers from 2026-11-07)
- **Severity**: MEDIUM
- **Category**: Easing & duration (+ missed opportunity: answer entrance)
- **Depends on**: 001 (`--dur-panel`, `--dur-ui`, strengthened `--ease-in-out`)
- **Estimated scope**: 1 file, ~25 lines

## Problem

The FAQ (homepage "What most people ask first") expands over 460ms, and the plus icon rotates over 420ms. That's slow for a click-to-expand control. The answer text doesn't animate at all: it's simply uncovered as the row grows, so it reads as clipped rather than arriving.

```css
/* src/styles/components.css:312-341 — current */
.faq-trigger .ph {
  flex: none;
  font-size: 17px;
  color: var(--muted);
  transition: transform 420ms var(--ease-out), color var(--dur-fast);
}

.faq-trigger[aria-expanded="true"] .ph {
  transform: rotate(45deg);
  color: var(--blue);
}

.faq-panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 460ms var(--ease-out);
}

.faq-panel > div {
  overflow: hidden;
}

.faq-item.is-open .faq-panel {
  grid-template-rows: 1fr;
}

.faq-panel p {
  max-width: 62ch;
  padding: 0 44px 24px 0;
  color: var(--muted);
  font-size: 0.93rem;
  line-height: 1.7;
}
```

Opening one item closes the others (`src/js/ui/faq.js:46-53`), so a close and an open run at the same time. Both should use the same curve and duration so the rows trade height in step.

## Target

The row resize is on-screen morphing, so it uses the strong ease-in-out over 280ms. The answer fades and rises 6px on open, starting slightly after the row begins to grow. On close it fades fast with no movement. The icon rotates over 200ms.

```css
/* src/styles/components.css — target */
.faq-trigger .ph {
  flex: none;
  font-size: 17px;
  color: var(--muted);
  transition: transform var(--dur-ui) var(--ease-out), color var(--dur-fast);
}

.faq-trigger[aria-expanded="true"] .ph {
  transform: rotate(45deg);
  color: var(--blue);
}

.faq-panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--dur-panel) var(--ease-in-out);
}

.faq-panel > div {
  overflow: hidden;
}

.faq-item.is-open .faq-panel {
  grid-template-rows: 1fr;
}

.faq-panel p {
  max-width: 62ch;
  padding: 0 44px 24px 0;
  color: var(--muted);
  font-size: 0.93rem;
  line-height: 1.7;
  /* closing: fade out quickly, no movement */
  opacity: 0;
  transform: translateY(-6px);
  transition: opacity 120ms var(--ease-out), transform 0s linear 120ms;
}

.faq-item.is-open .faq-panel p {
  /* opening: fade + settle, slightly after the row starts growing */
  opacity: 1;
  transform: none;
  transition: opacity var(--dur-panel) var(--ease-out) 60ms,
    transform var(--dur-panel) var(--ease-out) 60ms;
}
```

The global reduced-motion rule in `src/styles/motion.css` already caps every transition at 100ms (`transition-duration: 100ms !important`), so reduced-motion users get a quick, nearly static change. No extra rule is needed.

A note on `grid-template-rows`: it is a layout property. It is kept deliberately, because it's the only CSS way to animate to auto height, and FAQ rows are few and opened occasionally. The cost is acceptable. Do NOT replace it with a JS height measurement.

## Repo conventions to follow

- Tokens: `--dur-panel: 280ms`, `--dur-ui: 200ms`, `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`, `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` (from plan 001, `src/styles/tokens.css`).
- Asymmetric open and close transitions are written as a base rule plus a state rule with its own `transition`, the same pattern as `.mobile-sheet` / `.mobile-sheet.is-open` in `src/styles/layout.css:227-264`.

## Steps

1. `src/styles/components.css:316`: `transform 420ms var(--ease-out)` → `transform var(--dur-ui) var(--ease-out)`.
2. `src/styles/components.css:327`: `grid-template-rows 460ms var(--ease-out)` → `grid-template-rows var(--dur-panel) var(--ease-in-out)`.
3. Append the four motion declarations (`opacity`, `transform`, `transition`, plus the comment) to the end of the existing `.faq-panel p` rule.
4. Add the new `.faq-item.is-open .faq-panel p { … }` rule directly after `.faq-panel p`.

## Boundaries

- Only `src/styles/components.css`, only the FAQ rules.
- Do NOT edit `src/js/ui/faq.js`.
- Do NOT change the single-open behaviour.

## Verification

- **Mechanical**: `npx vite build` → `✓ built`.
- **Feel check** (`npx vite`, homepage FAQ):
  - Click a closed question: the row opens in under a third of a second, and the answer fades up into place rather than being wiped into view.
  - The previously open answer fades out almost immediately as its row closes, so there's no clipped text sliding away.
  - The two rows trade height in step, with no jump in total height mid-animation.
  - Click quickly between two questions: each transition reverses from where it is (CSS transitions are interruptible), with no flashing.
  - DevTools Animations at 10%: the answer's opacity starts about 60ms after the row starts growing.
- **Done when**: open and close total about 280ms, the icon takes 200ms, and answers fade in on open.

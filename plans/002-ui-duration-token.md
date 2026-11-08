# 002 — Move UI hovers and state changes onto a 200ms duration

- **Status**: DONE (2026-11-07)
- **Commit**: 870377a (working tree; line numbers from 2026-11-07)
- **Severity**: HIGH
- **Category**: Easing & duration
- **Depends on**: 001 (adds `--dur-ui: 200ms`)
- **Estimated scope**: 4 files, ~12 one-line edits

## Problem

`--dur` is 360ms (`src/styles/tokens.css:45`), and it is the duration on most hover and state feedback on the site. UI feedback should stay under 300ms; at 360ms, underlines, arrows and highlights visibly trail the cursor. These are among the most frequently triggered motions on the site.

Current occurrences:

```css
/* src/styles/components.css:21-23 — .btn */
  transition: background-color var(--dur) var(--ease-out),
    color var(--dur) var(--ease-out), border-color var(--dur) var(--ease-out),
    transform var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out);

/* src/styles/components.css:26-29 — button arrow icon */
.btn .ph {
  font-size: 16px;
  transition: transform 380ms var(--ease-out);
}

/* src/styles/components.css:99-102 — text-link arrow */
.text-link .ph {
  font-size: 13px;
  transition: transform var(--dur) var(--ease-out);
}

/* src/styles/components.css:233 — .flow__step::before */
  transition: background-color var(--dur), box-shadow var(--dur);

/* src/styles/layout.css:173 — .nav-link::after underline */
  transition: transform var(--dur) var(--ease-out);

/* src/styles/solutions.css:232 — .solutions-index__link */
  transition: background-color var(--dur) var(--ease-out);

/* src/styles/solutions.css:251 — .solutions-index__link::after */
  transition: opacity var(--dur) var(--ease-out);

/* src/styles/solutions.css:292 — .solutions-index__link .ph */
  transition: transform var(--dur) var(--ease-out), color var(--dur-fast);

/* src/styles/base.css:196 — .skip-link */
  transition: transform var(--dur) var(--ease-out);
```

## Target

Every line above uses `var(--dur-ui)` (200ms) instead of `var(--dur)` or `380ms`:

```css
/* src/styles/components.css .btn */
  transition: background-color var(--dur-ui) var(--ease-out),
    color var(--dur-ui) var(--ease-out), border-color var(--dur-ui) var(--ease-out),
    transform var(--dur-ui) var(--ease-out), box-shadow var(--dur-ui) var(--ease-out);

.btn .ph { font-size: 16px; transition: transform var(--dur-ui) var(--ease-out); }
.text-link .ph { font-size: 13px; transition: transform var(--dur-ui) var(--ease-out); }
/* .flow__step::before */ transition: background-color var(--dur-ui), box-shadow var(--dur-ui);
/* .nav-link::after */ transition: transform var(--dur-ui) var(--ease-out);
/* .solutions-index__link */ transition: background-color var(--dur-ui) var(--ease-out);
/* .solutions-index__link::after */ transition: opacity var(--dur-ui) var(--ease-out);
/* .solutions-index__link .ph */ transition: transform var(--dur-ui) var(--ease-out), color var(--dur-fast);
/* .skip-link */ transition: transform var(--dur-ui) var(--ease-out);
```

## Repo conventions to follow

- Tokens are consumed as `var(--name)`. `--dur-ui` is defined by plan 001 in `src/styles/tokens.css`.
- Color-only transitions already use `var(--dur-fast)` (180ms); leave those alone, e.g. `src/styles/components.css:96`.

## Steps

1. `src/styles/components.css:21-23`: in the `.btn` rule, replace every `var(--dur)` with `var(--dur-ui)`.
2. `src/styles/components.css:28`: `transition: transform 380ms var(--ease-out);` → `transition: transform var(--dur-ui) var(--ease-out);`.
3. `src/styles/components.css:101`: `var(--dur)` → `var(--dur-ui)`.
4. `src/styles/components.css:233`: both `var(--dur)` → `var(--dur-ui)`.
5. `src/styles/layout.css:173`: `var(--dur)` → `var(--dur-ui)`.
6. `src/styles/solutions.css:232`, `:251`, `:292`: `var(--dur)` → `var(--dur-ui)` (in `:292`, leave `color var(--dur-fast)` as is).
7. `src/styles/base.css:196`: `var(--dur)` → `var(--dur-ui)`.

## Boundaries

- Only the lines listed. Do NOT change `--dur` uses in `layout.css:82` (`.site-nav::before`, the nav background fading in on scroll, which is a page-level state) or in `home.css`.
- Do NOT edit `.btn:active` or other press rules (plan 003), hover gating (plan 004), the FAQ (plan 006), the brand mark (plan 009) or the mobile sheet (plan 010).
- If plan 001 hasn't been applied (`--dur-ui` undefined), STOP.

## Verification

- **Mechanical**: `npx vite build` → `✓ built`. `grep -n "var(--dur)" src/styles/components.css src/styles/base.css` returns nothing; `src/styles/solutions.css` has none of its three edited lines left with `var(--dur)`.
- **Feel check** (`npx vite`):
  - Hover the nav links: the underline sweeps in quickly and keeps up with the cursor.
  - Hover "Start the conversation": the lift and arrow nudge feel immediate, not floaty.
  - On `/ai-solutions/`, hover the five service links under the hero: the highlight and arrow respond in about 200ms.
  - DevTools Animations panel at 10%: transitions complete in about 200ms of real time.
- **Done when**: all nine locations use `--dur-ui` and the build passes.

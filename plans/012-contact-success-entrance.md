# 012 — Give the contact form's success moment an entrance

- **Status**: DONE (2026-11-07)
- **Commit**: 870377a (working tree; line numbers from 2026-11-07)
- **Severity**: LOW (missed opportunity: rare, high-emotion moment)
- **Category**: Missed opportunities
- **Depends on**: 001 (`--dur-reveal`)
- **Estimated scope**: 1 file, ~30 lines CSS (no JS change)

## Problem

Sending the contact form is the single most rewarding moment on the site. It's rare (once per visitor at most), so it's allowed a little delight. Right now the form disappears and the success card is appended instantly; there's no sense of arrival.

```js
/* src/js/pages/contact.js:184-200 — current (unchanged by this plan) */
  function showSuccess(payload) {
    form.hidden = true;
    hideFormError();

    const success = document.createElement("div");
    success.className = "form-success";
    success.setAttribute("role", "status");
    success.innerHTML = `
      <span class="form-success__icon"><i class="ph ph-check" aria-hidden="true"></i></span>
      <h3 tabindex="-1" data-success-title>Message received.</h3>
      <p>…</p>
    `;
    card.append(success);
    …focus title…
  }
```

```css
/* src/styles/components.css:517-538 — current */
.form-success { display: flex; flex-direction: column; align-items: flex-start; gap: 16px; padding: …; border: …; border-radius: var(--radius-lg); background: var(--success-bg); box-shadow: var(--shadow-card), var(--inset-top); }
.form-success__icon { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 50%; background: rgba(87, 214, 160, 0.14); color: var(--success); font-size: 22px; }
```

## Target

A short, choreographed entrance as soon as the card is inserted (CSS keyframes run on insertion, so no JS is needed):

1. The card fades and rises 12px over 400ms.
2. The check badge scales from 0.9 to 1 with a gentle overshoot (it's a celebration, so a little bounce fits), starting 80ms later.
3. The heading and paragraph follow 40ms apart.

```css
/* src/styles/components.css — add after the .form-success .text-link rule */
@media (prefers-reduced-motion: no-preference) {
  .form-success {
    animation: success-in var(--dur-reveal) var(--ease-out) both;
  }

  .form-success__icon {
    animation: success-badge 420ms cubic-bezier(0.34, 1.4, 0.64, 1) 80ms both;
  }

  .form-success h3 {
    animation: success-in var(--dur-reveal) var(--ease-out) 120ms both;
  }

  .form-success p {
    animation: success-in var(--dur-reveal) var(--ease-out) 160ms both;
  }
}

@keyframes success-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}

@keyframes success-badge {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
}
```

The badge curve `cubic-bezier(0.34, 1.4, 0.64, 1)` overshoots by a few percent, a subtle bounce reserved for this one celebratory moment. It's literal here because it's used only once. Never start from `scale(0)`.

Reduced motion: the whole block is inside `prefers-reduced-motion: no-preference`, so those users get the card immediately (and the global rule in `src/styles/motion.css` would cut it to about 0ms anyway).

## Repo conventions to follow

- Conditional entrances already use this exact wrapper: `src/styles/home.css:1040` `@media (prefers-reduced-motion: no-preference) { .applied-panel.is-active .applied-flow__step { animation: … } }`.
- `--dur-reveal: 400ms` and `--ease-out` from `src/styles/tokens.css` (plan 001).

## Steps

1. In `src/styles/components.css`, directly after the `.form-success .text-link { … }` rule (around line 551-553), insert the `@media (prefers-reduced-motion: no-preference) { … }` block and the two `@keyframes` from Target, verbatim.

## Boundaries

- Do NOT edit `src/js/pages/contact.js`.
- Do NOT change the success card's static styling.
- Do NOT animate the form's disappearance. It's hidden and replaced in one step, and focus moves to the heading, which is correct.

## Verification

- **Mechanical**: `npx vite build` → `✓ built`.
- **Feel check**: `/contact/`. Without a `VITE_CONTACT_ENDPOINT` the form falls back to an email draft, so to see the success state, temporarily call `showSuccess` from DevTools if exposed, or set a dummy endpoint that returns 200 (e.g. a local mock). Then:
  - The card rises into place, the check badge pops with a tiny overshoot just after, and the text follows.
  - Everything settles within about 0.6s, a moment rather than a show.
  - At 10% speed: no element starts from nothing (the badge starts at 0.9 scale), and the overshoot is subtle (under about 5%).
  - With reduced motion emulated: the card appears instantly.
- **Done when**: the success card, badge and text animate in on insertion as specified.

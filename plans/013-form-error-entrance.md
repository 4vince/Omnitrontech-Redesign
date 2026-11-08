# 013 — Let form errors arrive next to their field instead of popping in

- **Status**: DONE (2026-11-07)
- **Commit**: 870377a (working tree; line numbers from 2026-11-07)
- **Severity**: LOW (missed opportunity)
- **Category**: Missed opportunities (preventing a jarring change)
- **Estimated scope**: 1 file, ~20 lines CSS (no JS change)

## Problem

On `/contact/`, validation messages appear abruptly:

- **Field errors** are created and appended under the field (`src/js/pages/contact.js:10-22`, `getErrorNode` → `field.append(node)`), and removed on fix.
- **The form-level error** is toggled with the `hidden` attribute (`src/js/pages/contact.js:139-150`, `formError.hidden = false`).

Both pop in at full opacity, so the layout jumps and the eye isn't led to the field that needs attention.

```css
/* src/styles/components.css:424-431 — current */
.field-error {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  color: var(--danger);
  font-size: 0.74rem;
  line-height: 1.45;
}

/* src/styles/components.css:466-477 — current */
.form-error {
  display: flex;
  …
  font-size: 0.8rem;
  line-height: 1.5;
}
```

## Target

A 160ms fade with a 4px drop from just above, so the message reads as coming *from* the field. Keyframe animations play automatically when a node is inserted (field errors) or when `hidden` is removed (the form error goes from `display: none` to displayed), so no JS change is needed.

```css
/* src/styles/components.css — add after the .form-error rules */
@media (prefers-reduced-motion: no-preference) {
  .field-error,
  .form-error {
    animation: message-in 160ms var(--ease-out) both;
  }
}

@keyframes message-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
}
```

Why keyframes rather than a transition: these elements enter from `display: none` or from not existing, where a transition can't run without extra JS or `@starting-style`. An error that is re-shown replays the short entrance, which is the right feedback. At 160ms there's no restart jank to worry about.

Removal stays instant: a fixed field's error disappears as soon as it's valid, which is the correct confirmation.

## Repo conventions to follow

- Same `@media (prefers-reduced-motion: no-preference)` wrapper as `src/styles/home.css:1040`.
- `--ease-out` from `src/styles/tokens.css`.

## Steps

1. In `src/styles/components.css`, after the last `.form-error …` rule (the block starting at line 466 and its child rules), insert the `@media` block and the `@keyframes message-in` from Target, verbatim.

## Boundaries

- Do NOT edit `src/js/pages/contact.js`.
- Do NOT animate the field border or background color change (`.field.has-error .input`); it already transitions via `.input`.
- Do NOT add an exit animation.

## Verification

- **Mechanical**: `npx vite build` → `✓ built`.
- **Feel check** (`/contact/`):
  - Click "Send message" with empty fields: each required field's message slides down into place from just under its input, quickly (about 160ms), all at once.
  - Fill a field and blur it: its message disappears immediately.
  - Trigger the form-level error (submit with the network offline in DevTools, if an endpoint is configured): it fades down into place.
  - With reduced motion emulated: messages appear instantly.
- **Done when**: both error types animate in as specified, and removal is unchanged.

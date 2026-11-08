# Animation improvement plans

Written by `improve-animations` on 2026-11-07 against commit `870377a` (plus the uncommitted redesign working tree). Scope: the whole site except the homepage robot hero, which was reviewed separately with `review-animations`.

Each plan is self-contained. Hand any one to an agent, or run `improve-animations execute plans/NNN-….md`.

| # | Plan | Severity | Status |
| --- | --- | --- | --- |
| 001 | [Strengthen the easing curves and add a motion duration scale](001-motion-tokens.md) | LOW (prerequisite) | DONE |
| 002 | [Move UI hovers and state changes onto a 200ms duration](002-ui-duration-token.md) | HIGH | DONE |
| 003 | [Make button press feedback immediate (and actually apply on hovered buttons)](003-button-press-feedback.md) | HIGH | DONE |
| 004 | [Gate hover movement to devices that actually hover](004-gate-hover-motion.md) | MEDIUM | DONE |
| 005 | [Make the showcase carousel slide in the direction you navigated](005-showcase-direction.md) | MEDIUM | DONE |
| 006 | [Tighten the FAQ accordion and let the answer arrive](006-faq-accordion.md) | MEDIUM | DONE |
| 007 | [Animate the showcase progress bar with transform, not width](007-showcase-progress-transform.md) | LOW | DONE |
| 008 | [Tighten the showcase flow-step stagger](008-showcase-step-stagger.md) | LOW | DONE |
| 009 | [Reduce the logo's hover spin](009-brand-mark-hover.md) | LOW | DONE |
| 010 | [Give the mobile menu a deliberate open and a quick close](010-mobile-sheet-asymmetric.md) | LOW | DONE |
| 011 | [Match the AI Solutions hero's scene entrance to the homepage](011-solutions-canvas-settle.md) | LOW | DONE |
| 012 | [Give the contact form's success moment an entrance](012-contact-success-entrance.md) | LOW (opportunity) | DONE |
| 013 | [Let form errors arrive next to their field](013-form-error-entrance.md) | LOW (opportunity) | DONE |
| 014 | [Roll the showcase counter with the slide change](014-showcase-counter-roll.md) | LOW (opportunity) | DONE |

## Recommended execution order

1. **001** first: it adds the tokens (`--dur-press`, `--dur-ui`, `--dur-panel`, `--dur-reveal`) and the stronger curves that most other plans use.
2. **002 → 003 → 004**, in that order. All three edit the `.btn` rules in `src/styles/components.css`: 002 sets the base duration, 003 adds the press rule after the hover rules, and 004 moves hover transforms into a gated block placed before 003's press rule.
3. **005**, then **014**. 014 uses the `dir` option that 005 adds to `render()` in `src/js/pages/home.js`.
4. **006, 007, 008, 009, 010, 011, 012, 013** in any order. They are independent; each only needs 001.

## Dependencies

- 002, 003, 006, 007, 008, 009, 011, 012 → 001
- 003 → 002
- 004 → 003 (placement of the `@media` block relative to the press rule)
- 014 → 005

## Already right (no plan)

Scroll reveals (`initReveal` batch with stagger), scrubbed parallax and the zoom hand-off, the AI Solutions section timelines and diagram build-ins, the site-wide reduced-motion handling (`src/styles/motion.css`), the nav background change on scroll, and form field focus states.

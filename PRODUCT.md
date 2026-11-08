# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary:** owners and operations leads at small and mid-sized businesses in Asia-Pacific. They mostly browse on mobile and want to know within seconds what Omnitron does and whether it fits their business.
- **Secondary:** technical evaluators who check how the work is actually done (stack, integration, safeguards) before or after the owner gets in touch.
- **Job:** understand what Omnitron does, see that it fits how their business works, and start a conversation.

## Product Purpose

Omnitron designs and builds AI systems that take repeat work off a team, connect the tools the business already uses, and leave the judgement calls with its people. The site exists to make that clear fast and to lead to one action: **Start the conversation**.

Success means the visitor understands the offer in about ten seconds, finds one obvious next step, and reaches the contact form.

## Positioning

- **People keep the decisions.** The system prepares the work and a person makes the call. Approvals, exceptions and judgement stay with the client's staff. This is the brand promise behind the hero copy and every applied example, whose last step is a person deciding.
- **Five lines, one system.** Strategy & Consulting, Workflow Automation, AI Agents, Customer Support, and Data & Reporting are presented as one shared foundation, not five separate products.
- **Built on existing tools.** Omnitron connects the CRM, inbox, ERP, finance systems and spreadsheets a business already runs. There is no replatforming.

## Operating Context

- Omnitron is based in Singapore and serves businesses across Asia-Pacific. The site copy states "Built in Singapore". The client did not select this as a differentiator, so it is a fact, not the lead.
- The visitor's problem: work hides in hand-offs between email, spreadsheets and people; tools don't talk to each other; every decision queues behind a few people; data exists but its signal arrives too late.
- Sectors the copy names: manufacturing, financial services, HR & recruitment, professional services, logistics, retail, healthcare, legal, property.
- Contact path: one enquiry form (name, email and message required; subject optional; service prefill). It posts to `VITE_CONTACT_ENDPOINT` when configured and otherwise falls back to `mailto:hello@omnitron.tech`. The published reply promise is within two working days.

## Capabilities and Constraints

- **Pages in scope:** Home `/`, AI Solutions `/ai-solutions/`, Contact `/contact/`.
- **Service content source of truth:** `src/js/content/services.js`. Its headlines, capabilities and phases mirror the live omnitron.tech service pages, and the redesign must not drift from the published offer.
- **Out of scope:** cybersecurity and Intelligence & Advisory content, a rebrand, and the old site wording.
- **Copy:** summaries, not full explanations. Visuals carry the explanatory weight.
- **Stack (existing):** Vite multi-page site, vanilla ES modules, GSAP + ScrollTrigger, Lenis, Three.js (lazy-loaded), Fontsource fonts, Phosphor icons.
- **Fallbacks:** Three.js scenes skip WebGL on small screens and under reduced motion, with static fallbacks. Physical-device checks are still outstanding.
- **Undecided:** final per-service workflow step chains.

## Brand Commitments

- Name: **Omnitron** (domain omnitron.tech). Contact: hello@omnitron.tech.
- Voice: plain, practical and calm. It names the operational pain ("the ten small hand-offs") instead of AI hype, and always returns to people staying in control.
- Visual commitments that already bind are recorded in `OmnitronTech_Redesign_Design_Brief.md`, which stays the authority on direction.

## Evidence on Hand

- **Real proof exists but is not yet published.** Case studies, logos, testimonials or metrics are coming later. Until they arrive, the four proof slots (manufacturing, financial services, HR & recruitment, professional services) stay visible as honest "Reserved" placeholders.
- **Never fabricate** client names, logos, testimonials, quotes, metrics, pricing or deployment claims to fill these slots.
- **Media assets:** `public/videos/ai-data-analytics.mp4` and its poster `.jpg`, `public/01_ai_human_bust.svg`, `public/favicon.svg`.

## Product Principles

1. **Clarity in seconds.** Every surface answers "what does Omnitron do for me?" before anything else.
2. **Show the person in the loop.** Every workflow, example or claim ends with a human decision, never full autonomy.
3. **One path forward.** A single conversion action across the site; no competing CTAs.
4. **Fit, don't replace.** Describe work in terms of the visitor's existing tools and processes.
5. **Honest proof.** An empty, labelled slot beats a fake one.

## Accessibility & Inclusion

- Mobile-first audience: layouts and interactions must work fully at phone width.
- Reduced motion is respected: scroll-driven and 3D sequences have still fallbacks.

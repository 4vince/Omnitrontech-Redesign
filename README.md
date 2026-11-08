# Omnitron — visual-first AI services site

A multi-page Vite site for SME owners and operations leads in Asia-Pacific.
The visual system is light, off-white, and blue, with workflow-focused 3D and
scroll-driven storytelling.

## Run it

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build in dist/
npm run preview   # serve the production build
```

## Pages

- `/` — pinned hero sequence, problem, proof, FAQ, applied showcase, CTA, footer
- `/ai-solutions/` — service index, operating rules, five service rows
- `/contact/` — enquiry form with validation, optional subject, service prefill
  and an email fallback when no form endpoint is configured

## Stack

- Vite 8, vanilla ES modules
- GSAP + ScrollTrigger, Lenis smooth scrolling
- Three.js workflow scenes (lazy-loaded when visible)
- DM Sans / Manrope / JetBrains Mono via Fontsource
- Phosphor icons

## Structure

```
index.html
ai-solutions/index.html
contact/index.html
public/favicon.svg
src/
  js/
    main.js              app shell + page dispatch
    core/                theme, Lenis/GSAP motion
    home/                pinned hero, Three.js scene
    pages/               home, solutions, contact behaviour
    ui/                  nav, footer, FAQ, rail, progress
    content/             copy and service data
  styles/
    tokens.css           themes, colour, type, spacing
    base.css             reset and primitives
    layout.css           full-bleed bands, nav, CTA, footer, rail
    components.css       cards, tabs, flow, forms, orbit
    home.css             hero sequence and finale
    pages.css            secondary page layouts
    motion.css           reveal defaults and reduced motion
```

## Hero timing

The desktop hero track is 420vh. ScrollTrigger reads a target progress, and a
GSAP ticker lerps toward it, so the crossfades and service panel stay smooth even
with fast wheel input. Service copy starts entering around 43% and the panel
settles by 61%. Touch, narrow screens, and `prefers-reduced-motion` use a static
stacked hero with a service switcher instead.

## Contact form

The form validates on the client and offers a prefilled `mailto:` fallback.
To wire a real inbox, set an endpoint in `.env`:

```bash
VITE_CONTACT_ENDPOINT=https://your-endpoint.example/contact
```

The endpoint should accept a JSON `POST` with `name`, `email`, `subject`,
`message`, `page`, and `sentAt`. Without an endpoint, the form explains that
nothing was sent and provides a prefilled email link.

## Theme

The site uses a fixed light theme across all pages.

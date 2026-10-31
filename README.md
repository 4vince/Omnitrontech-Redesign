# Omnitron — full-bleed redesign

A multi-page Vite build of the Omnitron site: dark-first, full-bleed bands, a
pinned cinematic hero, and a slower scroll-driven service sequence.

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
- `/contact/` — enquiry form with validation, service prefill and mailto fallback

## Stack

- Vite 8, vanilla ES modules
- GSAP + ScrollTrigger, Lenis smooth scrolling
- Three.js core scene on the desktop home page only (lazy-loaded)
- Sora / Manrope / JetBrains Mono via Fontsource
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

The desktop hero track is 1200vh. ScrollTrigger reads a target progress, and a
GSAP ticker lerps toward it, so the crossfades and service panel stay smooth even
with fast wheel input. Service copy starts entering around 43% and the panel
settles by 61%. Touch, narrow screens, and `prefers-reduced-motion` use a static
stacked hero with a service switcher instead.

## Contact form

The form validates on the client and always offers a prefilled `mailto:` link.
To wire a real inbox, set an endpoint in `.env`:

```bash
VITE_CONTACT_ENDPOINT=https://your-endpoint.example/contact
```

The endpoint should accept a JSON `POST` with `name`, `email`, `subject`,
`message`, `page`, and `sentAt`. Without an endpoint the form runs in demo mode:
it validates, shows the success state, and explains that nothing was sent.

## Theme

The site uses a fixed dark theme across all pages.

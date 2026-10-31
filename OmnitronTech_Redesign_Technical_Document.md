# Omnitron.Tech — Technical Document

| | |
|---|---|
| **Version** | 1.0 |
| **Date** | 2026-10-19 |
| **Owner** | Vincent |
| **Approver** | Omnitron CEO Aric Hidir |
| **Status** | Awaiting approval |

---

## 1. Introduction

### 1.1. Purpose

This document defines the technical specifications, implementation approach, architecture, dependencies and deployment requirements for the redesigned Omnitron.tech.

### 1.2. Project Overview

- **Existing website:** <https://www.omnitron.tech/>
- **Website type:** Corporate services marketing site (B2B)
- **Primary purpose:** Help SME owners and operations leads in Asia-Pacific understand what Omnitron does and start a conversation through one contact form.
- **Target users:** Owners and operations leads at small and mid-sized businesses
- **Implementation scope:**
  - **Pages:** Home, AI Solutions, Contact.
  - **Components:** compact navigation, footer, service switcher, scene frame, flow diagram, proof slot, contact form.
  - **Features:** real-time 3D hero and service visuals (three.js), scroll-driven animation (GSAP), a single contact path replacing the "Michelle" live agent.

### 1.3. Related Documents

1. Product Requirements Document (PRD)
2. Design System Plan
3. Visual Board: <https://www.figma.com/design/LGAgUdpqJZZS1iJnru3JUI/OmnitronTech-Redesign?node-id=0-1&t=aYkdUOcaGYvGOfFz>

### 1.4. Scope and Limitation

- Three pages: Home, AI Solutions, Contact.
- Shared navigation and footer, and the component set.
- The three.js hero scene and five-form service scene, each with a still-image fallback.
- GSAP scroll choreography and smooth scrolling.
- One contact form with validation, spam protection and delivery to one inbox.
- Responsive layouts.
- Proof, partner and counter blocks as placeholder-capable components.

**Exclusions:**

- All cybersecurity and Intelligence & Advisory content.
- Rebuilding the "Michelle" agent, and any third-party chat widget.

---

## 2. Technical Overview

### 2.1. Tech Stack

| Layer | Technology | Purpose | Status |
|---|---|---|---|
| Frontend | Next.js (App Router), React, JavaScript (vanilla), TypeScript | Pages, routing, components, interactions | Proposed |
| Styling | Tailwind CSS, with design tokens as CSS variables | Layout and visual styling from one source of truth | Proposed |
| 3D | three.js | Hero field and five-form service scene | Confirmed in PRD |
| Animation | GSAP | Scroll-driven motion and reveals | Confirmed in PRD |
| Smooth scroll | Lenis, driven from the GSAP ticker | Smooth scrolling that keeps native scroll behaviour | Proposed |

### 2.2. System Requirements

1. **Supported browsers:** the last two versions of Chrome, Safari, Firefox and Edge. iOS Safari 16 or later. Current Android Chrome. This may be necessary for the 3D renderings and animations for the proposed redesign.
2. **Browsers without 3D support:** receive still images, and the site stays complete.
3. **Supported operating systems:** any that run the browsers above.
4. **Development environment:** any machine that runs Node and a modern browser. A real mid-range Android phone and an iPhone are required for testing the 3D and motion.

---

## 3. System Architecture

### 3.1. Description

1. **Presentation layer:** Home, AI Solutions and Contact pages, the shared layout (navigation, footer, skip link), and the component set. Includes the scene frame, which shows a still image first and the live 3D afterwards.
2. **Application layer:** routing; redirects; contact-form validation and error handling; scroll and motion control (GSAP and Lenis); the scene quality governor that lowers detail on slow devices; page metadata.

### 3.2. Data Flow

**Page load with 3D**

1. The page and the still hero image load first. Headline and main button are readable immediately.
2. After first paint, the scene code loads and the 3D fades in over the still.
3. If 3D is unavailable, the device is slow, data-saver is on, or reduced motion is set, the still stays and nothing is lost.

---

## 4. Project Structure and File Organization

```text
omnitron-web/
├── public/
│   └── imagery/
│       ├── posters/        # hero and five service-form stills
│       ├── photo/          # team and workspace photography
│       └── og/             # social sharing images
├── src/
│   ├── app/
│   │   ├── layout          # shared shell: navbar, footer, skip link, fonts
│   │   ├── page            # Home
│   │   ├── ai-solutions/page
│   │   ├── contact/page
│   │   ├── globals.css     # design tokens
│   │   ├── icon.svg
│   │   ├── sitemap
│   │   └── robots
│   ├── components/
│   │   ├── ui/             # Button, Card, FormField, Tag, Accordion
│   │   ├── layout/         # Navbar, Footer, SkipLink
│   │   ├── home/           # Hero, ProblemSection, ProofBand, FaqSection, CtaPanel
│   │   ├── solutions/      # ServiceSwitcher, ServiceRow
│   │   ├── contact/        # ContactForm, ConfirmationMessage
│   │   └── visuals/        # SceneFrame, FlowDiagram, BeforeAfterBar, StatCounter
│   ├── imagery/
│   │   ├── scenes/         # field, morph core
│   │   ├── shaders/
│   │   └── glyphs/         # five service icons (SVG)
│   ├── content/            # home.ts, services.ts, faq.ts, proof.ts, contact.ts
│   ├── config/             # site.ts: nav links, social links, form service address
│   ├── hooks/              # useReducedMotion, useSceneQuality, useActiveTab
│   ├── lib/
│   │   ├── motion/         # GSAP setup, reveal patterns
│   │   ├── scroll/         # smooth scroll setup
│   │   ├── scene-quality
│   │   └── validate-form   # browser-side form checks
│   └── types/
├── tests/
├── next.config             # redirects: /services, /advisory → /ai-solutions
├── .env.example            # public values only
├── package.json
├── README.md
└── .gitignore
```

### 4.1. Directories Explained

| Directory / File | Responsibility |
|---|---|
| `public/imagery/` | Optimised stills, photographs and social images served directly |
| `src/app/` | Routes, layouts, metadata, sitemap, form endpoint |
| `src/app/globals.css` | Design tokens: colours, type, spacing, motion speeds |
| `src/components/ui/` | Small reusable building blocks |
| `src/components/layout/` | Navigation, footer, skip link (on every page) |
| `src/components/home/`, `solutions/` | Page sections assembled from components |
| `src/components/visuals/` | Scene frame, diagrams, bars, counters |
| `src/imagery/` | three.js scenes, shaders and SVG icons |
| `src/content/` | All copy and proof content, separate from layout |
| `src/lib/` | Shared logic: motion setup, scene governor, form validation |

---

## 5. Page Routing Specifications

### 5.1. Route Definitions

| Route | Page / Component | Access | Description |
|---|---|---|---|
| `/` | Home | Public | Outcome headline, problem, service switcher, proof, questions, closing call to action |
| `/ai-solutions` | AI Solutions | Public | Five service sections with diagrams |
| `/contact` | Contact | Public | Contact form and company details |

### 5.2. Page Specifications

#### 1. Home Page

- **Route:** `/`
- **Purpose:** Show what Omnitron does in seconds and lead to one action.
- **Main component:** `HomePage`
- **Shared components:** Navbar, Footer, SkipLink, SceneFrame, ServiceSwitcher, ProofSlot
- **Required content:** outcome headline and sub-line, three problem beats, five service outcomes, proof placeholders, closing line. All text written fresh.
- **User interactions:** main button, secondary link, service tabs, menu.
- **Error and empty states:** 3D unavailable shows stills. Proof, partner and counter blocks show placeholders or stay hidden until real material exists.

#### 2. AI Solutions Page

- **Route:** `/ai-solutions`
- **Purpose:** Help a visitor find the service that fits their problem and move to contact.
- **Main component:** `AiSolutionsPage`
- **Shared components:** Navbar, Footer, SceneFrame, ServiceRow, FlowDiagram, Tag, CtaPanel
- **Required content:** page headline and intro, five service sections (Strategy & Consulting, Intelligent Automation, Agentic Solutions, Customer Experience, Data & Insights), each with outcome copy, a diagram, and a closing line.
- **User interactions:** scroll transitions between services, a contact button in each section, optional anchor links.
- **Data sources:** `services.ts` or `services.js`

#### 3. Contact Page

- **Route:** `/contact`
- **Purpose:** Make starting a conversation quick, and replace the live agent.
- **Main component:** `ContactPage`
- **Shared components:** Navbar, Footer, FormField, Button, ConfirmationMessage
- **Required content:** headline "Start the conversation", a line on what happens next and the reply time, company email, Singapore headquarters, an optional privacy note.
- **User interactions:** four-field form, send button, inline errors, confirmation.

### 5.3. Navigation Behavior

- **Link destinations:** Home `/`, AI Solutions `/ai-solutions`, Contact `/contact`. The main button "Start the conversation" always goes to `/contact`.
- **Active page indicator:** the current link shows ink text with a thin blue underline.
- **Browser back and forward:** standard history behaviour, and scroll position is restored. Smooth scrolling never overrides it.
- **External links:** social links open in a new tab with safe link attributes and clear labels.

---

## 6. Component Specification

### 6.1. Components Library

| Component | Responsibility | Inputs / Props | Behavior |
|---|---|---|---|
| Navbar | Main navigation | Links, active route, main button | Sticky; marks current page; collapses to a sheet on phones |
| Button | User action | Label, href or action, variant (primary, secondary, ghost) | Navigates or submits; one primary per screen |
| Card | Grouped content | Number, title, description, optional link | Lifts on hover; links if given |
| FormField | Collect input | Label, type, value, rule, error text | Validates; shows errors beside the field |
| Footer | Secondary navigation | Links, email, social items | Shared on every page; includes labelled social links |
| SceneFrame | Show the 3D safely | Still image, scene variant, hidden flag | Still first, 3D after idle, pauses off-screen, falls back to still |
| ServiceSwitcher | Compare five services | Five tab items | Tab selection reshapes the scene; arrow-key operable |
| FlowDiagram | Make a service tangible | Three steps, service, illustrative flag | Draws once on scroll |
| ProofSlot | Hold evidence | Logo, outcome, metric, state | Placeholder or filled |
| Tag | Label categories | Text, variant | Static |

### 6.2. Component Details

#### 1. Scene Frame

- **Purpose:** Hold a three.js scene without risking speed or accessibility.
- **Location:** `src/components/visuals/scene-frame`
- **Inputs / Props:** `variant` (hero, morph, ambient), `poster` (required, with width and height), `form` (for the morph scene), `decorative` (default true).
- **State:** `status` (still, loading, live, failed).
- **Events:** scroll progress (from GSAP), pointer movement (desktop), visibility change.
- **Validation:** refuses to render without a still image.
- **Loading state:** shows the still while the scene code loads.
- **Error state:** on any failure, or if the graphics context is lost, reverts to the still with no layout jump.
- **Accessibility:** hidden from screen readers. Adjacent text carries the meaning. A still image is shown when reduced motion is set.
- **Dependencies:** three.js, GSAP.

#### 2. Service Switcher

- **Purpose:** Let a visitor explore five services without leaving the page.
- **Location:** `src/components/solutions/service-switcher`
- **Inputs / Props:** `items[5]`, each with `index`, `title`, `outcome`, `href`, `form`.
- **State:** `activeIndex`, shared with the scene so the visual reshapes.
- **Events:** click, tap, arrow keys, Home and End keys, scroll progress on desktop.
- **Validation:** none.
- **Loading state:** works with the still image before the scene loads.
- **Error state:** the scene falling back doesn't affect the tabs or text.
- **Accessibility:** tablist, tab and tabpanel roles, visible focus, roving tabindex, active state announced.
- **Dependencies:** SceneFrame.

#### 3. Contact Form

- **Purpose:** Collect and send one message.
- **Location:** `src/components/home/contact-form.tsx` (or `contact/`)
- **Inputs / Props:** none. Field rules from `src/lib/validation`.
- **State:** field values, per-field errors, status (idle, sending, error, success).
- **Events:** change, blur, submit.
- **Validation:** see section 7.2.
- **Loading state:** the send button shows a spinner, keeps its label and blocks repeat presses.
- **Error state:** per-field messages, plus a form-level message on send failure. The visitor's text is kept.
- **Accessibility:** visible labels, errors tied to fields, first error receives focus, confirmation takes focus and is announced.

#### 4. NavBar

- **Purpose:** Move between the three pages and offer the main action.
- **Location:** `src/components/layout/navbar.tsx`
- **Inputs / Props:** link list, current path.
- **Events:** click, Escape, focus change.
- **Accessibility:** landmark navigation, `aria-current` on the active link, focus moves into and back out of the sheet.

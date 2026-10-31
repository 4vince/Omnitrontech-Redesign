# Omnitron.Tech — Design System Plan

| | |
|---|---|
| **Version** | 1.0 |
| **Date** | 2026-10-17 |
| **Owner** | Vincent |
| **Approver** | Omnitron CEO Aric Hidir |
| **Status** | Awaiting approval |

---

## I. Project Overview

### 1.2. Purpose

This section explains how the redesigned Omnitron.tech is put together and how its parts work together. A busy SME owner should understand what Omnitron does within seconds, see which service fits, and start a conversation with one clear action.

- **Project name:** Omnitron.Tech
- **Project type:** Website redesign
- **Existing website:** <https://www.omnitron.tech/>
- **Primary users:** Owners and operations leads at small and mid-sized businesses in Asia-Pacific, mostly browsing on a phone first. The secondary audience is technical evaluators who check whether Omnitron is credible.
- **Primary objective:** Help a first-time visitor understand what Omnitron does and start a conversation with one clear action, "Start the conversation".
- **Scope:**
  - **Pages:** Home, AI Solutions and Contact.
  - **Features:** a three-item menu, a service switcher for the five AI Solutions service lines, 3D and scroll-driven visuals, data visuals, slots for real proof, a question list, and one four-field contact form that replaces the "Michelle" live agent.
  - **Systems:** a design system covering colour, type, layout, motion and components.
  - **Out:** all cybersecurity and Intelligence & Advisory content, a rebrand, and other languages.
- **Design reference:**
  - PRD: `OmnitronTech_Redesign_PRD.pdf` (v1.0, 2026-10-16)
  - Omnitron competitor: <https://www.databricks.com/overview>
  - Visual board: <https://www.figma.com/design/LGAgUdpqJZZS1iJnru3JUI/OmnitronTech-Redesign?node-id=0-1&t=aYkdUOcaGYvGOfFz>

---

## II. System Objectives

### 1. Improve navigation and information architecture

- Cut the dropdown menus to three items: Home, AI Solutions and Contact.
- Move the five services from a menu into the AI Solutions page and the homepage switcher.
- Follow one homepage order: headline, problem, services, proof, questions, closing call to action.

### 2. Establish reusable UI components

- Build a shared kit of buttons, navigation, cards, service switcher, flow diagram, proof slot, tags, question list, form fields and footer.
- Colours, type, spacing and motion speeds come from one set of named values, so a change is made once.

### 3. Improve accessibility and performance

- Give every animation a complete still version for people who prefer less motion, for slow devices and for browsers without 3D.
- Fix the footer social links with clear labels and the correct profiles.
- Show a lightweight still image first, load the 3D afterwards, and run one 3D scene per page.

### 4. Preserve required existing functionality

- Keep the Omnitron name and logo mark, the five AI Solutions service lines, and Singapore as headquarters.
- Keep a working contact form as the single route to a conversation. The "Michelle" live agent is retired by design.
- Do not carry over the old site's wording, terminal labels or cybersecurity content.

---

## III. System Architecture

### 1. Layers and responsibilities

| # | Layer | Responsibility | Depends on |
|---|---|---|---|
| 1 | **Foundations** | Holds every shared value: colours, type scale, spacing, corner radius, borders, motion speeds, 3D settings. Nothing visual is defined anywhere else. | Nothing |
| 2 | **Components** | Reusable building blocks (button, navigation, card, service switcher, flow diagram, proof slot, tag, question list, form field, footer). Each carries all its states, a phone version and a still version. | Foundations |
| 3 | **Visual and motion** | Makes the site feel alive: the hero dot field, the five-form service visual, scroll-linked reveals and smooth scrolling. Always sits behind or beside text, never carries information alone. | Foundations, Components |
| 4 | **Page patterns** | Assembles components into standard sections: hero, problem, switcher band, proof, questions, closing call to action, service row. | Components, Visual and motion |
| 5 | **Pages** | Arranges patterns in a fixed order for Home, AI Solutions and Contact, and sets each page's title, description and sharing image. | Page patterns, Content |
| 6 | **Content** | Holds every word, image and diagram label, written fresh. Includes placeholder states for proof, partners and counters until real material is cleared. | Nothing (feeds layer 5) |
| 7 | **Resilience and access** | Guarantees the experience holds up: still images when 3D can't run, reduced-motion versions, keyboard use, screen-reader labels, correct redirects from old addresses. | Cuts across layers 2 to 5 |

### 2. Page to Layer Map

| Page | Patterns used | Notable components |
|---|---|---|
| Home | Hero, problem, switcher band, proof, questions, closing call to action | Scene frame, service switcher, proof slot, question list |
| AI Solutions | Hero, service row, closing call to action | Flow diagram |
| Contact | Hero with form | Form field, button, confirmation message |
| Every page | Navigation and footer | Navigation, footer, skip-to-content link |

### Outside the front end

- Contact form delivery: which inbox receives messages, and whether it feeds a customer-management system.
- Hosting and redirects setup.
- Analytics: the tool for measuring submissions, which the inquiry baseline needs.

---

## IV. Page and Module Structure

### Pages

| Page / Module | Purpose | Main components |
|---|---|---|
| Homepage | Show what Omnitron does in seconds and lead to the one action | Hero scene frame, headline, primary button, quiet link, problem section, service switcher, proof slots, question list, closing call to action |
| AI Solutions | Let a visitor find the service that fits their problem | Hero with the service visual, intro, five service rows, flow diagram, closing call to action |
| Contact | Make starting a conversation quick | Headline, contact details, four-field form, send button, error messages, confirmation message |

### Modules

| Module | Purpose | Main components |
|---|---|---|
| Navigation | Help visitors move around | Logo, three links (Home, AI Solutions, Contact), the main button, a menu for phones, current-page marker |
| Footer | Give fallback links and trust details | Links, company email, labelled social icons, skip-to-content link |
| Call to action | Keep one clear next step | "Start the conversation" button, always leading to Contact |
| Service switcher | Compare five services without leaving the page | Five tabs, outcome headline, one-sentence description, link, 3D form with still image |
| Scene frame | Show the living visual safely | Still image, 3D layer, fallback for slow devices and reduced motion |
| Flow diagram | Make a service tangible | Three steps (request, AI steps, result), with the result in blue |
| Proof slot | Hold real evidence | Placeholder state and filled state, counters only when real |
| Question list | Answer common worries | Expandable rows with plain-language answers |
| Form fields | Capture a message | Name, email, subject, message, with error and success states |
| Tag | Label categories and illustrative data | Small pill labels |

---

## V. Component Design

### Component summary

| Component | Inputs / Content | Behavior | Reusable? |
|---|---|---|---|
| Navbar | Logo, three links (Home, AI Solutions, Contact), active page, main button | Stays visible while scrolling and marks the current page. Collapses to a sheet menu on phones | Yes, every page |
| Button | Label, link or action | Navigates or submits. Only one primary button per screen | Yes |
| Card | Mono number, title, description, optional link | Lifts slightly on hover and opens related content when it has a link. Not used for decoration | Yes |
| Form field | Label, input type, value, validation rule, error message | Accepts input, validates on send, shows errors beside the field and keeps what was typed | Yes (name, email, subject, message) |
| Footer | Links, company email, social icons with labels and correct addresses | Gives secondary navigation. Includes the skip-to-content link | Yes, every page |
| Service switcher | Five tabs, each with number, title, one-sentence outcome, link and scene form | Selecting a tab reshapes the visual. Scroll can also advance it on the desktop | Yes (Home, AI Solutions hero) |
| Proof slot | Logo area, outcome line, metric | Shows a dashed placeholder with a "PLACEHOLDER" tag until real material is supplied | Yes |

### 5.1. User Interaction and Dataflow

#### A. Contact form

**Step flow**

| Step | What happens |
|---|---|
| 1 | The visitor opens the Contact page. The form is empty and the headline and details are already visible |
| 2 | They fill in the name, email, subject and message. All four are required |
| 3 | They press Send. The site checks the fields: none empty, email in a valid format |
| 4 | If valid, the message goes to the configured form service, which checks for spam and forwards it to one inbox |
| 5 | The visitor sees a confirmation, or a plain-language error |

- **Trigger:** the visitor presses Send.
- **System response:** the button shows a loading state and can't be pressed twice. Fields are checked in the browser first. Valid input goes to the form service, which applies spam checks and passes the message to the inbox.
- **Data involved:** name, email, subject and message, plus the time. Held in the browser while typing. Nothing is stored on the site afterwards.
- **Error handling:**
  - *Invalid input:* an error appears beside each affected field in plain words, what the visitor typed is kept, and focus moves to the first error.
  - *Send failed:* the form stays with the message intact, with "Something went wrong, your message is still here, please try again" and the company email as a backup.
  - *Spam check fails:* treated as a send failure, with no hint to the spammer.
- **Completion state:** the form is replaced by a thank-you message that takes focus. It states what happens next and the reply time.

#### B. Main call to action ("Start the conversation" button)

- **Trigger:** the visitor clicks or taps the main button anywhere on the site.
- **System response:** goes to the Contact page. The button has the same label, style and destination on every page.
- **Data involved:** none.
- **Error handling:** if the page is slow to load, the button shows a pressed state and the visitor stays on the current page until Contact appears.
- **Completion state:** the Contact page opens at the top, with the headline and empty form.

#### C. Service Switcher

- **Trigger:** the visitor selects a tab by click, tap or arrow keys. On the desktop, scrolling through the pinned section also advances it.
- **System response:** the tab becomes active, the outcome text and link change, and the 3D visual reshapes to that service's form in just over a second.
- **Data involved:** none read or sent. The five service descriptions come from the site's own content.
- **Error handling:** if the 3D can't run (slow device, no 3D support, data-saver, or it fails mid-visit), the still image for that service replaces it with no layout jump. The tabs and text work the same.
- **Completion state:** one service is active, with its text, link and visual (or still) showing.

#### D. Hero Scroll Sequence

- **Trigger:** the visitor loads the Home page and scrolls the first screen.
- **System response:** the still hero image shows first, and the 3D fades in after the page appears.
- **Data involved:** none read or sent. Scroll position and mouse position only drive the animation.
- **Error handling:** with reduced motion on, a slow device, data-saver, or no 3D support, the visitor gets the still image and no scroll-driven movement. All text is identical. If the 3D fails mid-visit, it reverts to the still without breaking the page.
- **Completion state:** visitor scrolls on to the switcher.

#### E. Social Links in Footer

- **Trigger:** the visitor selects a social icon.
- **System response:** the correct profile opens in a new tab. Each icon has a clear label for screen readers and a visible focus marker.
- **Data involved:** none from the visitor.
- **Error handling:** if a profile address is wrong or the page is unavailable, the visitor lands on that platform's own error page.
- **Completion state:** the profile is open in a new tab and the Omnitron site stays where it was.

---

## 6. Non-Functional Requirements

### A. Visual weight and image optimization

| ID | Requirement |
|---|---|
| NF-1 | Each page shows one live 3D scene at most, with a lightweight still image ready first |
| NF-2 | A still image is designed for the hero (wide and tall versions) and for each of the five service forms. It is a good-looking page on its own, not a loading placeholder |
| NF-3 | Photographs, stills and social images are prepared in several sizes and a modern compressed format, with set dimensions so nothing jumps as they load |
| NF-4 | On devices other than laptops/computers, 3D scenes use simpler shapes, designed on purpose |
| NF-5 | Motion is limited to movement and fading, never effects that push other content around |

### B. Visual consistency and maintainability

| ID | Requirement |
|---|---|
| NF-1 | Every colour, size, spacing and motion speed comes from one set of named design values, so a change is made once |
| NF-2 | Each component is documented with its purpose |
| NF-3 | Page sections are built from the same patterns (hero, switcher band, proof, questions, closing call to action), not redrawn per page |
| NF-4 | Copy, service descriptions and proof content are kept separate from layout, so text can change without a redesign |
| NF-6 | Proof, partner and counter blocks have two designed states: placeholder and filled |
| NF-7 | New components or motion types need design approval before they're added |
| NF-8 | Every page passes the design review checklist before sign-off |

### C. Search-friendly content design

| ID | Requirement |
|---|---|
| NF-1 | Each page has one main heading and a sensible order of subheadings |
| NF-2 | Every page has a title, short description and a designed sharing image |
| NF-3 | Every meaningful image has descriptive alt text. Decorative visuals are marked as decorative |
| NF-4 | Link text says where it goes ("Start the conversation", "Learn more about Intelligent Automation"), not "click here" |
| NF-5 | All important text is real text, not words baked into images |

---

## 7. System Design Acceptance Checklist

### 7.1. Alignment with PRD

| Approved PRD requirement | Supported by |
|---|---|
| Simplify navigation to one path | Three-item menu (Home, AI Solutions, Contact) |
| Business-friendly look replacing the terminal look | Design system, new copy rules, banned old wording |
| Services easy to find | Five-tab switcher and AI Solutions service rows |
| Turn visits into conversations | One contact form, "Michelle" removed |
| Real-time 3D and scroll storytelling | Scene frame, hero sequence, switcher, with still fallbacks |
| Proof with honest placeholders | Proof slots, counters hidden until real |
| Success metrics (10-second test, 5 of 5 task tests, SUS 75) | Used as the review and test criteria |
| Out of scope (cybersecurity, rebrand, "Michelle") | Excluded across every document |

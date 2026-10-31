# Omnitron.tech Website Redesign — Product Requirements Document (PRD)

| | |
|---|---|
| **Version** | 1.0 |
| **Date** | 2026-10-16 |
| **Owner** | Vincent |
| **Approver** | Omnitron CEO Aric Hidir |
| **Status** | Awaiting approval |

---

## 1. Product Overview

Omnitron.tech is a B2B services website that helps SME owners in Asia-Pacific hand repetitive work to AI and start a conversation with Omnitron. The redesign aims to improve visuals and proof, while keeping the Omnitron brand, its five AI Solutions service lines and a single contact path. The new Omnitron.tech rebuild aims to be a visually led, motion-rich marketing site that feels like it was made in 2030, structured on the proven page architecture of a category leader, Databricks, with entirely new copy and imagery written for Omnitron's SME audience. The prototype covers the homepage, one business area (AI Solutions), and Contact.

Three corrections feedback drive this version:

1. **Copy the competitor's structure, not our old site.** Old-site copy, labels and terminal vocabulary are retired.
2. **Cybersecurity / Intelligence & Advisory is out of scope for now.**
3. **The site must be visual.** Imagery, 3D (three.js) and scroll-driven animation (GSAP) are core requirements, not polish.

### 1.2. Product Vision

The vision for the redesigned website is to create a calm, visually led experience, with real-time 3D and scroll-driven storytelling, that enables SME owners and operations leads in Asia-Pacific to see how scattered work becomes ordered work, and to act on it by starting a conversation, through a fast, accessible, human-feeling digital experience that feels like it was made in 2030.

### 1.3. Project Objective

1. **Simplify navigation to one clear path.** Replace the mega-menus with three items (Home, AI Solutions, Contact) and one primary action, "Start the conversation". Cybersecurity and Intelligence & Advisory content is removed for now.
2. **Replace the engineer-facing terminal look with a distinctive, business-friendly brand.** Use warm paper, one blue accent, real imagery, 3D and motion, and rewrite all copy.
3. **Make the value of the services easy to find.** Show the five service lines through a switcher and short outcome-led sections, with a plain-language FAQ, so an owner can find what Omnitron does within a single scroll.
4. **Turn visits into conversations.** Make the contact form the single conversion path, replacing the "Michelle" live agent, which costs compute and tokens.

---

## 2. Background

Omnitron.Tech is the public website of a Singapore-headquartered AI services company. The current site presents two business areas, AI Solutions and Intelligence & Advisory. It carries a live chat agent called "Michelle", and it has a separate contact form. Omnitron has asked for a redesign, and its priority is now AI Solutions for growing businesses, so the security-focused advisory content is set aside for now.

### 2.1. Problem Statement

**Owners may not quickly see what Omnitron does.**

Users may experience difficulty understanding what Omnitron offers because the site speaks in a terminal-style engineering voice, and shows no case studies, logos or testimonials. This may result in business owners leaving without getting in touch, so the site fails at its one job of starting conversations. The redesign will address this by rewriting everything in plain outcome language, focusing on AI Solutions, showing the services through visuals and diagrams, and adding clearly marked slots for real proof as it becomes available.

### 2.2. Pain Points Based on Current Omnitron Website Observations

| ID | Identified problem | Evidence / Observation | Impact |
|---|---|---|---|
| P-01 | Navigation is cluttered and hard to read at a glance | Large dropdown menus list 5 items under AI Solutions and 7 under Intelligence & Advisory. The two areas have very different tones, one business-friendly and one technical and security-heavy | A first-time visitor has to choose from many options before they understand what Omnitron does |
| P-02 | The next step is unclear | The main button says "Talk to Live Consultant", a separate "Ask Michelle" chat also appears, and a contact form sits on its own page. Nothing shows which to use | Visitors hesitate or pick different routes, so fewer enquiries come in |

### 2.3. Opportunity

How might we improve the way first-time visitors discover and understand Omnitron's services for busy SME owners and operations leads in Asia-Pacific, so that they can see what AI could take off their plate and start a conversation with less confusion, effort and doubt.

---

## 3. Goal and Success Metrics

The redesign succeeds if first-time visitors understand what Omnitron does and take the next step more easily. Most measures come from the five-person usability test, because the site has no baseline data yet. Targets marked *proposed* are suggestions awaiting approval.

### 3.1. Goals & Metrics

| Goal | What we measure | Baseline | Target | How we check |
|---|---|---|---|---|
| Visitors understand what Omnitron does | Testers can say in their own words what Omnitron does after 10 seconds on the homepage | Not measured | 4 of 5 testers correct (proposed) | 10-second test, then ask |
| Navigation feels simple | Testers find the AI Solutions page and the contact page unaided | Not measured | 5 of 5 without help, no wrong turns (proposed) | Task test with observation |
| The next step is obvious | Testers point to the one main action on a page without prompting | Not measured | 5 of 5 name "Start the conversation" as the main action (proposed) | Observation, then ask |
| The site is easy to use overall | Usability score (SUS) | Not measured | 75 or higher | Questionnaire after the test |
| The site feels modern and distinctive | Testers rate the look, and the client signs off the taste review | Client feedback: flat, text and boxes | Most testers describe it as modern, calm or professional; client approves each review gate (proposed) | Test question, review checklist |
| Visitors believe the claims | Testers say whether they would trust Omnitron, and why | Not measured | Majority say yes (proposed), and no one calls the proof "fake" or "empty" | Test question |
| Everyone can use it | Accessibility checks and a keyboard-only walkthrough | Social links hard to use | Passes accessibility standard AA; social links work for everyone | Accessibility checks, manual test |

### 3.2. What would count as failure

- Testers still hesitate over where to click, or can't tell which action is the main one.
- Testers describe the site as "cool but I'm not sure what they do".
- The 3D and motion impress but no one gets in touch.

---

## 4. Target Audience

1. **Primary audience:** Owners and operations leads at small and mid-sized businesses.
2. **Secondary audience:** Technical evaluators, such as an IT lead, a consultant or a more technical co-founder, who will check whether Omnitron is credible before the owner commits.
3. **Geographic audience:** International, centred on Asia-Pacific. Omnitron is headquartered in Singapore; the site speaks to a regional business audience rather than a single country.
4. **Typical devices:** Mobile first, with desktop close behind. Owners may often browse between meetings on a phone and return on a laptop to look more closely.
5. **Primary user needs:**
   - **Information:** understand what Omnitron does and which service fits their problem.
   - **Reassurance:** see credible evidence that the work delivers results.
   - **Communication:** get in touch with little effort, through a single clear route.
   - **Services:** compare the five AI services without reading a long page.

### 4.1. User Needs and Priority

| User need | Importance | Design implication |
|---|---|---|
| Understand what Omnitron does in seconds | High | A plain, outcome-led headline over a visual that shows scattered work settling into order, with no jargon above the fold |
| See which service fits their problem | High | Five clearly labelled services in a switcher, each with a one-sentence outcome and a matching visual |
| Know what to do next | High | One main button, "Start the conversation", in the same place and style on every page |
| Trust that Omnitron delivers | High | Space for real case studies, logos and results, with honest placeholders until they exist |
| Use the site comfortably on a phone | High | Layouts that stack cleanly, large tap targets and readable text, with the visuals simplified rather than removed |
| Reach out with little effort | Medium / High | A short four-field form, clear error messages and a confirmation after sending |
| Find answers to common concerns | Medium | A plain-language question-and-answer section near the end of the homepage |

---

## 5. Competitor and Reference Analysis

| Reference website | Strengths | Weaknesses / Gaps | Relevant inspiration |
|---|---|---|---|
| **Databricks** | Opens with one outcome-led headline and two buttons. A tabbed switcher lets a visitor explore seven offerings without leaving the page. Proof (customer stories and animated stats) comes before the pitch repeats. A plain-language question-and-answer list sits near the end. | Three buttons compete in the top bar. The large menus and footer suit a big company, not a three-page site. Its customers, numbers and events are not ours to copy. I could only read the text and structure, not the visual effects. | Follow the order: headline, switcher, proof, questions, closing button. Build the switcher around Omnitron's five services. Use one button where they use three. |
| **IBM Consulting** | Organises its AI offer by business function as well as by service type. Backs its claims with third-party recognition. | The voice is aimed at large enterprises; a small-business owner may find it formal and distant. | Let visitors find a service by the problem they have. Use outside recognition as proof. |
| **Oxagile** | Opens with two strong figures: 20+ years and 350+ companies supported. Names recognisable clients such as Google and Vodafone. It also tells a founding story, which adds a human touch. | The tone is engineering-led and aimed at product companies, not business owners. | A short strip of large numbers builds credibility fast. A brief "why we exist" story makes a company feel human. |

---

## 6. Scope and Deliverables

| Area | What's included |
|---|---|
| **Pages** | Homepage, AI Solutions, Contact |
| **Navigation** | Three items (Home, AI Solutions, Contact). One main action, "Start the conversation" |
| **Content** | All copy rewritten from scratch in plain outcome language, following the structure of the competitor (Databricks) rather than the old site |
| **Services shown** | The five AI Solutions service lines: Strategy & Consulting, Intelligent Automation, Agentic Solutions, Customer Experience, Data & Insights |
| **Imagery** | A hero visual and a five-form service visual in 3D, scroll-driven animation, data visuals, custom icons, and real photography of the team and workspace |
| **Proof** | Designed slots for case studies, results and partner marks, filled only with real, cleared material and shown as honest placeholders until then |
| **Contact** | One clean contact form that replaces the "Michelle" live agent |

### 6.1. In scope

1. **Redesigning the homepage and selected internal pages:** the homepage, AI Solutions, and Contact. Every page is rebuilt around new copy, imagery and a visual that explains the service.
2. **Revising navigation and information architecture:** cutting the large dropdown menus to three items (Home, AI Solutions, Contact). The five services move from a menu into the AI Solutions page, and the homepage follows the competitor's page order.
3. **Developing a responsive design system:** a design plan covering colour, type, layout, motion, components and imagery rules.
4. **Improving forms and calls to action:** one main action, "Start the conversation", always in the same place and style, leading to a single short contact form. This replaces the "Michelle" live agent and the competing routes.
5. **Creating wireframes and interactive prototypes:** page layouts for each of the five pages, and an interactive motion prototype of the hero and service switcher.
6. **Implementing approved UI changes:** building the full prototype site from the approved documents, including the 3D visuals, scroll animation, data visuals, photography and proof slots.

### 6.2. Out of Scope

1. **All cybersecurity and Intelligence & Advisory content.** The company is not focusing on it for now, so there is no menu item, page, card, copy or imagery for it.
2. **A replacement for the Advisory area.** The prototype shows one business area, AI Solutions. No new advisory offering is invented to fill the gap.
3. **Rebuilding the "Michelle" live agent.** It is retired and replaced by the contact form, not recreated in another form.
4. **Rebranding the organization.** The name, logo mark and AI Solutions service lines stay. The redesign changes the site's look and voice, not the company's identity.

---

## 7. UI/UX and Design Requirements

### 7.1 Design Direction

**Design style:** Modern and editorial. The editorial side shows in the large, tightly set headlines, generous white space and warm paper tones. The modern side shows in the 3D visuals and scroll-driven motion.

**Visual references:**

- **Databricks** (<https://www.databricks.com/>): follow its page order of outcome headline, service switcher, proof, then common questions. Don't copy its wording, imagery or number of buttons.

**Design principles:**

- **Clarity:** a visitor understands what Omnitron does in seconds, with one main action per screen.
- **Meaning in motion:** every visual and animation shows scattered work becoming ordered work. If it doesn't, it's cut.
- **Visuals first:** pictures, diagrams and large type lead, and boxes support them.
- **Honesty:** no invented proof, and illustrative data is labelled.
- **Accessibility:** everyone can use it, including people who prefer less motion.

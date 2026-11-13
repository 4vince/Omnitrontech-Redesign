---
name: Omnitron
description: AI systems for modern business. A calm, daylight control room where people stay at the controls.
colors:
  omnitron-blue: "#2b46d6"
  omnitron-blue-hover: "#3b5bff"
  omnitron-blue-soft: "#4f6cf0"
  deep-ops-navy: "#0a1640"
  deep-ops-navy-raised: "#0f1d4d"
  footer-navy: "#060f2b"
  blue-ink: "#0a1b52"
  navy-accent-lift: "#8aa3ff"
  warm-bone: "#f6f5f1"
  warm-bone-2: "#efede6"
  paper: "#fdfcfa"
  surface: "#fbfaf7"
  ink: "#17191f"
  ink-soft: "#33373f"
  muted: "#4e535d"
  muted-2: "#555c67"
  line: "rgba(23, 25, 31, 0.14)"
  line-strong: "rgba(23, 25, 31, 0.3)"
  line-control: "rgba(23, 25, 31, 0.48)"
  danger: "#c23a2e"
  success: "#1d8a5f"
typography:
  display:
    fontFamily: "Archivo Variable, Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(3.1rem, 6vw, 6.2rem)"
    fontWeight: 630
    lineHeight: 0.99
    letterSpacing: "-0.016em"
  headline:
    fontFamily: "Archivo Variable, Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 3.9vw, 4rem)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.014em"
  title:
    fontFamily: "Archivo Variable, Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.45rem, 2.6vw, 2.25rem)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.014em"
  lead:
    fontFamily: "Manrope Variable, Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.1rem, 1.45vw, 1.4rem)"
    fontWeight: 430
    lineHeight: 1.55
  body:
    fontFamily: "Manrope Variable, Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1rem, 1.02vw, 1.1rem)"
    fontWeight: 430
    lineHeight: 1.65
  label:
    fontFamily: "JetBrains Mono Variable, JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.14em"
    fontFeature: "tnum"
rounded:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "20px"
  pill: "999px"
spacing:
  "1": "0.375rem"
  "2": "0.625rem"
  "3": "1rem"
  "4": "1.5rem"
  "5": "2.25rem"
  "6": "3.5rem"
  "7": "5rem"
  "8": "7.5rem"
  gutter: "clamp(16px, 2.4vw, 44px)"
components:
  button-primary:
    backgroundColor: "{colors.omnitron-blue}"
    textColor: "{colors.warm-bone}"
    rounded: "{rounded.pill}"
    padding: "0 23px"
    height: "50px"
  button-primary-hover:
    backgroundColor: "{colors.omnitron-blue-hover}"
    textColor: "{colors.warm-bone}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 23px"
    height: "50px"
  button-on-blue:
    backgroundColor: "{colors.warm-bone}"
    textColor: "#0f2290"
    rounded: "{rounded.pill}"
    padding: "0 23px"
    height: "50px"
  button-sm:
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "44px"
  tag:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "5px 10px"
  tab:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    padding: "9px 14px"
    height: "44px"
  tab-selected:
    backgroundColor: "{colors.omnitron-blue}"
    textColor: "{colors.warm-bone}"
  input:
    backgroundColor: "rgba(23, 25, 31, 0.04)"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "13px 15px"
    height: "50px"
  input-error:
    backgroundColor: "rgba(194, 58, 46, 0.08)"
    textColor: "{colors.ink}"
---

# Design System: Omnitron

## Overview

**Creative North Star: "The Control Room, Daylight"**

Omnitron looks like a well-run operations room at nine in the morning: bright, quiet and exact. Corporate tech that feels made in 2030, not a neon command deck. The ground is Warm Bone, the instruments are Omnitron Blue, and the heavy panels are Deep Ops Navy. Every screen implies someone is at the controls. Workflows end in a human decision, and the interface reads as instrumentation for that person, not as a machine running on its own.

The system is full-bleed and band-based. Each section is a plate that runs edge to edge, separated by color blocking rather than boxes: light ground, navy statement band, near-white reading section, navy again, then the one saturated Omnitron Blue call to action, closing on footer navy. A fine blueprint grid with soft light pools sits behind every plate, so even empty areas look instrumented rather than blank. Components are tactile and engineered. Pill controls lift slightly on hover and press in. Cards carry layered, navy-tinted shadows with a top-edge highlight, like machined parts under daylight.

Visuals are literal and crisp. Processes are drawn as flow diagrams, numbered steppers and labelled nodes. 3D is welcome but rendered sharply (orthographic, no bloom or fog), never as soft abstract shapes. Copy stays short so the diagrams carry the explanation.

The one exception is the home hero figure: a holographic brain running on a CPU (`src/js/visuals/brain-scene.js`, modelled on `public/Holographic AI Brain Over CPU Platform.png`), glowing (bloom) in cobalt with small amber sparks for the neural nodes, on a transparent canvas over the Singapore office photograph with faint glyph rain behind it. The exception covers that figure only.

**Key Characteristics:**
- Full-bleed bands with deliberate tone blocking (bone → navy → paper → navy → blue CTA → footer navy).
- A blueprint grid with light pools behind every section; dead space is textured, never blank.
- One accent: Omnitron Blue. No orange or other warm accent.
- A confident grotesque display (Archivo) with tight tracking, calm Manrope body text and JetBrains Mono uppercase labels.
- Tactile pills, hairline structure, navy-tinted layered elevation.
- Literal, crisp diagrams: numbered steps, flow lines with dots, the result step in blue.

## Colors

A restrained daylight palette: warm bone neutrals, cool charcoal ink, a single saturated blue and a deep navy for weight.

### Primary
- **Omnitron Blue** (`omnitron-blue`): the only functional accent. Primary buttons, selected tabs, active nav underline, focus outlines, the `.signal` highlight in headlines, the result step of a flow diagram, and the full background of the closing CTA band. Hovers move to **Omnitron Blue Hover**; **Omnitron Blue Soft** is reserved for secondary glows and light pools.

### Secondary
- **Deep Ops Navy** (`deep-ops-navy`): the weight colour. Statement bands, proof bands and alternating service rows use it through the `.tone-navy` scope. Inside a navy band the accent lifts to **Navy Accent Lift** so it stays at 6:1 or better. **Deep Ops Navy Raised** is the surface for panels on navy.
- **Footer Navy** (`footer-navy`): one step deeper than the bands, so every page closes firmly.
- **Blue Ink** (`blue-ink`): the deepest blue, used for CTA-scope text on light buttons and for shadow tints.

### Neutral
- **Warm Bone** (`warm-bone`): the default page ground (hero, hand-off and showcase sections) and the label colour on blue buttons.
- **Warm Bone 2** (`warm-bone-2`): the alternate band ground.
- **Paper** (`paper`): near-white ground for reading sections (problem, FAQ) where body text dominates.
- **Surface** (`surface`): cards and raised panels on light ground.
- **Ink** (`ink`): headings and primary text, a cool charcoal. Never pure black.
- **Ink Soft / Muted / Muted 2** (`ink-soft`, `muted`, `muted-2`): stepped secondary text, from strong subtext to meta labels.
- **Line / Line Strong / Line Control** (`line`, `line-strong`, `line-control`): hairlines at rest, emphasised dividers, and control borders (fields, ghost buttons, tabs).
- **Danger / Success** (`danger`, `success`): form validation only, each with an 8% tint background.

### Named Rules
**The One Signal Rule.** Omnitron Blue is the only accent. Orange and other warm accents are retired. Never add a second hue for emphasis; use weight, size or the navy tone instead.

**The Tone Scope Rule.** A section never hard-codes colours. It picks a tone (`default`, `--paper`, `.tone-navy`, `.tone-blue`, footer) and every token inside it is re-scoped. Light cards may sit inside navy bands via `.tone-light`.

**The One Blue Block Rule.** Only the closing CTA band uses Omnitron Blue as a background. Every other band alternates between light and navy.

## Typography

**Display Font:** Archivo Variable (fallback: ui-sans-serif, system-ui)
**Body Font:** Manrope Variable (fallback: ui-sans-serif, system-ui)
**Label/Mono Font:** JetBrains Mono Variable (fallback: ui-monospace)

**Character:** A confident, standard-width corporate grotesque over a calm, open humanist sans. Mono labels add the control-room note: numbered, uppercase and tabular.

### Hierarchy
- **Display** (630, `clamp(3.1rem, 6vw, 6.2rem)`, 0.99): the hero headline only, capped near 13ch, with one phrase in Omnitron Blue.
- **Headline** (600, `clamp(2.25rem, 3.9vw, 4rem)`, 1.08): section headings.
- **Title** (600, `clamp(1.45rem, 2.6vw, 2.25rem)`, 1.08): service names and card or row titles.
- **Lead** (430, `clamp(1.1rem, 1.45vw, 1.4rem)`): the one-sentence summary under a heading.
- **Body** (430, `clamp(1rem, 1.02vw, 1.1rem)`, 1.65): running text, capped per block in `ch` rather than by the container.
- **Label** (500, 0.6875rem, 0.14em tracking, uppercase, tabular numerals): eyebrows, step indexes (01 / 02), tags, meta and captions.

### Named Rules
**The Tight Grotesque Rule.** Archivo headings track tight (-0.01em to -0.038em) and use balanced wrapping. Don't loosen tracking toward 0, and don't swap in a serif or a playful geometric display face.

**The Mono Means Metadata Rule.** JetBrains Mono is for labels, indexes and technical meta only, always uppercase and tracked. Never set sentences or body copy in mono.

## Layout

The layout is full-bleed: wrappers span the viewport (`max-width: 100%`) and the fluid gutter (`clamp(16px, 2.4vw, 44px)`) is the only inset. Text width is capped per block with `ch` values, so wide screens gain composition, not longer lines. Hairlines run edge to edge outside the wrappers. Sections are tall plates with generous vertical padding (service rows use `clamp(84px, 11vw, 172px)`), and the 76px nav is fixed above them. The spacing scale runs from 0.375rem to 7.5rem in eight steps.

Two-column compositions pair copy with a substantial visual (around 0.82fr / 1.18fr on service rows). The visual is sized to fill its side so no wide blank gutter remains. Service rows use a sticky left rail with an outlined index numeral. The home hero is one full screen over the office photograph: headline column left, the 3D brain figure on the right; it powers on after the copy lands, then runs a seven-second thought cycle.

Breakpoints are content-driven, clustering around 1180px, 1000px, 960px (nav collapses into the mobile sheet), 760px, 560px and 480px. Below about 900px, columns stack, WebGL scenes switch to static fallbacks, and every control keeps a 44px minimum target.

## Elevation & Depth

Depth is layered and tinted. Shadows are navy-tinted, never neutral grey, and stack a tight contact shadow with a long, soft, blue-tinted ambient one. A one-pixel top-edge highlight (`inset 0 1px 0 rgba(255,255,255,0.85)`) makes raised surfaces read as machined. Depth also comes from the tone bands themselves and from the blueprint-grid backdrop, which moves on a gentle parallax behind content. On navy, the same three elevation steps re-tint toward near-black with a brighter blue ambient.

### Shadow Vocabulary
- **Elev 1** (`0 1px 2px rgba(10,27,82,0.06), 0 8px 20px -10px rgba(10,27,82,0.18)`): resting cards, chips and small panels.
- **Elev 2** (`0 2px 4px rgba(10,27,82,0.06), 0 24px 48px -20px rgba(10,27,82,0.28), 0 60px 90px -50px rgba(43,70,214,0.28)`): featured cards and hover lifts.
- **Elev 3** (`0 4px 8px rgba(10,27,82,0.08), 0 34px 64px -24px rgba(10,27,82,0.34), 0 80px 120px -56px rgba(43,70,214,0.36)`): hero visuals and the top panel in a stack.
- **Button lift** (`0 18px 40px -22px rgba(23,25,31,0.4), inset 0 1px 0 rgba(255,255,255,0.28)`): primary buttons; it deepens on hover.

### Named Rules
**The Tinted Shadow Rule.** Every shadow is tinted navy or blue. A neutral grey `rgba(0,0,0,…)` drop shadow on a light surface is off-system.

**The Crisp Depth Rule.** Depth comes from layered shadows, tone and parallax, never from blur. No bloom, fog or soft-focus 3D; scenes stay sharp and literal. (Home hero excepted; see Overview.)

## Shapes

The form language pairs soft pills with gently rounded panels. Interactive controls (buttons, tabs, tags, nav toggle) are full pills (999px) or circles. Fields use a 10px radius. Cards and panels use 14px, large media and scene frames 20px, and small chips and diagram nodes 6px. Structure comes from 1px hairlines rather than filled boxes. Flow diagrams use a top hairline per step with a 6px dot at its start, and the result step's line and dot turn blue. Service indexes are large outlined numerals (transparent fill, stroked).

## Components

### Buttons
*Tactile pills that lift under a fine pointer and press in on click.*
- **Shape:** full pill (999px), 50px tall, 23px side padding; the small variant is 44px tall.
- **Primary:** Omnitron Blue fill with a Warm Bone label (Manrope 720, 0.9rem, -0.012em), plus the button-lift shadow and an inner top highlight.
- **Hover / Focus:** lighter blue and a deeper shadow; it rises 2px and its trailing icon nudges up-right, only on `(hover: hover) and (pointer: fine)`. Focus is a 2px Omnitron Blue outline offset 4px.
- **Press:** `scale(0.97)` with a 120ms press-in, released over 200ms.
- **Ghost:** transparent with a control-line border; on hover the border darkens to ink-soft over a faint field tint.
- **On Blue:** inside the CTA band the primary flips to a Warm Bone fill with a deep blue label (9.7:1).

### Text Link
- Ink text with a hairline underline border and a small trailing arrow. On hover the text and line turn blue and the arrow nudges up-right. Minimum height is 44px.

### Tags
- Mono uppercase pills (0.7rem, 0.13em tracking) with a hairline border and muted text. The blue variant uses a 7% blue tint, a blue border and blue text. The live variant adds a 5px glowing status dot.

### Tabs (service switcher)
- Pill buttons, 44px tall, with a control-line border and muted text. The selected tab fills Omnitron Blue with a Warm Bone label and a blue-tinted glow shadow.

### Cards / Containers
- **Corner Style:** 14px; large visual frames 20px.
- **Background:** Surface on light ground, Deep Ops Navy Raised on navy, or a `.tone-light` card inside a navy band.
- **Shadow Strategy:** Elev 1 at rest, Elev 2 on hover or feature, plus the top-edge highlight and a soft top-left radial sheen.
- **Border:** a hairline (`line`) when the card sits on the same tone.

### Inputs / Fields
- **Style:** 50px minimum height, 10px radius, a control-line border over a 4% ink tint. Labels are Manrope 660 at 0.8rem; "optional" sits right-aligned in muted 450.
- **Focus:** the border turns blue, the fill shifts to a 7% blue tint, with a 3px soft blue ring.
- **Error:** danger border and danger-tint fill, with a small icon and message below in danger red.

### Navigation
- A fixed 76px bar on near-opaque Warm Bone (92%), which stays clean over navy bands. Links are Manrope 520 at 0.9rem in muted text, turning ink on hover or current with a 1px blue underline that scales in from the left. The pill CTA sits on the right. At 960px and below, links collapse into a circular 44px toggle that opens a full mobile sheet.

### Flow Diagram (signature)
- Three or more steps in a row, each opened by a top hairline and a 6px dot. Each step has a mono uppercase index ("REQUEST", "OMNITRON", "RESULT") above an Archivo 540 label. The final step, the person-decides or result step, carries the blue line, blue dot with glow, and blue label. This is the system's core visual sentence: work moves left to right and ends with a person.

### Service Row (signature)
- A full-bleed row, alternating light and navy, with a sticky left rail that holds a large outlined index numeral (01–05) and mono meta. The right column holds a crisp workflow visual.

## Do's and Don'ts

### Do:
- **Do** pick a tone class for every new section and keep the light / navy alternation. Omnitron Blue as a background belongs to the closing CTA only.
- **Do** fill wide gaps with the blueprint-grid backdrop or a larger visual instead of leaving blank gutters.
- **Do** draw processes literally: numbered steps, flow lines with dots, labelled nodes, and the final step in blue.
- **Do** tint every shadow navy or blue and add the top-edge highlight to raised surfaces.
- **Do** keep hover motion behind `(hover: hover) and (pointer: fine)` and UI feedback under 300ms (press 120ms, UI 200ms, panels 280ms), with strong ease-out curves.
- **Do** give every 3D or scroll scene a static fallback for small screens and reduced motion.

### Don't:
- **Don't** reintroduce orange or any second accent hue in UI. (The home hero's amber neural sparks are part of its image, not a UI accent.)
- **Don't** render concepts as abstract, blurry 3D (bloom, fog, soft blobs). Keep 3D orthographic and crisp, outside the home hero.
- **Don't** use a serif or playful geometric display face, or loosen Archivo's tight tracking.
- **Don't** set body copy in JetBrains Mono, or use pure black text or neutral grey shadows.
- **Don't** box sections in bordered containers. Bands are full-bleed and structure comes from hairlines.
- **Don't** copy the dark terminal palette of the current omnitron.tech. Borrow its structure (steppers, dotted grids, 01/03 numbered pagination), not its colours.

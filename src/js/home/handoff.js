import {
  createScrubDriver,
  isDesktop,
  prefersReducedMotion,
  refreshMotion,
} from "../core/motion.js";

/**
 * Handoff band: "Every hand-off, routed to the person who decides."
 *
 * One flat diagram, three states. Three everyday sources (inbox,
 * spreadsheet, accounts) feed a middle node and end at a person:
 *
 *   manual   the middle is a queue; lines are broken and grey; the
 *            decision arrives late
 *   routed   the middle is Omnitron; lines connect and carry work in
 *   decided  the prepared work reaches the person, who makes the call
 *
 * Desktop: the stage pins and scroll steps through the three states; the
 * step list on the left tracks the same index. All state changes are CSS
 * transitions keyed off [data-stage], so JS only flips an attribute when the
 * beat changes.
 *
 * Phones, tablets and reduced motion: no pin. Each step is shown in full
 * with its own still diagram, so nothing depends on scrolling.
 */

const STAGES = ["manual", "routed", "decided"];

const SOURCES = [
  { icon: "ph-envelope-simple", title: "Inbox", meta: ["Copied by hand", "Read · routed", "Done"] },
  { icon: "ph-table", title: "Spreadsheet", meta: ["Updated by hand", "Read · routed", "Done"] },
  { icon: "ph-receipt", title: "Accounts", meta: ["Checked by hand", "Read · routed", "Done"] },
];

const HUB = [
  { icon: "ph-hourglass-medium", label: "Queue" },
  { icon: null, label: "Omnitron" },
  { icon: null, label: "Omnitron" },
];

const DECISION_META = ["Decision arrives late", "Draft on its way", "Reply ready · your call"];

// Connector geometry in a 160 x 100 box: the same 16:10 ratio as the
// diagram, so one unit is the same length on both axes and dashes stay
// true. Columns (home.css) are 34 / 11 / 10 / 11 / 34 % wide; the hub circle
// fills the middle 10%, so the lines end exactly on its edge (x 45% / 55%).
const IN_PATHS = [
  "M54.4 18 C 64 18, 62 50, 72 50",
  "M54.4 50 L 72 50",
  "M54.4 82 C 64 82, 62 50, 72 50",
];
const OUT_PATH = "M88 50 L 105.6 50";

function swap(values, className) {
  return values
    .map((value, i) => `<span class="${className}" data-for="${STAGES[i]}">${value}</span>`)
    .join("");
}

export function diagramMarkup(stage = "manual", { live = false } = {}) {
  return `<div class="handoff-diagram${live ? " handoff-diagram--live" : ""}" data-stage="${stage}" aria-hidden="true">
    <svg class="handoff-diagram__links" viewBox="0 0 160 100" preserveAspectRatio="none" focusable="false">
      ${IN_PATHS.map((d) => `<path class="handoff-link handoff-link--in" d="${d}"/>`).join("")}
      <path class="handoff-link handoff-link--out" d="${OUT_PATH}"/>
    </svg>
    <ul class="handoff-diagram__sources">
      ${SOURCES.map(
        (source) => `<li class="handoff-node handoff-node--source">
          <i class="ph ${source.icon}"></i>
          <span><strong>${source.title}</strong><span class="handoff-swap">${swap(source.meta, "handoff-swap__item")}</span></span>
        </li>`,
      ).join("")}
    </ul>
    <div class="handoff-diagram__hub">
      <span class="handoff-hub">
        <i class="ph ${HUB[0].icon} handoff-hub__wait"></i>
        <span class="handoff-hub__ai">AI</span>
      </span>
      <span class="handoff-swap handoff-hub__label">${swap(HUB.map((h) => h.label), "handoff-swap__item")}</span>
    </div>
    <div class="handoff-diagram__decision">
      <div class="handoff-node handoff-node--person">
        <i class="ph ph-user-check"></i>
        <span><strong>You approve</strong><span class="handoff-swap">${swap(DECISION_META, "handoff-swap__item")}</span></span>
      </div>
    </div>
  </div>`;
}

export function initHandoff() {
  const track = document.querySelector("[data-handoff-track]");
  if (!track) return;

  const figure = track.querySelector("[data-handoff-figure]");
  const steps = [...track.querySelectorAll("[data-handoff-step]")];
  if (!figure || steps.length !== STAGES.length) return;

  // Live diagram for the pinned desktop stage; a still one inside each step
  // for the stacked layout. CSS shows one or the other.
  figure.innerHTML = diagramMarkup("manual", { live: true });
  const live = figure.firstElementChild;
  steps.forEach((step, i) => {
    const slot = step.querySelector("[data-handoff-still]");
    if (slot) slot.innerHTML = diagramMarkup(STAGES[i]);
  });

  let driver = null;
  let shown = -1;

  function show(index) {
    if (index === shown) return;
    shown = index;
    live.dataset.stage = STAGES[index];
    steps.forEach((step, i) => {
      step.classList.toggle("is-active", i === index);
      step.classList.toggle("is-past", i < index);
      if (i === index) step.setAttribute("aria-current", "step");
      else step.removeAttribute("aria-current");
    });
  }

  // Three equal beats; the last one holds until the pin releases.
  const indexAt = (p) => Math.min(STAGES.length - 1, Math.floor(p * STAGES.length * 1.08));

  const staticMode = () => !isDesktop() || prefersReducedMotion();

  function applyMode() {
    if (staticMode()) {
      driver?.kill();
      driver = null;
      track.classList.add("is-static");
      steps.forEach((step) => {
        step.classList.remove("is-active", "is-past");
        step.removeAttribute("aria-current");
      });
      shown = -1;
      return;
    }
    track.classList.remove("is-static");
    if (!driver) {
      driver = createScrubDriver({ trigger: track, onProgress: (p) => show(indexAt(p)) });
    }
    show(indexAt(driver.progress ?? 0));
    refreshMotion();
  }

  // The flowing dashes are the only loop in the band; run them only while
  // the stage is on screen.
  if (typeof IntersectionObserver !== "undefined") {
    new IntersectionObserver(
      ([entry]) => live.classList.toggle("is-onscreen", entry.isIntersecting),
      { threshold: 0.05 },
    ).observe(figure);
  }

  applyMode();
  window.matchMedia("(min-width: 900px)").addEventListener?.("change", applyMode);
  window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener?.("change", applyMode);
}

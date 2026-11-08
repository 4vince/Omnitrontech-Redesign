import {
  appliedExamples,
  contactSteps,
  problems,
  proofRows,
} from "../content/home.js";
import { gsap, prefersReducedMotion, refreshMotion } from "../core/motion.js";

function exampleFlow(flow = []) {
  if (!flow.length) return "";
  return `<ol class="applied-flow" aria-label="Example flow" data-tilt>
    ${flow
      .map(
        (step, i) => `<li class="applied-flow__step${i === flow.length - 1 ? " applied-flow__step--human" : ""}" style="--i:${i}">
          <span class="applied-flow__mark"><i class="ph ${step.icon}" aria-hidden="true"></i></span>
          <span class="applied-flow__copy">
            <strong>${step.label}</strong>
            <span>${step.meta}</span>
          </span>
        </li>`,
      )
      .join("")}
  </ol>`;
}

function examplePanel(example, index) {
  return `<article class="applied-panel" id="applied-panel-${index}" data-applied-panel role="tabpanel" aria-labelledby="applied-tab-${index}">
    <div class="applied-panel__copy">
      <h3 class="applied-panel__title">${example.title}</h3>
      <p class="applied-panel__body">${example.body}</p>
    </div>
    ${exampleFlow(example.flow)}
  </article>`;
}

function exampleTab(example, index) {
  return `<button class="showcase-tab" id="applied-tab-${index}" type="button" role="tab" aria-selected="false" aria-controls="applied-panel-${index}" tabindex="-1" data-applied-tab="${index}">
    <i class="ph ${example.icon}" aria-hidden="true"></i>
    <span class="showcase-tab__label">${example.sector}</span>
    <i class="ph ph-arrow-right showcase-tab__arrow" aria-hidden="true"></i>
    <span class="showcase-tab__bar" aria-hidden="true"></span>
  </button>`;
}

export function initHomeSections() {
  const problemMount = document.querySelector("[data-problems]");
  if (problemMount) {
    problemMount.innerHTML = problems
      .map(
        (problem, i) => `<article class="problem-row problem-row--${i % 2 ? "left" : "right"}">
          <span class="problem-row__stop" aria-hidden="true"></span>
          <span class="problem-row__icon"><i class="ph ${problem.icon}" aria-hidden="true"></i></span>
          <div class="problem-row__body">
            <h3>${problem.title}</h3>
            <p>${problem.body}</p>
          </div>
        </article>`,
      )
      .join("");
  }

  const proofMount = document.querySelector("[data-proof]");
  if (proofMount) {
    proofMount.innerHTML = proofRows
      .map(
        (row) => `<div class="proof-row" data-reveal>
          <span class="proof-row__sector">${row.sector}</span>
          <span class="proof-row__state">${row.state}</span>
          <span class="proof-row__slot">${row.slot}</span>
        </div>`,
      )
      .join("");
  }

  // Closing CTA: the same three "what happens next" steps as the contact
  // page, so the promise is identical in both places.
  const stepsMount = document.querySelector("[data-contact-steps]");
  if (stepsMount) {
    stepsMount.innerHTML = contactSteps
      .map(
        (step) => `<li class="cta-home__step">
          <span class="mono">${step.label}</span>
          <p>${step.body}</p>
        </li>`,
      )
      .join("");
  }

  initProblemReveal();
  initAppliedShowcase();
}

/*
 * Row 1 tucks in just under the flow card instead of waiting below the
 * (taller) heading. Measured, because the heading's height changes with
 * width and wrapping:
 *   --rise        how far the list moves up from its natural grid slot so
 *                 its top sits TUCK px under the flow card
 *   --first-left  how far the first left-hand row drops inside the list so
 *                 it still clears the heading by CLEAR px
 * Layout offsets (relative to the positioned .wrap), not bounding rects:
 * the entrance reveal translates these elements, which would skew the
 * numbers.
 */
const TUCK = 32;
const CLEAR = 56;

function fitProblemList() {
  const grid = document.querySelector(".problem-grid");
  const head = grid?.querySelector(".problem-head");
  const card = grid?.querySelector(".problem-flow");
  const list = grid?.querySelector(".problem-list");
  if (!grid || !head || !card || !list) return;

  const desktop = window.matchMedia("(min-width: 900px)");
  let last = "";
  const measure = () => {
    let rise = 0;
    let firstLeft = 0;
    if (desktop.matches) {
      // The list's natural slot = where it is now plus the rise applied.
      const applied = parseFloat(list.style.getPropertyValue("--rise")) || 0;
      const natural = list.offsetTop + applied;
      const headBottom = head.offsetTop + head.offsetHeight;
      const cardBottom = card.offsetTop + card.offsetHeight;
      const target = cardBottom + TUCK;
      rise = Math.max(0, Math.round(natural - target));
      firstLeft = Math.max(0, Math.round(headBottom + CLEAR - target));
    }
    const key = `${rise}/${firstLeft}`;
    if (key === last) return;
    last = key;
    list.style.setProperty("--rise", `${rise}px`);
    list.style.setProperty("--first-left", `${firstLeft}px`);
    refreshMotion();
  };
  measure();
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(measure).observe(head);
  desktop.addEventListener?.("change", measure);
}

/*
 * Problem rows: each one enters from its own side toward the thread, its
 * connector draws out from the stop, and the stop fills. Plays as a row
 * scrolls in and reverses when you scroll back above it, so the route
 * reads as travelled in both directions. Phones get a plain fade-up;
 * reduced motion shows everything at rest.
 */
function initProblemReveal() {
  const rows = gsap.utils.toArray(".problem-row");
  if (!rows.length) return;
  fitProblemList();

  const mm = gsap.matchMedia();
  mm.add(
    {
      desktop: "(min-width: 900px) and (prefers-reduced-motion: no-preference)",
      narrow: "(max-width: 899px) and (prefers-reduced-motion: no-preference)",
    },
    ({ conditions }) => {
      rows.forEach((row) => {
        const fromRight = row.classList.contains("problem-row--right");
        const tl = gsap.timeline({
          defaults: { ease: "power3.out" },
          scrollTrigger: {
            trigger: row,
            start: "top 82%",
            toggleActions: "play none none reverse",
          },
        });
        if (conditions.desktop) {
          tl.from(row.querySelectorAll(".problem-row__icon, .problem-row__body"), { x: fromRight ? 48 : -48, opacity: 0, duration: 0.7 })
            .from(row, { "--link": 0, duration: 0.45 }, 0.1)
            .from(row, { "--stop": 0, duration: 0.3 }, 0.35);
        } else {
          tl.from(row, { y: 24, opacity: 0, duration: 0.6 });
        }
      });
    },
  );
}

/*
 * Applied examples: an industry index on the left (a real tab list) drives
 * the panel on the right. The active tab's underline fills over the
 * auto-advance interval, so the timing is visible instead of a counter.
 * Choosing an industry yourself stops the auto-advance: you picked it, it
 * should not move away from you.
 */
const ADVANCE_MS = 5200;

function initAppliedShowcase() {
  const root = document.querySelector("[data-applied]");
  const stage = document.querySelector("[data-applied-stage]");
  const index = document.querySelector("[data-applied-index]");
  if (!root || !stage || !index) return;

  stage.innerHTML = appliedExamples.map(examplePanel).join("");
  index.innerHTML = appliedExamples.map(exampleTab).join("");
  index.style.setProperty("--advance", `${ADVANCE_MS}ms`);
  const panels = [...stage.querySelectorAll("[data-applied-panel]")];
  const tabs = [...index.querySelectorAll("[data-applied-tab]")];
  const total = panels.length;
  const pauseButton = document.querySelector("[data-showcase-toggle]");

  let active = 0;
  let paused = false;
  let timer = 0;

  function render(next, { instant = false, from = -1 } = {}) {
    const dir = from < 0 || next > from || (from === total - 1 && next === 0) ? 1 : -1;
    tabs.forEach((tab, i) => {
      const isActive = i === next;
      tab.setAttribute("aria-selected", String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
    });
    panels.forEach((panel, i) => {
      const isActive = i === next;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = false;
      panel.setAttribute("aria-hidden", String(!isActive));
      if (prefersReducedMotion() || instant) {
        gsap.set(panel, { opacity: isActive ? 1 : 0, y: 0 });
        return;
      }
      if (isActive) {
        gsap.fromTo(
          panel,
          { opacity: 0, y: 14 * dir },
          { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", overwrite: true },
        );
      } else if (i === from) {
        gsap.to(panel, { opacity: 0, y: -10 * dir, duration: 0.3, ease: "power3.out", overwrite: true });
      } else {
        gsap.set(panel, { opacity: 0, y: 0, overwrite: true });
      }
    });
  }

  function goTo(next) {
    const from = active;
    active = (next + total) % total;
    if (active !== from) render(active, { from });
  }

  // Restart the active tab's fill so it always matches the live timer.
  function runProgress(on) {
    index.classList.remove("is-running");
    if (!on) return;
    void index.offsetWidth;
    index.classList.add("is-running");
  }

  function scheduleAdvance() {
    window.clearTimeout(timer);
    const running = !paused && !prefersReducedMotion() && root.classList.contains("is-visible");
    runProgress(running);
    if (!running) return;
    timer = window.setTimeout(() => {
      goTo(active + 1);
      scheduleAdvance();
    }, ADVANCE_MS);
  }

  function renderPauseButton() {
    if (!pauseButton) return;
    pauseButton.innerHTML = paused
      ? '<i class="ph ph-play" aria-hidden="true"></i><span>Resume</span>'
      : '<i class="ph ph-pause" aria-hidden="true"></i><span>Pause</span>';
    pauseButton.setAttribute("aria-label", paused ? "Resume auto-advance" : "Pause auto-advance");
    pauseButton.toggleAttribute("data-paused", paused);
  }

  function setPaused(value) {
    paused = value;
    renderPauseButton();
    scheduleAdvance();
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => {
      goTo(i);
      setPaused(true);
    });
  });

  // Tab-list keyboard pattern: arrows move and select, Home/End jump.
  index.addEventListener("keydown", (event) => {
    const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    let next = null;
    if (event.key in keys) next = active + keys[event.key];
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = total - 1;
    if (next === null) return;
    event.preventDefault();
    goTo(next);
    tabs[active].focus();
    setPaused(true);
  });

  pauseButton?.addEventListener("click", () => setPaused(!paused));

  // Hold while someone is reading or using it: pointer over, or focus
  // inside (WCAG 2.2.2). Resume only once both leave.
  let hovering = false;
  let focused = false;
  const hold = () => {
    window.clearTimeout(timer);
    runProgress(false);
  };
  const release = () => {
    if (!hovering && !focused) scheduleAdvance();
  };
  root.addEventListener("pointerenter", () => {
    hovering = true;
    hold();
  });
  root.addEventListener("pointerleave", () => {
    hovering = false;
    release();
  });
  root.addEventListener("focusin", () => {
    focused = true;
    hold();
  });
  root.addEventListener("focusout", (event) => {
    if (root.contains(event.relatedTarget)) return;
    focused = false;
    release();
  });

  renderPauseButton();
  render(active, { instant: true });

  if (typeof IntersectionObserver !== "undefined") {
    new IntersectionObserver(
      ([entry]) => {
        root.classList.toggle("is-visible", entry.isIntersecting);
        if (entry.isIntersecting && !hovering && !focused) scheduleAdvance();
        else hold();
      },
      { threshold: 0.2 },
    ).observe(root);
  } else {
    root.classList.add("is-visible");
    scheduleAdvance();
  }
}

import {
  appliedExamples,
  contactSteps,
  problems,
  proofRows,
} from "../content/home.js";
import { gsap, prefersReducedMotion } from "../core/motion.js";

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
  return `<article class="applied-panel" data-applied-panel data-index="${index}" aria-roledescription="slide" aria-label="${index + 1} of ${appliedExamples.length}: ${example.sector}">
    <div class="applied-panel__copy">
      <span class="applied-panel__sector"><i class="ph ${example.icon}" aria-hidden="true"></i>${example.sector}</span>
      <h3 class="applied-panel__title">${example.title}</h3>
      <p class="applied-panel__body">${example.body}</p>
    </div>
    ${exampleFlow(example.flow)}
  </article>`;
}

export function initHomeSections() {
  const problemMount = document.querySelector("[data-problems]");
  if (problemMount) {
    problemMount.innerHTML = problems
      .map(
        (problem) => `<article class="problem-row" data-reveal>
          <span class="problem-row__icon"><i class="ph ${problem.icon}" aria-hidden="true"></i></span>
          <div>
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

  initAppliedShowcase();
}

function initAppliedShowcase() {
  const root = document.querySelector("[data-applied]");
  const stage = document.querySelector("[data-applied-stage]");
  if (!root || !stage) return;

  const slides = appliedExamples.map(examplePanel);
  stage.innerHTML = slides.join("");
  const panels = [...stage.querySelectorAll("[data-applied-panel]")];
  const total = panels.length;

  const countLabel = document.querySelector("[data-applied-count]");
  const track = document.querySelector("[data-applied-track]");
  const prevButton = document.querySelector("[data-applied-prev]");
  const nextButton = document.querySelector("[data-applied-next]");
  const pauseButton = document.querySelector("[data-showcase-toggle]");

  let active = 0;
  let paused = false;
  let timer = 0;

  // dir: +1 = forward (next / auto-advance), -1 = back. Slides travel in
  // the direction you moved, including the wrap from the last to the first.
  function render(index, { instant = false, dir = 1, from = -1 } = {}) {
    panels.forEach((panel, panelIndex) => {
      const isActive = panelIndex === index;
      panel.classList.toggle("is-active", isActive);
      panel.setAttribute("aria-hidden", String(!isActive));
      if (prefersReducedMotion() || instant) {
        gsap.set(panel, { opacity: isActive ? 1 : 0, x: 0 });
        return;
      }
      if (isActive) {
        // Enter from the side we're travelling toward.
        gsap.fromTo(
          panel,
          { opacity: 0, x: 24 * dir },
          { opacity: 1, x: 0, duration: 0.5, ease: "power3.out", overwrite: true },
        );
      } else if (panelIndex === from) {
        // Leave toward the side we came from; quicker than the enter so the
        // two slides don't sit double-exposed.
        gsap.to(panel, { opacity: 0, x: -24 * dir, duration: 0.35, ease: "power3.out", overwrite: true });
      } else {
        gsap.set(panel, { opacity: 0, x: 0, overwrite: true });
      }
    });

    if (countLabel) {
      countLabel.textContent = `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
      // Roll the number in the travel direction so it's tied to the change.
      if (!instant && !prefersReducedMotion()) {
        countLabel.animate(
          [
            { opacity: 0, transform: `translateY(${6 * dir}px)` },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration: 200, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
        );
      }
    }
    if (track) track.style.setProperty("--progress", String((index + 1) / total));
  }

  function goTo(index, dir = 1) {
    const from = active;
    active = (index + total) % total;
    render(active, { dir, from });
  }

  function scheduleAdvance() {
    window.clearTimeout(timer);
    if (paused || prefersReducedMotion()) return;
    timer = window.setTimeout(() => {
      goTo(active + 1, 1);
      scheduleAdvance();
    }, 5200);
  }

  prevButton?.addEventListener("click", () => {
    goTo(active - 1, -1);
    scheduleAdvance();
  });
  nextButton?.addEventListener("click", () => {
    goTo(active + 1, 1);
    scheduleAdvance();
  });

  function renderPauseButton() {
    if (!pauseButton) return;
    pauseButton.innerHTML = paused
      ? '<i class="ph ph-play" aria-hidden="true"></i><span>Resume</span>'
      : '<i class="ph ph-pause" aria-hidden="true"></i><span>Pause</span>';
    pauseButton.setAttribute("aria-label", paused ? "Resume auto-advance" : "Pause auto-advance");
    pauseButton.toggleAttribute("data-paused", paused);
  }
  renderPauseButton();

  pauseButton?.addEventListener("click", () => {
    paused = !paused;
    renderPauseButton();
    if (paused) window.clearTimeout(timer);
    else scheduleAdvance();
  });

  // Hold the slide while someone is reading it: pointer over the panels or
  // keyboard focus inside them (WCAG 2.2.2). Resume only once both leave.
  let hovering = false;
  let focused = false;
  const hold = () => window.clearTimeout(timer);
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

  render(active, { instant: true });

  if (typeof IntersectionObserver !== "undefined") {
    new IntersectionObserver(
      ([entry]) => {
        root.classList.toggle("is-visible", entry.isIntersecting);
        if (entry.isIntersecting) scheduleAdvance();
        else window.clearTimeout(timer);
      },
      { threshold: 0.2 },
    ).observe(root);
  } else {
    root.classList.add("is-visible");
    scheduleAdvance();
  }
}

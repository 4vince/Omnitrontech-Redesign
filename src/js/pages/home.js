import {
  appliedExamples,
  problems,
  proofRows,
} from "../content/home.js";

function appliedCard(example) {
  return `<article class="card">
    <span class="icon-badge"><i class="ph ${example.icon}" aria-hidden="true"></i></span>
    <h3>${example.title}</h3>
    <p>${example.body}</p>
    <div class="card__meta">
      <span class="mono">${example.slot} · ${example.sector}</span>
      <i class="ph ph-arrow-up-right" aria-hidden="true"></i>
    </div>
  </article>`;
}

function chartCard(gradientId) {
  return `<article class="card card--chart" aria-label="Illustrative decision velocity chart">
    <div class="chart-head">
      <strong>+38.2%</strong>
      <span class="chart-delta"><i class="ph ph-trend-up" aria-hidden="true"></i>Illustrative</span>
    </div>
    <p class="chart-caption">Decision velocity / 24h · illustrative model, not client data</p>
    <svg class="chart" viewBox="0 0 480 110" preserveAspectRatio="none" role="img" aria-label="Illustrative upward trend line showing faster decisions">
      <defs>
        <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ff7a2f" stop-opacity=".42"></stop>
          <stop offset="1" stop-color="#ff7a2f" stop-opacity="0"></stop>
        </linearGradient>
      </defs>
      <path class="area" style="fill:url(#${gradientId})" d="M0 92 C60 84 90 78 130 76 S200 70 240 56 S320 62 360 40 S440 34 520 22 L520 110 L0 110Z"></path>
      <path class="line" d="M0 92 C60 84 90 78 130 76 S200 70 240 56 S320 62 360 40 S440 34 520 22"></path>
      <circle cx="360" cy="40" r="5"></circle>
    </svg>
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

  const appliedMount = document.querySelector("[data-applied]");
  if (appliedMount) {
    const cards =
      appliedExamples.map(appliedCard).join("") + chartCard("chart-fill-original");
    appliedMount.innerHTML = `
      <div class="showcase-marquee__track">
        <div class="showcase-marquee__group">${cards}</div>
        <div class="showcase-marquee__group" aria-hidden="true" inert>
          ${appliedExamples.map(appliedCard).join("")}${chartCard("chart-fill-copy")}
        </div>
      </div>`;

    const pauseButton = document.querySelector("[data-showcase-toggle]");
    pauseButton?.addEventListener("click", () => {
      const paused = appliedMount.classList.toggle("is-paused");
      pauseButton.textContent = paused ? "Resume examples" : "Pause examples";
    });

    if (typeof IntersectionObserver !== "undefined") {
      new IntersectionObserver(
        ([entry]) => appliedMount.classList.toggle("is-visible", entry.isIntersecting),
        { threshold: 0.05 },
      ).observe(appliedMount);
    } else {
      appliedMount.classList.add("is-visible");
    }
  }
}

import { services, serviceContactHref } from "../content/services.js";
import {
  solutionsPageCopy,
  solutionsPageLabels,
} from "../content/solutions-copy.js";

const MARQUEE_STACK = [
  ...new Set(services.flatMap((service) => service.stack || [])),
];

function copyForService(service) {
  const copy = solutionsPageCopy[service.id];
  if (!copy) throw new Error(`Missing AI Solutions page copy for "${service.id}".`);
  return { ...service, ...copy };
}

function indexMarkup(service) {
  return `<a class="solutions-index__link" href="#service-${service.slug}" data-index-link="${service.slug}">
    <span class="solutions-index__num mono">${service.index}</span>
    <span class="solutions-index__name">${service.name}</span>
    <span class="solutions-index__headline">${service.headline}</span>
    <i class="ph ph-arrow-down-right" aria-hidden="true"></i>
  </a>`;
}

function chipsMarkup(items, className = "svc__chip") {
  return items
    .map((item) => `<li class="${className}">${item}</li>`)
    .join("");
}

function phasesMarkup(service) {
  return `<div class="svc__phases">
    <span class="mono svc__label">${solutionsPageLabels.phases} / ${service.phases.length} steps</span>
    <ol class="svc__phase-list">
      ${service.phases
        .map(
          (phase, index) => `<li class="svc__phase">
            <span class="svc__phase-num mono" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
            <h3>${phase.title}</h3>
            <p>${phase.text}</p>
          </li>`,
        )
        .join("")}
    </ol>
  </div>`;
}

function rosterMarkup(service) {
  if (!service.roster?.length) return "";
  return `<div class="svc__roster">
    <span class="mono svc__label">${solutionsPageLabels.roster}</span>
    <ul class="svc__roster-list">
      ${service.roster
        .map(
          (agent, index) => `<li>
            <span class="mono" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
            ${agent}
          </li>`,
        )
        .join("")}
    </ul>
  </div>`;
}

function rowMarkup(service) {
  return `<section class="svc" id="service-${service.slug}" aria-labelledby="service-title-${service.slug}">
    <span class="svc__glow" aria-hidden="true"></span>
    <span class="svc__edge-index mono" aria-hidden="true">${service.index}</span>
    <div class="svc__wrap">
      <div class="svc__rail" data-reveal>
        <span class="svc__index" aria-hidden="true">${service.index}</span>
        <span class="mono">Service / ${service.index} of 05</span>
        <span class="mono svc__rail-note">${service.shortName} / APAC</span>
      </div>

      <div class="svc__main">
        <div class="svc__head" data-reveal>
          <span class="tag tag--orange">${service.name}</span>
          <h2 id="service-title-${service.slug}">${service.headline}</h2>
          <p class="svc__outcome">${service.outcome}</p>
        </div>

        <div class="svc__value" data-reveal>
          <p>${service.value}</p>
        </div>

        <div class="svc__columns" data-reveal>
          <div class="svc__block">
            <span class="mono svc__label">${solutionsPageLabels.capabilities}</span>
            <ul class="svc__list">
              ${service.capabilities.map((item) => `<li>${item}</li>`).join("")}
            </ul>
          </div>
          <div class="svc__block">
            <span class="mono svc__label">${solutionsPageLabels.industries}</span>
            <ul class="svc__chips">
              ${chipsMarkup(service.industries)}
            </ul>
          </div>
        </div>

        ${phasesMarkup(service)}
        ${rosterMarkup(service)}

        <div class="svc__foot" data-reveal>
          <div class="svc__stack">
            <span class="mono svc__label">${solutionsPageLabels.stack}</span>
            <ul class="svc__chips">${chipsMarkup(service.stack)}</ul>
          </div>
          <a class="btn btn--ghost" href="${serviceContactHref(service)}">
            Talk about ${service.shortName}
            <i class="ph ph-arrow-up-right" aria-hidden="true"></i>
          </a>
        </div>
      </div>
    </div>
  </section>`;
}

export function initSolutions() {
  const indexMount = document.querySelector("[data-service-index]");
  const rowsMount = document.querySelector("[data-service-rows]");
  const stackMount = document.querySelector("[data-stack-track]");

  if (!rowsMount) return;

  if (indexMount) {
    indexMount.innerHTML = services.map(copyForService).map(indexMarkup).join("");
  }

  if (stackMount) {
    const run = MARQUEE_STACK.map(
      (tool) => `<span class="stack-marquee__item">${tool}</span>`,
    ).join("");
    // Two identical runs keep the loop seamless.
    stackMount.innerHTML = `${run}${run}`;
  }

  rowsMount.innerHTML = services.map(copyForService).map(rowMarkup).join("");

  const links = [...document.querySelectorAll("[data-index-link]")];
  if (!links.length || typeof IntersectionObserver === "undefined") return;

  const setCurrent = (slug) => {
    links.forEach((link) => {
      if (link.dataset.indexLink === slug) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setCurrent(entry.target.id.replace("service-", ""));
      });
    },
    { rootMargin: "-38% 0px -52% 0px", threshold: 0 },
  );

  services.forEach((service) => {
    const section = document.querySelector(`#service-${service.slug}`);
    if (section) observer.observe(section);
  });
}

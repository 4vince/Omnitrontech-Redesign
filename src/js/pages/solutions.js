import { services, serviceContactHref } from "../content/services.js";
import {
  solutionsPageCopy,
  solutionsPageLabels,
} from "../content/solutions-copy.js";
import {
  afterIntro,
  EASE_OUT,
  gsap,
  MOTION_OK,
  prefersReducedMotion,
  REDUCED,
  scrollToTarget,
} from "../core/motion.js";
import { serviceDiagramMarkup } from "../visuals/service-diagrams.js";

/*
 * Timing map for the AI Solutions page
 *   load      hero copy rises in (initPageIntro), then at its "visual" label
 *             the 3D overview fades up and its cards pop in one by one
 *   scroll    leaving the hero, the overview recedes and the copy lifts away
 *             (scrubbed), handing over to the first service row
 *   per row   copy lands first (stagger), the diagram frame slides in from
 *             its side, then the diagram builds once the frame has settled;
 *             while the row is on screen the frame drifts at a slower rate
 *             than the copy for depth
 */

function initWorkflowVisual() {
  const visual = document.querySelector("[data-solutions-visual]");
  const canvas = visual?.querySelector("[data-solutions-canvas]");
  if (!visual || !canvas) return;

  let scene = null;
  let isVisible = true;
  let loading = false;

  // Phones keep the static icon list: the cards would be too small to read.
  const narrow = window.matchMedia("(max-width: 760px)");

  const loadScene = async () => {
    if (loading || scene || narrow.matches) return;
    loading = true;
    try {
      const { createSolutionsHeroScene } = await import(
        "../visuals/solutions-hero-scene.js"
      );
      scene = await createSolutionsHeroScene(canvas, {
        services,
        animate: !prefersReducedMotion(),
        onSelect: (service) => scrollToTarget(`#service-${service.slug}`),
      });
      if (!scene) return;
      // Reveal the scene only once the hero copy has landed, and start the
      // card build-in at the same moment so it is actually seen.
      await afterIntro("visual");
      visual.classList.add("has-webgl");
      scene.playIntro();
      if (!isVisible) scene.pause();
    } catch (error) {
      console.error("Could not load the AI Solutions visual.", error);
    } finally {
      loading = false;
    }
  };

  if (typeof IntersectionObserver !== "undefined") {
    new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (!scene && isVisible) void loadScene();
        else if (scene && isVisible && !narrow.matches) scene.resume();
        else scene?.pause();
      },
      { threshold: 0.02 },
    ).observe(visual);
  } else {
    void loadScene();
  }

  narrow.addEventListener?.("change", () => {
    if (narrow.matches) scene?.pause();
    else if (scene && isVisible) scene.resume();
    else if (isVisible) void loadScene();
  });

  window.matchMedia(REDUCED).addEventListener?.("change", () => {
    scene?.setMotionEnabled(!prefersReducedMotion());
  });
}

/* Scroll hand-off out of the hero: scrubbed, so it tracks the wheel exactly. */
function initHeroExit() {
  const hero = document.querySelector(".solutions-hero");
  const visual = hero?.querySelector("[data-solutions-visual]");
  const copy = hero?.querySelector(".solutions-hero__copy");
  if (!hero || !visual || !copy) return;

  const mm = gsap.matchMedia();
  mm.add(`${MOTION_OK} and (min-width: 761px)`, () => {
    gsap
      .timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
      })
      .to(visual, { yPercent: -12, scale: 0.94, opacity: 0.15 }, 0)
      .to(copy, { y: -70, opacity: 0.2 }, 0);
  });
}

/*
 * One timeline per service row so the copy and its diagram arrive as a
 * single beat instead of on unrelated timers.
 */
function initServiceRows() {
  const rows = gsap.utils.toArray(".svc");
  if (!rows.length) return;

  const mm = gsap.matchMedia();
  mm.add({ motion: MOTION_OK, reduced: REDUCED }, ({ conditions }) => {
    rows.forEach((row, index) => {
      const visual = row.querySelector("[data-service-host]");
      if (!visual) return;

      if (conditions.reduced) {
        visual.classList.remove("is-armed");
        visual.classList.add("is-live");
        return;
      }

      const copy = row.querySelectorAll(".svc__copy > *");
      // Odd rows put the diagram on the right, even rows on the left.
      const side = index % 2 === 0 ? 1 : -1;
      visual.classList.add("is-armed");

      gsap
        .timeline({
          defaults: { ease: EASE_OUT, duration: 0.85 },
          scrollTrigger: { trigger: row, start: "top 80%", once: true },
        })
        .addLabel("copy", 0)
        .from(copy, { y: 30, opacity: 0, stagger: 0.08 }, "copy")
        .addLabel("frame", 0.12)
        .from(visual, { x: 60 * side, opacity: 0, duration: 1 }, "frame")
        // Build the diagram as the frame settles, not before it is visible.
        .call(() => visual.classList.add("is-live"), null, "frame+=0.45");

      // Depth while the row is on screen: the frame drifts slower than copy.
      gsap.fromTo(
        visual,
        { y: 36 },
        {
          y: -36,
          ease: "none",
          scrollTrigger: { trigger: row, start: "top bottom", end: "bottom top", scrub: true },
        },
      );
    });

    return () => rows.forEach((row) => row.querySelector("[data-service-host]")?.classList.add("is-live"));
  });
}

function copyForService(service) {
  const copy = solutionsPageCopy[service.id];
  if (!copy) throw new Error(`Missing AI Solutions page copy for "${service.id}".`);
  return { ...service, ...copy };
}

function indexMarkup(service) {
  return `<a class="solutions-index__link" href="#service-${service.slug}" data-index-link="${service.slug}">
    <i class="ph ${service.icon}" aria-hidden="true"></i>
    <span class="solutions-index__name">${service.name}</span>
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
    <h3>${solutionsPageLabels.phases}</h3>
    <ol class="svc__phase-list">
      ${service.phases
        .map(
          (phase) => `<li class="svc__phase">
            <h4>${phase.title}</h4>
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
    <h3>${solutionsPageLabels.roster}</h3>
    <ul class="svc__roster-list">
      ${service.roster.map((agent) => `<li>${agent}</li>`).join("")}
    </ul>
  </div>`;
}

function detailsMarkup(service) {
  return `<details class="svc__details">
    <summary>Service details <i class="ph ph-plus" aria-hidden="true"></i></summary>
    <div class="svc__details-body">
      <p class="svc__summary">${service.summary}</p>
      <p class="svc__value">${service.value}</p>
      <div class="svc__details-grid">
        <div>
          <h3>${solutionsPageLabels.capabilities}</h3>
          <ul class="svc__list">${service.capabilities.map((item) => `<li>${item}</li>`).join("")}</ul>
        </div>
        <div>
          <h3>${solutionsPageLabels.industries}</h3>
          <ul class="svc__chips">${chipsMarkup(service.industries)}</ul>
        </div>
      </div>
      ${phasesMarkup(service)}
      ${rosterMarkup(service)}
      <div class="svc__stack">
        <h3>${solutionsPageLabels.stack}</h3>
        <ul class="svc__chips">${chipsMarkup(service.stack)}</ul>
      </div>
    </div>
  </details>`;
}

// Every second service row is a deep-navy block (tones.css), with its
// diagram kept on light tokens so it reads as a light card on navy.
function rowMarkup(service, index) {
  const tone = index % 2 === 1 ? " tone-navy" : "";
  return `<section class="svc${tone}" id="service-${service.slug}" aria-labelledby="service-title-${service.slug}">
    <div class="svc__wrap">
      <div class="svc__copy">
        <h2 id="service-title-${service.slug}">${service.name}</h2>
        <p class="svc__outcome">${service.outcome}</p>
        <a class="text-link" href="${serviceContactHref(service)}">
          Discuss this service
          <i class="ph ph-arrow-up-right" aria-hidden="true"></i>
        </a>
        ${detailsMarkup(service)}
      </div>
      <figure class="svc__visual tone-light" data-tilt data-service-host data-service-id="${service.id}">
        ${serviceDiagramMarkup(service.id)}
      </figure>
    </div>
  </section>`;
}

export function initSolutions() {
  initWorkflowVisual();
  initHeroExit();
  const indexMount = document.querySelector("[data-service-index]");
  const rowsMount = document.querySelector("[data-service-rows]");

  if (!rowsMount) return;

  if (indexMount) {
    indexMount.innerHTML = services.map(copyForService).map(indexMarkup).join("");
  }

  rowsMount.innerHTML = services.map(copyForService).map(rowMarkup).join("");
  initServiceRows();

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

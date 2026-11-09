import { services, serviceContactHref } from "../content/services.js";
import { contactSteps } from "../content/home.js";
import {
  solutionsPageCopy,
  solutionsPageLabels,
  solutionsSceneCaptions,
} from "../content/solutions-copy.js";
import {
  afterIntro,
  EASE_OUT,
  gsap,
  MOTION_OK,
  prefersReducedMotion,
  REDUCED,
  ScrollTrigger,
  scrollToTarget,
} from "../core/motion.js";
import { serviceDiagramMarkup } from "../visuals/service-diagrams.js";

/*
 * Timing map for the AI Solutions page
 *   load      hero copy rises in (initPageIntro), then at its "visual" label
 *             the 3D overview fades up and its cards pop in one by one
 *   scroll    leaving the hero, the overview recedes and the copy lifts away
 *             (scrubbed), handing over to the first service row
 *   per service  the 3D scene is the section: the title and outcome rise in
 *             over it, the scene's story restarts from its first step, and
 *             the captions under it light up in time with what is playing.
 *             While the section crosses the viewport the camera orbits a
 *             little (scrubbed), so the model reads as a real object.
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

/* Scene modules, loaded only when their section comes near the viewport. */
const SCENES = {
  strategy: () => import("../visuals/service-scenes/strategy.js"),
  automation: () => import("../visuals/service-scenes/automation.js"),
  agentic: () => import("../visuals/service-scenes/agentic.js"),
  experience: () => import("../visuals/service-scenes/experience.js"),
  data: () => import("../visuals/service-scenes/data.js"),
};

// Phones keep the flat diagram: the 3D labels would be too small to read.
const WIDE = "(min-width: 761px)";

function setActiveCaption(stage, index, story) {
  const items = stage.querySelectorAll("[data-caption]");
  if (index === null) {
    items.forEach((item) => item.classList.remove("is-active", "is-done"));
    stage.classList.add("is-static");
    return;
  }
  stage.classList.remove("is-static");
  const { marks, cycle } = story;
  const duration = (marks[index + 1] ?? cycle) - marks[index];
  items.forEach((item, i) => {
    item.classList.toggle("is-done", i < index);
    if (i === index) {
      item.style.setProperty("--step-dur", `${duration.toFixed(2)}s`);
      // Restart the progress line for this step.
      item.classList.remove("is-active");
      void item.offsetWidth;
      item.classList.add("is-active");
    } else {
      item.classList.remove("is-active");
    }
  });
}

function initServiceStage(section) {
  const stage = section.querySelector("[data-svx]");
  const canvas = stage?.querySelector("canvas");
  const load = SCENES[stage?.dataset.serviceId];
  if (!stage || !canvas || !load) return;

  const wide = window.matchMedia(WIDE);
  let scene = null;
  let loading = false;
  let visible = false;
  let seen = false;
  let scroll = 0;
  // Pause control for the looping scene (WCAG 2.2.2).
  let userPaused = false;
  const toggle = stage.querySelector("[data-svx-toggle]");
  const paintToggle = () => {
    if (!toggle) return;
    toggle.setAttribute("aria-pressed", String(userPaused));
    toggle.setAttribute("aria-label", userPaused ? "Play animation" : "Pause animation");
    toggle.innerHTML = `<i class="ph ${userPaused ? "ph-play" : "ph-pause"}" aria-hidden="true"></i>`;
  };
  paintToggle();
  toggle?.addEventListener("click", () => {
    userPaused = !userPaused;
    paintToggle();
    if (!scene) return;
    if (userPaused) scene.pause();
    else if (visible) scene.resume();
  });

  const start = async () => {
    if (scene || loading || !wide.matches) return;
    loading = true;
    try {
      const [{ createServiceStage }, { build }] = await Promise.all([
        import("../visuals/service-scenes/kit.js"),
        load(),
      ]);
      scene = await createServiceStage(canvas, {
        build,
        animate: !prefersReducedMotion(),
        dark: section.classList.contains("tone-navy"),
        host: section,
        onStep: (index, story) => setActiveCaption(stage, index, story),
      });
      if (!scene) {
        stage.classList.add("is-fallback");
        return;
      }
      stage.classList.add("has-webgl");
      scene.setScroll(scroll);
      if (visible) {
        seen = true;
        if (!userPaused) scene.resume();
      }
    } catch (error) {
      console.error(`Could not load the ${stage.dataset.serviceId} visual.`, error);
      stage.classList.add("is-fallback");
    } finally {
      loading = false;
    }
  };

  if (typeof IntersectionObserver === "undefined") {
    visible = true;
    void start();
  } else {
    // Load a screen ahead so the model is ready when the section arrives.
    new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void start();
      },
      { rootMargin: "100% 0px" },
    ).observe(stage);

    new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        // A jump straight to this section can skip the look-ahead trigger.
        if (!scene) {
          if (visible) void start();
          return;
        }
        if (visible) {
          // First time on screen: play the story from its first step.
          if (!seen) scene.restart();
          seen = true;
          if (!userPaused) scene.resume();
        } else {
          scene.pause();
        }
      },
      { threshold: 0.08 },
    ).observe(stage);
  }

  // Scrubbed camera orbit across the section's pass through the viewport.
  ScrollTrigger.create({
    trigger: section,
    start: "top bottom",
    end: "bottom top",
    onUpdate: (self) => {
      scroll = self.progress * 2 - 1;
      scene?.setScroll(scroll);
    },
  });

  wide.addEventListener?.("change", () => {
    if (!wide.matches) scene?.pause();
    else if (scene && visible && !userPaused) scene.resume();
    else void start();
  });

  window.matchMedia(REDUCED).addEventListener?.("change", () => {
    scene?.setMotionEnabled(!prefersReducedMotion());
  });
}

/* Title and outcome rise in over the scene; captions follow. */
function initServiceEntrances(sections) {
  const mm = gsap.matchMedia();
  mm.add(MOTION_OK, () => {
    sections.forEach((section) => {
      gsap
        .timeline({
          defaults: { ease: EASE_OUT, duration: 0.9 },
          scrollTrigger: { trigger: section, start: "top 72%", once: true },
        })
        .from(section.querySelectorAll(".svx__head > *"), { y: 34, opacity: 0, stagger: 0.09 })
        // Scale only: the canvas's opacity belongs to its CSS fade-in.
        .from(section.querySelectorAll(".svx__canvas"), { scale: 0.965, duration: 1.2 }, 0.1)
        .from(section.querySelectorAll(".svx__fallback"), { y: 28, opacity: 0, duration: 1 }, 0.1)
        .from(section.querySelectorAll(".svx__captions li"), { y: 14, opacity: 0, stagger: 0.06, duration: 0.6 }, 0.35)
        .from(section.querySelectorAll(".svx__info > *"), { y: 18, opacity: 0, stagger: 0.08, duration: 0.6 }, 0.45);
    });
  });
}

// Closing band: the same three steps as the homepage and contact page.
function renderCloseSteps() {
  const mount = document.querySelector("[data-close-steps]");
  if (!mount) return;
  mount.innerHTML = contactSteps
    .map((step) => `<li class="cta-close__step"><span class="mono">${step.label}</span><p>${step.body}</p></li>`)
    .join("");
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

// Every second service is a deep-navy block (tones.css). The 3D scene is the
// section; the title sits over it and the details wait underneath. The flat
// diagram is the phone / no-WebGL version of the same picture.
// Title placement walks the page so the text never sits on one side only.
const ALIGN = ["start", "end", "center", "start", "end"];

function rowMarkup(service, index) {
  const tone = index % 2 === 1 ? " tone-navy" : "";
  const align = ` svx--${ALIGN[index % ALIGN.length]}`;
  const captions = solutionsSceneCaptions[service.id] ?? [];
  return `<section class="svx${tone}${align}" id="service-${service.slug}" aria-labelledby="service-title-${service.slug}">
    <div class="svx__stage" data-svx data-service-id="${service.id}">
      <canvas class="svx__canvas" aria-hidden="true"></canvas>
      <header class="svx__head">
        <h2 id="service-title-${service.slug}">${service.name}</h2>
        <p class="svx__outcome">${service.outcome}</p>
      </header>
      <figure class="svx__fallback svc__visual is-live tone-light">${serviceDiagramMarkup(service.id)}</figure>
      <ol class="svx__captions" aria-label="What the visual shows">
        ${captions.map((text) => `<li data-caption><span>${text}</span></li>`).join("")}
      </ol>
      <button class="svx__toggle" type="button" data-svx-toggle aria-pressed="false" aria-label="Pause animation"></button>
    </div>
    <div class="svx__info">
      <a class="text-link" href="${serviceContactHref(service)}">
        Discuss this service
        <i class="ph ph-arrow-up-right" aria-hidden="true"></i>
      </a>
      ${detailsMarkup(service)}
    </div>
  </section>`;
}

export function initSolutions() {
  renderCloseSteps();
  initWorkflowVisual();
  initHeroExit();
  const indexMount = document.querySelector("[data-service-index]");
  const rowsMount = document.querySelector("[data-service-rows]");

  if (!rowsMount) return;

  if (indexMount) {
    indexMount.innerHTML = services.map(copyForService).map(indexMarkup).join("");
  }

  rowsMount.innerHTML = services.map(copyForService).map(rowMarkup).join("");
  const sections = [...rowsMount.querySelectorAll(".svx")];
  sections.forEach(initServiceStage);
  initServiceEntrances(sections);

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

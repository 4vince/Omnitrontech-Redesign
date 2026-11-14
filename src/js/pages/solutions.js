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
import { initServiceStack } from "./solutions-stack.js";
import { createStageLayout, setActiveCaption, wirePauseToggle } from "../core/visual-stage.js";

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
        onSelect: (service) => {
          const card = document.querySelector(`#service-${service.slug}`);
          if (stack && card) stack.scrollTo(card);
          else scrollToTarget(card);
        },
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
  const photo = hero?.querySelector("[data-solutions-photo]");
  if (!hero || !visual || !copy) return;

  // The hero is a dark photograph from the first pixel: while it is under
  // the nav, the nav takes light ink (layout.css, as on the home hero).
  const nav = document.querySelector("#site-nav");
  if (nav) {
    nav.classList.add("is-hero-static");
    ScrollTrigger.create({
      trigger: hero,
      start: "top bottom",
      end: () => `bottom top+=${nav.offsetHeight || 76}`,
      toggleClass: { targets: nav, className: "is-on-hero" },
    });
  }

  const mm = gsap.matchMedia();
  mm.add(`${MOTION_OK} and (min-width: 761px)`, () => {
    gsap
      .timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
      })
      .to(visual, { yPercent: -12, scale: 0.94, opacity: 0.15 }, 0)
      .to(copy, { y: -70, opacity: 0.2 }, 0)
      // The room pushes in slowly behind them.
      .fromTo(photo, { scale: 1 }, { scale: 1.06 }, 0);
  });
}

/* Scene modules, loaded only when their section comes near the viewport. */
// Strategy, Automation and AI Agents are Three.js holograms (visuals/holo3d).
const HOLO3D = () => import("../visuals/holo3d/kit.js");
// Customer Support and Data & Reporting stay flat 2D holographic boards.
const HOLO2D = () => import("../visuals/holo/holo-kit.js");
const SCENES = {
  strategy: { kit: HOLO3D, scene: () => import("../visuals/holo3d/strategy.js") },
  automation: { kit: HOLO3D, scene: () => import("../visuals/holo3d/automation.js") },
  agentic: { kit: HOLO3D, scene: () => import("../visuals/holo3d/agentic.js") },
  experience: { kit: HOLO2D, scene: () => import("../visuals/holo/experience.js") },
  data: { kit: HOLO2D, scene: () => import("../visuals/holo/data.js") },
};

// Phones and tablets keep the flat diagram: below this width the
// hologram's labels would be too small to read.
const WIDE = "(min-width: 1200px)";

let stack = null;

function initServiceStage(section) {
  const stage = section.querySelector("[data-svx]");
  const canvas = stage?.querySelector("canvas");
  const load = SCENES[stage?.dataset.serviceId];
  if (!stage || !canvas || !load) return;

  const wide = window.matchMedia(WIDE);
  let failed = false;
  const syncWidth = () => stage.classList.toggle("is-fallback", failed || !wide.matches);
  syncWidth();
  let scene = null;
  let loading = false;
  let visible = false;
  let onScreen = false;
  // Buried under the next card in the stack (solutions-stack.js).
  let covered = false;

  // The scene takes the box beside or below the title, clear of the title
  // and captions (core/visual-stage.js). Light cards place their navy panel
  // there (--svx-x/y/w/h); navy cards frame the camera in it (area option).
  const { layout, area } = createStageLayout(stage, {
    aspect: () => scene?.aspect ?? 2.2,
    onChange: () => scene?.refit(),
  });
  let seen = false;
  let scroll = 0;
  // Pause control for the looping scene (WCAG 2.2.2).
  const pauseControl = wirePauseToggle(stage, (paused) => {
    if (!scene) return;
    if (paused) scene.pause();
    else if (visible) scene.resume();
  });
  const userPaused = () => pauseControl.paused();

  const start = async () => {
    if (scene || loading || !wide.matches) return;
    loading = true;
    try {
      const [{ createHoloStage }, { build }] = await Promise.all([load.kit(), load.scene()]);
      scene = await createHoloStage(canvas, {
        build,
        animate: !prefersReducedMotion(),
        // Light cards show the hologram inside a navy display panel.
        panel: !section.classList.contains("tone-navy"),
        area,
        host: section,
        onStep: (index, story) => setActiveCaption(stage, index, story),
      });
      if (!scene) {
        failed = true;
      syncWidth();
        return;
      }
      stage.classList.add("has-visual");
      // Now the scene's proportions are known: choose its box again.
      layout();
      if (import.meta.env.DEV) stage.svxScene = scene;
      scene.setScroll(scroll);
      if (visible) {
        seen = true;
        if (!userPaused()) scene.resume();
      }
    } catch (error) {
      console.error(`Could not load the ${stage.dataset.serviceId} visual.`, error);
      failed = true;
      syncWidth();
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

    const sync = () => {
      visible = onScreen && !covered;
      // A jump straight to this section can skip the look-ahead trigger.
      if (!scene) {
        if (visible) void start();
        return;
      }
      if (visible) {
        // First time on screen: play the story from its first step.
        if (!seen) scene.restart();
        seen = true;
        if (!userPaused()) scene.resume();
      } else {
        scene.pause();
      }
    };
    new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        sync();
      },
      { threshold: 0.08 },
    ).observe(stage);
    section.addEventListener("svx:covered", (event) => {
      covered = event.detail;
      sync();
    });
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
    syncWidth();
    if (!wide.matches) scene?.pause();
    else if (scene && visible && !userPaused()) scene.resume();
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
    <div class="svx__tab" aria-hidden="true"><i class="ph ${service.icon}"></i><span>${service.name}</span></div>
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
  stack = initServiceStack({
    mount: rowsMount,
    sections,
    closer: document.querySelector(".cta-band--close"),
  });

  // In-page links go through the stack: a stuck card's own rect is not
  // where the card lives. Capture phase, so Lenis's anchor handler (which
  // would measure that rect) never sees the click.
  document.addEventListener(
    "click",
    (event) => {
      const link = event.target.closest?.('a[href^="#service-"]');
      const card = link && document.querySelector(link.getAttribute("href"));
      if (!card) return;
      event.preventDefault();
      event.stopPropagation();
      stack.scrollTo(card);
    },
    true,
  );

  // Scroll-spy: the current service is the last card whose top has reached
  // the upper half of the screen. Rect-based, so it holds while cards are
  // stuck (an IntersectionObserver never sees a stuck card leave).
  const links = [...document.querySelectorAll("[data-index-link]")];
  if (!links.length) return;
  let current = null;
  const spy = () => {
    const line = window.innerHeight * 0.45;
    let slug = null;
    sections.forEach((section) => {
      if (section.getBoundingClientRect().top <= line) slug = section.id.replace("service-", "");
    });
    if (slug === current) return;
    current = slug;
    links.forEach((link) => {
      if (link.dataset.indexLink === slug) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  };
  ScrollTrigger.create({ start: 0, end: "max", onUpdate: spy, onRefresh: spy });
}

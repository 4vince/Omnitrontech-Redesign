import { services, serviceContactHref } from "../content/services.js";
import { contactSteps } from "../content/home.js";
import {
  solutionsPageCopy,
  solutionsPageLabels,
  solutionsSceneCaptions,
} from "../content/solutions-copy.js";
import {
  EASE_OUT,
  gsap,
  MOTION_OK,
  prefersReducedMotion,
  REDUCED,
  ScrollTrigger,
  scrollToTarget,
} from "../core/motion.js";
import { serviceDiagramMarkup } from "../visuals/service-diagrams.js";
import { createStageLayout, setActiveCaption, wirePauseToggle } from "../core/visual-stage.js";

/*
 * Timing map for the AI Solutions page
 *   load      hero copy rises in over the operations-lab photograph
 *   scroll    leaving the hero, the copy lifts away and the room pushes in
 *             (scrubbed), handing over to the first service row
 *   per service  the 3D scene is the section: the title and outcome rise in
 *             over it, the scene's story restarts from its first step, and
 *             the captions under it light up in time with what is playing.
 *             While the section crosses the viewport the camera orbits a
 *             little (scrubbed), so the model reads as a real object.
 */

/* Scroll hand-off out of the hero: scrubbed, so it tracks the wheel exactly. */
function initHeroExit() {
  const track = document.querySelector("[data-solutions-track]");
  const hero = document.querySelector(".solutions-hero");
  const copy = hero?.querySelector(".solutions-hero__copy");
  if (!hero || !copy) return;
  // The hero may hold (sticky) inside its track, so scroll positions are
  // measured on the track, which ScrollTrigger sees as ordinary layout.
  const span = track || hero;

  // The hero is a dark photograph from the first pixel: while it is under
  // the nav, the nav takes light ink (layout.css, as on the home hero).
  const nav = document.querySelector("#site-nav");
  if (nav) {
    nav.classList.add("is-hero-static");
    ScrollTrigger.create({
      trigger: span,
      start: "top bottom",
      end: () => `bottom top+=${nav.offsetHeight || 76}`,
      toggleClass: { targets: nav, className: "is-on-hero" },
    });
  }

  const mm = gsap.matchMedia();
  mm.add(`${MOTION_OK} and (min-width: 761px)`, () => {
    // Once the camera has settled, the copy lifts away as the hero leaves.
    gsap.to(copy, {
      y: -70,
      opacity: 0.2,
      ease: "none",
      scrollTrigger: { trigger: span, start: "bottom bottom", end: "bottom top", scrub: true },
    });
  });

}

/*
 * The office tour. Desktop with full motion only (TOUR; the CSS agrees);
 * phones never download Three.js. One fixed office sits behind the page:
 *   hero      the camera comes back from the skyline, through the glass
 *   services  each service walks the camera to its own station in the room
 *             and holds there while its panel is read
 *   close     back to the wide view as the CTA band arrives
 * The still photograph is the fallback: shown if the room is slow (2.5s)
 * and kept if it fails, with the panels over it as before.
 */
const TOUR = "(min-width: 761px) and (prefers-reduced-motion: no-preference)";
const TOUR_MQ = window.matchMedia(TOUR);

// Each service's place in the operations lab (photo fractions), how close
// the camera comes, where the station is held on screen (-1..1, y up) and
// which side its panel takes, the other side from the station.
const STATIONS = {
  strategy: { at: [0.47, 0.4], zoom: 1.35, screen: [-0.42, 0.04], side: "end" }, // the window wall: the view ahead
  automation: { at: [0.75, 0.36], zoom: 1.6, screen: [0.36, 0.06], side: "start" }, // the flow on the wall display
  agentic: { at: [0.6, 0.52], zoom: 1.7, screen: [-0.36, 0], side: "end" }, // the monitors running the agents
  // The desk is the nearest thing in the room: a gentle approach, or its
  // edges tear away from what is behind them.
  experience: { at: [0.8, 0.64], zoom: 1.22, screen: [0.28, -0.08], side: "start" }, // the laptop at the desk
  data: { at: [0.9, 0.52], zoom: 1.55, screen: [0.36, -0.12], side: "start" }, // the reporting screen
};

// Between two stations the camera holds for the first and last part of the
// stretch (while a panel is being read) and moves in the middle.
const HOLD = 0.28;
const ARC = 0.3;
const moveAt = (t) => {
  const u = Math.min(1, Math.max(0, (t - HOLD) / (1 - 2 * HOLD)));
  return u * u * (3 - 2 * u);
};

function initOfficeTour({ track, sections, closer }) {
  const office = document.querySelector("[data-solutions-office]");
  const canvas = office?.querySelector("[data-solutions-room]");
  if (!track || !office || !canvas || !TOUR_MQ.matches) return;
  const ids = sections.map((section) => section.querySelector("[data-svx]")?.dataset.serviceId);

  let room = null;
  // Stops down the page: [scrollY, pose]. Rebuilt on every refresh.
  let stops = [];
  const pageY = (el) => el.getBoundingClientRect().top + window.scrollY;
  function measure() {
    const vh = window.innerHeight;
    const heroEnd = Math.max(1, track.offsetHeight - vh);
    stops = [
      [0, "start"],
      [heroEnd, "rest"],
    ];
    sections.forEach((section, i) => {
      // A station is fully framed when its panel sits mid-screen.
      const panel = section.querySelector(".svx__stage");
      const mid = pageY(panel) + (panel.offsetHeight + (section.querySelector(".svx__info")?.offsetHeight || 0)) / 2;
      stops.push([Math.max(heroEnd + 1, mid - vh / 2), i]);
    });
    if (closer) stops.push([pageY(closer) - vh * 0.4, "rest"]);
  }
  function update() {
    if (!room || !stops.length) return;
    const y = window.scrollY;
    if (y <= stops[1][0]) {
      room.setProgress(y / stops[1][0]);
      return;
    }
    for (let i = 1; i < stops.length - 1; i += 1) {
      const [ya, a] = stops[i];
      const [yb, b] = stops[i + 1];
      if (y <= yb) {
        room.setPath(a, b, moveAt((y - ya) / Math.max(1, yb - ya)), ARC);
        return;
      }
    }
    room.setPath("rest", "rest", 1);
  }

  measure();
  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: update,
    onRefresh: () => {
      measure();
      update();
    },
  });

  (async () => {
    const slow = setTimeout(() => office.classList.add("is-room-slow"), 2500);
    try {
      const { createRoomScene } = await import("../visuals/room-scene.js");
      room = await createRoomScene(canvas, {
        plates: "/images/room/solutions-ops-lab",
        position: [0.5, 0.45], // the photo's object-position
        focus: [0.27, 0.42], // the skyline in the left panes
        stations: ids.map((id) => STATIONS[id] ?? { at: [0.5, 0.5], zoom: 1 }),
      });
      update();
      canvas.classList.add("is-ready");
    } catch (error) {
      console.warn("[room] keeping the photograph", error);
      office.classList.add("is-room-off");
      track.classList.add("is-room-off");
      ScrollTrigger.refresh();
    } finally {
      clearTimeout(slow);
    }
  })();

  return {
    // Land a service with its station framed and its panel mid-screen.
    scrollTo(card, { immediate = false, ...options } = {}) {
      const stop = stops.find(([, key]) => key === sections.indexOf(card));
      const y = stop ? stop[0] : pageY(card);
      if (immediate) window.scrollTo(0, y);
      else scrollToTarget(y, options);
    },
  };
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

/*
 * The office tour's hologram: the same scene as the plain rows, framed in
 * the open side of the section (.svx__holo) instead of inside the panel.
 * Wide screens only, as on the rows; it loads a screen ahead, plays its
 * story from the first step when it arrives, pauses off screen, and keeps
 * its pause control (WCAG 2.2.2).
 */
function initTourHolo(section) {
  const holo = section.querySelector(".svx__holo");
  const canvas = holo?.querySelector("canvas");
  const load = SCENES[section.querySelector("[data-svx]")?.dataset.serviceId];
  if (!holo || !canvas || !load) return;
  const wide = window.matchMedia(WIDE);
  let scene = null;
  let loading = false;
  let visible = false;
  let seen = false;
  let scroll = 0;
  const area = () => ({ x: 0, y: 0, w: holo.clientWidth, h: holo.clientHeight });
  const pauseControl = wirePauseToggle(holo, (paused) => {
    if (!scene) return;
    if (paused) scene.pause();
    else if (visible) scene.resume();
  });

  const start = async () => {
    if (scene || loading || !wide.matches) return;
    loading = true;
    try {
      const [{ createHoloStage }, { build }] = await Promise.all([load.kit(), load.scene()]);
      scene = await createHoloStage(canvas, { build, animate: true, panel: false, area, host: section });
      if (!scene) return;
      holo.classList.add("has-visual");
      scene.refit?.();
      scene.setScroll(scroll);
      if (visible) {
        seen = true;
        scene.restart();
        if (!pauseControl.paused()) scene.resume();
      } else {
        scene.pause();
      }
    } catch (error) {
      console.error(`Could not load the ${section.id} visual.`, error);
    } finally {
      loading = false;
    }
  };

  new IntersectionObserver(([entry]) => entry.isIntersecting && void start(), { rootMargin: "100% 0px" }).observe(holo);
  new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (!scene) return;
      if (visible) {
        // Revealed with its panel: the story starts from its first step.
        if (!seen) scene.restart();
        seen = true;
        if (!pauseControl.paused()) scene.resume();
      } else {
        scene.pause();
      }
    },
    { threshold: 0.2 },
  ).observe(holo);
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => scene?.refit?.()).observe(holo);

  // The same slow orbit as on the rows, across the section's pass.
  ScrollTrigger.create({
    trigger: section,
    start: "top bottom",
    end: "bottom top",
    onUpdate: (self) => {
      scroll = self.progress * 2 - 1;
      scene?.setScroll(scroll);
    },
  });
}

function initServiceStage(section) {
  if (TOUR_MQ.matches) return;
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
  // Hidden from view by its section (an event any layout may send).
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
          scrollTrigger: {
            trigger: TOUR_MQ.matches ? section.querySelector(".svx__stage") : section,
            start: TOUR_MQ.matches ? "top 88%" : "top 94%",
            once: true,
          },
        })
        .from(section.querySelectorAll(".svx__head > *"), { y: 34, opacity: 0, stagger: 0.09 })
        // Scale only: the canvas's opacity belongs to its CSS fade-in.
        .from(section.querySelectorAll(".svx__canvas"), { scale: 0.965, duration: 1.2 }, 0.1)
        .from(section.querySelectorAll(".svx__fallback"), { y: 28, opacity: 0, duration: 1 }, 0.1)
        .from(section.querySelectorAll(".svx__captions li"), { y: 14, opacity: 0, stagger: 0.06, duration: 0.6 }, 0.35)
        .from(section.querySelectorAll(".svx__info > *"), { y: 18, opacity: 0, stagger: 0.08, duration: 0.6 }, 0.45)
        // On the office tour the hologram comes up beside its panel.
        .from(section.querySelectorAll(".svx__holo"), { y: 40, opacity: 0, scale: 0.94, duration: 1.2 }, 0.1);
    });
  });
}

// Closing band: the same three steps as the homepage and contact page.
function renderCloseSteps() {
  const mount = document.querySelector("[data-close-steps]");
  if (!mount) return;
  mount.innerHTML = contactSteps
    .map((step) => `<li class="cta-close__step"><i class="ph ${step.icon}" aria-hidden="true"></i><p>${step.body}</p></li>`)
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

/* What a client leaves with: shown only when the scene sits beside the title,
   where it fills the column under it (visual-stage.js sets .is-beside). */
function deliverMarkup(service) {
  if (!service.tags?.length) return "";
  return `<div class="svx__deliver">
          <p>What you leave with</p>
          <ul>${service.tags.map((tag) => `<li><i class="ph ph-check" aria-hidden="true"></i>${tag}</li>`).join("")}</ul>
        </div>`;
}

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
        ${deliverMarkup(service)}
      </header>
      <figure class="svx__fallback svc__visual is-live tone-light">${serviceDiagramMarkup(service.id)}</figure>
      <ol class="svx__captions" aria-label="What the visual shows">
        ${captions.map((text) => `<li data-caption><span>${text}</span></li>`).join("")}
      </ol>
      <button class="svx__toggle" type="button" data-svx-toggle aria-pressed="false" aria-label="Pause animation"></button>
    </div>
    <div class="svx__info">
      <a class="text-link" href="${serviceContactHref(service)}">
        Start the conversation
        <i class="ph ph-arrow-up-right" aria-hidden="true"></i>
      </a>
      ${detailsMarkup(service)}
    </div>
  </section>`;
}

export function initSolutions() {
  renderCloseSteps();
  initHeroExit();
  const indexMount = document.querySelector("[data-service-index]");
  const rowsMount = document.querySelector("[data-service-rows]");

  if (!rowsMount) return;

  if (indexMount) {
    indexMount.innerHTML = services.map(copyForService).map(indexMarkup).join("");
  }

  rowsMount.innerHTML = services.map(copyForService).map(rowMarkup).join("");
  const sections = [...rowsMount.querySelectorAll(".svx")];
  const closer = document.querySelector(".cta-band--close");
  const tour = initOfficeTour({ track: document.querySelector("[data-solutions-track]"), sections, closer });
  if (tour) {
    // Glass panels over the office: light ink, and each panel on the side
    // away from its station.
    sections.forEach((section) => {
      const id = section.querySelector("[data-svx]")?.dataset.serviceId;
      section.classList.add("is-tour", "tone-navy");
      section.dataset.side = STATIONS[id]?.side ?? "start";
      // The service's hologram floats over the office on the open side, so
      // the canvas and its pause control move out of the panel.
      const holo = document.createElement("div");
      holo.className = "svx__holo";
      holo.append(...section.querySelectorAll(".svx__canvas, [data-svx-toggle]"));
      section.append(holo);
      section.querySelector(".svx__details, details")?.addEventListener("toggle", () => ScrollTrigger.refresh());
    });
  }
  sections.forEach(tour ? initTourHolo : initServiceStage);
  initServiceEntrances(sections);
  // Phones and reduced motion: plain rows, plain scrolling.
  stack = tour || { scrollTo: (card, { immediate = false, ...options } = {}) => (immediate ? card.scrollIntoView() : scrollToTarget(card, options)) };
  // The tour and the plain rows are laid out for one side of the breakpoint
  // (and of reduced motion): crossing it rebuilds the page.
  TOUR_MQ.addEventListener?.("change", () => location.reload());

  // In-page links land where the tour frames the service (its station held,
  // its panel mid-screen), not at the section top. Capture phase, so
  // Lenis's own anchor handler never sees the click.
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

  // Arriving with a service hash (the homepage's service index links here):
  // the sections are rendered by script, so the browser's own jump to the
  // fragment finds nothing. Land on the card once the page has settled.
  const arrival = /^#service-[\w-]+$/.test(location.hash) && document.querySelector(location.hash);
  if (arrival) {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    const land = () =>
      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
        stack.scrollTo(arrival, { immediate: true });
      });
    if (document.readyState === "complete") land();
    else window.addEventListener("load", land, { once: true });
  }

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

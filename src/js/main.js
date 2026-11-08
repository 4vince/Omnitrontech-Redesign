import "@fontsource-variable/archivo";
import "@fontsource-variable/manrope";
import "@fontsource-variable/jetbrains-mono";
import "@phosphor-icons/web/regular";

import "../styles/main.css";

import {
  initPageIntro,
  initParallax,
  initReveal,
  initSmoothScroll,
  initZoomReveal,
  refreshMotion,
} from "./core/motion.js";
import { initBackdrops } from "./core/backdrop.js";
import { initTheme } from "./core/theme.js";
import { initContact } from "./pages/contact.js";
import { initHandoff } from "./home/handoff.js";
import { initHomeSections } from "./pages/home.js";
import { initSolutions } from "./pages/solutions.js";
import { initFaq } from "./ui/faq.js";
import { initFooter } from "./ui/footer.js";
import { initNav } from "./ui/nav.js";
import { initRails } from "./ui/rail.js";
import { initScrollProgress } from "./ui/scroll-progress.js";
import { initTilt } from "./ui/tilt.js";

const page = document.body.dataset.page || "home";

const lenis = initSmoothScroll();
// Start the entrance first: [data-intro] copy is hidden by CSS until it runs.
initPageIntro();

// Shared shell first so injected content exists before anything is measured.
initNav(lenis);
initFooter();
initTheme();
initFaq();
initScrollProgress();

if (page === "home") initHomeSections();
if (page === "solutions") initSolutions(lenis);
if (page === "contact") initContact();

if (page === "home") initHandoff();

// Backdrops must exist before parallax measures them, and after the
// page modules have rendered their sections (AI Solutions rows).
initBackdrops();
initRails();
initReveal();
initParallax();
initTilt();
initZoomReveal();

// The 3D scene is only requested on the home page, after the shell has
// painted. Three.js therefore never ships to the secondary pages.
if (page === "home") {
  import("./home/hero.js")
    .then(({ initHero }) => initHero(lenis))
    .catch((error) => {
      console.error("Could not initialize the homepage service switcher.", error);
    });
}

document.documentElement.classList.add("is-ready");
window.__omnitronBooted = true;

// Late layout shifts (images, web fonts) move trigger positions; viewport
// resizes are already handled by ScrollTrigger itself.
window.addEventListener("load", refreshMotion);
document.fonts?.ready.then(refreshMotion);

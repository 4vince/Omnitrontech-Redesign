import "@fontsource-variable/sora";
import "@fontsource-variable/manrope";
import "@fontsource-variable/jetbrains-mono";
import "@phosphor-icons/web/regular";

import "../styles/main.css";

import {
  initParallax,
  initReveal,
  initSmoothScroll,
  ScrollTrigger,
} from "./core/motion.js";
import { initTheme } from "./core/theme.js";
import { initContact } from "./pages/contact.js";
import { initHomeSections } from "./pages/home.js";
import { initSolutions } from "./pages/solutions.js";
import { initFaq } from "./ui/faq.js";
import { initFooter } from "./ui/footer.js";
import { initNav } from "./ui/nav.js";
import { initRails } from "./ui/rail.js";
import { initScrollProgress } from "./ui/scroll-progress.js";

const page = document.body.dataset.page || "home";

const lenis = initSmoothScroll();

// Shared shell first so injected content exists before anything is measured.
initNav(lenis);
initFooter();
initTheme();
initFaq();
initScrollProgress();

if (page === "home") initHomeSections();
if (page === "solutions") initSolutions();
if (page === "contact") initContact();

initRails();
initReveal();
initParallax();

// The 3D scene is only requested on the home page, after the shell has
// painted. Three.js therefore never ships to the secondary pages.
if (page === "home") {
  import("./home/hero.js")
    .then(({ initHero }) => initHero(lenis))
    .catch(() => {
      // The authored CSS orbit and static hero remain fully usable.
    });
}

document.documentElement.classList.add("is-ready");
window.__omnitronBooted = true;

window.addEventListener("load", () => ScrollTrigger.refresh());
document.fonts?.ready.then(() => ScrollTrigger.refresh());

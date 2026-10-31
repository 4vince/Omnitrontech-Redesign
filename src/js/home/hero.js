import { services, serviceContactHref } from "../content/services.js";
import { gsap, ScrollTrigger, isDesktop, prefersReducedMotion } from "../core/motion.js";

const clamp01 = (value) => Math.min(1, Math.max(0, value));

function smoothstep(a, b, value) {
  const x = clamp01((value - a) / (b - a));
  return x * x * (3 - 2 * x);
}

const SERVICE_START = 0.56;
const SERVICE_END = 0.86;
const SERVICE_SPAN = SERVICE_END - SERVICE_START;

function progressForService(index) {
  return SERVICE_START + ((index + 0.5) / services.length) * SERVICE_SPAN;
}

export function initHero(lenis) {
  const track = document.querySelector("[data-hero-track]");
  if (!track) return;

  const stage = track.querySelector("[data-hero-stage]");
  const copy = track.querySelector("[data-hero-copy]");
  const serviceLayer = track.querySelector("[data-service-layer]");
  const serviceTabs = track.querySelector("[data-service-tabs]");
  const serviceDetail = track.querySelector("[data-service-detail]");
  const serviceVisual = track.querySelector("[data-service-visual]");
  const serviceOrbit = track.querySelector("[data-service-orbit]");
  const serviceLabel = track.querySelector("[data-service-label]");
  const serviceCount = track.querySelector("[data-service-count]");
  const diveCaption = track.querySelector("[data-dive-caption]");
  const scrollCue = track.querySelector("[data-scroll-cue]");
  const canvas = track.querySelector("[data-scene-canvas]");
  const copyTitle = serviceDetail?.querySelector("[data-service-title]");
  const copyDescription = serviceDetail?.querySelector("[data-service-desc]");
  const copyLink = serviceDetail?.querySelector("[data-service-link]");
  const serviceCopy = track.querySelector(".service-copy");

  if (
    !stage ||
    !copy ||
    !serviceLayer ||
    !serviceTabs ||
    !serviceDetail ||
    !serviceVisual ||
    !canvas
  ) {
    return;
  }

  let activeIndex = -1;
  let scene = null;
  let scrollTrigger = null;
  let manualIndex = null;
  let manualTimer = 0;
  let layerInert = null;
  let visualInert = null;

  function renderTabs() {
    serviceTabs.innerHTML = services
      .map(
        (service, index) => `<button class="tab" type="button" role="tab" id="service-tab-${index}" aria-controls="service-detail" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}">${service.name}</button>`,
      )
      .join("");

    serviceTabs.addEventListener("keydown", (event) => {
      const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      let next = activeIndex;
      if (event.key === "ArrowRight") next = (activeIndex + 1) % services.length;
      if (event.key === "ArrowLeft") next = (activeIndex - 1 + services.length) % services.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = services.length - 1;
      selectService(next, { focus: true, scroll: true });
    });

    serviceTabs.addEventListener("click", (event) => {
      const tab = event.target.closest("[role='tab']");
      if (!tab) return;
      const index = Number.parseInt(tab.id.replace("service-tab-", ""), 10);
      if (Number.isFinite(index)) selectService(index, { focus: false, scroll: true });
    });
  }

  function renderOrbit(service) {
    const orbitNodes = serviceOrbit?.querySelector("[data-orbit-nodes]");
    if (!orbitNodes) return;
    orbitNodes.replaceChildren();
    service.chips.forEach((chip, index) => {
      const node = document.createElement("span");
      node.className = "orbit__chip";
      if (index === 0) node.classList.add("is-active");
      const angle = (index / service.chips.length) * 360 - 90;
      const duration = 28 + index * 4;
      node.style.setProperty("--angle", `${angle}deg`);
      node.style.setProperty("--counter-angle", `${-angle}deg`);
      node.style.setProperty("--orbit-duration", `${duration}s`);
      node.style.setProperty("--orbit-depth", `${index % 2 === 0 ? 20 : -16}px`);
      if (index % 2 === 1) node.classList.add("is-reverse");
      const label = document.createElement("span");
      label.className = "orbit__chip-label";
      label.textContent = chip;
      node.append(label);
      orbitNodes.append(node);
    });
  }

  function selectService(index, { focus = false, scroll = false } = {}) {
    const next = Math.max(0, Math.min(services.length - 1, index));
    const service = services[next];
    activeIndex = next;

    [...serviceTabs.querySelectorAll("[role='tab']")].forEach((tab, tabIndex) => {
      const selected = tabIndex === next;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus({ preventScroll: true });
    });

    if (copyTitle) copyTitle.textContent = service.outcome;
    if (copyDescription) copyDescription.textContent = service.summary;
    if (copyLink) {
      copyLink.href = serviceContactHref(service);
      copyLink.innerHTML = `Explore ${service.name} <i class="ph ph-arrow-up-right" aria-hidden="true"></i>`;
    }
    if (serviceLabel) serviceLabel.textContent = `Service / ${service.index}`;
    if (serviceCount) serviceCount.textContent = service.index;
    if (serviceDetail) {
      serviceDetail.setAttribute("aria-labelledby", `service-tab-${next}`);
    }
    renderOrbit(service);

    if (scroll && scrollTrigger) {
      manualIndex = next;
      window.clearTimeout(manualTimer);
      manualTimer = window.setTimeout(() => {
        manualIndex = null;
      }, 2200);
      const progress = progressForService(next);
      const y = scrollTrigger.start + (scrollTrigger.end - scrollTrigger.start) * progress;
      if (lenis) {
        lenis.scrollTo(y, {
          duration: 1.5,
          easing: (t) => 1 - Math.pow(1 - t, 4),
        });
      } else {
        window.scrollTo({ top: y, behavior: prefersReducedMotion() ? "auto" : "smooth" });
      }
    }
  }

  function setInteractiveLayer(active) {
    if (layerInert !== active) {
      layerInert = active;
      serviceLayer.classList.toggle("is-active", active);
      serviceLayer.inert = !active;
      if (active) serviceLayer.removeAttribute("aria-hidden");
      else serviceLayer.setAttribute("aria-hidden", "true");
    }
    if (visualInert !== active) {
      visualInert = active;
      serviceVisual.inert = !active;
    }
  }

  function setCopyInteractive(interactive) {
    if (copy.inert === !interactive) return;
    copy.inert = !interactive;
    if (interactive) copy.removeAttribute("aria-hidden");
    else copy.setAttribute("aria-hidden", "true");
  }

  function applyProgress(progress) {
    const p = clamp01(progress);

    const copyFade = 1 - smoothstep(0.015, 0.16, p);
    gsap.set(copy, { yPercent: -50, y: -p * 180, opacity: copyFade });
    setCopyInteractive(copyFade > 0.05);

    if (scrollCue) {
      scrollCue.style.opacity = String(1 - smoothstep(0, 0.055, p));
    }

    if (diveCaption) {
      const enter = smoothstep(0.27, 0.35, p);
      const exit = 1 - smoothstep(0.41, 0.47, p);
      diveCaption.style.opacity = String(enter * exit);
      diveCaption.style.transform = `translateY(${(1 - enter) * 24}px)`;
    }

    const layerEnter = smoothstep(0.43, 0.56, p);
    const layerExit = 1 - smoothstep(0.94, 0.995, p);
    const layerOpacity = Math.max(0, layerExit);
    serviceLayer.style.opacity = String(layerOpacity);
    if (serviceCopy) {
      gsap.set(serviceCopy, {
        yPercent: -50,
        y: (1 - layerEnter) * 34,
        opacity: layerEnter,
      });
    }

    const panelIn = smoothstep(0.43, 0.61, p);
    const panelOut = smoothstep(0.93, 0.995, p);
    gsap.set(serviceVisual, { xPercent: (1 - panelIn) * 100 + panelOut * 100 });

    const interactive = p > 0.445 && p < 0.955;
    setInteractiveLayer(interactive);

    if (p > 0.52 && p < 0.91 && manualIndex === null) {
      const raw = ((p - SERVICE_START) / SERVICE_SPAN) * services.length;
      const next = Math.max(0, Math.min(services.length - 1, Math.floor(raw)));
      if (next !== activeIndex) selectService(next);
    }

    scene?.setProgress(p);
  }

  function tick(time, deltaMs) {
    if (!scrollTrigger) return;
    const dt = Math.min(0.05, (deltaMs || 16.7) / 1000);
    const eased = 1 - Math.exp(-dt * 2.1);
    const next =
      scrollState.current + (scrollState.target - scrollState.current) * eased;
    // Stop chasing tiny differences so the scene can settle.
    scrollState.current =
      Math.abs(scrollState.target - next) < 0.00015 ? scrollState.target : next;
    applyProgress(scrollState.current);
  }

  const scrollState = { target: 0, current: 0 };

  function setupScroll() {
    if (scrollTrigger) return;
    scrollTrigger = ScrollTrigger.create({
      trigger: track,
      start: "top top",
      end: "bottom bottom",
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        scrollState.target = self.progress;
      },
    });
    scrollState.current = scrollState.target = scrollTrigger.progress || 0;
    applyProgress(scrollState.current);
    gsap.ticker.add(tick);
  }

  function teardownScroll() {
    if (!scrollTrigger) return;
    gsap.ticker.remove(tick);
    scrollTrigger.kill();
    scrollTrigger = null;
    gsap.set(copy, { clearProps: "transform,opacity" });
    if (serviceCopy) gsap.set(serviceCopy, { clearProps: "transform,opacity" });
    gsap.set(serviceVisual, { x: 0, xPercent: 0 });
    serviceLayer.style.opacity = "";
    if (diveCaption) {
      diveCaption.style.opacity = "";
      diveCaption.style.transform = "";
    }
    if (scrollCue) scrollCue.style.opacity = "";
    scene?.setProgress(0);
  }

  function staticMode() {
    return !isDesktop() || prefersReducedMotion();
  }

  function applyStaticMode() {
    teardownScroll();
    setInteractiveLayer(true);
    serviceVisual.inert = false;
    gsap.set(serviceVisual, { x: 0, xPercent: 0 });
    copy.inert = false;
    copy.removeAttribute("aria-hidden");
    serviceLayer.style.opacity = "1";
    serviceOrbit?.querySelectorAll(".orbit__chip").forEach((chip) => {
      chip.style.opacity = "";
    });
    scene?.pause();
  }

  function onBreakpointChange() {
    if (staticMode()) applyStaticMode();
    else {
      scene?.resume();
      setupScroll();
      ScrollTrigger.refresh();
    }
  }

  renderTabs();
  selectService(0);
  // Pin the panel fully off-screen with a numeric transform. The authored
  // CSS translateX(100%) is read by GSAP as a pixel base, so reset x first.
  gsap.set(copy, { yPercent: -50 });
  gsap.set(serviceVisual, { x: 0, xPercent: 100 });

  if (typeof IntersectionObserver !== "undefined") {
    new IntersectionObserver(
      ([entry]) => serviceOrbit?.classList.toggle("is-visible", entry.isIntersecting),
      { threshold: 0.05 },
    ).observe(serviceVisual);
  }

  if (staticMode()) {
    applyStaticMode();
  } else {
    setInteractiveLayer(false);
    setupScroll();
  }

  // ── Optional WebGL scene ─────────────────────────────────────────────
  async function setupScene() {
    if (staticMode()) return;
    try {
      const module = await import("./core-scene.js");
      scene = module.createHeroScene(canvas);
      if (!scene) return;
      stage.classList.add("has-webgl");
      scene.setTheme(document.documentElement.dataset.theme || "dark");
      scene.setProgress(scrollState.current);

      const onPointer = (event) => {
        if (event.pointerType === "touch") return;
        scene?.setPointer(
          (event.clientX / window.innerWidth) * 2 - 1,
          (event.clientY / window.innerHeight) * 2 - 1,
        );
      };
      window.addEventListener("pointermove", onPointer, { passive: true });

      if (typeof IntersectionObserver !== "undefined") {
        new IntersectionObserver(
          ([entry]) => {
            if (!entry.isIntersecting) scene?.pause();
            else scene?.resume();
          },
          { threshold: 0.02 },
        ).observe(stage);
      }
    } catch {
      // The authored CSS orbit remains in place. Nothing else changes.
    }
  }

  setupScene();

  const desktopQuery = window.matchMedia("(min-width: 900px)");
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  desktopQuery.addEventListener?.("change", onBreakpointChange);
  motionQuery.addEventListener?.("change", onBreakpointChange);
  window.addEventListener("resize", () => {
    if (!staticMode() && scrollTrigger) ScrollTrigger.refresh();
  });

  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

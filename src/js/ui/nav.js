import { currentPage, site } from "../content/site.js";

const PAGE_LABELS = {
  home: "Home",
  solutions: "AI Solutions",
  contact: "Contact",
};

function pageHref(href) {
  return href;
}

function navLink(item, page, className = "nav-link") {
  const active = item.label === PAGE_LABELS[page];
  return `<a class="${className}" href="${pageHref(item.href)}"${
    active ? ' aria-current="page"' : ""
  }>${item.label}</a>`;
}

function brandMarkup({ compact = false } = {}) {
  return `<a class="brand" href="/" aria-label="Omnitron home">
    <span class="brand-mark" aria-hidden="true">
      <img src="/omnitron-mark.png" alt="">
    </span>
    <span>Omnitron</span>
    ${compact ? "" : ""}
  </a>`;
}

export function renderNav(mount = document.querySelector("#site-nav")) {
  if (!mount) return;

  const page = currentPage();
  mount.dataset.page = page;
  // On the contact page the CTA jumps to the form instead of reloading it.
  const ctaHref = page === "contact" ? "#contact-form" : site.cta.href;
  mount.innerHTML = `
    <div class="wrap nav-inner">
      ${brandMarkup()}
      <nav class="nav-links" aria-label="Primary">
        ${site.nav.map((item) => navLink(item, page)).join("")}
      </nav>
      <div class="nav-actions">
        <a class="btn btn--primary btn--sm nav-cta" href="${ctaHref}">
          ${site.cta.label}
          <i class="ph ph-arrow-up-right" aria-hidden="true"></i>
        </a>
        <button class="nav-toggle" type="button" data-nav-toggle aria-label="Open menu" aria-expanded="false" aria-controls="mobile-sheet">
          <i class="ph ph-list" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  `;

  const sheet = document.createElement("div");
  sheet.className = "mobile-sheet";
  sheet.id = "mobile-sheet";
  sheet.dataset.navSheet = "";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-label", "Site menu");
  sheet.setAttribute("aria-hidden", "true");
  sheet.inert = true;
  sheet.innerHTML = `
    <div class="mobile-sheet__head">
      ${brandMarkup()}
      <button class="mobile-sheet__close" type="button" data-nav-close aria-label="Close menu">
        <i class="ph ph-x" aria-hidden="true"></i>
      </button>
    </div>
    <nav class="mobile-sheet__links" aria-label="Mobile primary">
      ${site.nav
        .map(
          (item, index) => `<a class="mobile-sheet__link" href="${item.href}"${
            item.label === PAGE_LABELS[page] ? ' aria-current="page"' : ""
          }><span>${String(index + 1).padStart(2, "0")}</span>${item.label}</a>`,
        )
        .join("")}
    </nav>
    <div class="mobile-sheet__foot">
      <a class="btn btn--primary" href="${ctaHref}">
        ${site.cta.label}
        <i class="ph ph-arrow-up-right" aria-hidden="true"></i>
      </a>
      <div class="mobile-sheet__meta">
        <span>${site.location} / ${site.region}</span>
        <a href="mailto:${site.email}">${site.email}</a>
      </div>
    </div>
  `;
  document.body.append(sheet);

  return sheet;
}

export function initNav(lenis) {
  const header = document.querySelector("#site-nav");
  if (!header) return;
  const sheet = renderNav(header);
  if (!sheet) return;

  const toggle = header.querySelector("[data-nav-toggle]");
  const close = sheet.querySelector("[data-nav-close]");
  const links = sheet.querySelectorAll("a");
  let lastFocused = null;

  const setScrolled = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 28);
  };
  setScrolled();
  window.addEventListener("scroll", setScrolled, { passive: true });

  const focusables = () =>
    [...sheet.querySelectorAll("a[href], button:not([disabled])")].filter(
      (node) => node.offsetParent !== null,
    );

  function onKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeSheet();
      return;
    }
    if (event.key !== "Tab") return;
    const nodes = focusables();
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function openSheet() {
    lastFocused = document.activeElement;
    sheet.classList.add("is-open");
    sheet.removeAttribute("aria-hidden");
    sheet.inert = false;
    header.classList.add("is-sheet-open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Close menu");
    document.body.classList.add("no-scroll");
    lenis?.stop();
    document.addEventListener("keydown", onKeydown);
    // Wait for the sheet to become visible before moving focus.
    requestAnimationFrame(() => close.focus());
  }

  function closeSheet({ restore = true } = {}) {
    sheet.classList.remove("is-open");
    sheet.setAttribute("aria-hidden", "true");
    sheet.inert = true;
    header.classList.remove("is-sheet-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
    document.body.classList.remove("no-scroll");
    lenis?.start();
    document.removeEventListener("keydown", onKeydown);
    if (restore && lastFocused instanceof HTMLElement) lastFocused.focus();
  }

  toggle.addEventListener("click", () => {
    if (sheet.classList.contains("is-open")) closeSheet();
    else openSheet();
  });
  close.addEventListener("click", () => closeSheet());
  links.forEach((link) => link.addEventListener("click", () => closeSheet({ restore: false })));
  window.addEventListener("resize", () => {
    if (window.innerWidth > 960 && sheet.classList.contains("is-open")) {
      closeSheet({ restore: false });
    }
  });

  // Keep the tab order honest while the sheet is closed.
  sheet.querySelectorAll("a, button").forEach((node) => {
    if (!sheet.classList.contains("is-open")) node.tabIndex = -1;
  });
  const observer = new MutationObserver(() => {
    const open = sheet.classList.contains("is-open");
    sheet.querySelectorAll("a, button").forEach((node) => {
      node.tabIndex = open ? 0 : -1;
    });
  });
  observer.observe(sheet, { attributes: true, attributeFilter: ["class"] });
}

import { site } from "../content/site.js";

export function initFooter() {
  const mounts = document.querySelectorAll("[data-footer]");
  if (!mounts.length) return;

  const year = new Date().getFullYear();

  mounts.forEach((mount) => {
    mount.setAttribute("role", "contentinfo");
    mount.innerHTML = `
      <div class="wrap">
        <div class="footer-brand">
          <a class="brand" href="/" aria-label="Omnitron home">
            <span class="brand-mark" aria-hidden="true">
              <img src="/Neon%20Orbital%20Globe%20Interface.png" alt="">
            </span>
            <span>Omnitron</span>
          </a>
          <p>AI systems for modern business. Built in ${site.location}, working across ${site.region}.</p>
          <div class="footer-socials">
            ${site.socials
              .map(
                (social) => `<a href="${social.href}" target="_blank" rel="noopener noreferrer" aria-label="${social.label}">
                  <i class="ph ${social.icon}" aria-hidden="true"></i>
                </a>`,
              )
              .join("")}
          </div>
        </div>
        <div class="footer-col">
          <h3>Explore</h3>
          ${site.nav
            .map((item) => `<a href="${item.href}">${item.label}</a>`)
            .join("")}
          <a href="/contact/">Start the conversation</a>
        </div>
        <div class="footer-col">
          <h3>Contact</h3>
          <a href="mailto:${site.email}">${site.email}</a>
          <span>${site.location} headquarters</span>
          <span>Mon–Fri · 09:00–18:00 SGT</span>
        </div>
        <div class="footer-bottom">
          <span>© ${year} Omnitron Pte Ltd · ${site.location}</span>
          <span class="footer-bottom__status">Open for a first conversation</span>
          <span>System / 01</span>
        </div>
      </div>
    `;
  });
}

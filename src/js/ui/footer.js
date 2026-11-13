import { site } from "../content/site.js";

export function initFooter() {
  const mounts = document.querySelectorAll("[data-footer]");
  if (!mounts.length) return;

  const year = new Date().getFullYear();
  const socials = site.socials.filter((social) => social.href);

  mounts.forEach((mount) => {
    mount.setAttribute("role", "contentinfo");
    mount.innerHTML = `
      <div class="wrap">
        <div class="footer-brand">
          <a class="brand" href="/" aria-label="Omnitron home">
            <span class="brand-mark" aria-hidden="true">
              <img src="/omnitron-mark.png" alt="" width="34" height="34">
            </span>
            <span>Omnitron</span>
          </a>
          <p>AI systems for modern business. Built in ${site.location}, working across ${site.region}.</p>
          ${socials.length
            ? `<div class="footer-socials">
            ${socials
              .map(
                (social) => `<a href="${social.href}" target="_blank" rel="noopener noreferrer" aria-label="${social.label}">
                  <i class="ph ${social.icon}" aria-hidden="true"></i>
                </a>`,
              )
              .join("")}
          </div>`
            : ""}
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
          <span>Mon-Fri, 09:00-18:00 SGT</span>
        </div>
        <div class="footer-bottom">
          <span>© ${year} Omnitron Pte Ltd, ${site.location}</span>
          <a href="#main" class="footer-bottom__top">Back to top</a>
        </div>
      </div>
    `;
  });
}

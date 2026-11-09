/**
 * Injects the blueprint-grid + light-pool backdrop (src/styles/backdrop.css)
 * into every major section. Markup is generated here so the page HTML stays
 * clean; colours follow each section's tone automatically.
 *
 * Opt a section out with data-backdrop="off".
 * Parallax for these layers lives in initParallax() (core/motion.js).
 */

const TARGETS = [
  // .hero-stage is deliberately absent: the homepage hero has its own
  // photographic backdrop, and pools under it would never be seen.
  ".band",
  // .handoff-stage is deliberately absent too: the flat stage diagram
  // stands on its own, with no grid or light pools over it.
  ".showcase",
  ".solutions-hero",
  ".svc",
  ".svx",
  ".contact-hero",
  ".cta-band",
  ".site-footer",
].join(",");

/* Pool placements, cycled per section so neighbouring sections never
   light up the same corner. [x, y] for the large pool, then the small one. */
const PLACEMENTS = [
  [["84%", "22%"], ["12%", "82%"]],
  [["14%", "30%"], ["86%", "78%"]],
  [["70%", "78%"], ["22%", "18%"]],
  [["28%", "70%"], ["78%", "14%"]],
];

export function initBackdrops() {
  const hosts = [...document.querySelectorAll(TARGETS)].filter(
    (host) =>
      host.dataset.backdrop !== "off" &&
      !host.querySelector(":scope > .backdrop") &&
      // A band that wraps a pinned stage: the stage carries the plate, and
      // the band's own would sit hidden behind the stage's opaque ground.
      !host.querySelector(".hero-stage, .handoff-stage"),
  );

  hosts.forEach((host, index) => {
    // A section nested inside another host (the CTA band inside the
    // showcase) still gets its own plate; that is intended.
    const backdrop = document.createElement("div");
    backdrop.className = "backdrop";
    backdrop.setAttribute("aria-hidden", "true");

    const [[ax, ay], [bx, by]] = PLACEMENTS[index % PLACEMENTS.length];
    backdrop.innerHTML = `<div class="backdrop__grid"></div>
      <div class="backdrop__pools">
        <span style="--px:${ax};--py:${ay}"></span>
        <span style="--px:${bx};--py:${by}"></span>
      </div>`;

    host.classList.add("has-backdrop");
    host.prepend(backdrop);
  });
}

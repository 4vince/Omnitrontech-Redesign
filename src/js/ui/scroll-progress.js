export function initScrollProgress() {
  const progress = document.createElement("div");
  progress.className = "scroll-progress";
  progress.setAttribute("aria-hidden", "true");
  progress.innerHTML = `
    <span class="scroll-progress__fill" data-progress-fill></span>
    <span class="scroll-progress__marker" data-progress-marker></span>
  `;
  document.body.append(progress);

  const fill = progress.querySelector("[data-progress-fill]");
  const marker = progress.querySelector("[data-progress-marker]");
  let height = progress.offsetHeight || 240;
  let frame = 0;

  function readHeight() {
    height = progress.offsetHeight || 240;
  }

  function paint() {
    frame = 0;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const ratio = Math.min(1, Math.max(0, window.scrollY / max));
    fill.style.transform = `scaleY(${ratio})`;
    marker.style.transform = `translateY(${ratio * height}px)`;
    progress.style.opacity = ratio > 0.002 ? "1" : "0";
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(paint);
  }

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", () => {
    readHeight();
    schedule();
  });
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(() => {
      readHeight();
      schedule();
    }).observe(document.body);
  }

  readHeight();
  paint();
}

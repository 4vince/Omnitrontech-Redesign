/**
 * Visual-first stage, shared by the AI Solutions services and the homepage.
 *
 * A stage is one large visual with a title over its top band and step
 * captions along its bottom. These helpers keep the three in step:
 *
 *   setActiveCaption   light the caption for the visual's current story step
 *   createStageLayout  choose the box the visual plays in (below the title,
 *                      or beside it), clear of the title and captions, and
 *                      publish it as --svx-x/y/w/h (plus --svx-top/bottom)
 *   wirePauseToggle    the pause control every looping visual needs (WCAG 2.2.2)
 *
 * Markup: .svx__stage > canvas, .svx__head, .svx__captions > [data-caption],
 * [data-svx-toggle]. Styles: src/styles/service-stage.css.
 */

export function setActiveCaption(stage, index, story) {
  const items = stage.querySelectorAll("[data-caption]");
  if (index === null) {
    items.forEach((item) => item.classList.remove("is-active", "is-done"));
    stage.classList.add("is-static");
    return;
  }
  stage.classList.remove("is-static");
  const { marks, cycle } = story;
  const duration = (marks[index + 1] ?? cycle) - marks[index];
  items.forEach((item, i) => {
    item.classList.toggle("is-done", i < index);
    if (i === index) {
      item.style.setProperty("--step-dur", `${duration.toFixed(2)}s`);
      // Restart the progress line for this step.
      item.classList.remove("is-active");
      void item.offsetWidth;
      item.classList.add("is-active");
    } else {
      item.classList.remove("is-active");
    }
  });
}

/**
 * The title (top) and captions (bottom) sit over the stage, and the visual
 * must never run under them. It takes whichever box shows it larger: below
 * the title, or beside it from the top of the stage down to the captions.
 *
 * @param {HTMLElement} stage
 * @param {{ aspect: () => number, onChange?: () => void, gap?: number }} options
 * @returns {{ layout: () => void, area: () => ({x,y,w,h} | null) }}
 */
export function createStageLayout(stage, { aspect, onChange, gap = 24 } = {}) {
  const head = stage.querySelector(".svx__head");
  const captions = stage.querySelector(".svx__captions");
  const range = document.createRange();
  let area = null;

  const layout = () => {
    const W = stage.clientWidth;
    // A little extra above the captions: a 3D scene's near edge can spill
    // past its framed box in perspective.
    const capTop = (captions ? captions.offsetTop : stage.clientHeight) - 12;
    const headTop = head ? head.offsetTop : 0;
    const headBottom = head ? headTop + head.offsetHeight : 0;
    // Horizontal extent of the words themselves (the head box is wider).
    // Rects are read in x only: the entrance only moves the text in y.
    let textLeft = W;
    let textRight = 0;
    // Screen rects include any CSS scale on the card (the folder stack's
    // recede): divide it out.
    const box = stage.getBoundingClientRect();
    const k = box.width && W ? W / box.width : 1;
    head?.querySelectorAll(":scope > *").forEach((el) => {
      range.selectNodeContents(el);
      const r = range.getBoundingClientRect();
      if (!r.width) return;
      textLeft = Math.min(textLeft, (r.left - box.left) * k);
      textRight = Math.max(textRight, (r.right - box.left) * k);
    });
    const below = { x: 0, y: headBottom + gap, w: W, h: capTop - gap - (headBottom + gap) };
    const tall = capTop - gap - headTop;
    const right = { x: textRight + 2 * gap, y: headTop, w: W - textRight - 2 * gap, h: tall };
    const left = { x: 0, y: headTop, w: textLeft - 2 * gap, h: tall };
    // Height the visual would get in each box, for its width-to-height ratio.
    const ratio = aspect?.() ?? 2.2;
    const size = (r) => (r.w > 0 && r.h > 0 ? Math.min(r.w / ratio, r.h) : 0);
    let best = below;
    // Beside the title only when it is clearly larger, so it does not flip
    // back and forth on small resizes.
    for (const r of [right, left]) if (size(r) > size(best) * 1.08) best = r;
    area = best;
    const set = (name, v) => stage.style.setProperty(name, `${Math.round(v)}px`);
    set("--svx-x", best.x);
    set("--svx-y", best.y);
    set("--svx-w", best.w);
    set("--svx-h", best.h);
    // The flat fallback and the stage height still use the plain bands.
    set("--svx-top", headBottom + gap);
    set("--svx-bottom", stage.clientHeight - capTop - 12 + gap);
    onChange?.();
  };

  layout();
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(layout);
    [stage, head, captions].forEach((el) => el && observer.observe(el));
  }
  return { layout, area: () => area };
}

/**
 * @param {HTMLElement} stage
 * @param {(paused: boolean) => void} onToggle
 * @returns {{ paused: () => boolean }}
 */
export function wirePauseToggle(stage, onToggle) {
  let paused = false;
  const toggle = stage.querySelector("[data-svx-toggle]");
  const paint = () => {
    if (!toggle) return;
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.setAttribute("aria-label", paused ? "Play animation" : "Pause animation");
    toggle.innerHTML = `<i class="ph ${paused ? "ph-play" : "ph-pause"}" aria-hidden="true"></i>`;
  };
  paint();
  toggle?.addEventListener("click", () => {
    paused = !paused;
    paint();
    onToggle(paused);
  });
  return { paused: () => paused };
}

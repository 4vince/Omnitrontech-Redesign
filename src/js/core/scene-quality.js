const DEFAULT_PIXEL_RATIO_CAP = 1.35;

/**
 * Scene quality governor for the WebGL workflow scenes.
 *
 * Single source of truth for the rendering budget:
 *  - pixel-ratio policy (capped for fill rate on smaller screens),
 *  - renderer info counters for frame-cost checks.
 */

// The homepage robot is the one scene that fills the first screen and is
// read up close (the visor display carries text), so it gets a higher cap
// on larger screens. Phones never render it (hero.js), and it is the only
// WebGL scene running while it is on screen.
const HERO_PIXEL_RATIO_CAP = 2;

export function getPixelRatioCap({ hero = false } = {}) {
  if (window.innerWidth < 760) return 1;
  if (hero) return window.innerWidth < 1200 ? 1.5 : HERO_PIXEL_RATIO_CAP;
  if (window.innerWidth < 1200) return 1.25;
  return DEFAULT_PIXEL_RATIO_CAP;
}

export function applyPixelRatio(renderer, options) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, getPixelRatioCap(options)));
}

export function getRendererInfo(renderer) {
  return {
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
  };
}

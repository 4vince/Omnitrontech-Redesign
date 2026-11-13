const DEFAULT_PIXEL_RATIO_CAP = 1.35;

/**
 * Scene quality governor for the WebGL workflow scenes.
 *
 * Single source of truth for the rendering budget:
 *  - pixel-ratio policy (capped for fill rate on smaller screens),
 *  - renderer info counters for frame-cost checks.
 */

// The homepage hero (brain-scene.js) runs bloom, so it sets its own ratio
// against a pixel budget instead of using this cap.

export function getPixelRatioCap() {
  if (window.innerWidth < 760) return 1;
  if (window.innerWidth < 1200) return 1.25;
  return DEFAULT_PIXEL_RATIO_CAP;
}

export function applyPixelRatio(renderer) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, getPixelRatioCap()));
}

export function getRendererInfo(renderer) {
  return {
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
  };
}

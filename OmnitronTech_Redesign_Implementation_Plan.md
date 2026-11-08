# Omnitron.Tech — Implementation Plan (Redesign v1)

| | |
|---|---|
| **Version** | 1.0 |
| **Date** | 2026-11-01 |
| **Status** | Planned — execution starts after review |

Companion to: `OmnitronTech_Redesign_Design_Brief.md` (confirmed).

---

## Phase map

| Phase | Name | Scope | Primary files |
|---|---|---|---|
| 0 | Brief lock | Design brief v0.3 → v1.0 | `OmnitronTech_Redesign_Design_Brief.md` |
| 1 | Theme foundation | Light/off-white dominant palette; white / off-white / blue / grey; orange retired | `src/styles/tokens.css`, `src/js/core/theme.js`, `index.html`, `ai-solutions/index.html`, `contact/index.html` |
| 2 | Minimal corporate system | Site-wide minimal treatment: borders, buttons, tags, type rhythm, components | `src/styles/base.css`, `components.css`, `layout.css`, `tokens.css` |
| 3 | Space & composition | Full bleed retained; maximize space; occupy middle minimally | `src/styles/home.css`, `layout.css`, `solutions.css`, `pages.css` |
| 4 | Visual-first copy | Summaries over full explanations | `src/js/content/*`, HTML copy |
| 5 | 3D → workflow | Orbit replacement; three.js utilization increase | `src/js/home/hero.js`, `src/js/home/core-scene.js`, `src/styles/home.css`, `src/styles/components.css` |
| 6 | Build & verify | `vite build`, preview, responsive/3D checks | — |
| 7 | 3D visual quality | Skill-driven upgrade of the workflow scenes: lighting, environment, materials, glow, post-processing, performance | `src/js/visuals/*.js`, `src/js/home/hero.js`, `src/js/ui/cursor-field.js` |

## Phase 1 — Theme foundation (start here)

1. `tokens.css`
   - Set `:root` (default) to the new light / off-white dominant system.
   - Rebalance greys (ink / muted / muted-2 / placeholder / lines) for light surfaces.
   - Retire `--orange` tokens; map accent to blue (`--blue`, `--blue-bright`).
   - Recompute `--glow-*`, `--cta-*`, `--btn-*`, `--field-*`, `--shadow-*`, `--nav-bg`, `--selection` for light surfaces.
   - Keep a `[data-theme="dark"]` block re-mapped to a dark sibling of the same hue family (fallback / completeness).
2. `src/js/core/theme.js` — default `light`, `colorScheme: light`, meta theme-color → off-white value.
3. HTML shells (Home / AI Solutions / Contact) — `data-theme="light"`, inline theme script, meta theme-color.

## Phase 2 — Minimal corporate system

- `tokens.css`: tighten type scale tokens if needed (`--fs-*`).
- `base.css` / `components.css` / `layout.css`: hairlines only, quiet borders, blue primary button (pill), ghost = outline grey, tags → neutral/blue.
- Component-level light-theme overrides (`[data-theme="light"]`) where shadows/glows were tuned dark-only.

## Phase 3 — Space & composition

- `home.css`: bridge band min-height (`54svh` → minimal), problem/proof/FAQ/showcase padding blocks, hero copy sizing vs. 100svh stage.
- `layout.css`: band/wrap spacing tokens.
- `solutions.css`, `pages.css`: tighten oversized vertical rhythm.

## Phase 4 — Visual-first copy

- `src/js/content/*` (services, problems, proof, faqs, applied examples, solutions copy) → summaries.
- HTML copy (`index.html`, `ai-solutions/index.html`) → trimmed headline/sub copy where structure allows.

## Phase 5 — 3D / workflow / three.js

- [x] Replace the Home and AI Solutions hero orbs with a restrained workflow chain.
- [x] Share one lazy-loaded Three.js workflow scene across both pages; the Home service switcher updates its active step count.
- [x] Keep a static workflow fallback and skip WebGL on small screens and when reduced motion is requested.
- [x] Shorten the Home pinned sequence from 1200vh to 520vh.

Phase 5 verification: production build and desktop, mobile, and reduced-motion browser checks passed. Physical-device checks remain outstanding.

## Phase 6 — Build & verify

- `npm run build`, preview, desktop + mobile + reduced-motion pass.

## Phase 7 — 3D visual quality (threejs-skills)

Triggered by the global install of the `threejs-*` skill set from `CloudAI-X/threejs-skills`
(`npx skills add cloudai-x/threejs-skills -g -a opencode -y` → 13 skills installed under
`~/.agents/skills/threejs-*`, verified against `three@0.186`, React Three Fiber 9.8, drei 10.7
and gltf-transform 4.5).

Goal: turn the installed skills into a visual-quality upgrade of the workflow scenes — lit
environments, PBR materials, depth, glow and post-processing — while keeping the light /
off-white / blue language and the reduced-motion plus still fallbacks intact.

### 7.0 — Skill activation baseline

- [x] Install check: `npx skills add cloudai-x/threejs-skills -g -a opencode -y` completed;
      all 13 skills installed and active.
- [x] Pin the rendering stack to the skill-verified versions before visual tasks:
      `three@0.186` line (project now declares `^0.186.0`, installed `three@0.186.1`).

### 7.1 — Scene foundation (`threejs-fundamentals`)

- [x] Harden the `WebGLRenderer` setup in every scene: `antialias`, `alpha`, pixel-ratio cap,
      `setClearColor(0, 0)`, `outputColorSpace`, `ACESFilmicToneMapping`, PCF shadow maps.
- [x] Drive animation through `renderer.setAnimationLoop` and time through `THREE.Timer`
      (`connect(document)`, `update()` before `getDelta()` / `getElapsed()`).
- [x] Add depth cueing (linear or exponential fog) to scenes that render depth.
- [x] Clean up via scene traversal: dispose geometry, materials and material textures.

### 7.2 — Lighting and environment (`threejs-lighting`, `threejs-textures`, `threejs-loaders`)

- [x] Add scene environment lighting (IBL): `RoomEnvironment` + PMREM fallback wired into all
      three WebGL scenes; `scene.environmentIntensity = 0.85`. `HDRLoader` for a commissioned
      HDR asset still pending.
- [x] Build the light rig: hemisphere + key + fill (+ rim) across scenes; physical units for
      point and spot lights.
- [x] Shadows: enable on the handoff scene (cast / receive, bias, normal bias, tight shadow
      camera); tune the manual-automation scene shadow map size and bias. Handoff key light now
      casts; hero shadow map tuned to 2048 + normal bias; real shadow grounding via platform.
- [x] Grounding: real shadow or cheap fake contact shadow. (Hero: platform cast/receive + PCF
      shadow map; hero scene.)

### 7.3 — Materials (`threejs-materials`)

- [ ] Drive IBL response with `scene.environmentIntensity`, not per-material `envMapIntensity`
      alone. (Done for new scenes: `scene.environmentIntensity = 0.85`; per-material envMap
      tuning still pending.)
- [ ] Tune `MeshStandardMaterial` / `MeshPhysicalMaterial` for light surfaces and the blue
      accent; keep emissive for state (hub, rings, particles).
- [ ] Line / route / particle materials: fog handling and emissive color.

### 7.4 — Glow and post-processing (`threejs-postprocessing`, `threejs-shaders`)

- [x] Add the `EffectComposer` chain: `RenderPass` → `UnrealBloomPass` → `OutputPass` in all
      three WebGL scenes; renders now go through `composer.render()` and the composer is sized
      on resize and disposed with the scene.
- [x] Selective bloom via threshold-tuned bloom (UnrealBloomPass threshold 0.85, strength 0.6,
      radius 0.4) across all three scenes.
- [x] Accent glow via fresnel `ShaderMaterial` instead of emissive-only (new
      `src/js/core/glow.js` → `createFresnelGlowMaterial`, applied to hero hub core, handoff hub,
      service hubs).

### 7.5 — Geometry and motion (`threejs-geometry`, `threejs-animation`)

- [x] Upgrade hero and hub geometry (torus knot, capsule, torus) where it serves the story:
      automation hub core upgraded (box → sphere) in the hero scene; hub meshes upgraded
      (dodecahedron → torus knot) in the handoff and service scenes.
- [x] Procedural motion through `THREE.Timer` and eased curves; keep scroll progress drive.

### 7.6 — Performance and assets (`threejs-performance`, `threejs-asset-pipeline`, `threejs-loaders`)

- [x] Scene quality governor: pixel-ratio policy + `renderer.info` checks wired via
      `src/js/core/scene-quality.js` (`applyPixelRatio` / `getRendererInfo`) into all three
      WebGL scenes; scene APIs now expose `getStats()`.
- [ ] LOD / detail tiers.
- [ ] Asset pipeline: gltf-transform (Draco / meshopt / KTX2 / WebP) for models; HDR via loader
      (RoomEnvironment fallback in place; HDRLoader swap pending commissioned HDR asset).

### 7.7 — Verify

- [x] `npm run build` ✅ (green, 58 modules) and preview smoke test ✅ (HTTP 200 on built output).
- [ ] Desktop / mobile / reduced-motion pass — browser-level QA still pending (code-level reduced-motion
      and static fallback paths preserved in scene code).

---

**Plan phase outcome:** brief confirmed → implementation plan written.

**Next:** begin Phase 7 (3D visual quality) task 7.0, or adjust the plan first.

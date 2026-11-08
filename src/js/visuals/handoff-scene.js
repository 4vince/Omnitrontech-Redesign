import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { applyPixelRatio, getRendererInfo } from "../core/scene-quality.js";
import { createFresnelGlowMaterial } from "../core/glow.js";

/**
 * Scroll-driven handoff scene — "From manual work to automation".
 *
 * The stage tells one story as the visitor scrolls:
 *   01. Manual work — task sources floating in open space.
 *   02. The handoff — manual tasks converge into the automation hub while
 *      streams of work travel the handoff route.
 *   03. Automated — the hub activates and routes completed outcomes out to
 *      result nodes while particles run the pipeline.
 *
 * Progress is a normalized 0 → 1 scroll value consumed by the render loop, so
 * the scene can be scrubbed with the same ScrollTrigger-driven clock used by
 * the rest of the experience.
 */

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(start, end, value) {
  const progress = clamp((value - start) / (end - start), 0, 1);
  return progress * progress * (3 - 2 * progress);
}

function cssColor(name, fallback) {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

export function createHandoffScene(
  canvas,
  { align = "center", progress = 0, animate = true } = {},
) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
  } catch {
    return null;
  }

  applyPixelRatio(renderer);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xfbfaf7, 0.012);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40);
  camera.position.set(0, 0, 7.4);

  scene.add(new THREE.AmbientLight(0xffffff, 2.1));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
  keyLight.position.set(-2.8, 3.8, 5);
  keyLight.castShadow = true;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xc4d4ff, 0.9);
  rimLight.position.set(3, 3, -7);
  scene.add(rimLight);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  scene.environmentIntensity = 0.85;
  room.dispose();
  pmrem.dispose();

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(canvas.clientWidth, canvas.clientHeight),
    0.6,
    0.4,
    0.85,
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  const materials = {
    accent: new THREE.MeshStandardMaterial({
      color: "#2b46d6",
      emissive: "#2b46d6",
      emissiveIntensity: 0.35,
      roughness: 0.38,
      metalness: 0.04,
    }),
    neutral: new THREE.MeshStandardMaterial({
      color: "#aeb4bf",
      roughness: 0.68,
      metalness: 0.02,
    }),
    accentLine: new THREE.MeshBasicMaterial({
      color: "#2b46d6",
      transparent: true,
      opacity: 0,
    }),
    accentRun: new THREE.MeshBasicMaterial({
      color: "#2b46d6",
      transparent: true,
      opacity: 0,
    }),
    neutralLine: new THREE.MeshBasicMaterial({
      color: "#737b88",
      transparent: true,
      opacity: 0,
    }),
    particle: new THREE.PointsMaterial({
      color: "#2b46d6",
      size: 0.035,
      transparent: true,
      opacity: 0.66,
      depthWrite: false,
      sizeAttenuation: true,
    }),
  };

  const geometry = {
    source: new THREE.SphereGeometry(0.16, 20, 16),
    process: new THREE.BoxGeometry(0.42, 0.48, 0.24),
    choice: new THREE.TetrahedronGeometry(0.24, 0),
    agent: new THREE.TorusKnotGeometry(0.13, 0.042, 80, 12),
    channel: new THREE.OctahedronGeometry(0.22, 0),
    insight: new THREE.IcosahedronGeometry(0.28, 1),
    marker: new THREE.SphereGeometry(0.075, 16, 12),
    handoffRing: new THREE.TorusGeometry(0.44, 0.012, 6, 48),
  };

  const groups = {
    manual: new THREE.Group(),
    pipeline: new THREE.Group(),
    streams: new THREE.Group(),
  };
  scene.add(groups.manual);
  scene.add(groups.pipeline);
  scene.add(groups.streams);

  const hubPosition = [0, 0, 0.1];

  function addRoute(group, points, material, moving = false) {
    const curve = new THREE.CatmullRomCurve3(
      points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    );
    const route = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.012, 5, false), material);
    group.add(route);
    if (moving) {
      const marker = new THREE.Mesh(geometry.marker, material);
      marker.position.copy(curve.getPoint(0));
      group.add(marker);
      if (!routeTracks.has(group)) routeTracks.set(group, []);
      routeTracks.get(group).push({ curve, marker });
    }
    return { curve, mesh: route };
  }

  const routeTracks = new Map();

  /* ── Manual work sources ─────────────────────────────────────────── */

  const manualNodes = [];
  const manualDefs = [
    { start: [-2.52, 0.66, 0.05], shape: "process", scale: 0.82, spinX: 0.1, spinY: -0.08, spinZ: 0.16 },
    { start: [-2.66, -0.3, -0.08], shape: "choice", scale: 0.74, spinX: -0.06, spinY: 0.1, spinZ: -0.12 },
    { start: [-2.36, -1.0, 0.1], shape: "process", scale: 0.78, spinX: 0.14, spinY: -0.1, spinZ: 0.2 },
  ];

  manualDefs.forEach((def, index) => {
    const mesh = new THREE.Mesh(geometry[def.shape], materials.neutral);
    mesh.position.set(...def.start);
    mesh.scale.setScalar(def.scale);
    mesh.rotation.set(def.spinX, def.spinY, def.spinZ);
    groups.manual.add(mesh);
    manualNodes.push({ mesh, start: [...def.start], scale: def.scale });
  });

  const handoffRoutes = manualNodes.map(({ mesh, start }) => {
    const points = [
      start,
      [(start[0] + hubPosition[0]) / 2, (start[1] + hubPosition[1]) * 0.6, (start[2] + hubPosition[2]) * 0.6],
      hubPosition,
    ];
    return addRoute(groups.manual, points, materials.neutralLine);
  });

  /* ── Automation hub ───────────────────────────────────────────────── */

  const hub = new THREE.Mesh(geometry.agent, materials.accent);
  hub.material = createFresnelGlowMaterial("#2b46d6", 1.4);
  hub.position.set(...hubPosition);
  groups.pipeline.add(hub);

  const hubRing = new THREE.Mesh(geometry.handoffRing, materials.accentLine);
  hubRing.position.copy(hubPosition);
  groups.pipeline.add(hubRing);

  /* ── Automated outcomes ──────────────────────────────────────────── */

  const outputs = [];
  const outputDefs = [
    { start: [1.55, 0.62, 0], shape: "insight", scale: 0.7 },
    { start: [1.78, 0, 0.06], shape: "process", scale: 0.66 },
    { start: [1.5, -0.62, -0.02], shape: "insight", scale: 0.72 },
  ];
  outputDefs.forEach((def) => {
    const mesh = new THREE.Mesh(geometry[def.shape], materials.accent);
    mesh.position.set(...def.start);
    mesh.scale.setScalar(def.scale);
    groups.pipeline.add(mesh);
    outputs.push({ mesh, start: [...def.start], scale: def.scale });
  });

  const runRoutes = [];
  outputDefs.forEach((def) => {
    const points = [
      hubPosition,
      [(hubPosition[0] + def.start[0]) / 2, (hubPosition[1] + def.start[1]) * 0.6, (hubPosition[2] + def.start[2]) * 0.6],
      def.start,
    ];
    runRoutes.push(addRoute(groups.pipeline, points, materials.accentRun, true));
  });

  /* ── Particle streams ─────────────────────────────────────────────── */

  const particles = [];
  const toVectors = (points) => points.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  manualNodes.forEach(({ start }) => {
    const curve = new THREE.CatmullRomCurve3(toVectors([
      start,
      [(start[0] + hubPosition[0]) / 2, (start[1] + hubPosition[1]) * 0.6, (start[2] + hubPosition[2]) * 0.6],
      hubPosition,
    ]));
    particles.push({ curve, phase: Math.random(), kind: "handoff" });
  });
  outputs.forEach(({ start }) => {
    const curve = new THREE.CatmullRomCurve3(toVectors([
      hubPosition,
      [(hubPosition[0] + start[0]) / 2, (hubPosition[1] + start[1]) * 0.6, (hubPosition[2] + start[2]) * 0.6],
      start,
    ]));
    particles.push({ curve, phase: Math.random(), kind: "run" });
  });

  const particleCount = particles.length;
  const particlePositions = new Float32Array(particleCount * 3);
  const particleAttribute = new THREE.BufferAttribute(particlePositions, 3).setUsage(THREE.DynamicDrawUsage);
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", particleAttribute);
  groups.streams.add(new THREE.Points(particleGeometry, materials.particle));

  /* ── Scene state ──────────────────────────────────────────────────── */

  const state = {
    progress: clamp(progress, 0, 1),
    animate: Boolean(animate),
    running: false,
    contextLost: false,
    disposed: false,
  };

  function updateTheme() {
    const blue = cssColor("--blue", "#2b46d6");
    const muted = cssColor("--muted-2", "#646c78");
    materials.accent.color.set(blue);
    materials.accent.emissive.set(blue);
    materials.neutral.color.set(cssColor("--placeholder", "#9ca1ab"));
    materials.accentLine.color.set(blue);
    materials.neutralLine.color.set(muted);
    materials.particle.color.set(blue);
  }

  function update(progress, elapsed) {
    const p = clamp(progress, 0, 1);
    const handoffT = smoothstep(0.28, 0.58, p);
    const runT = smoothstep(0.54, 0.86, p);
    const absorbed = smoothstep(0.52, 0.84, p);

    groups.manual.visible = absorbed < 0.55;
    groups.pipeline.visible = true;

    manualNodes.forEach((node, index) => {
      const def = manualDefs[index];
      const converged = smoothstep(0.3, 0.6, p);
      node.mesh.position.set(
        node.start[0] + (hubPosition[0] - node.start[0]) * converged,
        node.start[1] + (hubPosition[1] - node.start[1]) * converged,
        node.start[2] + (hubPosition[2] - node.start[2]) * converged,
      );
      node.mesh.scale.setScalar(node.scale * (1 - absorbed * 0.85));
      node.mesh.rotation.set(
        def.spinX * (1 - converged * 0.9),
        def.spinY * (1 - converged * 0.9),
        def.spinZ * (1 - converged * 0.9),
      );
    });

    handoffRoutes.forEach((route) => {
      route.mesh.visible = absorbed < 0.6;
      route.mesh.material.opacity = handoffT;
    });

    const hubActive = smoothstep(0.5, 0.85, p);
    hub.scale.setScalar(0.82 + hubActive * 0.2);
    hub.rotation.y = state.animate ? elapsed * 0.18 : 0;
    hubRing.rotation.z = state.animate ? -elapsed * 0.12 : 0;
    hubRing.scale.setScalar(0.82 + smoothstep(0.56, 0.9, p) * 0.18);
    materials.accent.emissiveIntensity = 0.12 + hubActive * 0.5;
    materials.accentLine.opacity = 0.82 + hubActive * 0.18;
    runRoutes.forEach((route) => {
      route.mesh.visible = runT > 0.06;
      route.mesh.material.opacity = runT;
      if (routeTracks.has(groups.pipeline)) {
        routeTracks.get(groups.pipeline).forEach(({ curve, marker }) => {
          marker.position.copy(curve.getPoint(runT));
        });
      }
    });

    outputs.forEach(({ mesh, start, scale }) => {
      const outT = smoothstep(0.56, 0.9, p);
      mesh.visible = runT > 0.06;
      mesh.position.set(
        start[0] + (hubPosition[0] - start[0]) * outT,
        start[1] + (hubPosition[1] - start[1]) * outT,
        start[2] + (hubPosition[2] - start[2]) * outT,
      );
      mesh.scale.setScalar(scale * outT);
    });

    // Particle streams: manual -> hub while handing off, hub -> outcome while running.
    particles.forEach((particle, index) => {
      const intensity = particle.kind === "handoff" ? handoffT : runT;
      if (intensity <= 0.005) return;
      const t = (particle.phase + intensity) % 1;
      const position = particle.curve.getPointAt(t);
      const cursor = index * 3;
      particlePositions[cursor] = position.x;
      particlePositions[cursor + 1] = position.y;
      particlePositions[cursor + 2] = position.z;
    });
    particleAttribute.needsUpdate = true;
    materials.particle.opacity = 0.66 + runT * 0.2;

    // Camera framing follows the align option.
    const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const anchorOffset =
      align === "right" && window.innerWidth >= 760 ? halfHeight * camera.aspect * 0.16 : 0;
    groups.manual.position.x = anchorOffset;
    groups.pipeline.position.x = anchorOffset;
  }

  const timer = new THREE.Timer();
  timer.connect(document);

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height || state.disposed || state.contextLost) return;
    applyPixelRatio(renderer);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    composer.setSize(width, height);
    render();
  }

  function onContextLost(event) {
    event.preventDefault();
    state.contextLost = true;
    state.running = false;
    canvas.closest("[data-service-host]")?.classList.remove("has-webgl");
    canvas.closest("[data-workflow-host]")?.classList.remove("has-webgl");
    canvas.closest("[data-handoff-host]")?.classList.remove("has-webgl");
  }

  function onContextRestored() {
    if (state.disposed) return;
    state.contextLost = false;
    canvas.closest("[data-service-host]")?.classList.add("has-webgl");
    canvas.closest("[data-workflow-host]")?.classList.add("has-webgl");
    canvas.closest("[data-handoff-host]")?.classList.add("has-webgl");
    updateTheme();
    resize();
    resume();
  }

  const observer =
    typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
  observer?.observe(canvas);
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);
  updateTheme();
  resize();

  function resume() {
    if (state.disposed) return;
    if (state.running && state.animate) return;
    if (!state.animate) {
      render();
      return;
    }
    state.running = true;
    renderer.setAnimationLoop(() => render());
  }

  function pause() {
    state.running = false;
    renderer.setAnimationLoop(null);
  }

  function setMotionEnabled(enabled) {
    state.animate = Boolean(enabled);
    if (state.animate) resume();
    else {
      pause();
      render();
    }
  }

  function render() {
    if (state.disposed || state.contextLost) return;
    timer.update();
    update(state.progress, timer.getElapsed());
    composer.render();
  }

  if (state.animate) resume();
  else render();

  return {
    getStats: () => getRendererInfo(renderer),
    setProgress(progress) {
      state.progress = clamp(progress, 0, 1);
      if (!state.animate) render();
    },
    setTheme: updateTheme,
    setMotionEnabled,
    pause,
    resume,
    dispose() {
      if (state.disposed) return;
      state.disposed = true;
      pause();
      observer?.disconnect();
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      const geometries = new Set(Object.values(geometry));
      const sceneMaterials = new Set(Object.values(materials));
      scene.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => sceneMaterials.add(material));
        } else if (object.material) {
          sceneMaterials.add(object.material);
        }
      });
      geometries.forEach((item) => item.dispose());
      sceneMaterials.forEach((material) => material.dispose());
      composer.dispose();
      renderer.dispose();
    },
  };
}

import * as THREE from "three";

const TAU = Math.PI * 2;

function smoothstep(a, b, value) {
  const x = Math.min(1, Math.max(0, (value - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

function cssColor(name, fallback) {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

function makeSoftDot() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.34, "rgba(255,255,255,0.72)");
  gradient.addColorStop(0.7, "rgba(255,255,255,0.12)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function particleCount() {
  const memory = navigator.deviceMemory || 8;
  const cores = navigator.hardwareConcurrency || 8;
  if (memory <= 4 || cores <= 4) return 620;
  return 1250;
}

export function createHeroScene(canvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
  } catch {
    return null;
  }

  const gl = renderer.getContext?.();
  if (!gl) {
    renderer.dispose();
    return null;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
  camera.position.set(0, 0, 6.4);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const system = new THREE.Group();
  scene.add(system);

  const dotTexture = makeSoftDot();

  // ── Core ───────────────────────────────────────────────────────────────
  const coreGeometry = new THREE.IcosahedronGeometry(1.3, 6);
  const coreMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#315bff"),
    emissive: new THREE.Color("#10236a"),
    emissiveIntensity: 1.15,
    metalness: 0.58,
    roughness: 0.27,
    clearcoat: 1,
    clearcoatRoughness: 0.18,
    transparent: true,
    opacity: 1,
  });
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  system.add(core);

  const rimMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color("#8ba2ff") },
      uPower: { value: 2.35 },
      uOpacity: { value: 0.82 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uPower;
      uniform float uOpacity;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), uPower);
        gl_FragColor = vec4(uColor, fresnel * uOpacity);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const rim = new THREE.Mesh(new THREE.SphereGeometry(1.34, 48, 48), rimMaterial);
  system.add(rim);

  const wireMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#5a7dff"),
    wireframe: true,
    transparent: true,
    opacity: 0.14,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const wire = new THREE.Mesh(new THREE.IcosahedronGeometry(1.56, 1), wireMaterial);
  system.add(wire);

  let halo = null;
  if (dotTexture) {
    const haloMaterial = new THREE.SpriteMaterial({
      map: dotTexture,
      color: new THREE.Color("#315bff"),
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    halo = new THREE.Sprite(haloMaterial);
    halo.scale.set(7.2, 7.2, 1);
    system.add(halo);
  }

  // ── Rings ──────────────────────────────────────────────────────────────
  const rings = [];
  const ringSpecs = [
    { radius: 2.25, tilt: 1.2, z: 0.3, color: "#5a7dff", opacity: 0.42 },
    { radius: 2.85, tilt: 1.05, z: 0.7, color: "#315bff", opacity: 0.26 },
    { radius: 3.45, tilt: 1.32, z: 1.1, color: "#ff7a2f", opacity: 0.18 },
  ];

  ringSpecs.forEach((spec) => {
    const group = new THREE.Group();
    group.rotation.x = spec.tilt;
    group.rotation.z = spec.z;

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(spec.color),
      transparent: true,
      opacity: spec.opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(spec.radius, 0.0055, 6, 220),
      ringMaterial,
    );
    group.add(ring);

    const dotCount = 10;
    const positions = new Float32Array(dotCount * 3);
    for (let i = 0; i < dotCount; i += 1) {
      const angle = (i / dotCount) * TAU;
      positions[i * 3] = Math.cos(angle) * spec.radius;
      positions[i * 3 + 1] = Math.sin(angle) * spec.radius;
      positions[i * 3 + 2] = 0;
    }
    const dotGeometry = new THREE.BufferGeometry();
    dotGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const dotMaterial = new THREE.PointsMaterial({
      color: new THREE.Color(spec.color),
      size: 0.055,
      transparent: true,
      opacity: spec.opacity + 0.34,
      map: dotTexture || undefined,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const dots = new THREE.Points(dotGeometry, dotMaterial);
    group.add(dots);

    system.add(group);
    rings.push({ group, ring, dots, spec, spin: 0.035 + Math.random() * 0.05 });
  });

  // ── Dust field ─────────────────────────────────────────────────────────
  const count = particleCount();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const kinds = new Uint8Array(count);
  for (let i = 0; i < count; i += 1) {
    const radius = 2.4 + Math.pow(Math.random(), 0.62) * 9.5;
    const theta = Math.random() * TAU;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.72;
    positions[i * 3 + 2] = radius * Math.cos(phi);
    kinds[i] = Math.random() < 0.18 ? 1 : 0;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  dustGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const dustMaterial = new THREE.PointsMaterial({
    size: 0.075,
    map: dotTexture || undefined,
    vertexColors: true,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  scene.add(dust);

  // ── Lights ─────────────────────────────────────────────────────────────
  const ambient = new THREE.AmbientLight(0x22305c, 1.5);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xdfe8ff, 2.6);
  key.position.set(-3.5, 4.2, 5.4);
  scene.add(key);

  const blueLight = new THREE.PointLight(0x315bff, 38, 18, 2);
  blueLight.position.set(-3.8, 1.4, 2.8);
  scene.add(blueLight);

  const orangeLight = new THREE.PointLight(0xff7a2f, 22, 16, 2);
  orangeLight.position.set(4.2, -2.4, 2.2);
  scene.add(orangeLight);

  // ── State ──────────────────────────────────────────────────────────────
  const state = {
    progress: 0,
    pointerX: 0,
    pointerY: 0,
    smoothX: 0,
    smoothY: 0,
    offsetX: 1.6,
    theme: "dark",
    running: true,
    disposed: false,
  };

  function updateParticleColors() {
    const dark = state.theme === "dark";
    const blue = new THREE.Color(cssColor("--blue-bright", "#5a7dff"));
    const lightBlue = new THREE.Color(cssColor("--blue-soft", "#8ba2ff"));
    const orange = new THREE.Color(cssColor("--orange", "#ff7a2f"));
    const pale = new THREE.Color(cssColor("--ink-soft", "#d6dbe4"));
    const ink = new THREE.Color(cssColor("--ink", "#090b10"));
    const color = dustGeometry.getAttribute("color");
    for (let i = 0; i < count; i += 1) {
      const base =
        kinds[i] === 1
          ? orange
          : i % 7 === 0
            ? lightBlue
            : dark
              ? pale
              : ink;
      const tint = dark ? (i % 5 === 0 ? blue : base) : i % 4 === 0 ? blue : base;
      color.setXYZ(i, tint.r, tint.g, tint.b);
    }
    color.needsUpdate = true;
    dustMaterial.opacity = dark ? 0.82 : 0.55;
  }

  function applyTheme(theme) {
    state.theme = theme === "light" ? "light" : "dark";
    const blue = cssColor("--blue", "#315bff");
    const blueDeep = cssColor("--blue-deep", "#0a1b52");
    const blueBright = cssColor("--blue-bright", "#5a7dff");
    const orange = cssColor("--orange", "#ff7a2f");
    const ink = cssColor("--ink", "#f3f5f9");

    coreMaterial.color.set(blue);
    coreMaterial.emissive.set(blueDeep);
    coreMaterial.emissiveIntensity = state.theme === "dark" ? 1.15 : 0.85;
    rimMaterial.uniforms.uColor.value.set(blueBright);
    wireMaterial.color.set(blueBright);
    wireMaterial.opacity = state.theme === "dark" ? 0.14 : 0.1;

    rings.forEach(({ ring, dots, spec }, index) => {
      const ringColor = index === 2 ? orange : index === 1 ? blue : blueBright;
      ring.material.color.set(ringColor);
      dots.material.color.set(ringColor);
      ring.material.opacity =
        state.theme === "dark" ? spec.opacity : spec.opacity * 0.72;
      dots.material.opacity =
        state.theme === "dark" ? spec.opacity + 0.34 : spec.opacity + 0.2;
    });

    ambient.color.set(state.theme === "dark" ? 0x22305c : 0x9aa8c8);
    ambient.intensity = state.theme === "dark" ? 1.5 : 2.2;
    key.color.set(state.theme === "dark" ? 0xdfe8ff : 0xffffff);
    key.intensity = state.theme === "dark" ? 2.6 : 2.2;
    blueLight.color.set(blue);
    orangeLight.color.set(orange);

    if (halo?.material) {
      halo.material.color.set(blue);
      halo.material.opacity = state.theme === "dark" ? 0.72 : 0.4;
    }

    // Keep a little contrast on the warm light surface.
    if (state.theme === "light") {
      coreMaterial.clearcoat = 0.85;
      renderer.toneMappingExposure = 0.92;
    } else {
      coreMaterial.clearcoat = 1;
      renderer.toneMappingExposure = 1.05;
    }

    updateParticleColors();
  }

  function resize() {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const halfHeight =
      Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const halfWidth = halfHeight * camera.aspect;
    state.offsetX = halfWidth * 0.44;
  }

  function setProgress(progress) {
    state.progress = THREE.MathUtils.clamp(progress, 0, 1);
  }

  function setPointer(x, y) {
    state.pointerX = THREE.MathUtils.clamp(x, -1, 1);
    state.pointerY = THREE.MathUtils.clamp(y, -1, 1);
  }

  let frame = 0;
  let last = performance.now();
  let clock = 0;

  function render(now) {
    if (state.disposed) return;
    frame = requestAnimationFrame(render);
    if (!state.running) {
      last = now;
      return;
    }

    const delta = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    clock += delta;

    const p = state.progress;
    const dive = smoothstep(0.11, 0.5, p);
    const settle = smoothstep(0.5, 0.76, p);
    const leave = smoothstep(0.86, 0.99, p);

    state.smoothX += (state.pointerX - state.smoothX) * 0.045;
    state.smoothY += (state.pointerY - state.smoothY) * 0.045;

    const drift = Math.sin(clock * 0.32) * 0.06;
    system.position.x = state.offsetX * (1 - dive) + drift + state.smoothX * 0.12;
    system.position.y = -state.smoothY * 0.12;
    system.rotation.y = clock * 0.055 + state.smoothX * 0.18;
    system.rotation.x = state.smoothY * 0.09;

    const coreScale = 1 + dive * 3.35;
    core.scale.setScalar(coreScale);
    rim.scale.setScalar(coreScale * 1.006);
    wire.scale.setScalar(1 + dive * 2.6);
    wire.rotation.y = -clock * 0.18;
    wire.rotation.z = clock * 0.08;

    const coreFade = 1 - smoothstep(0.53, 0.66, p);
    coreMaterial.opacity = coreFade;
    rimMaterial.uniforms.uOpacity.value = 0.82 * coreFade;
    wireMaterial.opacity =
      (state.theme === "dark" ? 0.14 : 0.1) * coreFade * (1 - settle * 0.6);
    core.visible = coreFade > 0.01;
    rim.visible = coreFade > 0.01;
    wire.visible = coreFade > 0.01;

    if (halo) {
      halo.material.opacity =
        (state.theme === "dark" ? 0.72 : 0.4) * coreFade;
      halo.scale.setScalar(7.2 + dive * 6);
    }

    rings.forEach(({ group, ring, dots, spin }, index) => {
      group.rotation.z += delta * spin * (0.7 + index * 0.2);
      group.rotation.x =
        ringSpecs[index].tilt +
        Math.sin(clock * 0.18 + index) * 0.045 +
        dive * 0.12;
      const ringScale = 1 + dive * 1.9;
      group.scale.setScalar(ringScale);
      const fade = 1 - settle * 0.72 - leave * 0.28;
      ring.material.opacity =
        (state.theme === "dark" ? ringSpecs[index].opacity : ringSpecs[index].opacity * 0.72) *
        Math.max(0, fade);
      dots.material.opacity =
        (state.theme === "dark"
          ? ringSpecs[index].opacity + 0.34
          : ringSpecs[index].opacity + 0.2) * Math.max(0, fade);
    });

    dust.rotation.y = clock * 0.018 + state.smoothX * 0.06;
    dust.rotation.x = state.smoothY * 0.03;
    dust.scale.setScalar(1 + dive * 1.5);
    dustMaterial.opacity =
      (state.theme === "dark" ? 0.82 : 0.55) * (1 - leave * 0.7);

    renderer.render(scene, camera);
  }

  function onContextLost(event) {
    event.preventDefault();
    state.running = false;
    state.disposed = true;
    cancelAnimationFrame(frame);
  }

  const observer =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => resize())
      : null;
  observer?.observe(canvas);
  canvas.addEventListener("webglcontextlost", onContextLost);

  applyTheme(document.documentElement.dataset.theme || "dark");
  resize();
  updateParticleColors();
  frame = requestAnimationFrame(render);

  return {
    setProgress,
    setPointer,
    setTheme: applyTheme,
    pause() {
      state.running = false;
    },
    resume() {
      state.running = true;
      last = performance.now();
    },
    resize,
    dispose() {
      state.disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      canvas.removeEventListener("webglcontextlost", onContextLost);
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose?.();
        if (object.material) {
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => {
            material.map?.dispose?.();
            material.dispose?.();
          });
        }
      });
      renderer.dispose();
    },
  };
}

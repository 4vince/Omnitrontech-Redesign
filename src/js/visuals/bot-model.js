import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/**
 * The homepage robot, modelled on public/Reference model.jpg: a glossy
 * orange toy robot with a wide head, a recessed black screen face showing
 * two glowing eyes, black ear pods, a yellow-ball antenna, and a separate
 * floating body with grey metal arms, black cuffs, yellow wrists and
 * two-finger claws. Built from primitives; no model files.
 *
 * The task display (robot-hud.js) floats in front of the screen at the
 * size the camera path was tuned around (VISOR). robot-scene.js fades it
 * out as the camera pulls back, revealing the eyes behind it.
 *
 * Everything that moves on its own has a pivot group, so the scene can
 * animate it without touching geometry: root (idle float and spin), head
 * (pointer follow, bob), body (bob), arms (swing), antenna (sway), eyes
 * (blink).
 */

// The floating task display. Same numbers the camera path was tuned for.
export const VISOR = { radius: 2.2, height: 0.84, arc: THREE.MathUtils.degToRad(58), front: 1.42 };
const VISOR_CENTER_Z = VISOR.front - VISOR.radius;

const COLORS = {
  orange: 0xf39a1e,
  bezel: 0x6e3a10,
  black: 0x14161d,
  glass: 0x05070d,
  metal: 0xc3c8d2,
  yellow: 0xf8c41f,
  eye: 0x8fc4ff,
  ion: 0x7fb8ff,
  nozzle: 0x2a2f3a,
};

/** Additive in colour and alpha (alpha follows brightness): the hero
    canvas is transparent, so dark pixels must stay at alpha 0. */
const GLOW_BLENDING = {
  transparent: true,
  depthWrite: false,
  toneMapped: false,
  blending: THREE.CustomBlending,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.OneFactor,
  blendDstAlpha: THREE.OneFactor,
};

const PASS_UV = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

function roundedRect(width, height, radius) {
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function plate(width, height, radius, depth, bevel) {
  const geometry = new THREE.ExtrudeGeometry(roundedRect(width, height, radius), {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 16,
  });
  // Centre on z so `position.z` places the middle of the plate.
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function cylinderArc(radius, height, arc, segments = 64) {
  // Open arc centred on +Z so its outer face looks at the camera and the
  // texture's u runs left to right as seen from the front.
  return new THREE.CylinderGeometry(radius, radius, height, segments, 1, true, -arc / 2, arc);
}

function eyeMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(COLORS.eye) }, uPower: { value: 1 } },
    transparent: true,
    toneMapped: false,
    vertexShader: PASS_UV,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uPower;
      varying vec2 vUv;
      void main() {
        float r = length(vUv - 0.5) * 2.0;
        if (r > 1.0) discard;
        // Hot white core, blue rim, soft edge: the reference's lit eyes.
        vec3 c = mix(vec3(1.0), uColor, smoothstep(0.15, 0.62, r));
        c *= (1.15 - 0.35 * r) * uPower;
        float alpha = 1.0 - smoothstep(0.62, 1.0, r);
        gl_FragColor = vec4(c, alpha);
        #include <colorspace_fragment>
      }
    `,
  });
}

function haloMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(COLORS.eye) }, uPower: { value: 1 } },
    ...GLOW_BLENDING,
    vertexShader: PASS_UV,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uPower;
      varying vec2 vUv;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        vec3 c = uColor * exp(-dot(p, p) * 6.0) * 0.55 * uPower;
        gl_FragColor = vec4(c, max(c.r, max(c.g, c.b)));
        #include <colorspace_fragment>
      }
    `,
  });
}

function buildArm(side, mats) {
  // Built hanging straight down from the shoulder (local origin), then
  // posed by rotating the group, so the scene can swing it from there.
  const arm = new THREE.Group();
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.62, 20), mats.metal);
  upper.position.y = -0.31;
  arm.add(upper);
  const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 14), mats.metal);
  elbow.position.y = -0.62;
  arm.add(elbow);
  const cuff = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.42, 0.42, 4, 0.14), mats.black);
  cuff.position.y = -0.86;
  arm.add(cuff);
  const wrist = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 16), mats.yellow);
  wrist.position.y = -1.12;
  arm.add(wrist);

  // Two-finger claw: opposing hooks, opening downward.
  const claw = new THREE.Group();
  claw.position.y = -1.32;
  const fingerGeometry = new THREE.TorusGeometry(0.17, 0.045, 10, 28, Math.PI * 0.75);
  const left = new THREE.Mesh(fingerGeometry, mats.metal);
  left.rotation.z = Math.PI * 0.58;
  left.position.x = -0.02;
  const right = new THREE.Mesh(fingerGeometry, mats.metal);
  right.rotation.z = -Math.PI * 0.33;
  right.position.x = 0.02;
  claw.add(left, right);
  arm.add(claw);

  const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 16), mats.metal);
  arm.add(shoulder);

  arm.userData.rest = { z: side * 0.62, x: -0.18 };
  arm.rotation.set(arm.userData.rest.x, 0, arm.userData.rest.z);
  return arm;
}

/* ── Ion thrusters ──────────────────────────────────────────────────────
   Two pods under the body. Each has a dark nozzle housing with a bright
   collar, a glowing ion grid facing down, and a translucent plume that is
   brightest at the grid, fades to nothing over its length, and shimmers
   with travelling bands. uThrust (set by the scene) scales the burn. */

const ionUniforms = () => ({
  uTime: { value: 0 },
  uThrust: { value: 1 },
  uColor: { value: new THREE.Color(COLORS.ion) },
});

function plumeMaterial(uniforms) {
  return new THREE.ShaderMaterial({
    uniforms,
    ...GLOW_BLENDING,
    side: THREE.DoubleSide,
    vertexShader: PASS_UV,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uThrust;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        // vUv.y: 0 at the nozzle, 1 at the far tip (cone flipped).
        float along = vUv.y;
        float fall = pow(1.0 - along, 1.6);
        float bands = 0.78 + 0.22 * sin(along * 34.0 - uTime * 22.0 + sin(vUv.x * 6.2831 * 3.0) * 1.5);
        float flicker = 0.9 + 0.1 * sin(uTime * 41.0) * sin(uTime * 17.0);
        // Hotter, whiter near the grid.
        vec3 c = mix(uColor, vec3(0.92, 0.97, 1.0), smoothstep(0.35, 0.0, along));
        c *= fall * bands * flicker * 0.75 * uThrust;
        gl_FragColor = vec4(c, max(c.r, max(c.g, c.b)));
        #include <colorspace_fragment>
      }
    `,
  });
}

function gridMaterial(uniforms) {
  return new THREE.ShaderMaterial({
    uniforms,
    ...GLOW_BLENDING,
    vertexShader: PASS_UV,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uThrust;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 1.0) discard;
        // Concentric grid rings over a hot core: an ion engine's face.
        float rings = 0.55 + 0.45 * step(0.5, fract(r * 4.0 - uTime * 1.5));
        vec3 c = mix(vec3(1.0), uColor, smoothstep(0.0, 0.8, r)) * rings;
        c *= (1.0 - smoothstep(0.75, 1.0, r)) * (0.85 + 0.25 * uThrust);
        gl_FragColor = vec4(c, max(c.r, max(c.g, c.b)));
        #include <colorspace_fragment>
      }
    `,
  });
}

function buildThruster(mats, uniforms) {
  const pod = new THREE.Group();
  // Housing: a short flared nozzle, open at the bottom.
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.27, 0.26, 32, 1, true), mats.nozzle);
  pod.add(housing);
  const cap = new THREE.Mesh(new THREE.CircleGeometry(0.2, 32), mats.nozzle);
  cap.rotation.x = -Math.PI / 2;
  cap.position.y = 0.13;
  pod.add(cap);
  // Bright collar at the nozzle lip.
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.035, 12, 40), mats.metal);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = -0.13;
  pod.add(collar);
  // Ion grid facing down, just inside the lip.
  const grid = new THREE.Mesh(new THREE.CircleGeometry(0.24, 40), gridMaterial(uniforms));
  grid.rotation.x = Math.PI / 2;
  grid.position.y = -0.1;
  grid.renderOrder = 2;
  pod.add(grid);
  // Plume: an open cone, flipped so its wide end sits on the grid.
  const plumeLength = 1.25;
  const plume = new THREE.Mesh(new THREE.ConeGeometry(0.26, plumeLength, 40, 1, true), plumeMaterial(uniforms));
  plume.rotation.x = Math.PI;
  plume.position.y = -0.12 - plumeLength / 2;
  plume.renderOrder = 2;
  pod.add(plume);
  return pod;
}

export function buildBot(hudTexture) {
  const mats = {
    orange: new THREE.MeshPhysicalMaterial({
      color: COLORS.orange,
      roughness: 0.3,
      metalness: 0,
      clearcoat: 0.9,
      clearcoatRoughness: 0.12,
    }),
    bezel: new THREE.MeshPhysicalMaterial({ color: COLORS.bezel, roughness: 0.35, clearcoat: 0.6 }),
    black: new THREE.MeshPhysicalMaterial({ color: COLORS.black, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: COLORS.glass,
      roughness: 0.05,
      metalness: 0.15,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
    }),
    metal: new THREE.MeshStandardMaterial({ color: COLORS.metal, roughness: 0.22, metalness: 0.9 }),
    nozzle: new THREE.MeshStandardMaterial({ color: COLORS.nozzle, roughness: 0.35, metalness: 0.85, side: THREE.DoubleSide }),
    yellow: new THREE.MeshPhysicalMaterial({ color: COLORS.yellow, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15 }),
  };

  const root = new THREE.Group();
  const head = new THREE.Group();
  root.add(head);

  // Head shell and its screen face.
  head.add(new THREE.Mesh(new RoundedBoxGeometry(3.1, 2.25, 1.9, 8, 0.6), mats.orange));
  const bezel = new THREE.Mesh(plate(2.36, 1.52, 0.42, 0.04, 0.03), mats.bezel);
  bezel.position.z = 0.96;
  head.add(bezel);
  const screen = new THREE.Mesh(plate(2.2, 1.36, 0.36, 0.05, 0.03), mats.glass);
  screen.position.z = 1.0;
  head.add(screen);

  // Eyes on the screen.
  const eyeMat = eyeMaterial();
  const halo = haloMaterial();
  const eyes = [];
  [1, -1].forEach((side) => {
    const eye = new THREE.Group();
    eye.position.set(side * 0.46, 0.03, 1.065);
    eye.add(new THREE.Mesh(new THREE.CircleGeometry(0.2, 40), eyeMat));
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), halo);
    glow.position.z = 0.01;
    glow.renderOrder = 2;
    eye.add(glow);
    head.add(eye);
    eyes.push(eye);
  });

  // Ear pods.
  const earGeometry = new THREE.SphereGeometry(1, 32, 24);
  [1, -1].forEach((side) => {
    const ear = new THREE.Mesh(earGeometry, mats.black);
    ear.scale.set(0.2, 0.45, 0.42);
    ear.position.set(side * 1.58, -0.02, -0.05);
    head.add(ear);
  });

  // Antenna on its own pivot so it can sway.
  const antenna = new THREE.Group();
  antenna.position.y = 1.12;
  head.add(antenna);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.1, 32), mats.black);
  base.position.y = 0.04;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.55, 12), mats.black);
  stem.position.y = 0.34;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.22, 28, 20), mats.yellow);
  ball.position.y = 0.72;
  antenna.add(base, stem, ball);

  // Floating task display in front of the screen.
  const display = new THREE.Mesh(
    cylinderArc(VISOR.radius, VISOR.height, VISOR.arc),
    new THREE.MeshBasicMaterial({ map: hudTexture, toneMapped: false, transparent: true, depthWrite: false }),
  );
  display.position.z = VISOR_CENTER_Z;
  display.renderOrder = 3;
  head.add(display);

  // Body floats on its own below the head (no neck), arms off its sides.
  const body = new THREE.Group();
  body.position.y = -2.18;
  root.add(body);
  const torso = new THREE.Mesh(new RoundedBoxGeometry(1.9, 1.62, 1.4, 6, 0.5), mats.orange);
  body.add(torso);
  // Two ion thrusters under the body, slightly splayed.
  const thrust = ionUniforms();
  const thrusters = [1, -1].map((side) => {
    const pod = buildThruster(mats, thrust);
    pod.position.set(side * 0.46, -0.92, 0);
    pod.rotation.z = side * 0.08;
    body.add(pod);
    return pod;
  });
  const arms = [1, -1].map((side) => {
    const arm = buildArm(side, mats);
    arm.position.set(side * 0.98, 0.36, 0);
    body.add(arm);
    return arm;
  });

  return {
    root,
    head,
    body,
    arms,
    antenna,
    eyes,
    display,
    glow: [eyeMat, halo],
    thrusters,
    thrust,
    rest: { headY: 0, bodyY: body.position.y },
  };
}

import * as THREE from "three";

/*
 * The room camera: a hero photograph rebuilt as two plates so a camera can
 * pull back from the skyline, through the glass, into the office.
 *
 *   outside plate  the view through the glass, continued past its edges
 *                  (scripts/make-room-plates.py), on a far flat plane
 *   inside plate   the office with the glass cut out, on a subdivided plane
 *                  at the glass line; each vertex is pulled toward the rest
 *                  camera by the depth map, so desks and screens sit in
 *                  front of the window frames and move faster than they do
 *
 * At rest (progress 1) both planes project exactly as the CSS photo does
 * (object-fit: cover at the same object-position), so the last frame is the
 * hero as it always looked. Vertices move along the rest camera's rays, which
 * is why the depth changes nothing at rest and everything in motion.
 *
 * Beyond the hero pull-back, `stations` let the camera tour the room: each
 * is a point of the photo (a screen, the desk), how close to frame it and
 * where on screen to hold it. setPath(a, b, t) moves between any two poses
 * ("start", "rest" or a station index), stepping back a little mid-way.
 * Both plates extend past the photo by RIM (edge pixels, clamped), so a
 * camera off the rest axis never sees the end of the picture.
 *
 * Frames render on demand (setProgress, setPath, resize), never in a loop.
 */

const FOV = 40; // vertical, degrees
const D_IN = 1; // rest distance to the glass
const D_OUT = 2.4; // rest distance to the skyline plate
const PULL = 0.6; // nearest object sits at D_IN * (1 - PULL)
const START_Z = -(D_IN + 0.06); // first frame: just beyond the glass
const SEG_X = 192;
const SEG_Y = 108;
const RIM = 0.12; // plate extension past the photo, each side, as a fraction

const INSIDE_VERT = /* glsl */ `
  uniform sampler2D uDepth;
  uniform float uPull;
  uniform float uRim;
  varying vec2 vUv;
  varying float vDist;
  void main() {
    vUv = (uv - 0.5) * uRim + 0.5;
    float d = texture2D(uDepth, uv).r;
    // Slide along the ray through the rest camera (at the origin): the
    // projection from rest is unchanged, the distance is not.
    vec3 p = position * (1.0 - uPull * d);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDist = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const INSIDE_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uFade;
  varying vec2 vUv;
  varying float vDist;
  void main() {
    vec4 c = texture2D(uMap, vUv);
    // Anything the camera is about to pass dissolves instead of filling
    // the screen with a few enormous pixels.
    float near = smoothstep(0.03, 0.32, vDist);
    gl_FragColor = vec4(c.rgb, c.a * near * uFade);
    #include <colorspace_fragment>
  }
`;

const OUTSIDE_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uSoft;
  uniform vec2 uTexel;
  varying vec2 vUv;
  void main() {
    // A light 5-tap soften while the plate is magnified, so the opening
    // frame reads as focus on the city rather than upscaled pixels.
    vec2 o = uTexel * uSoft;
    vec4 c = texture2D(uMap, vUv) * 0.4
      + texture2D(uMap, vUv + vec2(o.x, 0.0)) * 0.15
      + texture2D(uMap, vUv - vec2(o.x, 0.0)) * 0.15
      + texture2D(uMap, vUv + vec2(0.0, o.y)) * 0.15
      + texture2D(uMap, vUv - vec2(0.0, o.y)) * 0.15;
    gl_FragColor = vec4(c.rgb, 1.0);
    #include <colorspace_fragment>
  }
`;

const PLAIN_VERT = /* glsl */ `
  uniform float uRim;
  varying vec2 vUv;
  void main() {
    vUv = (uv - 0.5) * uRim + 0.5;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const clamp = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
const lerp = (a, b, t) => a + (b - a) * t;

function loadTexture(loader, url, srgb) {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        tex.generateMipmaps = false;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        resolve(tex);
      },
      undefined,
      reject,
    );
  });
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ plates: string, position?: [number, number], focus?: [number, number], maxDpr?: number }} options
 *   plates   path prefix, e.g. "/images/room/solutions-ops-lab"
 *   position the photo's CSS object-position as fractions (default 0.5, 0.5)
 *   focus    the point of the photo (fractions) the opening frame centres on:
 *            the camera starts in front of that pane, so it comes in through it
 *   stations [{ at: [fx, fy], zoom, screen: [x, y] }]: frame the photo point
 *            `at` magnified `zoom` times, held at `screen` (-1..1, y up)
 */
export async function createRoomScene(
  canvas,
  { plates, position = [0.5, 0.5], focus = [0.5, 0.45], stations = [], maxDpr = 1.5 } = {},
) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x050b23, 1);

  const loader = new THREE.TextureLoader();
  const [outsideTex, insideTex, depthTex] = await Promise.all([
    loadTexture(loader, `${plates}-outside.webp`, true),
    loadTexture(loader, `${plates}-inside.webp`, true),
    loadTexture(loader, `${plates}-depth.webp`, false),
  ]);
  const imgAspect = outsideTex.image.width / outsideTex.image.height;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 10);

  const outsideMat = new THREE.ShaderMaterial({
    vertexShader: PLAIN_VERT,
    fragmentShader: OUTSIDE_FRAG,
    uniforms: {
      uMap: { value: outsideTex },
      uRim: { value: 1 + 2 * RIM },
      uSoft: { value: 0 },
      uTexel: { value: new THREE.Vector2(1 / outsideTex.image.width, 1 / outsideTex.image.height) },
    },
    depthWrite: false,
  });
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), outsideMat);
  outside.renderOrder = 0;

  const insideMat = new THREE.ShaderMaterial({
    vertexShader: INSIDE_VERT,
    fragmentShader: INSIDE_FRAG,
    uniforms: {
      uMap: { value: insideTex },
      uDepth: { value: depthTex },
      uPull: { value: PULL },
      uRim: { value: 1 + 2 * RIM },
      uFade: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
  });
  // Geometry is rebuilt on resize (its size bakes in the cover fit).
  const inside = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, SEG_X, SEG_Y), insideMat);
  inside.renderOrder = 1;
  scene.add(outside, inside);

  // Depth, read once on the CPU, so a station's framing allows for how far
  // the vertex at that point has been pulled toward the camera.
  const depthAt = (() => {
    const img = depthTex.image;
    const w = 192;
    const h = Math.max(1, Math.round((w * img.height) / img.width));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0, w, h);
    const data = g.getImageData(0, 0, w, h).data;
    return (fx, fy) => {
      let sum = 0;
      let n = 0;
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          const x = Math.min(w - 1, Math.max(0, Math.round(fx * (w - 1)) + dx));
          const y = Math.min(h - 1, Math.max(0, Math.round(fy * (h - 1)) + dy));
          sum += data[(y * w + x) * 4];
          n += 1;
        }
      }
      return sum / n / 255;
    };
  })();

  let width = 0;
  let height = 0;
  let disposed = false;
  const start = new THREE.Vector2(); // camera x/y of the opening frame
  const fit = { x: 0, y: 0, pw: 1, ph: 1 }; // the inside plate at rest, unextended
  const REST = { x: 0, y: 0, z: 0 };
  let startPose = { x: 0, y: 0, z: START_Z };
  let stationPoses = [];
  // The current move: from pose a to pose b, t in 0..1 (already eased),
  // stepping back by `arc` (a fraction of the depth) at the middle.
  let path = { a: "rest", b: "rest", t: 1, arc: 0 };

  /* Size each plane so that, from the rest camera, it covers the viewport
     exactly as `object-fit: cover; object-position: x y` does. */
  function fitPlane(mesh, dist, segX, segY) {
    const vh = 2 * dist * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const vw = vh * camera.aspect;
    const ph = vh * Math.max(1, camera.aspect / imgAspect);
    const pw = ph * imgAspect;
    const [px, py] = position;
    const x = (0.5 - px) * (pw - vw);
    const y = -(0.5 - py) * (ph - vh);
    mesh.geometry.dispose();
    mesh.geometry = new THREE.PlaneGeometry(pw * (1 + 2 * RIM), ph * (1 + 2 * RIM), segX, segY);
    // Bake the offset into the vertices: the depth pull scales positions
    // about the camera, so the plane must already sit where it projects.
    mesh.geometry.translate(x, y, -dist);
    if (mesh === outside) {
      // The camera opens straight in front of the focus point on the skyline.
      start.set(x + (focus[0] - 0.5) * pw, y + (0.5 - focus[1]) * ph);
    } else {
      Object.assign(fit, { x, y, pw, ph });
    }
  }

  /* Where the camera stands to frame a station: the point is moved to where
     the depth pull put it, the camera comes forward until it is `zoom`
     times larger, then slides so it sits at `screen`. Clamped so the view
     at the glass line stays inside the photo. */
  function stationPose({ at: [fx, fy], zoom = 1.6, screen: [sx, sy] = [0, 0] }) {
    const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const k = 1 - PULL * depthAt(fx, fy);
    const px = (fit.x + (fx - 0.5) * fit.pw) * k;
    const py = (fit.y + (0.5 - fy) * fit.ph) * k;
    const pz = -D_IN * k;
    const dist = -pz / zoom;
    const z = pz + dist;
    const halfH = t * dist;
    const halfW = halfH * camera.aspect;
    const gh = t * (D_IN + z);
    const gw = gh * camera.aspect;
    return {
      x: clamp(px - sx * halfW, fit.x - fit.pw / 2 + gw, fit.x + fit.pw / 2 - gw),
      y: clamp(py - sy * halfH, fit.y - fit.ph / 2 + gh, fit.y + fit.ph / 2 - gh),
      z,
    };
  }

  const poseOf = (key) => (key === "start" ? startPose : key === "rest" ? REST : stationPoses[key] ?? REST);

  function render() {
    if (disposed || !width) return;
    const { a, b, t, arc } = path;
    const A = poseOf(a);
    const B = poseOf(b);
    // The camera only translates (no rotation), so the plates never skew.
    // Mid-move it steps back toward the room, like turning to the next desk.
    const back = 1 - arc * Math.sin(Math.PI * t);
    camera.position.set(lerp(A.x, B.x, t), lerp(A.y, B.y, t), lerp(A.z, B.z, t) * back);
    // Skyline soften while it is magnified, gone by the time it is framed.
    const fromStart = a === "start" ? 1 - t : b === "start" ? t : 0;
    outsideMat.uniforms.uSoft.value = 0.6 * fromStart * fromStart;
    renderer.render(scene, camera);
  }

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    width = w;
    height = h;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    fitPlane(outside, D_OUT, 1, 1);
    fitPlane(inside, D_IN, SEG_X, SEG_Y);
    startPose = { x: start.x, y: start.y, z: START_Z };
    stationPoses = stations.map(stationPose);
    render();
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  return {
    /** The hero pull-back: 0 = beyond the glass, 1 = the photograph. */
    setProgress(p) {
      this.setPath("start", "rest", ease(clamp01(p)));
    },
    /** Any move: a and b are "start", "rest" or a station index. */
    setPath(a, b, t, arc = 0) {
      if (path.a === a && path.b === b && path.t === t && path.arc === arc) return;
      path = { a, b, t, arc };
      render();
    },
    resize,
    dispose() {
      disposed = true;
      ro.disconnect();
      [outsideTex, insideTex, depthTex].forEach((t) => t.dispose());
      [outside, inside].forEach((m) => {
        m.geometry.dispose();
        m.material.dispose();
      });
      renderer.dispose();
    },
  };
}

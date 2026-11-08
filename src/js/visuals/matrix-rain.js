import * as THREE from "three";

/**
 * Faint columns of falling glyphs on an arc behind the hero robot: the
 * film's picture of a machine thinking. One shader on one open cylinder
 * segment; no textures.
 *
 * Each column has its own speed and phase; a bright lead glyph trails a
 * fading tail, and glyphs re-roll now and then. A mask keeps the rain to
 * the middle of the arc (behind the figure, clear of the copy) and fades
 * it at top and bottom.
 *
 * The hero canvas is transparent over the photo, so the material adds in
 * colour AND alpha (alpha follows brightness): dark pixels stay at alpha 0
 * instead of painting a black panel.
 */
export function createMatrixRain({ color = 0x7ea6ff, opacity = 0.45 } = {}) {
  const uniforms = {
    uTime: { value: 0 },
    uGlow: { value: new THREE.Color(color) },
    uOpacity: { value: opacity },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneFactor,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uGlow;
      uniform float uOpacity;
      varying vec2 vUv;

      float h21(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      void main() {
        const float COLS = 64.0;
        const float ROWS = 46.0;
        float col = floor(vUv.x * COLS);
        float down = 1.0 - vUv.y;
        float row = floor(down * ROWS);
        vec2 cell = vec2(fract(vUv.x * COLS), fract(down * ROWS));

        float liveCol = step(0.38, h21(vec2(col, 3.0)));
        float speed = 0.22 + h21(vec2(col, 1.0)) * 0.5;
        float headRow = fract(uTime * speed * 0.11 + h21(vec2(col, 7.0))) * (ROWS + 24.0) - 12.0;
        float dist = headRow - row;
        float trail = dist >= 0.0 ? exp(-dist * 0.16) : 0.0;
        float lead = (dist >= 0.0 && dist < 1.0) ? 1.0 : 0.0;

        // A 3 x 5 bitmap glyph per cell, re-rolled now and then.
        vec2 g = (cell - vec2(0.2, 0.12)) / vec2(0.6, 0.76);
        float inside = step(0.0, g.x) * step(g.x, 1.0) * step(0.0, g.y) * step(g.y, 1.0);
        vec2 px = floor(g * vec2(3.0, 5.0));
        float roll = floor(uTime * (1.0 + 3.0 * h21(vec2(row, col))));
        float bit = step(0.45, h21(px + vec2(col * 3.1 + roll, row * 5.7)));
        float glyph = inside * bit * liveCol;

        float mask = smoothstep(0.34, 0.1, abs(vUv.x - 0.5))
          * smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.72, vUv.y);
        vec3 c = uGlow * glyph * trail * 0.75 + vec3(0.8, 0.9, 1.0) * glyph * lead * 0.9;
        c *= mask * uOpacity;
        gl_FragColor = vec4(c, max(c.r, max(c.g, c.b)));
        #include <colorspace_fragment>
      }
    `,
  });

  // An arc of a cylinder behind the figure (theta around PI faces the camera).
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.2, 9, 64, 1, true, Math.PI - 0.75, 1.5), material);
  mesh.position.set(0, -0.6, 1.4);
  mesh.renderOrder = -1;

  return {
    mesh,
    /** Seconds; hold at 0 (a still frame) when motion is off. */
    update(t) {
      uniforms.uTime.value = t;
    },
  };
}

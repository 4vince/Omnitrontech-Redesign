import * as THREE from "three";

/**
 * Fresnel rim glow material — replaces emissive-only accent lighting with a
 * view-dependent fresnel rim so hubs and key accents read as lit from any angle.
 */
export function createFresnelGlowMaterial(color, intensity = 1.4) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(color) },
      intensity: { value: intensity },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vWorld;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPosition = viewMatrix * modelMatrix * vec4(position, 1.0);
        vWorld = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 glowColor;
      uniform float intensity;
      varying vec3 vNormal;
      varying vec3 vWorld;

      void main() {
        vec3 viewDirection = normalize(cameraPosition - vWorld);
        float fresnel = pow(1.0 - max(dot(viewDirection, normalize(vNormal)), 0.0), 0.5);
        gl_FragColor = vec4(glowColor * fresnel * intensity, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });

  return material;
}

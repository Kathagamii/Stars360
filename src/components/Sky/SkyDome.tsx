import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DOME_RADIUS } from "./constants";
import type { SkyPalette } from "./skyPalette";

const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vDir;
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uGlow;
  uniform float uGlowStrength;
  uniform vec3 uSunDir;

  void main() {
    float h = clamp(vDir.y, -1.0, 1.0);
    float t = smoothstep(-0.12, 0.65, h);
    vec3 col = mix(uHorizon, uZenith, t);

    float sunDot = max(dot(vDir, uSunDir), 0.0);
    float glow = pow(sunDot, 5.0) * uGlowStrength;
    col += uGlow * glow;

    float lowGlow = pow(max(1.0 - abs(h) * 3.2, 0.0), 2.0) * uGlowStrength * 0.35;
    col += uGlow * lowGlow;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function SkyDome({
  paletteRef,
  sunDirRef,
  onBackgroundClick,
}: {
  paletteRef: React.MutableRefObject<SkyPalette>;
  sunDirRef: React.MutableRefObject<THREE.Vector3>;
  onBackgroundClick?: () => void;
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uZenith: { value: new THREE.Color(0x02030a) },
      uHorizon: { value: new THREE.Color(0x070b16) },
      uGlow: { value: new THREE.Color(0xffcf8a) },
      uGlowStrength: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0, -1, 0) },
    }),
    []
  );

  useFrame(() => {
    const mat = materialRef.current;
    if (!mat) return;
    const p = paletteRef.current;
    (mat.uniforms.uZenith.value as THREE.Color).copy(p.zenith);
    (mat.uniforms.uHorizon.value as THREE.Color).copy(p.horizon);
    (mat.uniforms.uGlow.value as THREE.Color).copy(p.glow);
    mat.uniforms.uGlowStrength.value = p.glowStrength;
    (mat.uniforms.uSunDir.value as THREE.Vector3).copy(sunDirRef.current);
  });

  return (
    <mesh renderOrder={-10} onClick={onBackgroundClick}>
      <sphereGeometry args={[DOME_RADIUS * 1.8, 32, 24]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
      />
    </mesh>
  );
}

import { useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type * as Astronomy from "astronomy-engine";
import type { DeepSkyRecord } from "../../types";
import { eqjUnitVector, computeSceneBasis, applySceneBasisBatch } from "../../astronomy/coords";
import { simClock } from "../../store/simClock";
import { DOME_RADIUS } from "./constants";
import type { SkyPalette } from "./skyPalette";

const vertexShader = /* glsl */ `
  varying float vHeight;
  uniform float uScale;
  void main() {
    vHeight = position.y;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = uScale;
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;
  uniform float uOpacity;
  uniform vec3 uColor;
  void main() {
    float horizonFade = smoothstep(-1.5, 1.5, vHeight);
    if (horizonFade <= 0.001) discard;
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv) * 2.0;
    float ring = smoothstep(1.0, 0.82, d) - smoothstep(0.62, 0.44, d);
    float alpha = clamp(ring, 0.0, 1.0) * uOpacity * horizonFade;
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

export function DeepSkyObjects({
  objects,
  observer,
  visible,
  paletteRef,
  onHover,
  onSelect,
}: {
  objects: DeepSkyRecord[];
  observer: Astronomy.Observer;
  visible: boolean;
  paletteRef: React.MutableRefObject<SkyPalette>;
  onHover: (obj: DeepSkyRecord | null) => void;
  onSelect: (obj: DeepSkyRecord) => void;
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const lastMs = useRef(-1);

  const { geometry, eqj } = useMemo(() => {
    const n = objects.length;
    const eqjArr = new Float32Array(n * 3);
    const positions = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const [ex, ey, ez] = eqjUnitVector(objects[i].ra, objects[i].dec);
      eqjArr[i * 3] = ex;
      eqjArr[i * 3 + 1] = ey;
      eqjArr[i * 3 + 2] = ez;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), DOME_RADIUS * 1.1);
    return { geometry: geo, eqj: eqjArr };
  }, [objects]);

  useFrame(() => {
    const ms = simClock.getMs();
    if (ms !== lastMs.current) {
      lastMs.current = ms;
      const basis = computeSceneBasis(new Date(ms), observer);
      const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
      applySceneBasisBatch(basis, eqj, posAttr.array as Float32Array, DOME_RADIUS);
      posAttr.needsUpdate = true;
    }
    if (materialRef.current) {
      materialRef.current.uniforms.uOpacity.value = visible ? Math.max(paletteRef.current.starOpacity, 0.5) : 0;
    }
  });

  // three.js raycasting ignores fragment-shader discards, so a point hidden below the
  // horizon (or while the whole layer is toggled off) can still be hit-tested — guard explicitly.
  const isPickable = (idx: number) => {
    if (!visible) return false;
    const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
    return posAttr.getY(idx) > 0;
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    const idx = e.index ?? -1;
    if (idx < 0 || !isPickable(idx)) return;
    e.stopPropagation();
    onSelect(objects[idx]);
  };
  const handleMove = (e: ThreeEvent<PointerEvent>) => {
    if (!visible) return;
    const idx = e.index != null && isPickable(e.index) ? e.index : -1;
    e.stopPropagation();
    onHover(idx >= 0 ? objects[idx] : null);
  };
  const handleOut = () => onHover(null);

  return (
    <points
      geometry={geometry}
      visible={visible}
      onClick={handleClick}
      onPointerMove={handleMove}
      onPointerOut={handleOut}
      raycast={raycastWithThreshold}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{ uScale: { value: 14 }, uOpacity: { value: 0 }, uColor: { value: new THREE.Color(0x8fd6c4) } }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function raycastWithThreshold(
  this: THREE.Points,
  raycaster: THREE.Raycaster,
  intersects: THREE.Intersection[]
) {
  const prev = raycaster.params.Points?.threshold;
  raycaster.params.Points = { threshold: DOME_RADIUS * 0.015 };
  THREE.Points.prototype.raycast.call(this, raycaster, intersects);
  if (raycaster.params.Points) raycaster.params.Points.threshold = prev ?? 1;
}

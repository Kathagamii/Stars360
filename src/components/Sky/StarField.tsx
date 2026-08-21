import { useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type * as Astronomy from "astronomy-engine";
import type { StarRecord } from "../../types";
import { eqjUnitVector, computeSceneBasis, applySceneBasisBatch } from "../../astronomy/coords";
import { colorFromBV, starRenderSize } from "../../utils/starColor";
import { simClock } from "../../store/simClock";
import { DOME_RADIUS } from "./constants";
import type { SkyPalette } from "./skyPalette";

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vHeight;
  uniform float uScale;
  uniform float uBoost;
  void main() {
    vColor = aColor;
    vHeight = position.y;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize * uBoost * (uScale / -mvPosition.z);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vHeight;
  uniform float uOpacity;
  void main() {
    float horizonFade = smoothstep(-1.5, 1.5, vHeight);
    if (horizonFade <= 0.001) discard;
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv) * 2.0;
    float core = smoothstep(1.0, 0.0, d);
    float alpha = pow(core, 1.7) * uOpacity * horizonFade;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

export function StarField({
  stars,
  observer,
  paletteRef,
  onHover,
  onSelect,
}: {
  stars: StarRecord[];
  observer: Astronomy.Observer;
  paletteRef: React.MutableRefObject<SkyPalette>;
  onHover: (star: StarRecord | null) => void;
  onSelect: (star: StarRecord) => void;
}) {
  const { size } = useThree();
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const lastMs = useRef<number>(-1);
  const hoveredIndex = useRef<number>(-1);

  const { geometry, eqj } = useMemo(() => {
    const n = stars.length;
    const eqjArr = new Float32Array(n * 3);
    const positions = new Float32Array(n * 3);
    const colors = new Float32Array(n * 3);
    const sizes = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const s = stars[i];
      const [ex, ey, ez] = eqjUnitVector(s.ra, s.dec);
      eqjArr[i * 3] = ex;
      eqjArr[i * 3 + 1] = ey;
      eqjArr[i * 3 + 2] = ez;
      const [r, g, b] = colorFromBV(s.bv);
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
      sizes[i] = starRenderSize(s.mag);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), DOME_RADIUS * 1.1);

    return { geometry: geo, eqj: eqjArr };
  }, [stars]);

  useFrame((state) => {
    const ms = simClock.getMs();
    if (ms !== lastMs.current) {
      lastMs.current = ms;
      const basis = computeSceneBasis(new Date(ms), observer);
      const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
      applySceneBasisBatch(basis, eqj, posAttr.array as Float32Array, DOME_RADIUS);
      posAttr.needsUpdate = true;
    }
    if (materialRef.current) {
      const cam = state.camera as THREE.PerspectiveCamera;
      const scale = (size.height * 0.5) / Math.tan((cam.fov * Math.PI) / 360);
      materialRef.current.uniforms.uScale.value = scale;
      materialRef.current.uniforms.uOpacity.value = paletteRef.current.starOpacity;
    }
  });

  const isAboveHorizon = (idx: number) => {
    const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
    return posAttr.getY(idx) > 0;
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const idx = e.index != null && isAboveHorizon(e.index) ? e.index : -1;
    if (idx !== hoveredIndex.current) {
      hoveredIndex.current = idx;
      onHover(idx >= 0 ? stars[idx] : null);
    }
  };
  const handlePointerOut = () => {
    hoveredIndex.current = -1;
    onHover(null);
  };
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const idx = e.index ?? -1;
    if (idx >= 0 && isAboveHorizon(idx)) onSelect(stars[idx]);
  };

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
      raycast={raycastWithThreshold}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{ uScale: { value: 300 }, uOpacity: { value: 1 }, uBoost: { value: 1 } }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Slightly larger pick threshold than the default so small stars stay clickable.
function raycastWithThreshold(
  this: THREE.Points,
  raycaster: THREE.Raycaster,
  intersects: THREE.Intersection[]
) {
  const prev = raycaster.params.Points?.threshold;
  raycaster.params.Points = { threshold: DOME_RADIUS * 0.012 };
  THREE.Points.prototype.raycast.call(this, raycaster, intersects);
  if (raycaster.params.Points) raycaster.params.Points.threshold = prev ?? 1;
}

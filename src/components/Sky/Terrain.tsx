import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DOME_RADIUS } from "./constants";
import { horizontalToVector3 } from "../../astronomy/coords";
import { buildTerrainConfig } from "../../utils/terrain";
import type { SkyPalette } from "./skyPalette";

const RADIUS = DOME_RADIUS * 0.999;
const RIDGE_STEPS = 360;
const FLOOR_DEG = -8;

function buildRidgeGeometry(heightFn: (az: number) => number): THREE.BufferGeometry {
  const positions = new Float32Array((RIDGE_STEPS + 1) * 2 * 3);
  for (let i = 0; i <= RIDGE_STEPS; i++) {
    const az = (i / RIDGE_STEPS) * 360;
    const bottom = horizontalToVector3(FLOOR_DEG, az, RADIUS);
    const top = horizontalToVector3(heightFn(az), az, RADIUS);
    const o = i * 6;
    positions[o] = bottom[0];
    positions[o + 1] = bottom[1];
    positions[o + 2] = bottom[2];
    positions[o + 3] = top[0];
    positions[o + 4] = top[1];
    positions[o + 5] = top[2];
  }
  const indices = new Uint16Array(RIDGE_STEPS * 6);
  let k = 0;
  for (let i = 0; i < RIDGE_STEPS; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    indices[k++] = a; indices[k++] = c; indices[k++] = b;
    indices[k++] = b; indices[k++] = c; indices[k++] = d;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  return geo;
}

function buildTreeGeometry(trees: { az0: number; az1: number; height: number }[]): THREE.BufferGeometry {
  const positions = new Float32Array(trees.length * 3 * 3);
  trees.forEach((t, i) => {
    const bl = horizontalToVector3(FLOOR_DEG * 0.25, t.az0, RADIUS);
    const br = horizontalToVector3(FLOOR_DEG * 0.25, t.az1, RADIUS);
    const apex = horizontalToVector3(t.height, (t.az0 + t.az1) / 2, RADIUS);
    const o = i * 9;
    positions[o] = bl[0]; positions[o + 1] = bl[1]; positions[o + 2] = bl[2];
    positions[o + 3] = br[0]; positions[o + 4] = br[1]; positions[o + 5] = br[2];
    positions[o + 6] = apex[0]; positions[o + 7] = apex[1]; positions[o + 8] = apex[2];
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geo;
}

/**
 * Foreground horizon silhouette (mountain ridge + treeline), shaped from the
 * observer's coordinates. Painted last (high renderOrder, depth test off) so
 * it always occludes stars/planets/labels behind it, like real terrain would.
 */
export function Terrain({
  lat,
  lon,
  paletteRef,
  onBackgroundClick,
}: {
  lat: number;
  lon: number;
  paletteRef: React.MutableRefObject<SkyPalette>;
  onBackgroundClick?: () => void;
}) {
  const mountainMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const treeMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const config = useMemo(() => buildTerrainConfig(lat, lon), [lat, lon]);
  const ridgeGeometry = useMemo(() => buildRidgeGeometry(config.mountainHeight), [config]);
  const treeGeometry = useMemo(
    () => (config.trees.length ? buildTreeGeometry(config.trees) : null),
    [config]
  );

  useFrame(() => {
    const p = paletteRef.current;
    if (mountainMatRef.current) {
      const c = mountainMatRef.current.color.copy(p.horizon).multiplyScalar(0.2).offsetHSL(config.hueDelta, config.satDelta, 0.02);
      if (p.glowStrength > 0.05) c.lerp(p.glow, Math.min(p.glowStrength * 0.3, 0.28));
    }
    if (treeMatRef.current) {
      treeMatRef.current.color.copy(p.horizon).multiplyScalar(0.09).offsetHSL(config.hueDelta * 0.6, config.satDelta * 0.5, -0.01);
    }
  });

  return (
    <group renderOrder={8}>
      <mesh geometry={ridgeGeometry} renderOrder={8} onClick={onBackgroundClick}>
        <meshBasicMaterial ref={mountainMatRef} color={0x0a0d18} side={THREE.DoubleSide} depthWrite={false} depthTest={false} />
      </mesh>
      {treeGeometry && (
        <mesh geometry={treeGeometry} renderOrder={9} onClick={onBackgroundClick}>
          <meshBasicMaterial ref={treeMatRef} color={0x050708} side={THREE.DoubleSide} depthWrite={false} depthTest={false} />
        </mesh>
      )}
    </group>
  );
}

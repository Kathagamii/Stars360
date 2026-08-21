import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type * as Astronomy from "astronomy-engine";
import type { ConstellationRecord } from "../../types";
import { eqjUnitVector, computeSceneBasis, applySceneBasisBatch } from "../../astronomy/coords";
import { simClock } from "../../store/simClock";
import { makeTextSprite } from "./textSprite";
import { DOME_RADIUS } from "./constants";
import type { SkyPalette } from "./skyPalette";

export function ConstellationLines({
  constellations,
  observer,
  showLines,
  showLabels,
  selectedId,
  paletteRef,
  onSelect,
}: {
  constellations: ConstellationRecord[];
  observer: Astronomy.Observer;
  showLines: boolean;
  showLabels: boolean;
  selectedId: string | null;
  paletteRef: React.MutableRefObject<SkyPalette>;
  onSelect: (id: string) => void;
}) {
  const lastMs = useRef(-1);
  const lineRef = useRef<THREE.LineSegments>(null);
  const materialRef = useRef<THREE.LineBasicMaterial>(null);
  const labelsGroupRef = useRef<THREE.Group>(null);

  const { geometry, eqj, centersEqj } = useMemo(() => {
    let vertexCount = 0;
    for (const c of constellations) {
      for (const seg of c.lines) vertexCount += Math.max(0, (seg.length - 1) * 2);
    }
    const eqjArr = new Float32Array(vertexCount * 3);
    const positions = new Float32Array(vertexCount * 3);
    let w = 0;
    for (const c of constellations) {
      for (const seg of c.lines) {
        for (let i = 0; i < seg.length - 1; i++) {
          for (const [ra, dec] of [seg[i], seg[i + 1]]) {
            const [ex, ey, ez] = eqjUnitVector(ra, dec);
            eqjArr[w * 3] = ex;
            eqjArr[w * 3 + 1] = ey;
            eqjArr[w * 3 + 2] = ez;
            w++;
          }
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const centers = new Float32Array(constellations.length * 3);
    constellations.forEach((c, i) => {
      const [ex, ey, ez] = eqjUnitVector(c.center.ra, c.center.dec);
      centers[i * 3] = ex;
      centers[i * 3 + 1] = ey;
      centers[i * 3 + 2] = ez;
    });

    return { geometry: geo, eqj: eqjArr, centersEqj: centers };
  }, [constellations]);

  const labels = useMemo(() => {
    return constellations.map((c) => {
      const sprite = makeTextSprite(c.ru, { color: "#aebbe0", fontSize: 40, weight: "500", worldSize: 3.2 });
      sprite.userData.conId = c.id;
      sprite.userData.baseScale = [sprite.scale.x, sprite.scale.y];
      sprite.renderOrder = 5;
      return sprite;
    });
  }, [constellations]);

  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.opacity = 0.55 * Math.max(paletteRef.current.starOpacity, 0.12);
    }
    const ms = simClock.getMs();
    if (ms !== lastMs.current) {
      lastMs.current = ms;
      const basis = computeSceneBasis(new Date(ms), observer);
      const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
      applySceneBasisBatch(basis, eqj, posAttr.array as Float32Array, DOME_RADIUS);
      posAttr.needsUpdate = true;

      const labelRadius = DOME_RADIUS * 0.98;
      const centerPositions = new Float32Array(centersEqj.length);
      applySceneBasisBatch(basis, centersEqj, centerPositions, labelRadius);
      labels.forEach((sprite, i) => {
        const y = centerPositions[i * 3 + 1];
        sprite.visible = showLabels && y > -2;
        if (sprite.visible) {
          sprite.position.set(centerPositions[i * 3], y, centerPositions[i * 3 + 2]);
          const isSelected = constellations[i].id === selectedId;
          const base = sprite.userData.baseScale as [number, number];
          const boost = isSelected ? 1.35 : 1;
          sprite.scale.set(base[0] * boost, base[1] * boost, 1);
        }
      });
    }
  });

  useEffect(() => {
    if (lineRef.current) lineRef.current.visible = showLines;
  }, [showLines]);

  // three.js raycasting ignores `object.visible`, so a sprite hidden via the per-frame
  // visibility toggle above can still be hit-tested — guard clicks explicitly.
  const handleLabelClick = (id: string, sprite: THREE.Sprite) => (e: ThreeEvent<MouseEvent>) => {
    if (!sprite.visible) return;
    e.stopPropagation();
    onSelect(id);
  };

  return (
    <group>
      <lineSegments ref={lineRef} geometry={geometry} visible={showLines}>
        <lineBasicMaterial ref={materialRef} color={0x6f86c9} transparent opacity={0.55} />
      </lineSegments>
      <group ref={labelsGroupRef}>
        {showLabels &&
          labels.map((sprite, i) => (
            <primitive
              key={`${constellations[i].id}-${i}`}
              object={sprite}
              onClick={handleLabelClick(constellations[i].id, sprite)}
            />
          ))}
      </group>
    </group>
  );
}

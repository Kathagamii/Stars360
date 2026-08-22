import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { GeoLocation, SatelliteRecord, SelectedObject } from "../../types";
import { createSatRec, propagateSatellite } from "../../astronomy/satellites";
import { horizontalToVector3 } from "../../astronomy/coords";
import { DOME_RADIUS } from "./constants";
import { simClock } from "../../store/simClock";

function makeDotTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.4, "rgba(206,232,255,0.9)");
  grad.addColorStop(1, "rgba(206,232,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function phaseOf(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

export function Satellites({
  satellites,
  location,
  visible,
  onHover,
  onSelect,
}: {
  satellites: SatelliteRecord[];
  location: GeoLocation;
  visible: boolean;
  onHover: (label: string | null) => void;
  onSelect: (obj: SelectedObject) => void;
}) {
  const dotTexture = useMemo(() => makeDotTexture(), []);
  useEffect(() => () => dotTexture.dispose(), [dotTexture]);

  const entries = useMemo(
    () =>
      satellites.map((record) => ({
        record,
        satrec: createSatRec(record.line1, record.line2),
        phase: phaseOf(record.key) * Math.PI * 2,
      })),
    [satellites]
  );

  const spriteRefs = useRef<Record<string, THREE.Sprite | null>>({});

  useFrame(({ clock }) => {
    if (!visible) return;
    const date = new Date(simClock.getMs());
    for (const { record, satrec, phase } of entries) {
      const sprite = spriteRefs.current[record.key];
      if (!sprite) continue;
      const pos = propagateSatellite(satrec, date, location);
      const show = !!pos && pos.altitude > 0;
      sprite.visible = show;
      if (show && pos) {
        const p = horizontalToVector3(pos.altitude, pos.azimuth, DOME_RADIUS * 0.85);
        sprite.position.set(...p);
        const pulse = 2.3 + Math.sin(clock.elapsedTime * 2.4 + phase) * 0.35;
        sprite.scale.set(pulse, pulse, 1);
      }
    }
  });

  return (
    <group visible={visible}>
      {entries.map(({ record }) => (
        <sprite
          key={record.key}
          ref={(el) => {
            spriteRefs.current[record.key] = el;
          }}
          scale={[2.3, 2.3, 1]}
          visible={false}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            if (!visible || !spriteRefs.current[record.key]?.visible) return;
            e.stopPropagation();
            onSelect({ kind: "satellite", id: record.key });
          }}
          onPointerOver={(e: ThreeEvent<PointerEvent>) => {
            if (!visible || !spriteRefs.current[record.key]?.visible) return;
            e.stopPropagation();
            onHover(record.name);
          }}
          onPointerOut={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            onHover(null);
          }}
        >
          <spriteMaterial map={dotTexture} color={0xdff3ff} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}
    </group>
  );
}

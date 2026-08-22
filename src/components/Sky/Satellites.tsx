import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { GeoLocation, SatelliteBearing, SatelliteRecord, SelectedObject } from "../../types";
import { createSatRec, propagateSatellite } from "../../astronomy/satellites";
import { horizontalToVector3 } from "../../astronomy/coords";
import { makeTextSprite } from "./textSprite";
import { DOME_RADIUS } from "./constants";
import { simClock } from "../../store/simClock";

const RADIUS = DOME_RADIUS * 0.85;
const REPORT_INTERVAL_S = 0.3;
const HIGHLIGHT_COLOR = "#6ee7b7";

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

/** A soft ring around the dot, so a satellite reads as a highlighted "locked on" marker, not just a faint point. */
function makeRingTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.strokeStyle = HIGHLIGHT_COLOR;
  ctx.lineWidth = 5;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2);
  ctx.stroke();
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
  onBearings,
}: {
  satellites: SatelliteRecord[];
  location: GeoLocation;
  visible: boolean;
  onHover: (label: string | null) => void;
  onSelect: (obj: SelectedObject) => void;
  onBearings?: (bearings: SatelliteBearing[]) => void;
}) {
  const dotTexture = useMemo(() => makeDotTexture(), []);
  const ringTexture = useMemo(() => makeRingTexture(), []);
  useEffect(() => () => dotTexture.dispose(), [dotTexture]);
  useEffect(() => () => ringTexture.dispose(), [ringTexture]);

  const entries = useMemo(
    () =>
      satellites.map((record) => {
        const label = makeTextSprite(record.name, { color: HIGHLIGHT_COLOR, fontSize: 46, worldSize: 2.6 });
        label.renderOrder = 6;
        return {
          record,
          satrec: createSatRec(record.line1, record.line2),
          phase: phaseOf(record.key) * Math.PI * 2,
          label,
        };
      }),
    [satellites]
  );
  useEffect(
    () => () => entries.forEach((e) => (e.label.material.map as THREE.Texture | null)?.dispose()),
    [entries]
  );

  const spriteRefs = useRef<Record<string, THREE.Sprite | null>>({});
  const ringRefs = useRef<Record<string, THREE.Sprite | null>>({});
  const labelGroupRef = useRef<THREE.Group>(null);
  const lastReportRef = useRef(0);

  useEffect(() => {
    const group = labelGroupRef.current;
    if (!group) return;
    entries.forEach((e) => group.add(e.label));
    return () => {
      entries.forEach((e) => group.remove(e.label));
    };
  }, [entries]);

  useFrame(({ clock }) => {
    if (!visible) return;
    const date = new Date(simClock.getMs());
    const shouldReport = !!onBearings && clock.elapsedTime - lastReportRef.current > REPORT_INTERVAL_S;
    const report: SatelliteBearing[] = [];

    for (const { record, satrec, phase, label } of entries) {
      const sprite = spriteRefs.current[record.key];
      const ring = ringRefs.current[record.key];
      const pos = propagateSatellite(satrec, date, location);
      const show = !!pos && pos.altitude > 0;

      if (sprite) sprite.visible = show;
      if (ring) ring.visible = show;
      label.visible = show;

      if (show && pos) {
        const p = horizontalToVector3(pos.altitude, pos.azimuth, RADIUS);
        sprite?.position.set(...p);
        ring?.position.set(...p);
        const pulse = 2.3 + Math.sin(clock.elapsedTime * 2.4 + phase) * 0.35;
        sprite?.scale.set(pulse, pulse, 1);
        const ringPulse = 4.4 + Math.sin(clock.elapsedTime * 1.6 + phase) * 0.7;
        ring?.scale.set(ringPulse, ringPulse, 1);
        const lp = horizontalToVector3(pos.altitude + 1.8, pos.azimuth, RADIUS);
        label.position.set(...lp);
        if (shouldReport) report.push({ key: record.key, name: record.name, azimuth: pos.azimuth, altitude: pos.altitude });
      }
    }

    if (shouldReport) {
      lastReportRef.current = clock.elapsedTime;
      onBearings!(report);
    }
  });

  return (
    <group visible={visible}>
      <group ref={labelGroupRef} />
      {entries.map(({ record }) => (
        <group key={record.key}>
          <sprite
            ref={(el) => {
              ringRefs.current[record.key] = el;
            }}
            scale={[4.4, 4.4, 1]}
            visible={false}
          >
            <spriteMaterial map={ringTexture} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
          <sprite
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
        </group>
      ))}
    </group>
  );
}

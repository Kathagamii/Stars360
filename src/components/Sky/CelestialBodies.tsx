import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import * as Astronomy from "astronomy-engine";
import { getBodyPosition, getMoonInfo, PLANET_BODIES } from "../../astronomy/engine";
import { horizontalToVector3 } from "../../astronomy/coords";
import { PLANET_INFO } from "../../data/planetInfo";
import { makeMoonTexture } from "./moonTexture";
import { DOME_RADIUS } from "./constants";
import { simClock } from "../../store/simClock";
import { getSkyPalette, type SkyPalette } from "./skyPalette";
import type { SelectedObject } from "../../types";

function makeGlowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,244,214,0.85)");
  grad.addColorStop(1, "rgba(255,244,214,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

export function CelestialBodies({
  observer,
  paletteRef,
  sunDirRef,
  onHover,
  onSelect,
}: {
  observer: Astronomy.Observer;
  paletteRef: React.MutableRefObject<SkyPalette>;
  sunDirRef: React.MutableRefObject<THREE.Vector3>;
  onHover: (label: string | null) => void;
  onSelect: (obj: SelectedObject) => void;
}) {
  const sunRef = useRef<THREE.Sprite>(null);
  const sunGlowRef = useRef<THREE.Sprite>(null);
  const moonRef = useRef<THREE.Sprite>(null);
  const planetRefs = useRef<Record<string, THREE.Sprite | null>>({});
  const lastMoonBucket = useRef<number>(-1);
  const glowTexture = useMemo(() => makeGlowTexture(), []);

  useEffect(() => () => glowTexture.dispose(), [glowTexture]);

  useFrame(() => {
    const date = new Date(simClock.getMs());

    // Sun
    const sunPos = getBodyPosition(Astronomy.Body.Sun, date, observer);
    paletteRef.current = getSkyPalette(sunPos.altitude);
    const [sx, sy, sz] = horizontalToVector3(sunPos.altitude, sunPos.azimuth, 1);
    sunDirRef.current.set(sx, sy, sz);
    if (sunRef.current && sunGlowRef.current) {
      const visible = sunPos.altitude > -3;
      sunRef.current.visible = visible;
      sunGlowRef.current.visible = visible;
      if (visible) {
        const p = horizontalToVector3(sunPos.altitude, sunPos.azimuth, DOME_RADIUS * 0.9);
        sunRef.current.position.set(...p);
        sunGlowRef.current.position.set(...p);
      }
    }

    // Moon
    if (moonRef.current) {
      const moonPos = getBodyPosition(Astronomy.Body.Moon, date, observer);
      moonRef.current.visible = moonPos.altitude > -2;
      if (moonRef.current.visible) {
        const p = horizontalToVector3(moonPos.altitude, moonPos.azimuth, DOME_RADIUS * 0.92);
        moonRef.current.position.set(...p);
      }
      const info = getMoonInfo(date);
      const bucket = Math.round(info.phaseFraction * 40) * 1000 + (info.phaseAngleDeg < 180 ? 1 : 0);
      if (bucket !== lastMoonBucket.current) {
        lastMoonBucket.current = bucket;
        const mat = moonRef.current.material as THREE.SpriteMaterial;
        mat.map?.dispose();
        mat.map = makeMoonTexture(info.phaseFraction, info.phaseAngleDeg < 180);
        mat.needsUpdate = true;
      }
    }

    // Planets
    for (const name of PLANET_BODIES) {
      const sprite = planetRefs.current[name];
      if (!sprite) continue;
      const body = Astronomy.Body[name];
      const pos = getBodyPosition(body, date, observer);
      sprite.visible = pos.altitude > 0;
      if (sprite.visible) {
        const p = horizontalToVector3(pos.altitude, pos.azimuth, DOME_RADIUS * 0.95);
        sprite.position.set(...p);
        const scale = THREE.MathUtils.clamp(2.6 - pos.distanceAU * 0.05, 1.1, 3);
        sprite.scale.set(scale, scale, 1);
      }
    }
  });

  const handlePointerOver = (label: string, getSprite?: () => THREE.Sprite | null) => (
    e: ThreeEvent<PointerEvent>
  ) => {
    if (getSprite && !getSprite()?.visible) return;
    e.stopPropagation();
    onHover(label);
  };
  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onHover(null);
  };

  return (
    <group>
      <sprite
        ref={sunGlowRef}
        scale={[16, 16, 1]}
        onClick={(e) => {
          if (!sunGlowRef.current?.visible) return;
          e.stopPropagation();
          onSelect({ kind: "sun", id: "sun" });
        }}
        onPointerOver={handlePointerOver("Солнце", () => sunGlowRef.current)}
        onPointerOut={handlePointerOut}
      >
        <spriteMaterial map={glowTexture} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <sprite ref={sunRef} scale={[4.5, 4.5, 1]}>
        <spriteMaterial map={glowTexture} transparent depthWrite={false} blending={THREE.AdditiveBlending} color={0xfff3d0} />
      </sprite>

      <sprite
        ref={moonRef}
        scale={[5.5, 5.5, 1]}
        onClick={(e) => {
          if (!moonRef.current?.visible) return;
          e.stopPropagation();
          onSelect({ kind: "moon", id: "moon" });
        }}
        onPointerOver={handlePointerOver("Луна", () => moonRef.current)}
        onPointerOut={handlePointerOut}
      >
        <spriteMaterial transparent depthWrite={false} />
      </sprite>

      {PLANET_BODIES.map((name) => (
        <sprite
          key={name}
          ref={(el) => {
            planetRefs.current[name] = el;
          }}
          scale={[2, 2, 1]}
          onClick={(e) => {
            if (!planetRefs.current[name]?.visible) return;
            e.stopPropagation();
            onSelect({ kind: "planet", id: `planet-${name}` });
          }}
          onPointerOver={handlePointerOver(PLANET_INFO[name].ru, () => planetRefs.current[name])}
          onPointerOut={handlePointerOut}
        >
          <spriteMaterial
            map={glowTexture}
            color={PLANET_INFO[name].color}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      ))}
    </group>
  );
}

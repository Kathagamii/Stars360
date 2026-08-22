import { useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import type * as Astronomy from "astronomy-engine";
import type { DeepSkyRecord, GeoLocation, StarRecord } from "../../types";
import { makeObserver } from "../../astronomy/engine";
import { LookControls, createLookState } from "./LookControls";
import { Ticker } from "./Ticker";
import { SkyDome } from "./SkyDome";
import { HorizonGround } from "./HorizonGround";
import { Terrain } from "./Terrain";
import { StarField } from "./StarField";
import { ConstellationLines } from "./ConstellationLines";
import { DeepSkyObjects } from "./DeepSkyObjects";
import { CelestialBodies } from "./CelestialBodies";
import { getSkyPalette } from "./skyPalette";
import STARS from "../../data/stars.json";
import CONSTELLATIONS from "../../data/constellations.json";
import DEEPSKY from "../../data/deepsky.json";
import type { ConstellationRecord, SelectedObject } from "../../types";

const stars = STARS as StarRecord[];
const constellations = CONSTELLATIONS as ConstellationRecord[];
const deepsky = DEEPSKY as DeepSkyRecord[];

export interface SkyCanvasHandle {
  lookState: ReturnType<typeof createLookState>;
}

export function SkyCanvas({
  location,
  viewMode,
  showConstellationLines,
  showTerrain,
  selectedConstellationId,
  onHoverLabel,
  onSelectStar,
  onSelectDeepSky,
  onSelectObject,
  onSelectConstellation,
  onClearSelection,
  lookStateRef,
}: {
  location: GeoLocation;
  viewMode: "sky" | "constellations" | "objects";
  showConstellationLines: boolean;
  showTerrain: boolean;
  selectedConstellationId: string | null;
  onHoverLabel: (label: string | null) => void;
  onSelectStar: (star: StarRecord) => void;
  onSelectDeepSky: (obj: DeepSkyRecord) => void;
  onSelectObject: (obj: SelectedObject) => void;
  onSelectConstellation: (id: string) => void;
  onClearSelection: () => void;
  lookStateRef: React.MutableRefObject<ReturnType<typeof createLookState>>;
}) {
  const observer = useMemo<Astronomy.Observer>(() => makeObserver(location), [location]);
  const paletteRef = useRef(getSkyPalette(0));
  const sunDirRef = useRef(new THREE.Vector3(0, -1, 0));

  const showConstellations = viewMode === "constellations";
  const showDeepSky = viewMode === "objects";

  return (
    <Canvas
      gl={{ antialias: true, powerPreference: "high-performance" }}
      dpr={[1, 2]}
      camera={{ position: [0, 0, 0], fov: 70, near: 0.1, far: 500 }}
      onPointerMissed={onClearSelection}
    >
      <LookControls stateRef={lookStateRef} />
      <Ticker />
      <SkyDome paletteRef={paletteRef} sunDirRef={sunDirRef} onBackgroundClick={onClearSelection} />
      <HorizonGround paletteRef={paletteRef} onBackgroundClick={onClearSelection} />
      {showTerrain && (
        <Terrain lat={location.lat} lon={location.lon} paletteRef={paletteRef} onBackgroundClick={onClearSelection} />
      )}
      <StarField stars={stars} observer={observer} paletteRef={paletteRef} onHover={(s) => onHoverLabel(s ? starLabel(s) : null)} onSelect={onSelectStar} />
      <ConstellationLines
        constellations={constellations}
        observer={observer}
        showLines={showConstellations && showConstellationLines}
        showLabels={showConstellations}
        selectedId={selectedConstellationId}
        paletteRef={paletteRef}
        onSelect={onSelectConstellation}
      />
      <DeepSkyObjects
        objects={deepsky}
        observer={observer}
        visible={showDeepSky}
        paletteRef={paletteRef}
        onHover={(o) => onHoverLabel(o ? o.altName ?? o.name : null)}
        onSelect={onSelectDeepSky}
      />
      <CelestialBodies
        observer={observer}
        paletteRef={paletteRef}
        sunDirRef={sunDirRef}
        onHover={onHoverLabel}
        onSelect={onSelectObject}
      />
    </Canvas>
  );
}

function starLabel(s: StarRecord): string {
  if (s.name) return s.name;
  if (s.bayer && s.con) return `${s.bayer} ${s.con}`;
  return `HIP ${s.hip}`;
}

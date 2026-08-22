import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "../../store/appStore";
import { makeObserver } from "../../astronomy/engine";
import { SkyCanvas } from "./SkyCanvas";
import { createLookState } from "./LookControls";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { ObjectInfoPanel } from "./ObjectInfoPanel";
import { ConstellationInfoPanel } from "./ConstellationInfoPanel";
import { TimeController } from "./TimeController";
import { Search } from "./Search";
import { SatelliteBearings } from "./SatelliteBearings";
import { ErrorBanner } from "../ErrorBanner";
import { SkyHint } from "./SkyHint";
import STARS from "../../data/stars.json";
import CONSTELLATIONS from "../../data/constellations.json";
import DEEPSKY from "../../data/deepsky.json";
import SATELLITES from "../../data/satellites.json";
import type { ConstellationRecord, DeepSkyRecord, SatelliteBearing, SatelliteRecord, StarRecord } from "../../types";

const stars = STARS as StarRecord[];
const constellations = CONSTELLATIONS as ConstellationRecord[];
const deepsky = DEEPSKY as DeepSkyRecord[];
const satellites = SATELLITES as SatelliteRecord[];

export function SkyScreen() {
  const location = useAppStore((s) => s.location);
  const backToMap = useAppStore((s) => s.backToMap);
  const viewMode = useAppStore((s) => s.viewMode);
  const showConstellationLines = useAppStore((s) => s.showConstellationLines);
  const showTerrain = useAppStore((s) => s.showTerrain);
  const selectedConstellationId = useAppStore((s) => s.selectedConstellationId);
  const select = useAppStore((s) => s.select);
  const selectConstellation = useAppStore((s) => s.selectConstellation);
  const searchOpen = useAppStore((s) => s.searchOpen);
  const setSearchOpen = useAppStore((s) => s.setSearchOpen);
  const timePanelOpen = useAppStore((s) => s.timePanelOpen);
  const setTimePanelOpen = useAppStore((s) => s.setTimePanelOpen);
  const setError = useAppStore((s) => s.setError);

  const [hoverLabel, setHoverLabel] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [satelliteBearings, setSatelliteBearings] = useState<SatelliteBearing[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const lookStateRef = useRef(createLookState());

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => setHoverPos({ x: e.clientX, y: e.clientY });
    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    if (!location) backToMap();
  }, [location, backToMap]);

  const observer = useMemo(() => (location ? makeObserver(location) : null), [location]);

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {
          setError("Полноэкранный режим недоступен в этом браузере.");
        });
      } else {
        document.exitFullscreen?.();
      }
    } catch {
      setError("Полноэкранный режим недоступен в этом браузере.");
    }
  };

  if (!location || !observer) return null;

  return (
    <div ref={containerRef} className="relative h-full w-full select-none">
      <SkyCanvas
        location={location}
        viewMode={viewMode}
        showConstellationLines={showConstellationLines}
        showTerrain={showTerrain}
        selectedConstellationId={selectedConstellationId}
        lookStateRef={lookStateRef}
        onHoverLabel={setHoverLabel}
        onSelectStar={(star) => select({ kind: "star", id: `hip-${star.hip}` })}
        onSelectDeepSky={(obj) => select({ kind: "deepsky", id: obj.id })}
        onSelectObject={select}
        onSelectConstellation={selectConstellation}
        onClearSelection={() => {
          select(null);
          selectConstellation(null);
        }}
        onSatelliteBearings={setSatelliteBearings}
      />

      {viewMode === "satellites" && (
        <SatelliteBearings
          bearings={satelliteBearings}
          lookStateRef={lookStateRef}
          onFocus={(b) => {
            lookStateRef.current.az = b.azimuth;
            lookStateRef.current.alt = Math.max(b.altitude, 4);
            select({ kind: "satellite", id: b.key });
          }}
        />
      )}

      <TopBar onOpenTime={() => setTimePanelOpen(true)} onOpenSearch={() => setSearchOpen(true)} />
      <BottomNav onFullscreen={toggleFullscreen} />

      {hoverLabel && (
        <div
          className="pointer-events-none fixed z-[300] -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-lg bg-space-950/90 px-2.5 py-1 text-xs font-medium text-slate-100 shadow-lg"
          style={{ left: hoverPos.x, top: hoverPos.y }}
        >
          {hoverLabel}
        </div>
      )}

      <SkyHint />
      <ErrorBanner />

      <ObjectInfoPanel stars={stars} deepsky={deepsky} satellites={satellites} observer={observer} location={location} />
      <ConstellationInfoPanel constellations={constellations} stars={stars} deepsky={deepsky} />

      {timePanelOpen && <TimeController onClose={() => setTimePanelOpen(false)} />}
      {searchOpen && (
        <Search
          stars={stars}
          constellations={constellations}
          deepsky={deepsky}
          satellites={satellites}
          observer={observer}
          location={location}
          lookStateRef={lookStateRef}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </div>
  );
}

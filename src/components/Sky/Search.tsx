import { useMemo, useRef, useState } from "react";
import type * as Astronomy from "astronomy-engine";
import type { ConstellationRecord, DeepSkyRecord, GeoLocation, SatelliteRecord, StarRecord } from "../../types";
import { buildSearchIndex, searchObjects, type SearchEntry } from "../../astronomy/search";
import { bodyLikeHorizontal, resolveSelected } from "../../astronomy/selection";
import { useAppStore } from "../../store/appStore";
import { simClock } from "../../store/simClock";
import type { LookState } from "./LookControls";

const KIND_ICON: Record<string, string> = {
  star: "✦",
  planet: "🪐",
  sun: "☀️",
  moon: "🌙",
  deepsky: "🌌",
  constellation: "⭐",
  satellite: "🛰",
};

export function Search({
  stars,
  constellations,
  deepsky,
  satellites,
  observer,
  location,
  lookStateRef,
  onClose,
}: {
  stars: StarRecord[];
  constellations: ConstellationRecord[];
  deepsky: DeepSkyRecord[];
  satellites: SatelliteRecord[];
  observer: Astronomy.Observer;
  location: GeoLocation;
  lookStateRef: React.MutableRefObject<LookState>;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const select = useAppStore((s) => s.select);
  const selectConstellation = useAppStore((s) => s.selectConstellation);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const inputRef = useRef<HTMLInputElement>(null);

  const index = useMemo(
    () => buildSearchIndex(stars, constellations, deepsky, satellites),
    [stars, constellations, deepsky, satellites]
  );
  const results = useMemo(() => searchObjects(index, query), [index, query]);

  const pick = (entry: SearchEntry) => {
    const date = new Date(simClock.getMs());
    let alt = 30;
    let az = 180;

    if (entry.obj.kind === "constellation" && entry.constellationId) {
      const con = constellations.find((c) => c.id === entry.constellationId);
      if (con) {
        const pos = bodyLikeHorizontal(con.center.ra, con.center.dec, observer, date);
        alt = pos.altitude;
        az = pos.azimuth;
      }
      setViewMode("constellations");
      selectConstellation(entry.constellationId);
    } else {
      if (entry.obj.kind === "satellite") setViewMode("satellites");
      const resolved = resolveSelected(entry.obj, stars, deepsky, observer, date, satellites, location);
      if (resolved) {
        alt = resolved.position.altitude;
        az = resolved.position.azimuth;
      }
      select(entry.obj);
    }

    lookStateRef.current.az = az;
    lookStateRef.current.alt = Math.max(alt, 4);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[600] flex flex-col bg-space-950/85 backdrop-blur-md animate-fade-in">
      <div className="flex items-center gap-2 p-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:p-4">
        <div className="glass flex flex-1 items-center gap-2 rounded-full px-4 py-3">
          <span className="text-slate-400">🔍</span>
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sirius, Орион, Марс, МКС…"
            className="w-full bg-transparent text-base text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-100">
              ✕
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="glass shrink-0 rounded-full px-4 py-3 text-sm font-medium text-slate-200 hover:bg-white/10"
        >
          Отмена
        </button>
      </div>

      <div className="mx-3 flex-1 overflow-y-auto scrollbar-thin sm:mx-4">
        {query && results.length === 0 && (
          <div className="mt-8 text-center text-sm text-slate-500">Ничего не найдено</div>
        )}
        <ul className="space-y-1 pb-6">
          {results.map((entry, i) => (
            <li key={`${entry.obj.kind}-${entry.obj.id}-${i}`}>
              <button
                onClick={() => pick(entry)}
                className="glass flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition hover:bg-white/10"
              >
                <span className="text-lg">{KIND_ICON[entry.obj.kind]}</span>
                <span className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-100">{entry.title}</div>
                  <div className="truncate text-xs text-slate-400">{entry.subtitle}</div>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {!query && (
          <div className="mt-8 text-center text-sm text-slate-500">
            Найдите звезду, созвездие, планету или спутник — например «Сириус», «Орион», «Марс» или «МКС»
          </div>
        )}
      </div>
    </div>
  );
}

import { useMemo } from "react";
import type * as Astronomy from "astronomy-engine";
import type { DeepSkyRecord, GeoLocation, SatelliteRecord, StarRecord } from "../../types";
import { useAppStore } from "../../store/appStore";
import { useSimTime } from "../../hooks/useSimTime";
import { resolveSelected } from "../../astronomy/selection";
import { formatAltAz, azimuthCompass } from "../../utils/format";
import { MoonPhaseIcon } from "../MoonPhaseIcon";

const KIND_ICON: Record<string, string> = {
  star: "✦",
  planet: "🪐",
  sun: "☀️",
  moon: "🌙",
  deepsky: "🌌",
  satellite: "🛰",
};

export function ObjectInfoPanel({
  stars,
  deepsky,
  satellites,
  observer,
  location,
}: {
  stars: StarRecord[];
  deepsky: DeepSkyRecord[];
  satellites: SatelliteRecord[];
  observer: Astronomy.Observer;
  location: GeoLocation;
}) {
  const selected = useAppStore((s) => s.selected);
  const select = useAppStore((s) => s.select);
  const time = useSimTime();

  const resolved = useMemo(() => {
    if (!selected) return null;
    return resolveSelected(selected, stars, deepsky, observer, time, satellites, location);
  }, [selected, stars, deepsky, observer, time, satellites, location]);

  if (!selected || !resolved) return null;

  return (
    <div className="animate-slide-up glass-strong pointer-events-auto absolute inset-x-0 bottom-0 z-[400] max-h-[70vh] overflow-y-auto scrollbar-thin rounded-t-2xl px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 shadow-2xl sm:inset-x-auto sm:bottom-4 sm:right-4 sm:top-20 sm:max-h-none sm:w-96 sm:rounded-2xl sm:pb-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
            <span>{KIND_ICON[resolved.kind]}</span>
            {kindLabel(resolved.kind)}
          </div>
          <h2 className="mt-0.5 truncate text-xl font-semibold text-slate-50">{resolved.title}</h2>
          {resolved.subtitle && <div className="text-sm text-slate-400">{resolved.subtitle}</div>}
        </div>
        <button
          onClick={() => select(null)}
          className="shrink-0 rounded-full p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-slate-100"
          aria-label="Закрыть"
        >
          ✕
        </button>
      </div>

      {resolved.kind === "moon" && resolved.extra && (
        <div className="mt-4 flex items-center gap-4 rounded-xl bg-white/5 p-3">
          <MoonPhaseIcon fraction={resolved.extra.moonPhaseFraction} waxing={resolved.extra.waxing} size={56} />
          <div>
            <div className="text-sm font-medium text-slate-100">{resolved.extra.moonPhaseName}</div>
            <div className="text-xs text-slate-400">
              Освещено {Math.round(resolved.extra.moonPhaseFraction * 100)}%
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-xl bg-white/5 p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Положение сейчас</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              resolved.position.visible ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-600/30 text-slate-400"
            }`}
          >
            {resolved.position.visible ? "над горизонтом" : "под горизонтом"}
          </span>
        </div>
        <div className="mt-1.5 flex items-baseline gap-2 text-lg font-semibold tabular-nums text-slate-50">
          {formatAltAz(resolved.position.altitude, resolved.position.azimuth)}
        </div>
        <div className="text-xs text-slate-400">
          высота над горизонтом · азимут {azimuthCompass(resolved.position.azimuth)}
        </div>
      </div>

      <dl className="mt-3 divide-y divide-white/5 text-sm">
        {resolved.rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-slate-400">{row.label}</dt>
            <dd className="truncate text-right font-medium text-slate-100">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function kindLabel(kind: string): string {
  switch (kind) {
    case "star":
      return "Звезда";
    case "planet":
      return "Планета";
    case "sun":
      return "Звезда — Солнце";
    case "moon":
      return "Спутник Земли";
    case "deepsky":
      return "Глубокий космос";
    case "satellite":
      return "Искусственный спутник";
    default:
      return "";
  }
}

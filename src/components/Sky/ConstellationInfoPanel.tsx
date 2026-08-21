import { useMemo } from "react";
import type { ConstellationRecord, DeepSkyRecord, StarRecord } from "../../types";
import { useAppStore } from "../../store/appStore";
import { getConstellationDetails } from "../../astronomy/constellationInfo";
import { formatMagnitude } from "../../utils/format";
import { DEEPSKY_TYPE_LABELS } from "../../types";

export function ConstellationInfoPanel({
  constellations,
  stars,
  deepsky,
}: {
  constellations: ConstellationRecord[];
  stars: StarRecord[];
  deepsky: DeepSkyRecord[];
}) {
  const id = useAppStore((s) => s.selectedConstellationId);
  const selectConstellation = useAppStore((s) => s.selectConstellation);

  const details = useMemo(() => {
    if (!id) return null;
    const con = constellations.find((c) => c.id === id);
    if (!con) return null;
    return getConstellationDetails(con, stars, deepsky);
  }, [id, constellations, stars, deepsky]);

  if (!details) return null;
  const { con } = details;

  return (
    <div className="animate-slide-up glass-strong pointer-events-auto absolute inset-x-0 bottom-0 z-[400] max-h-[75vh] overflow-y-auto scrollbar-thin rounded-t-2xl px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 shadow-2xl sm:inset-x-auto sm:bottom-4 sm:right-4 sm:top-20 sm:max-h-none sm:w-96 sm:rounded-2xl sm:pb-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-slate-400">Созвездие</div>
          <h2 className="mt-0.5 truncate text-xl font-semibold text-slate-50">{con.ru}</h2>
          <div className="text-sm text-slate-400">
            {con.la} · {con.gen}
          </div>
        </div>
        <button
          onClick={() => selectConstellation(null)}
          className="shrink-0 rounded-full p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-slate-100"
          aria-label="Закрыть"
        >
          ✕
        </button>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-slate-200">{details.description}</p>

      <div className="mt-3 rounded-xl bg-white/5 px-3 py-2.5 text-sm text-slate-300">
        🕐 {details.viewingHint}
      </div>

      {details.fact && (
        <div className="mt-3 rounded-xl border border-accent-500/20 bg-accent-500/10 px-3 py-2.5 text-sm text-accent-100">
          💡 {details.fact}
        </div>
      )}

      {details.brightestStars.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Яркие звёзды</div>
          <ul className="space-y-1.5">
            {details.brightestStars.map((s) => (
              <li key={s.hip} className="flex items-center justify-between text-sm">
                <span className="text-slate-200">
                  {s.name ?? (s.bayer ? `${s.bayer} ${con.id}` : `HIP ${s.hip}`)}
                </span>
                <span className="tabular-nums text-slate-400">{formatMagnitude(s.mag)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {details.deepSkyObjects.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            Яркие объекты
          </div>
          <ul className="space-y-1.5">
            {details.deepSkyObjects.map((d) => (
              <li key={d.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-200">
                  {d.altName ?? d.name}{" "}
                  <span className="text-slate-500">· {DEEPSKY_TYPE_LABELS[d.type] ?? d.type}</span>
                </span>
                <span className="tabular-nums text-slate-400">{formatMagnitude(d.mag)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

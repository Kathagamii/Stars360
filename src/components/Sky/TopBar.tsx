import { useMemo } from "react";
import { useAppStore } from "../../store/appStore";
import { useSimTime } from "../../hooks/useSimTime";
import { getTimeZone, formatInZone } from "../../utils/timezone";

export function TopBar({ onOpenTime, onOpenSearch }: { onOpenTime: () => void; onOpenSearch: () => void }) {
  const location = useAppStore((s) => s.location);
  const backToMap = useAppStore((s) => s.backToMap);
  const live = useAppStore((s) => s.live);
  const time = useSimTime();
  const tz = useMemo(() => (location ? getTimeZone(location.lat, location.lon) : "UTC"), [location]);
  const dateLabel = formatInZone(time, tz, { day: "numeric", month: "long" });
  const timeLabel = formatInZone(time, tz, { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[200] flex items-start justify-between gap-2 p-3 sm:p-4">
      <button
        onClick={backToMap}
        className="glass pointer-events-auto flex items-center gap-1.5 rounded-full px-3.5 py-2.5 text-sm font-medium text-slate-100 shadow-lg transition hover:bg-white/10"
        aria-label="Назад к карте"
      >
        ← <span className="hidden sm:inline">Назад</span>
      </button>

      <div className="glass pointer-events-auto flex min-w-0 flex-col items-center gap-0.5 rounded-2xl px-4 py-2 text-center shadow-lg">
        <div className="flex items-center gap-1.5 truncate text-sm font-medium text-slate-100">
          📍 <span className="truncate">{location?.label ?? "—"}</span>
        </div>
        <button onClick={onOpenTime} className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-slate-100">
          <span>{dateLabel}</span>
          <span className="text-slate-500">·</span>
          <span className="tabular-nums">{timeLabel}</span>
          {live && (
            <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" /> live
            </span>
          )}
        </button>
      </div>

      <button
        onClick={onOpenSearch}
        className="glass pointer-events-auto flex items-center gap-1.5 rounded-full px-3.5 py-2.5 text-sm font-medium text-slate-100 shadow-lg transition hover:bg-white/10"
        aria-label="Поиск"
      >
        🔍
      </button>
    </div>
  );
}

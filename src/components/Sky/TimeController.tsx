import { useMemo } from "react";
import { useAppStore } from "../../store/appStore";
import { useSimTime } from "../../hooks/useSimTime";
import { getTimeZone, getZonedParts, zonedWallTimeToUtc, timeZoneAbbrev } from "../../utils/timezone";
import type { TimeSpeed } from "../../types";
import { simClock } from "../../store/simClock";

const SPEEDS: TimeSpeed[] = [1, 10, 100, 1000];

export function TimeController({ onClose }: { onClose: () => void }) {
  const location = useAppStore((s) => s.location);
  const live = useAppStore((s) => s.live);
  const playing = useAppStore((s) => s.playing);
  const speed = useAppStore((s) => s.speed);
  const setLive = useAppStore((s) => s.setLive);
  const setPlaying = useAppStore((s) => s.setPlaying);
  const setSpeed = useAppStore((s) => s.setSpeed);
  const setManualTime = useAppStore((s) => s.setManualTime);
  const resetToNow = useAppStore((s) => s.resetToNow);
  const time = useSimTime();

  const tz = useMemo(() => (location ? getTimeZone(location.lat, location.lon) : "UTC"), [location]);
  const parts = getZonedParts(time, tz);
  const dateValue = `${pad4(parts.year)}-${pad2(parts.month)}-${pad2(parts.day)}`;
  const timeValue = `${pad2(parts.hour)}:${pad2(parts.minute)}`;

  const applyDate = (dateStr: string) => {
    const [y, mo, d] = dateStr.split("-").map(Number);
    if (!y || !mo || !d) return;
    const p = getZonedParts(new Date(simClock.getMs()), tz);
    setManualTime(zonedWallTimeToUtc(y, mo, d, p.hour, p.minute, tz).getTime());
  };
  const applyTime = (timeStr: string) => {
    const [h, mi] = timeStr.split(":").map(Number);
    if (h == null || mi == null) return;
    const p = getZonedParts(new Date(simClock.getMs()), tz);
    setManualTime(zonedWallTimeToUtc(p.year, p.month, p.day, h, mi, tz).getTime());
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className="glass-strong animate-slide-up w-full rounded-t-2xl p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl sm:w-[26rem] sm:rounded-2xl sm:pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-50">Время наблюдения</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-slate-100" aria-label="Закрыть">
            ✕
          </button>
        </div>

        <button
          onClick={() => setLive(!live)}
          className={`mt-4 flex w-full items-center justify-between rounded-xl px-4 py-3 transition ${
            live ? "bg-red-500/15 text-red-200" : "bg-white/5 text-slate-300 hover:bg-white/10"
          }`}
        >
          <span className="flex items-center gap-2 font-medium">
            <span className={`h-2.5 w-2.5 rounded-full ${live ? "animate-pulse bg-red-400" : "bg-slate-500"}`} />
            LIVE — реальное время
          </span>
          <span className="text-xs opacity-70">{live ? "включено" : "выключено"}</span>
        </button>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <label className="block">
            <span className="mb-1 block text-xs text-slate-400">Дата</span>
            <input
              type="date"
              value={dateValue}
              disabled={live}
              onChange={(e) => applyDate(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 disabled:opacity-40"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-400">Время</span>
            <input
              type="time"
              value={timeValue}
              disabled={live}
              onChange={(e) => applyTime(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 disabled:opacity-40"
            />
          </label>
        </div>
        <div className="mt-1.5 text-xs text-slate-500">
          Часовой пояс места наблюдения: {tz} ({timeZoneAbbrev(time, tz)})
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => setPlaying(!playing)}
            disabled={live}
            className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-white/10 disabled:opacity-40"
          >
            {playing ? "⏸ Пауза" : "▶ Ускоренная перемотка"}
          </button>
          <button
            onClick={resetToNow}
            className="rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-space-950 transition hover:bg-accent-400"
          >
            Сейчас
          </button>
        </div>

        <div className="mt-4">
          <span className="mb-1.5 block text-xs text-slate-400">Скорость перемотки</span>
          <div className="grid grid-cols-4 gap-2">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                disabled={live}
                className={`rounded-lg py-2 text-sm font-medium tabular-nums transition disabled:opacity-40 ${
                  speed === s ? "bg-accent-500 text-space-950" : "bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                ×{s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function pad4(n: number) {
  return String(n).padStart(4, "0");
}

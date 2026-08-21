import type { PendingSelection } from "./WorldMap";
import { formatDegrees } from "../../utils/format";

export function SelectionCard({
  selection,
  onConfirm,
  onDismiss,
}: {
  selection: PendingSelection;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="animate-slide-up glass-strong absolute inset-x-0 bottom-0 z-[500] rounded-t-2xl px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 shadow-2xl sm:inset-x-auto sm:bottom-4 sm:left-4 sm:w-96 sm:rounded-2xl sm:pb-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-base font-medium text-slate-50">
            {selection.loadingLabel ? (
              <span className="inline-flex items-center gap-2 text-slate-300">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
                Определяем местоположение…
              </span>
            ) : (
              selection.label ?? "Выбранная точка"
            )}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {formatDegrees(selection.lat, "lat")} · {formatDegrees(selection.lon, "lon")}
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 rounded-full p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-slate-100"
          aria-label="Отмена"
        >
          ✕
        </button>
      </div>
      <button
        onClick={onConfirm}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 py-3 text-sm font-semibold text-space-950 transition hover:bg-accent-400 active:scale-[0.99]"
      >
        🔭 Смотреть небо
      </button>
    </div>
  );
}

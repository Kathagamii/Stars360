import { useAppStore } from "../../store/appStore";
import type { ViewMode } from "../../types";

const TABS: { id: ViewMode; label: string; icon: string }[] = [
  { id: "sky", label: "Небо", icon: "✨" },
  { id: "constellations", label: "Созвездия", icon: "⭐" },
  { id: "objects", label: "Объекты", icon: "🪐" },
];

export function BottomNav({ onFullscreen }: { onFullscreen: () => void }) {
  const viewMode = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const showLines = useAppStore((s) => s.showConstellationLines);
  const toggleLines = useAppStore((s) => s.toggleConstellationLines);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[200] flex flex-col items-center gap-2 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-4">
      {viewMode === "constellations" && (
        <button
          onClick={toggleLines}
          className="glass pointer-events-auto flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium text-slate-200 shadow-lg transition hover:bg-white/10"
        >
          <span className={`h-2 w-2 rounded-full ${showLines ? "bg-accent-400" : "bg-slate-600"}`} />
          Линии созвездий {showLines ? "включены" : "выключены"}
        </button>
      )}

      <div className="glass-strong pointer-events-auto flex items-center gap-1 rounded-full p-1.5 shadow-2xl">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setViewMode(tab.id)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium transition sm:px-5 ${
              viewMode === tab.id
                ? "bg-accent-500 text-space-950"
                : "text-slate-300 hover:bg-white/10 hover:text-slate-100"
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden xs:inline sm:inline">{tab.label}</span>
          </button>
        ))}
        <div className="mx-1 h-6 w-px bg-white/10" />
        <button
          onClick={onFullscreen}
          className="rounded-full px-3 py-2.5 text-slate-300 transition hover:bg-white/10 hover:text-slate-100"
          aria-label="Полноэкранный режим"
        >
          ⛶
        </button>
      </div>
    </div>
  );
}

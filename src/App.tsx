import { Suspense, lazy } from "react";
import { useAppStore } from "./store/appStore";

const WorldMap = lazy(() => import("./components/Map/WorldMap").then((m) => ({ default: m.WorldMap })));
const SkyScreen = lazy(() => import("./components/Sky/SkyScreen").then((m) => ({ default: m.SkyScreen })));

function ScreenLoader() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-space-950">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-accent-400" />
        <span className="text-sm">Загрузка неба…</span>
      </div>
    </div>
  );
}

export default function App() {
  const screen = useAppStore((s) => s.screen);

  return (
    <div className="fixed inset-0 h-full w-full overflow-hidden bg-space-950 text-slate-100">
      <Suspense fallback={<ScreenLoader />}>{screen === "map" ? <WorldMap /> : <SkyScreen />}</Suspense>
    </div>
  );
}

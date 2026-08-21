import { useEffect } from "react";
import { useAppStore } from "../store/appStore";

export function ErrorBanner() {
  const error = useAppStore((s) => s.error);
  const setError = useAppStore((s) => s.setError);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 6000);
    return () => clearTimeout(t);
  }, [error, setError]);

  if (!error) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[1000] flex justify-center px-3">
      <div className="glass-strong animate-fade-in pointer-events-auto flex max-w-md items-start gap-2 rounded-xl px-4 py-3 text-sm text-slate-100 shadow-xl">
        <span className="mt-0.5 text-amber-400">⚠</span>
        <span className="flex-1">{error}</span>
        <button
          onClick={() => setError(null)}
          className="text-slate-400 transition hover:text-slate-100"
          aria-label="Закрыть"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

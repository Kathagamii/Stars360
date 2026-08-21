import { useEffect, useState } from "react";

const KEY = "stars360_sky_hint_seen";

export function SkyHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY)) return;
    } catch {
      /* ignore storage errors (private mode etc.) */
    }
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      try {
        localStorage.setItem(KEY, "1");
      } catch {
        /* ignore */
      }
    }, 5000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-24 z-[150] flex justify-center px-4 sm:top-28">
      <div className="glass animate-fade-in rounded-full px-4 py-2.5 text-center text-xs text-slate-200 shadow-lg sm:text-sm">
        ✋ Потяните, чтобы оглядеться · нажмите на звезду, чтобы узнать о ней
      </div>
    </div>
  );
}

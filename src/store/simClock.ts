/**
 * The authoritative "current simulated instant" used to render the sky.
 * Kept outside React/Zustand so the render loop (running at 60fps inside
 * react-three-fiber's useFrame) never triggers a React re-render just to
 * move the stars. UI text (clock, date pickers) subscribes via
 * useSimTime(), which is throttled.
 */
type Listener = (ms: number) => void;

class SimClock {
  private ms = Date.now();
  private listeners = new Set<Listener>();

  getMs() {
    return this.ms;
  }

  setMs(ms: number) {
    this.ms = ms;
    this.notify();
  }

  advance(deltaMs: number) {
    this.ms += deltaMs;
  }

  /** Push the current value out to subscribers (call at a throttled rate from the render loop). */
  notify() {
    for (const l of this.listeners) l(this.ms);
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
}

export const simClock = new SimClock();

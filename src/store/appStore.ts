import { create } from "zustand";
import type { GeoLocation, SelectedObject, TimeSpeed, ViewMode } from "../types";
import { simClock } from "./simClock";

export type Screen = "map" | "sky";

interface AppState {
  screen: Screen;
  location: GeoLocation | null;
  setLocation: (loc: GeoLocation | null) => void;

  live: boolean;
  playing: boolean; // manual time-lapse playback (only relevant when !live)
  speed: TimeSpeed;
  setLive: (live: boolean) => void;
  setPlaying: (playing: boolean) => void;
  setSpeed: (speed: TimeSpeed) => void;
  setManualTime: (ms: number) => void;
  resetToNow: () => void;

  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  showConstellationLines: boolean;
  toggleConstellationLines: () => void;

  showTerrain: boolean;
  toggleTerrain: () => void;

  selected: SelectedObject | null;
  select: (obj: SelectedObject | null) => void;

  selectedConstellationId: string | null;
  selectConstellation: (id: string | null) => void;

  enterSky: (loc: GeoLocation) => void;
  backToMap: () => void;

  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;

  timePanelOpen: boolean;
  setTimePanelOpen: (open: boolean) => void;

  error: string | null;
  setError: (msg: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  screen: "map",
  location: null,
  setLocation: (loc) => set({ location: loc }),

  live: true,
  playing: false,
  speed: 1,
  setLive: (live) => {
    if (live) simClock.setMs(Date.now());
    set({ live, playing: false });
  },
  setPlaying: (playing) => set((s) => ({ playing, live: playing ? false : s.live })),
  setSpeed: (speed) => set({ speed }),
  setManualTime: (ms) => {
    simClock.setMs(ms);
    set({ live: false, playing: false });
  },
  resetToNow: () => {
    simClock.setMs(Date.now());
    set({ live: true, playing: false });
  },

  viewMode: "sky",
  setViewMode: (mode) => set({ viewMode: mode }),

  showConstellationLines: true,
  toggleConstellationLines: () => set((s) => ({ showConstellationLines: !s.showConstellationLines })),

  showTerrain: true,
  toggleTerrain: () => set((s) => ({ showTerrain: !s.showTerrain })),

  selected: null,
  select: (obj) => set({ selected: obj, selectedConstellationId: null }),

  selectedConstellationId: null,
  selectConstellation: (id) => set({ selectedConstellationId: id, selected: null }),

  enterSky: (loc) => set({ screen: "sky", location: loc, selected: null }),
  backToMap: () => set({ screen: "map", selected: null, selectedConstellationId: null }),

  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),

  timePanelOpen: false,
  setTimePanelOpen: (open) => set({ timePanelOpen: open }),

  error: null,
  setError: (msg) => set({ error: msg }),
}));

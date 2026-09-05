"use client";

import { create } from "zustand";

export type ViewId =
  | "landing"
  | "map"
  | "dashboard"
  | "impact"
  | "alerts"
  | "about";

interface AppState {
  view: ViewId;
  selectedFieldId: string | null;
  refreshTick: number;
  setView: (v: ViewId) => void;
  openField: (id: string) => void;
  bumpRefresh: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: "landing",
  selectedFieldId: null,
  refreshTick: 0,
  setView: (view) => set({ view }),
  openField: (id) => set({ view: "dashboard", selectedFieldId: id }),
  bumpRefresh: () => set((s) => ({ refreshTick: s.refreshTick + 1 })),
}));

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * View-Modi der Hauptansicht:
 *  - "split": Wizard + Dashboard nebeneinander (Default, für interaktive Beratung)
 *  - "wizard": nur Wizard, volle Breite (während der Datenerfassung, ohne
 *    Ablenkung durchs Dashboard)
 *  - "dashboard": nur Dashboard, volle Breite (Präsentation/Review wenn
 *    alles eingetippt ist)
 */
export type ViewMode = "split" | "wizard" | "dashboard";

interface ViewModeStore {
  mode: ViewMode;
  setMode: (m: ViewMode) => void;
}

/**
 * Globaler View-Mode-State via zustand — cross-component synchronisiert.
 *
 * Wichtig: der erste Wurf war ein useState-Hook pro Komponente, was dazu
 * führte dass Header (set) und Wizard (read) eigene States hatten. Mit
 * zustand-Store wird der State global geteilt; persist sorgt für die
 * LocalStorage-Bridge.
 */
const useViewModeStore = create<ViewModeStore>()(
  persist(
    (set) => ({
      mode: "split",
      setMode: (mode) => set({ mode }),
    }),
    {
      name: "cuira-view-mode",
    }
  )
);

/**
 * Tuple-API für minimale Aufrufer-Anpassung — wie ein useState.
 */
export function useViewMode(): [ViewMode, (m: ViewMode) => void] {
  const mode = useViewModeStore((s) => s.mode);
  const setMode = useViewModeStore((s) => s.setMode);
  return [mode, setMode];
}

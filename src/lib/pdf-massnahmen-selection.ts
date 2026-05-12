"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * PDF-Massnahmen-Selektion: welche Massnahmen-IDs sollen ins PDF.
 * Wenn `ids` leer → Default-Logik (alle inkl. Optimierungen).
 * Wenn `ids` gesetzt → nur diese IDs werden ins PDF aufgenommen.
 *
 * Plus `maxTop` für Executive Summary (Default 2 = Top-2).
 *
 * Persist in LocalStorage "cuira-pdf-massnahmen-v1".
 */
interface PdfMassnahmenStore {
  /** Massnahme-IDs die explizit ausgewählt sind. Leer = alle default. */
  selectedIds: string[];
  /** Anzahl Top-Massnahmen in Executive Summary. */
  maxTop: number;
  toggleId: (id: string) => void;
  setMaxTop: (n: number) => void;
  reset: () => void;
}

const useStore = create<PdfMassnahmenStore>()(
  persist(
    (set) => ({
      selectedIds: [],
      maxTop: 2,
      toggleId: (id) =>
        set((s) => ({
          selectedIds: s.selectedIds.includes(id)
            ? s.selectedIds.filter((x) => x !== id)
            : [...s.selectedIds, id],
        })),
      setMaxTop: (n) => set({ maxTop: Math.max(1, Math.min(10, n)) }),
      reset: () => set({ selectedIds: [], maxTop: 2 }),
    }),
    { name: "cuira-pdf-massnahmen-v1" }
  )
);

export function usePdfMassnahmen() {
  return useStore();
}

export function getPdfMassnahmenStatic(): { selectedIds: string[]; maxTop: number } {
  if (typeof window === "undefined") return { selectedIds: [], maxTop: 2 };
  try {
    const raw = window.localStorage.getItem("cuira-pdf-massnahmen-v1");
    if (!raw) return { selectedIds: [], maxTop: 2 };
    const p = JSON.parse(raw) as {
      state?: { selectedIds?: string[]; maxTop?: number };
    };
    return {
      selectedIds: p.state?.selectedIds ?? [],
      maxTop: p.state?.maxTop ?? 2,
    };
  } catch {
    return { selectedIds: [], maxTop: 2 };
  }
}

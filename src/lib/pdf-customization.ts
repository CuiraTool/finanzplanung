"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * PDF-Customization: pro Print-Section kann der Berater
 *  - Items ausblenden (hiddenIds)
 *  - Reihenfolge überschreiben (orderIds — wenn null = Engine-Default)
 *  - Titel/Beschreibung einzelner Items überschreiben (edits)
 *
 * Section-Keys (unterstützt):
 *  - "massnahmen"    Standard-Massnahmen aus engine/massnahmen.ts
 *  - "stress"        Stress-Tests aus engine/stress-tests.ts
 *  - "ki"            KI-Empfehlungen (vom Dashboard generiert)
 *  - "optimierungen" Subset von massnahmen mit kategorie "optimierung"
 *
 * Default leer = Engine-Output unverändert. LocalStorage:
 * "cuira-pdf-customization-v1".
 */
export type PdfSectionKey = "massnahmen" | "stress" | "ki" | "optimierungen";

export interface PdfItemEdit {
  /** Custom-Titel (überschreibt Engine-Original). Leer = unverändert. */
  titel?: string;
  /** Custom-Beschreibung/Begründung. Leer = unverändert. */
  text?: string;
}

export interface PdfSectionCustom {
  /** Item-IDs die im PDF NICHT erscheinen sollen. */
  hiddenIds: string[];
  /**
   * Manuelle Reihenfolge — Array of IDs in Anzeige-Order. Items die
   * nicht im Array stehen, werden ans Ende angehängt in Engine-Reihenfolge.
   * Wenn null/leer = Engine-Default.
   */
  orderIds: string[];
  /** Pro Item-ID: optionale Titel-/Text-Überschreibungen. */
  edits: Record<string, PdfItemEdit>;
}

interface PdfCustomStore {
  sections: Record<PdfSectionKey, PdfSectionCustom>;
  toggleHide: (section: PdfSectionKey, id: string) => void;
  setOrder: (section: PdfSectionKey, ids: string[]) => void;
  setEdit: (section: PdfSectionKey, id: string, edit: PdfItemEdit) => void;
  clearEdit: (section: PdfSectionKey, id: string) => void;
  resetSection: (section: PdfSectionKey) => void;
}

const emptySection: PdfSectionCustom = {
  hiddenIds: [],
  orderIds: [],
  edits: {},
};

const useStore = create<PdfCustomStore>()(
  persist(
    (set) => ({
      sections: {
        massnahmen: { ...emptySection },
        stress: { ...emptySection },
        ki: { ...emptySection },
        optimierungen: { ...emptySection },
      },
      toggleHide: (section, id) =>
        set((s) => {
          const cur = s.sections[section] ?? emptySection;
          const hidden = cur.hiddenIds.includes(id)
            ? cur.hiddenIds.filter((x) => x !== id)
            : [...cur.hiddenIds, id];
          return {
            sections: {
              ...s.sections,
              [section]: { ...cur, hiddenIds: hidden },
            },
          };
        }),
      setOrder: (section, ids) =>
        set((s) => ({
          sections: {
            ...s.sections,
            [section]: { ...s.sections[section], orderIds: ids },
          },
        })),
      setEdit: (section, id, edit) =>
        set((s) => {
          const cur = s.sections[section] ?? emptySection;
          return {
            sections: {
              ...s.sections,
              [section]: {
                ...cur,
                edits: { ...cur.edits, [id]: { ...cur.edits[id], ...edit } },
              },
            },
          };
        }),
      clearEdit: (section, id) =>
        set((s) => {
          const cur = s.sections[section] ?? emptySection;
          const { [id]: _drop, ...rest } = cur.edits;
          void _drop;
          return {
            sections: {
              ...s.sections,
              [section]: { ...cur, edits: rest },
            },
          };
        }),
      resetSection: (section) =>
        set((s) => ({
          sections: { ...s.sections, [section]: { ...emptySection } },
        })),
    }),
    { name: "cuira-pdf-customization-v1" }
  )
);

export function usePdfCustomization() {
  return useStore();
}

export function getPdfCustomizationStatic(): PdfCustomStore["sections"] {
  if (typeof window === "undefined") {
    return {
      massnahmen: { ...emptySection },
      stress: { ...emptySection },
      ki: { ...emptySection },
      optimierungen: { ...emptySection },
    };
  }
  try {
    const raw = window.localStorage.getItem("cuira-pdf-customization-v1");
    if (!raw)
      return {
        massnahmen: { ...emptySection },
        stress: { ...emptySection },
        ki: { ...emptySection },
        optimierungen: { ...emptySection },
      };
    const p = JSON.parse(raw) as { state?: { sections?: PdfCustomStore["sections"] } };
    const sec = p.state?.sections;
    return {
      massnahmen: sec?.massnahmen ?? { ...emptySection },
      stress: sec?.stress ?? { ...emptySection },
      ki: sec?.ki ?? { ...emptySection },
      optimierungen: sec?.optimierungen ?? { ...emptySection },
    };
  } catch {
    return {
      massnahmen: { ...emptySection },
      stress: { ...emptySection },
      ki: { ...emptySection },
      optimierungen: { ...emptySection },
    };
  }
}

/**
 * Wendet Custom-Reihenfolge auf Item-Liste an. Items aus `orderIds` zuerst
 * in genau dieser Reihenfolge, danach alle restlichen Engine-Items.
 */
export function applyOrder<T extends { id: string }>(
  items: T[],
  orderIds: string[]
): T[] {
  if (orderIds.length === 0) return items;
  const byId = new Map(items.map((it) => [it.id, it]));
  const out: T[] = [];
  for (const id of orderIds) {
    const found = byId.get(id);
    if (found) {
      out.push(found);
      byId.delete(id);
    }
  }
  for (const remaining of byId.values()) out.push(remaining);
  return out;
}

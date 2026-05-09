"use client";

import { useEffect, useState } from "react";

/**
 * View-Modi der Hauptansicht:
 *  - "split": Wizard + Dashboard nebeneinander (Default, für interaktive Beratung)
 *  - "wizard": nur Wizard, volle Breite (während der Datenerfassung, ohne
 *    Ablenkung durchs Dashboard)
 *  - "dashboard": nur Dashboard, volle Breite (Präsentation/Review wenn
 *    alles eingetippt ist)
 */
export type ViewMode = "split" | "wizard" | "dashboard";

const STORAGE_KEY = "cuira-view-mode";
const DEFAULT_MODE: ViewMode = "split";

function readStored(): ViewMode {
  if (typeof window === "undefined") return DEFAULT_MODE;
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "split" || v === "wizard" || v === "dashboard") return v;
  return DEFAULT_MODE;
}

/**
 * Globaler View-Mode-State. Wird in LocalStorage persistiert. Beim Mount auf
 * Server-Side mit Default initialisiert (kein Hydration-Mismatch), nach Mount
 * wird der gespeicherte Wert übernommen.
 */
export function useViewMode(): [ViewMode, (m: ViewMode) => void] {
  const [mode, setModeState] = useState<ViewMode>(DEFAULT_MODE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setModeState(readStored());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode, hydrated]);

  return [mode, setModeState];
}

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CashflowZeile } from "@/engine/cashflow";
import { INFLATION_DEFAULT_PROZENT } from "@/engine/economy-defaults";

/**
 * Inflations-Toggle für die Dashboard-Anzeige.
 *
 * Zwei Modi:
 *  - "nominal" (Default): zukünftige Werte werden so angezeigt, wie sie in
 *    dem zukünftigen Jahr in CHF anfallen werden (z.B. CHF 200'000 Lohn in
 *    20 Jahren bleibt CHF 200'000 — die Werte rollen aber nicht hoch, also
 *    real "weniger wert").
 *  - "real" (kaufkraftbereinigt): zukünftige Werte werden auf die heutige
 *    Kaufkraft deflationiert mit der Inflationsrate (Default 1.5 % p.a.,
 *    langfristiger Schweizer Mittelwert).
 *
 * Praktisch: im "real"-Modus sieht der User dass eine Rente von CHF 30'240
 * in 20 Jahren in heutiger Kaufkraft nur ~CHF 22'400 wert ist.
 */

interface InflationStore {
  /** True = real (kaufkraftbereinigt), false = nominal. */
  enabled: boolean;
  /** Inflations-Rate in %. Default 1.5. */
  rateProzent: number;
  setEnabled: (e: boolean) => void;
  setRate: (r: number) => void;
  toggle: () => void;
}

const useStore = create<InflationStore>()(
  persist(
    (set) => ({
      enabled: false,
      rateProzent: INFLATION_DEFAULT_PROZENT,
      setEnabled: (enabled) => set({ enabled }),
      setRate: (rateProzent) => set({ rateProzent }),
      toggle: () => set((s) => ({ enabled: !s.enabled })),
    }),
    {
      name: "cuira-inflation",
    }
  )
);

export function useInflation(): InflationStore {
  // Tuple-API wäre möglich, aber Toggle braucht hier mehr Felder
  return useStore();
}

/**
 * Deflationiert einen Nominalwert auf die Kaufkraft des Basis-Jahrs.
 */
export function realwert(
  nominalwert: number,
  jahr: number,
  basisJahr: number,
  rateProzent: number
): number {
  if (jahr <= basisJahr) return nominalwert;
  const jahre = jahr - basisJahr;
  return nominalwert / Math.pow(1 + rateProzent / 100, jahre);
}

/**
 * Deflationiert alle CHF-Felder einer CashflowZeile (alles außer
 * jahr/alterP1/alterP2). Wenn enabled=false, gibt die Zeile unverändert
 * zurück.
 */
export function deflationiereCashflowZeile(
  zeile: CashflowZeile,
  basisJahr: number,
  rateProzent: number,
  enabled: boolean
): CashflowZeile {
  if (!enabled) return zeile;
  if (zeile.jahr <= basisJahr) return zeile;
  const jahre = zeile.jahr - basisJahr;
  const faktor = 1 / Math.pow(1 + rateProzent / 100, jahre);
  const skip = new Set(["jahr", "alterP1", "alterP2"]);
  const result = { ...zeile } as Record<string, unknown>;
  for (const key of Object.keys(zeile)) {
    if (skip.has(key)) continue;
    const v = (zeile as unknown as Record<string, unknown>)[key];
    if (typeof v === "number") {
      result[key] = Math.round(v * faktor);
    }
  }
  return result as unknown as CashflowZeile;
}

/**
 * Bequemlichkeits-Helper für eine ganze Cashflow-Reihe.
 */
export function deflationiereReihe(
  reihe: CashflowZeile[],
  basisJahr: number,
  rateProzent: number,
  enabled: boolean
): CashflowZeile[] {
  if (!enabled) return reihe;
  return reihe.map((z) =>
    deflationiereCashflowZeile(z, basisJahr, rateProzent, enabled)
  );
}

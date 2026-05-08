/**
 * AHV (1. Säule) — Berechnung der Altersrente.
 *
 * Stand: vereinfachte Skala-44-Approximation für Etappe 1.
 *
 * BSV-Eckwerte 2024 (ab AHV21, Stand der Tabellen Skala 44):
 *   - Minimalrente einzeln:                 CHF 14'700/Jahr (CHF 1'225/Mt)
 *   - Maximalrente einzeln:                 CHF 29'400/Jahr (CHF 2'450/Mt)
 *   - Plafonierte Maximalrente Ehepaar:     CHF 44'100/Jahr (= 150% einzeln)
 *   - Untere Grenze massg. Einkommen:       CHF 14'700/Jahr
 *   - Obere Grenze massg. Einkommen:        CHF 88'200/Jahr (= 6× Minimum)
 *
 * Vereinfachung Etappe 1: lineare Interpolation zwischen unterer und oberer Grenze.
 * In Etappe 1.5 durch echte BSV-Rententabelle (gestaffelte Funktion) ersetzen.
 *
 * Quelle für Validierung: docs/Def.FinancialPlanning - Muster.pdf S.4
 *   Ehepaar Muster (Ralph 1967 + Stephanie 1972, beide Pensionierung Alter 65):
 *   AHV-Ehepaarrente CHF 33'072 p.a. (= 75% der plafonierten Maximalrente).
 */

const MIN_RENTE = 14_700;
const MAX_RENTE_EINZEL = 29_400;
const MAX_RENTE_EHEPAAR = 44_100;
const UNTERE_GRENZE_EINKOMMEN = 14_700;
const OBERE_GRENZE_EINKOMMEN = 88_200;

/**
 * Vollrente Skala 44 (lückenlose Beitragsdauer 44 Jahre).
 * Lineare Approximation — siehe Modul-Header.
 */
export function vollrenteEinzelSkala44(massgebendesEinkommen: number): number {
  if (massgebendesEinkommen <= UNTERE_GRENZE_EINKOMMEN) return MIN_RENTE;
  if (massgebendesEinkommen >= OBERE_GRENZE_EINKOMMEN) return MAX_RENTE_EINZEL;

  const fraction =
    (massgebendesEinkommen - UNTERE_GRENZE_EINKOMMEN) /
    (OBERE_GRENZE_EINKOMMEN - UNTERE_GRENZE_EINKOMMEN);
  return Math.round(MIN_RENTE + fraction * (MAX_RENTE_EINZEL - MIN_RENTE));
}

export interface AhvCoupleInput {
  einkommenP1: number;
  einkommenP2: number;
  beitragsjahreP1?: number; // Default 44
  beitragsjahreP2?: number; // Default 44
}

export interface AhvCoupleOutput {
  rentenP1: number;
  rentenP2: number;
  rentenSummeUngekuerzt: number;
  plafoniert: boolean;
  haushaltsRente: number;
}

/**
 * Ehepaar-Splitting (vereinfacht): beide Einkommen während der Ehe werden zusammengezählt
 * und je hälftig zugerechnet, dann wird je eine Vollrente berechnet, dann plafoniert auf 150%.
 *
 * Vereinfachung Etappe 1: Einkommen wird symmetrisch gesplittet (ehe-lebenslang).
 * Reale Berechnung berücksichtigt nur Beitragsjahre während der Ehe — das kommt später.
 */
export function ahvCouplePension(input: AhvCoupleInput): AhvCoupleOutput {
  const splitEinkommen = (input.einkommenP1 + input.einkommenP2) / 2;
  const renteP1 = vollrenteEinzelSkala44(splitEinkommen);
  const renteP2 = vollrenteEinzelSkala44(splitEinkommen);
  const summeUngekuerzt = renteP1 + renteP2;
  const plafoniert = summeUngekuerzt > MAX_RENTE_EHEPAAR;
  const haushalt = plafoniert ? MAX_RENTE_EHEPAAR : summeUngekuerzt;

  return {
    rentenP1: plafoniert ? MAX_RENTE_EHEPAAR / 2 : renteP1,
    rentenP2: plafoniert ? MAX_RENTE_EHEPAAR / 2 : renteP2,
    rentenSummeUngekuerzt: summeUngekuerzt,
    plafoniert,
    haushaltsRente: haushalt,
  };
}

/**
 * Hilfsfunktion: maximal mögliche Ehepaarrente in einem gegebenen Jahr.
 * Aktuell nur 2024–2026 (BSV-Werte 2024 unverändert in der Periode).
 */
export function ahvMaxCouplePension(year: number): number {
  if (year < 2024 || year > 2026) {
    throw new Error(
      `AHV-Maximalrente Ehepaar für Jahr ${year} noch nicht hinterlegt`
    );
  }
  return MAX_RENTE_EHEPAAR;
}

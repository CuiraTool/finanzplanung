/**
 * AHV (1. Säule) Berechnungen.
 *
 * Quellen: BSV-Tabellen für Vollrenten, Splitting bei Ehepaaren (max. 150% der Maximalrente),
 * Kürzung bei Frühbezug, Aufschubzuschlag.
 *
 * Stand: TODO recherchieren — Tabellen 2026 von admin.ch/bsv beziehen.
 */

export interface AhvInput {
  geburtsjahr: number;
  geschlecht: "m" | "w";
  fehljahre: number;
  bezugsalter: number;
  zivilstandBeiBezug: "ledig" | "verheiratet" | "verwitwet" | "geschieden";
  ehepartnerBezugsalter?: number;
}

export interface AhvOutput {
  jahresrenteCHF: number;
  monatsrenteCHF: number;
  notiz: string;
}

/**
 * TODO Etappe 1: Implementierung mit BSV-Tabellen.
 * Validierungsziel: Ehepaar-Vollrente CHF 33'072 p.a. (Muster-PDF Seite 4, beide Ralph 1967 + Stephanie 1972, ordentliche Pensionierung Alter 65).
 */
export function calculateAhv(_input: AhvInput): AhvOutput {
  throw new Error("AHV-Berechnung noch nicht implementiert (Etappe 1)");
}

/**
 * Maximal mögliche Ehepaarrente: zwei Vollrenten, plafoniert auf 150% der Einzel-Maximalrente.
 * Aktuell hardcoded mit Wert aus Muster-PDF — wird in Etappe 1 durch echte Tabelle ersetzt.
 */
export function calculateAhvCouplePensionMax(year: number): number {
  if (year !== 2024 && year !== 2025 && year !== 2026) {
    throw new Error(`Ehepaar-Maximalrente für Jahr ${year} noch nicht hinterlegt`);
  }
  return 33072;
}

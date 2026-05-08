/**
 * Helfer rund um Pensionsalter und Pensionsjahr.
 *
 * Vereinfachung Etappe 1: Ordentliches AHV-Alter immer 65.
 * AHV21 staffelt das Frauen-Rentenalter von 64 auf 65 (Jahrgänge 1961–1964) —
 * dieser Sonderfall fliesst in Etappe 1.5 ein, sobald Geschlecht im Modell ist.
 */

export const ORDENTLICHES_AHV_ALTER = 65;

/**
 * Liefert das Kalenderjahr, in dem die Person das angegebene Alter erreicht.
 * Beispiel: geburtsdatum "1967-07-29", alter 65 → 2032.
 * Liefert null, wenn das Datum leer oder ungültig ist.
 */
export function pensionsjahr(geburtsdatum: string, alter: number): number | null {
  if (!geburtsdatum) return null;
  const year = Number.parseInt(geburtsdatum.slice(0, 4), 10);
  if (!Number.isFinite(year) || year < 1900 || year > 2100) return null;
  return year + alter;
}

/**
 * Etikett für eine Person — kontextsensitiv:
 *  - Einzelperson: "Personendaten" oder "Personendaten — Ralph" (wenn Vorname gesetzt)
 *  - Paar:         "Person 1" oder "Person 1 — Ralph" / "Person 2 — Stephanie"
 */
export function personLabel(
  idx: 1 | 2,
  vorname: string,
  fallart: "einzel" | "paar"
): string {
  const base = fallart === "einzel" ? "Personendaten" : `Person ${idx}`;
  const v = vorname.trim();
  return v ? `${base} — ${v}` : base;
}

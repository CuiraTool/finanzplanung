/**
 * Immobilien — Block 8.
 *
 * Modell Etappe 1:
 *   - Beliebig viele Immobilien (selbstbewohnt oder Renditeliegenschaft)
 *   - Pro Immobilie beliebig viele Hypotheken-Tranchen mit Zinssatz und Ablauf
 *   - Plan: behalten oder verkaufen (mit Verkaufsjahr)
 *   - Netto-Wert heute = Verkehrswert minus Summe aller Hypotheken
 *
 * Bei "verkaufen": im Verkaufsjahr fliesst (Verkehrswert - Hypothek-Total)
 * ins freie Vermögen. Grundstückgewinnsteuer (GGSt) — kantonal — wird in
 * Etappe 2 (Steuer-Engine) abgezogen.
 *
 * Eigenmietwert für selbstbewohnt + Schuldzinsabzug folgen ebenfalls in Etappe 2.
 */

export type ImmobilienTyp = "selbstbewohnt" | "rendite";
export type ImmobilienPlan = "behalten" | "verkaufen";

export interface ImmobilieFuerEngine {
  verkehrswert: number | null;
  hypothekenSumme: number;
  plan: ImmobilienPlan;
  verkaufsjahr: number;
}

/**
 * Netto-Vermögen aus einer Immobilie heute = Wert - Hypotheken (>= 0 wenn nicht überschuldet).
 * Wenn Verkehrswert null, liefert null.
 */
export function immobilieNettoHeute(im: ImmobilieFuerEngine): number | null {
  if (im.verkehrswert == null) return null;
  return Math.round(im.verkehrswert - im.hypothekenSumme);
}

/**
 * Aufteilung über alle Immobilien:
 *  - aktivaImmobilien: Σ Verkehrswerte (Werte mit null werden ignoriert)
 *  - hypothekenTotal:  Σ aller Hypotheken
 *  - netto:            aktivaImmobilien - hypothekenTotal
 */
export function immobilienAufteilung(items: ImmobilieFuerEngine[]): {
  aktivaImmobilien: number;
  hypothekenTotal: number;
  netto: number;
} {
  let aktiva = 0;
  let hypotheken = 0;
  for (const i of items) {
    if (i.verkehrswert != null) aktiva += i.verkehrswert;
    hypotheken += i.hypothekenSumme;
  }
  return {
    aktivaImmobilien: Math.round(aktiva),
    hypothekenTotal: Math.round(hypotheken),
    netto: Math.round(aktiva - hypotheken),
  };
}

/**
 * Liefert für eine Immobilie mit Plan "verkaufen" den Netto-Erlös im Verkaufsjahr.
 * Liefert null bei Plan "behalten" oder fehlendem Verkehrswert.
 */
export function immobilienVerkaufsAuszahlung(
  im: ImmobilieFuerEngine
): { jahr: number; betrag: number } | null {
  if (im.plan !== "verkaufen" || im.verkehrswert == null) return null;
  const netto = im.verkehrswert - im.hypothekenSumme;
  return { jahr: im.verkaufsjahr, betrag: Math.round(netto) };
}

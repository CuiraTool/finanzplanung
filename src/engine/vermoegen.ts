/**
 * Vermögen — Block 7.
 *
 * Hält Konten, Depots und Darlehen mit Saldo heute, Rendite und einem
 * Hauptkonto-Flag. Der Hauptkonto-Saldo wird später vom Cashflow-Modul
 * mit dem jährlichen Überschuss/Defizit aktualisiert (Etappe 2).
 *
 * Konvention:
 *   - Konto / Depot: positiver Saldo erhöht das Vermögen
 *   - Darlehen: positiver Saldo wird vom Vermögen abgezogen (= Schuld)
 */

export type VermoegenTyp = "konto" | "depot" | "darlehen";

export interface VermoegenPosition {
  typ: VermoegenTyp;
  saldoHeute: number | null;
}

/**
 * Liefert das aktuelle Nettovermögen — Aktiva minus Darlehen.
 */
export function vermoegenStandHeute(positionen: VermoegenPosition[]): number {
  let total = 0;
  for (const p of positionen) {
    if (p.saldoHeute == null) continue;
    if (p.typ === "darlehen") total -= p.saldoHeute;
    else total += p.saldoHeute;
  }
  return Math.round(total);
}

/**
 * Aufteilung Aktiva / Schulden für die Anzeige.
 */
export function vermoegenAufteilung(positionen: VermoegenPosition[]): {
  aktiva: number;
  schulden: number;
  netto: number;
} {
  let aktiva = 0;
  let schulden = 0;
  for (const p of positionen) {
    if (p.saldoHeute == null) continue;
    if (p.typ === "darlehen") schulden += p.saldoHeute;
    else aktiva += p.saldoHeute;
  }
  return {
    aktiva: Math.round(aktiva),
    schulden: Math.round(schulden),
    netto: Math.round(aktiva - schulden),
  };
}

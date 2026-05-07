/**
 * 3. Säule (3a + 3b) Berechnungen.
 *
 * Kernregeln:
 *  - 3a Maximalbeitrag Erwerbstätige mit PK: aktuell CHF 7'258 p.a. (Stand 2025; jährlich anpassen)
 *  - 3a-Bezug: gestaffelter Bezug über mehrere Jahre senkt Kapitalauszahlungssteuer
 *  - 3a-Bezug ab Alter 60 (Frauen) / 60 (Männer, ab AHV-Reform), spätestens AHV-Bezug
 *
 * Validierungsziel (Muster-PDF S.13/14): Beiträge CHF 7'056 p.a. pro Person (= Wert 2024),
 * Auszahlungen Stephanie 2035/2036/2037 mit Staffelbezug zur Steueroptimierung.
 */

export interface SaeuleDreiAInput {
  saldoHeute: number;
  jaehrlicheEinzahlung: number;
  bezugsplan: { jahr: number; betrag: number }[];
  zinssatz: number;
}

export interface SaeuleDreiAOutput {
  saldoBeiBezug: number;
  totalBezogen: number;
  notiz: string;
}

export function calculateSaeuleDreiA(_input: SaeuleDreiAInput): SaeuleDreiAOutput {
  throw new Error("3a-Berechnung noch nicht implementiert (Etappe 1)");
}

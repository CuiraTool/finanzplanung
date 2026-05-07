/**
 * Cashflow-Engine: kombiniert AHV, BVG, 3a, Erwerbseinkommen, Wohnkosten,
 * Steuern und liefert eine Jahres-Projektion über den Planungshorizont.
 *
 * Validierungsziel (Muster-PDF S.5/7):
 *  Ausgangslage 2024 — Einnahmen CHF 231'880, Ausgaben CHF 206'738, Saldo CHF +25'142.
 */

export interface CashflowJahr {
  jahr: number;
  alterPerson1: number;
  alterPerson2?: number;
  einnahmen: number;
  ausgaben: number;
  saldo: number;
}

export function buildCashflow(): CashflowJahr[] {
  throw new Error("Cashflow-Engine noch nicht implementiert (Etappe 1)");
}

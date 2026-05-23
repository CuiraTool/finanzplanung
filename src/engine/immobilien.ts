/**
 * Immobilien — Block 8.
 *
 * Modell Etappe 1:
 *   - Beliebig viele Immobilien (selbstbewohnt oder Renditeliegenschaft)
 *   - Pro Immobilie beliebig viele Hypotheken-Tranchen mit Zinssatz und Ablauf
 *   - Plan: behalten oder verkaufen (mit Verkaufsjahr)
 *   - Netto-Wert heute = Verkehrswert minus Summe aller Hypotheken
 *
 * Bei "verkaufen": im Verkaufsjahr fliesst (Verkehrswert - Hypothek-Total
 * − Grundstückgewinnsteuer) ins freie Vermögen. GGSt-Berechnung in
 * `engine/grundstueckgewinn.ts` (kantonal, ZH/ZG/SZ/BE/LU/AG/SG/TI/VD).
 *
 * Eigenmietwert für selbstbewohnt + Schuldzinsabzug folgen mit Etappe 2028
 * Reform-Implementation (oder gar nicht, weil dann abgeschafft — siehe
 * docs/Block8Immobilien.tsx).
 */

import {
  berechneGgst,
  ggstKantonFromCode,
  type GgstOutput,
} from "./grundstueckgewinn";

export type ImmobilienTyp = "selbstbewohnt" | "rendite";
/**
 * Plan-Optionen — siehe `src/lib/store.ts` für ausführliche Doku.
 * "verschenken" entspricht einem Erbvorbezug an Nachkommen: Bilanz raus
 * (Verkehrswert + Hypothek), KEIN Geldfluss, KEINE GGSt (Steueraufschub).
 */
export type ImmobilienPlan = "behalten" | "verkaufen" | "verschenken";

export interface ImmobilieFuerEngine {
  verkehrswert: number | null;
  hypothekenSumme: number;
  plan: ImmobilienPlan;
  verkaufsjahr: number;
  /** Optional: Kaufjahr für GGSt-Besitzdauer. Default = Verkaufsjahr - 15. */
  kaufjahr?: number | null;
  /** Optional: Anlagekosten (Kaufpreis + Kaufnebenkosten) für GGSt. */
  anlagekosten?: number | null;
  /** Optional: wertvermehrende Investitionen seit Kauf (GGSt-Abzug). */
  wertvermehrendeInvestitionen?: number | null;
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
 * Liefert für eine Immobilie mit Plan "verkaufen" den Brutto-Erlös im Verkaufsjahr.
 * Liefert null bei Plan "behalten" oder fehlendem Verkehrswert.
 *
 * **Brutto** = Verkehrswert − Hypothek-Summe (vor GGSt). Die GGSt wird in
 * `immobilienVerkaufsAuszahlungNetto` separat berechnet, weil sie den Kanton
 * braucht — und der Kanton kommt aus dem Plan-State (Adresse), nicht aus
 * der Immobilie selbst.
 */
export function immobilienVerkaufsAuszahlung(
  im: ImmobilieFuerEngine
): { jahr: number; betrag: number } | null {
  if (im.plan !== "verkaufen" || im.verkehrswert == null) return null;
  const netto = im.verkehrswert - im.hypothekenSumme;
  return { jahr: im.verkaufsjahr, betrag: Math.round(netto) };
}

/**
 * Netto-Auszahlung beim Verkauf inkl. Grundstückgewinnsteuer-Abzug.
 *
 * Auszahlung = Verkehrswert − Hypothek − GGSt
 *
 * Die GGSt wird auf den Reingewinn berechnet (Verkehrswert − Anlagekosten),
 * nicht auf den Auszahlungs-Netto. Das ist der Standard-Steuermechanismus
 * (CHE: Grundstückgewinn = Veräusserungspreis minus Anlagekosten).
 *
 * @param kantonCode Kanton aus dem Plan-Store (Adresse). Bei unbekanntem
 *                   Code wird "andere"-Tarif (≈ ZH) verwendet.
 */
export function immobilienVerkaufsAuszahlungNetto(
  im: ImmobilieFuerEngine,
  kantonCode: string
): {
  jahr: number;
  bruttoErloes: number;
  ggst: GgstOutput;
  netto: number;
} | null {
  if (im.plan !== "verkaufen" || im.verkehrswert == null) return null;

  const bruttoErloes = im.verkehrswert - im.hypothekenSumme;

  // Besitzdauer aus Kaufjahr ableiten, oder Default 15 J.
  const besitzdauerJahre =
    im.kaufjahr != null && im.kaufjahr > 0
      ? Math.max(0, im.verkaufsjahr - im.kaufjahr)
      : 15;

  const ggst = berechneGgst({
    verkaufspreis: im.verkehrswert,
    anlagekosten: im.anlagekosten ?? null,
    wertvermehrendeInvestitionen: im.wertvermehrendeInvestitionen ?? null,
    besitzdauerJahre,
    kanton: ggstKantonFromCode(kantonCode),
  });

  const netto = bruttoErloes - ggst.steuer;

  return {
    jahr: im.verkaufsjahr,
    bruttoErloes: Math.round(bruttoErloes),
    ggst,
    netto: Math.round(netto),
  };
}

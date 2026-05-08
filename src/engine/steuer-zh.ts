/**
 * Kanton Zürich — Einkommens- und Vermögensteuer.
 *
 * Berechnung in zwei Schritten:
 *  1. **Einfache Staatssteuer** nach §35 StG ZH (progressiver Tarif).
 *     Zwei Tarife: Grundtarif (Alleinstehende) und Verheiratetentarif (Ehepaare,
 *     Alleinerziehende). Stand 2024 (Anpassungen erfolgen selten).
 *  2. **Steuerfuss** (Multiplikator auf einfache Steuer): Kanton + Gemeinde +
 *     ggf. Kirche. Default-Annahme hier: Stadt Zürich (häufigste Gemeinde im
 *     Kanton, repräsentativ für mittlere Belastung). Steuerfüsse 2024:
 *       - Kanton ZH: 98%
 *       - Stadt Zürich: 119%
 *       - Kirche reformiert: 10% / katholisch: 12% / keine: 0%
 *
 * Quelle: Steuergesetz Zürich §35, Steuerbuch ZH; Steuerfüsse aus
 * Beschlüssen Kantonsrat und Stadtrat Zürich für 2024.
 *
 * Vereinfachungen (Etappe 4.4+):
 *  - Nur Stadt Zürich als Gemeinde — andere Gemeinden im Kanton ZH haben
 *    Steuerfüsse zwischen 72% und 130%.
 *  - Kinderabzug (CHF 9'300/Kind) noch nicht modelliert.
 *  - Versicherungs-, Berufsauslagen-, Säule-3a-Abzüge im Bruttobetrag
 *    pauschal über `bruttoZuSteuerbarApprox` (85%) — Etappe 4.6 differenziert.
 */

interface TarifStufe {
  /** Untere Grenze des steuerbaren Einkommens (inklusive). */
  von: number;
  /** Steuer am unteren Ende der Stufe. */
  basisbetrag: number;
  /** Marginalsatz oberhalb von `von`. */
  marginalsatz: number;
}

/** ZH Grundtarif (§35 Abs. 1 StG ZH) — Alleinstehende. */
const ZH_TARIF_GRUNDTARIF: TarifStufe[] = [
  { von: 0, basisbetrag: 0, marginalsatz: 0 },
  { von: 6_700, basisbetrag: 0, marginalsatz: 0.02 },
  { von: 11_400, basisbetrag: 94, marginalsatz: 0.03 },
  { von: 16_100, basisbetrag: 235, marginalsatz: 0.04 },
  { von: 23_700, basisbetrag: 539, marginalsatz: 0.05 },
  { von: 33_000, basisbetrag: 1_004, marginalsatz: 0.06 },
  { von: 43_700, basisbetrag: 1_646, marginalsatz: 0.07 },
  { von: 56_100, basisbetrag: 2_514, marginalsatz: 0.08 },
  { von: 73_000, basisbetrag: 3_866, marginalsatz: 0.09 },
  { von: 105_500, basisbetrag: 6_791, marginalsatz: 0.1 },
  { von: 137_700, basisbetrag: 10_011, marginalsatz: 0.11 },
  { von: 188_700, basisbetrag: 15_621, marginalsatz: 0.12 },
  { von: 254_900, basisbetrag: 23_565, marginalsatz: 0.13 },
];

/** ZH Verheiratetentarif (§35 Abs. 2 StG ZH) — Ehepaare, Alleinerziehende. */
const ZH_TARIF_VERHEIRATET: TarifStufe[] = [
  { von: 0, basisbetrag: 0, marginalsatz: 0 },
  { von: 13_500, basisbetrag: 0, marginalsatz: 0.02 },
  { von: 19_600, basisbetrag: 122, marginalsatz: 0.03 },
  { von: 27_300, basisbetrag: 353, marginalsatz: 0.04 },
  { von: 36_700, basisbetrag: 729, marginalsatz: 0.05 },
  { von: 47_400, basisbetrag: 1_264, marginalsatz: 0.06 },
  { von: 61_300, basisbetrag: 2_098, marginalsatz: 0.07 },
  { von: 92_100, basisbetrag: 4_254, marginalsatz: 0.08 },
  { von: 122_900, basisbetrag: 6_718, marginalsatz: 0.09 },
  { von: 169_300, basisbetrag: 10_894, marginalsatz: 0.1 },
  { von: 224_700, basisbetrag: 16_434, marginalsatz: 0.11 },
  { von: 284_800, basisbetrag: 23_045, marginalsatz: 0.12 },
  { von: 354_100, basisbetrag: 31_361, marginalsatz: 0.13 },
];

export type ZhTarifKategorie = "grundtarif" | "verheiratet";

/** Steuerfuss Kanton ZH 2024 (98%). */
export const ZH_STEUERFUSS_KANTON = 0.98;

/** Steuerfuss Stadt Zürich 2024 (119%). Default-Gemeinde. */
export const ZH_STEUERFUSS_STADT_ZH = 1.19;

/** Kirchensteuer-Sätze ZH 2024 (auf einfache Staatssteuer). */
export const ZH_KIRCHENSTEUER = {
  reformiert: 0.1,
  katholisch: 0.12,
  keine: 0,
} as const;

/**
 * Einfache Staatssteuer ZH (vor Steuerfuss-Multiplikator).
 */
export function einfacheStaatssteuerZh(
  steuerbaresEinkommen: number,
  kategorie: ZhTarifKategorie
): number {
  if (steuerbaresEinkommen <= 0) return 0;

  const tarif =
    kategorie === "verheiratet" ? ZH_TARIF_VERHEIRATET : ZH_TARIF_GRUNDTARIF;

  let aktuelleStufe = tarif[0]!;
  for (const stufe of tarif) {
    if (steuerbaresEinkommen >= stufe.von) {
      aktuelleStufe = stufe;
    } else {
      break;
    }
  }

  const ueberschuss = steuerbaresEinkommen - aktuelleStufe.von;
  return aktuelleStufe.basisbetrag + ueberschuss * aktuelleStufe.marginalsatz;
}

/**
 * Total Kantons- + Gemeinde- + Kirchensteuer ZH (Stadt Zürich angenommen).
 *
 * = einfache Staatssteuer × (Kanton-Fuss + Gemeinde-Fuss + Kirchen-Fuss)
 */
export function kantonsteuerZh(input: {
  steuerbaresEinkommen: number;
  kategorie: ZhTarifKategorie;
  religion: "reformiert" | "katholisch" | "keine";
}): number {
  const einfache = einfacheStaatssteuerZh(
    input.steuerbaresEinkommen,
    input.kategorie
  );
  const kirchenSatz = ZH_KIRCHENSTEUER[input.religion];
  const steuerfuss =
    ZH_STEUERFUSS_KANTON + ZH_STEUERFUSS_STADT_ZH + kirchenSatz;
  return einfache * steuerfuss;
}

/**
 * Kapitalauszahlungssteuer Kanton Zürich (§38 StG ZH).
 *
 * Bruchteilstarif "1/20-Methode" (ZStB 22.1):
 *  1. Berechne den Steuersatz so, als ob das Kapital eine **fiktive jährliche
 *     Rente von 1/20 der Kapitalleistung** wäre.
 *  2. Wende diesen Satz auf das gesamte Kapital an.
 *  3. Mindestsatz: 2% einfache Staatssteuer auf das Kapital.
 *  4. Multipliziere mit Steuerfuss (Kanton + Gemeinde + Kirche).
 *
 * Quelle: Weisung des kantonalen Steueramtes ZStB 22.1 (zh.ch).
 */
export function kantonsteuerZhKapital(input: {
  kapital: number;
  kategorie: ZhTarifKategorie;
  religion: "reformiert" | "katholisch" | "keine";
}): number {
  if (input.kapital <= 0) return 0;

  // 1/20-Methode: Steuersatz auf 1/20 der Kapitalleistung berechnen
  const fiktiveRente = input.kapital / 20;
  const steuerAufRente = einfacheStaatssteuerZh(fiktiveRente, input.kategorie);
  const effektivsatzAufRente =
    fiktiveRente > 0 ? steuerAufRente / fiktiveRente : 0;

  // Mindestsatz 2% einfache Staatssteuer
  const angewendeterSatz = Math.max(effektivsatzAufRente, 0.02);
  const einfacheKapitalsteuer = input.kapital * angewendeterSatz;

  // Steuerfuss anwenden
  const kirchenSatz = ZH_KIRCHENSTEUER[input.religion];
  const steuerfuss =
    ZH_STEUERFUSS_KANTON + ZH_STEUERFUSS_STADT_ZH + kirchenSatz;
  return einfacheKapitalsteuer * steuerfuss;
}

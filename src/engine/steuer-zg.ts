/**
 * Kanton Zug — Einkommens- und Vermögenssteuer.
 *
 * Berechnung in zwei Schritten:
 *  1. **Einfache Kantonssteuer** nach §35 StG ZG (progressiver Tarif).
 *     Zwei Tarife (neue Bezeichnung ab Steuerperiode 2024):
 *      - Grundtarif (GT) — vorher "Alleinstehende"
 *      - Mehrpersonentarif (MPT) — vorher "Verheiratete", für Ehepaare und
 *        Alleinerziehende mit Kindern
 *     Stufen werden jährlich an den Konsumentenpreisindex angepasst —
 *     diese Werte sind für Steuerperiode 2025 (Quelle: Finanzdirektion ZG,
 *     "Grundtarif 2001 bis 2026" + "Mehrpersonentarif 2001 bis 2026").
 *  2. **Steuerfuss** (Multiplikator auf einfache Steuer): Kanton + Gemeinde +
 *     ggf. Kirche. Default-Annahme: Stadt Zug. Steuerfüsse 2025:
 *       - Kanton ZG: 82%
 *       - Stadt Zug: 51%
 *       - Kirche reformiert: 9% / katholisch: 9% / keine: 0%
 *
 * Quellen:
 *  - https://zg.ch/dam/jcr:96c7eef4-eb2f-4f8a-a4c4-dad209249598/Grundtarif%202001%20bis%202026.pdf
 *  - https://zg.ch/dam/jcr:88fe7bb7-e1c0-4cf5-bf67-b2ccc633caae/Mehrpersonentarif%202001%20bis%202026.pdf
 *
 * Vereinfachungen (Etappe 4.5+):
 *  - Nur Stadt Zug als Default-Gemeinde — andere ZG-Gemeinden haben
 *    Steuerfüsse zwischen 51% und 65%.
 *  - Kinderabzüge nicht modelliert.
 *  - Versicherungs-/Berufsauslagen-Pauschalen via `bruttoZuSteuerbarApprox`.
 */

interface TarifStufe {
  von: number;
  basisbetrag: number;
  marginalsatz: number;
}

/** ZG Grundtarif (§35 Abs. 1 StG ZG) — Alleinstehende. Steuerperiode 2025. */
const ZG_TARIF_GRUNDTARIF: TarifStufe[] = [
  { von: 0, basisbetrag: 0, marginalsatz: 0.005 },
  { von: 1_100, basisbetrag: 5.5, marginalsatz: 0.01 },
  { von: 3_300, basisbetrag: 27.5, marginalsatz: 0.02 },
  { von: 6_100, basisbetrag: 83.5, marginalsatz: 0.03 },
  { von: 10_100, basisbetrag: 203.5, marginalsatz: 0.0325 },
  { von: 15_300, basisbetrag: 372.5, marginalsatz: 0.035 },
  { von: 21_100, basisbetrag: 575.5, marginalsatz: 0.04 },
  { von: 26_900, basisbetrag: 807.5, marginalsatz: 0.045 },
  { von: 34_900, basisbetrag: 1_167.5, marginalsatz: 0.055 },
  { von: 46_400, basisbetrag: 1_800, marginalsatz: 0.055 },
  { von: 59_700, basisbetrag: 2_531.5, marginalsatz: 0.065 },
  { von: 74_700, basisbetrag: 3_506.5, marginalsatz: 0.08 },
  { von: 94_800, basisbetrag: 5_114.5, marginalsatz: 0.1 },
  { von: 120_100, basisbetrag: 7_644.5, marginalsatz: 0.09 },
  { von: 149_900, basisbetrag: 10_326.5, marginalsatz: 0.08 },
];

/** ZG Mehrpersonentarif (§35 Abs. 2 StG ZG). Steuerperiode 2025. */
const ZG_TARIF_MEHRPERSONEN: TarifStufe[] = [
  { von: 0, basisbetrag: 0, marginalsatz: 0.005 },
  { von: 2_200, basisbetrag: 11, marginalsatz: 0.01 },
  { von: 6_600, basisbetrag: 55, marginalsatz: 0.02 },
  { von: 12_200, basisbetrag: 167, marginalsatz: 0.03 },
  { von: 20_200, basisbetrag: 407, marginalsatz: 0.0325 },
  { von: 30_600, basisbetrag: 745, marginalsatz: 0.035 },
  { von: 42_200, basisbetrag: 1_151, marginalsatz: 0.04 },
  { von: 53_800, basisbetrag: 1_615, marginalsatz: 0.045 },
  { von: 69_800, basisbetrag: 2_335, marginalsatz: 0.055 },
  { von: 92_800, basisbetrag: 3_600, marginalsatz: 0.055 },
  { von: 119_400, basisbetrag: 5_063, marginalsatz: 0.065 },
  { von: 149_400, basisbetrag: 7_013, marginalsatz: 0.08 },
  { von: 189_600, basisbetrag: 10_229, marginalsatz: 0.1 },
  { von: 240_200, basisbetrag: 15_289, marginalsatz: 0.09 },
  { von: 299_800, basisbetrag: 20_653, marginalsatz: 0.08 },
];

export type ZgTarifKategorie = "grundtarif" | "mehrpersonen";

/** Steuerfuss Kanton ZG 2025 (82%). */
export const ZG_STEUERFUSS_KANTON = 0.82;

/** Steuerfuss Stadt Zug 2025 (51%). Default-Gemeinde. */
export const ZG_STEUERFUSS_STADT_ZUG = 0.51;

/** Kirchensteuer-Sätze ZG 2025 (auf einfache Kantonssteuer). */
export const ZG_KIRCHENSTEUER = {
  reformiert: 0.09,
  katholisch: 0.09,
  keine: 0,
} as const;

/**
 * Einfache Kantonssteuer ZG (vor Steuerfuss-Multiplikator).
 */
export function einfacheKantonssteuerZg(
  steuerbaresEinkommen: number,
  kategorie: ZgTarifKategorie
): number {
  if (steuerbaresEinkommen <= 0) return 0;

  const tarif =
    kategorie === "mehrpersonen"
      ? ZG_TARIF_MEHRPERSONEN
      : ZG_TARIF_GRUNDTARIF;

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
 * Total Kantons- + Gemeinde- + Kirchensteuer ZG (Stadt Zug angenommen).
 *
 * = einfache Kantonssteuer × (Kanton-Fuss + Gemeinde-Fuss + Kirchen-Fuss)
 */
export function kantonsteuerZg(input: {
  steuerbaresEinkommen: number;
  kategorie: ZgTarifKategorie;
  religion: "reformiert" | "katholisch" | "keine";
}): number {
  const einfache = einfacheKantonssteuerZg(
    input.steuerbaresEinkommen,
    input.kategorie
  );
  const kirchenSatz = ZG_KIRCHENSTEUER[input.religion];
  const steuerfuss =
    ZG_STEUERFUSS_KANTON + ZG_STEUERFUSS_STADT_ZUG + kirchenSatz;
  return einfache * steuerfuss;
}

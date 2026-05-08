/**
 * Bundessteuer (DBG) — Tarife Stand 2024 (gilt auch 2025, Anpassung erfolgt
 * nicht jährlich).
 *
 * Quelle: ESTV / DBG-Verordnung. Offizielle Tarife unter
 * https://www.estv.admin.ch/estv/de/home/direkte-bundessteuer/
 *
 * Zwei Tarife:
 * - Tarif A (Einzeltarif): Alleinstehende, Geschiedene, Verwitwete ohne Kinder
 * - Tarif B (Verheiratetentarif): Ehepaare, eingetragene Partnerschaften,
 *   Alleinerziehende mit Kindern
 *
 * Vereinfachung: Kinderabzug noch nicht modelliert (CHF 6'700 / Kind ab DBG).
 *
 * Plafond: Maximaler effektiver Steuersatz für hohe Einkommen ist 11.5% —
 * automatisch durch die letzte Stufe abgedeckt.
 */

interface TarifStufe {
  /** Untere Grenze des steuerbaren Einkommens (exklusive). */
  von: number;
  /** Steuer am unteren Ende der Stufe (= Steuer für `von`). */
  basisbetrag: number;
  /** Marginalsatz oberhalb von `von` (z.B. 0.0077 = 0.77%). */
  marginalsatz: number;
}

/** DBG-Tarif Einzelpersonen, Stand 2024. */
const DBG_TARIF_EINZEL: TarifStufe[] = [
  { von: 0, basisbetrag: 0, marginalsatz: 0 },
  { von: 14_500, basisbetrag: 0, marginalsatz: 0.0077 },
  { von: 31_600, basisbetrag: 131.65, marginalsatz: 0.0088 },
  { von: 41_400, basisbetrag: 217.9, marginalsatz: 0.0264 },
  { von: 55_200, basisbetrag: 582.2, marginalsatz: 0.0297 },
  { von: 72_500, basisbetrag: 1_095.1, marginalsatz: 0.0594 },
  { von: 78_100, basisbetrag: 1_427.8, marginalsatz: 0.066 },
  { von: 103_600, basisbetrag: 3_110.8, marginalsatz: 0.088 },
  { von: 134_600, basisbetrag: 5_838.8, marginalsatz: 0.11 },
  { von: 176_000, basisbetrag: 10_392.8, marginalsatz: 0.132 },
  { von: 755_200, basisbetrag: 86_843.2, marginalsatz: 0.115 },
];

/** DBG-Tarif Verheiratete, Stand 2024. */
const DBG_TARIF_VERHEIRATET: TarifStufe[] = [
  { von: 0, basisbetrag: 0, marginalsatz: 0 },
  { von: 28_800, basisbetrag: 0, marginalsatz: 0.01 },
  { von: 51_800, basisbetrag: 230, marginalsatz: 0.02 },
  { von: 59_400, basisbetrag: 382, marginalsatz: 0.03 },
  { von: 76_100, basisbetrag: 883, marginalsatz: 0.04 },
  { von: 91_400, basisbetrag: 1_495, marginalsatz: 0.05 },
  { von: 105_200, basisbetrag: 2_185, marginalsatz: 0.06 },
  { von: 117_400, basisbetrag: 2_917, marginalsatz: 0.07 },
  { von: 128_100, basisbetrag: 3_666, marginalsatz: 0.08 },
  { von: 137_200, basisbetrag: 4_394, marginalsatz: 0.09 },
  { von: 144_700, basisbetrag: 5_069, marginalsatz: 0.1 },
  { von: 150_700, basisbetrag: 5_669, marginalsatz: 0.11 },
  { von: 155_100, basisbetrag: 6_153, marginalsatz: 0.12 },
  { von: 158_000, basisbetrag: 6_501, marginalsatz: 0.13 },
  { von: 894_500, basisbetrag: 102_879, marginalsatz: 0.115 },
];

export type DbgTarifKategorie = "einzel" | "verheiratet";

/**
 * Berechnet die Bundessteuer (DBG) auf das gegebene steuerbare Einkommen.
 * Verheiratete-Tarif gilt auch für eingetragene Partnerschaften und für
 * Alleinerziehende mit Kindern (vereinfacht — letzteres aktuell nicht
 * abgebildet).
 */
export function bundessteuer(
  steuerbaresEinkommen: number,
  kategorie: DbgTarifKategorie
): number {
  if (steuerbaresEinkommen <= 0) return 0;

  const tarif =
    kategorie === "einzel" ? DBG_TARIF_EINZEL : DBG_TARIF_VERHEIRATET;

  // Höchste Stufe finden, deren `von` ≤ steuerbaresEinkommen
  let aktuelleStufe = tarif[0]!;
  for (const stufe of tarif) {
    if (steuerbaresEinkommen >= stufe.von) {
      aktuelleStufe = stufe;
    } else {
      break;
    }
  }

  const ueberschuss = steuerbaresEinkommen - aktuelleStufe.von;
  const steuer =
    aktuelleStufe.basisbetrag + ueberschuss * aktuelleStufe.marginalsatz;

  // Plafond: maximaler effektiver Satz von 11.5% für sehr hohe Einkommen
  const plafond = steuerbaresEinkommen * 0.115;
  return Math.round(Math.min(steuer, plafond));
}

/**
 * Approximation des steuerbaren Einkommens aus dem Bruttojahreseinkommen.
 *
 * In Wahrheit zieht man ab: AHV/IV/EO (5.3%), ALV (1.1%), BVG (~7%),
 * NBU (kleinem %), Berufsauslagen, Versicherungsabzüge, Pendler, Kinderabzug,
 * Säule 3a, Hypothekarzinsen etc.
 *
 * Vereinfachte Daumenregel: ~85% des Brutto bei mittlerem Einkommen, weniger
 * bei sehr hohem (mehr Pauschalabzüge). Etappe 4.6 ergänzt mit echten Abzügen.
 */
export function bruttoZuSteuerbarApprox(brutto: number): number {
  return Math.round(brutto * 0.85);
}

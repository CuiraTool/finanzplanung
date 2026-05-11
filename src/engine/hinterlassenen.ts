/**
 * Hinterlassenen-Leistungen — AHV (1. Säule) + BVG (2. Säule).
 *
 * Rechtsgrundlagen:
 *  - AHV Art. 23ff: Witwen-/Witwer-Rente 80 % der Altersrente, Waisenrente 40 %
 *  - BVG Art. 19, 19a, 20: Witwen-/Witwer-Rente 60 % der Altersrente,
 *    Waisenrente 20 % je Kind
 *  - BVG-Reform 2024: Witwer gleich gestellt mit Witwen (Bundesgerichts-Praxis
 *    seit BGE 139 V 1 / EMRK-Konformität)
 *
 * Voraussetzungen Witwen-/Witwer-Rente AHV (Art. 24):
 *  - mindestens ein Kind im Haushalt (jedes Alter) ODER
 *  - 45+ Jahre alt UND mindestens 5 Jahre verheiratet
 *  Sonst: einmalige Witwenabfindung (1-3 Jahresrenten).
 *
 * Voraussetzungen BVG-Rente (kantonale Reglemente, hier Standard):
 *  - Kind unterhaltsberechtigt ODER
 *  - 45+ Jahre alt UND ≥5 Jahre Ehe
 *  Sonst: einmalige Kapitalabfindung 3 Jahresrenten (Reglement-abhängig).
 *
 * Plafonierung:
 *  - AHV-Witwen-Rente max 80 % × Maximalrente einzeln = CHF 24'192 (2025)
 *  - Kombiniert mit eigener Altersrente: Plafond 100 % × Maximalrente einzeln
 *    (sehr verbreiteter Härtefall; eigene Rente kürzt Witwenrente)
 *
 * Waisenrente:
 *  - AHV: 40 % der Altersrente pro Halbwaise, 60 % bei Vollwaise
 *  - BVG: 20 % pro Halbwaise, 40 % bei Vollwaise
 *  - Bezug bis Alter 18, bei Ausbildung bis 25
 */

const AHV_WITWEN_PROZENT = 0.8;
const AHV_HALBWAISEN_PROZENT = 0.4;
const AHV_VOLLWAISEN_PROZENT = 0.6;
const BVG_WITWEN_PROZENT = 0.6;
const BVG_HALBWAISEN_PROZENT = 0.2;
const BVG_VOLLWAISEN_PROZENT = 0.4;

/** BSV 2025: Max-Einzelrente CHF 30'240 → Witwenrente-Plafond 80 % = 24'192. */
const AHV_MAX_EINZELRENTE = 30_240;
const AHV_WITWENRENTE_PLAFOND = AHV_MAX_EINZELRENTE * AHV_WITWEN_PROZENT; // 24'192

export interface HinterlassenenInput {
  /** Hypothetische Altersrente des Verstorbenen (AHV) pro Jahr. */
  ahvAltersrenteVerstorbener: number;
  /** Hypothetische BVG-Altersrente des Verstorbenen pro Jahr. */
  bvgAltersrenteVerstorbener: number;
  /**
   * Alter des überlebenden Partners zum Todeszeitpunkt. Relevant für
   * AHV-Voraussetzung 45+.
   */
  alterUeberlebender: number;
  /**
   * Anzahl der Ehejahre. Relevant für AHV-Voraussetzung 5+ J. Ehe.
   * Bei Konkubinat: 0 (kein AHV-Witwen-Anspruch, nur evtl. BVG je
   * Reglement).
   */
  ehejahre: number;
  /** Eigene Altersrente des Überlebenden — kürzt Witwenrente quotal. */
  eigeneAhvAltersrente?: number;
  /**
   * Halbwaisen (ein Elternteil verstorben, anderer lebt). Aktuell typisch
   * — bei Vollwaisen (beide Eltern tot) andere Sätze.
   */
  halbwaisen: number;
  /** Vollwaisen (beide Eltern tot). Selten. */
  vollwaisen?: number;
}

export interface HinterlassenenOutput {
  /** AHV-Witwen-/Witwer-Rente pro Jahr. */
  ahvWitwenrente: number;
  /** AHV-Waisenrenten pro Jahr (Σ über alle Kinder). */
  ahvWaisenrenten: number;
  /** BVG-Witwen-/Witwer-Rente pro Jahr. */
  bvgWitwenrente: number;
  /** BVG-Waisenrenten pro Jahr (Σ). */
  bvgWaisenrenten: number;
  /** Total laufende Hinterlassenen-Leistungen p.a. */
  total: number;
  /** True wenn AHV-Voraussetzung erfüllt (mind. ein Kind ODER 45+ und 5 J Ehe). */
  ahvAnspruchsberechtigt: boolean;
  /** Hinweise / Bemerkungen für UI. */
  hinweise: string[];
}

export function berechneHinterlassenen(
  input: HinterlassenenInput
): HinterlassenenOutput {
  const hinweise: string[] = [];

  const hatKind = input.halbwaisen > 0 || (input.vollwaisen ?? 0) > 0;
  const erfueltDauerEhe = input.ehejahre >= 5;
  const erfueltAlter = input.alterUeberlebender >= 45;
  const ahvAnspruchsberechtigt = hatKind || (erfueltDauerEhe && erfueltAlter);

  // AHV-Witwenrente
  let ahvWitwenrente = 0;
  if (ahvAnspruchsberechtigt) {
    const brutto = input.ahvAltersrenteVerstorbener * AHV_WITWEN_PROZENT;
    // Plafond auf 80 % der AHV-Maximalrente einzeln
    const nachPlafond = Math.min(brutto, AHV_WITWENRENTE_PLAFOND);
    // Wenn Überlebender eigene Altersrente hat: Plafond auf 100 % Max-Einzel.
    // Vereinfachung: kombinierte Rente max AHV-Maximalrente einzeln (echte
    // Regel ist Komplex bei Vorbezug/Aufschub).
    if (input.eigeneAhvAltersrente && input.eigeneAhvAltersrente > 0) {
      const kombiniert = nachPlafond + input.eigeneAhvAltersrente;
      if (kombiniert > AHV_MAX_EINZELRENTE) {
        ahvWitwenrente = Math.max(0, AHV_MAX_EINZELRENTE - input.eigeneAhvAltersrente);
        hinweise.push(
          `AHV: Witwen-/Altersrenten-Kombination plafoniert auf CHF ${formatChf(AHV_MAX_EINZELRENTE)} (Max-Einzelrente)`
        );
      } else {
        ahvWitwenrente = nachPlafond;
      }
    } else {
      ahvWitwenrente = nachPlafond;
    }
  } else {
    hinweise.push(
      "AHV-Witwen-Voraussetzung nicht erfüllt (mind. ein Kind ODER 45+ und 5 J Ehe). Anstatt Rente: Witwenabfindung 1-3 Jahresrenten."
    );
  }

  // AHV-Waisenrenten (kein Voraussetzungs-Check, kommt mit Kind automatisch)
  const ahvWaisenrenten =
    input.ahvAltersrenteVerstorbener *
    (input.halbwaisen * AHV_HALBWAISEN_PROZENT +
      (input.vollwaisen ?? 0) * AHV_VOLLWAISEN_PROZENT);

  // BVG-Witwenrente (Reglement-Annahme: gleicher Voraussetzungs-Block)
  const bvgWitwenrente = ahvAnspruchsberechtigt
    ? input.bvgAltersrenteVerstorbener * BVG_WITWEN_PROZENT
    : 0;

  // BVG-Waisenrenten
  const bvgWaisenrenten =
    input.bvgAltersrenteVerstorbener *
    (input.halbwaisen * BVG_HALBWAISEN_PROZENT +
      (input.vollwaisen ?? 0) * BVG_VOLLWAISEN_PROZENT);

  if (input.ehejahre === 0 && !hatKind) {
    hinweise.push(
      "Konkubinat ohne Kinder: keine AHV-Hinterlassenenrente, BVG nur wenn Reglement Lebenspartner zulässt."
    );
  }

  return {
    ahvWitwenrente: Math.round(ahvWitwenrente),
    ahvWaisenrenten: Math.round(ahvWaisenrenten),
    bvgWitwenrente: Math.round(bvgWitwenrente),
    bvgWaisenrenten: Math.round(bvgWaisenrenten),
    total: Math.round(
      ahvWitwenrente + ahvWaisenrenten + bvgWitwenrente + bvgWaisenrenten
    ),
    ahvAnspruchsberechtigt,
    hinweise,
  };
}

function formatChf(n: number): string {
  return new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 }).format(n);
}

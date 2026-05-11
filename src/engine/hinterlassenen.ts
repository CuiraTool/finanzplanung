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
 * Kein expliziter Plafond auf Witwenrente:
 *  - Die hypothetische AHV-Altersrente des Verstorbenen ist bereits durch
 *    Skala 44 plafoniert (Max-Einzelrente CHF 30'240). 80 % davon = CHF
 *    24'192 ist das natürliche Maximum, aber kein zusätzlicher Cap nötig.
 *  - Kombination mit eigener AHV-Altersrente: AHV zahlt NICHT beide
 *    Renten parallel. Es wird der HÖHERE Betrag ausgerichtet (eigene
 *    Altersrente ODER Witwenrente, je nachdem, was günstiger ist —
 *    Art. 24b AHVG). Im Tool zeigen wir die Differenz als
 *    "zusätzliches Einkommen vs. nur eigene Rente".
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

// Kein Cap auf Witwenrente — natürliches Maximum ergibt sich aus der
// Skala-44-Plafonierung der hypothetischen Altersrente des Verstorbenen.

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

  // AHV-Witwenrente — 80 % der hypothetischen Altersrente des Verstorbenen.
  // Kein zusätzlicher Plafond (natürliches Max ergibt sich aus Skala 44).
  let ahvWitwenrente = 0;
  if (ahvAnspruchsberechtigt) {
    const witwenAnspruch =
      input.ahvAltersrenteVerstorbener * AHV_WITWEN_PROZENT;

    // Art. 24b AHVG: bezieht Überlebender bereits eigene Altersrente,
    // wird nur die HÖHERE der beiden Renten ausbezahlt. Witwenrente kommt
    // also nur zur Wirkung, wenn sie höher ist als die eigene Altersrente —
    // und auch dann nur als "zusätzlicher" Betrag = max(0, witwen − eigene).
    if (input.eigeneAhvAltersrente && input.eigeneAhvAltersrente > 0) {
      if (witwenAnspruch > input.eigeneAhvAltersrente) {
        ahvWitwenrente = witwenAnspruch - input.eigeneAhvAltersrente;
        hinweise.push(
          `AHV Art. 24b: nur höhere Rente wird ausbezahlt — Witwenrente (CHF ${formatChf(witwenAnspruch)}) ersetzt eigene Altersrente (CHF ${formatChf(input.eigeneAhvAltersrente)}), Differenz CHF ${formatChf(ahvWitwenrente)} fliesst zusätzlich.`
        );
      } else {
        ahvWitwenrente = 0;
        hinweise.push(
          `AHV Art. 24b: eigene Altersrente (CHF ${formatChf(input.eigeneAhvAltersrente)}) übersteigt Witwenanspruch (CHF ${formatChf(witwenAnspruch)}) — Witwenrente entfällt, eigene Rente läuft weiter.`
        );
      }
    } else {
      ahvWitwenrente = witwenAnspruch;
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

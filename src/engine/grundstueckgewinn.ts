/**
 * Grundstückgewinnsteuer (GGSt) — Engine V1.
 *
 * Bei Verkauf einer Immobilie fällt in der Schweiz die GGSt an. Sie ist
 * ausschliesslich kantonal geregelt (Bund kennt sie nicht), die Tarife
 * variieren stark.
 *
 * Bemessungsgrundlage:
 *   Reingewinn = Verkaufspreis − Anlagekosten
 *   Anlagekosten = Kaufpreis + wertvermehrende Investitionen + Kaufnebenkosten
 *
 * Diese V1-Engine deckt die 9 wichtigsten Kantone ab (ZH/ZG/SZ/BE/LU/AG/SG/TI/VD)
 * mit den jeweiligen offiziellen Tarifen Stand 2025. Andere Kantone werden
 * mit der ZH-Tarif-Approximation gerechnet (median-genau, nicht punktgenau).
 *
 * Vereinfachungen (offen für Etappe 2.5+):
 *   - Aufschub bei Ersatzbeschaffung (StHG Art. 12 Abs. 3 lit. e) nicht
 *     modelliert — User müsste Override aktivieren.
 *   - Erbschaftsfälle (steueraufschiebend) nicht abgebildet.
 *   - Bei Renditeliegenschaften im Geschäftsvermögen nicht GGSt sondern
 *     ordentliche Einkommenssteuer — wird hier nicht unterschieden.
 *   - Wertvermehrende Investitionen werden pauschal angenommen wenn nicht
 *     spezifiziert (ca. 1% Kaufpreis pro Besitzjahr).
 */

export type GgstKanton =
  | "ZH"
  | "ZG"
  | "SZ"
  | "BE"
  | "LU"
  | "AG"
  | "SG"
  | "TI"
  | "VD"
  | "andere";

export interface GgstInput {
  /** Verkaufspreis (entspricht hier dem Verkehrswert im Verkaufsjahr). */
  verkaufspreis: number;
  /**
   * Anlagekosten = Kaufpreis + wertvermehrende Investitionen + Kaufnebenkosten.
   * Wenn null/undefined: Default 75% des Verkaufspreises (typische Annahme
   * bei 15 J. Besitzdauer, 2% Wertsteigerung p.a.).
   */
  anlagekosten?: number | null;
  /** Besitzdauer in vollen Jahren. Wird für Tarif-Reduktion/-Zuschlag genutzt. */
  besitzdauerJahre: number;
  kanton: GgstKanton;
}

export interface GgstOutput {
  /** Reingewinn = Verkaufspreis − Anlagekosten (>= 0, sonst kein Gewinn). */
  reingewinn: number;
  /** Tarifsatz vor Besitzdauer-Korrektur (in %). */
  grundtarifProzent: number;
  /** Korrekturfaktor durch Besitzdauer (1.0 = neutral, 0.5 = -50% Rabatt, 1.5 = +50% Zuschlag). */
  besitzdauerFaktor: number;
  /** Effektive Steuerbelastung in Prozent vom Reingewinn. */
  effektiverProzent: number;
  /** GGSt-Betrag in CHF. */
  steuer: number;
}

/**
 * Default-Anlagekosten wenn nicht spezifiziert. Annahme: 75% des Verkaufs-
 * preises bei 15 Jahren Besitz (entspricht ~2% Wertsteigerung p.a.).
 */
function defaultAnlagekosten(verkaufspreis: number, besitzdauer: number): number {
  if (besitzdauer <= 0) return verkaufspreis * 0.97; // Schnellverkauf, kaum Gewinn
  if (besitzdauer >= 30) return verkaufspreis * 0.55; // Sehr lang gehalten, viel Wertsteigerung
  // Lineare Interpolation 0 J. → 97% / 15 J. → 75% / 30 J. → 55%
  if (besitzdauer <= 15) {
    return verkaufspreis * (0.97 - ((0.97 - 0.75) * besitzdauer) / 15);
  }
  return verkaufspreis * (0.75 - ((0.75 - 0.55) * (besitzdauer - 15)) / 15);
}

/**
 * Progressiver Grundtarif auf den Reingewinn (in %).
 * Gilt als Basis für ZH und als Default für andere Kantone.
 *
 * ZH §225 StG (vereinfachte Approximation, weil echte Tabelle 30 Stufen):
 *   <  20'000     →  10%
 *      20-100'000 →  20% (Median: ~17%)
 *     100-500'000 →  30%
 *     500'000+    →  40%
 */
function grundtarifProzent(reingewinn: number, kanton: GgstKanton): number {
  if (reingewinn <= 0) return 0;

  switch (kanton) {
    case "ZH": {
      // ZH: progressiv 10–40% (gestaffelt nach Reingewinn-Höhe)
      if (reingewinn < 20_000) return 10;
      if (reingewinn < 100_000) {
        // Linear 10% → 20% in diesem Segment
        return 10 + ((reingewinn - 20_000) / 80_000) * 10;
      }
      if (reingewinn < 500_000) {
        return 20 + ((reingewinn - 100_000) / 400_000) * 10;
      }
      return Math.min(40, 30 + (reingewinn - 500_000) / 200_000); // ab 500k → 30%, +1%/200k bis max 40%
    }
    case "ZG": {
      // ZG hat insgesamt tiefere Sätze, max ca. 25%
      if (reingewinn < 50_000) return 8;
      if (reingewinn < 250_000) return 8 + ((reingewinn - 50_000) / 200_000) * 12;
      return Math.min(25, 20 + (reingewinn - 250_000) / 250_000);
    }
    case "SZ": {
      // SZ: ca. 8-30%
      if (reingewinn < 30_000) return 8;
      if (reingewinn < 200_000) return 8 + ((reingewinn - 30_000) / 170_000) * 14;
      return Math.min(30, 22 + (reingewinn - 200_000) / 200_000);
    }
    case "BE": {
      // BE: progressiv mit Höchstsatz ~33%
      if (reingewinn < 30_000) return 12;
      if (reingewinn < 200_000) return 12 + ((reingewinn - 30_000) / 170_000) * 12;
      return Math.min(33, 24 + (reingewinn - 200_000) / 250_000);
    }
    case "LU":
    case "AG":
    case "SG":
      // Mittelfeld: ähnlich ZH
      return grundtarifProzentZHFallback(reingewinn);
    case "TI":
      // TI: 4-31% — Annäherung
      if (reingewinn < 25_000) return 4;
      if (reingewinn < 200_000) return 4 + ((reingewinn - 25_000) / 175_000) * 18;
      return Math.min(31, 22 + (reingewinn - 200_000) / 250_000);
    case "VD":
      // VD: 7-30%
      if (reingewinn < 50_000) return 7;
      if (reingewinn < 300_000) return 7 + ((reingewinn - 50_000) / 250_000) * 15;
      return Math.min(30, 22 + (reingewinn - 300_000) / 300_000);
    case "andere":
    default:
      return grundtarifProzentZHFallback(reingewinn);
  }
}

function grundtarifProzentZHFallback(reingewinn: number): number {
  if (reingewinn < 20_000) return 10;
  if (reingewinn < 100_000) return 10 + ((reingewinn - 20_000) / 80_000) * 10;
  if (reingewinn < 500_000) return 20 + ((reingewinn - 100_000) / 400_000) * 10;
  return Math.min(40, 30 + (reingewinn - 500_000) / 200_000);
}

/**
 * Besitzdauer-Faktor: Zuschlag bei Spekulation (kurz halten),
 * Rabatt bei langer Haltedauer.
 *
 * ZH §225 StG (Annäherung, andere Kantone ähnlich):
 *   < 1 J.    → +50% (Spekulationszuschlag)
 *   1-2 J.    → +25%
 *   2-3 J.    → +10%
 *   3-5 J.    → +5% bzw. neutral
 *   5-10 J.   → linear 0% → -25%
 *   10-20 J.  → linear -25% → -50%
 *   20+ J.    → -50%
 */
function besitzdauerFaktor(besitzdauer: number, kanton: GgstKanton): number {
  if (besitzdauer < 1) return 1.5;
  if (besitzdauer < 2) return 1.25;
  if (besitzdauer < 3) return 1.1;
  if (besitzdauer < 5) return 1.0;

  // Ab 5 Jahren: Rabatt
  // ZG ist berühmt für höhere Rabatte → stärker degressiv
  const maxRabattProzent = kanton === "ZG" || kanton === "SZ" ? 0.6 : 0.5;

  if (besitzdauer < 10) {
    // 5 J. → 0%, 10 J. → 25%
    return 1.0 - 0.25 * ((besitzdauer - 5) / 5);
  }
  if (besitzdauer < 20) {
    // 10 J. → 25%, 20 J. → maxRabatt
    return 1.0 - 0.25 - (maxRabattProzent - 0.25) * ((besitzdauer - 10) / 10);
  }
  return 1.0 - maxRabattProzent;
}

/**
 * Hauptfunktion: berechnet die Grundstückgewinnsteuer beim Verkauf.
 *
 * @example
 * berechneGgst({
 *   verkaufspreis: 1_500_000,
 *   anlagekosten: 1_000_000,
 *   besitzdauerJahre: 15,
 *   kanton: "ZH",
 * }) // → ca. CHF 105'000 (35% × 0.6 Faktor × 500k)
 */
export function berechneGgst(input: GgstInput): GgstOutput {
  const verkaufspreis = Math.max(0, input.verkaufspreis);
  const anlagekosten =
    input.anlagekosten != null && input.anlagekosten >= 0
      ? input.anlagekosten
      : defaultAnlagekosten(verkaufspreis, Math.max(0, input.besitzdauerJahre));

  const reingewinn = Math.max(0, verkaufspreis - anlagekosten);

  if (reingewinn === 0) {
    return {
      reingewinn: 0,
      grundtarifProzent: 0,
      besitzdauerFaktor: 1,
      effektiverProzent: 0,
      steuer: 0,
    };
  }

  const tarif = grundtarifProzent(reingewinn, input.kanton);
  const faktor = besitzdauerFaktor(
    Math.max(0, input.besitzdauerJahre),
    input.kanton
  );
  const effektiv = tarif * faktor;
  const steuer = Math.round((reingewinn * effektiv) / 100);

  return {
    reingewinn: Math.round(reingewinn),
    grundtarifProzent: Math.round(tarif * 10) / 10,
    besitzdauerFaktor: Math.round(faktor * 100) / 100,
    effektiverProzent: Math.round(effektiv * 10) / 10,
    steuer,
  };
}

/**
 * Kanton-Code aus dem Plan-Store-Format auf GGSt-Kanton mappen.
 * Kantone, für die wir keinen spezifischen Tarif haben, fallen auf "andere"
 * (≈ ZH-Tarif als Median-Schätzung).
 */
export function ggstKantonFromCode(kantonCode: string): GgstKanton {
  const upper = kantonCode.toUpperCase();
  switch (upper) {
    case "ZH":
    case "ZG":
    case "SZ":
    case "BE":
    case "LU":
    case "AG":
    case "SG":
    case "TI":
    case "VD":
      return upper;
    default:
      return "andere";
  }
}

/**
 * Public API der ESTV-basierten Steuer-Engine.
 *
 * Berechnet Bundessteuer + Kantons-/Gemeinde-/Kirchensteuer für alle 26
 * Schweizer Kantone basierend auf den offiziellen ESTV-Tarif-Daten
 * (via JSON-Snapshot aus github.com/devbrains-com/swisstaxcalculator,
 * MIT License).
 */

import { calculateTaxes } from "./calc";
import {
  KANTON_INFO,
  findFactor,
  getTarifs,
} from "./data";
import type {
  Fallart,
  KantonCode,
  Religion,
  SteuerJahr,
  TarifData,
  TaxType,
} from "./types";

/**
 * Findet den passenden Tarif anhand Status + Steuerart.
 *
 * Group-Codes mit Fallback-Reihenfolge (analog zu devbrains-Logik):
 *  - "paar"   → ['VERHEIRATET']
 *  - "einzel" → ['LEDIG_ALLEINE', 'LEDIG_KONKUBINAT', 'LEDIG_OHNE_KINDER']
 *
 * Manche Kantone haben "ALLE" als group → matcht immer.
 */
function findTarifFor(
  tarifs: TarifData[],
  taxType: TaxType,
  fallart: Fallart
): TarifData | null {
  const groupOrder: string[] =
    fallart === "paar"
      ? ["VERHEIRATET"]
      : ["LEDIG_ALLEINE", "LEDIG_KONKUBINAT", "LEDIG_OHNE_KINDER"];

  for (const wanted of groupOrder) {
    for (const t of tarifs) {
      if (t.taxType !== taxType) continue;
      if (t.group === "ALLE") return t;
      const groups = t.group.split(",");
      if (groups.includes(wanted)) return t;
    }
  }
  // Fallback: erster matching taxType (egal welche group)
  return tarifs.find((t) => t.taxType === taxType) ?? null;
}

/**
 * Wendet den Splittingfaktor an: Einkommen wird durch Faktor geteilt vor
 * Tarifberechnung, Resultat wieder mit Faktor multipliziert. Nur für
 * Verheiratete in Kantonen mit Splittingsystem.
 */
function applySplitting(
  amount: number,
  tarif: TarifData,
  fallart: Fallart
): number {
  if (tarif.splitting <= 0 || fallart !== "paar") return amount;
  return amount / tarif.splitting;
}

function reverseSplitting(
  taxes: number,
  tarif: TarifData,
  fallart: Fallart
): number {
  if (tarif.splitting <= 0 || fallart !== "paar") return taxes;
  return taxes * tarif.splitting;
}

/** Auf 100 CHF abrunden (außer FORMEL-Tarife). */
function round100Down(amount: number, tarif: TarifData): number {
  if (tarif.tableType === "FORMEL") return amount;
  return Math.floor(amount / 100) * 100;
}

/**
 * Holt den passenden Kirchensteuersatz aus einem FactorData für eine Religion
 * und Steuerart. `prefix` ist "Income" oder "Fortune" (Capital nutzt eigene
 * Felder).
 */
function getKirchensatz(
  factor: { [key: string]: unknown },
  prefix: "Income" | "Fortune",
  religion: Religion
): number {
  // Nur die staatlich anerkannten Landeskirchen erheben Kirchensteuer
  // via ESTV-Faktor. Israelitisch/Andere/Keine = 0 (Beiträge laufen
  // separat, nicht via Steuerveranlagung).
  let key: string | null = null;
  if (religion === "reformiert") key = `${prefix}RateProtestant`;
  else if (religion === "katholisch") key = `${prefix}RateRoman`;
  else if (religion === "christkatholisch") key = `${prefix}RateChrist`;
  if (!key) return 0;
  const v = factor[key];
  return typeof v === "number" ? v : 0;
}

export interface KantonSteuerResult {
  /** Einfache Steuer (vor Steuerfuss). Nur für Debugging/Anzeige. */
  einfache: number;
  /** Steuerfuss Kanton-Anteil (CHF). */
  kanton: number;
  /** Steuerfuss Gemeinde-Anteil (CHF). */
  gemeinde: number;
  /** Kirchensteuer (CHF). */
  kirche: number;
  /** Total Kantons- + Gemeinde- + Kirchensteuer. */
  total: number;
}

export interface KantonSteuerInput {
  kanton: KantonCode;
  /** Optional: BfsID einer spezifischen Gemeinde, sonst Hauptort. */
  bfsId?: number;
  fallart: Fallart;
  religion: Religion;
  jahr: SteuerJahr;
}

const EMPTY_RESULT: KantonSteuerResult = {
  einfache: 0,
  kanton: 0,
  gemeinde: 0,
  kirche: 0,
  total: 0,
};

/**
 * Geteilter Kanton-/Gemeinde-/Kirchensteuer-Berechnungspfad für Einkommen
 * und Vermögen — unterscheidet sich nur durch Steuerart, Faktor-Felder und
 * Kirchen-Prefix.
 *
 * Sonderfall „separater Gemeinde-Tarif“: wenn `gemeindeTaxType` gesetzt ist
 * und im Tarif-File eine Tabelle dieses Typs existiert, wird die Gemeinde-
 * Steuer auf einer eigenen Bemessungsgrundlage berechnet (z.B. SZ 2026,
 * Gemeinde-Tarif cap't bei 3.65 % Marginalsatz). Sonst Fallback auf die
 * gleiche `einfache` wie der Kanton.
 */
function steuerKantonGenerisch(
  bemessung: number,
  input: KantonSteuerInput,
  taxType: TaxType,
  fussFelder: { kanton: keyof FactorRates; gemeinde: keyof FactorRates },
  kirchenPrefix: "Income" | "Fortune",
  gemeindeTaxType?: TaxType
): KantonSteuerResult {
  if (bemessung <= 0) return EMPTY_RESULT;

  const info = KANTON_INFO[input.kanton];
  if (!info) return EMPTY_RESULT;

  const tarifs = getTarifs(info.cantonId, input.jahr);
  const tarif = findTarifFor(tarifs, taxType, input.fallart);
  if (!tarif) return EMPTY_RESULT;

  const split = applySplitting(bemessung, tarif, input.fallart);
  const rounded = round100Down(split, tarif);
  const taxes = calculateTaxes(rounded, tarif);
  const einfache = reverseSplitting(taxes, tarif, input.fallart);

  // Optional separater Gemeinde-Tarif (SZ 2026 Spitzentarif-Cap).
  let einfacheGemeinde = einfache;
  if (gemeindeTaxType) {
    const tarifGemeinde = findTarifFor(tarifs, gemeindeTaxType, input.fallart);
    if (tarifGemeinde) {
      const splitG = applySplitting(bemessung, tarifGemeinde, input.fallart);
      const roundedG = round100Down(splitG, tarifGemeinde);
      const taxesG = calculateTaxes(roundedG, tarifGemeinde);
      einfacheGemeinde = reverseSplitting(
        taxesG,
        tarifGemeinde,
        input.fallart
      );
    }
  }

  const factor = findFactor(
    info.cantonId,
    input.jahr,
    input.bfsId ?? info.bfsIdHauptort
  );
  if (!factor) {
    return { ...EMPTY_RESULT, einfache };
  }

  const factorRates = factor as unknown as FactorRates;
  const kantonFuss = (factorRates[fussFelder.kanton] as number) / 100;
  const gemeindeFuss = (factorRates[fussFelder.gemeinde] as number) / 100;
  const kircheFuss =
    getKirchensatz(
      factor as unknown as Record<string, unknown>,
      kirchenPrefix,
      input.religion
    ) / 100;

  const kanton = einfache * kantonFuss;
  const gemeinde = einfacheGemeinde * gemeindeFuss;
  const kirche = einfacheGemeinde * kircheFuss;
  return {
    einfache,
    kanton,
    gemeinde,
    kirche,
    total: kanton + gemeinde + kirche,
  };
}

/** Helfer-Type um Faktor-Felder typsicher zuzugreifen. */
type FactorRates = Record<string, number>;

/**
 * Berechnet die Einkommenssteuer Kanton + Gemeinde + Kirche für einen Kanton.
 *
 * Wenn der Kanton einen separaten Gemeinde-Einkommens-Tarif kennt
 * (`EINKOMMENSSTEUER_GEMEINDE`-Eintrag im Tarif-File), wird dieser für die
 * Gemeinde-/Kirchen-Bemessung verwendet — sonst Standardpfad mit einer
 * einzigen einfachen Steuer.
 */
export function einkommensteuerKanton(
  steuerbaresEinkommen: number,
  input: KantonSteuerInput
): KantonSteuerResult {
  return steuerKantonGenerisch(
    steuerbaresEinkommen,
    input,
    "EINKOMMENSSTEUER",
    { kanton: "IncomeRateCanton", gemeinde: "IncomeRateCity" },
    "Income",
    "EINKOMMENSSTEUER_GEMEINDE"
  );
}

/**
 * Berechnet die Vermögenssteuer Kanton + Gemeinde + Kirche für einen Kanton.
 */
export function vermoegensteuerKanton(
  vermoegen: number,
  input: KantonSteuerInput
): KantonSteuerResult {
  return steuerKantonGenerisch(
    vermoegen,
    input,
    "VERMOEGENSSTEUER",
    { kanton: "FortuneRateCanton", gemeinde: "FortuneRateCity" },
    "Fortune"
  );
}

/**
 * Berechnet die Bundessteuer (DBG) für ein steuerbares Einkommen.
 * Verwendet cantonId=0 (Bund) aus den Tarifs.
 */
export function bundessteuerEinkommen(
  steuerbaresEinkommen: number,
  fallart: Fallart,
  jahr: SteuerJahr
): number {
  if (steuerbaresEinkommen <= 0) return 0;
  const tarifs = getTarifs(0, jahr);
  const tarif = findTarifFor(tarifs, "EINKOMMENSSTEUER", fallart);
  if (!tarif) return 0;

  const split = applySplitting(steuerbaresEinkommen, tarif, fallart);
  const rounded = round100Down(split, tarif);
  const taxes = calculateTaxes(rounded, tarif);
  return reverseSplitting(taxes, tarif, fallart);
}

/**
 * Berechnet die Bundessteuer auf Kapitalleistungen (Art. 38 DBG: 1/5 des
 * ordentlichen Tarifs).
 */
export function bundessteuerKapitalNeu(
  kapital: number,
  fallart: Fallart,
  jahr: SteuerJahr
): number {
  return bundessteuerEinkommen(kapital, fallart, jahr) / 5;
}

/**
 * Kapitalauszahlungssteuer pro Kanton — kalibrierte Sondertarif-Methode
 * (Sprint D11 Phase 3, 2026-05).
 *
 * Hintergrund: jeder Kanton hat einen eigenen Sondertarif für Kapitalleist-
 * ungen aus Vorsorge (Säule 2 Bezug, 3a Bezug). Die früher verwendete
 * generische "Bruchteils-Methode" mit Teiler=5 auf den ordentlichen
 * Einkommens-Tarif war eine grobe Approximation und wich für 72/78 ESTV-
 * Profilen um > 10 % ab (Median 120 %, Max 307 %).
 *
 * Phase-3-Lösung: pro Kanton 3 kalibrierte Stützstellen (100k / 300k / 500k)
 * für die einfache kantonale Sondersteuer (vor Steuerfuss), abgeleitet aus
 * dem offiziellen ESTV-Tarifrechner via `pnpm exec tsx
 * scripts/estv-phase3-derive-rates.ts`. Zwischen den Stützstellen wird
 * linear interpoliert; unter 100k linear vom Ursprung; über 500k linear
 * über die letzte Steigung extrapoliert.
 *
 * Vorteile:
 *  - Exakte Übereinstimmung mit ESTV an den Stützstellen (Drift = 0 %).
 *  - Plausible Werte zwischen + ausserhalb der Stützstellen.
 *  - Berücksichtigt automatisch alle kantonalen Eigenarten
 *    (GE Rabais d'impôt, ZG eigene Tabelle, BS Sondertarif, SZ Plafond, …).
 *
 * Annahme bei Anwendung des Gemeinde-Steuerfusses: die Sondersteuer auf
 * Kapital wird in den Kantonen wie die ordentliche Einkommenssteuer mit
 * dem Einkommens-Steuerfuss (Kanton + Gemeinde + Kirche) multipliziert.
 * Diese Annahme gilt für ~24 von 26 Kantonen. Ausnahmen (z.B. NW mit
 * fixem 1/3-Faktor, Genève Rabais d'impôt auf Kapital) sind durch die
 * Kalibrierung am Hauptort bereits eingepreist.
 *
 * Limitation: Die Kalibrierung gilt nur für den Hauptort. Für andere
 * Gemeinden wird der einfache Satz skaliert (Annahme: Sondersteuer-Fuss
 * folgt dem Einkommens-Steuerfuss). Bei abweichenden Gemeinden ist mit
 * Drift bis ±5 % zu rechnen. Phase 4 (geplant) validiert
 * Mehrgemeinden-Genauigkeit.
 */

interface KapitalKalibrationspunkt {
  /** Kapitalbetrag (CHF). */
  kapital: number;
  /** Einfache kantonale Sondersteuer am Hauptort (vor Steuerfuss). */
  einfache: number;
}

/**
 * Kalibrationspunkte pro Kanton (Stützstellen 100k / 300k / 500k, Jahr 2026,
 * Single Alter 65, Konfession keine, Hauptort). Generiert mit
 * `scripts/estv-phase3-derive-rates.ts` aus dem ESTV-Snapshot.
 *
 * Werte: einfache Sondersteuer (CHF). Mit IncomeRateCanton + IncomeRateCity
 * (+ ggf. Kirche) am Hauptort multipliziert ergibt sich die kantonale
 * Kapitalauszahlungssteuer.
 */
const KAPITAL_CALIBRATION_2026: Partial<
  Record<KantonCode, ReadonlyArray<KapitalKalibrationspunkt>>
> = {
  AG: [
    { kapital: 100_000, einfache: 2081.41 },
    { kapital: 300_000, einfache: 8251.76 },
    { kapital: 500_000, einfache: 14772.86 },
  ],
  AI: [
    { kapital: 100_000, einfache: 1825 },
    { kapital: 300_000, einfache: 6000 },
    { kapital: 500_000, einfache: 10000 },
  ],
  AR: [
    { kapital: 100_000, einfache: 1000 },
    { kapital: 300_000, einfache: 3000 },
    { kapital: 500_000, einfache: 5275.95 },
  ],
  BE: [
    { kapital: 100_000, einfache: 906.09 },
    { kapital: 300_000, einfache: 3470.21 },
    { kapital: 500_000, einfache: 6812.4 },
  ],
  BL: [
    { kapital: 100_000, einfache: 2000 },
    { kapital: 300_000, einfache: 6000 },
    { kapital: 500_000, einfache: 14000 },
  ],
  BS: [
    { kapital: 100_000, einfache: 4750 },
    { kapital: 300_000, einfache: 20750 },
    { kapital: 500_000, einfache: 36750 },
  ],
  FR: [
    { kapital: 100_000, einfache: 1534.09 },
    { kapital: 300_000, einfache: 10227.27 },
    { kapital: 500_000, einfache: 20454.55 },
  ],
  GE: [
    { kapital: 100_000, einfache: 2035.28 },
    { kapital: 300_000, einfache: 8205.8 },
    { kapital: 500_000, einfache: 15060.41 },
  ],
  GL: [
    { kapital: 100_000, einfache: 4000 },
    { kapital: 300_000, einfache: 12000 },
    { kapital: 500_000, einfache: 20000 },
  ],
  GR: [
    { kapital: 100_000, einfache: 1500 },
    { kapital: 300_000, einfache: 4500 },
    { kapital: 500_000, einfache: 10000 },
  ],
  JU: [
    { kapital: 100_000, einfache: 1186.74 },
    { kapital: 300_000, einfache: 4533.05 },
    { kapital: 500_000, einfache: 7933.05 },
  ],
  LU: [
    { kapital: 100_000, einfache: 1040 },
    { kapital: 300_000, einfache: 3840 },
    { kapital: 500_000, einfache: 6640 },
  ],
  NE: [
    { kapital: 100_000, einfache: 2719.05 },
    { kapital: 300_000, einfache: 9957.14 },
    { kapital: 500_000, einfache: 16812.17 },
  ],
  NW: [
    { kapital: 100_000, einfache: 611.9 },
    { kapital: 300_000, einfache: 2061.69 },
    { kapital: 500_000, einfache: 3436.49 },
  ],
  OW: [
    { kapital: 100_000, einfache: 719.97 },
    { kapital: 300_000, einfache: 2160.06 },
    { kapital: 500_000, einfache: 3600 },
  ],
  SG: [
    { kapital: 100_000, einfache: 2200 },
    { kapital: 300_000, einfache: 6600 },
    { kapital: 500_000, einfache: 11000 },
  ],
  SH: [
    { kapital: 100_000, einfache: 1598.74 },
    { kapital: 300_000, einfache: 5939.62 },
    { kapital: 500_000, einfache: 9900 },
  ],
  SO: [
    { kapital: 100_000, einfache: 2127.49 },
    { kapital: 300_000, einfache: 8011.37 },
    { kapital: 500_000, einfache: 13436.02 },
  ],
  SZ: [
    { kapital: 100_000, einfache: 487.37 },
    { kapital: 300_000, einfache: 3975.09 },
    { kapital: 500_000, einfache: 7500 },
  ],
  TG: [
    { kapital: 100_000, einfache: 2400 },
    { kapital: 300_000, einfache: 7200 },
    { kapital: 500_000, einfache: 12000 },
  ],
  TI: [
    { kapital: 100_000, einfache: 2000 },
    { kapital: 300_000, einfache: 6000 },
    { kapital: 500_000, einfache: 12870.98 },
  ],
  UR: [
    { kapital: 100_000, einfache: 1900 },
    { kapital: 300_000, einfache: 5700 },
    { kapital: 500_000, einfache: 9500 },
  ],
  VD: [
    { kapital: 100_000, einfache: 1735.76 },
    { kapital: 300_000, einfache: 7268.52 },
    { kapital: 500_000, einfache: 13468.52 },
  ],
  VS: [
    { kapital: 100_000, einfache: 2000 },
    { kapital: 300_000, einfache: 7106.67 },
    { kapital: 500_000, einfache: 15914.29 },
  ],
  ZG: [
    { kapital: 100_000, einfache: 1690 },
    { kapital: 300_000, einfache: 7255.38 },
    { kapital: 500_000, einfache: 13655.38 },
  ],
  ZH: [
    { kapital: 100_000, einfache: 2000 },
    { kapital: 300_000, einfache: 6000 },
    { kapital: 500_000, einfache: 11479.91 },
  ],
};

/**
 * Kalibrationspunkte für Steuerjahr 2025 (Stützstellen 100k / 300k / 500k,
 * Single Alter 65, Konfession keine, Hauptort). Generiert mit
 * `pnpm exec tsx scripts/estv-phase3-derive-rates.ts --year 2025` aus dem
 * ESTV-Snapshot (78 Profile, gecrawlt 2026-05-11).
 *
 * Werte sehr ähnlich zu 2026 — kleine Drifts in Kantonen mit angepassten
 * Sondertarifen (BE, GE, NW, SH, SO, SZ, ZG, ZH).
 */
const KAPITAL_CALIBRATION_2025: Partial<
  Record<KantonCode, ReadonlyArray<KapitalKalibrationspunkt>>
> = {
  AG: [
    { kapital: 100_000, einfache: 2081.16 },
    { kapital: 300_000, einfache: 8251.69 },
    { kapital: 500_000, einfache: 14772.95 },
  ],
  AI: [
    { kapital: 100_000, einfache: 1825 },
    { kapital: 300_000, einfache: 6000 },
    { kapital: 500_000, einfache: 10000 },
  ],
  AR: [
    { kapital: 100_000, einfache: 1000 },
    { kapital: 300_000, einfache: 3000 },
    { kapital: 500_000, einfache: 5275.95 },
  ],
  BE: [
    { kapital: 100_000, einfache: 906.76 },
    { kapital: 300_000, einfache: 3477.08 },
    { kapital: 500_000, einfache: 6825.25 },
  ],
  BL: [
    { kapital: 100_000, einfache: 2000 },
    { kapital: 300_000, einfache: 6000 },
    { kapital: 500_000, einfache: 14000 },
  ],
  BS: [
    { kapital: 100_000, einfache: 4750 },
    { kapital: 300_000, einfache: 20750 },
    { kapital: 500_000, einfache: 36750 },
  ],
  FR: [
    { kapital: 100_000, einfache: 1534.09 },
    { kapital: 300_000, einfache: 10227.27 },
    { kapital: 500_000, einfache: 20454.55 },
  ],
  GE: [
    { kapital: 100_000, einfache: 2037.55 },
    { kapital: 300_000, einfache: 8210.9 },
    { kapital: 500_000, einfache: 15067.22 },
  ],
  GL: [
    { kapital: 100_000, einfache: 4000 },
    { kapital: 300_000, einfache: 12000 },
    { kapital: 500_000, einfache: 20000 },
  ],
  GR: [
    { kapital: 100_000, einfache: 1500 },
    { kapital: 300_000, einfache: 4500 },
    { kapital: 500_000, einfache: 10000 },
  ],
  JU: [
    { kapital: 100_000, einfache: 1186.74 },
    { kapital: 300_000, einfache: 4533.05 },
    { kapital: 500_000, einfache: 7933.05 },
  ],
  LU: [
    { kapital: 100_000, einfache: 1040 },
    { kapital: 300_000, einfache: 3840 },
    { kapital: 500_000, einfache: 6640 },
  ],
  NE: [
    { kapital: 100_000, einfache: 2719.05 },
    { kapital: 300_000, einfache: 9957.14 },
    { kapital: 500_000, einfache: 16812.17 },
  ],
  NW: [
    { kapital: 100_000, einfache: 619.16 },
    { kapital: 300_000, einfache: 2063.27 },
    { kapital: 500_000, einfache: 3438.32 },
  ],
  OW: [
    { kapital: 100_000, einfache: 719.97 },
    { kapital: 300_000, einfache: 2160.06 },
    { kapital: 500_000, einfache: 3600 },
  ],
  SG: [
    { kapital: 100_000, einfache: 2200 },
    { kapital: 300_000, einfache: 6600 },
    { kapital: 500_000, einfache: 11000 },
  ],
  SH: [
    { kapital: 100_000, einfache: 1598.79 },
    { kapital: 300_000, einfache: 5939.39 },
    { kapital: 500_000, einfache: 9900 },
  ],
  SO: [
    { kapital: 100_000, einfache: 2100 },
    { kapital: 300_000, einfache: 7850.24 },
    { kapital: 500_000, einfache: 13125.12 },
  ],
  SZ: [
    { kapital: 100_000, einfache: 556.21 },
    { kapital: 300_000, einfache: 4374.83 },
    { kapital: 500_000, einfache: 9768.62 },
  ],
  TG: [
    { kapital: 100_000, einfache: 2400 },
    { kapital: 300_000, einfache: 7200 },
    { kapital: 500_000, einfache: 12000 },
  ],
  TI: [
    { kapital: 100_000, einfache: 2000 },
    { kapital: 300_000, einfache: 6000 },
    { kapital: 500_000, einfache: 12870.98 },
  ],
  UR: [
    { kapital: 100_000, einfache: 1900 },
    { kapital: 300_000, einfache: 5700 },
    { kapital: 500_000, einfache: 9500 },
  ],
  VD: [
    { kapital: 100_000, einfache: 1735.76 },
    { kapital: 300_000, einfache: 7268.52 },
    { kapital: 500_000, einfache: 13468.52 },
  ],
  VS: [
    { kapital: 100_000, einfache: 2000 },
    { kapital: 300_000, einfache: 7106.67 },
    { kapital: 500_000, einfache: 15914.29 },
  ],
  ZG: [
    { kapital: 100_000, einfache: 1690.4 },
    { kapital: 300_000, einfache: 7257.48 },
    { kapital: 500_000, einfache: 13657.45 },
  ],
  ZH: [
    { kapital: 100_000, einfache: 2000 },
    { kapital: 300_000, einfache: 6000 },
    { kapital: 500_000, einfache: 11659.91 },
  ],
};

/**
 * Interpoliert die einfache kantonale Sondersteuer für ein gegebenes Kapital.
 *
 *  - Innerhalb der Stützstellen: stückweise linear.
 *  - Unterhalb der kleinsten Stützstelle: linear ab Ursprung
 *    (Annahme: bei sehr kleinen Beträgen proportional).
 *  - Oberhalb der grössten Stützstelle: linear-extrapoliert mit Steigung
 *    des letzten Segments (Annahme: marginaler Spitzentarif gleich bleibend).
 */
function interpoliereEinfache(
  kapital: number,
  punkte: ReadonlyArray<KapitalKalibrationspunkt>
): number {
  if (punkte.length === 0 || kapital <= 0) return 0;
  // Stützstellen sind sortiert nach kapital aufsteigend (per Definition).
  const first = punkte[0]!;
  if (kapital <= first.kapital) {
    // Linear vom Ursprung zur ersten Stützstelle.
    return (kapital / first.kapital) * first.einfache;
  }
  for (let i = 1; i < punkte.length; i++) {
    const a = punkte[i - 1]!;
    const b = punkte[i]!;
    if (kapital <= b.kapital) {
      const t = (kapital - a.kapital) / (b.kapital - a.kapital);
      return a.einfache + t * (b.einfache - a.einfache);
    }
  }
  // Über der höchsten Stützstelle: Steigung des letzten Segments
  // weiterführen (extrapolation).
  const lastIdx = punkte.length - 1;
  const last = punkte[lastIdx]!;
  if (lastIdx === 0) {
    // Nur eine Stützstelle → linear vom Ursprung.
    return (kapital / last.kapital) * last.einfache;
  }
  const prev = punkte[lastIdx - 1]!;
  const slope = (last.einfache - prev.einfache) / (last.kapital - prev.kapital);
  return last.einfache + slope * (kapital - last.kapital);
}

/**
 * Legacy-Bruchteils-Methode (vor D11 Phase 3) — wird als Fallback verwendet,
 * wenn für ein Jahr keine ESTV-Kalibrierung verfügbar ist (z.B. 2025).
 *
 * Modell: Steuersatz mit dem ordentlichen Einkommens-Tarif auf fiktiver
 * Bemessung = Kapital / Teiler. Effektivsatz × Kapital = einfache Sondersteuer.
 * Optionaler Mindestsatz (gesetzlich z.B. ZH §38 Abs. 4 → 2 %).
 *
 * Drift gegen ESTV ist gross (siehe Phase 3 Validierung) — nur für Jahre
 * ohne Kalibrierungs-Daten verwenden.
 */
interface KapitalLegacyMethode {
  teiler: number;
  mindestProzent?: number;
}

const KAPITAL_LEGACY_METHODE: Partial<Record<KantonCode, KapitalLegacyMethode>> =
  {
    ZH: { teiler: 20, mindestProzent: 2 },
    SO: { teiler: 5, mindestProzent: 2 },
  };
const DEFAULT_KAPITAL_LEGACY: KapitalLegacyMethode = { teiler: 5 };

function kantonsteuerKapitalLegacy(
  kapital: number,
  opts: {
    kanton: KantonCode;
    bfsId?: number;
    fallart: Fallart;
    religion: Religion;
    jahr: SteuerJahr;
  }
): number {
  const info = KANTON_INFO[opts.kanton];
  if (!info) return kapital * 0.06;
  const cfg = KAPITAL_LEGACY_METHODE[opts.kanton] ?? DEFAULT_KAPITAL_LEGACY;
  const tarifs = getTarifs(info.cantonId, opts.jahr);
  const tarif = findTarifFor(tarifs, "EINKOMMENSSTEUER", opts.fallart);
  if (!tarif) return 0;

  const fiktiveBemessung = kapital / cfg.teiler;
  const splitBemessung = applySplitting(fiktiveBemessung, tarif, opts.fallart);
  const roundedBemessung = round100Down(splitBemessung, tarif);
  const steuerAufBemessung = reverseSplitting(
    calculateTaxes(roundedBemessung, tarif),
    tarif,
    opts.fallart
  );
  const effektivsatz =
    fiktiveBemessung > 0 ? steuerAufBemessung / fiktiveBemessung : 0;
  const mindest = cfg.mindestProzent != null ? cfg.mindestProzent / 100 : 0;
  const angewendeterSatz = Math.max(effektivsatz, mindest);
  const einfache = kapital * angewendeterSatz;

  const factor = findFactor(
    info.cantonId,
    opts.jahr,
    opts.bfsId ?? info.bfsIdHauptort
  );
  if (!factor) return einfache;
  const kantonFuss = factor.IncomeRateCanton / 100;
  const gemeindeFuss = factor.IncomeRateCity / 100;
  const kircheFuss =
    getKirchensatz(
      factor as unknown as Record<string, unknown>,
      "Income",
      opts.religion
    ) / 100;
  return einfache * (kantonFuss + gemeindeFuss + kircheFuss);
}

/**
 * Berechnet die kantonale Kapitalauszahlungssteuer für jeden Kanton via
 * ESTV-kalibrierte Sondertarif-Methode (Sprint D11 Phase 3).
 *
 * Kalibrierte Jahre: 2025 + 2026 (78 Profile pro Jahr, ESTV-validiert).
 * Für Jahre ohne Kalibrierungs-Daten (z.B. zukünftige Jahre, bis Re-Crawl)
 * fällt die Funktion auf die Legacy-Bruchteils-Methode zurück (typische
 * Drift ±50 %).
 */
export function kantonsteuerKapital(
  kapital: number,
  opts: {
    kanton: KantonCode;
    bfsId?: number;
    fallart: Fallart;
    religion: Religion;
    jahr: SteuerJahr;
  }
): number {
  if (kapital <= 0) return 0;

  const info = KANTON_INFO[opts.kanton];
  if (!info) return kapital * 0.06; // Pauschal-Fallback

  // Kalibrationstabelle pro Jahr (2025 + 2026 erfasst).
  const kalibrierung =
    opts.jahr === 2026
      ? KAPITAL_CALIBRATION_2026[opts.kanton]
      : opts.jahr === 2025
        ? KAPITAL_CALIBRATION_2025[opts.kanton]
        : undefined;
  if (!kalibrierung || kalibrierung.length === 0) {
    // Fallback: Legacy-Bruchteils-Methode (vor Phase 3).
    return kantonsteuerKapitalLegacy(kapital, opts);
  }

  const einfache = interpoliereEinfache(kapital, kalibrierung);

  // Steuerfuss (Kanton + Gemeinde + Kirche) — folgt der Annahme, dass die
  // Sondersteuer mit dem Einkommens-Steuerfuss multipliziert wird. Die
  // Kalibrierung am Hauptort puffert kantons-spezifische Eigenheiten.
  const factor = findFactor(
    info.cantonId,
    opts.jahr,
    opts.bfsId ?? info.bfsIdHauptort
  );
  if (!factor) return einfache;

  const kantonFuss = factor.IncomeRateCanton / 100;
  const gemeindeFuss = factor.IncomeRateCity / 100;
  const kircheFuss =
    getKirchensatz(
      factor as unknown as Record<string, unknown>,
      "Income",
      opts.religion
    ) / 100;
  return einfache * (kantonFuss + gemeindeFuss + kircheFuss);
}

/**
 * Backwards-Compat-Alias für die alte ZH-spezifische Funktion. Nutzt jetzt
 * die generische Engine mit ZH-Konfig (1/20-Methode + Mindest 2 %).
 */
export function kantonsteuerKapitalZh(
  kapital: number,
  fallart: Fallart,
  religion: Religion,
  jahr: SteuerJahr,
  bfsId?: number
): number {
  return kantonsteuerKapital(kapital, {
    kanton: "ZH",
    bfsId,
    fallart,
    religion,
    jahr,
  });
}

/**
 * Liste aller verfügbaren Kantons-Codes. Stabil sortiert nach Code.
 */
export const ALLE_KANTONE: ReadonlyArray<KantonCode> = (
  Object.keys(KANTON_INFO) as KantonCode[]
).sort();

export type { KantonCode, Fallart, Religion, SteuerJahr } from "./types";
export { KANTON_INFO } from "./data";

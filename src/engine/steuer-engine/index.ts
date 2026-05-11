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
 * Kapitalauszahlungssteuer pro Kanton — einheitliche Bruchteils-Methode.
 *
 * Modell (ZH ZStB 22.1 + analog für alle 26 Kantone):
 *  1. Steuersatz wird mit dem ordentlichen Einkommens-Tarif auf einer
 *     FIKTIVEN Bemessung = Kapital / TEILER berechnet
 *  2. Effektivsatz aus Bemessung × Kapital = einfache Staatssteuer
 *  3. Optionaler Mindestsatz (gesetzlich z.B. ZH §38 Abs. 4 → 2 %)
 *  4. × Steuerfuss (Kanton + Gemeinde + Kirche)
 *
 * Diese Methode ist effektiv flacher als "ordentliche-Steuer / 5", weil
 * der Tarif progressiv ist. Empirisch besser ESTV-deckungsgleich.
 *
 * Teiler pro Kanton (operative Praxis laut kantonalen Steuerbüchern):
 *  - ZH ZStB 22.1: Teiler 20, Mindest 2 % einfache
 *  - BE Art. 44 StG: Teiler 5
 *  - LU §59: Teiler 5
 *  - ZG §35: Teiler 5
 *  - AG §45: Teiler 5
 *  - SG §52: Teiler 5
 *  - SZ §40: Teiler 5
 *  - SO §47: Teiler 5 + Mindest 2 %
 *  - VS Art. 33: Teiler 5
 *  - VD Art. 49: Teiler 5
 *  - alle anderen Kantone: Default Teiler 5 (Standard-Bruchteils-Tarif)
 *
 * D11-Validierung: für ZH 8002 Single 100k Kapital 2026 ergibt diese Engine
 * Werte mit Drift typisch < 3 % gegenüber ESTV-Tarifrechner. Für andere
 * Kantone unverified — Sprint D11 Phase 2 ergänzt manuelle Abgleiche.
 */

interface KapitalMethode {
  teiler: number;
  mindestProzent?: number;
}

const KAPITAL_METHODE: Partial<Record<KantonCode, KapitalMethode>> = {
  // ZH: Bruchteils-Tarif 1/20 laut ZStB 22.1 + Mindestsatz 2 %
  ZH: { teiler: 20, mindestProzent: 2 },
  // SO: Mindestsatz 2 % laut §47 Abs. 4 StG
  SO: { teiler: 5, mindestProzent: 2 },
  // Alle anderen Kantone: Default Teiler 5 (keine explizite Konfig nötig,
  // wird aus DEFAULT_KAPITAL_METHODE genommen).
};
const DEFAULT_KAPITAL_METHODE: KapitalMethode = { teiler: 5 };

/**
 * Berechnet die kantonale Kapitalauszahlungssteuer für jeden Kanton via
 * konfigurierbare Sondertarif-Methode. Ersetzt die alte ZH-Spezialfunktion
 * und die /5-Approximation für andere Kantone — alle laufen jetzt durch
 * die gleiche Sondertarif-Logik.
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

  const cfg = KAPITAL_METHODE[opts.kanton] ?? DEFAULT_KAPITAL_METHODE;

  const tarifs = getTarifs(info.cantonId, opts.jahr);
  const tarif = findTarifFor(tarifs, "EINKOMMENSSTEUER", opts.fallart);
  if (!tarif) return 0;

  // 1/teiler-Methode: Steuersatz auf fiktive Bemessung
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

  // Mindestsatz wo gesetzlich vorgeschrieben (ZH §38 Abs. 4, SO §47 Abs. 4)
  const mindest =
    cfg.mindestProzent != null ? cfg.mindestProzent / 100 : 0;
  const angewendeterSatz = Math.max(effektivsatz, mindest);
  const einfache = kapital * angewendeterSatz;

  // Steuerfuss (Kanton + Gemeinde + Kirche)
  const factor = findFactor(info.cantonId, opts.jahr, opts.bfsId ?? info.bfsIdHauptort);
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

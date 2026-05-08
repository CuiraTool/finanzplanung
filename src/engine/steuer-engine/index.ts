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
  if (religion === "keine") return 0;
  const key =
    religion === "reformiert"
      ? `${prefix}RateProtestant`
      : `${prefix}RateRoman`;
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

/**
 * Berechnet die Einkommenssteuer Kanton + Gemeinde + Kirche für einen Kanton.
 */
export function einkommensteuerKanton(
  steuerbaresEinkommen: number,
  input: KantonSteuerInput
): KantonSteuerResult {
  const empty: KantonSteuerResult = {
    einfache: 0,
    kanton: 0,
    gemeinde: 0,
    kirche: 0,
    total: 0,
  };
  if (steuerbaresEinkommen <= 0) return empty;

  const info = KANTON_INFO[input.kanton];
  if (!info) return empty;

  const tarifs = getTarifs(info.cantonId, input.jahr);
  const tarif = findTarifFor(tarifs, "EINKOMMENSSTEUER", input.fallart);
  if (!tarif) return empty;

  const split = applySplitting(steuerbaresEinkommen, tarif, input.fallart);
  const rounded = round100Down(split, tarif);
  const taxes = calculateTaxes(rounded, tarif);
  const einfache = reverseSplitting(taxes, tarif, input.fallart);

  const factor = findFactor(
    info.cantonId,
    input.jahr,
    input.bfsId ?? info.bfsIdHauptort
  );
  if (!factor) {
    return { ...empty, einfache };
  }

  const kantonFuss = factor.IncomeRateCanton / 100;
  const gemeindeFuss = factor.IncomeRateCity / 100;
  const kircheFuss =
    getKirchensatz(
      factor as unknown as Record<string, unknown>,
      "Income",
      input.religion
    ) / 100;

  const kanton = einfache * kantonFuss;
  const gemeinde = einfache * gemeindeFuss;
  const kirche = einfache * kircheFuss;
  return {
    einfache,
    kanton,
    gemeinde,
    kirche,
    total: kanton + gemeinde + kirche,
  };
}

/**
 * Berechnet die Vermögenssteuer Kanton + Gemeinde + Kirche für einen Kanton.
 */
export function vermoegensteuerKanton(
  vermoegen: number,
  input: KantonSteuerInput
): KantonSteuerResult {
  const empty: KantonSteuerResult = {
    einfache: 0,
    kanton: 0,
    gemeinde: 0,
    kirche: 0,
    total: 0,
  };
  if (vermoegen <= 0) return empty;

  const info = KANTON_INFO[input.kanton];
  if (!info) return empty;

  const tarifs = getTarifs(info.cantonId, input.jahr);
  const tarif = findTarifFor(tarifs, "VERMOEGENSSTEUER", input.fallart);
  if (!tarif) return empty;

  const split = applySplitting(vermoegen, tarif, input.fallart);
  const rounded = round100Down(split, tarif);
  const taxes = calculateTaxes(rounded, tarif);
  const einfache = reverseSplitting(taxes, tarif, input.fallart);

  const factor = findFactor(
    info.cantonId,
    input.jahr,
    input.bfsId ?? info.bfsIdHauptort
  );
  if (!factor) {
    return { ...empty, einfache };
  }

  const kantonFuss = factor.FortuneRateCanton / 100;
  const gemeindeFuss = factor.FortuneRateCity / 100;
  const kircheFuss =
    getKirchensatz(
      factor as unknown as Record<string, unknown>,
      "Fortune",
      input.religion
    ) / 100;

  const kanton = einfache * kantonFuss;
  const gemeinde = einfache * gemeindeFuss;
  const kirche = einfache * kircheFuss;
  return {
    einfache,
    kanton,
    gemeinde,
    kirche,
    total: kanton + gemeinde + kirche,
  };
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
 * Liste aller verfügbaren Kantons-Codes. Stabil sortiert nach Code.
 */
export const ALLE_KANTONE: ReadonlyArray<KantonCode> = (
  Object.keys(KANTON_INFO) as KantonCode[]
).sort();

export type { KantonCode, Fallart, Religion, SteuerJahr } from "./types";
export { KANTON_INFO } from "./data";

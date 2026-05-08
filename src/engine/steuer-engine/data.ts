/**
 * Datenmanagement für ESTV-Steuertarife.
 *
 * Lädt die JSON-Snapshots aus `../steuer-data/{year}/` (kopiert aus
 * github.com/devbrains-com/swisstaxcalculator, MIT License) und stellt sie
 * pro Kanton/Jahr typisiert zur Verfügung.
 */

import type {
  FactorData,
  KantonCode,
  KantonInfo,
  SteuerJahr,
  TarifData,
} from "./types";

// Static JSON imports per Jahr (Next.js / TypeScript erlauben das mit
// `resolveJsonModule: true`). Die JSONs sind ~2 KB bis ~500 KB pro Datei,
// Tree-Shaking entfernt nicht-genutzte Steuerarten zur Build-Zeit.

// 2025 Tarife (CantonID 0 = Bund, 1..26 = Kantone in devbrains-Reihenfolge)
import t2025_0 from "../steuer-data/2025/tarifs/0.json";
import t2025_1 from "../steuer-data/2025/tarifs/1.json";
import t2025_2 from "../steuer-data/2025/tarifs/2.json";
import t2025_3 from "../steuer-data/2025/tarifs/3.json";
import t2025_4 from "../steuer-data/2025/tarifs/4.json";
import t2025_5 from "../steuer-data/2025/tarifs/5.json";
import t2025_6 from "../steuer-data/2025/tarifs/6.json";
import t2025_7 from "../steuer-data/2025/tarifs/7.json";
import t2025_8 from "../steuer-data/2025/tarifs/8.json";
import t2025_9 from "../steuer-data/2025/tarifs/9.json";
import t2025_10 from "../steuer-data/2025/tarifs/10.json";
import t2025_11 from "../steuer-data/2025/tarifs/11.json";
import t2025_12 from "../steuer-data/2025/tarifs/12.json";
import t2025_13 from "../steuer-data/2025/tarifs/13.json";
import t2025_14 from "../steuer-data/2025/tarifs/14.json";
import t2025_15 from "../steuer-data/2025/tarifs/15.json";
import t2025_16 from "../steuer-data/2025/tarifs/16.json";
import t2025_17 from "../steuer-data/2025/tarifs/17.json";
import t2025_18 from "../steuer-data/2025/tarifs/18.json";
import t2025_19 from "../steuer-data/2025/tarifs/19.json";
import t2025_20 from "../steuer-data/2025/tarifs/20.json";
import t2025_21 from "../steuer-data/2025/tarifs/21.json";
import t2025_22 from "../steuer-data/2025/tarifs/22.json";
import t2025_23 from "../steuer-data/2025/tarifs/23.json";
import t2025_24 from "../steuer-data/2025/tarifs/24.json";
import t2025_25 from "../steuer-data/2025/tarifs/25.json";
import t2025_26 from "../steuer-data/2025/tarifs/26.json";

// 2025 Faktoren (Steuerfüsse pro Gemeinde)
import f2025_1 from "../steuer-data/2025/factors/1.json";
import f2025_2 from "../steuer-data/2025/factors/2.json";
import f2025_3 from "../steuer-data/2025/factors/3.json";
import f2025_4 from "../steuer-data/2025/factors/4.json";
import f2025_5 from "../steuer-data/2025/factors/5.json";
import f2025_6 from "../steuer-data/2025/factors/6.json";
import f2025_7 from "../steuer-data/2025/factors/7.json";
import f2025_8 from "../steuer-data/2025/factors/8.json";
import f2025_9 from "../steuer-data/2025/factors/9.json";
import f2025_10 from "../steuer-data/2025/factors/10.json";
import f2025_11 from "../steuer-data/2025/factors/11.json";
import f2025_12 from "../steuer-data/2025/factors/12.json";
import f2025_13 from "../steuer-data/2025/factors/13.json";
import f2025_14 from "../steuer-data/2025/factors/14.json";
import f2025_15 from "../steuer-data/2025/factors/15.json";
import f2025_16 from "../steuer-data/2025/factors/16.json";
import f2025_17 from "../steuer-data/2025/factors/17.json";
import f2025_18 from "../steuer-data/2025/factors/18.json";
import f2025_19 from "../steuer-data/2025/factors/19.json";
import f2025_20 from "../steuer-data/2025/factors/20.json";
import f2025_21 from "../steuer-data/2025/factors/21.json";
import f2025_22 from "../steuer-data/2025/factors/22.json";
import f2025_23 from "../steuer-data/2025/factors/23.json";
import f2025_24 from "../steuer-data/2025/factors/24.json";
import f2025_25 from "../steuer-data/2025/factors/25.json";
import f2025_26 from "../steuer-data/2025/factors/26.json";

// 2026 Tarife
import t2026_0 from "../steuer-data/2026/tarifs/0.json";
import t2026_1 from "../steuer-data/2026/tarifs/1.json";
import t2026_2 from "../steuer-data/2026/tarifs/2.json";
import t2026_3 from "../steuer-data/2026/tarifs/3.json";
import t2026_4 from "../steuer-data/2026/tarifs/4.json";
import t2026_5 from "../steuer-data/2026/tarifs/5.json";
import t2026_6 from "../steuer-data/2026/tarifs/6.json";
import t2026_7 from "../steuer-data/2026/tarifs/7.json";
import t2026_8 from "../steuer-data/2026/tarifs/8.json";
import t2026_9 from "../steuer-data/2026/tarifs/9.json";
import t2026_10 from "../steuer-data/2026/tarifs/10.json";
import t2026_11 from "../steuer-data/2026/tarifs/11.json";
import t2026_12 from "../steuer-data/2026/tarifs/12.json";
import t2026_13 from "../steuer-data/2026/tarifs/13.json";
import t2026_14 from "../steuer-data/2026/tarifs/14.json";
import t2026_15 from "../steuer-data/2026/tarifs/15.json";
import t2026_16 from "../steuer-data/2026/tarifs/16.json";
import t2026_17 from "../steuer-data/2026/tarifs/17.json";
import t2026_18 from "../steuer-data/2026/tarifs/18.json";
import t2026_19 from "../steuer-data/2026/tarifs/19.json";
import t2026_20 from "../steuer-data/2026/tarifs/20.json";
import t2026_21 from "../steuer-data/2026/tarifs/21.json";
import t2026_22 from "../steuer-data/2026/tarifs/22.json";
import t2026_23 from "../steuer-data/2026/tarifs/23.json";
import t2026_24 from "../steuer-data/2026/tarifs/24.json";
import t2026_25 from "../steuer-data/2026/tarifs/25.json";
import t2026_26 from "../steuer-data/2026/tarifs/26.json";

// 2026 Faktoren
import f2026_1 from "../steuer-data/2026/factors/1.json";
import f2026_2 from "../steuer-data/2026/factors/2.json";
import f2026_3 from "../steuer-data/2026/factors/3.json";
import f2026_4 from "../steuer-data/2026/factors/4.json";
import f2026_5 from "../steuer-data/2026/factors/5.json";
import f2026_6 from "../steuer-data/2026/factors/6.json";
import f2026_7 from "../steuer-data/2026/factors/7.json";
import f2026_8 from "../steuer-data/2026/factors/8.json";
import f2026_9 from "../steuer-data/2026/factors/9.json";
import f2026_10 from "../steuer-data/2026/factors/10.json";
import f2026_11 from "../steuer-data/2026/factors/11.json";
import f2026_12 from "../steuer-data/2026/factors/12.json";
import f2026_13 from "../steuer-data/2026/factors/13.json";
import f2026_14 from "../steuer-data/2026/factors/14.json";
import f2026_15 from "../steuer-data/2026/factors/15.json";
import f2026_16 from "../steuer-data/2026/factors/16.json";
import f2026_17 from "../steuer-data/2026/factors/17.json";
import f2026_18 from "../steuer-data/2026/factors/18.json";
import f2026_19 from "../steuer-data/2026/factors/19.json";
import f2026_20 from "../steuer-data/2026/factors/20.json";
import f2026_21 from "../steuer-data/2026/factors/21.json";
import f2026_22 from "../steuer-data/2026/factors/22.json";
import f2026_23 from "../steuer-data/2026/factors/23.json";
import f2026_24 from "../steuer-data/2026/factors/24.json";
import f2026_25 from "../steuer-data/2026/factors/25.json";
import f2026_26 from "../steuer-data/2026/factors/26.json";

const TARIFS_BY_YEAR: Record<SteuerJahr, Record<number, TarifData[]>> = {
  2025: {
    0: t2025_0 as TarifData[],
    1: t2025_1 as TarifData[],
    2: t2025_2 as TarifData[],
    3: t2025_3 as TarifData[],
    4: t2025_4 as TarifData[],
    5: t2025_5 as TarifData[],
    6: t2025_6 as TarifData[],
    7: t2025_7 as TarifData[],
    8: t2025_8 as TarifData[],
    9: t2025_9 as TarifData[],
    10: t2025_10 as TarifData[],
    11: t2025_11 as TarifData[],
    12: t2025_12 as TarifData[],
    13: t2025_13 as TarifData[],
    14: t2025_14 as TarifData[],
    15: t2025_15 as TarifData[],
    16: t2025_16 as TarifData[],
    17: t2025_17 as TarifData[],
    18: t2025_18 as TarifData[],
    19: t2025_19 as TarifData[],
    20: t2025_20 as TarifData[],
    21: t2025_21 as TarifData[],
    22: t2025_22 as TarifData[],
    23: t2025_23 as TarifData[],
    24: t2025_24 as TarifData[],
    25: t2025_25 as TarifData[],
    26: t2025_26 as TarifData[],
  },
  2026: {
    0: t2026_0 as TarifData[],
    1: t2026_1 as TarifData[],
    2: t2026_2 as TarifData[],
    3: t2026_3 as TarifData[],
    4: t2026_4 as TarifData[],
    5: t2026_5 as TarifData[],
    6: t2026_6 as TarifData[],
    7: t2026_7 as TarifData[],
    8: t2026_8 as TarifData[],
    9: t2026_9 as TarifData[],
    10: t2026_10 as TarifData[],
    11: t2026_11 as TarifData[],
    12: t2026_12 as TarifData[],
    13: t2026_13 as TarifData[],
    14: t2026_14 as TarifData[],
    15: t2026_15 as TarifData[],
    16: t2026_16 as TarifData[],
    17: t2026_17 as TarifData[],
    18: t2026_18 as TarifData[],
    19: t2026_19 as TarifData[],
    20: t2026_20 as TarifData[],
    21: t2026_21 as TarifData[],
    22: t2026_22 as TarifData[],
    23: t2026_23 as TarifData[],
    24: t2026_24 as TarifData[],
    25: t2026_25 as TarifData[],
    26: t2026_26 as TarifData[],
  },
};

const FACTORS_BY_YEAR: Record<SteuerJahr, Record<number, FactorData[]>> = {
  2025: {
    1: f2025_1 as FactorData[],
    2: f2025_2 as FactorData[],
    3: f2025_3 as FactorData[],
    4: f2025_4 as FactorData[],
    5: f2025_5 as FactorData[],
    6: f2025_6 as FactorData[],
    7: f2025_7 as FactorData[],
    8: f2025_8 as FactorData[],
    9: f2025_9 as FactorData[],
    10: f2025_10 as FactorData[],
    11: f2025_11 as FactorData[],
    12: f2025_12 as FactorData[],
    13: f2025_13 as FactorData[],
    14: f2025_14 as FactorData[],
    15: f2025_15 as FactorData[],
    16: f2025_16 as FactorData[],
    17: f2025_17 as FactorData[],
    18: f2025_18 as FactorData[],
    19: f2025_19 as FactorData[],
    20: f2025_20 as FactorData[],
    21: f2025_21 as FactorData[],
    22: f2025_22 as FactorData[],
    23: f2025_23 as FactorData[],
    24: f2025_24 as FactorData[],
    25: f2025_25 as FactorData[],
    26: f2025_26 as FactorData[],
  },
  2026: {
    1: f2026_1 as FactorData[],
    2: f2026_2 as FactorData[],
    3: f2026_3 as FactorData[],
    4: f2026_4 as FactorData[],
    5: f2026_5 as FactorData[],
    6: f2026_6 as FactorData[],
    7: f2026_7 as FactorData[],
    8: f2026_8 as FactorData[],
    9: f2026_9 as FactorData[],
    10: f2026_10 as FactorData[],
    11: f2026_11 as FactorData[],
    12: f2026_12 as FactorData[],
    13: f2026_13 as FactorData[],
    14: f2026_14 as FactorData[],
    15: f2026_15 as FactorData[],
    16: f2026_16 as FactorData[],
    17: f2026_17 as FactorData[],
    18: f2026_18 as FactorData[],
    19: f2026_19 as FactorData[],
    20: f2026_20 as FactorData[],
    21: f2026_21 as FactorData[],
    22: f2026_22 as FactorData[],
    23: f2026_23 as FactorData[],
    24: f2026_24 as FactorData[],
    25: f2026_25 as FactorData[],
    26: f2026_26 as FactorData[],
  },
};

/**
 * Mapping Kantons-Code → devbrains CantonID + BfsID des Hauptorts.
 * Hauptort = Default-Gemeinde, falls User keine spezifische gewählt hat.
 */
export const KANTON_INFO: Record<KantonCode, KantonInfo> = {
  ZH: { cantonId: 26, bfsIdHauptort: 261, hauptort: "Zürich" },
  BE: { cantonId: 4, bfsIdHauptort: 351, hauptort: "Bern" },
  LU: { cantonId: 12, bfsIdHauptort: 1061, hauptort: "Luzern" },
  UR: { cantonId: 22, bfsIdHauptort: 1201, hauptort: "Altdorf (UR)" },
  SZ: { cantonId: 19, bfsIdHauptort: 1372, hauptort: "Schwyz" },
  OW: { cantonId: 15, bfsIdHauptort: 1407, hauptort: "Sarnen" },
  NW: { cantonId: 14, bfsIdHauptort: 1509, hauptort: "Stans" },
  GL: { cantonId: 9, bfsIdHauptort: 1632, hauptort: "Glarus" },
  ZG: { cantonId: 25, bfsIdHauptort: 1711, hauptort: "Zug" },
  FR: { cantonId: 7, bfsIdHauptort: 2196, hauptort: "Fribourg" },
  SO: { cantonId: 18, bfsIdHauptort: 2601, hauptort: "Solothurn" },
  BS: { cantonId: 6, bfsIdHauptort: 2701, hauptort: "Basel" },
  BL: { cantonId: 5, bfsIdHauptort: 2829, hauptort: "Liestal" },
  SH: { cantonId: 17, bfsIdHauptort: 2939, hauptort: "Schaffhausen" },
  AR: { cantonId: 3, bfsIdHauptort: 3001, hauptort: "Herisau" },
  AI: { cantonId: 2, bfsIdHauptort: 3101, hauptort: "Appenzell" },
  SG: { cantonId: 16, bfsIdHauptort: 3203, hauptort: "St. Gallen" },
  GR: { cantonId: 10, bfsIdHauptort: 3901, hauptort: "Chur" },
  AG: { cantonId: 1, bfsIdHauptort: 4001, hauptort: "Aarau" },
  TG: { cantonId: 20, bfsIdHauptort: 4566, hauptort: "Frauenfeld" },
  TI: { cantonId: 21, bfsIdHauptort: 5002, hauptort: "Bellinzona" },
  VD: { cantonId: 23, bfsIdHauptort: 5586, hauptort: "Lausanne" },
  VS: { cantonId: 24, bfsIdHauptort: 6266, hauptort: "Sion" },
  NE: { cantonId: 13, bfsIdHauptort: 6458, hauptort: "Neuchâtel" },
  GE: { cantonId: 8, bfsIdHauptort: 6621, hauptort: "Genève" },
  JU: { cantonId: 11, bfsIdHauptort: 6711, hauptort: "Delémont" },
};

/**
 * Holt alle Tarife für einen Kanton (oder Bund mit cantonId=0) für ein Jahr.
 */
export function getTarifs(cantonId: number, year: SteuerJahr): TarifData[] {
  return TARIFS_BY_YEAR[year][cantonId] ?? [];
}

/**
 * Holt alle Steuerfuss-Faktoren für einen Kanton für ein Jahr.
 */
export function getFactors(cantonId: number, year: SteuerJahr): FactorData[] {
  return FACTORS_BY_YEAR[year][cantonId] ?? [];
}

/**
 * Findet den Steuerfuss-Eintrag für eine Gemeinde via BfsID. Falls nicht
 * gefunden, fallback auf den ersten Eintrag des Kantons.
 */
export function findFactor(
  cantonId: number,
  year: SteuerJahr,
  bfsId: number
): FactorData | null {
  const factors = getFactors(cantonId, year);
  return factors.find((f) => f.Location.BfsID === bfsId) ?? factors[0] ?? null;
}

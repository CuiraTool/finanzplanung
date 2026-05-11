/**
 * TypeScript-Typen für die offiziellen ESTV-Tarif-Daten (via devbrains/swisstaxcalculator).
 *
 * Datenquelle: github.com/devbrains-com/swisstaxcalculator (MIT License)
 * Originalquelle: ESTV API (swisstaxcalculator.estv.admin.ch)
 */

export type TableType = "BUND" | "ZUERICH" | "FLATTAX" | "FREIBURG" | "FORMEL";

export type TaxType =
  | "EINKOMMENSSTEUER"
  /**
   * Optional: separate Einkommens-Steuer-Tabelle für die Gemeinde, wenn der
   * Kanton einen abweichenden Bemessungs-Tarif für die Gemeinde-Steuer
   * benutzt (z.B. SZ 2026: Gemeinde-Tarif cap't bei 3.65% Marginalsatz,
   * während Kanton-Tarif bis 7% steigt). Fällt zurück auf
   * EINKOMMENSSTEUER, wenn nicht vorhanden.
   */
  | "EINKOMMENSSTEUER_GEMEINDE"
  | "VERMOEGENSSTEUER"
  | "KAPITALSTEUER"
  | "GEWINNSTEUER"
  | "ERBSCHAFT";

export interface TarifTableItem {
  /** Optional Formel (nur bei tableType=FORMEL). */
  formula: string;
  /** Steuer beim Einstieg dieser Stufe (BUND-Format). */
  taxes: number;
  /** Marginalsatz oder Stufensatz in % (z.B. 0.77 = 0.77%). */
  percent: number;
  /** BUND-Format: Untergrenze CHF. ZUERICH-Format: Stufenbreite CHF. */
  amount: number;
}

export interface TarifData {
  tableType: TableType;
  taxType: TaxType;
  /** Comma-separated Status-Codes, z.B. "LEDIG_ALLEINE,VERHEIRATET" oder "ALLE". */
  group: string;
  /** Splittingfaktor (0 = kein Splitting, 2 = Vollsplitting, etc.). */
  splitting: number;
  table: TarifTableItem[];
}

export interface FactorData {
  Location: { BfsID: number };
  /** Steuerfuss Kanton in % auf einfache Steuer für Einkommen (z.B. 98 = 98%). */
  IncomeRateCanton: number;
  IncomeRateCity: number;
  IncomeRateProtestant: number;
  IncomeRateRoman: number;
  IncomeRateChrist: number;
  FortuneRateCanton: number;
  FortuneRateCity: number;
  FortuneRateProtestant: number;
  FortuneRateRoman: number;
  FortuneRateChrist: number;
  CapitalTaxRateCanton: number;
  CapitalTaxRateCity: number;
  CapitalTaxRateChurch: number;
  ProfitTaxRateCanton: number;
  ProfitTaxRateCity: number;
  ProfitTaxRateChurch: number;
}

export interface LocationData {
  TaxLocationID: number;
  BfsID: number;
  BfsName: string;
  CantonID: number;
  Canton: string;
}

export type Religion =
  | "reformiert"
  | "katholisch"
  | "christkatholisch"
  | "israelitisch"
  | "andere"
  | "keine";
export type Fallart = "einzel" | "paar";
export type SteuerJahr = 2025 | 2026;

/** Kantonsschlüssel (alle 26 + Bund). */
export type KantonCode =
  | "ZH" | "BE" | "LU" | "UR" | "SZ" | "OW" | "NW" | "GL"
  | "ZG" | "FR" | "SO" | "BS" | "BL" | "SH" | "AR" | "AI"
  | "SG" | "GR" | "AG" | "TG" | "TI" | "VD" | "VS" | "NE"
  | "GE" | "JU";

/** Mapping Kantonscode → CantonID (devbrains-internal) und BfsID des Hauptorts. */
export interface KantonInfo {
  cantonId: number;
  bfsIdHauptort: number;
  hauptort: string;
}

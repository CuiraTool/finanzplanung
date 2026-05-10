/**
 * Indikative Steuersätze pro Kanton (Stand 2024–2025).
 *
 * SEHR GROBE APPROXIMATION für Etappe 2 — V1-Cashflow zeigt damit indikativ,
 * wie viel Steuern in den Ausgaben stecken. Die echte progressive Berechnung
 * mit Bund-/Kantons-/Gemeinde-Tarifen, Kinderabzügen, Religion und Säulen-
 * spezifischen Kap.-Tarifen kommt mit der dedizierten Steuer-Engine in
 * Etappe 2.5.
 *
 * Quellen für die Default-Werte: ComparisOnline-Steuerrechner Median-Werte
 * für Familien-Bruttoeinkommen 100–200k, ESTV-Statistiken zur kantonalen
 * Belastung. Kein Anspruch auf Genauigkeit für eine spezifische Gemeinde.
 */

/**
 * Effektiver Einkommensteuersatz (Bund + Kanton + Gemeinde gemischt) in
 * Prozent vom Bruttojahreseinkommen, für mittleres Familieneinkommen.
 *
 * Wert wird als Multiplikator angewandt: `steuern = einkommen * satz`.
 * In der Praxis ist die Steuer progressiv — Etappe 2.5 ersetzt das mit
 * echten Tarifen.
 */
export const EFFEKTIVER_EINKOMMENSSATZ_KANTON: Record<string, number> = {
  ZG: 0.12,
  SZ: 0.14,
  OW: 0.15,
  AI: 0.15,
  NW: 0.16,
  AR: 0.18,
  LU: 0.19,
  TG: 0.2,
  GR: 0.21,
  ZH: 0.22,
  AG: 0.22,
  UR: 0.22,
  GL: 0.22,
  SG: 0.22,
  BL: 0.23,
  FR: 0.24,
  SO: 0.24,
  SH: 0.24,
  TI: 0.25,
  VS: 0.25,
  BS: 0.26,
  BE: 0.26,
  VD: 0.27,
  NE: 0.28,
  JU: 0.28,
  GE: 0.3,
};

/**
 * Effektiver Vermögensteuersatz (Kanton + Gemeinde gemittelt) in Promille
 * vom steuerbaren Vermögen. Bund kennt keine Vermögenssteuer.
 */
export const EFFEKTIVER_VERMOEGENSSATZ_KANTON: Record<string, number> = {
  ZG: 0.0015,
  SZ: 0.0017,
  OW: 0.0018,
  AI: 0.0018,
  NW: 0.0019,
  AR: 0.002,
  LU: 0.0023,
  TG: 0.0025,
  GR: 0.0028,
  ZH: 0.003,
  AG: 0.0027,
  UR: 0.0028,
  GL: 0.0027,
  SG: 0.003,
  BL: 0.0035,
  FR: 0.0035,
  SO: 0.0035,
  SH: 0.0033,
  TI: 0.0035,
  VS: 0.0035,
  BS: 0.0045,
  BE: 0.0035,
  VD: 0.0045,
  NE: 0.005,
  JU: 0.005,
  GE: 0.0055,
};

/**
 * Kapitalauszahlungssteuer (Bund + Kanton) für Vorsorgekapital, Pauschalsatz.
 * In der Praxis progressiv mit der Höhe der Auszahlung — hier eine konservative
 * Mittelung für Beträge im Bereich CHF 200k–800k.
 */
export const KAPITALSTEUER_SATZ_KANTON: Record<string, number> = {
  ZG: 0.04,
  SZ: 0.045,
  OW: 0.045,
  AI: 0.05,
  NW: 0.05,
  AR: 0.055,
  LU: 0.06,
  GL: 0.065,
  GR: 0.07,
  SG: 0.075,
  TG: 0.075,
  AG: 0.075,
  UR: 0.075,
  ZH: 0.085,
  BL: 0.09,
  FR: 0.09,
  SO: 0.095,
  SH: 0.09,
  TI: 0.1,
  BS: 0.1,
  BE: 0.1,
  VS: 0.1,
  VD: 0.105,
  NE: 0.115,
  JU: 0.115,
  GE: 0.12,
};

export const DEFAULT_EINKOMMENSSATZ = 0.22; // Schweiz-Median ZH-Niveau
export const DEFAULT_VERMOEGENSSATZ = 0.003;
export const DEFAULT_KAPITALSTEUER = 0.085;

export type Religion = "katholisch" | "reformiert" | "keine";

/**
 * Religion-Multiplikator auf den Einkommensteuersatz.
 * Kirchensteuer schlägt mit ~4% des Kantonalsteuer-Anteils zu Buche; "keine"
 * spart entsprechend. Sehr grob — präzisiert in Etappe 2.5.
 */
export function religionMultiplikator(r: Religion): number {
  return r === "keine" ? 0.96 : 1.0;
}

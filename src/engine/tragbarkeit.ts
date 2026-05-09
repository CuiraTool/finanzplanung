/**
 * Tragbarkeits-Berechnung für Schweizer Eigenheim/Liegenschaften.
 *
 * Standard-Schweizer-Bankenformel:
 *   Tragbarkeit = (kalk. Hypo-Zins + Amortisation 2. Hypothek + Nebenkosten)
 *                  / Bruttojahreseinkommen
 *
 * Schwellenwerte:
 *   - ≤ 33 %  → tragbar (grün)
 *   - 33-40 % → grenzwertig (gelb)
 *   - > 40 %  → nicht tragbar nach Bankenstandard (rot)
 *
 * Annahmen (anpassbar):
 *   - Kalkulatorischer Zinssatz: 5 % (Schweizer Industriestandard für
 *     Stresstest, unabhängig vom realen Hypo-Satz)
 *   - Nebenkosten + Unterhalt: 1 % vom Verkehrswert pro Jahr
 *   - 1. Hypothek: bis 65 % vom Verkehrswert (keine Amortisations-Pflicht)
 *   - 2. Hypothek: 65–80 % Belehnung — muss in 15 Jahren auf 65 % amortisiert
 *     werden (also 1/15 des über-65 %-Anteils pro Jahr)
 *
 * Output:
 *   - kostenJahr: kalk. Wohnkosten in CHF/Jahr
 *   - verhaeltnis: kostenJahr / einkommen (z.B. 0.32 = 32 %)
 *   - status: "tragbar" | "grenzwertig" | "nicht_tragbar"
 *
 * Vereinfachungen für V1:
 *   - 1 % Nebenkosten ist eine Daumenregel — manche Banken nehmen 0.7 % bei
 *     neuen Liegenschaften, andere 1.5 %. Wir nehmen 1 % als Median.
 *   - Tragbarkeitsregel ist je Bank etwas anders (33 % UBS/Raiffeisen vs.
 *     35 % ZKB vs. 40 % einzelne Privatbanken). Default 33 %.
 */

import type { Immobilie } from "@/lib/store";

export const KALK_ZINS_DEFAULT = 0.05; // 5%
export const NEBENKOSTEN_DEFAULT = 0.01; // 1% vom Verkehrswert
export const SCHWELLE_GRUEN = 0.33;
export const SCHWELLE_GELB = 0.4;
export const BELEHNUNG_HYPO_1 = 0.65; // 65% Verkehrswert
export const AMORTISATION_2_HYPO_JAHRE = 15; // 1/15 pro Jahr

export type TragbarkeitStatus = "tragbar" | "grenzwertig" | "nicht_tragbar";

export interface TragbarkeitResult {
  /** Hypothek-Total auf dieser Immobilie. */
  hypothekTotal: number;
  /** Belehnung in % des Verkehrswerts. */
  belehnung: number;
  /** Kalk. Zinskosten p.a. (Hypothek × 5 %). */
  zinsKosten: number;
  /** Pflicht-Amortisation der 2. Hypothek p.a. */
  amortisation2Hypo: number;
  /** Nebenkosten + Unterhalt p.a. (1 % vom Verkehrswert). */
  nebenkosten: number;
  /** Total kalk. Wohnkosten p.a. (Zins + Amortisation + Nebenkosten). */
  kostenJahr: number;
  /** Tragbarkeit = kostenJahr / einkommen. */
  verhaeltnis: number;
  status: TragbarkeitStatus;
}

export interface TragbarkeitInput {
  verkehrswert: number;
  hypothekTotal: number;
  einkommenJahr: number;
  /** Default 0.05. */
  kalkZins?: number;
  /** Default 0.01 (1 %). */
  nebenkostenSatz?: number;
}

export function tragbarkeit(input: TragbarkeitInput): TragbarkeitResult {
  const verkehrswert = Math.max(0, input.verkehrswert);
  const hypothekTotal = Math.max(0, input.hypothekTotal);
  const einkommenJahr = Math.max(0, input.einkommenJahr);
  const kalkZins = input.kalkZins ?? KALK_ZINS_DEFAULT;
  const nebenkostenSatz = input.nebenkostenSatz ?? NEBENKOSTEN_DEFAULT;

  const belehnung = verkehrswert > 0 ? hypothekTotal / verkehrswert : 0;

  // 1. Hypothek-Limit: 65 % Verkehrswert
  const hypo1Max = verkehrswert * BELEHNUNG_HYPO_1;
  const hypo2 = Math.max(0, hypothekTotal - hypo1Max);

  const zinsKosten = hypothekTotal * kalkZins;
  const amortisation2Hypo = hypo2 / AMORTISATION_2_HYPO_JAHRE;
  const nebenkosten = verkehrswert * nebenkostenSatz;
  const kostenJahr = zinsKosten + amortisation2Hypo + nebenkosten;

  const verhaeltnis = einkommenJahr > 0 ? kostenJahr / einkommenJahr : Infinity;

  let status: TragbarkeitStatus;
  if (verhaeltnis <= SCHWELLE_GRUEN) status = "tragbar";
  else if (verhaeltnis <= SCHWELLE_GELB) status = "grenzwertig";
  else status = "nicht_tragbar";

  return {
    hypothekTotal,
    belehnung,
    zinsKosten,
    amortisation2Hypo,
    nebenkosten,
    kostenJahr,
    verhaeltnis,
    status,
  };
}

/**
 * Tragbarkeit für eine konkrete Immobilie aus dem Store.
 * Aggregiert alle Hypothek-Tranchen.
 */
export function tragbarkeitImmobilie(
  immobilie: Immobilie,
  einkommenJahr: number,
  kalkZins?: number
): TragbarkeitResult {
  const verkehrswert = immobilie.verkehrswert ?? 0;
  const hypothekTotal = immobilie.hypotheken.reduce(
    (sum, h) => sum + (h.hoehe ?? 0),
    0
  );
  return tragbarkeit({
    verkehrswert,
    hypothekTotal,
    einkommenJahr,
    kalkZins,
  });
}

/**
 * Aggregierte Tragbarkeit über alle (selbstbewohnten) Immobilien für den
 * Haushalt — nimmt Summe Verkehrswert + Summe Hypotheken.
 *
 * Renditeliegenschaften werden i.d.R. separat tragfähig gerechnet (über die
 * Mieteinnahmen, nicht das Lohneinkommen). Wir filtern sie hier raus.
 */
export function tragbarkeitHaushalt(
  immobilien: Immobilie[],
  einkommenJahr: number,
  kalkZins?: number
): TragbarkeitResult {
  const eigenwohnte = immobilien.filter((i) => i.typ === "selbstbewohnt");
  const verkehrswert = eigenwohnte.reduce(
    (s, i) => s + (i.verkehrswert ?? 0),
    0
  );
  const hypothekTotal = eigenwohnte.reduce(
    (s, i) =>
      s + i.hypotheken.reduce((hs, h) => hs + (h.hoehe ?? 0), 0),
    0
  );
  return tragbarkeit({
    verkehrswert,
    hypothekTotal,
    einkommenJahr,
    kalkZins,
  });
}

export function statusLabel(status: TragbarkeitStatus): string {
  return {
    tragbar: "tragbar",
    grenzwertig: "grenzwertig",
    nicht_tragbar: "nicht tragbar",
  }[status];
}

export function statusFarbe(status: TragbarkeitStatus): {
  border: string;
  bg: string;
  text: string;
  dot: string;
} {
  switch (status) {
    case "tragbar":
      return {
        border: "border-emerald-200",
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        dot: "bg-emerald-500",
      };
    case "grenzwertig":
      return {
        border: "border-amber-200",
        bg: "bg-amber-50",
        text: "text-amber-700",
        dot: "bg-amber-500",
      };
    case "nicht_tragbar":
      return {
        border: "border-rose-200",
        bg: "bg-rose-50",
        text: "text-rose-700",
        dot: "bg-rose-500",
      };
  }
}

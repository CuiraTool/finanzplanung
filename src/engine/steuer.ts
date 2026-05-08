/**
 * Steuer-Engine V1 (indikativ).
 *
 * Strategie:
 *  - Wenn der User einen Anker fürs aktuelle Jahr eingegeben hat (Steuern_heute
 *    + Einkommen_heute), werden die laufenden Steuern proportional zum
 *    Einkommen hochgerechnet.
 *  - Sonst: Default-Sätze pro Kanton aus steuer-data.ts.
 *  - Vermögenssteuer additiv obendrauf.
 *  - Kapitalauszahlungssteuer im Auszahlungsjahr (PK-Kapital, 3a, FZ) als
 *    pauschaler Kantons-Satz.
 *
 * Vereinfachungen (für Etappe 2.5 zu ersetzen):
 *  - Echte Progression
 *  - Sozialabzüge (Kinder, Versicherungen)
 *  - Kantonale Sonderlogiken
 *  - Bund vs. Kanton vs. Gemeinde getrennt
 *  - Gemeinde-Multiplikator
 */

import {
  EFFEKTIVER_EINKOMMENSSATZ_KANTON,
  EFFEKTIVER_VERMOEGENSSATZ_KANTON,
  KAPITALSTEUER_SATZ_KANTON,
  DEFAULT_EINKOMMENSSATZ,
  DEFAULT_VERMOEGENSSATZ,
  DEFAULT_KAPITALSTEUER,
  religionMultiplikator,
  type Religion,
} from "./steuer-data";

export interface SteuerInput {
  einkommenJahr: number;
  vermoegenJahr: number;
  kapAuszahlungenJahr: number;
  kanton: string;
  religion: Religion;
  /** Anker fürs Kalibrierungs-Jahr (vom User eingegeben). */
  ankerSteuernHeute?: number | null;
  ankerEinkommenHeute?: number | null;
}

export interface SteuerOutput {
  einkommen: number;
  vermoegen: number;
  kapital: number;
  total: number;
  /** True wenn der User-Anker verwendet wurde (statt Default-Sätze). */
  kalibriert: boolean;
}

export function steuerProJahr(input: SteuerInput): SteuerOutput {
  const kanton = input.kanton || "";
  const ekSatz =
    EFFEKTIVER_EINKOMMENSSATZ_KANTON[kanton] ?? DEFAULT_EINKOMMENSSATZ;
  const vmSatz =
    EFFEKTIVER_VERMOEGENSSATZ_KANTON[kanton] ?? DEFAULT_VERMOEGENSSATZ;
  const kapSatz =
    KAPITALSTEUER_SATZ_KANTON[kanton] ?? DEFAULT_KAPITALSTEUER;
  const relMult = religionMultiplikator(input.religion);

  // Einkommensteuer: Anker bevorzugen, sonst Default
  let einkommensteuer: number;
  let kalibriert = false;
  if (
    input.ankerSteuernHeute != null &&
    input.ankerSteuernHeute > 0 &&
    input.ankerEinkommenHeute != null &&
    input.ankerEinkommenHeute > 0
  ) {
    // Proportional zum aktuellen Einkommens-Verhältnis
    einkommensteuer =
      input.ankerSteuernHeute * (input.einkommenJahr / input.ankerEinkommenHeute);
    kalibriert = true;
  } else {
    einkommensteuer = input.einkommenJahr * ekSatz * relMult;
  }

  const vermoegensteuer = Math.max(0, input.vermoegenJahr) * vmSatz;
  const kapitalsteuer = input.kapAuszahlungenJahr * kapSatz;

  return {
    einkommen: Math.round(einkommensteuer),
    vermoegen: Math.round(vermoegensteuer),
    kapital: Math.round(kapitalsteuer),
    total: Math.round(einkommensteuer + vermoegensteuer + kapitalsteuer),
    kalibriert,
  };
}

/**
 * Für die Anzeige im Block 3: indikative Jahressteuer heute, falls der User
 * keinen Anker eingegeben hat. Hilft bei Plausibilitäts-Check.
 */
export function indikativeSteuerHeute(
  einkommenHeute: number,
  vermoegenHeute: number,
  kanton: string,
  religion: Religion
): number {
  return steuerProJahr({
    einkommenJahr: einkommenHeute,
    vermoegenJahr: vermoegenHeute,
    kapAuszahlungenJahr: 0,
    kanton,
    religion,
  }).total;
}

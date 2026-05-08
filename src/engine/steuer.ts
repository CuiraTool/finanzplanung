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
import {
  bundessteuer,
  bundessteuerKapital,
  bruttoZuSteuerbarApprox,
} from "./steuer-bund";
import { kantonsteuerZh, kantonsteuerZhKapital } from "./steuer-zh";
import { kantonsteuerZg } from "./steuer-zg";

export interface SteuerInput {
  einkommenJahr: number;
  vermoegenJahr: number;
  kapAuszahlungenJahr: number;
  kanton: string;
  religion: Religion;
  /** Steuerkategorie für DBG-Bundessteuer. */
  fallart?: "einzel" | "paar";
  /** Anker fürs Kalibrierungs-Jahr (vom User eingegeben). */
  ankerSteuernHeute?: number | null;
  ankerEinkommenHeute?: number | null;
}

export interface SteuerOutput {
  einkommen: number; // Total Einkommenssteuer (Bund + Kanton/Gemeinde)
  einkommenBund: number; // davon Bundessteuer (echter DBG-Tarif)
  einkommenKanton: number; // davon Kanton+Gemeinde+Religion (indikativ)
  vermoegen: number;
  kapital: number; // Total Kapitalauszahlungssteuer (Bund + Kanton)
  kapitalBund: number; // davon Bund (1/5 DBG-Tarif)
  kapitalKanton: number; // davon Kanton (Sondertarif oder Pauschal)
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

  // Bundessteuer: echter DBG-Tarif progressiv (Phase 4.2)
  const dbgKategorie = input.fallart === "paar" ? "verheiratet" : "einzel";
  const steuerbaresEinkommen = bruttoZuSteuerbarApprox(input.einkommenJahr);
  const bundSteuer = bundessteuer(steuerbaresEinkommen, dbgKategorie);

  // Kanton + Gemeinde + Religion
  let kantonsteuer_netto: number;
  if (kanton === "ZH") {
    // Phase 4.3: echter ZH-Tarif (progressiv) × Steuerfuss Stadt Zürich
    kantonsteuer_netto = kantonsteuerZh({
      steuerbaresEinkommen,
      kategorie: input.fallart === "paar" ? "verheiratet" : "grundtarif",
      religion: input.religion,
    });
  } else if (kanton === "ZG") {
    // Phase 4.4: echter ZG-Tarif × Steuerfuss Stadt Zug
    kantonsteuer_netto = kantonsteuerZg({
      steuerbaresEinkommen,
      kategorie: input.fallart === "paar" ? "mehrpersonen" : "grundtarif",
      religion: input.religion,
    });
  } else {
    // Andere Kantone: weiter pauschaler Mischsatz minus Bund-Anteil
    // (typischer Bund-Anteil 4-7%, daher abziehen damit kein Doppel-Counting)
    const kantonsteuer_brutto = input.einkommenJahr * ekSatz * relMult;
    // Annahme: vom pauschalen Mischsatz waren ca. 5% Bundessteuer drin →
    // korrigieren wir das raus. Vereinfacht durch Anteil-Schätzung.
    const bundAnteilImPauschalsatz = 0.05; // ca. 5% bei mittlerem Einkommen
    kantonsteuer_netto = Math.max(
      0,
      kantonsteuer_brutto - input.einkommenJahr * bundAnteilImPauschalsatz
    );
  }

  // Anker-Modus: User-Eingabe überschreibt Default
  let einkommensteuerKantonal: number = kantonsteuer_netto;
  let kalibriert = false;
  if (
    input.ankerSteuernHeute != null &&
    input.ankerSteuernHeute > 0 &&
    input.ankerEinkommenHeute != null &&
    input.ankerEinkommenHeute > 0
  ) {
    // Anker-Steuer ist Total (Bund+Kanton+Gemeinde) — proportional skalieren
    const totalAnkerProportional =
      input.ankerSteuernHeute * (input.einkommenJahr / input.ankerEinkommenHeute);
    // davon Bundes-Anteil abziehen → Rest = Kanton+Gemeinde
    einkommensteuerKantonal = Math.max(0, totalAnkerProportional - bundSteuer);
    kalibriert = true;
  }

  const einkommensteuerTotal = bundSteuer + einkommensteuerKantonal;
  const vermoegensteuer = Math.max(0, input.vermoegenJahr) * vmSatz;

  // Kapitalauszahlungssteuer (Phase 4.5): Bund 1/5-DBG progressiv,
  // ZH 1/20-Bruchteilstarif, andere Kantone weiter Pauschalsatz
  const kapital = Math.max(0, input.kapAuszahlungenJahr);
  let kapitalBund = 0;
  let kapitalKanton = 0;
  if (kapital > 0) {
    kapitalBund = bundessteuerKapital(kapital, dbgKategorie);
    if (kanton === "ZH") {
      kapitalKanton = kantonsteuerZhKapital({
        kapital,
        kategorie: input.fallart === "paar" ? "verheiratet" : "grundtarif",
        religion: input.religion,
      });
    } else {
      // Pauschalsatz pro Kanton (Bund-Anteil bereits separat → kein Doppel-Counting)
      // Schätzung Bund-Anteil im Pauschalsatz: ~1.5% bei mittlerer Auszahlung
      const bundAnteilPauschal = 0.015;
      kapitalKanton = Math.max(0, kapital * (kapSatz - bundAnteilPauschal));
    }
  }
  const kapitalsteuer = kapitalBund + kapitalKanton;

  return {
    einkommen: Math.round(einkommensteuerTotal),
    einkommenBund: Math.round(bundSteuer),
    einkommenKanton: Math.round(einkommensteuerKantonal),
    vermoegen: Math.round(vermoegensteuer),
    kapital: Math.round(kapitalsteuer),
    kapitalBund: Math.round(kapitalBund),
    kapitalKanton: Math.round(kapitalKanton),
    total: Math.round(einkommensteuerTotal + vermoegensteuer + kapitalsteuer),
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

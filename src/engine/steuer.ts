/**
 * Steuer-Engine V2 (basierend auf offiziellen ESTV-Tariftabellen).
 *
 * Strategie:
 *  - Lädt JSON-Snapshots aus `./steuer-data/{year}/` (aus
 *    github.com/devbrains-com/swisstaxcalculator, MIT License) und nutzt
 *    `./steuer-engine/` für die Berechnung.
 *  - Bundessteuer: echter DBG-Tarif progressiv.
 *  - Kantonssteuer: echte progressive Tarife für alle 26 Kantone +
 *    Steuerfüsse Kanton/Gemeinde/Kirche pro Gemeinde (BfsID).
 *  - Vermögenssteuer: progressiv pro Kanton mit Freibeträgen.
 *  - Kapitalauszahlungssteuer: 1/5 DBG (Bund) + Kanton-Sondertarif (1/20 für ZH).
 *  - User-Anker (Steuern_heute) überschreibt die Berechnung proportional.
 *
 * Vereinfachungen (offen für spätere Etappen):
 *  - Kinderabzüge / Säule-3a-Abzüge nicht modelliert (bruttoZuSteuerbarApprox)
 *  - Standardgemeinde = Hauptort des Kantons (User kann später spezifische
 *    Gemeinde wählen via bfsId)
 *  - Kapitalauszahlungssteuer pro Kanton: ZH echter 1/20-Tarif, andere
 *    nähern sich via 1/5-DBG-Bund + Pauschalsatz
 */

import {
  einkommensteuerKanton,
  vermoegensteuerKanton,
  bundessteuerEinkommen,
  bundessteuerKapitalNeu,
  kantonsteuerKapitalZh,
  KANTON_INFO,
  type Fallart,
  type KantonCode,
  type Religion,
  type SteuerJahr,
} from "./steuer-engine";

// Re-export für Backwards-Kompatibilität (Religion-Type wird aus dem Wizard
// importiert und sollte mit der Engine-Religion identisch sein)
export type { Religion } from "./steuer-engine/types";

/** Bruttojahreseinkommen → steuerbares Einkommen (Daumenregel 85%). */
export function bruttoZuSteuerbarApprox(brutto: number): number {
  return Math.round(brutto * 0.85);
}

export interface SteuerInput {
  einkommenJahr: number;
  vermoegenJahr: number;
  kapAuszahlungenJahr: number;
  kanton: string;
  religion: Religion;
  /** Steuerkategorie: einzel oder paar. */
  fallart?: Fallart;
  /** BfsID einer spezifischen Gemeinde (sonst Hauptort des Kantons). */
  bfsId?: number;
  /** Steuerjahr (Default 2025, max 2026 — neuere Jahre fallen auf 2026 zurück). */
  jahr?: number;
  /** Anker fürs Kalibrierungs-Jahr (vom User eingegeben). */
  ankerSteuernHeute?: number | null;
  ankerEinkommenHeute?: number | null;
}

export interface SteuerOutput {
  einkommen: number; // Total Einkommenssteuer (Bund + Kanton/Gemeinde/Kirche)
  einkommenBund: number; // davon Bundessteuer (DBG)
  einkommenKanton: number; // davon Kanton+Gemeinde+Kirche
  vermoegen: number;
  kapital: number; // Total Kapitalauszahlungssteuer
  kapitalBund: number; // davon Bund (1/5 DBG)
  kapitalKanton: number; // davon Kanton (Sondertarif oder Pauschal)
  total: number;
  /** True wenn der User-Anker verwendet wurde. */
  kalibriert: boolean;
}

/** Clamp Jahr auf verfügbare Tarife (2025/2026). */
function clampJahr(jahr: number | undefined): SteuerJahr {
  const j = jahr ?? 2025;
  if (j <= 2025) return 2025;
  return 2026;
}

/** Validiert Kanton-String oder gibt null zurück (= unbekannter Kanton). */
function asKantonCode(kanton: string): KantonCode | null {
  return kanton in KANTON_INFO ? (kanton as KantonCode) : null;
}

export function steuerProJahr(input: SteuerInput): SteuerOutput {
  const fallart: Fallart = input.fallart === "paar" ? "paar" : "einzel";
  const jahr = clampJahr(input.jahr);
  const kantonCode = asKantonCode(input.kanton);
  const religion = input.religion;

  // Bundessteuer (Phase 4.2 → jetzt aus ESTV-Tabellen)
  const steuerbaresEinkommen = bruttoZuSteuerbarApprox(input.einkommenJahr);
  const bundSteuer = kantonCode
    ? bundessteuerEinkommen(steuerbaresEinkommen, fallart, jahr)
    : bundessteuerEinkommen(steuerbaresEinkommen, fallart, jahr);

  // Kantons-/Gemeinde-/Kirchensteuer (Phase 4.3-4.4 → jetzt für alle 26 Kantone)
  let kantonsteuerNetto = 0;
  if (kantonCode) {
    const r = einkommensteuerKanton(steuerbaresEinkommen, {
      kanton: kantonCode,
      bfsId: input.bfsId,
      fallart,
      religion,
      jahr,
    });
    kantonsteuerNetto = r.total;
  } else {
    // Unbekannter Kanton: Schweiz-Median ~16% Bund+Kanton effektiv,
    // davon Bund schon separat → Rest pauschal
    kantonsteuerNetto = Math.max(0, steuerbaresEinkommen * 0.13);
  }

  // Anker-Modus: User-Eingabe überschreibt Default
  let einkommensteuerKantonal = kantonsteuerNetto;
  let kalibriert = false;
  if (
    input.ankerSteuernHeute != null &&
    input.ankerSteuernHeute > 0 &&
    input.ankerEinkommenHeute != null &&
    input.ankerEinkommenHeute > 0
  ) {
    const totalAnkerProportional =
      input.ankerSteuernHeute *
      (input.einkommenJahr / input.ankerEinkommenHeute);
    einkommensteuerKantonal = Math.max(0, totalAnkerProportional - bundSteuer);
    kalibriert = true;
  }

  const einkommensteuerTotal = bundSteuer + einkommensteuerKantonal;

  // Vermögenssteuer (Phase 4.6 → jetzt für alle 26 Kantone)
  let vermoegensteuer = 0;
  const vermoegen = Math.max(0, input.vermoegenJahr);
  if (vermoegen > 0 && kantonCode) {
    const r = vermoegensteuerKanton(vermoegen, {
      kanton: kantonCode,
      bfsId: input.bfsId,
      fallart,
      religion,
      jahr,
    });
    vermoegensteuer = r.total;
  } else if (vermoegen > 0) {
    // Unbekannter Kanton: Default 3‰ mit Freibetrag 80k single / 160k paar
    const freibetrag = fallart === "paar" ? 160_000 : 80_000;
    vermoegensteuer = Math.max(0, vermoegen - freibetrag) * 0.003;
  }

  // Kapitalauszahlungssteuer (Phase 4.5)
  const kapital = Math.max(0, input.kapAuszahlungenJahr);
  let kapitalBund = 0;
  let kapitalKanton = 0;
  if (kapital > 0) {
    kapitalBund = bundessteuerKapitalNeu(kapital, fallart, jahr);
    if (kantonCode === "ZH") {
      kapitalKanton = kantonsteuerKapitalZh(
        kapital,
        fallart,
        religion,
        jahr,
        input.bfsId
      );
    } else if (kantonCode) {
      // Andere Kantone: 1/5-Approximation des Einkommens-Tarifs als
      // Kapital-Sondertarif (übliche Daumenregel)
      const r = einkommensteuerKanton(kapital, {
        kanton: kantonCode,
        bfsId: input.bfsId,
        fallart,
        religion,
        jahr,
      });
      kapitalKanton = r.total / 5;
    } else {
      // Unbekannter Kanton: Pauschal 6%
      kapitalKanton = kapital * 0.06;
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
 * Indikative Jahressteuer heute, für die Anzeige im Block 3 (falls kein Anker).
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

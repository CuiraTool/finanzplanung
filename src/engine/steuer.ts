/**
 * Steuer-Engine V3 — präzise Abzüge nach Schweizer Steuerrecht.
 *
 * Strategie:
 *  - Brutto-Erwerbseinkommen pro Person → echte Sozial+BVG+Berufsauslagen+3a-
 *    Abzüge → steuerbares Einkommen separat für DBG (Bund) und Kanton.
 *  - Bundessteuer + Kantonssteuer mit ESTV-Tariftabellen (alle 26 Kantone).
 *  - Vermögenssteuer: progressiv pro Kanton mit Freibeträgen.
 *  - Kapitalauszahlungssteuer: 1/5 DBG (Bund) + Kanton-Sondertarif.
 *  - User-Anker (Steuern_heute) überschreibt die Berechnung proportional.
 *
 * Vereinfachungen (offen):
 *  - Kanton-Pauschalen: ZH-Werte als Default, andere Kantone gleich (Etappe
 *    später ausdifferenziert).
 *  - Schuldzinsen-Abzug bei Hypothek noch nicht modelliert.
 *  - Eigenmietwert noch nicht in Einkommen integriert.
 *  - NBU-Pauschal 1 % (real je Branche 0.7-1.5 %).
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
import {
  abzuegeDbg,
  abzuegeKanton,
  type AbzugDetail,
} from "./steuer-abzuege";

// Re-export für Backwards-Kompatibilität
export type { Religion } from "./steuer-engine/types";

/**
 * Brutto → steuerbar — Daumenregel-Funktion (DEPRECATED, nur noch für
 * Backwards-Compat falls jemand sie ohne Kontext aufruft). Neue Berechnungen
 * sollten `abzuegeDbg`/`abzuegeKanton` direkt nutzen.
 */
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
  /** Steuerjahr (Default 2025, max 2026). */
  jahr?: number;
  /** Anker fürs Kalibrierungs-Jahr (vom User eingegeben). */
  ankerSteuernHeute?: number | null;
  ankerEinkommenHeute?: number | null;

  // ─── Detail-Felder für präzise Abzüge (Phase 5: Steuer-Abzuege-Engine) ───
  /** Brutto-Erwerbseinkommen Person 1 — wenn 0 oder undefined: keine
   *  Sozial+BVG+Berufsauslagen-Abzüge (z.B. nach Pensionierung). */
  bruttoErwerbP1?: number;
  bruttoErwerbP2?: number;
  alterP1?: number;
  alterP2?: number;
  anzahlKinder?: number;
  saeule3aEinzahlungJahr?: number;
  /** PK-Einkauf Total Haushalt im Jahr (CHF). Voll abzugsfähig. */
  pkEinkaufJahr?: number;
  hatPkAnschlussP1?: boolean;
  hatPkAnschlussP2?: boolean;
  /**
   * Wenn true: bruttoErwerbP1/P2 sind als Netto interpretiert.
   * Sozial-/BVG-Abzüge fallen weg. Siehe AbzugInput.einkommenIstNetto.
   */
  einkommenIstNetto?: boolean;
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
  /** Optional: Detail der Abzüge (DBG + Kanton) für UI-Anzeige. */
  abzuegeDbg?: AbzugDetail;
  abzuegeKanton?: AbzugDetail;
}

/** Clamp Jahr auf verfügbare Tarife (2025/2026). */
function clampJahr(jahr: number | undefined): SteuerJahr {
  const j = jahr ?? 2025;
  if (j <= 2025) return 2025;
  return 2026;
}

function asKantonCode(kanton: string): KantonCode | null {
  return kanton in KANTON_INFO ? (kanton as KantonCode) : null;
}

export function steuerProJahr(input: SteuerInput): SteuerOutput {
  const fallart: Fallart = input.fallart === "paar" ? "paar" : "einzel";
  const jahr = clampJahr(input.jahr);
  const kantonCode = asKantonCode(input.kanton);
  const religion = input.religion;

  // ─── Abzüge berechnen (DBG + Kanton getrennt) ────────────────────────
  // Wenn detailfelder vorhanden: echte Abzüge berechnen.
  // Sonst: bruttoZuSteuerbarApprox als Fallback (für Aufrufer ohne Kontext).
  const hatDetailfelder =
    input.bruttoErwerbP1 != null ||
    input.bruttoErwerbP2 != null ||
    input.anzahlKinder != null ||
    input.saeule3aEinzahlungJahr != null ||
    input.pkEinkaufJahr != null;

  let steuerbarBund: number;
  let steuerbarKanton: number;
  let abzuegeBund: AbzugDetail | undefined;
  let abzuegeKt: AbzugDetail | undefined;

  if (hatDetailfelder) {
    const abzInput = {
      bruttoErwerbP1: Math.max(0, input.bruttoErwerbP1 ?? 0),
      bruttoErwerbP2: Math.max(0, input.bruttoErwerbP2 ?? 0),
      alterP1: input.alterP1 ?? 40,
      alterP2: input.alterP2 ?? 40,
      fallart,
      anzahlKinder: Math.max(0, input.anzahlKinder ?? 0),
      saeule3aEinzahlungJahr: Math.max(0, input.saeule3aEinzahlungJahr ?? 0),
      pkEinkaufJahr: Math.max(0, input.pkEinkaufJahr ?? 0),
      hatPkAnschlussP1: input.hatPkAnschlussP1 ?? false,
      hatPkAnschlussP2: input.hatPkAnschlussP2 ?? false,
      einkommenIstNetto: input.einkommenIstNetto ?? false,
    };
    abzuegeBund = abzuegeDbg(abzInput);
    abzuegeKt = abzuegeKanton(abzInput, kantonCode ?? "ZH");

    // Renten/Mieten/etc. = einkommenJahr - bruttoErwerb (Total) wird zur
    // Bemessungsgrundlage addiert (kein BVG/Sozial/Berufsauslagen darauf,
    // aber sehr wohl Versicherungs-/Kinder-/Doppelverdiener-Abzug bleibt).
    const nichtErwerb = Math.max(
      0,
      input.einkommenJahr - abzInput.bruttoErwerbP1 - abzInput.bruttoErwerbP2
    );
    steuerbarBund = Math.max(0, abzuegeBund.steuerbar + nichtErwerb);
    steuerbarKanton = Math.max(0, abzuegeKt.steuerbar + nichtErwerb);
  } else {
    // Fallback: alte 0.85-Daumenregel (aus Backwards-Compat-Tests / einfache Aufrufer)
    const approx = bruttoZuSteuerbarApprox(input.einkommenJahr);
    steuerbarBund = approx;
    steuerbarKanton = approx;
  }

  // ─── Bundessteuer ────────────────────────────────────────────────────
  const bundSteuer = bundessteuerEinkommen(steuerbarBund, fallart, jahr);

  // ─── Kantons-/Gemeinde-/Kirchensteuer ────────────────────────────────
  let kantonsteuerNetto = 0;
  if (kantonCode) {
    const r = einkommensteuerKanton(steuerbarKanton, {
      kanton: kantonCode,
      bfsId: input.bfsId,
      fallart,
      religion,
      jahr,
    });
    kantonsteuerNetto = r.total;
  } else {
    // Unbekannter Kanton: Pauschal 13 % auf steuerbar (Schweiz-Median nach Bund)
    kantonsteuerNetto = Math.max(0, steuerbarKanton * 0.13);
  }

  // ─── Anker-Modus ─────────────────────────────────────────────────────
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

  // ─── Vermögenssteuer ─────────────────────────────────────────────────
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
    const freibetrag = fallart === "paar" ? 160_000 : 80_000;
    vermoegensteuer = Math.max(0, vermoegen - freibetrag) * 0.003;
  }

  // ─── Kapitalauszahlungssteuer ────────────────────────────────────────
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
      const r = einkommensteuerKanton(kapital, {
        kanton: kantonCode,
        bfsId: input.bfsId,
        fallart,
        religion,
        jahr,
      });
      kapitalKanton = r.total / 5;
    } else {
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
    abzuegeDbg: abzuegeBund,
    abzuegeKanton: abzuegeKt,
  };
}

/**
 * Indikative Jahressteuer heute (Block 3 Anzeige). Nutzt die simple Approx,
 * weil hier kein Detail-Kontext vorhanden ist.
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

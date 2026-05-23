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
  kantonsteuerKapital,
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
  /**
   * Eigenmietwert (CHF/Jahr) — Summe über alle selbstbewohnten Liegen-
   * schaften. Wird zum steuerbaren Einkommen addiert. Nur bei Steuerjahr
   * ≤ 2029 wirksam — ab 2030 entfällt die Eigenmietwertbesteuerung
   * aufgrund der Reform 2030 (Volksabstimmung Sept 2025 angenommen).
   */
  eigenmietwertJahr?: number;
  /**
   * Schuldzinsen (CHF/Jahr) — Summe über alle laufenden Hypothek-Tranchen.
   * Wird vom steuerbaren Einkommen abgezogen. Nur bei Steuerjahr ≤ 2029
   * wirksam, parallel zum Eigenmietwert (Reform 2030).
   */
  schuldzinsenJahr?: number;
  /**
   * Alimente / Unterhaltsbeiträge (CHF/Jahr). Voll vom steuerbaren
   * Einkommen abzugsfähig (Art. 33 Abs. 1 lit. c DBG). Wirkt ohne
   * Jahres-Restriktion.
   */
  alimenteJahr?: number;
}

/**
 * Eigenmietwert + Schuldzinsabzug gelten bis und mit Steuerjahr 2029.
 * Ab Steuerjahr 2030 entfällt beides (Reform 2030, Volksabstimmung
 * Sept 2025 angenommen). Diese Konstante macht den Cutoff zentral.
 */
export const EIGENMIETWERT_LETZTES_JAHR = 2029;

export function eigenmietwertAktivImJahr(jahr: number): boolean {
  return jahr <= EIGENMIETWERT_LETZTES_JAHR;
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
  /** Steuerbares Einkommen Kanton (Bemessungsgrundlage Kantons-/Gemeindesteuer). */
  steuerbaresEinkommenKanton?: number;
  /** Steuerbares Einkommen Bund (DBG-Bemessungsgrundlage). */
  steuerbaresEinkommenBund?: number;
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
  const kalenderjahr = input.jahr ?? new Date().getFullYear();
  const kantonCode = asKantonCode(input.kanton);
  const { religion } = input;

  // Eigenmietwert + Schuldzinsabzug: nur bis und mit Steuerjahr 2029
  // (Reform 2030). Ab Steuerjahr 2030 ignoriert die Engine beide Werte.
  const eigenmietwertEff = eigenmietwertAktivImJahr(kalenderjahr)
    ? Math.max(0, input.eigenmietwertJahr ?? 0)
    : 0;
  const schuldzinsenEff = eigenmietwertAktivImJahr(kalenderjahr)
    ? Math.max(0, input.schuldzinsenJahr ?? 0)
    : 0;
  const alimenteEff = Math.max(0, input.alimenteJahr ?? 0);

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
    // Plus Eigenmietwert (bis 2029), minus Schuldzinsen (bis 2029) und
    // minus Alimente (laufend).
    const nichtErwerb = Math.max(
      0,
      input.einkommenJahr - abzInput.bruttoErwerbP1 - abzInput.bruttoErwerbP2
    );
    const zusatzPlus = eigenmietwertEff;
    const zusatzMinus = schuldzinsenEff + alimenteEff;
    steuerbarBund = Math.max(
      0,
      abzuegeBund.steuerbar + nichtErwerb + zusatzPlus - zusatzMinus
    );
    steuerbarKanton = Math.max(
      0,
      abzuegeKt.steuerbar + nichtErwerb + zusatzPlus - zusatzMinus
    );
  } else {
    // Fallback: alte 0.85-Daumenregel (aus Backwards-Compat-Tests / einfache Aufrufer)
    // Eigenmietwert/Schuldzinsen/Alimente werden hier zusätzlich verrechnet,
    // damit der Fallback nicht silent komplett ignoriert.
    const approx = bruttoZuSteuerbarApprox(input.einkommenJahr);
    const zusatz = eigenmietwertEff - schuldzinsenEff - alimenteEff;
    steuerbarBund = Math.max(0, approx + zusatz);
    steuerbarKanton = Math.max(0, approx + zusatz);
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
      anzahlKinder: input.anzahlKinder,
    });
    vermoegensteuer = r.total;
  } else if (vermoegen > 0) {
    // Fallback nur wenn kantonCode null/leer — alle 26 CH-Kantone haben
    // ESTV-Daten, dieser Pfad triggert nur bei corrupt State. Default-Satz
    // 0.6 % p.a. liegt im Schweizer Median (Range 0.5-0.8 %).
    const freibetrag = fallart === "paar" ? 160_000 : 80_000;
    vermoegensteuer = Math.max(0, vermoegen - freibetrag) * 0.006;
  }

  // ─── Kapitalauszahlungssteuer ────────────────────────────────────────
  const kapital = Math.max(0, input.kapAuszahlungenJahr);
  let kapitalBund = 0;
  let kapitalKanton = 0;
  if (kapital > 0) {
    kapitalBund = bundessteuerKapitalNeu(kapital, fallart, jahr);
    if (kantonCode) {
      // Einheitliche Sondertarif-Engine pro Kanton (§38 ZH-Standard +
      // konfigurierbarer Teiler/Mindestsatz pro Kanton).
      kapitalKanton = kantonsteuerKapital(kapital, {
        kanton: kantonCode,
        bfsId: input.bfsId,
        fallart,
        religion,
        jahr,
      });
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
    /** Steuerbares Einkommen Kanton (Bemessungsgrundlage Kantons-/Gemeindesteuer). */
    steuerbaresEinkommenKanton: Math.round(steuerbarKanton),
    /** Steuerbares Einkommen Bund (DBG-Bemessungsgrundlage). */
    steuerbaresEinkommenBund: Math.round(steuerbarBund),
  };
}

/**
 * Anteil einer ausserkantonalen Liegenschaft für die interkantonale
 * Steuerausscheidung (Sprint 2.1).
 */
export interface FremdKantonAnteil {
  /** ISO-Kanton-Code (z.B. "VS", "GR"). */
  kanton: string;
  /** BfsId der Gemeinde — wichtig für Gemeinde-Multiplikator. */
  bfsId?: number;
  /**
   * Mieteinnahmen aus dieser Liegenschaft im Jahr (CHF). Bei Renditeliegen-
   * schaft brutto, bei Eigenheim 0 (Eigenmietwert nicht modelliert).
   */
  mietenJahr: number;
  /**
   * Netto-Vermögen (Verkehrswert − Hypothek dieser Liegenschaft) im Jahr.
   * Wird im Liegenschafts-Kanton versteuert.
   */
  vermoegenNetto: number;
}

/**
 * Interkantonale Steuerausscheidung — vereinfachte Implementation.
 *
 * Regel (CH-Steuerrecht, vereinfacht):
 *  - Bundessteuer: am Wohnsitz, auf Gesamteinkommen
 *  - Kantonale Einkommensteuer: Erwerb + Renten am Wohnsitz, Mieten am
 *    Liegenschafts-Kanton (quotal)
 *  - Vermögenssteuer: Bewegliches am Wohnsitz, Liegenschaft am Liegenschafts-
 *    Kanton
 *  - Tarif-Progression: streng würde der Wohnsitz mit Gesamteinkommen
 *    rechnen und Steuer dann quotal aufteilen ("Satzbestimmend"). V1
 *    vereinfacht: Wohnsitz rechnet auf reduziertem Einkommen → leichte
 *    Unterschätzung der Wohnsitz-Steuer (konservativ).
 *  - Schuldzinsen-Aufteilung quotal: nicht modelliert (Schuldzinsabzug
 *    ist eh deaktiviert wegen Reform 2028).
 *
 * Wenn `fremdAnteile` leer ist → äquivalent zu steuerProJahr.
 */
export function steuerProJahrIK(
  input: SteuerInput,
  fremdAnteile: FremdKantonAnteil[]
): SteuerOutput {
  if (fremdAnteile.length === 0) {
    return steuerProJahr(input);
  }

  const fremdMietenTotal = fremdAnteile.reduce(
    (s, a) => s + Math.max(0, a.mietenJahr),
    0
  );
  const fremdVermoegenTotal = fremdAnteile.reduce(
    (s, a) => s + Math.max(0, a.vermoegenNetto),
    0
  );

  // 1. Voll-Aufruf für Bund-Anteil (Gesamteinkommen-Tarif)
  const voll = steuerProJahr(input);

  // 2. Wohnsitz-Kanton auf reduziertes Einkommen + Vermögen
  const wohnsitzReduziert = steuerProJahr({
    ...input,
    einkommenJahr: Math.max(0, input.einkommenJahr - fremdMietenTotal),
    vermoegenJahr: Math.max(0, input.vermoegenJahr - fremdVermoegenTotal),
    // Anker neutralisieren — sonst wird er auf reduziertes Einkommen
    // skaliert (würde 2× wirken, einmal hier einmal in Bund)
    ankerSteuernHeute: null,
    ankerEinkommenHeute: null,
  });

  // 3. Pro Fremdkanton: nur Mieten + Liegenschafts-Netto
  let fremdEinkKtTotal = 0;
  let fremdVermKtTotal = 0;
  const heuteJahr = input.jahr ?? new Date().getFullYear();
  const steuerjahr: SteuerJahr = heuteJahr <= 2025 ? 2025 : 2026;
  const fallart = input.fallart === "paar" ? "paar" : "einzel";
  const religion = input.religion;

  for (const a of fremdAnteile) {
    const fkKanton = a.kanton in KANTON_INFO ? (a.kanton as KantonCode) : null;
    if (!fkKanton) continue;
    if (a.mietenJahr > 0) {
      const r = einkommensteuerKanton(Math.max(0, a.mietenJahr), {
        kanton: fkKanton,
        bfsId: a.bfsId,
        fallart,
        religion,
        jahr: steuerjahr,
      });
      fremdEinkKtTotal += r.total;
    }
    if (a.vermoegenNetto > 0) {
      const r = vermoegensteuerKanton(Math.max(0, a.vermoegenNetto), {
        kanton: fkKanton,
        bfsId: a.bfsId,
        fallart,
        religion,
        jahr: steuerjahr,
        anzahlKinder: input.anzahlKinder,
      });
      fremdVermKtTotal += r.total;
    }
  }

  const einkommenBund = voll.einkommenBund;
  const einkommenKanton = wohnsitzReduziert.einkommenKanton + fremdEinkKtTotal;
  const einkommenTotal = einkommenBund + einkommenKanton;
  const vermoegen = wohnsitzReduziert.vermoegen + fremdVermKtTotal;

  return {
    einkommen: Math.round(einkommenTotal),
    einkommenBund: Math.round(einkommenBund),
    einkommenKanton: Math.round(einkommenKanton),
    vermoegen: Math.round(vermoegen),
    kapital: voll.kapital,
    kapitalBund: voll.kapitalBund,
    kapitalKanton: voll.kapitalKanton,
    total: Math.round(einkommenTotal + vermoegen + voll.kapital),
    kalibriert: voll.kalibriert,
    abzuegeDbg: voll.abzuegeDbg,
    abzuegeKanton: voll.abzuegeKanton,
    steuerbaresEinkommenKanton: voll.steuerbaresEinkommenKanton,
    steuerbaresEinkommenBund: voll.steuerbaresEinkommenBund,
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

/**
 * Indikative Steuer-Eckwerte heute — Total + steuerbares Einkommen.
 * Für Block-3-Anzeige im Wizard (Berater sieht die Bemessungsgrundlage).
 */
export function indikativeSteuerDetailHeute(
  einkommenHeute: number,
  vermoegenHeute: number,
  kanton: string,
  religion: Religion
): { total: number; steuerbaresEinkommen: number } {
  const r = steuerProJahr({
    einkommenJahr: einkommenHeute,
    vermoegenJahr: vermoegenHeute,
    kapAuszahlungenJahr: 0,
    kanton,
    religion,
  });
  return {
    total: r.total,
    steuerbaresEinkommen: r.steuerbaresEinkommenKanton ?? 0,
  };
}

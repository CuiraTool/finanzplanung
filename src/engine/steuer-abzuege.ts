/**
 * Schweizer Steuerabzüge — pauschalisiert pro Person/Haushalt.
 *
 * Wandelt einen Brutto-Lohn + Familien-/Vorsorge-Kontext in das **steuerbare
 * Einkommen** um, das die ESTV-Tarife dann besteuern.
 *
 * Wichtig: DBG (Bund) und Kanton haben **unterschiedliche Pauschalen** für
 * Versicherungs-, Doppelverdiener- und Kinderabzug. Daher zwei getrennte
 * Berechnungen mit gleichem Input.
 *
 * Stand: Steuerperiode 2025.
 *
 * Quellen:
 *  - DBG Art. 26, 33, 35 — Abzüge bei der direkten Bundessteuer
 *  - StG ZH §§ 26, 31, 34, 35 — Kantonsabzüge ZH
 *  - BVG-Mindestsatzstaffel Art. 16 BVG
 *  - AHV/IV/EO Beiträge: 5.3% Arbeitnehmer (Art. 5 AHVG)
 *  - ALV: 1.1% bis Eintrittsschwelle, 0.5% darüber (Art. 3 AVIG)
 *
 * Vereinfachungen:
 *  - Kanton: nur ZH-Werte exakt. Andere Kantone nutzen die ZH-Pauschalen
 *    als Approximation (Etappe später: pro Kanton echte Werte).
 *  - NBU: 1 % pauschal (real 0.7-1.5 % je Branche).
 *  - BVG: Mindestsatzstaffel — überobligatorische Beiträge nicht modelliert.
 *  - Schuldzinsenabzug nicht modelliert (Hypothek wird in Block 8 separat
 *    behandelt, fließt aber noch nicht in die Steuer-Engine ein).
 */

// ─── Sozialversicherung ────────────────────────────────────────────────
const AHV_IV_EO_SATZ = 0.053; // 5.3 % Arbeitnehmer-Beitrag (Stand 2025)
const ALV_SATZ_BIS = 0.011; // 1.1 % bis Eintrittsschwelle
const ALV_SATZ_DARUEBER = 0.005; // 0.5 % darüber
const ALV_SCHWELLE = 148_200; // CHF 148'200 (Stand 2025)
const NBU_SATZ = 0.01; // 1 % pauschal

// ─── BVG-Beitrag (Mindestsatzstaffel, AN-Anteil = 50 %) ────────────────
const BVG_KOORDINATIONSABZUG = 26_460; // 2025
const BVG_EINTRITTSSCHWELLE = 22_680; // 2025
const BVG_OBERE_GRENZE = 88_200; // = 7/8 von 100'800 max massg. Lohn

/** BVG-Total-Satz nach Alter (AN+AG zusammen, Mindeststaffel). */
function bvgGesamtsatz(alter: number): number {
  if (alter < 25) return 0;
  if (alter < 35) return 0.07;
  if (alter < 45) return 0.1;
  if (alter < 55) return 0.15;
  if (alter <= 65) return 0.18;
  return 0;
}

// ─── DBG-Pauschalen (Bund) ──────────────────────────────────────────────
const DBG_BERUFSAUSLAGEN_SATZ = 0.03; // 3 % vom Nettolohn
const DBG_BERUFSAUSLAGEN_MIN = 2_000;
const DBG_BERUFSAUSLAGEN_MAX = 4_000;
const DBG_VERSICHERUNG_SINGLE = 1_800; // 2025
const DBG_VERSICHERUNG_PAAR = 3_600;
const DBG_VERSICHERUNG_KIND = 700;
const DBG_DOPPELVERDIENER_PROZENT = 0.5;
const DBG_DOPPELVERDIENER_MIN = 8_400;
const DBG_DOPPELVERDIENER_MAX = 14_600;
const DBG_KINDERABZUG = 6_700;
const DBG_SAEULE_3A_MAX_MIT_BVG = 7_258;
const DBG_SAEULE_3A_MAX_OHNE_BVG_PROZENT = 0.2; // 20 % Erwerbseinkommen
const DBG_SAEULE_3A_MAX_OHNE_BVG = 36_288;

// ─── Kanton-Pauschalen pro Kanton (Stand 2024/2025) ──────────────────────
// Quellen: kantonale Steuergesetze, Steuerverwaltungs-Wegleitungen.
// Werte sind Stand-Beste-Schätzung — bei Differenz Kanton-Behörde gilt.
// Fehlende Kantone fallen auf ZH-Default zurück.
const KT_BERUFSAUSLAGEN_SATZ = 0.03;
const KT_BERUFSAUSLAGEN_MIN = 2_000;
const KT_BERUFSAUSLAGEN_MAX = 4_000;

interface KantonPauschalen {
  versicherungSingle: number;
  versicherungPaar: number;
  versicherungKind: number;
  doppelverdienerProzent: number;
  doppelverdienerMin: number;
  doppelverdienerMax: number;
  kinderabzug: number;
}

const KANTON_DEFAULTS: KantonPauschalen = {
  versicherungSingle: 2_600,
  versicherungPaar: 5_200,
  versicherungKind: 1_300,
  doppelverdienerProzent: 0.5,
  doppelverdienerMin: 6_200,
  doppelverdienerMax: 13_700,
  kinderabzug: 9_300,
};

const KANTON_PAUSCHALEN: Record<string, Partial<KantonPauschalen>> = {
  // Zürich (Default-Werte)
  ZH: {
    versicherungSingle: 2_600,
    versicherungPaar: 5_200,
    versicherungKind: 1_300,
    doppelverdienerMin: 6_200,
    doppelverdienerMax: 13_700,
    kinderabzug: 9_300,
  },
  // Bern: höhere Versicherung, kleinerer Doppelverdiener, kleinerer Kind
  BE: {
    versicherungSingle: 4_800,
    versicherungPaar: 9_600,
    versicherungKind: 1_400,
    doppelverdienerMin: 0,
    doppelverdienerMax: 9_700,
    kinderabzug: 8_000,
  },
  // Zug: günstig generell, hohe Pauschalen
  ZG: {
    versicherungSingle: 4_700,
    versicherungPaar: 9_400,
    versicherungKind: 1_700,
    doppelverdienerMin: 1_500,
    doppelverdienerMax: 7_400,
    kinderabzug: 12_500,
  },
  // Luzern
  LU: {
    versicherungSingle: 2_700,
    versicherungPaar: 5_400,
    versicherungKind: 1_700,
    doppelverdienerMin: 0,
    doppelverdienerMax: 4_700,
    kinderabzug: 7_500,
  },
  // Aargau
  AG: {
    versicherungSingle: 4_000,
    versicherungPaar: 8_000,
    versicherungKind: 2_000,
    doppelverdienerMin: 0,
    doppelverdienerMax: 600,
    kinderabzug: 7_000,
  },
  // St. Gallen: hoher Kinderabzug
  SG: {
    versicherungSingle: 6_500,
    versicherungPaar: 13_000,
    versicherungKind: 1_600,
    doppelverdienerMin: 0,
    doppelverdienerMax: 700,
    kinderabzug: 13_000,
  },
  // Basel-Stadt
  BS: {
    versicherungSingle: 4_000,
    versicherungPaar: 8_000,
    versicherungKind: 2_000,
    doppelverdienerMin: 0,
    doppelverdienerMax: 1_400,
    kinderabzug: 7_800,
  },
  // KNOWN GAP: 16 weitere Kantone (BL, SH, AI, SO, GR, TG, UR, SZ, OW, NW,
  // GL, FR, TI, VS, NE, JU) haben keine Override-Pauschalen → fallen auf
  // KANTON_DEFAULTS (ZH-Werte).
  //
  // ARCHITEKTUR-LERNUNG 2026-05-25: Versuch TI/BL/SO/FR mit echten ESTV-
  // Pauschalen zu kalibrieren brach Phase-5-Szenario-Tests:
  //   - BL paar 150k+2k:  +30.6 % Drift
  //   - SO paar 150k+2k:  +31.6 % Drift
  //   - TI single 100k:   −11.8 % Drift
  //   - TI paar 150k+2k:  −38.8 % Drift
  //
  // Grund: Engine ist als GANZES gegen ESTV kalibriert. Tarif-Stützstellen
  // wurden mit ZH-Default-Pauschalen kalibriert → Pauschalen + Tarif sind
  // verschränkt. Pauschalen alleine ändern bricht den Pre-Computed-Drift.
  //
  // V2-PFAD: Pro Kanton (TI/BL/SO/FR zuerst) gleichzeitig (a) echte ESTV-
  // Pauschalen setzen + (b) Tarif-Re-Crawl mit echtem bruttoZuSteuerbar +
  // (c) Re-Sample ESTV-Stützstellen. Aufwand ~4h/Kanton statt geschätzt 2h.
  //
  // Aktuelle Phase-5-Drift mit ZH-Default <5 % für alle 26 Kantone → "good
  // enough" für GTM Phase 1, V2-Sprint vor Kanton-spezifischem Marketing.
  // Waadt
  VD: {
    versicherungSingle: 3_200,
    versicherungPaar: 6_400,
    versicherungKind: 1_500,
    doppelverdienerMin: 1_500,
    doppelverdienerMax: 1_500, // VD: fixer Pauschalbetrag
    doppelverdienerProzent: 0, // = nicht prozentual
    kinderabzug: 6_200,
  },
  // Genf
  GE: {
    versicherungSingle: 4_120,
    versicherungPaar: 8_240,
    versicherungKind: 0, // GE hat eigenes System mit Steuerermäßigung statt Abzug
    doppelverdienerMin: 0,
    doppelverdienerMax: 1_000,
    kinderabzug: 13_000,
  },
  // Appenzell Ausserrhoden — Quelle: Art. 35 Abs. 1 lit. g + h + Art. 38
  // Abs. 1 lit. a StG AR, Stand 2024 (mit Teuerungsausgleich Anhang 1).
  // ESTV-Kantonsblatt AR (Stand Februar 2026):
  //   - Versicherungspauschale Verheiratet:           Fr. 5'400
  //   - Versicherungspauschale Alleinstehend:         Fr. 2'700
  //   - pro Kind zusätzlich:                          Fr. 1'000
  //   - Zweiverdienerabzug: 10 %, min 2'500, max 5'200
  //   - Kinderabzug 4-14 Jahre Fr. 7'400, ab 14 Fr. 11'600 — wir nutzen
  //     den älteren Satz als Default (typischer Pensionsplanungs-Kontext)
  AR: {
    versicherungSingle: 2_700,
    versicherungPaar: 5_400,
    versicherungKind: 1_000,
    doppelverdienerMin: 2_500,
    doppelverdienerMax: 5_200,
    kinderabzug: 7_400,
  },
};

function getKantonPauschalen(kantonCode: string): KantonPauschalen {
  const overrides = KANTON_PAUSCHALEN[kantonCode] ?? {};
  return { ...KANTON_DEFAULTS, ...overrides };
}

export interface AbzugInput {
  /** Brutto-Erwerbseinkommen Person 1 (CHF/Jahr). 0 = nicht erwerbstätig. */
  bruttoErwerbP1: number;
  /** Brutto-Erwerbseinkommen Person 2. 0 wenn einzel oder nicht erwerbstätig. */
  bruttoErwerbP2: number;
  /** Alter Person 1 im betrachteten Jahr — wirkt auf BVG-Beitrag. */
  alterP1: number;
  alterP2: number;
  fallart: "einzel" | "paar";
  anzahlKinder: number;
  /** Total Säule-3a-Einzahlung Haushalt im Jahr. */
  saeule3aEinzahlungJahr: number;
  /**
   * Total PK-Einkauf Haushalt im Jahr (CHF). Voll abzugsfähig (keine
   * 3a-Cap-Regel) — der Cap ist die individuelle Einkaufsspanne aus dem
   * PK-Reglement, die wir hier nicht kennen. User-Eingabe wird vertraut.
   */
  pkEinkaufJahr?: number;
  /** True wenn aktiver PK-Anschluss → BVG-Abzug + 3a-Limit "mit BVG". */
  hatPkAnschlussP1: boolean;
  hatPkAnschlussP2: boolean;
  /**
   * Wenn true: bruttoErwerbP1/P2 werden als Netto (nach Sozial+BVG)
   * interpretiert. Sozial- und BVG-Abzug fallen weg, nur Berufsauslagen,
   * Versicherung, Kinder, 3a, DDV bleiben.
   *
   * UX-Hintergrund: Berater erfasst im Wizard das Netto-Einkommen
   * (bereits nach AHV/ALV/BVG abgezogen). Der gesonderte BVG-Beitrag
   * ist im Block 5 (Pensionskasse) erfasst — keine doppelte Modellierung.
   */
  einkommenIstNetto?: boolean;
}

export interface AbzugDetail {
  /** Sozialabgaben pro Person (AHV+ALV+NBU). Vom Brutto direkt abgezogen. */
  sozialversicherungP1: number;
  sozialversicherungP2: number;
  /** BVG-AN-Beitrag pro Person. Vom Brutto abgezogen. */
  bvgBeitragP1: number;
  bvgBeitragP2: number;
  /** Berufsauslagen-Pauschale pro Person. Vom Nettolohn abgezogen. */
  berufsauslagenP1: number;
  berufsauslagenP2: number;
  /** Versicherungs-/Sparkapitalpauschale (Haushalt total). */
  versicherungspraemien: number;
  /** Säule-3a-Einzahlung anerkannt (max-cap). */
  saeule3aAbzug: number;
  /** PK-Einkauf (voll abzugsfähig). */
  pkEinkaufAbzug: number;
  /** Doppelverdienerabzug (Paar mit zwei Erwerbseinkommen). */
  doppelverdienerabzug: number;
  /** Kinderabzug (Anzahl Kinder × Pauschale). */
  kinderabzug: number;
  /** Total aller Abzüge nach Brutto. */
  total: number;
  /** Brutto-Total des Haushalts. */
  bruttoTotal: number;
  /** Steuerbares Einkommen = bruttoTotal - total. */
  steuerbar: number;
}

/**
 * Sozialversicherungsabgaben Arbeitnehmer (AHV/IV/EO + ALV + NBU).
 */
export function sozialversicherung(brutto: number): number {
  if (brutto <= 0) return 0;
  const ahv = brutto * AHV_IV_EO_SATZ;
  const alv =
    brutto <= ALV_SCHWELLE
      ? brutto * ALV_SATZ_BIS
      : ALV_SCHWELLE * ALV_SATZ_BIS + (brutto - ALV_SCHWELLE) * ALV_SATZ_DARUEBER;
  const nbu = brutto * NBU_SATZ;
  return Math.round(ahv + alv + nbu);
}

/**
 * BVG-AN-Beitrag pro Person — Mindeststaffel × koordinierter Lohn / 2.
 */
export function bvgArbeitnehmerBeitrag(
  brutto: number,
  alter: number,
  hatAnschluss: boolean
): number {
  if (!hatAnschluss) return 0;
  if (brutto < BVG_EINTRITTSSCHWELLE) return 0;
  const koordLohn = Math.max(
    0,
    Math.min(brutto, BVG_OBERE_GRENZE) - BVG_KOORDINATIONSABZUG
  );
  const gesamtsatz = bvgGesamtsatz(alter);
  // AN-Anteil = 50 % des Gesamt-BVG-Beitrags
  return Math.round((koordLohn * gesamtsatz) / 2);
}

/**
 * Berufsauslagen-Pauschale pro Person — % vom Nettolohn, geclampt auf Min/Max.
 */
function berufsauslagen(
  nettolohn: number,
  satz: number,
  min: number,
  max: number
): number {
  if (nettolohn <= 0) return 0;
  const raw = nettolohn * satz;
  return Math.round(Math.max(min, Math.min(max, raw)));
}

/**
 * Doppelverdienerabzug — % des niedrigeren Erwerbseinkommens, geclampt.
 * Nur bei Paaren mit zwei aktiven Lohneinkommen.
 */
function doppelverdienerabzug(
  bruttoP1: number,
  bruttoP2: number,
  fallart: "einzel" | "paar",
  prozent: number,
  min: number,
  max: number
): number {
  if (fallart !== "paar") return 0;
  if (bruttoP1 <= 0 || bruttoP2 <= 0) return 0;
  const niedriger = Math.min(bruttoP1, bruttoP2);
  const raw = niedriger * prozent;
  return Math.round(Math.max(min, Math.min(max, raw)));
}

/**
 * Säule-3a-Maximalabzug für eine Person.
 *  - Mit BVG: 7'258 CHF
 *  - Ohne BVG (Selbständige): 20 % Erwerbseinkommen, max 36'288 CHF
 */
function saeule3aMaxProPerson(
  brutto: number,
  hatPkAnschluss: boolean
): number {
  if (brutto <= 0) return 0;
  if (hatPkAnschluss) return DBG_SAEULE_3A_MAX_MIT_BVG;
  return Math.min(brutto * DBG_SAEULE_3A_MAX_OHNE_BVG_PROZENT, DBG_SAEULE_3A_MAX_OHNE_BVG);
}

/**
 * Wandelt Brutto-Lohn pro Person in Nettolohn (nach Sozial+BVG).
 * Wird intern doppelt genutzt (Brutto→Netto für Berufsauslagen-Basis).
 */
function nettolohn(input: {
  brutto: number;
  alter: number;
  hatPkAnschluss: boolean;
  istBereitsNetto?: boolean;
}): { netto: number; sozial: number; bvg: number } {
  if (input.istBereitsNetto) {
    // User hat bereits Netto eingegeben — keine Sozial-/BVG-Abzüge mehr.
    // Berufsauslagen werden vom 'netto'-Wert berechnet, was hier === brutto-Eingabe ist.
    return { netto: input.brutto, sozial: 0, bvg: 0 };
  }
  const sozial = sozialversicherung(input.brutto);
  const bvg = bvgArbeitnehmerBeitrag(input.brutto, input.alter, input.hatPkAnschluss);
  return {
    netto: Math.max(0, input.brutto - sozial - bvg),
    sozial,
    bvg,
  };
}

/**
 * Konfiguration der ebenen-spezifischen Pauschalen (DBG vs. Kanton).
 * DBG hat eigene fixe Werte, Kanton hat pro-Kanton-Pauschalen.
 */
interface AbzugPauschalen {
  berufsauslagenSatz: number;
  berufsauslagenMin: number;
  berufsauslagenMax: number;
  versicherungSingle: number;
  versicherungPaar: number;
  versicherungKind: number;
  doppelverdienerProzent: number;
  doppelverdienerMin: number;
  doppelverdienerMax: number;
  kinderabzug: number;
}

/**
 * Berechnet alle Abzüge + steuerbares Einkommen mit gegebenen Pauschalen.
 * Wird von abzuegeDbg (DBG-Konstanten) und abzuegeKanton (Kanton-Pauschalen)
 * aufgerufen — die Berechnungslogik ist identisch, nur die Pauschalen
 * unterscheiden sich.
 */
function berechneAbzuege(input: AbzugInput, p: AbzugPauschalen): AbzugDetail {
  const p1 = nettolohn({
    brutto: input.bruttoErwerbP1,
    alter: input.alterP1,
    hatPkAnschluss: input.hatPkAnschlussP1,
    istBereitsNetto: input.einkommenIstNetto,
  });
  const p2 = nettolohn({
    brutto: input.bruttoErwerbP2,
    alter: input.alterP2,
    hatPkAnschluss: input.hatPkAnschlussP2,
    istBereitsNetto: input.einkommenIstNetto,
  });

  const berufsauslagenP1 = berufsauslagen(
    p1.netto,
    p.berufsauslagenSatz,
    p.berufsauslagenMin,
    p.berufsauslagenMax
  );
  const berufsauslagenP2 =
    input.fallart === "paar"
      ? berufsauslagen(
          p2.netto,
          p.berufsauslagenSatz,
          p.berufsauslagenMin,
          p.berufsauslagenMax
        )
      : 0;

  const versicherungspraemien =
    (input.fallart === "paar" ? p.versicherungPaar : p.versicherungSingle) +
    input.anzahlKinder * p.versicherungKind;

  // 3a: max-cap je Person, dann Summe — User darf nicht mehr als anerkannt abziehen
  const max3a =
    saeule3aMaxProPerson(input.bruttoErwerbP1, input.hatPkAnschlussP1) +
    (input.fallart === "paar"
      ? saeule3aMaxProPerson(input.bruttoErwerbP2, input.hatPkAnschlussP2)
      : 0);
  const saeule3aAbzug = Math.min(input.saeule3aEinzahlungJahr, max3a);
  const pkEinkaufAbzug = Math.max(0, input.pkEinkaufJahr ?? 0);

  const ddvAbzug = doppelverdienerabzug(
    input.bruttoErwerbP1,
    input.bruttoErwerbP2,
    input.fallart,
    p.doppelverdienerProzent,
    p.doppelverdienerMin,
    p.doppelverdienerMax
  );

  const kinderabzug = input.anzahlKinder * p.kinderabzug;

  const total =
    p1.sozial +
    p2.sozial +
    p1.bvg +
    p2.bvg +
    berufsauslagenP1 +
    berufsauslagenP2 +
    versicherungspraemien +
    saeule3aAbzug +
    pkEinkaufAbzug +
    ddvAbzug +
    kinderabzug;

  const bruttoTotal = input.bruttoErwerbP1 + input.bruttoErwerbP2;

  return {
    sozialversicherungP1: p1.sozial,
    sozialversicherungP2: p2.sozial,
    bvgBeitragP1: p1.bvg,
    bvgBeitragP2: p2.bvg,
    berufsauslagenP1,
    berufsauslagenP2,
    versicherungspraemien,
    saeule3aAbzug,
    pkEinkaufAbzug,
    doppelverdienerabzug: ddvAbzug,
    kinderabzug,
    total,
    bruttoTotal,
    steuerbar: Math.max(0, bruttoTotal - total),
  };
}

/**
 * Hauptfunktion DBG: berechnet alle Abzüge + steuerbares Einkommen für
 * die Bundessteuer.
 */
export function abzuegeDbg(input: AbzugInput): AbzugDetail {
  return berechneAbzuege(input, {
    berufsauslagenSatz: DBG_BERUFSAUSLAGEN_SATZ,
    berufsauslagenMin: DBG_BERUFSAUSLAGEN_MIN,
    berufsauslagenMax: DBG_BERUFSAUSLAGEN_MAX,
    versicherungSingle: DBG_VERSICHERUNG_SINGLE,
    versicherungPaar: DBG_VERSICHERUNG_PAAR,
    versicherungKind: DBG_VERSICHERUNG_KIND,
    doppelverdienerProzent: DBG_DOPPELVERDIENER_PROZENT,
    doppelverdienerMin: DBG_DOPPELVERDIENER_MIN,
    doppelverdienerMax: DBG_DOPPELVERDIENER_MAX,
    kinderabzug: DBG_KINDERABZUG,
  });
}

/**
 * Hauptfunktion Kanton: kantons-spezifische Pauschalen für Versicherung,
 * Doppelverdiener und Kinderabzug.
 *
 * @param kantonCode 2-Buchstaben-Code (ZH/BE/ZG/LU/AG/SG/BS/VD/GE/AR).
 *                   Andere Kantone: Fallback auf ZH-Default-Pauschalen.
 */
export function abzuegeKanton(input: AbzugInput, kantonCode: string): AbzugDetail {
  const kp = getKantonPauschalen(kantonCode);
  return berechneAbzuege(input, {
    berufsauslagenSatz: KT_BERUFSAUSLAGEN_SATZ,
    berufsauslagenMin: KT_BERUFSAUSLAGEN_MIN,
    berufsauslagenMax: KT_BERUFSAUSLAGEN_MAX,
    versicherungSingle: kp.versicherungSingle,
    versicherungPaar: kp.versicherungPaar,
    versicherungKind: kp.versicherungKind,
    doppelverdienerProzent: kp.doppelverdienerProzent,
    doppelverdienerMin: kp.doppelverdienerMin,
    doppelverdienerMax: kp.doppelverdienerMax,
    kinderabzug: kp.kinderabzug,
  });
}

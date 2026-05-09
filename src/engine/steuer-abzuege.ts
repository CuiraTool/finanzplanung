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

// ─── Kanton-Pauschalen (ZH-Default für alle Kantone, Etappe später ausdiff.) ─
const KT_BERUFSAUSLAGEN_SATZ = 0.03;
const KT_BERUFSAUSLAGEN_MIN = 2_000;
const KT_BERUFSAUSLAGEN_MAX = 4_000;
const KT_VERSICHERUNG_SINGLE = 2_600; // ZH 2025
const KT_VERSICHERUNG_PAAR = 5_200;
const KT_VERSICHERUNG_KIND = 1_300;
const KT_DOPPELVERDIENER_PROZENT = 0.5;
const KT_DOPPELVERDIENER_MIN = 6_200; // ZH
const KT_DOPPELVERDIENER_MAX = 13_700; // ZH
const KT_KINDERABZUG = 9_300; // ZH

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
  /** True wenn aktiver PK-Anschluss → BVG-Abzug + 3a-Limit "mit BVG". */
  hatPkAnschlussP1: boolean;
  hatPkAnschlussP2: boolean;
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
function sozialversicherung(brutto: number): number {
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
function bvgArbeitnehmerBeitrag(
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
}): { netto: number; sozial: number; bvg: number } {
  const sozial = sozialversicherung(input.brutto);
  const bvg = bvgArbeitnehmerBeitrag(input.brutto, input.alter, input.hatPkAnschluss);
  return {
    netto: Math.max(0, input.brutto - sozial - bvg),
    sozial,
    bvg,
  };
}

/**
 * Hauptfunktion DBG: berechnet alle Abzüge + steuerbares Einkommen für
 * die Bundessteuer.
 */
export function abzuegeDbg(input: AbzugInput): AbzugDetail {
  const p1 = nettolohn({
    brutto: input.bruttoErwerbP1,
    alter: input.alterP1,
    hatPkAnschluss: input.hatPkAnschlussP1,
  });
  const p2 = nettolohn({
    brutto: input.bruttoErwerbP2,
    alter: input.alterP2,
    hatPkAnschluss: input.hatPkAnschlussP2,
  });

  const berufsauslagenP1 = berufsauslagen(
    p1.netto,
    DBG_BERUFSAUSLAGEN_SATZ,
    DBG_BERUFSAUSLAGEN_MIN,
    DBG_BERUFSAUSLAGEN_MAX
  );
  const berufsauslagenP2 =
    input.fallart === "paar"
      ? berufsauslagen(
          p2.netto,
          DBG_BERUFSAUSLAGEN_SATZ,
          DBG_BERUFSAUSLAGEN_MIN,
          DBG_BERUFSAUSLAGEN_MAX
        )
      : 0;

  const versicherungspraemien =
    (input.fallart === "paar" ? DBG_VERSICHERUNG_PAAR : DBG_VERSICHERUNG_SINGLE) +
    input.anzahlKinder * DBG_VERSICHERUNG_KIND;

  // 3a: max-cap je Person, dann Summe — User darf nicht mehr als anerkannt abziehen
  const max3a =
    saeule3aMaxProPerson(input.bruttoErwerbP1, input.hatPkAnschlussP1) +
    (input.fallart === "paar"
      ? saeule3aMaxProPerson(input.bruttoErwerbP2, input.hatPkAnschlussP2)
      : 0);
  const saeule3aAbzug = Math.min(input.saeule3aEinzahlungJahr, max3a);

  const ddvAbzug = doppelverdienerabzug(
    input.bruttoErwerbP1,
    input.bruttoErwerbP2,
    input.fallart,
    DBG_DOPPELVERDIENER_PROZENT,
    DBG_DOPPELVERDIENER_MIN,
    DBG_DOPPELVERDIENER_MAX
  );

  const kinderabzug = input.anzahlKinder * DBG_KINDERABZUG;

  const sozialP1 = p1.sozial;
  const sozialP2 = p2.sozial;
  const bvgP1 = p1.bvg;
  const bvgP2 = p2.bvg;

  const total =
    sozialP1 +
    sozialP2 +
    bvgP1 +
    bvgP2 +
    berufsauslagenP1 +
    berufsauslagenP2 +
    versicherungspraemien +
    saeule3aAbzug +
    ddvAbzug +
    kinderabzug;

  const bruttoTotal = input.bruttoErwerbP1 + input.bruttoErwerbP2;

  return {
    sozialversicherungP1: sozialP1,
    sozialversicherungP2: sozialP2,
    bvgBeitragP1: bvgP1,
    bvgBeitragP2: bvgP2,
    berufsauslagenP1,
    berufsauslagenP2,
    versicherungspraemien,
    saeule3aAbzug,
    doppelverdienerabzug: ddvAbzug,
    kinderabzug,
    total,
    bruttoTotal,
    steuerbar: Math.max(0, bruttoTotal - total),
  };
}

/**
 * Hauptfunktion Kanton: andere Pauschalen für Versicherung, Doppelverdiener,
 * Kinder. Default = ZH-Werte.
 *
 * @param kantonCode 2-Buchstaben-Code (ZH/BE/...). Heute alle gleich (ZH-Defaults),
 *                   später pro Kanton ausdifferenziert.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function abzuegeKanton(input: AbzugInput, _kantonCode: string): AbzugDetail {
  const p1 = nettolohn({
    brutto: input.bruttoErwerbP1,
    alter: input.alterP1,
    hatPkAnschluss: input.hatPkAnschlussP1,
  });
  const p2 = nettolohn({
    brutto: input.bruttoErwerbP2,
    alter: input.alterP2,
    hatPkAnschluss: input.hatPkAnschlussP2,
  });

  const berufsauslagenP1 = berufsauslagen(
    p1.netto,
    KT_BERUFSAUSLAGEN_SATZ,
    KT_BERUFSAUSLAGEN_MIN,
    KT_BERUFSAUSLAGEN_MAX
  );
  const berufsauslagenP2 =
    input.fallart === "paar"
      ? berufsauslagen(
          p2.netto,
          KT_BERUFSAUSLAGEN_SATZ,
          KT_BERUFSAUSLAGEN_MIN,
          KT_BERUFSAUSLAGEN_MAX
        )
      : 0;

  const versicherungspraemien =
    (input.fallart === "paar" ? KT_VERSICHERUNG_PAAR : KT_VERSICHERUNG_SINGLE) +
    input.anzahlKinder * KT_VERSICHERUNG_KIND;

  const max3a =
    saeule3aMaxProPerson(input.bruttoErwerbP1, input.hatPkAnschlussP1) +
    (input.fallart === "paar"
      ? saeule3aMaxProPerson(input.bruttoErwerbP2, input.hatPkAnschlussP2)
      : 0);
  const saeule3aAbzug = Math.min(input.saeule3aEinzahlungJahr, max3a);

  const ddvAbzug = doppelverdienerabzug(
    input.bruttoErwerbP1,
    input.bruttoErwerbP2,
    input.fallart,
    KT_DOPPELVERDIENER_PROZENT,
    KT_DOPPELVERDIENER_MIN,
    KT_DOPPELVERDIENER_MAX
  );

  const kinderabzug = input.anzahlKinder * KT_KINDERABZUG;

  const sozialP1 = p1.sozial;
  const sozialP2 = p2.sozial;
  const bvgP1 = p1.bvg;
  const bvgP2 = p2.bvg;

  const total =
    sozialP1 +
    sozialP2 +
    bvgP1 +
    bvgP2 +
    berufsauslagenP1 +
    berufsauslagenP2 +
    versicherungspraemien +
    saeule3aAbzug +
    ddvAbzug +
    kinderabzug;

  const bruttoTotal = input.bruttoErwerbP1 + input.bruttoErwerbP2;

  return {
    sozialversicherungP1: sozialP1,
    sozialversicherungP2: sozialP2,
    bvgBeitragP1: bvgP1,
    bvgBeitragP2: bvgP2,
    berufsauslagenP1,
    berufsauslagenP2,
    versicherungspraemien,
    saeule3aAbzug,
    doppelverdienerabzug: ddvAbzug,
    kinderabzug,
    total,
    bruttoTotal,
    steuerbar: Math.max(0, bruttoTotal - total),
  };
}

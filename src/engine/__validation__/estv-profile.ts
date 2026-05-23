/**
 * ESTV-Validierungs-Profile (Sprint D11 Phase 1 + 2 + 3 + 4 + 5).
 *
 * Pflicht-Testmatrix für die Cuira-Steuer-Engine vs. offizielle ESTV-
 * Tarifrechner-Werte (https://swisstaxcalculator.estv.admin.ch).
 *
 * Phase 1 (initial):
 *  - 26 Kantone × 4 Einkommensstufen × Single + Konfession "keine" + Hauptort
 *  - 104 Profile, Jahr 2026 (kind="ordentlich")
 *
 * Phase 2 (Paare):
 *  - 26 Kantone × 4 Einkommensstufen × Paar + Konfession "keine" + Hauptort
 *  - +104 Paar-Profile → Total 208 Profile (kind="ordentlich")
 *
 * Phase 3 (Kapitalauszahlung — D11 Phase 3, Sprint 2026-05):
 *  - 26 Kantone × 3 Kapitalbeträge (100k / 300k / 500k) × Single Alter 65
 *  - +78 Kapital-Profile × 2 Jahre (2025+2026) → +156 Profile.
 *  - ESTV-Endpoint: API_calculateManyCapitalTaxes (TaxGroupID statt TaxLocationID,
 *    Felder Gender + AgeAtPayment + Capital)
 *
 * Phase 4 (Kapital × Paar — D11 Phase 4, Sprint 2026-05):
 *  - 26 Kantone × 3 Kapitalbeträge × Paar (verheiratet) Alter 65
 *  - +78 Kapital-Paar-Profile × 2 Jahre → +156 Profile.
 *  - ESTV nutzt für verheiratete oft einen Splitting- oder eigenen Paar-Tarif;
 *    Drift vs. Phase-3-Single-Tabelle muss separat kalibriert werden.
 *
 * Phase 5 (Real-World-Szenarien — Sprint 2026-05-23):
 *  - 26 Kantone × 5 Szenario-Profile (Single 100k Erwerb, Paar 150k+2 Kinder
 *    Erwerb, Rentner 60k Einzel, AR-Waldstatt Paar 43k Rentner, ZH 500k Kap).
 *  - +130 Profile, Jahr 2026. Diese sind end-to-end "wie ein Wizard-User"
 *    eingegeben — d.h. Brutto-Erwerb + Familienkontext + Vermögen + Kapital —
 *    so dass `steuerProJahr(...)` mit den vollen Abzügen läuft und gegen
 *    ESTV-Werte verglichen wird. Der Crawler berechnet vor dem ESTV-Call
 *    das engine-äquivalente steuerbare Einkommen und füttert es an ESTV.
 *
 *  → Phase 1+2+3+4+5 Total: 104 + 104 + 156 + 156 + 130 = 650 Profile.
 *
 * Die `expected*`-Werte werden vom Crawler `scripts/estv-crawl.ts` aus dem
 * ESTV-Tarifrechner befüllt und in `estv-snapshot.json` persistiert. Dieses
 * File bleibt source-of-truth für die Profil-Definition, der Snapshot ist
 * die regenerable Daten-Tabelle.
 */

import {
  ALLE_KANTONE,
  KANTON_INFO,
  type KantonCode,
} from "../steuer-engine";

export type Fallart = "einzel" | "paar";
export type Konfession = "keine" | "reformiert" | "katholisch";

/**
 * Profil-Typ:
 *  - "ordentlich" → ord. Einkommens- + Vermögenssteuer (Phase 1+2)
 *  - "kapital"    → einmalige Kapitalauszahlung aus Vorsorge (Phase 3)
 *  - "szenario"   → realistisches End-to-End-Szenario (Phase 5): Brutto-Erwerb
 *                   + Familien-/Vorsorge-Kontext, Engine berechnet Abzüge
 *                   selbst und vergleicht mit ESTV-Wert auf gleichem
 *                   steuerbaren Einkommen.
 */
export type EstvProfileKind = "ordentlich" | "kapital" | "szenario";

/**
 * Szenario-Sub-Typ (Phase 5) — welche der 5 Standard-Profile.
 */
export type SzenarioKind =
  | "single-100k-erwerb"
  | "paar-150k-erwerb-2kinder"
  | "rentner-60k-einzel"
  | "ar-waldstatt-43k-paar-rentner"
  | "zh-kap-500k-einzel-ref";

export interface EstvProfile {
  /** Stabile ID — `${kanton}-${einkommen}-${fallart}` für Resume-Logik. */
  id: string;
  /** Profil-Typ: "ordentlich", "kapital" oder "szenario". */
  kind: EstvProfileKind;
  /** Kanton-Code (ZH, BE, …). */
  kanton: KantonCode;
  /** BfsID der Test-Gemeinde (Hauptort des Kantons). */
  bfsId: number;
  /** Bemessung Einkommen (CHF/Jahr, steuerbares Einkommen). 0 für kapital-Profile. */
  einkommen: number;
  /** Bemessung Vermögen (CHF, steuerbares Reinvermögen). */
  vermoegen: number;
  /** Bemessung Kapitalauszahlung (CHF). > 0 nur bei kind="kapital" oder szenario mit Kap. */
  kapital: number;
  /** Alter bei Kapitalauszahlung (Phase 3: 65). 0 für ordentliche Profile. */
  alterBeiAuszahlung: number;
  /** Geschlecht für Kapital-Profile (1=männlich, 2=weiblich; 0 für ordentliche). */
  gender: 0 | 1 | 2;
  /** Fallart (Phase 1: nur "einzel"; Phase 2: "einzel" + "paar"; Phase 3: "einzel"; Phase 4: "paar"). */
  fallart: Fallart;
  /** Konfession (Phase 1+2+3+4: nur "keine"). */
  konfession: Konfession;
  /** Anzahl Kinder (Phase 1+2+3+4: 0). */
  anzahlKinder: number;
  /** Steuerjahr. */
  jahr: 2026 | 2025;

  // ─── Phase-5-Felder (Szenario, optional) ───────────────────────────────
  /** Szenario-Sub-Typ — nur bei kind="szenario". */
  szenarioKind?: SzenarioKind;
  /** Brutto-Erwerbseinkommen Person 1 (CHF/Jahr). 0 = nicht erwerbstätig. */
  bruttoErwerbP1?: number;
  /** Brutto-Erwerbseinkommen Person 2 (CHF/Jahr). */
  bruttoErwerbP2?: number;
  /** Alter Person 1 im betrachteten Jahr. */
  alterP1?: number;
  /** Alter Person 2 im betrachteten Jahr (nur Paar). */
  alterP2?: number;
  /** True wenn aktiver PK-Anschluss → BVG-Abzug. */
  hatPkAnschlussP1?: boolean;
  hatPkAnschlussP2?: boolean;
  /**
   * Pre-computed steuerbares Einkommen (CHF) — wird vom Crawler aus
   * `abzuegeDbg`/`abzuegeKanton` berechnet und an ESTV als TaxableIncomeFed /
   * TaxableIncomeCanton geschickt. So vergleicht der Test apples-to-apples:
   * Cuira-Engine läuft mit Brutto+Kontext und gibt ihren steuerbaren-Wert ans
   * ESTV-Endpoint, ESTV liefert den Tarif-Anteil zurück.
   *
   * Nur bei kind="szenario" befüllt. DBG- und Kantons-Bemessung können
   * leicht unterschiedlich sein (z.B. Versicherungspauschale unterschiedlich);
   * wir nehmen für ESTV-Call den Kantons-Wert (ESTV-Tarifrechner hat ein
   * Feld pro Tarif aber rechnet bei TaxableIncomeFed=TaxableIncomeCanton
   * konsistent).
   */
  steuerbarKantonPrecomputed?: number;
  /** Pre-computed steuerbares Einkommen DBG (siehe oben). */
  steuerbarBundPrecomputed?: number;
}

/**
 * Einkommensstufen Phase 1 — abdecken Sub-Plafond + Mittel-/Hochbereich +
 * Spitzentarif, damit Progressions-Linearität sichtbar wird.
 */
const EINKOMMENSSTUFEN = [80_000, 150_000, 250_000, 500_000] as const;

/**
 * Generiert die Profilliste für Phase 1.
 *
 * Aktuell: alle 26 Kantone × 4 Einkommensstufen, alle als Single ohne
 * Konfession in der Hauptstadt des jeweiligen Kantons.
 *
 * → 26 × 4 = 104 Profile.
 */
export function generateProfilesPhase1(): EstvProfile[] {
  const profiles: EstvProfile[] = [];
  for (const kanton of ALLE_KANTONE) {
    const info = KANTON_INFO[kanton];
    for (const einkommen of EINKOMMENSSTUFEN) {
      profiles.push({
        id: `${kanton}-${einkommen}-einzel-keine`,
        kind: "ordentlich",
        kanton,
        bfsId: info.bfsIdHauptort,
        einkommen,
        vermoegen: 0,
        kapital: 0,
        alterBeiAuszahlung: 0,
        gender: 0,
        fallart: "einzel",
        konfession: "keine",
        anzahlKinder: 0,
        jahr: 2026,
      });
    }
  }
  return profiles;
}

/**
 * Generiert die Profilliste für Phase 2 — Paare (verheiratete Doppelverdiener
 * mit gemeinsamem steuerbarem Einkommen, ohne Kinder, Konfession keine).
 *
 * → 26 × 4 = 104 Paar-Profile.
 */
export function generateProfilesPhase2(): EstvProfile[] {
  const profiles: EstvProfile[] = [];
  for (const kanton of ALLE_KANTONE) {
    const info = KANTON_INFO[kanton];
    for (const einkommen of EINKOMMENSSTUFEN) {
      profiles.push({
        id: `${kanton}-${einkommen}-paar-keine`,
        kind: "ordentlich",
        kanton,
        bfsId: info.bfsIdHauptort,
        einkommen,
        vermoegen: 0,
        kapital: 0,
        alterBeiAuszahlung: 0,
        gender: 0,
        fallart: "paar",
        konfession: "keine",
        anzahlKinder: 0,
        jahr: 2026,
      });
    }
  }
  return profiles;
}

/**
 * Kapitalbeträge Phase 3 — typische 3a-/PK-Bezüge der CH-Praxis. 100k testet
 * den Mindestsatz-Bereich, 300k den Mittelbereich (ZH 1/20-Tarif), 500k die
 * obere Stufe der Bruchteils-Methode.
 */
const KAPITAL_STUFEN = [100_000, 300_000, 500_000] as const;

/**
 * Generiert die Profilliste für Phase 3 — Kapitalauszahlungen aus Vorsorge.
 *
 * Matrix: 26 Kantone × 3 Kapitalbeträge × Single Alter 65, Männlich,
 * keine Konfession, Hauptort. → 78 Profile pro Jahr.
 *
 * ESTV-Endpoint: API_calculateManyCapitalTaxes (separater Tarifrechner für
 * Kapitalbezug aus Vorsorge). Antwort liefert {TaxCanton, TaxCity, TaxChurch,
 * TaxFed} — Personalsteuer + Vermögen sind nicht Teil dieses Bezugs.
 *
 * `jahr` default 2026 für Backwards-Compat (Phase-3-2026-IDs ohne Suffix).
 * Für 2025: IDs erhalten `-2025`-Suffix damit beide Jahrgänge im selben
 * Snapshot koexistieren können.
 */
export function generateProfilesPhase3(jahr: 2025 | 2026 = 2026): EstvProfile[] {
  const profiles: EstvProfile[] = [];
  const suffix = jahr === 2025 ? "-2025" : "";
  for (const kanton of ALLE_KANTONE) {
    const info = KANTON_INFO[kanton];
    for (const kapital of KAPITAL_STUFEN) {
      profiles.push({
        id: `${kanton}-${kapital}-kapital-einzel-65-keine${suffix}`,
        kind: "kapital",
        kanton,
        bfsId: info.bfsIdHauptort,
        einkommen: 0,
        vermoegen: 0,
        kapital,
        alterBeiAuszahlung: 65,
        gender: 1,
        fallart: "einzel",
        konfession: "keine",
        anzahlKinder: 0,
        jahr,
      });
    }
  }
  return profiles;
}

/**
 * Generiert die Profilliste für Phase 4 — Kapitalauszahlungen für Paare
 * (verheiratet, gemeinsam veranlagt, Alter 65, Konfession keine).
 *
 * Matrix: 26 Kantone × 3 Kapitalbeträge × Paar Alter 65, Männlich (Person 1),
 * keine Konfession, Hauptort. → 78 Profile pro Jahr.
 *
 * Begründung: Viele Kantone wenden bei Kapitalauszahlungen einen Sondertarif
 * an, der für Paare anders ist als für Singles (Splitting, eigener Tarif,
 * höhere Freigrenzen). Phase 3 testete nur Single — Phase 4 schliesst die
 * Lücke und liefert eine separate Kalibrierung KAPITAL_CALIBRATION_PAAR_{jahr}
 * falls Drift > 5 % auftritt.
 *
 * IDs: `{kanton}-{kapital}-kapital-paar-65-keine{suffix}` — analog zu Phase 3
 * mit "paar" statt "einzel".
 */
export function generateProfilesPhase4(jahr: 2025 | 2026 = 2026): EstvProfile[] {
  const profiles: EstvProfile[] = [];
  const suffix = jahr === 2025 ? "-2025" : "";
  for (const kanton of ALLE_KANTONE) {
    const info = KANTON_INFO[kanton];
    for (const kapital of KAPITAL_STUFEN) {
      profiles.push({
        id: `${kanton}-${kapital}-kapital-paar-65-keine${suffix}`,
        kind: "kapital",
        kanton,
        bfsId: info.bfsIdHauptort,
        einkommen: 0,
        vermoegen: 0,
        kapital,
        alterBeiAuszahlung: 65,
        gender: 1,
        fallart: "paar",
        konfession: "keine",
        anzahlKinder: 0,
        jahr,
      });
    }
  }
  return profiles;
}

/**
 * Phase 5 — Real-World-Szenarien (Sprint 2026-05-23).
 *
 * 5 Standard-Profile × 26 Kantone = 130 Cases. Im Gegensatz zu Phase 1-4
 * (steuerbares Einkommen direkt, keine Abzüge) sind das **End-to-End-Cases**:
 *  - Brutto-Erwerb wird gesetzt
 *  - Familien-/Vorsorgekontext (Kinder, BVG, Alter) wird gesetzt
 *  - Crawler ruft `abzuegeKanton`/`abzuegeDbg` → steuerbar berechnen
 *  - ESTV wird mit diesem steuerbaren Wert gefüttert
 *  - Test ruft `steuerProJahr({...all_fields...})` und vergleicht mit ESTV
 *
 * Die 5 Standard-Profile (aus Auftrag 2026-05-23):
 *  1. **Single 100k erwerbstätig**: Brutto 100'000, ledig, keine,
 *     alter 35, 0 Kinder, 50'000 Vermögen, kein Kapitalbezug
 *  2. **Paar 150k+2 Kinder erwerbstätig**: Brutto P1 100'000 + P2 50'000,
 *     verheiratet, reformiert, alter 38/36, 2 Kinder, 200'000 Vermögen
 *  3. **Rentner 60k einzel**: AHV 60'000, ledig, alter 70, 0 Kinder,
 *     800'000 Vermögen, 0 Kapital, kein BVG-Anschluss mehr
 *  4. **AR-Waldstatt Paar Rentner 43k (Stanojevic-Repro)**:
 *     AHV 43'326, verheiratet, alter 75/70, 0 Kinder, 150'000 Vermögen.
 *     Wird auch in den Nicht-AR-Kantonen gerechnet (für Kanton-Drift-Vergleich).
 *  5. **ZH Kapitalbezug 500k einzel reformiert**: AHV 30'000 + Kap 500'000,
 *     ledig reformiert, alter 65, 200'000 Vermögen.
 *     Wird auch in den anderen Kantonen gerechnet (zeigt Kapital-Sondertarif).
 *
 * Konfession: alle Szenarien sind "keine", ausser Profil 2 (reformiert) und
 * Profil 5 (reformiert). Die Konfession beeinflusst Kirchensteuer + leicht
 * den Krankenkassen-Pauschalbetrag.
 *
 * IDs: `${kanton}-szenario-${szenarioKind}` — z.B. "ZH-szenario-single-100k-erwerb".
 */
interface SzenarioTemplate {
  szenarioKind: SzenarioKind;
  fallart: Fallart;
  konfession: Konfession;
  alterP1: number;
  alterP2: number;
  bruttoErwerbP1: number;
  bruttoErwerbP2: number;
  vermoegen: number;
  kapital: number;
  anzahlKinder: number;
  hatPkAnschlussP1: boolean;
  hatPkAnschlussP2: boolean;
  alterBeiAuszahlung: number;
  /** Hinweis für ID + Reporting. */
  description: string;
}

const SZENARIO_TEMPLATES: SzenarioTemplate[] = [
  {
    szenarioKind: "single-100k-erwerb",
    fallart: "einzel",
    konfession: "keine",
    alterP1: 35,
    alterP2: 0,
    bruttoErwerbP1: 100_000,
    bruttoErwerbP2: 0,
    vermoegen: 50_000,
    kapital: 0,
    anzahlKinder: 0,
    hatPkAnschlussP1: true,
    hatPkAnschlussP2: false,
    alterBeiAuszahlung: 0,
    description: "Single 35 J., 100k Brutto, 50k Vermögen, keine Konfession",
  },
  {
    szenarioKind: "paar-150k-erwerb-2kinder",
    fallart: "paar",
    konfession: "reformiert",
    alterP1: 38,
    alterP2: 36,
    bruttoErwerbP1: 100_000,
    bruttoErwerbP2: 50_000,
    vermoegen: 200_000,
    kapital: 0,
    anzahlKinder: 2,
    hatPkAnschlussP1: true,
    hatPkAnschlussP2: true,
    alterBeiAuszahlung: 0,
    description: "Paar 38/36 J., 100k+50k Brutto, 2 Kinder, 200k Vermögen",
  },
  {
    szenarioKind: "rentner-60k-einzel",
    fallart: "einzel",
    konfession: "keine",
    alterP1: 70,
    alterP2: 0,
    bruttoErwerbP1: 0,
    bruttoErwerbP2: 0,
    vermoegen: 800_000,
    kapital: 0,
    anzahlKinder: 0,
    hatPkAnschlussP1: false,
    hatPkAnschlussP2: false,
    alterBeiAuszahlung: 0,
    description: "Rentner 70 J., 60k AHV, 800k Vermögen, einzel keine",
  },
  {
    szenarioKind: "ar-waldstatt-43k-paar-rentner",
    fallart: "paar",
    konfession: "keine",
    alterP1: 75,
    alterP2: 70,
    bruttoErwerbP1: 0,
    bruttoErwerbP2: 0,
    vermoegen: 150_000,
    kapital: 0,
    anzahlKinder: 0,
    hatPkAnschlussP1: false,
    hatPkAnschlussP2: false,
    alterBeiAuszahlung: 0,
    description: "Paar Rentner 75/70 J., 43k AHV, 150k Vermögen (AR-Stanojevic-Repro)",
  },
  {
    szenarioKind: "zh-kap-500k-einzel-ref",
    fallart: "einzel",
    konfession: "reformiert",
    alterP1: 65,
    alterP2: 0,
    bruttoErwerbP1: 0,
    bruttoErwerbP2: 0,
    vermoegen: 200_000,
    kapital: 500_000,
    anzahlKinder: 0,
    hatPkAnschlussP1: false,
    hatPkAnschlussP2: false,
    alterBeiAuszahlung: 65,
    description: "Kapitalbezug 500k bei 65, 30k AHV laufend, 200k Vermögen, reformiert",
  },
];

/**
 * Einkommen-Total für ein Szenario (Bemessungs-Eingabe in
 * `steuerProJahr({einkommenJahr: ...})`):
 *  - Erwerbsfälle: Summe der Brutto-Erwerbe
 *  - Rentnerfälle: hardcoded AHV-Wert (60k / 43k / 30k)
 */
function einkommenFuerSzenario(t: SzenarioTemplate): number {
  if (t.szenarioKind === "rentner-60k-einzel") return 60_000;
  if (t.szenarioKind === "ar-waldstatt-43k-paar-rentner") return 43_326;
  if (t.szenarioKind === "zh-kap-500k-einzel-ref") return 30_000;
  return t.bruttoErwerbP1 + t.bruttoErwerbP2;
}

/**
 * Generiert Phase-5-Profile: 5 Szenarien × 26 Kantone = 130 Cases.
 *
 * Wichtig: das Feld `steuerbarKantonPrecomputed` ist hier 0 — der Crawler
 * füllt es aus der Engine vor dem ESTV-Call.
 */
export function generateProfilesPhase5(jahr: 2026 | 2025 = 2026): EstvProfile[] {
  const profiles: EstvProfile[] = [];
  const suffix = jahr === 2025 ? "-2025" : "";
  for (const kanton of ALLE_KANTONE) {
    const info = KANTON_INFO[kanton];
    for (const t of SZENARIO_TEMPLATES) {
      profiles.push({
        id: `${kanton}-szenario-${t.szenarioKind}${suffix}`,
        kind: "szenario",
        kanton,
        bfsId: info.bfsIdHauptort,
        einkommen: einkommenFuerSzenario(t),
        vermoegen: t.vermoegen,
        kapital: t.kapital,
        alterBeiAuszahlung: t.alterBeiAuszahlung,
        gender: t.kapital > 0 ? 1 : 0,
        fallart: t.fallart,
        konfession: t.konfession,
        anzahlKinder: t.anzahlKinder,
        jahr,
        szenarioKind: t.szenarioKind,
        bruttoErwerbP1: t.bruttoErwerbP1,
        bruttoErwerbP2: t.bruttoErwerbP2,
        alterP1: t.alterP1,
        alterP2: t.alterP2,
        hatPkAnschlussP1: t.hatPkAnschlussP1,
        hatPkAnschlussP2: t.hatPkAnschlussP2,
        steuerbarKantonPrecomputed: 0,
        steuerbarBundPrecomputed: 0,
      });
    }
  }
  return profiles;
}

/** Beschreibung eines Szenario-Profils (für Test-Labels und Reports). */
export function describeSzenarioKind(k: SzenarioKind): string {
  return SZENARIO_TEMPLATES.find((t) => t.szenarioKind === k)?.description ?? k;
}

/**
 * Generiert die kombinierte Profilliste Phase 1 + 2 + 3 + 4 + 5 (2026 + 2025).
 *
 * → 104 Single ord. + 104 Paar ord. +
 *   78 Kapital-Single 2026 + 78 Kapital-Single 2025 +
 *   78 Kapital-Paar 2026 + 78 Kapital-Paar 2025 +
 *   130 Szenario 2026
 *   = 650 Profile.
 */
export function generateProfilesAll(): EstvProfile[] {
  return [
    ...generateProfilesPhase1(),
    ...generateProfilesPhase2(),
    ...generateProfilesPhase3(2026),
    ...generateProfilesPhase3(2025),
    ...generateProfilesPhase4(2026),
    ...generateProfilesPhase4(2025),
    ...generateProfilesPhase5(2026),
  ];
}

/**
 * Snapshot-Eintrag: gecrawlter Wert pro Profil. Wird vom Crawler in
 * `estv-snapshot.json` geschrieben.
 *
 * Alle Steuerbeträge in CHF. `null` = noch nicht gecrawlt oder Fehler.
 */
export interface EstvSnapshotEntry {
  /** Verlinkung zum Profil (siehe `id` in EstvProfile). */
  id: string;
  /** Erfolgreich gecrawlt? */
  ok: boolean;
  /** Bei Fehler: Kurzmeldung. */
  error?: string;
  /** Timestamp des Crawls (ISO 8601). */
  crawledAt?: string;
  /** Resolved TaxLocationID aus ESTV (für Reproduzierbarkeit). */
  taxLocationId?: number;

  /** Total alle Steuern (Bund + Kanton + Gemeinde + Kirche + Personalsteuer). */
  expectedTotal: number | null;
  /** Bundessteuer (DBG). */
  expectedBund: number | null;
  /** Kantonssteuer (effektiv, nach Steuerfuss). */
  expectedKanton: number | null;
  /** Gemeindesteuer (effektiv). */
  expectedGemeinde: number | null;
  /** Kirchensteuer (effektiv; bei konfession="keine" = 0). */
  expectedKirche: number | null;
  /** Personalsteuer (kantonal, Pauschalbetrag; nur bei ordentlich relevant). */
  expectedPersonal: number | null;
  /** Profil-Typ — geerbt vom Profil, dokumentiert im Snapshot. Optional weil
   *  alte Phase-1+2-Snapshots dieses Feld nicht haben. Fehlt → ordentlich. */
  kind?: EstvProfileKind;

  // ─── Phase-5-Felder (Szenario, optional) ───────────────────────────────
  /**
   * Steuerbares Einkommen Kanton, das dem ESTV-Call übergeben wurde — vom
   * Engine via `abzuegeKanton(input, kanton)` berechnet. Nur Szenario-Profile.
   */
  steuerbarKantonGesendet?: number;
  /** Steuerbares Einkommen Bund, das dem ESTV-Call übergeben wurde. */
  steuerbarBundGesendet?: number;
  /**
   * Bei Szenario mit Kapital (z.B. zh-kap-500k-einzel-ref): separater
   * Kapital-Anteil aus zweitem ESTV-Call (API_calculateManyCapitalTaxes).
   * In `expectedTotal` ist dieser Wert NICHT eingerechnet (`expectedTotal`
   * enthält nur den ordentlichen Anteil — Bund-Eink. + Kt-Eink. + Verm.).
   * Test summiert beides für `r.einkommen + r.vermoegen + r.kapital`.
   */
  expectedKapital?: number;
  /** Bund-Anteil der Kapitalsteuer (1/5 DBG). */
  expectedKapitalBund?: number;
  /** Kanton-Anteil der Kapitalsteuer. */
  expectedKapitalKanton?: number;
}

export interface EstvSnapshot {
  /** Metadaten zum Snapshot. */
  meta: {
    schemaVersion: 1;
    /** ISO-Zeitstempel des ersten Crawls. */
    startedAt: string;
    /** ISO-Zeitstempel des letzten Updates. */
    updatedAt: string;
    /** ESTV-Tarifrechner-Version (aus /application-info). */
    estvVersion?: string;
    /** Anzahl Profile insgesamt. */
    profilesTotal: number;
    /** Anzahl erfolgreich gecrawlt. */
    profilesOk: number;
  };
  /** Map: profileId → snapshot entry. */
  entries: Record<string, EstvSnapshotEntry>;
}

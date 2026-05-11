/**
 * ESTV-Validierungs-Profile (Sprint D11 Phase 1 + 2 + 3).
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
 *  - +78 Kapital-Profile → Total 286 Profile (Phase 1+2 ordentlich + Phase 3 kapital)
 *  - ESTV-Endpoint: API_calculateManyCapitalTaxes (TaxGroupID statt TaxLocationID,
 *    Felder Gender + AgeAtPayment + Capital)
 *
 * Phase 4 (geplant, späterer Sprint): Mehrgemeinden pro Kanton,
 * Vermögensvariation, Kapital × Paar.
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
 */
export type EstvProfileKind = "ordentlich" | "kapital";

export interface EstvProfile {
  /** Stabile ID — `${kanton}-${einkommen}-${fallart}` für Resume-Logik. */
  id: string;
  /** Profil-Typ: "ordentlich" oder "kapital". */
  kind: EstvProfileKind;
  /** Kanton-Code (ZH, BE, …). */
  kanton: KantonCode;
  /** BfsID der Test-Gemeinde (Hauptort des Kantons). */
  bfsId: number;
  /** Bemessung Einkommen (CHF/Jahr, steuerbares Einkommen). 0 für kapital-Profile. */
  einkommen: number;
  /** Bemessung Vermögen (CHF, steuerbares Reinvermögen). */
  vermoegen: number;
  /** Bemessung Kapitalauszahlung (CHF). > 0 nur bei kind="kapital". */
  kapital: number;
  /** Alter bei Kapitalauszahlung (Phase 3: 65). 0 für ordentliche Profile. */
  alterBeiAuszahlung: number;
  /** Geschlecht für Kapital-Profile (1=männlich, 2=weiblich; 0 für ordentliche). */
  gender: 0 | 1 | 2;
  /** Fallart (Phase 1: nur "einzel"; Phase 2: "einzel" + "paar"; Phase 3: "einzel"). */
  fallart: Fallart;
  /** Konfession (Phase 1+2+3: nur "keine"). */
  konfession: Konfession;
  /** Anzahl Kinder (Phase 1+2+3: 0). */
  anzahlKinder: number;
  /** Steuerjahr. */
  jahr: 2026 | 2025;
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
 * Generiert die kombinierte Profilliste Phase 1 + Phase 2 + Phase 3 (2026 + 2025).
 *
 * → 104 Single ord. + 104 Paar ord. + 78 Kapital 2026 + 78 Kapital 2025
 *   = 364 Profile.
 */
export function generateProfilesAll(): EstvProfile[] {
  return [
    ...generateProfilesPhase1(),
    ...generateProfilesPhase2(),
    ...generateProfilesPhase3(2026),
    ...generateProfilesPhase3(2025),
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

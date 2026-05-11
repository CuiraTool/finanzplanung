/**
 * ESTV-Validierungs-Profile (Sprint D11 Phase 1).
 *
 * Pflicht-Testmatrix für die Cuira-Steuer-Engine vs. offizielle ESTV-
 * Tarifrechner-Werte (https://swisstaxcalculator.estv.admin.ch).
 *
 * Phase 1 (dieses File):
 *  - 26 Kantone × 4 Einkommensstufen × Single + Konfession "keine" + Hauptort
 *  - Total 104 Profile, Jahr 2026
 *
 * Phase 2-4 (geplant, separate Sprints): Paare, Kapitalauszahlung,
 * Mehrgemeinden pro Kanton, Vermögensvariation.
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

export interface EstvProfile {
  /** Stabile ID — `${kanton}-${einkommen}-${fallart}` für Resume-Logik. */
  id: string;
  /** Kanton-Code (ZH, BE, …). */
  kanton: KantonCode;
  /** BfsID der Test-Gemeinde (Hauptort des Kantons). */
  bfsId: number;
  /** Bemessung Einkommen (CHF/Jahr, steuerbares Einkommen). */
  einkommen: number;
  /** Bemessung Vermögen (CHF, steuerbares Reinvermögen). */
  vermoegen: number;
  /** Fallart (Phase 1: nur "einzel"). */
  fallart: Fallart;
  /** Konfession (Phase 1: nur "keine"). */
  konfession: Konfession;
  /** Anzahl Kinder (Phase 1: 0). */
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
        kanton,
        bfsId: info.bfsIdHauptort,
        einkommen,
        vermoegen: 0,
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
  /** Personalsteuer (kantonal, Pauschalbetrag). */
  expectedPersonal: number | null;
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

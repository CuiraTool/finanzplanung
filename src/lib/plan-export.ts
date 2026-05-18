/**
 * Pro-Tool Plan-Export/Import — JSON-Dateiformat für Berater-Snapshots.
 *
 * Use-Case: Berater schliesst Kunde-Beratung ab → exportiert State als Datei.
 * 6 Monate später: importiert Datei → editiert Änderungen → exportiert erneut.
 *
 * Format ist versioniert: `schemaVersion` reflektiert die Store-Schema-Nummer
 * zum Zeitpunkt des Exports. Beim Import läuft die Migrations-Chain durch,
 * falls Schema seitdem gebumpt wurde.
 *
 * Hinweis: Ein separates `plan-snapshot.ts` baut KI-Analyse-Snapshots (~30
 * Eckwerte). Dieses Modul ist NICHT dasselbe — hier geht es um den vollen
 * State-Export für späteres Wieder-Importieren.
 */

import type { PlanState } from "./store";

/**
 * Aktuelle Plan-Schema-Version. MUSS synchron zum store.ts-`name`-Suffix
 * gehalten werden (`cuira-plan-vNN`). Bei jedem Schema-Bump hier hochsetzen
 * UND ggf. einen Migrator in MIGRATIONS ergänzen (rein additive Felder
 * brauchen keinen Migrator — fehlende Felder fallen auf store-defaults).
 */
export const AKTUELLE_SCHEMA_VERSION = 43;

/** Magic-String zur Format-Erkennung beim Import. */
export const SNAPSHOT_FORMAT_TAG = "cuira-pro-snapshot";

export interface ProSnapshot {
  format: typeof SNAPSHOT_FORMAT_TAG;
  schemaVersion: number;
  exportedAt: string; // ISO 8601
  kundeName: string;
  beraterName: string;
  plan: Partial<PlanState>;
}

/**
 * Migration-Funktion pro Schema-Übergang. Eintrag mit Key N führt aus
 * Version N → N+1. Wird nur aufgerufen wenn Felder umstrukturiert werden
 * (Rename, Type-Change, Removal). Rein additive Felder brauchen nichts —
 * fehlende Felder werden beim Mount aus Store-Defaults aufgefüllt.
 */
export const MIGRATIONS: Record<
  number,
  (plan: Partial<PlanState>) => Partial<PlanState>
> = {
  // Beispiel-Hülle:
  // 42: (plan) => ({ ...plan, neuesFeld: "default" }),
};

export interface ParseResult {
  ok: boolean;
  /** Parsed Plan-Daten, bereit für importState(). null bei Fehler. */
  plan: Partial<PlanState> | null;
  /** Mensch-lesbarer Status für UI. */
  hinweis: string;
  /** True wenn aus altem Schema migriert wurde. */
  migriert: boolean;
  /** True wenn aus FlowAntworten (V2-Erfassung), nicht aus ProSnapshot. */
  ausErfassung: boolean;
}

/**
 * Parse eines JSON-Strings. Erkennt automatisch:
 *  - ProSnapshot (Pro-Tool-Export) → migriert wenn nötig
 *  - FlowAntworten (V2-Erfassung) → direkt nutzen
 *  - sonstiges → Fehler
 */
export function parseSnapshot(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return {
      ok: false,
      plan: null,
      hinweis: `Ungültiges JSON: ${e instanceof Error ? e.message : String(e)}`,
      migriert: false,
      ausErfassung: false,
    };
  }
  if (raw === null || typeof raw !== "object") {
    return {
      ok: false,
      plan: null,
      hinweis: "JSON ist kein Objekt.",
      migriert: false,
      ausErfassung: false,
    };
  }
  const obj = raw as Record<string, unknown>;

  // 1) Pro-Tool-Snapshot?
  if (obj.format === SNAPSHOT_FORMAT_TAG) {
    const schemaVersion =
      typeof obj.schemaVersion === "number" ? obj.schemaVersion : -1;
    if (schemaVersion < 1) {
      return {
        ok: false,
        plan: null,
        hinweis: "Snapshot ohne gültige schemaVersion.",
        migriert: false,
        ausErfassung: false,
      };
    }
    if (schemaVersion > AKTUELLE_SCHEMA_VERSION) {
      return {
        ok: false,
        plan: null,
        hinweis: `Snapshot stammt aus neuerer Tool-Version (v${schemaVersion}) — bitte Pro-Tool aktualisieren.`,
        migriert: false,
        ausErfassung: false,
      };
    }
    const planRaw = obj.plan;
    if (planRaw === null || typeof planRaw !== "object") {
      return {
        ok: false,
        plan: null,
        hinweis: "Snapshot enthält kein gültiges plan-Objekt.",
        migriert: false,
        ausErfassung: false,
      };
    }
    let plan = planRaw as Partial<PlanState>;
    let migriert = false;
    for (let v = schemaVersion; v < AKTUELLE_SCHEMA_VERSION; v++) {
      const migrator = MIGRATIONS[v];
      if (migrator) {
        plan = migrator(plan);
        migriert = true;
      }
    }
    const kundeName =
      typeof obj.kundeName === "string" ? obj.kundeName : "Kunde";
    const beraterName =
      typeof obj.beraterName === "string" ? obj.beraterName : "—";
    const exportedAt =
      typeof obj.exportedAt === "string" ? obj.exportedAt.slice(0, 10) : "";
    return {
      ok: true,
      plan,
      hinweis:
        `Pro-Tool-Snapshot geladen: ${kundeName} (Berater ${beraterName}, exportiert ${exportedAt})` +
        (migriert
          ? ` · migriert von v${schemaVersion} → v${AKTUELLE_SCHEMA_VERSION}`
          : ""),
      migriert,
      ausErfassung: false,
    };
  }

  // 2) FlowAntworten (V2-Erfassungs-Output)?
  if (
    "plan" in obj &&
    typeof obj.plan === "object" &&
    obj.plan !== null &&
    "erfasstAm" in obj
  ) {
    const meta = obj.beraterMeta as Record<string, unknown> | undefined;
    const kundeName =
      typeof meta?.kundeP1Name === "string" ? meta.kundeP1Name : "Kunde";
    const beraterName =
      typeof meta?.beraterName === "string" ? meta.beraterName : "—";
    const erfasstAm =
      typeof obj.erfasstAm === "string" ? obj.erfasstAm.slice(0, 10) : "";
    return {
      ok: true,
      plan: obj.plan as Partial<PlanState>,
      hinweis: `Erfassungs-JSON geladen: ${kundeName} (Berater ${beraterName}, erfasst ${erfasstAm})`,
      migriert: false,
      ausErfassung: true,
    };
  }

  return {
    ok: false,
    plan: null,
    hinweis:
      "JSON-Format unbekannt — weder Pro-Tool-Snapshot noch V2-Erfassung erkannt.",
    migriert: false,
    ausErfassung: false,
  };
}

/**
 * Baut ProSnapshot aus PlanState. Setter-Funktionen werden via JSON-Stringify-
 * Replacer ausgefiltert (Funktionen → undefined → weggelassen).
 */
export function buildSnapshot(
  state: PlanState,
  beraterName: string
): ProSnapshot {
  return {
    format: SNAPSHOT_FORMAT_TAG,
    schemaVersion: AKTUELLE_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    kundeName: buildKundeName(state),
    beraterName,
    plan: state,
  };
}

/**
 * Baut Default-Dateinamen: cuira-plan_nachname-vorname_YYYY-MM-DD.json
 */
export function buildSnapshotFilename(state: PlanState): string {
  const datum = new Date().toISOString().slice(0, 10);
  const slug = slugifyKunde(state);
  return `cuira-plan_${slug}_${datum}.json`;
}

/**
 * JSON-Serialisierung mit Setter-Strip: Funktionen werden weggelassen.
 */
export function snapshotToJson(snap: ProSnapshot): string {
  return JSON.stringify(
    snap,
    (_key, value) => (typeof value === "function" ? undefined : value),
    2
  );
}

function buildKundeName(state: PlanState): string {
  const p1 = state.person1;
  const teile = [p1?.nachname, p1?.vorname].filter(
    (s) => s && s.trim().length > 0
  );
  if (teile.length === 0) return "Kunde";
  return teile.join(", ");
}

function slugifyKunde(state: PlanState): string {
  const p1 = state.person1;
  const teile = [p1?.nachname, p1?.vorname]
    .filter((s): s is string => !!s && s.trim().length > 0)
    .map((s) =>
      s
        .toLowerCase()
        .replace(/ä/g, "ae")
        .replace(/ö/g, "oe")
        .replace(/ü/g, "ue")
        .replace(/ß/g, "ss")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    );
  if (teile.length === 0) return "kunde";
  return teile.join("_");
}

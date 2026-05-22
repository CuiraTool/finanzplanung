import { describe, it, expect } from "vitest";
import { usePlanStore, migratePersistedState } from "./store";

/**
 * Direkt-Test der persist-Migrations-Funktion `migratePersistedState`.
 *
 * Die Migrations-Chain ist datenverlust-kritisch: ein Fehler hier rehydriert
 * alte LocalStorage-States in inkompatible Strukturen. Bisher gab es keinen
 * Direkttest (store-v37-migration.test.ts testet nur Setter/Defaults).
 */

/** Sauberer Daten-Snapshot des aktuellen States (ohne Setter-Funktionen). */
function frischerStateSnapshot(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(usePlanStore.getState()));
}

/** Ruft migrate auf und gibt das Resultat als generisches Objekt zurück. */
function runMigrate(
  blob: unknown,
  fromVersion: number
): Record<string, unknown> {
  return migratePersistedState(blob, fromVersion) as Record<string, unknown>;
}

describe("migratePersistedState()", () => {
  it("ist als Funktion exportiert", () => {
    expect(typeof migratePersistedState).toBe("function");
  });

  it("v34 → aktuell: ergänzt plaene, aktiverPlan und laufendeAusgaben", () => {
    const alt = frischerStateSnapshot();
    delete alt.plaene;
    delete alt.aktiverPlan;
    delete alt.laufendeAusgaben;

    const res = runMigrate(alt, 34);

    expect(res.plaene).toBeTruthy();
    expect(res.aktiverPlan).toBe("a");
    expect(Array.isArray(res.laufendeAusgaben)).toBe(true);
    // budget.alimente muss nach der v37-Migration vorhanden sein
    const budget = res.budget as Record<string, unknown> | undefined;
    expect(budget?.alimente).toBeTruthy();
  });

  it("v41 → aktuell: ergänzt fehlendes laufendeAusgaben als leeres Array", () => {
    const alt = frischerStateSnapshot();
    delete alt.laufendeAusgaben;

    const res = runMigrate(alt, 41);

    expect(Array.isArray(res.laufendeAusgaben)).toBe(true);
  });

  it("v38 → aktuell: nachlass-Booleans werden zu Status-Strings", () => {
    const alt = frischerStateSnapshot();
    alt.nachlass = { testament: true, vorsorgeauftrag: false };

    const res = runMigrate(alt, 38);

    const nachlass = res.nachlass as Record<string, unknown>;
    expect(nachlass.testament).toBe("ja");
    expect(nachlass.vorsorgeauftrag).toBe("nein");
  });

  it("fehlende Top-Level-Keys lassen migrate nicht crashen", () => {
    const alt = frischerStateSnapshot();
    delete alt.budget;
    delete alt.bvg;
    delete alt.nachlass;
    delete alt.saeuleDrei;

    expect(() => runMigrate(alt, 41)).not.toThrow();
  });

  it("aktuelle Version: migrate läuft ohne Fehler durch", () => {
    const aktuell = frischerStateSnapshot();

    expect(() => runMigrate(aktuell, 43)).not.toThrow();
  });
});

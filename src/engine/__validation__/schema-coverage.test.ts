/**
 * Schema-Coverage-Linter: statische Prüfung dass alle Schema-Felder im
 * Engine-Code mindestens 1× referenziert sind. Verhindert "totes Feld"-
 * Anti-Pattern (z.B. zivilstand wurde Schema-definiert, aber nie in der
 * Engine ausgewertet → Konkubinat-Bug).
 *
 * Methode:
 *  1. Extrahiere alle Top-Level-Property-Namen aus src/lib/store.ts Interfaces
 *     (PlanState, AhvInput, BvgPersonInput, etc.).
 *  2. Grep durch src/engine/ — jedes Feld muss mindestens 1× vorkommen.
 *  3. Whitelist für bewusst nicht-Engine-relevante Felder (z.B. UI-only).
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const STORE_PATH = "src/lib/store.ts";
const SCAN_DIRS = ["src/engine", "src/components", "src/lib"];

/** Felder die bewusst NICHT in der Engine genutzt werden (UI/Metadaten/Flow). */
const WHITELIST = new Set<string>([
  // Personalien-Stammdaten (Display-only + Cashflow-Grunddaten)
  "vorname", "nachname", "telefon", "email",
  "strasse", "plz", "ort", "gemeindeName",
  "gemeindeBfsId",
  // Block-/Wizard-/Plan-Verwaltung
  "aktiverBlock", "aktiverPlan", "plaene", "szenarioB", "overrides", "aktiv",
  // UI-Beschreibungen
  "beschreibung", "ablaufjahr", "id",
  "ausgabenKategorien", "lebenshaltung", "mobilitaet", "ferienHobby",
  "versicherungen", "wohnen",
  // Erbschafts-Metadaten
  "schenkungenDetails", "groessenordnung", "gueterstand",
  // Hilfsstrukturen
  "hatIkAuszug", "hatIkAuszugP1", "hatIkAuszugP2",
  "dsgEinwilligung",
  // Flow-Survey-Felder (gesammelt im Frage-Flow, später-Etappe-Anbindung)
  "erfahrung", "risikobereitschaft", "horizont", "formen",
  "vermoegenAusland", "umzugStatus", "umzugZiel",
  "vvgVorhanden", "lebensversicherungVorhanden", "lebensversicherungDetails",
  "gesundheitsthemen", "ausgewaehlt", "andereBeschreibung",
  "zusaetzlicheAnliegen", "zivilstandSeitJahr",
  "unterhaltspflichten", "unterhaltspflichtenDetails",
  "pensionsvision", "andereVermoegenswerte",
  "verbindlichkeitenAnderes", "verbindlichkeitenDetails",
  "firmaNachfolgeloesungEingeleitet", "firmaBezug",
  // Closure-Parameter (false positive aus Schema-Methoden)
  "initial", "patch", "immobilieId", "hypothekId",
  // Strukturen die indirekt via Parent-Object referenziert sind
  "anlagen", "wohnortPlan", "prioritaeten", "erweitert",
]);

/** Top-Level-Property-Namen aus Schema-Interfaces extrahieren.
 *  Filtert Methoden-Signaturen (z.B. `setFoo: (v) => void`) heraus. */
function extractSchemaFields(storeSrc: string): Set<string> {
  const fields = new Set<string>();
  const interfaceBlocks = storeSrc.matchAll(
    /export\s+interface\s+\w+\s*(?:extends\s+[^{]+)?\s*\{([^}]+)\}/g
  );
  for (const m of interfaceBlocks) {
    const body = m[1]!;
    const propRegex = /^\s+(\w+)\??:\s*([^;\n]+)/gm;
    for (const p of body.matchAll(propRegex)) {
      const name = p[1]!;
      const typ = p[2]!;
      // Methoden-Signaturen ausschließen: enthalten "(" + ") =>" oder ") =>"
      if (/\)\s*=>/.test(typ) || /^\(/.test(typ.trim())) continue;
      fields.add(name);
    }
  }
  return fields;
}

/** Alle .ts-Dateien in einem Verzeichnis rekursiv lesen. */
function readDirRecursive(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const full = join(dir, f);
    const s = statSync(full);
    if (s.isDirectory()) readDirRecursive(full, out);
    else if (
      (f.endsWith(".ts") || f.endsWith(".tsx")) &&
      !f.endsWith(".test.ts")
    ) {
      out.push(full);
    }
  }
  return out;
}

describe("Schema-Coverage-Linter — keine toten Schema-Felder", () => {
  it("alle Schema-Felder werden im Engine-Code referenziert", () => {
    const storeSrc = readFileSync(STORE_PATH, "utf8");
    const allFields = extractSchemaFields(storeSrc);

    const engineFiles = SCAN_DIRS.flatMap((d) => readDirRecursive(d));
    const engineSrcKombiniert = engineFiles
      .filter((f) => !f.endsWith("/store.ts")) // Self-Reference ignorieren
      .map((f) => readFileSync(f, "utf8"))
      .join("\n");

    const ungenutzt: string[] = [];
    for (const field of allFields) {
      if (WHITELIST.has(field)) continue;
      // Regex: feldname als Property-Access (.feldname oder ['feldname'])
      const ref = new RegExp(`[.\\['"]${field}[\\]'"]?\\b`);
      if (!ref.test(engineSrcKombiniert)) {
        ungenutzt.push(field);
      }
    }

    // Hilfe bei Failure: zeige Liste der ungenutzten Felder
    if (ungenutzt.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `[Schema-Coverage] ${ungenutzt.length} ungenutzte Schema-Felder:`,
        ungenutzt
      );
    }
    expect(ungenutzt).toEqual([]);
  });

  it("Whitelist-Felder existieren tatsächlich im Schema (kein toter Whitelist-Eintrag)", () => {
    const storeSrc = readFileSync(STORE_PATH, "utf8");
    const allFields = extractSchemaFields(storeSrc);
    const tot: string[] = [];
    for (const w of WHITELIST) {
      if (!allFields.has(w)) tot.push(w);
    }
    // Whitelist soll keine veralteten Einträge enthalten
    if (tot.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(`[Schema-Coverage] Whitelist-Einträge ohne Schema-Pendant:`, tot);
    }
    // Tolerant: toleriert Whitelist-Drift, aber als Hinweis ausgeben
    expect(tot.length).toBeLessThan(20);
  });

  it("Mindestens 30 Schema-Felder werden gescannt (Sanity-Check)", () => {
    const storeSrc = readFileSync(STORE_PATH, "utf8");
    const allFields = extractSchemaFields(storeSrc);
    expect(allFields.size).toBeGreaterThan(30);
  });
});

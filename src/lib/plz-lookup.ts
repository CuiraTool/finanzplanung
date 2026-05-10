/**
 * PLZ → Gemeinde / Kanton / BfsID Lookup.
 *
 * Quellen:
 *  - plz-database.json (PLZ → commune + canton, 3'187 Einträge,
 *    aus npm @onebyte/swiss-postal-codes, MIT-Lizenz)
 *  - locations.json (BfsID + BfsName + Canton, ESTV-Datensatz)
 *
 * Zusammenführung: bei PLZ-Match suchen wir die Location mit gleichem
 * Gemeinde-Namen UND gleichem Kanton — so bekommen wir die BfsID, die
 * für den exakten Steuerfuss benötigt wird.
 *
 * Edge-Cases:
 *  - PLZ teilt mehrere Gemeinden → wir nehmen den ersten Match aus der
 *    Datenbank (PLZ-Datenbank hat ein PLZ → eine Gemeinde-Zuordnung).
 *  - Gemeinde-Name aus PLZ-DB matcht nicht 1:1 mit ESTV-Daten
 *    (z.B. Umlaute, Abkürzungen, Zusammenschlüsse) → Fuzzy-Match.
 */

import plzDatabase from "./plz-database.json";
import locations2025 from "@/engine/steuer-data/2025/locations.json";

interface PlzInfo {
  commune: string;
  canton: string;
}

interface LocationData {
  TaxLocationID: number;
  BfsID: number;
  BfsName: string;
  CantonID: number;
  Canton: string;
}

const PLZ_DB = plzDatabase as Record<string, PlzInfo>;
const LOCATIONS = locations2025 as LocationData[];

/**
 * Normalisiert Gemeinde-Namen für Matching (entfernt Umlaute, Klammern,
 * trimmt, lowercase).
 */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/é|è|ê/g, "e")
    .replace(/à|â/g, "a")
    .replace(/ô/g, "o")
    .replace(/î|ï/g, "i")
    .replace(/ç/g, "c")
    .replace(/\(.*?\)/g, "") // Klammer-Inhalt weg
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/** Kanton + Gemeinde zu Location matchen → BfsID. */
function findBfsId(gemeindeName: string, kantonCode: string): number | null {
  const target = normalize(gemeindeName);
  const candidates = LOCATIONS.filter((l) => l.Canton === kantonCode);

  // 1. Exakter normalisierter Match
  const exakt = candidates.find((l) => normalize(l.BfsName) === target);
  if (exakt) return exakt.BfsID;

  // 2. Prefix-Match (z.B. "Zürich" → "Zürich (Stadt)")
  const prefix = candidates.find((l) => normalize(l.BfsName).startsWith(target));
  if (prefix) return prefix.BfsID;

  // 3. Substring-Match (z.B. PLZ-DB: "St. Gallen", ESTV: "St-Gall")
  const sub = candidates.find(
    (l) =>
      normalize(l.BfsName).includes(target) ||
      target.includes(normalize(l.BfsName))
  );
  if (sub) return sub.BfsID;

  return null;
}

export interface PlzMatch {
  ort: string;
  gemeindeName: string;
  kanton: string;
  gemeindeBfsId: number | null;
}

/**
 * Hauptfunktion: nimmt eine PLZ und liefert (falls verfügbar) den
 * passenden Ort + Kanton + BfsID. Gibt null zurück wenn die PLZ nicht
 * im Datensatz ist.
 *
 * Liefert eine Liste von Matches (meist genau 1, manchmal mehrere wenn
 * eine PLZ mehrere Gemeinden umfasst). Aktuell ist die Datenbank flach
 * (1 PLZ → 1 Gemeinde), daher immer 0 oder 1 Eintrag.
 */
export function lookupPlz(plz: string): PlzMatch[] {
  const cleaned = plz.replace(/\D/g, "");
  if (cleaned.length !== 4) return [];
  const info = PLZ_DB[cleaned];
  if (!info) return [];
  const bfsId = findBfsId(info.commune, info.canton);
  return [
    {
      ort: info.commune,
      gemeindeName: info.commune,
      kanton: info.canton,
      gemeindeBfsId: bfsId,
    },
  ];
}

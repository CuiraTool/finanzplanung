/**
 * Helper für Gemeinde-Lookup pro Kanton.
 *
 * Datenquelle: locations.json (aus devbrains/swisstaxcalculator).
 * Wir nutzen 2025 als Master-Quelle (bei Kantonswechsel kein Diff zwischen
 * 2025 und 2026 für die Gemeinden selbst).
 */

import locations2025 from "../steuer-data/2025/locations.json";
import type { LocationData } from "./types";

const LOCATIONS = locations2025 as LocationData[];

/**
 * Liste aller Gemeinden eines Kantons (alphabetisch sortiert).
 */
export function gemeindenForKanton(kanton: string): LocationData[] {
  return LOCATIONS.filter((l) => l.Canton === kanton).sort((a, b) =>
    a.BfsName.localeCompare(b.BfsName, "de")
  );
}

/**
 * Findet eine Gemeinde via BfsID.
 */
export function findGemeinde(bfsId: number): LocationData | null {
  return LOCATIONS.find((l) => l.BfsID === bfsId) ?? null;
}

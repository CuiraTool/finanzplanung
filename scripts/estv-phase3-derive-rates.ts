#!/usr/bin/env tsx
/**
 * Leitet aus dem ESTV-Phase-3-Snapshot die einfache Kapitalauszahlungs-Steuer
 * pro Kanton ab (Total Kanton-Seite / Steuerfuss).
 *
 * Output: TypeScript-Snippet für die Engine — Lookup-Tabelle mit
 *   { kapital: 100_000, einfache: ... } pro Kanton.
 *
 * Usage:
 *   pnpm exec tsx scripts/estv-phase3-derive-rates.ts            # default 2026
 *   pnpm exec tsx scripts/estv-phase3-derive-rates.ts --year 2025
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  generateProfilesPhase3,
  type EstvSnapshot,
} from "../src/engine/__validation__/estv-profile";
import { KANTON_INFO } from "../src/engine/steuer-engine";
import { findFactor } from "../src/engine/steuer-engine/data";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");

function parseYear(argv: string[]): 2025 | 2026 {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--year") {
      const v = Number(argv[++i] ?? 0);
      if (v === 2025 || v === 2026) return v;
    }
  }
  return 2026;
}
const YEAR = parseYear(process.argv.slice(2));

const snap = JSON.parse(
  readFileSync(
    resolve(REPO_ROOT, "src/engine/__validation__/estv-snapshot.json"),
    "utf-8"
  )
) as EstvSnapshot;

const profiles = generateProfilesPhase3(YEAR);
const perKanton = new Map<
  string,
  Array<{ kapital: number; kt: number; gem: number; kirche: number }>
>();

for (const p of profiles) {
  const e = snap.entries[p.id];
  if (!e || !e.ok) continue;
  if (!perKanton.has(p.kanton)) perKanton.set(p.kanton, []);
  perKanton.get(p.kanton)!.push({
    kapital: p.kapital,
    kt: e.expectedKanton ?? 0,
    gem: e.expectedGemeinde ?? 0,
    kirche: e.expectedKirche ?? 0,
  });
}

console.log(`// Per-Kanton calibrated capital-payment tax breakpoints (Phase 3, ${YEAR}).`);
console.log("// Werte sind die einfache Staatssteuer (vor Steuerfuss) am Hauptort, abgeleitet");
console.log("// aus ESTV TaxCanton+TaxCity+TaxChurch ÷ (IncomeRateCanton+IncomeRateCity+IncomeRateChurch).");
console.log("// Bei Konfession=keine ist Kirchen-Anteil 0, so dass nur (Kanton+Gemeinde)-Fuss zählt.");
console.log("");
console.log(`export const KAPITAL_CALIBRATION_${YEAR}: Record<string, Array<{ kapital: number; einfache: number }>> = {`);

const sorted = [...perKanton.entries()].sort((a, b) => a[0].localeCompare(b[0]));
for (const [k, rows] of sorted) {
  rows.sort((a, b) => a.kapital - b.kapital);
  const info = KANTON_INFO[k as keyof typeof KANTON_INFO];
  const factor = findFactor(info.cantonId, YEAR, info.bfsIdHauptort);
  if (!factor) {
    console.log(`  ${k}: [], // no factor`);
    continue;
  }
  // Da Profile konfession=keine: TaxChurch should be 0 → expectedKirche=0
  // → einfache = (TaxCanton + TaxCity) / (IncomeRateCanton/100 + IncomeRateCity/100)
  const fussIncomeSum =
    factor.IncomeRateCanton / 100 + factor.IncomeRateCity / 100;
  const items = rows.map((r) => {
    const kantonSeite = r.kt + r.gem + r.kirche;
    const einfache = kantonSeite / fussIncomeSum;
    return { kapital: r.kapital, einfache: Math.round(einfache * 100) / 100 };
  });
  const arr = items
    .map((i) => `{ kapital: ${i.kapital}, einfache: ${i.einfache} }`)
    .join(", ");
  console.log(`  ${k}: [${arr}],`);
}
console.log("};");

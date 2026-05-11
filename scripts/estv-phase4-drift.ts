#!/usr/bin/env tsx
/**
 * Drift-Analyse für Phase 4 (Kapital × Paar).
 *
 * Vergleicht die aktuelle Engine-Berechnung (`kantonsteuerKapital` mit
 * fallart="paar") gegen die ESTV-Snapshot-Werte für alle 156 Paar-Kapital-
 * Profile. Druckt eine Tabelle (kanton × kapital × jahr → Drift %), plus
 * Median und Max-Drift.
 *
 * Verwendung:
 *   pnpm exec tsx scripts/estv-phase4-drift.ts
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  generateProfilesPhase4,
  type EstvSnapshot,
} from "../src/engine/__validation__/estv-profile";
import {
  bundessteuerKapitalNeu,
  kantonsteuerKapital,
} from "../src/engine/steuer-engine";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");

const snap = JSON.parse(
  readFileSync(
    resolve(REPO_ROOT, "src/engine/__validation__/estv-snapshot.json"),
    "utf-8"
  )
) as EstvSnapshot;

interface Row {
  id: string;
  kanton: string;
  kapital: number;
  jahr: number;
  expected: number;
  actual: number;
  diff: number;
  diffProzent: number;
}

const rows: Row[] = [];
for (const jahr of [2026, 2025] as const) {
  const profiles = generateProfilesPhase4(jahr);
  for (const p of profiles) {
    const e = snap.entries[p.id];
    if (!e || !e.ok || e.expectedTotal == null) continue;
    const bund = bundessteuerKapitalNeu(p.kapital, p.fallart, p.jahr);
    const kanton = kantonsteuerKapital(p.kapital, {
      kanton: p.kanton,
      bfsId: p.bfsId,
      fallart: p.fallart,
      religion: "keine",
      jahr: p.jahr,
    });
    const actual = Math.round(bund + kanton);
    const expected = e.expectedTotal!;
    const diff = actual - expected;
    const diffProzent = expected > 0 ? (diff / expected) * 100 : 0;
    rows.push({
      id: p.id,
      kanton: p.kanton,
      kapital: p.kapital,
      jahr,
      expected,
      actual,
      diff,
      diffProzent,
    });
  }
}

console.log(`\n=== Phase 4 Drift (${rows.length} Profile) ===\n`);
console.log(
  `Kanton  Kapital   Jahr   ESTV       Cuira      Δ         Δ%`.padEnd(70)
);
console.log("─".repeat(70));
for (const r of rows.sort(
  (a, b) =>
    a.kanton.localeCompare(b.kanton) || a.kapital - b.kapital || a.jahr - b.jahr
)) {
  console.log(
    `${r.kanton.padEnd(7)}${String(r.kapital).padEnd(10)}${String(r.jahr).padEnd(7)}${r.expected.toFixed(0).padEnd(11)}${r.actual.toFixed(0).padEnd(11)}${r.diff.toFixed(0).padEnd(10)}${r.diffProzent.toFixed(1)} %`
  );
}

const absDrifts = rows.map((r) => Math.abs(r.diffProzent)).sort((a, b) => a - b);
const median = absDrifts[Math.floor(absDrifts.length / 2)] ?? 0;
const max = absDrifts[absDrifts.length - 1] ?? 0;
const above5 = absDrifts.filter((d) => d > 5).length;
const above10 = absDrifts.filter((d) => d > 10).length;

console.log("\n=== Aggregat ===");
console.log(`Profile total: ${rows.length}`);
console.log(`Median |Δ%|:   ${median.toFixed(2)} %`);
console.log(`Max |Δ%|:      ${max.toFixed(2)} %`);
console.log(`> 5 % drift:   ${above5} (${((above5 / rows.length) * 100).toFixed(1)} %)`);
console.log(`> 10 % drift:  ${above10} (${((above10 / rows.length) * 100).toFixed(1)} %)`);

const worstByKanton = new Map<string, number>();
for (const r of rows) {
  const cur = worstByKanton.get(r.kanton) ?? 0;
  if (Math.abs(r.diffProzent) > Math.abs(cur)) {
    worstByKanton.set(r.kanton, r.diffProzent);
  }
}
console.log("\n=== Worst drift pro Kanton ===");
const sortedKt = [...worstByKanton.entries()].sort(
  (a, b) => Math.abs(b[1]) - Math.abs(a[1])
);
for (const [k, d] of sortedKt) {
  console.log(`  ${k}: ${d.toFixed(1)} %`);
}

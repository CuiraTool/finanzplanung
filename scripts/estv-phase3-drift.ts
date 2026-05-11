#!/usr/bin/env tsx
/**
 * Phase-3-Drift-Analyse: rechnet die Cuira-Engine-Werte für alle Phase-3-
 * Kapital-Profile und vergleicht mit dem ESTV-Snapshot. Druckt eine
 * Drift-Tabelle + Aggregat-Statistik. Reiner Debugging-Helper, kein Test.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  generateProfilesPhase3,
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

const profiles = generateProfilesPhase3();
const rows: Array<{
  id: string;
  kanton: string;
  betrag: number;
  expected: number;
  actual: number;
  driftAbs: number;
  driftProz: number;
}> = [];

for (const p of profiles) {
  const e = snap.entries[p.id];
  if (!e || !e.ok || e.expectedTotal == null) continue;
  const bund = bundessteuerKapitalNeu(p.kapital, p.fallart, p.jahr);
  const kt = kantonsteuerKapital(p.kapital, {
    kanton: p.kanton,
    bfsId: p.bfsId,
    fallart: p.fallart,
    religion: "keine",
    jahr: p.jahr,
  });
  const actual = bund + kt;
  const expected = e.expectedTotal;
  const diff = actual - expected;
  const proz = expected > 0 ? (diff / expected) * 100 : 0;
  rows.push({
    id: p.id,
    kanton: p.kanton,
    betrag: p.kapital,
    expected,
    actual,
    driftAbs: diff,
    driftProz: proz,
  });
}

rows.sort((a, b) => Math.abs(b.driftProz) - Math.abs(a.driftProz));
console.log(
  "ID                                          | Expected |   Cuira | Δ CHF |   Δ %"
);
console.log(
  "--------------------------------------------+----------+---------+-------+-------"
);
for (const r of rows) {
  console.log(
    `${r.id.padEnd(43)} | ${r.expected.toFixed(0).padStart(8)} | ${r.actual.toFixed(0).padStart(7)} | ${r.driftAbs.toFixed(0).padStart(5)} | ${r.driftProz.toFixed(1).padStart(5)}%`
  );
}

const sorted = rows.map((r) => Math.abs(r.driftProz)).sort((a, b) => a - b);
const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
const p90 = sorted[Math.floor(sorted.length * 0.9)] ?? 0;
const max = sorted[sorted.length - 1] ?? 0;
const over10 = rows.filter((r) => Math.abs(r.driftProz) > 10).length;
const over5 = rows.filter((r) => Math.abs(r.driftProz) > 5).length;

console.log(`\n--- Statistik (${rows.length} Profile)`);
console.log(`Median |Δ%|: ${median.toFixed(2)}`);
console.log(`P90    |Δ%|: ${p90.toFixed(2)}`);
console.log(`Max    |Δ%|: ${max.toFixed(2)}`);
console.log(`> 5 %:  ${over5}`);
console.log(`> 10 %: ${over10}`);

const perKanton = new Map<string, number[]>();
for (const r of rows) {
  if (!perKanton.has(r.kanton)) perKanton.set(r.kanton, []);
  perKanton.get(r.kanton)!.push(Math.abs(r.driftProz));
}
console.log(`\n--- Drift pro Kanton (Median, Max)`);
const entries = [...perKanton.entries()].map(([k, vs]) => {
  vs.sort((a, b) => a - b);
  const med = vs[Math.floor(vs.length / 2)] ?? 0;
  const mx = vs[vs.length - 1] ?? 0;
  return { kanton: k, med, mx };
});
entries.sort((a, b) => b.mx - a.mx);
for (const r of entries) {
  console.log(
    `${r.kanton.padEnd(3)} | median ${r.med.toFixed(1).padStart(5)}% | max ${r.mx.toFixed(1).padStart(5)}%`
  );
}

#!/usr/bin/env tsx
/**
 * Druckt für Phase-3-Profile die ESTV-Effektivsätze (Total/Kapital) und pro
 * Kanton den Bund-Anteil + Rest. Hilft zu sehen, welche Effektivsätze pro
 * Kanton echt gelten, um die Engine zu rekalibrieren.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  generateProfilesPhase3,
  type EstvSnapshot,
} from "../src/engine/__validation__/estv-profile";
import { bundessteuerKapitalNeu } from "../src/engine/steuer-engine";

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
const perKanton = new Map<
  string,
  Array<{ betrag: number; total: number; bund: number; kt: number; effKanton: number; effGesamt: number }>
>();

for (const p of profiles) {
  const e = snap.entries[p.id];
  if (!e || !e.ok || e.expectedTotal == null) continue;
  const total = e.expectedTotal;
  const bund = bundessteuerKapitalNeu(p.kapital, p.fallart, p.jahr);
  const ktSeite = (e.expectedKanton ?? 0) + (e.expectedGemeinde ?? 0) + (e.expectedKirche ?? 0);
  if (!perKanton.has(p.kanton)) perKanton.set(p.kanton, []);
  perKanton.get(p.kanton)!.push({
    betrag: p.kapital,
    total,
    bund,
    kt: ktSeite,
    effKanton: ktSeite / p.kapital,
    effGesamt: total / p.kapital,
  });
}

// Print per kanton
const sorted = [...perKanton.entries()].sort((a, b) => a[0].localeCompare(b[0]));
console.log("Kanton | 100k Kt% (CHF) | 300k Kt% (CHF) | 500k Kt% (CHF) | Bund 100k/300k/500k");
for (const [k, rows] of sorted) {
  rows.sort((a, b) => a.betrag - b.betrag);
  const r100 = rows.find((r) => r.betrag === 100_000);
  const r300 = rows.find((r) => r.betrag === 300_000);
  const r500 = rows.find((r) => r.betrag === 500_000);
  const fmt = (r: typeof r100) =>
    r ? `${(r.effKanton * 100).toFixed(2)}% (${r.kt.toFixed(0)})` : "—";
  console.log(
    `  ${k.padEnd(3)} | ${fmt(r100).padEnd(15)} | ${fmt(r300).padEnd(15)} | ${fmt(r500).padEnd(15)} | ${(r100?.bund ?? 0).toFixed(0)} / ${(r300?.bund ?? 0).toFixed(0)} / ${(r500?.bund ?? 0).toFixed(0)}`
  );
}

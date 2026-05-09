#!/usr/bin/env tsx
/**
 * Sync der Steuer-Tarif-Daten aus github.com/devbrains-com/swisstaxcalculator.
 *
 * Verwendung:
 *   pnpm steuer-sync           # syncs current year + next year
 *   pnpm steuer-sync 2027      # syncs only 2027
 *   pnpm steuer-sync 2027 2028 # syncs both
 *
 * Nach dem Sync: data.ts erweitern (zusätzliche Imports + Maps), commit.
 *
 * Datenquelle ist MIT-lizenziert (devbrains/swisstaxcalculator) und basiert
 * auf der offiziellen ESTV API. Änderungen ins THIRD_PARTY_LICENSES.md
 * eintragen, falls neue Jahre dazu kommen.
 */

import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");
const TARGET_BASE = resolve(REPO_ROOT, "src/engine/steuer-data");
const SOURCE_REPO = "devbrains-com/swisstaxcalculator";

interface FileSpec {
  remotePath: string;
  localPath: string;
}

function ghFetch(remotePath: string): Buffer {
  const out = execSync(
    `gh api "repos/${SOURCE_REPO}/contents/${remotePath}" --jq .content`,
    { stdio: ["ignore", "pipe", "inherit"], maxBuffer: 50 * 1024 * 1024 }
  );
  return Buffer.from(out.toString().trim(), "base64");
}

function listRemote(remotePath: string): string[] {
  const out = execSync(
    `gh api "repos/${SOURCE_REPO}/contents/${remotePath}" --jq '.[].name'`,
    { stdio: ["ignore", "pipe", "inherit"] }
  );
  return out
    .toString()
    .trim()
    .split("\n")
    .filter((s) => s.length > 0);
}

function syncFile(remote: string, local: string): void {
  mkdirSync(dirname(local), { recursive: true });
  const content = ghFetch(remote);
  writeFileSync(local, content);
}

function syncYear(year: number): void {
  const yearStr = String(year);
  console.log(`\n=== Syncing ${yearStr} ===`);

  // Verify the year exists upstream
  try {
    listRemote(`data/parsed/${yearStr}`);
  } catch {
    console.error(`  ❌ Year ${yearStr} not available upstream`);
    return;
  }

  const targetDir = resolve(TARGET_BASE, yearStr);
  if (!existsSync(targetDir)) {
    console.log(`  Creating ${targetDir}`);
  }

  // tarifs/0..26.json
  console.log("  Syncing tarifs...");
  for (let n = 0; n <= 26; n++) {
    const remote = `data/parsed/${yearStr}/tarifs/${n}.json`;
    const local = resolve(TARGET_BASE, yearStr, "tarifs", `${n}.json`);
    try {
      syncFile(remote, local);
      process.stdout.write(`    ${n}.json `);
    } catch (e) {
      console.error(`\n    ❌ ${remote}: ${(e as Error).message}`);
    }
  }
  console.log();

  // factors/1..26.json
  console.log("  Syncing factors...");
  for (let n = 1; n <= 26; n++) {
    const remote = `data/parsed/${yearStr}/factors/${n}.json`;
    const local = resolve(TARGET_BASE, yearStr, "factors", `${n}.json`);
    try {
      syncFile(remote, local);
      process.stdout.write(`    ${n}.json `);
    } catch (e) {
      console.error(`\n    ❌ ${remote}: ${(e as Error).message}`);
    }
  }
  console.log();

  // locations.json
  console.log("  Syncing locations.json...");
  const localLocations = resolve(TARGET_BASE, yearStr, "locations.json");
  syncFile(`data/parsed/${yearStr}/locations.json`, localLocations);

  console.log(`✅ Year ${yearStr} synced.`);
}

function main(): void {
  const args = process.argv.slice(2);

  // Default: aktuelles Jahr + nächstes Jahr
  const now = new Date();
  const defaultYears = [now.getFullYear(), now.getFullYear() + 1];
  const years = args.length > 0 ? args.map(Number) : defaultYears;

  console.log(`Steuer-Sync: ${SOURCE_REPO} → ${TARGET_BASE}`);
  console.log(`Years: ${years.join(", ")}\n`);

  // Check gh CLI
  try {
    execSync("gh auth status", { stdio: "ignore" });
  } catch {
    console.error("❌ gh CLI nicht authentifiziert. Run: gh auth login");
    process.exit(1);
  }

  for (const year of years) {
    if (Number.isNaN(year) || year < 2020 || year > 2050) {
      console.error(`❌ Ungültiges Jahr: ${year}`);
      continue;
    }
    syncYear(year);
  }

  console.log("\n📝 Nach dem Sync:");
  console.log("  1. src/engine/steuer-engine/data.ts: imports/maps für neue Jahre erweitern");
  console.log("  2. src/engine/steuer-engine/types.ts: SteuerJahr Union erweitern");
  console.log("  3. src/engine/steuer.ts: clampJahr() upper bound anheben");
  console.log("  4. pnpm test && pnpm typecheck");
  console.log("  5. THIRD_PARTY_LICENSES.md: Jahres-Liste aktualisieren");
}

main();

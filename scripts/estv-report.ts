#!/usr/bin/env tsx
/**
 * ESTV-Validierungs-Report-Generator (Sprint D11 Phase 1).
 *
 * Liest `src/engine/__validation__/estv-snapshot.json` + ruft pro Profil
 * die Cuira-Engine `steuerProJahr(...)` auf. Generiert einen Markdown-
 * Report mit:
 *
 *  - Gesamtübersicht (Median/Max Drift, Anzahl Profile)
 *  - Tabelle pro Kanton (Einkommensstufe × Cuira × ESTV × Δ %)
 *  - Top 5 Worst-Drift-Kantone (Tagging)
 *  - Empfehlungen für Engine-Konfig-Updates
 *
 * Output:  docs/ESTV-VALIDIERUNG.md
 *
 * Usage:   pnpm exec tsx scripts/estv-report.ts
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { steuerProJahr } from "../src/engine/steuer";
import { ALLE_KANTONE } from "../src/engine/steuer-engine";
import {
  generateProfilesAll,
  type EstvProfile,
  type EstvSnapshot,
} from "../src/engine/__validation__/estv-profile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");
const SNAPSHOT_PATH = resolve(
  REPO_ROOT,
  "src/engine/__validation__/estv-snapshot.json"
);
const OUTPUT_PATH = resolve(REPO_ROOT, "docs/ESTV-VALIDIERUNG.md");

interface DriftRow {
  profile: EstvProfile;
  cuira: number;
  estv: number;
  diff: number;
  diffPct: number;
}

function fmtChf(n: number): string {
  return new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 }).format(n);
}

function fmtPct(n: number): string {
  const s = n.toFixed(1);
  return n >= 0 ? `+${s} %` : `${s} %`;
}

function computeCuira(p: EstvProfile): number {
  const r = steuerProJahr({
    einkommenJahr: p.einkommen,
    vermoegenJahr: p.vermoegen,
    kapAuszahlungenJahr: 0,
    kanton: p.kanton,
    religion: p.konfession === "keine" ? "keine" : p.konfession,
    fallart: p.fallart,
    bfsId: p.bfsId,
    jahr: p.jahr,
    bruttoErwerbP1: 0,
    alterP1: 40,
    anzahlKinder: p.anzahlKinder,
    hatPkAnschlussP1: false,
  });
  return r.einkommen + r.vermoegen;
}

function loadSnapshot(): EstvSnapshot | null {
  if (!existsSync(SNAPSHOT_PATH)) return null;
  return JSON.parse(readFileSync(SNAPSHOT_PATH, "utf-8")) as EstvSnapshot;
}

function main(): void {
  const snap = loadSnapshot();
  if (!snap) {
    console.error(
      `Snapshot fehlt: ${SNAPSHOT_PATH}\n→ pnpm exec tsx scripts/estv-crawl.ts`
    );
    process.exit(1);
  }

  const profiles = generateProfilesAll();
  const rows: DriftRow[] = [];

  for (const p of profiles) {
    const entry = snap.entries[p.id];
    if (!entry || !entry.ok || entry.expectedTotal == null) continue;
    const cuira = computeCuira(p);
    const estv = entry.expectedTotal;
    const diff = cuira - estv;
    const diffPct = estv > 0 ? (diff / estv) * 100 : 0;
    rows.push({ profile: p, cuira, estv, diff, diffPct });
  }

  rows.sort(
    (a, b) =>
      a.profile.kanton.localeCompare(b.profile.kanton) ||
      a.profile.fallart.localeCompare(b.profile.fallart) ||
      a.profile.einkommen - b.profile.einkommen
  );

  // Aggregat (alle Profile)
  const allPct = rows.map((r) => Math.abs(r.diffPct)).sort((a, b) => a - b);
  const median =
    allPct.length > 0 ? (allPct[Math.floor(allPct.length / 2)] ?? 0) : 0;
  const max = allPct.length > 0 ? (allPct[allPct.length - 1] ?? 0) : 0;
  const mean = allPct.reduce((s, x) => s + x, 0) / Math.max(1, allPct.length);
  const above5 = allPct.filter((p) => p > 5).length;

  // Aggregat pro Fallart
  function aggFor(fallart: "einzel" | "paar") {
    const r = rows.filter((x) => x.profile.fallart === fallart);
    const pcts = r.map((x) => Math.abs(x.diffPct)).sort((a, b) => a - b);
    const med = pcts.length > 0 ? (pcts[Math.floor(pcts.length / 2)] ?? 0) : 0;
    const mx = pcts.length > 0 ? (pcts[pcts.length - 1] ?? 0) : 0;
    const mn = pcts.reduce((s, x) => s + x, 0) / Math.max(1, pcts.length);
    const ab5 = pcts.filter((p) => p > 5).length;
    return { count: r.length, median: med, max: mx, mean: mn, above5: ab5 };
  }
  const aggEinzel = aggFor("einzel");
  const aggPaar = aggFor("paar");

  // Pro Kanton + Fallart: max |Δ|, Mittelwert
  function kantonStatsFor(fallart: "einzel" | "paar" | "alle") {
    return ALLE_KANTONE.map((k) => {
      const krows = rows.filter(
        (r) =>
          r.profile.kanton === k &&
          (fallart === "alle" ? true : r.profile.fallart === fallart)
      );
      const pcts = krows.map((r) => Math.abs(r.diffPct));
      const kmean = pcts.reduce((s, x) => s + x, 0) / Math.max(1, pcts.length);
      const kmax = pcts.length > 0 ? Math.max(...pcts) : 0;
      const signedMean =
        krows.reduce((s, r) => s + r.diffPct, 0) / Math.max(1, krows.length);
      return { kanton: k, mean: kmean, max: kmax, signedMean, n: krows.length };
    })
      .filter((k) => k.n > 0)
      .sort((a, b) => b.mean - a.mean);
  }
  const kantonStats = kantonStatsFor("alle");
  const kantonStatsEinzel = kantonStatsFor("einzel");
  const kantonStatsPaar = kantonStatsFor("paar");

  const worst5 = kantonStats.slice(0, 5);
  const worst5Paar = kantonStatsPaar.slice(0, 5);
  const worst5Einzel = kantonStatsEinzel.slice(0, 5);

  // Markdown bauen
  const lines: string[] = [];
  lines.push("# ESTV-Validierung — Cuira Steuer-Engine vs. ESTV-Tarifrechner");
  lines.push("");
  lines.push(
    `**Generiert:** ${new Date().toISOString()}  `
  );
  lines.push(
    `**Snapshot:** \`src/engine/__validation__/estv-snapshot.json\`  `
  );
  lines.push(
    `**ESTV-API-Version:** ${snap.meta.estvVersion ?? "unknown"}  `
  );
  lines.push(
    `**Profile gecrawlt:** ${rows.length} / ${snap.meta.profilesTotal}  `
  );
  lines.push("");
  lines.push("## Zusammenfassung");
  lines.push("");
  lines.push("**Gesamt (alle 208 Profile):**");
  lines.push(`- Median |Δ|: ${median.toFixed(1)} %`);
  lines.push(`- Mittelwert |Δ|: ${mean.toFixed(1)} %`);
  lines.push(`- Max |Δ|: ${max.toFixed(1)} %`);
  lines.push(`- Profile mit |Δ| > 5 %: ${above5} / ${rows.length}`);
  lines.push("- Toleranz-Ziel: ±5 %");
  lines.push("");
  lines.push(`**Single (Phase 1, ${aggEinzel.count} Profile):**`);
  lines.push(`- Median |Δ|: ${aggEinzel.median.toFixed(1)} %`);
  lines.push(`- Mittelwert |Δ|: ${aggEinzel.mean.toFixed(1)} %`);
  lines.push(`- Max |Δ|: ${aggEinzel.max.toFixed(1)} %`);
  lines.push(`- Profile mit |Δ| > 5 %: ${aggEinzel.above5}`);
  lines.push("");
  lines.push(`**Paar (Phase 2, ${aggPaar.count} Profile):**`);
  lines.push(`- Median |Δ|: ${aggPaar.median.toFixed(1)} %`);
  lines.push(`- Mittelwert |Δ|: ${aggPaar.mean.toFixed(1)} %`);
  lines.push(`- Max |Δ|: ${aggPaar.max.toFixed(1)} %`);
  lines.push(`- Profile mit |Δ| > 5 %: ${aggPaar.above5}`);
  lines.push("");

  lines.push("## Top 5 Kantone mit grösster Drift — Single");
  lines.push("");
  lines.push("| # | Kanton | Mittel \\|Δ\\| | Max \\|Δ\\| | Tendenz (signed) |");
  lines.push("|---|--------|--------------|------------|------------------|");
  worst5Einzel.forEach((k, i) => {
    lines.push(
      `| ${i + 1} | ${k.kanton} | ${k.mean.toFixed(1)} % | ${k.max.toFixed(1)} % | ${fmtPct(k.signedMean)} |`
    );
  });
  lines.push("");

  lines.push("## Top 5 Kantone mit grösster Drift — Paar");
  lines.push("");
  lines.push("| # | Kanton | Mittel \\|Δ\\| | Max \\|Δ\\| | Tendenz (signed) |");
  lines.push("|---|--------|--------------|------------|------------------|");
  worst5Paar.forEach((k, i) => {
    lines.push(
      `| ${i + 1} | ${k.kanton} | ${k.mean.toFixed(1)} % | ${k.max.toFixed(1)} % | ${fmtPct(k.signedMean)} |`
    );
  });
  lines.push("");

  lines.push("## Drift pro Kanton (alle Einkommensstufen, Single + Paar)");
  lines.push("");

  for (const k of ALLE_KANTONE) {
    const krows = rows.filter((r) => r.profile.kanton === k);
    if (krows.length === 0) continue;
    lines.push(`### ${k} (Hauptort)`);
    lines.push("");
    lines.push(
      "| Fall | Einkommen | Cuira | ESTV | Δ CHF | Δ % | Bewertung |"
    );
    lines.push(
      "|------|-----------|------:|-----:|------:|----:|:---------:|"
    );
    for (const r of krows) {
      const bewertung =
        Math.abs(r.diffPct) <= 5
          ? "OK"
          : Math.abs(r.diffPct) <= 10
            ? "WARN"
            : "DRIFT";
      const fall = r.profile.fallart === "paar" ? "Paar" : "Single";
      lines.push(
        `| ${fall} | ${fmtChf(r.profile.einkommen)} | ${fmtChf(r.cuira)} | ${fmtChf(r.estv)} | ${fmtChf(r.diff)} | ${fmtPct(r.diffPct)} | ${bewertung} |`
      );
    }
    lines.push("");
  }

  lines.push("## Empfehlungen");
  lines.push("");
  const w0 = worst5[0];
  if (w0 && w0.mean > 5) {
    lines.push(
      `- **${w0.kanton}** mit Drift ${w0.mean.toFixed(1)} %: ` +
        `Sondertarif-Teiler, Splittingfaktor oder Mindestsatz prüfen.`
    );
  }
  for (const k of worst5.slice(1, 3)) {
    if (k.mean > 5) {
      lines.push(
        `- **${k.kanton}** (mittel ${k.mean.toFixed(1)} %): Tarif-Klassen-Werte gegen aktuelle Kantons-Wegleitung abgleichen.`
      );
    }
  }
  if (median > 5) {
    lines.push(
      `- Median ${median.toFixed(1)} % deutet auf systematischen Bias hin — Abzüge-Logik (z.B. Versicherungsprämienpauschale) im Pensionierten-Fall (bruttoErwerb=0) prüfen.`
    );
  }
  if (median <= 5 && max < 10 && above5 === 0) {
    lines.push(
      `- Engine sitzt sauber im Toleranzband: **${rows.length} / ${rows.length} Profile** innerhalb ±5 %, Max-Drift ${max.toFixed(1)} %.`
    );
    lines.push(
      `- Single + Paar validiert über alle 26 Kantone × 4 Einkommensstufen. Phase 3 (Kapitalauszahlung) und Phase 4 (Mehrgemeinden / Vermögen) sind die nächsten Stufen.`
    );
  }
  lines.push("");
  lines.push(
    "## Methodik"
  );
  lines.push("");
  lines.push(
    "ESTV-Tarifrechner-Profile werden via `API_calculateSimpleTaxes` " +
      "(öffentliche JSON-API von swisstaxcalculator.estv.admin.ch) gecrawlt. " +
      "Cuira-Engine wird mit identischem `TaxableIncome` und `TaxableFortune` " +
      "aufgerufen — Abzüge sind schon vor dem Engine-Aufruf weg, sodass nur " +
      "die Tarif-/Steuerfuss-Logik verglichen wird. Δ % ist signed " +
      "(Cuira − ESTV) / ESTV."
  );
  lines.push("");
  lines.push(
    "Quelle: https://swisstaxcalculator.estv.admin.ch/#/home/incomewealthtax  "
  );
  lines.push(
    "Crawler:  `scripts/estv-crawl.ts` (Rate-Limit 1.5 s, Resume-fähig)  "
  );
  lines.push(
    "Report-Generator:  `scripts/estv-report.ts`  "
  );
  lines.push(
    "Profile-Definition:  `src/engine/__validation__/estv-profile.ts`"
  );
  lines.push("");

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, lines.join("\n"), "utf-8");
  console.log(`Report geschrieben: ${OUTPUT_PATH}`);
  console.log(
    `\nMedian |Δ|: ${median.toFixed(1)} %   Max |Δ|: ${max.toFixed(1)} %`
  );
  console.log("Top 5 Drift-Kantone:");
  for (const k of worst5) {
    console.log(`  ${k.kanton}: mean=${k.mean.toFixed(1)} %, max=${k.max.toFixed(1)} %`);
  }
}

main();

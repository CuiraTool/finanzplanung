#!/usr/bin/env tsx
/**
 * ESTV-Tarifrechner-Crawler (Sprint D11 Phase 1+2+3+4 + Phase 5).
 *
 * Holt für jedes Profil aus `src/engine/__validation__/estv-profile.ts`
 * den offiziellen ESTV-Steuerbetrag via interne JSON-API.
 *
 * Zwei Endpoints werden bedient je nach Profil-Typ:
 *
 * (a) Ordentliche Einkommens-/Vermögenssteuer (kind="ordentlich"):
 *   POST .../operation/c3b67379_ESTV/API_calculateSimpleTaxes
 *
 *   Request:
 *   {
 *     SimKey: null,
 *     TaxYear: 2026,
 *     TaxLocationID: 891400000,    // siehe locations.json
 *     Relationship: 1,             // 1=SINGLE, 2=MARRIED
 *     Confession1: 4,              // 1=REFORMED, 2=ROMAN_CATHOLIC, 3=CHRIST_CATHOLIC,
 *                                   // 4=NO_CONFESSION, 5=OTHERS
 *     Confession2: 0,
 *     Children: [],
 *     TaxableIncomeCanton: 150000,
 *     TaxableIncomeFed: 150000,
 *     TaxableFortune: 50000
 *   }
 *
 *   Response: { IncomeTaxFed, IncomeTaxCanton, IncomeTaxCity, IncomeTaxChurch,
 *               FortuneTaxCanton, FortuneTaxCity, FortuneTaxChurch,
 *               PersonalTax, TotalTax, … }
 *
 * (b) Kapitalauszahlungssteuer (kind="kapital"):
 *   POST .../operation/c3b67379_ESTV/API_calculateManyCapitalTaxes
 *
 *   Request:
 *   {
 *     SimKey: null,
 *     TaxYear: 2026,
 *     TaxGroupID: 891400000,       // identisch zur TaxLocationID
 *     Relationship: 1,
 *     Confession1: 4,
 *     Confession2: 0,
 *     NumberOfChildren: 0,
 *     Gender: 1,                   // 1=MALE, 2=FEMALE
 *     AgeAtPayment: 65,
 *     Capital: 300000
 *   }
 *
 *   Response: { response: [{ TaxFed, TaxCanton, TaxCity, TaxChurch, Location }] }
 *
 * Rate-Limiting: 1.5 s zwischen Calls (defensiv, ESTV rate-limited nicht
 * sichtbar, aber wir wollen freundlich sein).
 *
 * Resume: existierende `estv-snapshot.json` wird gelesen, nur fehlende oder
 * fehlerhafte Einträge werden neu gecrawlt. Mit `--force` werden alle
 * Profile neu gecrawlt.
 *
 * Usage:
 *   pnpm exec tsx scripts/estv-crawl.ts            # resume mode
 *   pnpm exec tsx scripts/estv-crawl.ts --force    # full re-crawl
 *   pnpm exec tsx scripts/estv-crawl.ts --limit 5  # nur 5 Profile (Test)
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  generateProfilesAll,
  type EstvProfile,
  type EstvSnapshot,
  type EstvSnapshotEntry,
} from "../src/engine/__validation__/estv-profile";
import { abzuegeDbg, abzuegeKanton } from "../src/engine/steuer-abzuege";
import type { KantonCode } from "../src/engine/steuer-engine/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");
const SNAPSHOT_PATH = resolve(
  REPO_ROOT,
  "src/engine/__validation__/estv-snapshot.json"
);

const ESTV_BASE =
  "https://swisstaxcalculator.estv.admin.ch/delegate/ost-integration/v1/lg-proxy/operation/c3b67379_ESTV";
const ESTV_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  Origin: "https://swisstaxcalculator.estv.admin.ch",
  Referer: "https://swisstaxcalculator.estv.admin.ch/",
  Accept: "application/json",
  "User-Agent":
    "Cuira-FinPlan-Validator/0.1 (read-only ESTV calibration; kathir@cuirapartners.ch)",
};

const RATE_LIMIT_MS = 1500;
const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = 4000;

// ─── Hilfen ────────────────────────────────────────────────────────────────

interface CliFlags {
  force: boolean;
  limit: number | null;
}

function parseFlags(argv: string[]): CliFlags {
  const flags: CliFlags = { force: false, limit: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--force") flags.force = true;
    else if (a === "--limit") {
      flags.limit = Number(argv[++i] ?? 0) || null;
    }
  }
  return flags;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

interface EstvLocation {
  TaxLocationID: number;
  BfsID: number;
  CantonID: number;
  Canton: string;
  BfsName: string;
}

interface EstvApiResponse {
  response: {
    IncomeTaxFed: number;
    IncomeTaxCanton: number;
    IncomeTaxCity: number;
    IncomeTaxChurch: number;
    FortuneTaxCanton: number;
    FortuneTaxCity: number;
    FortuneTaxChurch: number;
    PersonalTax: number;
    TaxCredit: number;
    TotalTax: number;
    TotalNetTax: number;
    Location: EstvLocation;
  };
}

interface EstvCapitalApiResponse {
  response: Array<{
    TaxFed: number;
    TaxCanton: number;
    TaxCity: number;
    TaxChurch: number;
    Location: EstvLocation;
  }>;
}

// ─── Locations: BfsID → TaxLocationID via lokales JSON ─────────────────────

function loadLocations(jahr: 2025 | 2026): Map<number, number> {
  const path = resolve(
    REPO_ROOT,
    `src/engine/steuer-data/${jahr}/locations.json`
  );
  const data = JSON.parse(readFileSync(path, "utf-8")) as EstvLocation[];
  const map = new Map<number, number>();
  // Jede BfsID kann mehrere TaxLocationIDs haben (PLZ-Splits). Wir nehmen
  // jeweils die "Hauptort"-Variante: bevorzugt den mit höchster ID
  // oder denjenigen mit leerem BfsName (PLZ-only). Pragmatisch: erster
  // gewinnt — ESTV gibt dieselbe Berechnung pro BfsID ja zurück (Gemeinde-
  // Faktor identisch). Wir verlieren also nichts.
  for (const loc of data) {
    if (!map.has(loc.BfsID)) {
      map.set(loc.BfsID, loc.TaxLocationID);
    }
  }
  return map;
}

// ─── ESTV API Aufruf ───────────────────────────────────────────────────────

function relationshipCode(fallart: "einzel" | "paar"): number {
  return fallart === "paar" ? 2 : 1;
}

function confessionCode(k: "keine" | "reformiert" | "katholisch"): number {
  switch (k) {
    case "reformiert":
      return 1;
    case "katholisch":
      return 2;
    case "keine":
    default:
      return 4;
  }
}

async function fetchEstv(
  profile: EstvProfile,
  taxLocationId: number
): Promise<EstvApiResponse> {
  const body = {
    SimKey: null,
    TaxYear: profile.jahr,
    TaxLocationID: taxLocationId,
    Relationship: relationshipCode(profile.fallart),
    Confession1: confessionCode(profile.konfession),
    Confession2: 0,
    Children: [],
    TaxableIncomeCanton: profile.einkommen,
    TaxableIncomeFed: profile.einkommen,
    TaxableFortune: profile.vermoegen,
  };

  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${ESTV_BASE}/API_calculateSimpleTaxes`, {
        method: "POST",
        headers: ESTV_HEADERS,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      const json = (await res.json()) as EstvApiResponse;
      if (!json || !json.response) {
        throw new Error("Empty response.response from ESTV");
      }
      return json;
    } catch (e) {
      lastErr = e as Error;
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_BACKOFF_MS * attempt);
      }
    }
  }
  throw lastErr ?? new Error("Unknown fetch error");
}

/**
 * Phase-5-Variante von fetchEstv: nutzt separate Bemessungen für Bund
 * (DBG-Tarif) und Kanton (Kanton-Tarif), inkl. korrekter Kinder-Anzahl.
 */
async function fetchEstvSzenario(
  profile: EstvProfile,
  taxLocationId: number,
  steuerbarBund: number,
  steuerbarKanton: number
): Promise<EstvApiResponse> {
  // ESTV Children-Format: Array von Geburtsjahren. Wir gehen von Kindern
  // im Alter 6 aus → Geburtsjahr = jahr - 6. Das wirkt nur auf Kinder-
  // Abzüge bei der ESTV-Berechnung; für unsere Szenarien (P5) hat die
  // Engine den Kinderabzug bereits eingepreist, so dass ESTV auf dem
  // ANGELIEFERTEN steuerbaren Einkommen nur den Tarif anwendet — kein
  // weiterer Kinderabzug. Wir senden trotzdem das Kinder-Array damit
  // ESTV ggf. den Vermögens-Kinder-Sozialabzug korrekt berücksichtigt.
  const childrenBirthYears: number[] = [];
  for (let i = 0; i < profile.anzahlKinder; i++) {
    childrenBirthYears.push(profile.jahr - 6);
  }

  const body = {
    SimKey: null,
    TaxYear: profile.jahr,
    TaxLocationID: taxLocationId,
    Relationship: relationshipCode(profile.fallart),
    Confession1: confessionCode(profile.konfession),
    Confession2:
      profile.fallart === "paar" ? confessionCode(profile.konfession) : 0,
    Children: childrenBirthYears,
    TaxableIncomeCanton: Math.round(steuerbarKanton),
    TaxableIncomeFed: Math.round(steuerbarBund),
    TaxableFortune: Math.round(profile.vermoegen),
  };

  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${ESTV_BASE}/API_calculateSimpleTaxes`, {
        method: "POST",
        headers: ESTV_HEADERS,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      const json = (await res.json()) as EstvApiResponse;
      if (!json || !json.response) {
        throw new Error("Empty response.response from ESTV szenario");
      }
      return json;
    } catch (e) {
      lastErr = e as Error;
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_BACKOFF_MS * attempt);
      }
    }
  }
  throw lastErr ?? new Error("Unknown fetch error (szenario)");
}

async function fetchEstvCapital(
  profile: EstvProfile,
  taxGroupId: number
): Promise<EstvCapitalApiResponse> {
  const body = {
    SimKey: null,
    TaxYear: profile.jahr,
    TaxGroupID: taxGroupId,
    Relationship: relationshipCode(profile.fallart),
    Confession1: confessionCode(profile.konfession),
    Confession2: 0,
    NumberOfChildren: profile.anzahlKinder,
    Gender: profile.gender || 1,
    AgeAtPayment: profile.alterBeiAuszahlung || 65,
    Capital: profile.kapital,
  };

  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${ESTV_BASE}/API_calculateManyCapitalTaxes`, {
        method: "POST",
        headers: ESTV_HEADERS,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      const json = (await res.json()) as EstvCapitalApiResponse;
      if (!json || !Array.isArray(json.response) || json.response.length === 0) {
        throw new Error("Empty response.response array from ESTV capital");
      }
      return json;
    } catch (e) {
      lastErr = e as Error;
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_BACKOFF_MS * attempt);
      }
    }
  }
  throw lastErr ?? new Error("Unknown fetch error (capital)");
}

async function fetchEstvVersion(): Promise<string | undefined> {
  try {
    const res = await fetch(
      "https://swisstaxcalculator.estv.admin.ch/delegate/ost-integration/v1/application-info"
    );
    if (!res.ok) return undefined;
    const json = (await res.json()) as { version?: string };
    return json.version;
  } catch {
    return undefined;
  }
}

// ─── Snapshot I/O ──────────────────────────────────────────────────────────

function loadSnapshot(): EstvSnapshot | null {
  if (!existsSync(SNAPSHOT_PATH)) return null;
  try {
    return JSON.parse(readFileSync(SNAPSHOT_PATH, "utf-8")) as EstvSnapshot;
  } catch {
    return null;
  }
}

function saveSnapshot(snap: EstvSnapshot): void {
  mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(snap, null, 2) + "\n", "utf-8");
}

function emptyEntry(id: string): EstvSnapshotEntry {
  return {
    id,
    ok: false,
    expectedTotal: null,
    expectedBund: null,
    expectedKanton: null,
    expectedGemeinde: null,
    expectedKirche: null,
    expectedPersonal: null,
  };
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  const allProfiles = generateProfilesAll();
  const profiles = flags.limit ? allProfiles.slice(0, flags.limit) : allProfiles;

  console.log(
    `ESTV-Crawl Phase 1-5 — ${profiles.length}/${allProfiles.length} Profile`
  );
  console.log(`Force-Modus: ${flags.force}`);
  console.log(`Snapshot: ${SNAPSHOT_PATH}\n`);

  // Locations (BfsID → TaxLocationID) pro Jahr
  const locById: Map<2025 | 2026, Map<number, number>> = new Map();
  locById.set(2025, loadLocations(2025));
  locById.set(2026, loadLocations(2026));

  // ESTV version (für Snapshot-Metadaten)
  const estvVersion = await fetchEstvVersion();
  console.log(`ESTV API version: ${estvVersion ?? "unknown"}\n`);

  // Existing snapshot laden (resume) oder neu
  const now = new Date().toISOString();
  const snap: EstvSnapshot = loadSnapshot() ?? {
    meta: {
      schemaVersion: 1,
      startedAt: now,
      updatedAt: now,
      estvVersion,
      profilesTotal: allProfiles.length,
      profilesOk: 0,
    },
    entries: {},
  };
  snap.meta.estvVersion = estvVersion ?? snap.meta.estvVersion;
  snap.meta.profilesTotal = allProfiles.length;

  let okCount = 0;
  let errCount = 0;
  let skipCount = 0;

  for (let i = 0; i < profiles.length; i++) {
    const p = profiles[i];
    if (!p) continue;
    const existing = snap.entries[p.id];

    // Skip wenn bereits ok und nicht force
    if (existing?.ok && !flags.force) {
      skipCount++;
      continue;
    }

    const taxLocMap = locById.get(p.jahr);
    if (!taxLocMap) {
      console.error(`  ✗ ${p.id}: Jahr ${p.jahr} nicht in locations`);
      errCount++;
      continue;
    }
    const taxLocationId = taxLocMap.get(p.bfsId);
    if (!taxLocationId) {
      console.error(
        `  ✗ ${p.id}: BfsID ${p.bfsId} nicht in locations.json (${p.jahr})`
      );
      snap.entries[p.id] = {
        ...emptyEntry(p.id),
        error: `BfsID ${p.bfsId} not found in locations.json`,
        crawledAt: new Date().toISOString(),
      };
      errCount++;
      continue;
    }

    process.stdout.write(
      `[${i + 1}/${profiles.length}] ${p.id} (${p.kind}, TaxLocID ${taxLocationId}) ... `
    );

    try {
      if (p.kind === "kapital") {
        const res = await fetchEstvCapital(p, taxLocationId);
        const r = res.response[0]!;
        const total = r.TaxFed + r.TaxCanton + r.TaxCity + r.TaxChurch;
        const entry: EstvSnapshotEntry = {
          id: p.id,
          ok: true,
          crawledAt: new Date().toISOString(),
          taxLocationId,
          kind: "kapital",
          expectedBund: r.TaxFed,
          expectedKanton: r.TaxCanton,
          expectedGemeinde: r.TaxCity,
          expectedKirche: r.TaxChurch,
          expectedPersonal: 0,
          expectedTotal: total,
        };
        snap.entries[p.id] = entry;
        okCount++;
        console.log(`✓ Kapital Total CHF ${total.toFixed(0)}`);
      } else if (p.kind === "szenario") {
        // ─── Phase 5: realistisches End-to-End-Szenario ──────────────────
        // Schritt 1: steuerbares Einkommen (DBG + Kanton) aus den vollen
        // Engine-Abzügen berechnen.
        const abzInput = {
          bruttoErwerbP1: p.bruttoErwerbP1 ?? 0,
          bruttoErwerbP2: p.bruttoErwerbP2 ?? 0,
          alterP1: p.alterP1 ?? 40,
          alterP2: p.alterP2 ?? 0,
          fallart: p.fallart,
          anzahlKinder: p.anzahlKinder,
          saeule3aEinzahlungJahr: 0,
          pkEinkaufJahr: 0,
          hatPkAnschlussP1: p.hatPkAnschlussP1 ?? false,
          hatPkAnschlussP2: p.hatPkAnschlussP2 ?? false,
          einkommenIstNetto: false,
        };
        const abzDbg = abzuegeDbg(abzInput);
        const abzKt = abzuegeKanton(abzInput, p.kanton as KantonCode);
        const bruttoErwerbTotal =
          (p.bruttoErwerbP1 ?? 0) + (p.bruttoErwerbP2 ?? 0);
        const nichtErwerb = Math.max(0, p.einkommen - bruttoErwerbTotal);
        const steuerbarBund = Math.max(0, abzDbg.steuerbar + nichtErwerb);
        const steuerbarKanton = Math.max(0, abzKt.steuerbar + nichtErwerb);

        // Schritt 2: ESTV mit Bund+Kanton steuerbar abrufen.
        const szenarioProfile: EstvProfile = {
          ...p,
          einkommen: steuerbarKanton,
        };
        // Hack: für ESTV wollen wir TaxableIncomeFed = steuerbarBund und
        // TaxableIncomeCanton = steuerbarKanton senden. fetchEstv()
        // unterstützt aktuell nur einen einzigen `einkommen`-Wert (selbe
        // für beide). Wir patchen darüber temporär in einer eigenen Funktion.
        const res = await fetchEstvSzenario(
          szenarioProfile,
          taxLocationId,
          steuerbarBund,
          steuerbarKanton
        );
        const r = res.response;

        // Schritt 3: optional Kapital-Call (nur zh-kap-500k-einzel-ref).
        let expectedKapital = 0;
        let expectedKapitalBund = 0;
        let expectedKapitalKanton = 0;
        if (p.kapital > 0) {
          const kapRes = await fetchEstvCapital(
            { ...p, alterBeiAuszahlung: p.alterBeiAuszahlung || 65 },
            taxLocationId
          );
          const kr = kapRes.response[0]!;
          expectedKapitalBund = kr.TaxFed;
          expectedKapitalKanton = kr.TaxCanton + kr.TaxCity + kr.TaxChurch;
          expectedKapital = expectedKapitalBund + expectedKapitalKanton;
          await sleep(RATE_LIMIT_MS);
        }

        const totalOrd = r.TotalTax;
        const total = totalOrd + expectedKapital;
        const entry: EstvSnapshotEntry = {
          id: p.id,
          ok: true,
          crawledAt: new Date().toISOString(),
          taxLocationId,
          kind: "szenario",
          expectedBund: r.IncomeTaxFed,
          expectedKanton: r.IncomeTaxCanton + r.FortuneTaxCanton,
          expectedGemeinde: r.IncomeTaxCity + r.FortuneTaxCity,
          expectedKirche: r.IncomeTaxChurch + r.FortuneTaxChurch,
          expectedPersonal: r.PersonalTax,
          expectedTotal: totalOrd,
          steuerbarKantonGesendet: steuerbarKanton,
          steuerbarBundGesendet: steuerbarBund,
          expectedKapital: expectedKapital > 0 ? expectedKapital : undefined,
          expectedKapitalBund: expectedKapital > 0 ? expectedKapitalBund : undefined,
          expectedKapitalKanton:
            expectedKapital > 0 ? expectedKapitalKanton : undefined,
        };
        snap.entries[p.id] = entry;
        okCount++;
        console.log(
          `✓ Szenario Ord CHF ${totalOrd.toFixed(0)}` +
            (expectedKapital > 0 ? ` + Kap CHF ${expectedKapital.toFixed(0)}` : "") +
            ` = CHF ${total.toFixed(0)}`
        );
      } else {
        const res = await fetchEstv(p, taxLocationId);
        const r = res.response;
        const entry: EstvSnapshotEntry = {
          id: p.id,
          ok: true,
          crawledAt: new Date().toISOString(),
          taxLocationId,
          kind: "ordentlich",
          expectedBund: r.IncomeTaxFed,
          expectedKanton: r.IncomeTaxCanton + r.FortuneTaxCanton,
          expectedGemeinde: r.IncomeTaxCity + r.FortuneTaxCity,
          expectedKirche: r.IncomeTaxChurch + r.FortuneTaxChurch,
          expectedPersonal: r.PersonalTax,
          expectedTotal: r.TotalTax,
        };
        snap.entries[p.id] = entry;
        okCount++;
        console.log(`✓ Total CHF ${r.TotalTax.toFixed(0)}`);
      }
    } catch (e) {
      const err = (e as Error).message;
      console.log(`✗ ${err}`);
      snap.entries[p.id] = {
        ...emptyEntry(p.id),
        error: err,
        crawledAt: new Date().toISOString(),
        taxLocationId,
      };
      errCount++;
    }

    // Save progress nach jedem Profil (für Resume)
    snap.meta.updatedAt = new Date().toISOString();
    snap.meta.profilesOk = Object.values(snap.entries).filter((e) => e.ok)
      .length;
    saveSnapshot(snap);

    if (i < profiles.length - 1) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  console.log(
    `\n=== Done: ${okCount} ok, ${errCount} fail, ${skipCount} skip (resumed) ===`
  );
  console.log(`Snapshot: ${SNAPSHOT_PATH}`);
  console.log(`Profiles OK total in snapshot: ${snap.meta.profilesOk}`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

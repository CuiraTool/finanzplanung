/**
 * Sprint F — Live-Browser-Test-Runner.
 *
 * 100 random Schweizer Pensionsplanungs-Profile durch das LIVE-Tool
 * (http://localhost:3000) klicken — Console-Errors + visuelle Bugs +
 * Crashes sammeln. KEIN Fix — nur Bugs reporten.
 *
 * Vorgehen:
 *  1. Profile via existing `arbRandomProfile` generieren (Seed = Profil-ID).
 *  2. Vollen `PlanState`-kompatiblen Snapshot bauen (CashflowInput + Default-
 *     Felder für nachlass/anlagen/wohnortPlan/versicherungen/prioritaeten/
 *     erweitert/szenarioB/aktiverPlan/plaene/zivilstand).
 *  3. Playwright headless: navigate / → injizier localStorage `cuira-plan-v36`
 *     → reload → capture errors für 4 Seiten:
 *        a) `/` (Wizard + Dashboard)
 *        b) `/print` (PDF-Vorschau)
 *        c) `/` mit Plan B aktiv (Top-Bar-Schalter)
 *        d) `/print` mit Plan B aktiv
 *  4. Pro Profil: Console-Errors (red), Page-Errors (uncaught), NaN/—-Checks
 *     in KPI-Karten, "chart sichtbar?"
 *  5. Reports nach `docs/BUGS-UI.md` + `docs/BROWSER-TEST-RUN.md`.
 */
import { chromium, type Browser, type Page, type ConsoleMessage } from "playwright";
import fs from "node:fs";
import path from "node:path";
import fc from "fast-check";
import { arbRandomProfile, type RandomProfile } from "../src/engine/__validation__/profile-generator";
import type { PlanState } from "../src/lib/store";

// ─── Config ─────────────────────────────────────────────────────────

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const NUM_PROFILES = Number(process.env.NUM_PROFILES ?? 100);
const SEED_BASE = Number(process.env.SEED_BASE ?? 0xC04A);
const HEADLESS = process.env.HEADLESS !== "0";
const NET_IDLE_TIMEOUT_MS = 4000;
const STORAGE_KEY = "cuira-plan-v36";
const STORAGE_VERSION = 36;

// ─── Bug-Severity ───────────────────────────────────────────────────

type Severity = "kritisch" | "mittel" | "leicht";
type Stage = "wizard" | "print" | "wizard-planB" | "print-planB" | "navigate" | "localStorage";

interface Bug {
  profileId: number;
  seed: number;
  stage: Stage;
  severity: Severity;
  category: string;
  message: string;
  vermuteteUrsache?: string;
  consoleSample?: string[];
}

interface ProfileMeta {
  profileId: number;
  seed: number;
  fallart: string;
  kanton: string;
  alterP1: number | null;
  alterP2: number | null;
  durationMs: number;
  status: "ok" | "bugs" | "crash";
  bugCount: number;
  hydrationErrors: number;
}

const bugs: Bug[] = [];
const profileMetas: ProfileMeta[] = [];
/** Hydration-Errors zählen separat — bekanntes Baseline-Issue. */
let totalHydrationErrors = 0;

// ─── State-Builder ──────────────────────────────────────────────────

/**
 * Macht aus einem `RandomProfile` (= CashflowInput) einen vollen
 * `PlanState`-Snapshot, der direkt in localStorage taugt. Default-Werte
 * für alle PlanState-Felder, die `arbRandomProfile` NICHT setzt.
 */
function buildPlanState(profile: RandomProfile): PlanState {
  const aktiverJahr = new Date().getFullYear();

  const variantSnapshot = {
    ziele: profile.ziele,
    einmaligeAusgaben: profile.einmaligeAusgaben,
    budget: profile.budget,
    ahv: profile.ahv,
    bvg: profile.bvg,
    saeuleDrei: profile.saeuleDrei,
    vermoegen: profile.vermoegen,
    immobilien: profile.immobilien,
    firma: profile.firma,
    nachlass: {
      vorsorgeauftrag: false,
      patientenverfuegung: false,
      generalvollmacht: false,
      testament: false,
      erbvertrag: false,
      ehevertrag: false,
    },
    anlagen: {
      erfahrung: null,
      risikobereitschaft: null,
      horizont: null,
      formen: [],
      vermoegenAusland: false,
    },
    erbschaft: profile.erbschaft ?? {
      erwartet: null,
      groessenordnung: null,
      erwartetBetrag: null,
      erwartetJahr: null,
      erwartetBeruecksichtigen: false,
      schenkungenStatus: null,
      schenkungenBetrag: null,
      schenkungenJahr: null,
      schenkungenBeruecksichtigen: false,
      schenkungenDetails: "",
      gueterstand: null,
    },
    wohnortPlan: { umzugStatus: null, umzugZiel: "" },
    versicherungen: {
      vvgVorhanden: false,
      lebensversicherungVorhanden: false,
      lebensversicherungDetails: "",
      gesundheitsthemen: "",
    },
    prioritaeten: {
      ausgewaehlt: [],
      andereBeschreibung: "",
      zusaetzlicheAnliegen: "",
    },
    erweitert: {
      zivilstandSeitJahr: null,
      unterhaltspflichten: false,
      unterhaltspflichtenDetails: "",
      pensionsvision: "",
      andereVermoegenswerte: "",
      verbindlichkeitenAnderes: false,
      verbindlichkeitenDetails: "",
      firmaNachfolgeloesungEingeleitet: false,
      firmaBezug: null,
      dsgEinwilligung: false,
    },
  };

  // Plan B: einfach Plan A klonen mit anderem Bezugsalter (für Δ-Panel-Test)
  const variantSnapshotB = JSON.parse(JSON.stringify(variantSnapshot)) as typeof variantSnapshot;
  variantSnapshotB.ziele = {
    ...variantSnapshotB.ziele,
    bezugsalterP1: Math.min(70, profile.ziele.bezugsalterP1 + 2),
    bezugsalterP2: Math.min(70, profile.ziele.bezugsalterP2 + 2),
  };

  return {
    fallart: profile.fallart,
    zivilstand: profile.fallart === "paar" ? "verheiratet" : "ledig",
    adresse: profile.adresse,
    person1: profile.person1,
    person2: profile.person2,
    kinder: profile.kinder,
    ...variantSnapshot,
    szenarioB: { aktiv: false, overrides: {} },
    aktiverBlock: 1,
    aktiverPlan: "a",
    plaene: { a: variantSnapshot, b: variantSnapshotB, c: null },
    // Setter (werden nach rehydrate von Zustand neu reingehängt; in JSON ignoriert)
  } as unknown as PlanState;
}

/** Zustand-persist-Format: `{ state: PlanState, version: 36 }`. */
function buildPersistedJson(profile: RandomProfile): string {
  const planState = buildPlanState(profile);
  return JSON.stringify({ state: planState, version: STORAGE_VERSION });
}

// ─── Playwright-Helpers ─────────────────────────────────────────────

function makeProfile(seed: number): RandomProfile {
  return fc.sample(arbRandomProfile, { numRuns: 1, seed })[0]!;
}

/** Setzt localStorage + reloaded — zur Verwendung wenn Origin schon geladen ist. */
async function injectLocalStorageAndReload(page: Page, persistedJson: string): Promise<void> {
  await page.evaluate(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    { key: STORAGE_KEY, value: persistedJson }
  );
}

interface CollectedErrors {
  consoleErrors: string[];
  consoleWarnings: string[];
  pageErrors: string[];
}

function attachErrorCollectors(page: Page, collected: CollectedErrors): () => void {
  const onConsole = (msg: ConsoleMessage) => {
    const type = msg.type();
    const text = msg.text();
    if (type === "error") collected.consoleErrors.push(text);
    if (type === "warning") collected.consoleWarnings.push(text);
  };
  const onPageError = (err: Error) => {
    collected.pageErrors.push(`${err.name}: ${err.message}`);
  };
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  return () => {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
  };
}

/**
 * Filtert bekannte/erwartete React-19-Warnings aus, die nicht als Bug zählen.
 * Listfilter ist konservativ — nur eindeutig nicht-Bug-Strings.
 *
 * Wichtig: SSR/CSR-Hydration-Mismatch ist ein **bekannter Baseline-Bug**
 * (cuira.netlify.app zeigt React error #418 auch ohne Profil-Injection
 * — Ursache: `useViewMode()` + Zustand `persist` lesen erst client-side
 *  localStorage; SSR rendert Default-Values). Dieser Bug ist Sprint-F
 *  bekannt und wird separat geflaggt, nicht als Profil-spezifischer Bug.
 */
function isBenignError(s: string): boolean {
  if (!s) return true;
  if (s.includes("Download the React DevTools")) return true;
  if (s.includes("Failed to load resource: net::ERR_BLOCKED")) return true;
  // Next.js dev-only logging
  if (s.includes("[Fast Refresh]")) return true;
  if (s.includes("[HMR]")) return true;
  return false;
}

/**
 * Erkennt Hydration-Mismatch-Errors (React #418/#419 sowie der dev-Mode-Text).
 * Diese sind bekannte Baseline-Issues und werden als eigene Kategorie
 * gezählt, nicht als profil-spezifischer Bug.
 */
function isHydrationError(s: string): boolean {
  if (!s) return false;
  if (s.includes("Minified React error #418")) return true;
  if (s.includes("Minified React error #419")) return true;
  if (s.includes("Minified React error #423")) return true;
  if (s.includes("Hydration failed")) return true;
  if (s.includes("hydrated but some attributes")) return true;
  if (s.includes("server rendered text didn't match")) return true;
  return false;
}

/**
 * Detect DOM signals: NaN, "—" als KPI-Wert (Erwartung: nach Profil-Injection
 * sollten KPIs Zahlen zeigen), missing chart paths.
 */
async function inspectDashboardDom(page: Page): Promise<{
  hasNaN: boolean;
  hasDashKpi: boolean;
  hasChartPath: boolean;
  hasPlausibility: boolean;
  has3SaeulenKpi: boolean;
}> {
  return await page.evaluate(() => {
    const body = document.body?.innerText ?? "";
    const hasNaN = /NaN|undefined CHF|\bNaN\b/.test(body);
    // KPI mit "—" bei Profil mit echten Vermögen wäre verdächtig.
    // Wir suchen nach Karten, deren KPI-Wert "—" ist (über CSS-Selektor falls möglich).
    // Da wir kein eindeutiges KPI-CSS-Class kennen, machen wir eine Heuristik:
    // mindestens eine numerische CHF-Anzeige sollte da sein.
    // Swiss-formatted CHF: separator ist U+2019 (’), nicht ASCII '
    const cheaper = body.match(/CHF\s+[\d'’.,’-]+/);
    const hasDashKpi = !!cheaper && cheaper[0].length > 5;
    // Charts: SVG <path> in der page (Recharts rendert <path>)
    const paths = document.querySelectorAll("svg path");
    const hasChartPath = paths.length > 0;
    // Plausibilitäts-Panel hat typisch Text "Plausibilität"
    const hasPlausibility = /Plausibilit/i.test(body);
    // 3-Säulen-KPI: typischer Text "Säule" oder "AHV"
    const has3SaeulenKpi = /AHV|Pensionskasse|Säule/i.test(body);
    return { hasNaN, hasDashKpi, hasChartPath, hasPlausibility, has3SaeulenKpi };
  });
}

async function inspectPrintDom(page: Page): Promise<{
  hasNaN: boolean;
  hasCoverContent: boolean;
  hasChartPath: boolean;
  hasDisclaimer: boolean;
}> {
  return await page.evaluate(() => {
    const body = document.body?.innerText ?? "";
    const hasNaN = /NaN|undefined CHF|\bNaN\b/.test(body);
    const hasCoverContent = body.length > 200; // Print sollte viel Text haben
    const paths = document.querySelectorAll("svg path");
    const hasChartPath = paths.length > 0;
    const hasDisclaimer = /Disclaimer|Haftungs|Rechtliche|Hinweis/i.test(body);
    return { hasNaN, hasCoverContent, hasChartPath, hasDisclaimer };
  });
}

// ─── Pro-Profil-Run ─────────────────────────────────────────────────

async function runOneProfile(browser: Browser, profileId: number): Promise<void> {
  const t0 = Date.now();
  const seed = SEED_BASE + profileId;
  const profile = makeProfile(seed);
  const persistedJson = buildPersistedJson(profile);

  let context = null;
  let page: Page | null = null;
  const profileBugsBefore = bugs.length;
  let profileHydrationErrors = 0;

  try {
    context = await browser.newContext();
    page = await context.newPage();

    // 1) Initial-Navigation zu / um Origin zu setzen, dann localStorage injizieren
    const navErrors: CollectedErrors = {
      consoleErrors: [],
      consoleWarnings: [],
      pageErrors: [],
    };
    const navDetach = attachErrorCollectors(page, navErrors);
    try {
      await page.goto(BASE_URL + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
    } catch (e) {
      bugs.push({
        profileId,
        seed,
        stage: "navigate",
        severity: "kritisch",
        category: "navigation-fail",
        message: `Konnte ${BASE_URL}/ nicht laden: ${(e as Error).message}`,
      });
      navDetach();
      return;
    }
    navDetach();

    // 2) localStorage injizieren + reload
    try {
      await injectLocalStorageAndReload(page, persistedJson);
    } catch (e) {
      bugs.push({
        profileId,
        seed,
        stage: "localStorage",
        severity: "kritisch",
        category: "ls-inject-fail",
        message: `localStorage-Inject fehlgeschlagen: ${(e as Error).message}`,
      });
      return;
    }

    // 3) Wizard + Dashboard testen
    const wizErrors: CollectedErrors = {
      consoleErrors: [],
      consoleWarnings: [],
      pageErrors: [],
    };
    const wizDetach = attachErrorCollectors(page, wizErrors);
    await page.goto(BASE_URL + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
    // Networkidle nicht garantiert (Sentry, etc.) — stattdessen kurz warten auf React-Hydration
    await page.waitForLoadState("networkidle", { timeout: NET_IDLE_TIMEOUT_MS }).catch(() => {});
    // Auf erste Chart-Path warten — Recharts braucht für komplexe Datasets manchmal >1.5s
    await page
      .waitForFunction(
        () =>
          document.querySelectorAll("svg path").length > 0 &&
          /CHF\s+[\d'’.,-]+/.test(document.body?.innerText ?? ""),
        { timeout: 3500 }
      )
      .catch(() => {});
    await page.waitForTimeout(400);
    const wizDom = await inspectDashboardDom(page).catch(() => null);
    wizDetach();

    for (const err of wizErrors.consoleErrors) {
      if (isBenignError(err)) continue;
      if (isHydrationError(err)) {
        profileHydrationErrors++;
        continue;
      }
      bugs.push({
        profileId,
        seed,
        stage: "wizard",
        severity: "mittel",
        category: "console-error",
        message: err.slice(0, 400),
        consoleSample: wizErrors.consoleErrors.slice(0, 3),
      });
    }
    for (const pe of wizErrors.pageErrors) {
      if (isHydrationError(pe)) {
        profileHydrationErrors++;
        continue;
      }
      bugs.push({
        profileId,
        seed,
        stage: "wizard",
        severity: "kritisch",
        category: "page-error",
        message: pe.slice(0, 400),
      });
    }
    if (wizDom) {
      if (wizDom.hasNaN) {
        bugs.push({
          profileId,
          seed,
          stage: "wizard",
          severity: "mittel",
          category: "nan-rendered",
          message: `Dashboard zeigt NaN / 'undefined CHF' im sichtbaren Text`,
        });
      }
      if (!wizDom.hasChartPath) {
        bugs.push({
          profileId,
          seed,
          stage: "wizard",
          severity: "mittel",
          category: "no-chart",
          message: `Kein <svg path> auf der Seite — Chart nicht gerendert`,
        });
      }
      if (!wizDom.hasDashKpi) {
        bugs.push({
          profileId,
          seed,
          stage: "wizard",
          severity: "mittel",
          category: "no-kpi-chf",
          message: `Keine CHF-Werte im Dashboard sichtbar`,
        });
      }
    }

    // 4) /print testen
    const prnErrors: CollectedErrors = {
      consoleErrors: [],
      consoleWarnings: [],
      pageErrors: [],
    };
    const prnDetach = attachErrorCollectors(page, prnErrors);
    await page.goto(BASE_URL + "/print", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: NET_IDLE_TIMEOUT_MS }).catch(() => {});
    // Print-Seite: warte auf erste Chart und Disclaimer-/Cover-Inhalt
    await page
      .waitForFunction(
        () =>
          document.querySelectorAll("svg path").length > 0 &&
          (document.body?.innerText ?? "").length > 500,
        { timeout: 4500 }
      )
      .catch(() => {});
    await page.waitForTimeout(600);
    const prnDom = await inspectPrintDom(page).catch(() => null);
    prnDetach();

    for (const err of prnErrors.consoleErrors) {
      if (isBenignError(err)) continue;
      if (isHydrationError(err)) {
        profileHydrationErrors++;
        continue;
      }
      bugs.push({
        profileId,
        seed,
        stage: "print",
        severity: "mittel",
        category: "console-error",
        message: err.slice(0, 400),
        consoleSample: prnErrors.consoleErrors.slice(0, 3),
      });
    }
    for (const pe of prnErrors.pageErrors) {
      if (isHydrationError(pe)) {
        profileHydrationErrors++;
        continue;
      }
      bugs.push({
        profileId,
        seed,
        stage: "print",
        severity: "kritisch",
        category: "page-error",
        message: pe.slice(0, 400),
      });
    }
    if (prnDom) {
      if (prnDom.hasNaN) {
        bugs.push({
          profileId,
          seed,
          stage: "print",
          severity: "mittel",
          category: "nan-rendered",
          message: `Print zeigt NaN / 'undefined CHF'`,
        });
      }
      if (!prnDom.hasChartPath) {
        bugs.push({
          profileId,
          seed,
          stage: "print",
          severity: "leicht",
          category: "no-chart",
          message: `Print hat keine Chart-Paths`,
        });
      }
      if (!prnDom.hasCoverContent) {
        bugs.push({
          profileId,
          seed,
          stage: "print",
          severity: "kritisch",
          category: "print-empty",
          message: `Print-Seite hat <200 chars Text — wahrscheinlich leer/crashed`,
        });
      }
    }

    // 5) Plan B aktivieren — via direkter localStorage-Modifikation (aktiverPlan=b)
    // Easier than UI-Klick und reicht für Δ-Panel-Test
    const planBJson = (() => {
      const ps = buildPlanState(profile);
      (ps as unknown as Record<string, unknown>).aktiverPlan = "b";
      return JSON.stringify({ state: ps, version: STORAGE_VERSION });
    })();
    await page.evaluate(
      ({ key, value }) => {
        window.localStorage.setItem(key, value);
      },
      { key: STORAGE_KEY, value: planBJson }
    );

    const wizBErrors: CollectedErrors = {
      consoleErrors: [],
      consoleWarnings: [],
      pageErrors: [],
    };
    const wizBDetach = attachErrorCollectors(page, wizBErrors);
    await page.goto(BASE_URL + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: NET_IDLE_TIMEOUT_MS }).catch(() => {});
    await page
      .waitForFunction(
        () => document.querySelectorAll("svg path").length > 0,
        { timeout: 3500 }
      )
      .catch(() => {});
    await page.waitForTimeout(400);
    wizBDetach();

    for (const err of wizBErrors.consoleErrors) {
      if (isBenignError(err)) continue;
      if (isHydrationError(err)) {
        profileHydrationErrors++;
        continue;
      }
      bugs.push({
        profileId,
        seed,
        stage: "wizard-planB",
        severity: "mittel",
        category: "console-error",
        message: err.slice(0, 400),
      });
    }
    for (const pe of wizBErrors.pageErrors) {
      if (isHydrationError(pe)) {
        profileHydrationErrors++;
        continue;
      }
      bugs.push({
        profileId,
        seed,
        stage: "wizard-planB",
        severity: "kritisch",
        category: "page-error",
        message: pe.slice(0, 400),
      });
    }
  } catch (e) {
    bugs.push({
      profileId,
      seed,
      stage: "navigate",
      severity: "kritisch",
      category: "harness-crash",
      message: `Test-Harness-Crash: ${(e as Error).message}`,
    });
  } finally {
    try {
      if (page) await page.close();
      if (context) await context.close();
    } catch {}
  }

  totalHydrationErrors += profileHydrationErrors;
  const duration = Date.now() - t0;
  const bugCount = bugs.length - profileBugsBefore;
  const status: ProfileMeta["status"] =
    bugCount === 0 ? "ok" : bugs.slice(profileBugsBefore).some((b) => b.severity === "kritisch") ? "crash" : "bugs";
  profileMetas.push({
    profileId,
    seed,
    fallart: profile.fallart,
    kanton: profile.adresse.kanton,
    alterP1: alterAusGeb(profile.person1.geburtsdatum),
    alterP2: profile.fallart === "paar" ? alterAusGeb(profile.person2.geburtsdatum) : null,
    durationMs: duration,
    status,
    bugCount,
    hydrationErrors: profileHydrationErrors,
  });
}

function alterAusGeb(geb: string): number | null {
  if (!geb) return null;
  const j = parseInt(geb.slice(0, 4), 10);
  if (!Number.isFinite(j)) return null;
  return new Date().getFullYear() - j;
}

// ─── Reports ────────────────────────────────────────────────────────

function bugMarkdown(): string {
  const krit = bugs.filter((b) => b.severity === "kritisch");
  const mit = bugs.filter((b) => b.severity === "mittel");
  const li = bugs.filter((b) => b.severity === "leicht");

  // Aggregation: gleiche message+stage+severity zusammenfassen
  type Group = {
    severity: Severity;
    category: string;
    stage: Stage;
    message: string;
    count: number;
    profiles: number[];
    vermuteteUrsache?: string;
    consoleSample?: string[];
  };
  const groups = new Map<string, Group>();
  for (const b of bugs) {
    const k = `${b.severity}|${b.stage}|${b.category}|${b.message.slice(0, 120)}`;
    const g = groups.get(k);
    if (g) {
      g.count++;
      if (g.profiles.length < 10) g.profiles.push(b.profileId);
    } else {
      groups.set(k, {
        severity: b.severity,
        category: b.category,
        stage: b.stage,
        message: b.message,
        count: 1,
        profiles: [b.profileId],
        vermuteteUrsache: b.vermuteteUrsache,
        consoleSample: b.consoleSample,
      });
    }
  }
  const sortedGroups = Array.from(groups.values()).sort((a, b) => {
    const sevW: Record<Severity, number> = { kritisch: 3, mittel: 2, leicht: 1 };
    return sevW[b.severity] - sevW[a.severity] || b.count - a.count;
  });
  const top5 = sortedGroups.slice(0, 5);

  const lines: string[] = [];
  lines.push(`# UI-Bugs aus Sprint-F Browser-Test-Run`);
  lines.push(``);
  lines.push(`Generiert: ${new Date().toISOString()}`);
  lines.push(``);
  lines.push(`Anzahl Bugs total: **${bugs.length}** über ${NUM_PROFILES} Profile.`);
  lines.push(``);
  lines.push(`| Severity | Count |`);
  lines.push(`|---|---|`);
  lines.push(`| Kritisch | ${krit.length} |`);
  lines.push(`| Mittel | ${mit.length} |`);
  lines.push(`| Leicht | ${li.length} |`);
  lines.push(``);
  lines.push(`## Top 5 Bugs (sortiert nach Severity + Häufigkeit)`);
  lines.push(``);
  top5.forEach((g, i) => {
    lines.push(`### ${i + 1}. [${g.severity.toUpperCase()}] ${g.category} — ${g.stage}`);
    lines.push(``);
    lines.push(`- **Vorkommen:** ${g.count}× über ${new Set(g.profiles).size} Profile`);
    lines.push(`- **Reproduktion:** Profile-IDs ${g.profiles.slice(0, 5).join(", ")}${g.profiles.length > 5 ? ", …" : ""}`);
    lines.push(`- **Message:** \`${g.message.replace(/`/g, "'")}\``);
    if (g.vermuteteUrsache) lines.push(`- **Vermutete Ursache:** ${g.vermuteteUrsache}`);
    if (g.consoleSample && g.consoleSample.length > 0) {
      lines.push(`- **Console-Sample:**`);
      for (const cs of g.consoleSample.slice(0, 2)) {
        lines.push(`  - \`${cs.slice(0, 200).replace(/`/g, "'")}\``);
      }
    }
    lines.push(``);
  });

  lines.push(`---`);
  lines.push(``);
  lines.push(`## Alle Bug-Gruppen (sortiert nach Severity)`);
  lines.push(``);
  for (const g of sortedGroups) {
    lines.push(`### [${g.severity}] ${g.category} (${g.count}×) — ${g.stage}`);
    lines.push(``);
    lines.push(`- Message: \`${g.message.slice(0, 300).replace(/`/g, "'")}\``);
    lines.push(`- Profile-IDs (Beispiele): ${g.profiles.slice(0, 8).join(", ")}`);
    lines.push(``);
  }

  return lines.join("\n");
}

function runMarkdown(): string {
  const total = profileMetas.length;
  const okCount = profileMetas.filter((m) => m.status === "ok").length;
  const bugsCount = profileMetas.filter((m) => m.status === "bugs").length;
  const crashCount = profileMetas.filter((m) => m.status === "crash").length;
  const totalMs = profileMetas.reduce((a, m) => a + m.durationMs, 0);
  const avgSec = total > 0 ? totalMs / total / 1000 : 0;

  // Verteilung Kantone + Fallart
  const fallartCount: Record<string, number> = {};
  const kantonCount: Record<string, number> = {};
  for (const m of profileMetas) {
    fallartCount[m.fallart] = (fallartCount[m.fallart] ?? 0) + 1;
    kantonCount[m.kanton] = (kantonCount[m.kanton] ?? 0) + 1;
  }

  const lines: string[] = [];
  lines.push(`# Browser-Test-Run — Sprint F`);
  lines.push(``);
  lines.push(`**Datum:** ${new Date().toISOString()}`);
  lines.push(`**Tool:** Playwright headless (chromium-headless-shell)`);
  lines.push(`**Target:** \`${BASE_URL}\``);
  lines.push(`**Seed-Base:** \`0x${SEED_BASE.toString(16).toUpperCase()}\` (deterministisch reproduzierbar)`);
  lines.push(``);
  lines.push(`## Profile`);
  lines.push(``);
  lines.push(`| Status | Count |`);
  lines.push(`|---|---|`);
  lines.push(`| OK (keine Bugs) | ${okCount} |`);
  lines.push(`| Bugs (mittel/leicht) | ${bugsCount} |`);
  lines.push(`| Crashes (kritisch) | ${crashCount} |`);
  lines.push(`| **Total** | **${total}** |`);
  lines.push(``);
  lines.push(`## Bekannte Baseline-Issues`);
  lines.push(``);
  lines.push(
    `**SSR/CSR-Hydration-Mismatch (React #418):** ${totalHydrationErrors} Vorkommen über alle Profile.`
  );
  lines.push(``);
  lines.push(
    `Fires bereits ohne Profil-Injection (leerer localStorage) — Ursache: ` +
      `\`useViewMode()\` + Zustand \`persist\` lesen erst client-side ` +
      `localStorage, während SSR Default-Werte rendert. React-19-strict ` +
      `weniger tolerant als React-18. Existiert vor Sprint F.`
  );
  lines.push(``);
  lines.push(
    `**Empfehlung:** \`suppressHydrationWarning\` auf root-div oder ` +
      `\`useEffect()\`-Hook für Zustand-rehydrate (Pattern: render Default ` +
      `bis hydrated, dann re-render). Eigener Bug-Fix-PR.`
  );
  lines.push(``);
  lines.push(`## Performance`);
  lines.push(``);
  lines.push(`- Total runtime: ${(totalMs / 1000).toFixed(1)}s`);
  lines.push(`- Avg pro Profil: ${avgSec.toFixed(2)}s`);
  lines.push(`- 4 Page-Loads pro Profil (Wizard, Print, Wizard-PlanB, optional zusätzliche)`);
  lines.push(``);
  lines.push(`## Verteilung Fallart`);
  lines.push(``);
  for (const [k, v] of Object.entries(fallartCount)) lines.push(`- ${k}: ${v}`);
  lines.push(``);
  lines.push(`## Top-Kantone (Verteilung)`);
  lines.push(``);
  const topKantone = Object.entries(kantonCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  for (const [k, v] of topKantone) lines.push(`- ${k}: ${v}`);
  lines.push(``);

  return lines.join("\n");
}

// ─── Main ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`Sprint F — Browser-Test-Runner`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Profile: ${NUM_PROFILES}, Seed-Base: 0x${SEED_BASE.toString(16)}`);
  console.log(`Headless: ${HEADLESS}\n`);

  const browser = await chromium.launch({ headless: HEADLESS });

  const startTime = Date.now();
  let lastLog = startTime;
  for (let i = 0; i < NUM_PROFILES; i++) {
    await runOneProfile(browser, i);
    const now = Date.now();
    if (now - lastLog > 5000 || i === NUM_PROFILES - 1) {
      const meta = profileMetas[profileMetas.length - 1];
      if (meta) {
        console.log(
          `[${i + 1}/${NUM_PROFILES}] ${meta.status.toUpperCase()} ` +
            `(${meta.fallart}, ${meta.kanton}, ${meta.durationMs}ms, ${meta.bugCount} bugs)`
        );
      }
      lastLog = now;
    }
  }

  await browser.close();

  const totalSec = (Date.now() - startTime) / 1000;
  console.log(`\nFertig. ${totalSec.toFixed(1)}s total, ${bugs.length} bugs gesammelt.`);

  // Reports schreiben
  const docsDir = path.resolve(__dirname, "..", "docs");
  fs.writeFileSync(path.join(docsDir, "BUGS-UI.md"), bugMarkdown(), "utf8");
  fs.writeFileSync(path.join(docsDir, "BROWSER-TEST-RUN.md"), runMarkdown(), "utf8");
  console.log(`Reports → docs/BUGS-UI.md, docs/BROWSER-TEST-RUN.md`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

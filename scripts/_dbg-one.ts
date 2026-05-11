/**
 * Debug-Script: lädt EIN konkretes Profil und gibt das visible DOM aus,
 * damit man sieht, was das Dashboard zeigt.
 *
 * Verwendung: PROFILE_ID=4 BASE_URL=https://cuira.netlify.app npx tsx scripts/_dbg-one.ts
 */
import { chromium } from "playwright";
import fc from "fast-check";
import { arbRandomProfile } from "../src/engine/__validation__/profile-generator";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const PROFILE_ID = Number(process.env.PROFILE_ID ?? 4);
const SEED_BASE = 0xc04a;

async function main() {
  const seed = SEED_BASE + PROFILE_ID;
  const profile = fc.sample(arbRandomProfile, { numRuns: 1, seed })[0]!;
  console.log("Profile:", {
    fallart: profile.fallart,
    p1Geb: profile.person1.geburtsdatum,
    p2Geb: profile.person2?.geburtsdatum,
    kanton: profile.adresse.kanton,
    bezugsalterP1: profile.ziele.bezugsalterP1,
    bezugsalterP2: profile.ziele.bezugsalterP2,
    ahvEinkP1: profile.ahv.einkommenP1,
    ahvEinkP2: profile.ahv.einkommenP2,
    bvgGuthabenP1: profile.bvg.p1.altersguthabenHeute,
    immoCount: profile.immobilien.items.length,
    s3Count: profile.saeuleDrei.p1.length + (profile.saeuleDrei.p2?.length ?? 0),
    vermItems: profile.vermoegen.items.length,
  });

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push("PE: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("CE: " + m.text());
  });

  await page.goto(BASE_URL + "/", { waitUntil: "domcontentloaded" });

  // Build planState (simplified — Just minimal)
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
    nachlass: { vorsorgeauftrag: false, patientenverfuegung: false, generalvollmacht: false, testament: false, erbvertrag: false, ehevertrag: false },
    anlagen: { erfahrung: null, risikobereitschaft: null, horizont: null, formen: [], vermoegenAusland: false },
    erbschaft: profile.erbschaft,
    wohnortPlan: { umzugStatus: null, umzugZiel: "" },
    versicherungen: { vvgVorhanden: false, lebensversicherungVorhanden: false, lebensversicherungDetails: "", gesundheitsthemen: "" },
    prioritaeten: { ausgewaehlt: [], andereBeschreibung: "", zusaetzlicheAnliegen: "" },
    erweitert: { zivilstandSeitJahr: null, unterhaltspflichten: false, unterhaltspflichtenDetails: "", pensionsvision: "", andereVermoegenswerte: "", verbindlichkeitenAnderes: false, verbindlichkeitenDetails: "", firmaNachfolgeloesungEingeleitet: false, firmaBezug: null, dsgEinwilligung: false },
  };
  const planState = {
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
    plaene: { a: variantSnapshot, b: null, c: null },
  };
  const persisted = JSON.stringify({ state: planState, version: 36 });

  await page.evaluate((v) => {
    window.localStorage.setItem("cuira-plan-v36", v);
  }, persisted);

  await page.goto(BASE_URL + "/", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const text = await page.evaluate(() => document.body.innerText);
  const chfMatches = text.match(/CHF\s*[-\d'.,]+/g) ?? [];
  const nanCount = (text.match(/NaN/g) ?? []).length;
  const svgPathCount = await page.evaluate(() => document.querySelectorAll("svg path").length);

  console.log("\n--- DOM Analyse ---");
  console.log("Body length:", text.length);
  console.log("CHF matches (first 10):", chfMatches.slice(0, 10));
  console.log("NaN count:", nanCount);
  console.log("SVG path count:", svgPathCount);
  console.log("Errors:", errors.length);
  errors.slice(0, 5).forEach((e) => console.log("  -", e.slice(0, 200)));

  console.log("\n--- Body (first 2500 chars) ---");
  console.log(text.slice(0, 2500));

  await browser.close();
}

main().catch(console.error);

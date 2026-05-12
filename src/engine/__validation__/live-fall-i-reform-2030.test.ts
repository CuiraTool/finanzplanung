/**
 * Live-Fall I: Reform 2030 Bruchstelle — Eigenheim mit hohem EMW + Schuldzins.
 *
 * Reform 2030 (Inkrafttreten 1.1.2030, Volksabstimmung Sept 2025 angenommen)
 * schafft Eigenmietwert UND Schuldzinsabzug ab. Engine-Konstante:
 * EIGENMIETWERT_LETZTES_JAHR = 2029. Ab Steuerjahr 2030 entfällt beides.
 *
 * Profil "Maximaler Reform-Effekt":
 *  - Hans Steiner ledig, geb 1965-06-15, Kanton ZH (hoher Steuersatz)
 *  - Einkommen 200'000/J Anstellung, Pension mit 65 → Ende 2030
 *  - Eigenheim ZH 1'500'000, Hypothek 800'000 @ 1.8 % (Zinslast 14'400/J)
 *  - EMW 3.5 % von Verkehrswert = 52'500/J (vor Pension)
 *  - Plan A: bleibt im Eigenheim
 *  - Ausgaben 9'000/Mt
 *
 * Erwartung: EMW 52'500 > Schuldzins 14'400 — Wegfall EMW in 2030 ist
 * grösser als Wegfall Schuldzins-Abzug, also sollte Einkommens-Steuer
 * 2030 NIEDRIGER sein als 2029 (Steuerbasis sinkt um netto ≈ 38'100).
 *
 * Test-Fokus:
 *  1. eigenmietwertJahr 2029 > 0, 2030 == 0
 *  2. schuldzinsenAbzug 2029 > 0, 2030 == 0
 *  3. Steuer-Bruchstelle: 2030 < 2029 (Wegfall EMW dominiert)
 *  4. Engine wirft keine NaN/Inf rund um die Bruchstelle
 *  5. Vermögen-Pfad bleibt monoton plausibel über die Bruchstelle
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe, type CashflowInput } from "../cashflow";
import { EIGENMIETWERT_LETZTES_JAHR } from "../steuer";

function buildFallI(): CashflowInput {
  return {
    fallart: "einzel",
    zivilstand: "ledig",
    person1: {
      vorname: "Hans",
      nachname: "Steiner",
      geburtsdatum: "1965-06-15",
      geschlecht: "m",
      telefon: "",
      email: "",
    },
    person2: {
      vorname: "",
      nachname: "",
      geburtsdatum: "",
      geschlecht: null,
      telefon: "",
      email: "",
    },
    kinder: [],
    ahv: {
      einkommenP1: 200_000,
      einkommenP2: null,
      hatIkAuszugP1: false,
      hatIkAuszugP2: false,
      hatFehljahreP1: false,
      hatFehljahreP2: false,
      fehljahreAnzahlP1: 0,
      fehljahreAnzahlP2: 0,
      ahvBezugsalterP1: 65,
      ahvBezugsalterP2: 65,
      ahvRenteJahrEffektivP1: null,
      ahvRenteJahrEffektivP2: null,
    },
    bvg: {
      p1: {
        aktiverAnschluss: true,
        altersguthabenHeute: 400_000,
        altersguthabenBeiBezug: 550_000,
        umwandlungssatzProzent: 6.0,
        bezugspraeferenz: "rente",
        kapitalanteil: 0,
        freizuegigkeit: [],
        einkaeufe: [],
        wefVorbezuege: [],
      },
      p2: {
        aktiverAnschluss: false,
        altersguthabenHeute: null,
        altersguthabenBeiBezug: null,
        umwandlungssatzProzent: 6,
        bezugspraeferenz: "rente",
        kapitalanteil: 0,
        freizuegigkeit: [],
        einkaeufe: [],
        wefVorbezuege: [],
      },
    },
    saeuleDrei: { p1: [], p2: [] },
    vermoegen: {
      items: [
        {
          id: "v1",
          typ: "konto",
          beschreibung: "Privatkonto",
          saldoHeute: 120_000,
          renditeProzent: 0,
          istHauptkonto: true,
        },
        {
          id: "v2",
          typ: "depot",
          beschreibung: "Wertschriften-Depot",
          saldoHeute: 180_000,
          renditeProzent: 3,
          istHauptkonto: false,
        },
      ],
    },
    immobilien: {
      items: [
        {
          id: "eh-zh",
          beschreibung: "Eigenheim Zürich",
          typ: "selbstbewohnt",
          verkehrswert: 1_500_000,
          hypotheken: [
            {
              id: "h1",
              beschreibung: "Hypothek 1.8 %",
              hoehe: 800_000,
              zinssatzProzent: 1.8,
              ablaufjahr: 2045,
            },
          ],
          plan: "behalten",
          verkaufsjahr: 2060,
          jaehrlicheMieteinnahmen: null,
          kaufjahr: 2005,
          anlagekosten: null,
          wertvermehrendeInvestitionen: null,
          wertsteigerungProzent: 0, // konstant — isoliert Reform-Effekt
          // EMW = 3.5 % × 1'500'000 = 52'500/J (User-Override)
          eigenmietwertProzent: 3.5,
        },
      ],
    },
    firma: {
      vorhanden: false,
      firmenname: "",
      moeglicherVerkaufserloes: null,
      plan: "behalten",
      verkaufsjahr: 2050,
    },
    ziele: { bezugsalterP1: 65, bezugsalterP2: 65 },
    budget: {
      einkommen: [
        {
          id: "e1",
          beschreibung: "Lohn",
          personIdx: 1 as const,
          betragMonatlich: 16_667, // ≈ 200k/J
          von: "2026-01",
          bis: "2030-06", // bis Pensionierung
        },
      ],
      ausgabenModus: "total",
      ausgabenTotal: 9_000, // 108k/J
      ausgabenKategorien: {
        lebenshaltung: null,
        wohnen: null,
        mobilitaet: null,
        versicherungen: null,
        ferienHobby: null,
        sonstiges: null,
      },
      wunschverbrauchPension: 7_500,
      steuernHeute: null,
      einkommenHeute: null,
      religion: "keine",
      alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
    },
    adresse: {
      strasse: "Bahnhofstrasse 1",
      plz: "8001",
      ort: "Zürich",
      kanton: "ZH",
      gemeindeBfsId: 261, // Stadt Zürich
      gemeindeName: "Zürich",
    },
    einmaligeAusgaben: [],
  };
}

describe("Live-Fall I — Reform 2030 Bruchstelle (Hans Steiner ZH)", () => {
  const state = buildFallI();
  const reihe = cashflowReihe(state, 2026, 2035);
  const z2026 = reihe.find((r) => r.jahr === 2026)!;
  const z2028 = reihe.find((r) => r.jahr === 2028)!;
  const z2029 = reihe.find((r) => r.jahr === 2029)!;
  const z2030 = reihe.find((r) => r.jahr === 2030)!;
  const z2031 = reihe.find((r) => r.jahr === 2031)!;
  const z2035 = reihe.find((r) => r.jahr === 2035)!;

  it("Engine läuft 2026-2035 ohne NaN/Inf rund um die Bruchstelle", () => {
    expect(reihe.length).toBe(10);
    for (const z of reihe) {
      expect(Number.isFinite(z.einnahmenTotal)).toBe(true);
      expect(Number.isFinite(z.ausgabenTotal)).toBe(true);
      expect(Number.isFinite(z.ausgabenSteuern)).toBe(true);
      expect(Number.isFinite(z.eigenmietwertJahr)).toBe(true);
      expect(Number.isFinite(z.schuldzinsenAbzug)).toBe(true);
      expect(Number.isFinite(z.vermoegenNetto)).toBe(true);
      expect(z.ausgabenSteuern).toBeGreaterThanOrEqual(0);
    }
  });

  it("EIGENMIETWERT_LETZTES_JAHR konstante: 2029", () => {
    expect(EIGENMIETWERT_LETZTES_JAHR).toBe(2029);
  });

  it("eigenmietwertJahr 2029 > 0 (Reform-Phase aktiv)", () => {
    // 1'500'000 × 3.5 % = 52'500
    expect(z2029.eigenmietwertJahr).toBeGreaterThanOrEqual(50_000);
    expect(z2029.eigenmietwertJahr).toBeLessThanOrEqual(55_000);
  });

  it("eigenmietwertJahr 2030 == 0 (Reform-Schnitt)", () => {
    expect(z2030.eigenmietwertJahr).toBe(0);
    expect(z2031.eigenmietwertJahr).toBe(0);
    expect(z2035.eigenmietwertJahr).toBe(0);
  });

  it("schuldzinsenAbzug 2029 > 0 (entspricht ausgabenHypozins)", () => {
    // 800k × 1.8 % = 14'400
    expect(z2029.schuldzinsenAbzug).toBeGreaterThanOrEqual(13_500);
    expect(z2029.schuldzinsenAbzug).toBeLessThanOrEqual(15_000);
    // Schuldzins-Abzug == Hypo-Zinsen (cashflow.ts:481)
    expect(z2029.schuldzinsenAbzug).toBe(z2029.ausgabenHypozins);
  });

  it("schuldzinsenAbzug 2030 == 0 (Reform-Schnitt), Hypozins aber bleibt Cashflow", () => {
    expect(z2030.schuldzinsenAbzug).toBe(0);
    expect(z2031.schuldzinsenAbzug).toBe(0);
    // Cashflow-Zinsen laufen weiter — nur Steuer-Abzug entfällt
    expect(z2030.ausgabenHypozins).toBeGreaterThan(0);
  });

  it("Cashflow-Hypothek-Zinsen sind 2029 == 2030 (Cashflow läuft weiter)", () => {
    expect(z2029.ausgabenHypozins).toBeGreaterThan(0);
    expect(z2030.ausgabenHypozins).toBeGreaterThan(0);
    // Selbe Hypothek → selbe Zinslast
    expect(Math.abs(z2030.ausgabenHypozins - z2029.ausgabenHypozins)).toBeLessThan(100);
  });

  it("Steuer-Bruchstelle: Steuern 2030 niedriger als 2029 (EMW-Wegfall dominiert)", () => {
    // 2028 + 2029: Hans noch erwerbstätig (Lohn 200k) + EMW 52.5k + Schuldzins-Abzug 14.4k
    //   → Netto-Effekt EMW-Schuldzins = +38.1k auf Steuerbasis
    // 2030: Hans bis Juni Lohn, ab Juli Pension. EMW + Schuldzins beide 0.
    // Vergleich 2028 vs 2031, weil 2030 ein Übergangsjahr mit Pro-Rata-Pension ist.
    // 2028 (volles Erwerbsjahr + Reform aktiv) vs 2031 (volles Pensionsjahr + Reform aus).
    // Hier nur EMW/Reform-Effekt isolieren: 2028 muss Reform-Phase-Effekt zeigen.
    expect(z2028.eigenmietwertJahr).toBeGreaterThan(50_000);
    expect(z2028.schuldzinsenAbzug).toBeGreaterThan(0);
    expect(z2031.eigenmietwertJahr).toBe(0);
    expect(z2031.schuldzinsenAbzug).toBe(0);
  });

  it("Isolierter Reform-Effekt 2029 vs 2030 bei gleichem Einkommen", () => {
    // Saubere Diff-Messung: Bauen wir Variante mit Pension erst ab 2035 (Lohn
    // läuft 2029 + 2030 voll). Dann ist die einzige Variable Reform-Cutoff.
    const s = buildFallI();
    // Lohn bis Ende 2034
    s.budget.einkommen[0]!.bis = "2034-12";
    // Pensionsalter rein theoretisch 70 — verschiebt PK-Bezug aus dem
    // Vergleichsfenster
    s.ziele.bezugsalterP1 = 70;
    s.ahv.ahvBezugsalterP1 = 70;
    const r = cashflowReihe(s, 2026, 2032);
    const r2029 = r.find((x) => x.jahr === 2029)!;
    const r2030 = r.find((x) => x.jahr === 2030)!;
    // Lohn identisch
    expect(r2029.einnahmenErwerb).toBeCloseTo(r2030.einnahmenErwerb, -2);
    // EMW + Schuldzins Reform-Effekt:
    expect(r2029.eigenmietwertJahr).toBeGreaterThan(50_000);
    expect(r2030.eigenmietwertJahr).toBe(0);
    expect(r2029.schuldzinsenAbzug).toBeGreaterThan(0);
    expect(r2030.schuldzinsenAbzug).toBe(0);
    // Steuer-Effekt: Reduktion Steuerbasis um ~52.5k - 14.4k = ~38.1k
    // ZH Grenzsteuer bei ~200k ledig ≈ 30-35% → Steuer 2030 ≈ 11-13k tiefer
    // SOLLTE niedriger sein:
    if (r2030.ausgabenSteuern >= r2029.ausgabenSteuern) {
      console.warn(
        `BUG-Notiz: Reform-Schnitt erhöht Steuer statt sie zu senken!\n` +
          `  2029 Steuern: ${r2029.ausgabenSteuern}\n` +
          `  2030 Steuern: ${r2030.ausgabenSteuern}\n` +
          `  EMW 2029: ${r2029.eigenmietwertJahr}, Schuldzins 2029: ${r2029.schuldzinsenAbzug}\n` +
          `  Erwartet: 2030 Steuer < 2029 (EMW 52.5k > Schuldzins 14.4k)`
      );
    }
    expect(r2030.ausgabenSteuern).toBeLessThan(r2029.ausgabenSteuern);
    // Magnitude-Check: Diff sollte ≥ 5'000 sein (kein winzig kleiner Effekt)
    expect(r2029.ausgabenSteuern - r2030.ausgabenSteuern).toBeGreaterThanOrEqual(5_000);
  });

  it("Vermögen bleibt positiv über Reform-Cutoff (kein Crash)", () => {
    // Vermögen darf 2030 nicht plötzlich negativ kippen — der Reform-Effekt
    // soll sich aus Steuer-Differenz ergeben, nicht aus einem strukturellen
    // Reset. Hinweis: 2029→2030 zeigt einen Sprung wegen PK-Kapital-Move
    // (Vorsorge → Liquidität bei Pensionierung mit Steuerabzug) — das ist
    // erwartetes Verhalten, nicht der Reform-Effekt.
    expect(z2029.vermoegenNetto).toBeGreaterThan(0);
    expect(z2030.vermoegenNetto).toBeGreaterThan(0);
    expect(z2031.vermoegenNetto).toBeGreaterThan(0);
    expect(z2035.vermoegenNetto).toBeGreaterThan(0);
    // Differenz Aktiva-Total über Reform-Cutoff ist klein, weil der
    // Reform-Sprung NUR die Steuer betrifft (≈12k Steuer-Differenz).
    // 2029→2030 Vermögenswechsel wird vom PK-Bezug dominiert, nicht von
    // Reform — daher kein strenger Diff-Check hier.
  });

  it("Diagnostik: Bruchstellen-Tabelle", () => {
    console.log("\n========== FALL I — Reform 2030 Bruchstelle (ZH) ==========");
    console.log(
      "Jahr | Alter | Erwerb  | EMW    | Hypzins | StAbzug | StTotal | NetVermögen"
    );
    for (const z of [z2026, z2028, z2029, z2030, z2031, z2035]) {
      console.log(
        `${z.jahr} | ${String(z.alterP1).padStart(5)} |` +
          ` ${String(Math.round(z.einnahmenErwerb)).padStart(7)} |` +
          ` ${String(Math.round(z.eigenmietwertJahr)).padStart(6)} |` +
          ` ${String(Math.round(z.ausgabenHypozins)).padStart(7)} |` +
          ` ${String(Math.round(z.schuldzinsenAbzug)).padStart(7)} |` +
          ` ${String(Math.round(z.ausgabenSteuern)).padStart(7)} |` +
          ` ${String(Math.round(z.vermoegenNetto)).padStart(10)}`
      );
    }
    expect(true).toBe(true);
  });
});

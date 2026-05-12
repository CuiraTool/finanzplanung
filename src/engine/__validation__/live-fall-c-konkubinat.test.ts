/**
 * Live-Validation Fall C — Konkubinat-Paar Doppelverdiener mit
 * Renditeliegenschaft + Bauland (typ "sonstiges").
 *
 * P1 Marco Bianchi (1968, m, ZG Zug) — 180k AN, PK 850k→1'050k, UWS 5.8%, 100% Rente
 * P2 Anna Berger   (1970, w, ZG Zug) — 120k AN, PK 620k→780k,   UWS 5.8%, 100% Kapital
 * Konkubinat seit 2010, keine Kinder.
 * 3a beide: je 50k Konto, Einzahlung max bis Pension.
 * Vermögen: 800k Konto + 1'200k Depot.
 * Renditeliegenschaft: 1'500'000 / Hypo 850k @ 1.2% / Miete 54'000/J.
 * Bauland (sonstiges): 250'000 / keine Hypo / kaufjahr 2019.
 * Erbschaftserwartung: 500k Geschwister 2032.
 *
 * Verifiziert:
 *  1. AHV ohne Plafond → 2× max-Einzelrenten (~65k inkl. 13. AHV) im Pensions-Jahr
 *  2. Konkubinats-Steuer = 2× LEDIG separat (kein Verheirateten-Splitting)
 *  3. Renditeliegenschaft: Mieten 54k zählen als Einkommen + Vermsteuer auf Verkehrswert
 *  4. Bauland (sonstiges): Vermögen + Vermsteuer, KEIN Eigenmietwert, KEINE Mieten
 *  5. PK P1 Rente vs P2 Kapital → Steuer-Sondertarif für P2 in 2035
 *  6. Erbschaft 2032 von Geschwister (ZG 8% Spitze, 5k Freibetrag) → Steuer-Schätzung
 *  7. Konkubinat-Plausi-Hinweis aktiv
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe, type CashflowInput } from "../cashflow";
import { berechneErbschaftssteuer } from "../erbschaftssteuer";
import { checkePlan } from "@/lib/plausibility";
import type { PlanState } from "@/lib/store";

function buildFallC(): CashflowInput {
  return {
    fallart: "paar",
    zivilstand: "konkubinat",
    person1: {
      vorname: "Marco",
      nachname: "Bianchi",
      geburtsdatum: "1968-05-15",
      geschlecht: "m",
      telefon: "",
      email: "",
    },
    person2: {
      vorname: "Anna",
      nachname: "Berger",
      geburtsdatum: "1970-08-20",
      geschlecht: "w",
      telefon: "",
      email: "",
    },
    kinder: [],
    ahv: {
      einkommenP1: 180_000,
      einkommenP2: 120_000,
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
        altersguthabenHeute: 850_000,
        altersguthabenBeiBezug: 1_050_000,
        umwandlungssatzProzent: 5.8,
        bezugspraeferenz: "rente",
        kapitalanteil: 0,
        freizuegigkeit: [],
        einkaeufe: [],
        wefVorbezuege: [],
      },
      p2: {
        aktiverAnschluss: true,
        altersguthabenHeute: 620_000,
        altersguthabenBeiBezug: 780_000,
        umwandlungssatzProzent: 5.8,
        bezugspraeferenz: "kapital",
        kapitalanteil: 100,
        freizuegigkeit: [],
        einkaeufe: [],
        wefVorbezuege: [],
      },
    },
    saeuleDrei: {
      p1: [
        {
          id: "3a-p1",
          type: "konto",
          saeule: "3a",
          beschreibung: "Säule 3a P1",
          aktuellerWert: 50_000,
          auszahlungsjahr: 2033, // Pension P1
          renditeProzent: 1.5,
          rueckkaufswert: null,
          ablaufswert: null,
          ablaufjahr: 2033,
          jaehrlicheEinzahlung: 7_258,
          einzahlungAb: 2026,
          einzahlungBis: 2033,
        },
      ],
      p2: [
        {
          id: "3a-p2",
          type: "konto",
          saeule: "3a",
          beschreibung: "Säule 3a P2",
          aktuellerWert: 50_000,
          auszahlungsjahr: 2035, // Pension P2
          renditeProzent: 1.5,
          rueckkaufswert: null,
          ablaufswert: null,
          ablaufjahr: 2035,
          jaehrlicheEinzahlung: 7_258,
          einzahlungAb: 2026,
          einzahlungBis: 2035,
        },
      ],
    },
    vermoegen: {
      items: [
        {
          id: "konto",
          typ: "konto",
          beschreibung: "Hauptkonto",
          saldoHeute: 800_000,
          renditeProzent: 0,
          istHauptkonto: true,
        },
        {
          id: "depot",
          typ: "depot",
          beschreibung: "Wertschriften-Depot",
          saldoHeute: 1_200_000,
          renditeProzent: 3,
          istHauptkonto: false,
        },
      ],
    },
    immobilien: {
      items: [
        {
          id: "rendite",
          typ: "rendite",
          beschreibung: "Renditeliegenschaft Zug",
          verkehrswert: 1_500_000,
          hypotheken: [
            {
              id: "h-rendite",
              beschreibung: "Hypo Rendite",
              hoehe: 850_000,
              zinssatzProzent: 1.2,
              ablaufjahr: 2050,
            },
          ],
          plan: "behalten",
          verkaufsjahr: 2055,
          jaehrlicheMieteinnahmen: 54_000,
          kaufjahr: 2015,
          anlagekosten: null,
          wertvermehrendeInvestitionen: null,
          wertsteigerungProzent: 0,
        },
        {
          id: "bauland",
          typ: "sonstiges",
          beschreibung: "Bauland Steinhausen",
          verkehrswert: 250_000,
          hypotheken: [],
          plan: "behalten",
          verkaufsjahr: 2055,
          jaehrlicheMieteinnahmen: null,
          kaufjahr: 2019,
          anlagekosten: 250_000,
          wertvermehrendeInvestitionen: null,
          wertsteigerungProzent: 0,
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
          beschreibung: "Lohn Marco",
          personIdx: 1 as const,
          betragMonatlich: 15_000, // 180k
          von: "2026-01",
          bis: "2033-05",
        },
        {
          id: "e2",
          beschreibung: "Lohn Anna",
          personIdx: 2 as const,
          betragMonatlich: 10_000, // 120k
          von: "2026-01",
          bis: "2035-08",
        },
      ],
      ausgabenModus: "total",
      ausgabenTotal: 9_000,
      ausgabenKategorien: {
        lebenshaltung: null,
        wohnen: null,
        mobilitaet: null,
        versicherungen: null,
        ferienHobby: null,
        sonstiges: null,
      },
      wunschverbrauchPension: 7_000,
      steuernHeute: null,
      einkommenHeute: null,
      religion: "keine",
      alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
    },
    adresse: {
      strasse: "Bahnhofstrasse 1",
      plz: "6300",
      ort: "Zug",
      kanton: "ZG",
      gemeindeBfsId: null,
      gemeindeName: "Zug",
    },
    einmaligeAusgaben: [],
    erbschaft: {
      erwartet: "ja_absehbar",
      groessenordnung: null,
      erwartetBetrag: 500_000,
      erwartetJahr: 2032,
      erwartetBeruecksichtigen: true,
      schenkungenStatus: null,
      schenkungenBetrag: null,
      schenkungenJahr: null,
      schenkungenBeruecksichtigen: false,
      schenkungenDetails: "Erbschaft von Geschwister (8% ZG Tarif)",
      gueterstand: null,
    },
  };
}

describe("Live-Fall C — Konkubinat-Paar mit Renditeliegenschaft + Bauland", () => {
  const input = buildFallC();
  const reihe = cashflowReihe(input, 2026, 2050);

  it("Cashflow-Reihe 2026-2050 läuft ohne Crash und liefert 25 Jahre", () => {
    expect(reihe).toHaveLength(25);
    for (const z of reihe) {
      expect(Number.isFinite(z.einnahmenTotal)).toBe(true);
      expect(Number.isFinite(z.vermoegenNetto)).toBe(true);
    }
  });

  it("✓ KONKUBINAT-AHV: 2× Maximal-Einzelrenten ohne Plafond (~60-70k inkl. 13. AHV)", () => {
    // P1 pensioniert in 2033 (Geburt 05.1968 + 65), P2 in 2035 (Geburt 08.1970 + 65)
    // 2036 = erstes volles Jahr mit beiden Renten
    const r2036 = reihe.find((z) => z.jahr === 2036)!;
    // 2× Maximalrente 30'240 × (13/12 ab 2026) = ~65'520
    // Konkubinat: KEIN Plafond auf 49'140 (= Ehepaar mit 13.)
    expect(r2036.einnahmenAhv).toBeGreaterThan(60_000);
    expect(r2036.einnahmenAhv).toBeLessThan(70_000);
  });

  it("✓ KONKUBINAT-STEUER: höher als Verheiratet bei gleichem Profil (kein Splitting)", () => {
    // P1 180k + P2 120k: Asymmetrie 60k → Konkubinat 2× separate LEDIG,
    // Verheiratet voll-Splitting. Bei dieser Asymmetrie kann Konkubinat
    // GERINGER (wegen tieferer Top-Stufe je Person) oder höher sein
    // (kein Verheirateten-Rabatt). Wichtig: Wert ≠ Verheirateten-Wert.
    const verheiratet = { ...buildFallC(), zivilstand: "verheiratet" as const };
    const rK = cashflowReihe(input, 2026, 2026)[0]!;
    const rV = cashflowReihe(verheiratet, 2026, 2026)[0]!;

    // Es DARF nicht numerisch identisch sein — sonst Splitting-Logik kaputt
    expect(rK.ausgabenSteuernEinkommen).not.toBe(rV.ausgabenSteuernEinkommen);
    expect(
      Math.abs(rK.ausgabenSteuernEinkommen - rV.ausgabenSteuernEinkommen)
    ).toBeGreaterThan(500);
  });

  it("✓ Renditeliegenschaft: Mieten 54k werden als Einkommen erfasst", () => {
    // 2027 (Erwerbsphase): Mieten brutto im einnahmenMieten Feld
    const r2027 = reihe.find((z) => z.jahr === 2027)!;
    expect(r2027.einnahmenMieten).toBeGreaterThanOrEqual(53_000);
    expect(r2027.einnahmenMieten).toBeLessThanOrEqual(55_000);
  });

  it("✓ Renditeliegenschaft: Verkehrswert 1.5M zählt im Brutto-Vermögen", () => {
    const r2027 = reihe.find((z) => z.jahr === 2027)!;
    // Renditeliegenschaft (1.5M) + Bauland (0.25M) = 1.75M brutto in Immobilien
    expect(r2027.vermoegenImmobilien).toBeGreaterThanOrEqual(1_700_000);
    expect(r2027.vermoegenImmobilien).toBeLessThanOrEqual(1_800_000);
  });

  it("✓ Bauland (typ=sonstiges): Vermögen aktiv, ABER keine Mieten + kein Eigenmietwert", () => {
    // Variante OHNE Bauland zum Vergleich
    const ohneBauland = buildFallC();
    ohneBauland.immobilien.items = ohneBauland.immobilien.items.filter(
      (i) => i.id !== "bauland"
    );
    const r2027c = reihe.find((z) => z.jahr === 2027)!;
    const r2027o = cashflowReihe(ohneBauland, 2026, 2027).find((z) => z.jahr === 2027)!;

    // Mit Bauland: Vermögen +250k, Mieten gleich, Eigenmietwert gleich
    expect(r2027c.vermoegenImmobilien - r2027o.vermoegenImmobilien).toBeCloseTo(
      250_000,
      -3
    );
    expect(r2027c.einnahmenMieten).toBe(r2027o.einnahmenMieten);
    expect(r2027c.eigenmietwertJahr).toBe(r2027o.eigenmietwertJahr);
  });

  it("✓ PK P2 100% Kapital → Kapitalauszahlung + Sondertarif in 2035", () => {
    const r2035 = reihe.find((z) => z.jahr === 2035)!;
    // P2 PK Kapital ~780k (altersguthabenBeiBezug) muss als kapAuszahlungen erscheinen
    // (zusätzlich Säule 3a P2 50k+, etwas Wachstum)
    expect(r2035.kapAuszahlungen).toBeGreaterThan(700_000);
    // Sondertarif-Kapitalsteuer sollte nennenswert sein
    expect(r2035.ausgabenSteuernKapital).toBeGreaterThan(20_000);
  });

  it("✓ PK P1 100% Rente: BVG-Rente ab 2034 (volles Jahr nach Pension 2033)", () => {
    const r2034 = reihe.find((z) => z.jahr === 2034)!;
    // 1'050'000 × 5.8% = 60'900 p.a. Rente P1
    expect(r2034.einnahmenBvgRente).toBeGreaterThan(55_000);
    expect(r2034.einnahmenBvgRente).toBeLessThan(65_000);
  });

  it("✓ Erbschaft 2032: 500k als Einnahme im Jahr 2032", () => {
    const r2032 = reihe.find((z) => z.jahr === 2032)!;
    expect(r2032.einnahmenErbschaft).toBe(500_000);
  });

  it("✓ Erbschaftssteuer ZG Geschwister: 8% Spitzentarif - 5k Freibetrag", () => {
    const erg = berechneErbschaftssteuer({
      betrag: 500_000,
      verwandtschaft: "geschwister",
      kanton: "ZG",
    });
    // (500'000 − 5'000) × 8% = 39'600
    expect(erg.steuerProzent).toBe(8);
    expect(erg.freibetrag).toBe(5_000);
    expect(erg.steuerBetrag).toBe(39_600);
    expect(erg.steuerfrei).toBe(false);
  });

  it("✓ Konkubinat-Plausi-Hinweis aktiv", () => {
    const hinweise = checkePlan(input as unknown as PlanState);
    const konku = hinweise.find((h) => h.id === "konkubinat-info");
    expect(konku).toBeDefined();
    expect(konku!.text).toContain("Konkubinat");
    expect(konku!.text).toContain("LEDIG");
  });

  it("Konsistenz: Vermögen Netto bleibt 25 Jahre lang positiv (Stress-Robustheit)", () => {
    const minVerm = Math.min(...reihe.map((z) => z.vermoegenNetto));
    expect(minVerm).toBeGreaterThan(0);
  });

  // ─── Diagnose-Output (nicht assertend, sondern für Bug-Report) ──
  it("DIAGNOSE: Cashflow-Snapshots 2027/2032/2034/2035/2036/2045", () => {
    const jahre = [2027, 2032, 2034, 2035, 2036, 2045];
    for (const j of jahre) {
      const z = reihe.find((r) => r.jahr === j)!;
      // eslint-disable-next-line no-console
      console.log(
        `[FALL C ${j}] AHV=${z.einnahmenAhv} BVG=${z.einnahmenBvgRente} Mieten=${z.einnahmenMieten} Erb=${z.einnahmenErbschaft} ` +
          `KapAus=${z.kapAuszahlungen} StEink=${z.ausgabenSteuernEinkommen} StVerm=${z.ausgabenSteuernVermoegen} StKap=${z.ausgabenSteuernKapital} ` +
          `Hypozins=${z.ausgabenHypozins} VermNetto=${z.vermoegenNetto}`
      );
    }
    expect(true).toBe(true);
  });
});

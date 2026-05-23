/**
 * Tests temporäre laufende Ausgaben (Studium, Schulden, Übergangs-Miete).
 *
 * Verhalten:
 *  - Wirkt Pro-Rata pro Monat aktiv (von/bis match)
 *  - Wird in ausgabenTotal des Cashflow-Jahrs addiert
 *  - Leer von = ab heute, leer bis = bis Ende
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe } from "./cashflow";
import type { CashflowInput } from "./cashflow";

function base(): CashflowInput {
  return {
    fallart: "einzel",
    zivilstand: "ledig",
    person1: {
      vorname: "Test",
      nachname: "P",
      geburtsdatum: "1980-01-01",
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
      einkommenP1: 100_000,
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
          beschreibung: "Konto",
          saldoHeute: 50_000,
          renditeProzent: 0,
          istHauptkonto: true,
        },
      ],
    },
    immobilien: { items: [] },
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
          beschreibung: "L",
          personIdx: 1,
          betragMonatlich: 8_333,
          von: "2026-01",
          bis: "2045-06",
        },
      ],
      ausgabenModus: "total",
      ausgabenTotal: 5_000,
      ausgabenKategorien: {
        lebenshaltung: null,
        wohnen: null,
        mobilitaet: null,
        versicherungen: null,
        ferienHobby: null,
        sonstiges: null,
      },
      wunschverbrauchPension: 4_000,
      steuernHeute: null,
      einkommenHeute: null,
      religion: "keine",
      alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
    },
    adresse: {
      strasse: "",
      plz: "",
      ort: "",
      kanton: "ZH",
      gemeindeBfsId: null,
      gemeindeName: "",
    },
    einmaligeAusgaben: [],
  };
}

describe("Laufende temporäre Ausgaben (Von/Bis)", () => {
  it("Studium-Kind 2'000/Mt × 12 Mt: addiert 24'000 in vollem Jahr", () => {
    const k = base();
    k.laufendeAusgaben = [
      {
        id: "x",
        beschreibung: "Studium Kind",
        betragMonatlich: 2_000,
        von: "2026-01",
        bis: "2030-12",
        kategorie: "studium",
      },
    ];
    const ohne = cashflowReihe(base(), 2027, 2027)[0]!;
    const mit = cashflowReihe(k, 2027, 2027)[0]!;
    expect(mit.ausgabenTotal - ohne.ausgabenTotal).toBe(24_000);
  });

  it("Pro-Rata: Mai bis Aug = 4 Monate × Betrag", () => {
    const k = base();
    k.laufendeAusgaben = [
      {
        id: "x",
        beschreibung: "Mietzuschuss",
        betragMonatlich: 1_500,
        von: "2027-05",
        bis: "2027-08",
        kategorie: "wohnen",
      },
    ];
    const ohne = cashflowReihe(base(), 2027, 2027)[0]!;
    const mit = cashflowReihe(k, 2027, 2027)[0]!;
    // 4 Monate × 1500 = 6000
    expect(mit.ausgabenTotal - ohne.ausgabenTotal).toBe(6_000);
  });

  it("Vor Periode-Start: 0", () => {
    const k = base();
    k.laufendeAusgaben = [
      {
        id: "x",
        beschreibung: "Schulden",
        betragMonatlich: 1_000,
        von: "2030-01",
        bis: "2035-12",
        kategorie: "schulden",
      },
    ];
    const ohne = cashflowReihe(base(), 2027, 2027)[0]!;
    const mit = cashflowReihe(k, 2027, 2027)[0]!;
    expect(mit.ausgabenTotal).toBe(ohne.ausgabenTotal);
  });

  it("Nach Periode-Ende: 0", () => {
    const k = base();
    k.laufendeAusgaben = [
      {
        id: "x",
        beschreibung: "Ausbildung",
        betragMonatlich: 800,
        von: "2026-01",
        bis: "2027-12",
        kategorie: "ausbildung",
      },
    ];
    const reihe = cashflowReihe(k, 2026, 2030);
    // 2026 + 2027 enthalten Ausgabe, 2028+ nicht
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    const z2030 = reihe.find((z) => z.jahr === 2030)!;
    expect(z2026.ausgabenTotal).toBeGreaterThan(z2030.ausgabenTotal);
  });

  it("Mehrere parallele Ausgaben summieren sich", () => {
    const k = base();
    k.laufendeAusgaben = [
      { id: "x1", beschreibung: "A", betragMonatlich: 500, von: "2027-01", bis: "2027-12" },
      { id: "x2", beschreibung: "B", betragMonatlich: 1_000, von: "2027-01", bis: "2027-12" },
    ];
    const ohne = cashflowReihe(base(), 2027, 2027)[0]!;
    const mit = cashflowReihe(k, 2027, 2027)[0]!;
    // (500 + 1000) × 12 = 18'000
    expect(mit.ausgabenTotal - ohne.ausgabenTotal).toBe(18_000);
  });

  it("Bis leer: läuft offen weiter", () => {
    const k = base();
    k.laufendeAusgaben = [
      {
        id: "x",
        beschreibung: "Unbefristet",
        betragMonatlich: 100,
        von: "2026-01",
        bis: "",
      },
    ];
    const z2040 = cashflowReihe(k, 2040, 2040)[0]!;
    const z2040_ohne = cashflowReihe(base(), 2040, 2040)[0]!;
    expect(z2040.ausgabenTotal - z2040_ohne.ausgabenTotal).toBe(1_200);
  });
});

/**
 * Inflations-Toggle (Budget.inflationProzent): opt-in, default 0 %.
 * Wirkt auf Haushaltsausgaben mit (1 + p/100)^(jahr - heute).
 * Heute ist 2026 (test-setup.ts faked Date auf 2026-06-15).
 */
describe("Inflations-Toggle für Haushaltsausgaben", () => {
  it("Default (inflationProzent=null) = identisch zu vor dem Fix (nominal)", () => {
    const ohne = cashflowReihe(base(), 2026, 2036);
    // 5'000/Mt × 12 = 60'000 nominal — bleibt für alle Jahre konstant
    // (laufende Ausgaben sind 0; nur Wunschverbrauch in Pension ab 65 wirkt anders)
    // Person geboren 1980 → pensioniert mit 65 = 2045, also alle Jahre vor 2045 = Vor-Pension-Budget.
    const z2026 = ohne.find((z) => z.jahr === 2026)!;
    const z2036 = ohne.find((z) => z.jahr === 2036)!;
    expect(z2026.ausgabenHaushalt).toBe(60_000);
    expect(z2036.ausgabenHaushalt).toBe(60_000);
  });

  it("inflationProzent=1.0: 2036 ≈ 2026 × 1.01^10 (±1 CHF Rundung)", () => {
    const k = base();
    k.budget = { ...k.budget, inflationProzent: 1.0 };
    const mit = cashflowReihe(k, 2026, 2036);
    const z2026 = mit.find((z) => z.jahr === 2026)!;
    const z2036 = mit.find((z) => z.jahr === 2036)!;
    // 2026 = heuteJahr → unverändert
    expect(z2026.ausgabenHaushalt).toBe(60_000);
    // 2036 = +10 Jahre → 60'000 × 1.01^10 ≈ 66'285.7
    const erwartet = Math.round(60_000 * Math.pow(1.01, 10));
    expect(Math.abs(z2036.ausgabenHaushalt - erwartet)).toBeLessThanOrEqual(1);
  });

  it("inflationProzent=0 oder negativ: kein Effekt (defensive)", () => {
    const k = base();
    k.budget = { ...k.budget, inflationProzent: 0 };
    const z = cashflowReihe(k, 2036, 2036)[0]!;
    expect(z.ausgabenHaushalt).toBe(60_000);
  });

  it("Inflation wirkt nicht rückwärts (jahr <= heuteJahr): kein Faktor", () => {
    const k = base();
    k.budget = { ...k.budget, inflationProzent: 2.0 };
    const z2026 = cashflowReihe(k, 2026, 2026)[0]!;
    expect(z2026.ausgabenHaushalt).toBe(60_000); // 2026 = heuteJahr → kein Hub
  });
});

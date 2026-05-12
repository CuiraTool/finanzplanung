/**
 * Tests für Pro-Rata-Auszahlung im Bezugsstart-Jahr.
 *
 * Hintergrund: vor dem Fix wurde im Pensionierungsjahr die volle Jahresrente
 * AHV + BVG-Rente angezeigt, obwohl die erste Auszahlung erst im Folgemonat
 * nach Erreichen des Bezugsalters erfolgt (BSV-Merkblatt 3.04 "Flexibler
 * Rentenbezug").
 *
 * Fix: anteilige Berechnung im Bezugsstart-Jahr.
 *   - AHV mit 13. AHV ab 2026 → Divisor 13
 *   - BVG-Rente ohne 13. → Divisor 12
 *   - Kapital-Auszahlungen bleiben unverändert (einmaliger Stichtags-Bezug)
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe } from "./cashflow";
import type { CashflowInput } from "./cashflow";

function makeSingleState(): CashflowInput {
  return {
    fallart: "einzel",
    zivilstand: "ledig" as const,
    person1: {
      vorname: "Test",
      nachname: "Person",
      geburtsdatum: "1967-07-29", // 65. Geb am 29.7.2032 → AHV ab Aug 2032
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
      einkommenP1: 100_000, // → Maximalrente
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
        altersguthabenHeute: 500_000,
        altersguthabenBeiBezug: 600_000,
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
        umwandlungssatzProzent: 6.0,
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
      verkaufsjahr: 2040,
    },
    ziele: { bezugsalterP1: 65, bezugsalterP2: 65 },
    budget: {
      einkommen: [],
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

describe("AHV Pro-Rata im Bezugsstart-Jahr (Folgemonat-Logik)", () => {
  it("AHV im Bezugsjahr 2032 (Juli-Geb): Faktor 6/13 mit 13. AHV", () => {
    // Geb. 29.7.1967, ord. 65 → reach Juli 2032, AHV ab Aug 2032.
    // Aug-Dez = 5 ord. Monate + 1 × 13. AHV im Dez = 6 Monatsraten / 13
    const state = makeSingleState();
    const reihe = cashflowReihe(state, 2031, 2033);

    const z2031 = reihe.find((z) => z.jahr === 2031);
    const z2032 = reihe.find((z) => z.jahr === 2032);
    const z2033 = reihe.find((z) => z.jahr === 2033);

    // Vor Bezug: 0
    expect(z2031?.einnahmenAhv).toBe(0);
    // Bezugsjahr: anteilig 6/13 (Aug-Dez + 13. AHV)
    const vollesJahr = z2033?.einnahmenAhv ?? 0;
    const erwarteterAnteil = Math.round((vollesJahr * 6) / 13);
    expect(z2032?.einnahmenAhv).toBeCloseTo(erwarteterAnteil, -2);
    // Folgejahr: voll
    expect(vollesJahr).toBeGreaterThan(30_000);
  });

  it("AHV bei Januar-Geburtstag: fast voller Bezugsjahr-Anteil", () => {
    const state = makeSingleState();
    state.person1.geburtsdatum = "1967-01-15"; // 65. Geb Jan 2032 → AHV ab Feb 2032
    const reihe = cashflowReihe(state, 2031, 2033);

    const z2032 = reihe.find((z) => z.jahr === 2032);
    const z2033 = reihe.find((z) => z.jahr === 2033);
    const vollesJahr = z2033?.einnahmenAhv ?? 0;
    // Feb-Dez = 11 ord. + 1 × 13. AHV = 12/13
    const erwartet = Math.round((vollesJahr * 12) / 13);
    expect(z2032?.einnahmenAhv).toBeCloseTo(erwartet, -2);
  });

  it("AHV bei Dezember-Geburtstag: Bezugsjahr-Anteil minimal (2/13)", () => {
    const state = makeSingleState();
    state.person1.geburtsdatum = "1967-12-01"; // 65. Geb Dez 2032 → AHV ab Jan 2033
    const reihe = cashflowReihe(state, 2032, 2034);

    const z2032 = reihe.find((z) => z.jahr === 2032);
    const z2033 = reihe.find((z) => z.jahr === 2033);
    const z2034 = reihe.find((z) => z.jahr === 2034);

    expect(z2032?.einnahmenAhv).toBe(0); // noch kein Bezug 2032
    // 2033 ist Bezugsjahr (Start Jan) → voller Anspruch im Bezugsjahr (12+1)/13
    const vollesJahr = z2034?.einnahmenAhv ?? 0;
    expect(z2033?.einnahmenAhv).toBeCloseTo(vollesJahr, -2);
  });

  it("Vorbezug 6 Monate (bezugsalter 64.5): AHV ab Feb 2032, Faktor 12/13", () => {
    // Geb. 29.7.1967 + 64 J 6 Mt → reach Jan 2032 → AHV ab Feb 2032
    // Feb-Dez = 11 ord. + 1 × 13. AHV = 12/13
    const state = makeSingleState();
    state.ahv.ahvBezugsalterP1 = 64.5;
    const reihe = cashflowReihe(state, 2031, 2033);

    const z2032 = reihe.find((z) => z.jahr === 2032);
    const z2033 = reihe.find((z) => z.jahr === 2033);
    const vollesJahr = z2033?.einnahmenAhv ?? 0;
    const erwartet = Math.round((vollesJahr * 12) / 13);
    expect(z2032?.einnahmenAhv).toBeCloseTo(erwartet, -2);
  });
});

describe("PK-Rente Pro-Rata im Bezugsstart-Jahr (kein 13. PK)", () => {
  it("BVG-Rente im Bezugsjahr 2032 (Juli-Geb): Faktor 5/12 ohne 13.", () => {
    // Geb. 29.7.1967, PK 65 → Folgemonat Aug 2032 → 5 Monate × 1/12
    const state = makeSingleState();
    const reihe = cashflowReihe(state, 2031, 2033);

    const z2031 = reihe.find((z) => z.jahr === 2031);
    const z2032 = reihe.find((z) => z.jahr === 2032);
    const z2033 = reihe.find((z) => z.jahr === 2033);

    expect(z2031?.einnahmenBvgRente).toBe(0);
    const vollesJahr = z2033?.einnahmenBvgRente ?? 0;
    const erwartet = Math.round((vollesJahr * 5) / 12);
    expect(z2032?.einnahmenBvgRente).toBeCloseTo(erwartet, -2);
    expect(vollesJahr).toBeGreaterThan(20_000);
  });

  it("BVG-Kapital-Auszahlung bleibt unverändert (einmaliger Bezug)", () => {
    const state = makeSingleState();
    state.bvg.p1.bezugspraeferenz = "kapital";
    state.bvg.p1.kapitalanteil = 100;
    const reihe = cashflowReihe(state, 2031, 2033);

    const z2032 = reihe.find((z) => z.jahr === 2032);
    // Kapital fliesst im Bezugsjahr voll (kein Pro-Rata)
    expect(z2032?.kapAuszahlungen).toBeGreaterThanOrEqual(500_000);
    // Rente bleibt 0 bei Kapital-Präferenz
    expect(z2032?.einnahmenBvgRente).toBe(0);
  });
});

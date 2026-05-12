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

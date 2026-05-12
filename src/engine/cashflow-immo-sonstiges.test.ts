/**
 * Tests Immobilien-Typ "sonstiges" (Bauland, Ausland-Immobilie).
 *
 * Verhalten:
 *  - Verkehrswert + Hypothek wirken im Vermögen (Aktiva/Schulden)
 *  - KEIN Eigenmietwert (nur bei "selbstbewohnt")
 *  - KEIN Mieteinnahmen (nur bei "rendite")
 *  - Tragbarkeits-Check NICHT angewandt (nur Eigenheim)
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe } from "./cashflow";
import type { CashflowInput } from "./cashflow";

function makeBase(): CashflowInput {
  return {
    fallart: "einzel",
    zivilstand: "ledig",
    person1: {
      vorname: "Test",
      nachname: "Person",
      geburtsdatum: "1965-01-01",
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
    immobilien: {
      items: [
        {
          id: "bauland",
          beschreibung: "Bauland Näf",
          typ: "sonstiges",
          verkehrswert: 100_000,
          hypotheken: [],
          plan: "behalten",
          verkaufsjahr: 2050,
          jaehrlicheMieteinnahmen: null,
          kaufjahr: 2020,
          anlagekosten: 100_000,
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
          beschreibung: "Lohn",
          personIdx: 1 as const,
          betragMonatlich: 8333,
          von: "2026-01",
          bis: "2030-01",
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

describe("Immobilien-Typ 'sonstiges' (Bauland / Ausland)", () => {
  it("Verkehrswert zählt im Vermögen mit (Aktiva)", () => {
    const r = cashflowReihe(makeBase(), 2026, 2026)[0]!;
    expect(r.vermoegenImmobilien).toBe(100_000);
  });

  it("Keine Mieteinnahmen (nur 'rendite' liefert Mieten)", () => {
    const k = makeBase();
    k.immobilien.items[0]!.jaehrlicheMieteinnahmen = 12_000;
    const r = cashflowReihe(k, 2026, 2026)[0]!;
    // einnahmenTotal sollte keine Mieten enthalten (sonstiges ≠ rendite)
    // Lohn 100k + 0 Mieten
    expect(r.einnahmenTotal).toBeLessThan(105_000);
    expect(r.einnahmenTotal).toBeGreaterThan(95_000);
  });

  it("Kein Eigenmietwert (nur 'selbstbewohnt' triggert Eigenmietwert)", () => {
    const sonstiges = makeBase();
    const selbstbewohnt = makeBase();
    selbstbewohnt.immobilien.items[0]!.typ = "selbstbewohnt";

    const rS = cashflowReihe(sonstiges, 2026, 2026)[0]!;
    const rE = cashflowReihe(selbstbewohnt, 2026, 2026)[0]!;

    // Selbstbewohnt: Eigenmietwert erhöht steuerbares Einkommen → höhere Steuer
    expect(rE.ausgabenSteuernEinkommen).toBeGreaterThan(rS.ausgabenSteuernEinkommen);
  });

  it("Hypothek-Schulden zählen mit (Passiva)", () => {
    const k = makeBase();
    k.immobilien.items[0]!.hypotheken = [
      {
        id: "h1",
        beschreibung: "Bauland-Hypothek",
        hoehe: 40_000,
        zinssatzProzent: 1.5,
        ablaufjahr: 2045,
      },
    ];
    const r = cashflowReihe(k, 2026, 2026)[0]!;
    expect(r.vermoegenSchulden).toBe(40_000);
    expect(r.vermoegenNetto).toBe(
      r.vermoegenLiquiditaet +
        r.vermoegenWertschriften +
        r.vermoegenVorsorge +
        r.vermoegenImmobilien +
        r.vermoegenFirma -
        r.vermoegenSchulden
    );
  });

  it("Vor Kaufjahr: Bauland zählt nicht (kaufjahr=2030, Test 2025)", () => {
    const k = makeBase();
    k.immobilien.items[0]!.kaufjahr = 2030;
    const r = cashflowReihe(k, 2025, 2025)[0]!;
    expect(r.vermoegenImmobilien).toBe(0);
  });

  it("Ab Kaufjahr: Bauland aktiviert", () => {
    const k = makeBase();
    k.immobilien.items[0]!.kaufjahr = 2030;
    const r = cashflowReihe(k, 2030, 2030)[0]!;
    expect(r.vermoegenImmobilien).toBe(100_000);
  });
});

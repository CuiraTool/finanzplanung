/**
 * Differenz-Tests: prüfen dass Schema-Felder die Engine-Output tatsächlich
 * verändern. Verhindert "totes Feld"-Anti-Pattern (z.B. zivilstand wurde
 * vom Schema definiert, aber nie im Engine ausgewertet).
 *
 * Methode: Profil A vs. Profil B (gleiche Inputs ausser einem Feld), beide
 * Cashflow-Reihen vergleichen. Differenz muss > 0 sein.
 *
 * NICHT: prüft ob Wert "richtig" ist — nur dass Engine reagiert.
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe } from "../cashflow";
import type { CashflowInput } from "../cashflow";

function base(): CashflowInput {
  return {
    fallart: "paar",
    zivilstand: "verheiratet",
    person1: {
      vorname: "A",
      nachname: "Test",
      geburtsdatum: "1965-07-01",
      geschlecht: "m",
      telefon: "",
      email: "",
    },
    person2: {
      vorname: "B",
      nachname: "Test",
      geburtsdatum: "1965-07-01",
      geschlecht: "w",
      telefon: "",
      email: "",
    },
    kinder: [],
    ahv: {
      einkommenP1: 90_000,
      einkommenP2: 90_000,
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
        altersguthabenHeute: 300_000,
        altersguthabenBeiBezug: 400_000,
        umwandlungssatzProzent: 6,
        bezugspraeferenz: "rente",
        kapitalanteil: 0,
        freizuegigkeit: [],
        einkaeufe: [],
        wefVorbezuege: [],
      },
      p2: {
        aktiverAnschluss: true,
        altersguthabenHeute: 300_000,
        altersguthabenBeiBezug: 400_000,
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
          saldoHeute: 200_000,
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
          beschreibung: "L1",
          personIdx: 1,
          betragMonatlich: 7_500,
          von: "2026-01",
          bis: "2030-06",
        },
        {
          id: "e2",
          beschreibung: "L2",
          personIdx: 2,
          betragMonatlich: 7_500,
          von: "2026-01",
          bis: "2030-06",
        },
      ],
      ausgabenModus: "total",
      ausgabenTotal: 6_000,
      ausgabenKategorien: {
        lebenshaltung: null,
        wohnen: null,
        mobilitaet: null,
        versicherungen: null,
        ferienHobby: null,
        sonstiges: null,
      },
      wunschverbrauchPension: 5_000,
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

/** Vergleicht 2 Cashflow-Reihen — gibt true wenn sie sich messbar unterscheiden. */
function unterscheidetSich(
  a: ReturnType<typeof cashflowReihe>,
  b: ReturnType<typeof cashflowReihe>,
  toleranz = 100
): boolean {
  if (a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) {
    const za = a[i]!;
    const zb = b[i]!;
    if (Math.abs(za.vermoegenNetto - zb.vermoegenNetto) > toleranz) return true;
    if (Math.abs(za.ausgabenSteuern - zb.ausgabenSteuern) > toleranz) return true;
    if (Math.abs(za.einnahmenAhv - zb.einnahmenAhv) > toleranz) return true;
    if (Math.abs(za.einnahmenBvgRente - zb.einnahmenBvgRente) > toleranz) return true;
  }
  return false;
}

describe("Schema-Field-Engagement: jedes Feld muss Engine-Output beeinflussen", () => {
  it("zivilstand verheiratet vs. konkubinat", () => {
    const a = cashflowReihe(base(), 2026, 2040);
    const b = cashflowReihe({ ...base(), zivilstand: "konkubinat" }, 2026, 2040);
    expect(unterscheidetSich(a, b)).toBe(true);
  });

  it("kanton ZH vs. ZG", () => {
    const a = cashflowReihe(base(), 2026, 2040);
    const s = base();
    s.adresse = { ...s.adresse, kanton: "ZG" };
    const b = cashflowReihe(s, 2026, 2040);
    expect(unterscheidetSich(a, b)).toBe(true);
  });

  it("religion keine vs. katholisch (Kirchensteuer)", () => {
    const a = cashflowReihe(base(), 2026, 2040);
    const s = base();
    s.budget = { ...s.budget, religion: "katholisch" };
    const b = cashflowReihe(s, 2026, 2040);
    expect(unterscheidetSich(a, b)).toBe(true);
  });

  it("einkommen 50k vs. 150k", () => {
    const s1 = base();
    s1.ahv.einkommenP1 = 50_000;
    s1.budget.einkommen[0]!.betragMonatlich = 4_167;
    const s2 = base();
    s2.ahv.einkommenP1 = 150_000;
    s2.budget.einkommen[0]!.betragMonatlich = 12_500;
    expect(
      unterscheidetSich(cashflowReihe(s1, 2026, 2040), cashflowReihe(s2, 2026, 2040))
    ).toBe(true);
  });

  it("bezugsalter 63 vs. 65", () => {
    const s1 = base();
    s1.ahv.ahvBezugsalterP1 = 63;
    const s2 = base();
    s2.ahv.ahvBezugsalterP1 = 65;
    expect(
      unterscheidetSich(cashflowReihe(s1, 2026, 2035), cashflowReihe(s2, 2026, 2035))
    ).toBe(true);
  });

  it("bezugspraeferenz rente vs. kapital", () => {
    const s1 = base();
    s1.bvg.p1.bezugspraeferenz = "rente";
    const s2 = base();
    s2.bvg.p1.bezugspraeferenz = "kapital";
    s2.bvg.p1.kapitalanteil = 100;
    expect(
      unterscheidetSich(cashflowReihe(s1, 2026, 2035), cashflowReihe(s2, 2026, 2035))
    ).toBe(true);
  });

  it("immobilie selbstbewohnt vs. rendite", () => {
    const s1 = base();
    s1.immobilien.items = [
      {
        id: "i1",
        typ: "selbstbewohnt",
        beschreibung: "Eigenheim",
        verkehrswert: 1_000_000,
        hypotheken: [],
        plan: "behalten",
        verkaufsjahr: 2060,
        jaehrlicheMieteinnahmen: null,
        kaufjahr: 2020,
        anlagekosten: null,
        wertvermehrendeInvestitionen: null,
        wertsteigerungProzent: 0,
      },
    ];
    const s2 = base();
    s2.immobilien.items = [
      {
        ...s1.immobilien.items[0]!,
        typ: "rendite",
        jaehrlicheMieteinnahmen: 36_000,
      },
    ];
    expect(
      unterscheidetSich(cashflowReihe(s1, 2026, 2030), cashflowReihe(s2, 2026, 2030))
    ).toBe(true);
  });

  it("alimente zahlt vs. erhaelt", () => {
    const s1 = base();
    s1.budget.alimente = { aktiv: true, betragJahr: 24_000, richtung: "zahlt" };
    const s2 = base();
    s2.budget.alimente = { aktiv: true, betragJahr: 24_000, richtung: "erhaelt" };
    expect(
      unterscheidetSich(cashflowReihe(s1, 2026, 2030), cashflowReihe(s2, 2026, 2030))
    ).toBe(true);
  });

  it("inflation einkommen-anpassung Pension vor/nach Reform 2030", () => {
    const a = cashflowReihe(base(), 2029, 2031);
    // Reform 2030: Eigenmietwert + Schuldzinsabzug entfallen
    const s = base();
    s.immobilien.items = [
      {
        id: "im",
        typ: "selbstbewohnt",
        beschreibung: "Eigenheim",
        verkehrswert: 1_500_000,
        hypotheken: [{ id: "h", beschreibung: "", hoehe: 500_000, zinssatzProzent: 1.5, ablaufjahr: 2040 }],
        plan: "behalten",
        verkaufsjahr: 2060,
        jaehrlicheMieteinnahmen: null,
        kaufjahr: 2020,
        anlagekosten: null,
        wertvermehrendeInvestitionen: null,
        wertsteigerungProzent: 0,
      },
    ];
    const b = cashflowReihe(s, 2029, 2031);
    // Vor 2030: Eigenheim+Hypo wirken auf Steuer; nach 2030 anders
    expect(b[0]!.ausgabenSteuern).not.toBe(b[1]!.ausgabenSteuern);
    expect(a[0]!.ausgabenSteuern).not.toBe(b[0]!.ausgabenSteuern);
  });

  it("fehljahre 0 vs. 10 (AHV-Kürzung) — Einzelperson", () => {
    // Bei Paar mit Plafond schluckt Plafond Fehljahre-Effekt — daher Einzel
    const s1 = base();
    s1.fallart = "einzel";
    s1.zivilstand = "ledig";
    s1.ahv.hatFehljahreP1 = false;
    const s2 = base();
    s2.fallart = "einzel";
    s2.zivilstand = "ledig";
    s2.ahv.hatFehljahreP1 = true;
    s2.ahv.fehljahreAnzahlP1 = 10;
    expect(
      unterscheidetSich(cashflowReihe(s1, 2030, 2035), cashflowReihe(s2, 2030, 2035))
    ).toBe(true);
  });

  it("ahvRenteJahrEffektivP1 override greift — Einzelperson", () => {
    // Override wirkt im p1Einzel-Pfad; bei Paar mit Splitting nutzt Engine
    // ahvCouplePension (Splitting-basiert). Override hier nur Einzel-Pfad.
    const s1 = base();
    s1.fallart = "einzel";
    s1.zivilstand = "ledig";
    const s2 = base();
    s2.fallart = "einzel";
    s2.zivilstand = "ledig";
    s2.ahv.ahvRenteJahrEffektivP1 = 18_000;
    expect(
      unterscheidetSich(cashflowReihe(s1, 2030, 2035), cashflowReihe(s2, 2030, 2035))
    ).toBe(true);
  });

  it("kinder anzahl 0 vs. 3 (Kinder-Abzug)", () => {
    const s1 = base();
    s1.kinder = [];
    const s2 = base();
    s2.kinder = [
      { id: "k1", vorname: "K1", geburtsdatum: "2015-01-01", zuordnung: "gemeinsam", ausbildungBisJahr: null },
      { id: "k2", vorname: "K2", geburtsdatum: "2018-01-01", zuordnung: "gemeinsam", ausbildungBisJahr: null },
      { id: "k3", vorname: "K3", geburtsdatum: "2020-01-01", zuordnung: "gemeinsam", ausbildungBisJahr: null },
    ];
    expect(
      unterscheidetSich(cashflowReihe(s1, 2026, 2028), cashflowReihe(s2, 2026, 2028))
    ).toBe(true);
  });

  it("steuerwert override greift (V10 Immo)", () => {
    const s1 = base();
    s1.immobilien.items = [
      {
        id: "i1",
        typ: "selbstbewohnt",
        beschreibung: "Eigenheim",
        verkehrswert: 1_000_000,
        hypotheken: [],
        plan: "behalten",
        verkaufsjahr: 2060,
        jaehrlicheMieteinnahmen: null,
        kaufjahr: 2020,
        anlagekosten: null,
        wertvermehrendeInvestitionen: null,
        wertsteigerungProzent: 0,
      },
    ];
    const s2 = base();
    s2.immobilien.items = [
      { ...s1.immobilien.items[0]!, steuerwert: 500_000 }, // statt 70% Default
    ];
    expect(
      unterscheidetSich(cashflowReihe(s1, 2026, 2028), cashflowReihe(s2, 2026, 2028))
    ).toBe(true);
  });

  it("BVG Reglement-Witwen-Override greift in HinterlassenenCard (indirekt via state)", async () => {
    // BVG-Reglement-Felder wirken im hinterlassenen.ts, nicht im cashflow.
    // Hier nur Sanity: Engine akzeptiert das Feld ohne Crash.
    const { berechneHinterlassenen } = await import("../hinterlassenen");
    const standard = berechneHinterlassenen({
      ahvAltersrenteVerstorbener: 30_000,
      bvgAltersrenteVerstorbener: 20_000,
      alterUeberlebender: 50,
      ehejahre: 10,
      halbwaisen: 0,
    });
    const reglement = berechneHinterlassenen({
      ahvAltersrenteVerstorbener: 30_000,
      bvgAltersrenteVerstorbener: 20_000,
      alterUeberlebender: 50,
      ehejahre: 10,
      halbwaisen: 0,
      bvgWitwenrenteProzent: 70,
    });
    expect(reglement.bvgWitwenrente).not.toBe(standard.bvgWitwenrente);
  });
});

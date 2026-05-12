/**
 * Tests für die A1-Korrektur: WEF-Vorbezug muss die Hypothek der
 * verknüpften Immobilie tilgen, nicht "im Nichts" verschwinden.
 *
 * Vor dem Fix: PK-Saldo sank um den WEF-Betrag, aber Hypothek/Verkehrswert
 * blieben unverändert → Nettovermögen fiel fälschlich um den WEF-Betrag.
 *
 * Nach dem Fix: Hypothek wird primär getilgt; WEF-Überschuss erhöht den
 * Verkehrswert. Nettovermögen bleibt über den WEF-Bezug konstant.
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe } from "./cashflow";
import type { CashflowInput } from "./cashflow";

function makeStateMitImmobilieUndPk(): CashflowInput {
  return {
    fallart: "einzel",
    zivilstand: "ledig" as const,
    person1: {
      vorname: "Lisa",
      nachname: "Beispiel",
      geburtsdatum: "1970-01-01", // 56 in 2026
      geschlecht: "w",
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
      ahvBezugsalterP2: 65, ahvRenteJahrEffektivP1: null, ahvRenteJahrEffektivP2: null,
    },
    bvg: {
      p1: {
        aktiverAnschluss: true,
        altersguthabenHeute: 400_000,
        altersguthabenBeiBezug: 600_000,
        umwandlungssatzProzent: 6.8,
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
        umwandlungssatzProzent: 6.8,
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
    immobilien: {
      items: [
        {
          id: "im1",
          beschreibung: "Eigenheim",
          typ: "selbstbewohnt",
          verkehrswert: 800_000,
          hypotheken: [
            {
              id: "h1",
              beschreibung: "1. Hypothek",
              hoehe: 500_000,
              zinssatzProzent: 1.5,
              ablaufjahr: 2030,
            },
          ],
          plan: "behalten",
          verkaufsjahr: 2050,
          jaehrlicheMieteinnahmen: null,
          wertsteigerungProzent: 0,
          kaufjahr: null,
          anlagekosten: null,
        },
      ],
    },
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

describe("WEF-Vorbezug tilgt Hypothek (A1)", () => {
  it("WEF reduziert Hypothek-Stand und damit Schulden-Bucket", () => {
    const ohneWef = makeStateMitImmobilieUndPk();
    const reiheOhne = cashflowReihe(ohneWef, 2027, 2027);
    const schuldenOhne = reiheOhne[0]?.vermoegenSchulden ?? 0;

    const mitWef = makeStateMitImmobilieUndPk();
    mitWef.bvg.p1.wefVorbezuege = [
      {
        id: "w1",
        jahr: 2027,
        betrag: 100_000,
        beschreibung: "Tilgung",
        immoId: "im1",
      },
    ];
    const reiheMit = cashflowReihe(mitWef, 2027, 2027);
    const schuldenMit = reiheMit[0]?.vermoegenSchulden ?? 0;

    expect(schuldenMit).toBe(schuldenOhne - 100_000);
  });

  it("Nettovermögen bleibt über den WEF-Bezug konstant (PK runter, Hypo runter)", () => {
    const ohneWef = makeStateMitImmobilieUndPk();
    const reiheOhne = cashflowReihe(ohneWef, 2027, 2027);
    const nettoOhne = reiheOhne[0]?.vermoegenNetto ?? 0;

    const mitWef = makeStateMitImmobilieUndPk();
    mitWef.bvg.p1.wefVorbezuege = [
      {
        id: "w1",
        jahr: 2027,
        betrag: 100_000,
        beschreibung: "Tilgung",
        immoId: "im1",
      },
    ];
    const reiheMit = cashflowReihe(mitWef, 2027, 2027);
    const nettoMit = reiheMit[0]?.vermoegenNetto ?? 0;

    // Toleranz für Steuer-Sondertarif auf den Kapitalbezug (kleiner Effekt
    // im Bezugsjahr — aber der ist gewollt, weil WEF besteuert wird).
    expect(Math.abs(nettoMit - nettoOhne)).toBeLessThan(20_000);
  });

  it("WEF ohne immoId: fällt auf erste selbstbewohnte Immobilie zurück", () => {
    const state = makeStateMitImmobilieUndPk();
    state.bvg.p1.wefVorbezuege = [
      {
        id: "w1",
        jahr: 2027,
        betrag: 100_000,
        beschreibung: "Tilgung",
        immoId: null,
      },
    ];
    const reihe = cashflowReihe(state, 2027, 2027);
    // Mit Hypothek 500k und WEF 100k → Schulden = 400k
    expect(reihe[0]?.vermoegenSchulden).toBe(400_000);
  });

  it("WEF > Hypothek: Überschuss erhöht Verkehrswert (Eigenkapital-Anteil)", () => {
    const state = makeStateMitImmobilieUndPk();
    // Hypothek auf 50k reduzieren, WEF 200k → 50k tilgen, 150k als Eigenkapital
    state.immobilien.items[0]!.hypotheken[0]!.hoehe = 50_000;
    state.bvg.p1.wefVorbezuege = [
      {
        id: "w1",
        jahr: 2027,
        betrag: 200_000,
        beschreibung: "Kauf",
        immoId: "im1",
      },
    ];
    const reihe = cashflowReihe(state, 2027, 2027);
    const z = reihe[0];
    expect(z?.vermoegenSchulden).toBe(0);
    // Verkehrswert 800k + 150k WEF-Überschuss = 950k
    expect(z?.vermoegenImmobilien).toBe(950_000);
  });
});

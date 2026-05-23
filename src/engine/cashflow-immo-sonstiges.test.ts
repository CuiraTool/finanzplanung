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

describe("Immobilien-Verkauf — keine Kapitalleistungs-Sondertarif-Steuer", () => {
  /**
   * Regression: Bis zur Korrektur in cashflow.ts wurde der Immobilien-
   * Netto-Verkaufserlös in die Bemessungsgrundlage der Kapitalleistungs-
   * Sondertarif-Steuer (`kapAuszahlungenFuerSteuer`) addiert — neben der
   * korrekt verrechneten Grundstückgewinnsteuer. Resultat: Phantom-Steuer
   * bei jedem Liegenschaftsverkauf (Beispiel Stanojevic 2030: CHF 28'046).
   * Steuerlich falsch — Immobilien-Gewinne unterliegen ausschliesslich
   * der GGSt, der Kapitalleistungs-Sondertarif gilt nur für Vorsorge-
   * Kapital (PK/3a/FZ).
   */
  it("Verkauf eines selbstbewohnten Eigenheims löst keine Kapitalleistungssteuer aus", () => {
    const k = makeBase();
    k.immobilien.items[0] = {
      id: "eigenheim",
      beschreibung: "Eigenheim",
      typ: "selbstbewohnt",
      verkehrswert: 800_000,
      hypotheken: [
        {
          id: "h1",
          beschreibung: "Hypothek",
          hoehe: 200_000,
          zinssatzProzent: 1.5,
          ablaufjahr: 2050,
        },
      ],
      plan: "verkaufen",
      verkaufsjahr: 2030,
      jaehrlicheMieteinnahmen: null,
      kaufjahr: 2010,
      anlagekosten: 800_000, // = Verkehrswert → GGSt 0 (kein Gewinn)
      wertvermehrendeInvestitionen: null,
      wertsteigerungProzent: 0,
    };
    // Keine konkurrierenden Vorsorge-Auszahlungen
    k.bvg.p1.aktiverAnschluss = false;
    k.saeuleDrei = { p1: [], p2: [] };

    const r = cashflowReihe(k, 2030, 2030)[0]!;
    // Netto-Erlös landet auf dem Hauptkonto (Brutto 800k − Hypothek 200k − GGSt 0)
    expect(r.kapAuszahlungen).toBe(600_000);
    // KEINE Kapitalleistungs-Sondertarif-Steuer — der Gewinn ist GGSt-Sache, separat.
    expect(r.ausgabenSteuernKapital).toBe(0);
  });

  it("Verkauf zusammen mit PK-Bezug: nur PK-Kapital triggert Sondertarif, Immo nicht", () => {
    const k = makeBase();
    // PK-Kapitalbezug 2030: 300k
    k.bvg.p1 = {
      aktiverAnschluss: true,
      altersguthabenHeute: 250_000,
      altersguthabenBeiBezug: 300_000,
      umwandlungssatzProzent: 6,
      bezugspraeferenz: "kapital",
      kapitalanteil: 100,
      freizuegigkeit: [],
      einkaeufe: [],
      wefVorbezuege: [],
    };
    k.ziele.bezugsalterP1 = 65; // Geb 1965-01-01 → Bezug 2030
    // Plus Verkauf Eigenheim 2030
    k.immobilien.items[0] = {
      id: "eigenheim",
      beschreibung: "Eigenheim",
      typ: "selbstbewohnt",
      verkehrswert: 800_000,
      hypotheken: [
        {
          id: "h1",
          beschreibung: "Hypothek",
          hoehe: 200_000,
          zinssatzProzent: 1.5,
          ablaufjahr: 2050,
        },
      ],
      plan: "verkaufen",
      verkaufsjahr: 2030,
      jaehrlicheMieteinnahmen: null,
      kaufjahr: 2010,
      anlagekosten: 800_000,
      wertvermehrendeInvestitionen: null,
      wertsteigerungProzent: 0,
    };
    k.saeuleDrei = { p1: [], p2: [] };

    const r = cashflowReihe(k, 2030, 2030)[0]!;
    // Beide Auszahlungen aufs Hauptkonto: PK 300k + Immo-Netto 600k
    expect(r.kapAuszahlungen).toBe(900_000);
    // Kapitalleistungs-Sondertarif greift NUR aufs PK-Kapital (300k) —
    // nicht auf den Immo-Erlös (600k). Wert ist > 0 (PK!) aber wesentlich
    // tiefer als bei einer 900k-Bemessung.
    expect(r.ausgabenSteuernKapital).toBeGreaterThan(0);
    // Sanity-Check: Steuer auf nur PK 300k muss tiefer sein als Steuer
    // auf 900k Basis (was vor dem Fix passiert wäre).
    const nurPk = { ...k };
    nurPk.immobilien = { items: [] };
    const rNurPk = cashflowReihe(nurPk, 2030, 2030)[0]!;
    // Die Sondertarif-Steuer muss in beiden Fällen IDENTISCH sein —
    // d.h. der Immo-Erlös wurde komplett aus der Basis ausgeklammert.
    expect(r.ausgabenSteuernKapital).toBe(rNurPk.ausgabenSteuernKapital);
  });
});

describe("Immobilien-Plan 'verschenken' (Erbvorbezug an Nachkommen)", () => {
  /**
   * Plan "verschenken" modelliert die Übergabe einer Liegenschaft an einen
   * Nachkommen vor dem Tod = Erbvorbezug. Effekte im Übergabejahr:
   *  - Verkehrswert UND Hypothek raus aus der Bilanz
   *  - KEIN Geldfluss aufs Hauptkonto
   *  - KEINE Grundstückgewinnsteuer (Steueraufschub Art. 14 StHG für Nachkommen)
   *  - KEIN Eigenmietwert, KEIN Schuldzinsabzug, KEINE Mieten ab Übergabejahr
   */
  function makeEigenheimVerschenkt(): CashflowInput {
    const k = makeBase();
    // 1 Hauptkonto wie im Base, kein Lohn-Spike → simpel
    k.immobilien.items[0] = {
      id: "eigenheim",
      beschreibung: "Eigenheim",
      typ: "selbstbewohnt",
      verkehrswert: 800_000,
      hypotheken: [
        {
          id: "h1",
          beschreibung: "Hypothek",
          hoehe: 200_000,
          zinssatzProzent: 1.5,
          ablaufjahr: 2050,
        },
      ],
      plan: "verschenken",
      verkaufsjahr: 2030, // = Übergabejahr
      jaehrlicheMieteinnahmen: null,
      kaufjahr: 2010,
      anlagekosten: 500_000, // im Verkaufsfall wären 300k Gewinn → GGSt > 0
      wertvermehrendeInvestitionen: null,
      wertsteigerungProzent: 0,
    };
    k.bvg.p1.aktiverAnschluss = false;
    k.saeuleDrei = { p1: [], p2: [] };
    return k;
  }

  it("Im Übergabejahr: Verkehrswert UND Hypothek raus aus Bilanz", () => {
    const k = makeEigenheimVerschenkt();
    const reihe = cashflowReihe(k, 2029, 2031);
    const vor = reihe.find((r) => r.jahr === 2029)!;
    const ab = reihe.find((r) => r.jahr === 2030)!;

    // Vor Übergabe: 800k Verkehrswert + 200k Hypothek in der Bilanz
    expect(vor.vermoegenImmobilien).toBe(800_000);
    expect(vor.vermoegenSchulden).toBe(200_000);
    // Ab Übergabejahr: beides weg
    expect(ab.vermoegenImmobilien).toBe(0);
    expect(ab.vermoegenSchulden).toBe(0);
  });

  it("Im Übergabejahr: KEIN Geldfluss aufs Hauptkonto (kapAuszahlungen aus Immo = 0)", () => {
    const k = makeEigenheimVerschenkt();
    const r = cashflowReihe(k, 2030, 2030)[0]!;
    // KEIN kapAuszahlung aus Immobilien-Übergabe (im Gegensatz zu plan="verkaufen",
    // wo 600k netto aufs Konto fliessen würden)
    expect(r.kapAuszahlungen).toBe(0);
  });

  it("Im Übergabejahr: KEINE Kapitalleistungs-Sondertarif-Steuer", () => {
    const k = makeEigenheimVerschenkt();
    const r = cashflowReihe(k, 2030, 2030)[0]!;
    expect(r.ausgabenSteuernKapital).toBe(0);
  });

  it("Übergabe: KEIN Einkommens-Steuer-Spike durch GGSt (Steueraufschub)", () => {
    // Vergleichs-Setup: gleicher Anlagekosten-Gewinn (300k) — bei "verkaufen"
    // würde GGSt anfallen, bei "verschenken" nicht (Steueraufschub).
    const verschenkt = makeEigenheimVerschenkt();
    const verkauft = makeEigenheimVerschenkt();
    verkauft.immobilien.items[0]!.plan = "verkaufen";

    const rV = cashflowReihe(verschenkt, 2030, 2030)[0]!;
    const rK = cashflowReihe(verkauft, 2030, 2030)[0]!;

    // Beim Verkauf wird GGSt vom Erlös abgezogen (kapAuszahlung tiefer als
    // Brutto 600k). Beim Verschenken: kein Geldfluss überhaupt.
    expect(rK.kapAuszahlungen).toBeGreaterThan(0);
    expect(rV.kapAuszahlungen).toBe(0);
    // Einkommens-Steuer in beiden Fällen aus dem operativen Cashflow heraus
    // ähnlich — GGSt ist eine separate Steuerart, taucht NICHT in
    // ausgabenSteuernEinkommen auf, sondern wird bei "verkaufen" direkt vom
    // Erlös abgezogen. Sanity: keine extreme Differenz.
    expect(Math.abs(rV.ausgabenSteuernEinkommen - rK.ausgabenSteuernEinkommen))
      .toBeLessThan(5_000);
  });

  it("Vor Übergabejahr: alles normal (Eigenmietwert, Hypozins, Verkehrswert in Bilanz)", () => {
    const k = makeEigenheimVerschenkt();
    const r = cashflowReihe(k, 2029, 2029)[0]!;
    expect(r.vermoegenImmobilien).toBe(800_000);
    expect(r.vermoegenSchulden).toBe(200_000);
    // Hypothek 200k × 1.5% = 3'000 Zinsen — fliessen in ausgabenSteuernEinkommen
    // (Schuldzinsabzug). Eigenmietwert ~9'040 (1.13% × 800k) erhöht steuerbares
    // Einkommen. Schon eine moderate Steuerlast erwartet (bei AR-Tarif ≥ 0).
    expect(r.ausgabenSteuernEinkommen).toBeGreaterThanOrEqual(0);
  });

  it("Mieteinnahmen Rendite: ab Verschenken-Jahr weg", () => {
    const k = makeEigenheimVerschenkt();
    k.immobilien.items[0]!.typ = "rendite";
    k.immobilien.items[0]!.jaehrlicheMieteinnahmen = 24_000;
    const reihe = cashflowReihe(k, 2029, 2031);
    const vor = reihe.find((r) => r.jahr === 2029)!;
    const ab = reihe.find((r) => r.jahr === 2030)!;
    // Vor Übergabe: Mieten zählen
    expect(vor.einnahmenTotal).toBeGreaterThan(20_000);
    // Ab Übergabe: keine Mieten mehr (nur Lohn restliche Monate / 0)
    expect(ab.einnahmenTotal).toBeLessThan(vor.einnahmenTotal);
  });

  it("Doppel-Verbuchung: Liegenschaft verschenken + separate Schenkung 200k im gleichen Jahr → unabhängig", () => {
    // Realer Fall: Berater verschenkt die Liegenschaft via plan="verschenken"
    // (Engine-intrinsisch: Bilanz raus, kein Cash) UND erfasst zusätzlich eine
    // separate Schenkung (z.B. 200'000 Cash an gleiches oder anderes Kind) im
    // Block 10 / Nachlass. Beide müssen unabhängig wirken; der Liegenschafts-
    // wert darf NICHT zusätzlich als ausgabenSchenkung gebucht werden.
    const k = makeEigenheimVerschenkt();
    k.erbschaft = {
      erwartet: "nein",
      groessenordnung: null,
      erwartetBetrag: null,
      erwartetJahr: null,
      erwartetBeruecksichtigen: false,
      erwartetVerwandtschaft: "nachkomme",
      schenkungenStatus: "geplant",
      schenkungenBetrag: 200_000,
      schenkungenJahr: 2030,
      schenkungenBeruecksichtigen: true,
      schenkungenDetails: "Cash-Geschenk an Kind",
      gueterstand: "errungenschaft",
    };
    const r = cashflowReihe(k, 2030, 2030)[0]!;

    // ausgabenSchenkung = nur die explizite Cash-Schenkung 200k —
    // NICHT 200k + 600k Liegenschaftswert.
    expect(r.ausgabenSchenkung).toBe(200_000);
    // Trotz Schenkungs-Ausgang ist immer noch kein Geldfluss aus Liegenschaft
    expect(r.kapAuszahlungen).toBe(0);
    // Bilanz: Liegenschaft raus (verschenkt), Schulden raus
    expect(r.vermoegenImmobilien).toBe(0);
    expect(r.vermoegenSchulden).toBe(0);
  });
});

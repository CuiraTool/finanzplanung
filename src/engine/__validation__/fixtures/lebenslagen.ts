/**
 * Fixture-Bibliothek: 5 typische Schweizer Lebenslagen als Test-Inputs.
 * Wird von fixtures.test.ts verwendet, kann auch in Marketing-Demos
 * + Regression-Tests genutzt werden.
 *
 * Quellen: anonymisierte echte Berater-Fälle (Combinvest, Mission 13,
 * Turicum, SSM).
 */

import type { CashflowInput } from "../../cashflow";

/** Basis-Skeleton, der pro Fixture überschrieben wird. */
function skel(): CashflowInput {
  return {
    fallart: "einzel",
    zivilstand: "ledig",
    person1: {
      vorname: "P1",
      nachname: "Test",
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
      einkommenP1: 80_000,
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
        altersguthabenHeute: 300_000,
        altersguthabenBeiBezug: 400_000,
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
          saldoHeute: 100_000,
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
      einkommen: [],
      ausgabenModus: "total",
      ausgabenTotal: 4_500,
      ausgabenKategorien: {
        lebenshaltung: null,
        wohnen: null,
        mobilitaet: null,
        versicherungen: null,
        ferienHobby: null,
        sonstiges: null,
      },
      wunschverbrauchPension: 3_500,
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

export interface Lebenslage {
  id: string;
  beschreibung: string;
  /** Erwartete Mindest-Plausi-Werte für Regression-Schutz. */
  erwartet: {
    vermNetto2026Min?: number;
    vermNetto2026Max?: number;
    steuern2026Min?: number;
    steuern2026Max?: number;
    ahvAb2030Min?: number;
  };
  input: CashflowInput;
}

/** L1: Konkubinats-Paar wie Cosandier/Hintermann (Combinvest). */
function buildL1(): CashflowInput {
  const s = skel();
  s.fallart = "paar";
  s.zivilstand = "konkubinat";
  s.person1.geburtsdatum = "1968-12-10";
  s.person2 = {
    vorname: "P2",
    nachname: "Test",
    geburtsdatum: "1964-06-11",
    geschlecht: "w",
    telefon: "",
    email: "",
  };
  s.ahv.einkommenP1 = 58_000;
  s.ahv.einkommenP2 = 51_000;
  s.bvg.p1.altersguthabenHeute = 294_231;
  s.bvg.p1.altersguthabenBeiBezug = 350_000;
  s.bvg.p2 = {
    aktiverAnschluss: true,
    altersguthabenHeute: 173_732,
    altersguthabenBeiBezug: 220_000,
    umwandlungssatzProzent: 6.0,
    bezugspraeferenz: "rente",
    kapitalanteil: 0,
    freizuegigkeit: [],
    einkaeufe: [],
    wefVorbezuege: [],
  };
  s.budget.einkommen = [
    { id: "e1", beschreibung: "L", personIdx: 1, betragMonatlich: 4_833, von: "2026-01", bis: "2033-12" },
    { id: "e2", beschreibung: "L", personIdx: 2, betragMonatlich: 4_250, von: "2026-01", bis: "2029-06" },
  ];
  s.budget.ausgabenTotal = 7_900; // 95k/J
  s.adresse.kanton = "BE";
  return s;
}

/** L2: Ehepaar mit Alters-Asymmetrie wie Näf (Turicum, 16 J Diff). */
function buildL2(): CashflowInput {
  const s = skel();
  s.fallart = "paar";
  s.zivilstand = "verheiratet";
  s.person1.geburtsdatum = "1966-07-14";
  s.person2 = {
    vorname: "P2",
    nachname: "T",
    geburtsdatum: "1982-01-03",
    geschlecht: "w",
    telefon: "",
    email: "",
  };
  s.ahv.einkommenP1 = 74_000;
  s.ahv.einkommenP2 = 62_000;
  s.bvg.p1.altersguthabenHeute = 198_105;
  s.bvg.p1.altersguthabenBeiBezug = 299_884;
  s.bvg.p1.bezugspraeferenz = "kapital";
  s.bvg.p1.kapitalanteil = 100;
  s.immobilien.items = [
    {
      id: "eh",
      typ: "selbstbewohnt",
      beschreibung: "Eigenheim Horgen",
      verkehrswert: 1_100_000,
      hypotheken: [{ id: "h", beschreibung: "", hoehe: 450_000, zinssatzProzent: 1.2, ablaufjahr: 2035 }],
      plan: "behalten",
      verkaufsjahr: 2060,
      jaehrlicheMieteinnahmen: null,
      kaufjahr: 2015,
      anlagekosten: null,
      wertvermehrendeInvestitionen: null,
      wertsteigerungProzent: 0,
    },
    {
      id: "land",
      typ: "sonstiges",
      beschreibung: "Bauland",
      verkehrswert: 100_000,
      hypotheken: [],
      plan: "behalten",
      verkaufsjahr: 2060,
      jaehrlicheMieteinnahmen: null,
      kaufjahr: 2018,
      anlagekosten: 100_000,
      wertvermehrendeInvestitionen: null,
      wertsteigerungProzent: 0,
    },
  ];
  s.adresse.kanton = "ZH";
  return s;
}

/** L3: Single Witwe mit Eigenheim — typisch CH-Pension. */
function buildL3(): CashflowInput {
  const s = skel();
  s.zivilstand = "verwitwet";
  s.person1.geburtsdatum = "1955-04-15";
  s.person1.geschlecht = "w";
  s.ahv.einkommenP1 = 65_000;
  s.bvg.p1 = {
    aktiverAnschluss: false,
    altersguthabenHeute: null,
    altersguthabenBeiBezug: null,
    umwandlungssatzProzent: 6,
    bezugspraeferenz: "rente",
    kapitalanteil: 0,
    freizuegigkeit: [],
    einkaeufe: [],
    wefVorbezuege: [],
  };
  s.ahv.ahvRenteJahrEffektivP1 = 28_000;
  s.immobilien.items = [
    {
      id: "eh",
      typ: "selbstbewohnt",
      beschreibung: "Eigenheim",
      verkehrswert: 800_000,
      hypotheken: [{ id: "h", beschreibung: "", hoehe: 150_000, zinssatzProzent: 1.5, ablaufjahr: 2035 }],
      plan: "behalten",
      verkaufsjahr: 2060,
      jaehrlicheMieteinnahmen: null,
      kaufjahr: 2000,
      anlagekosten: null,
      wertvermehrendeInvestitionen: null,
      wertsteigerungProzent: 0,
    },
  ];
  s.adresse.kanton = "SG";
  return s;
}

/** L4: Geschiedener Vater mit Alimente, Kind. */
function buildL4(): CashflowInput {
  const s = skel();
  s.zivilstand = "geschieden";
  s.kinder = [
    { id: "k1", vorname: "K", geburtsdatum: "2010-06-01", zuordnung: "p1", ausbildungBisJahr: 2030 },
  ];
  s.ahv.einkommenP1 = 120_000;
  s.budget.einkommen = [
    { id: "e1", beschreibung: "L", personIdx: 1, betragMonatlich: 10_000, von: "2026-01", bis: "2030-06" },
  ];
  s.budget.alimente = { aktiv: true, betragJahr: 18_000, richtung: "zahlt" };
  s.adresse.kanton = "ZH";
  return s;
}

/** L5: Selbständig + Firma (Cuira-typisch). */
function buildL5(): CashflowInput {
  const s = skel();
  s.zivilstand = "verheiratet";
  s.fallart = "paar";
  s.person2 = {
    vorname: "P2",
    nachname: "T",
    geburtsdatum: "1972-03-15",
    geschlecht: "w",
    telefon: "",
    email: "",
  };
  s.ahv.einkommenP1 = 200_000;
  s.ahv.einkommenP2 = 0;
  s.firma = {
    vorhanden: true,
    firmenname: "Cuira Partners GmbH",
    moeglicherVerkaufserloes: 500_000,
    plan: "verkaufen",
    verkaufsjahr: 2032,
  };
  s.budget.einkommen = [
    { id: "e1", beschreibung: "L", personIdx: 1, betragMonatlich: 16_667, von: "2026-01", bis: "2032-06" },
  ];
  s.adresse.kanton = "ZH";
  return s;
}

export const LEBENSLAGEN: Lebenslage[] = [
  {
    id: "L1-konkubinat",
    beschreibung: "Konkubinats-Paar BE (wie Cosandier/Hintermann)",
    erwartet: { vermNetto2026Min: 400_000, vermNetto2026Max: 800_000 },
    input: buildL1(),
  },
  {
    id: "L2-paar-asymmetrie",
    beschreibung: "Ehepaar ZH mit Alters-Asymmetrie (wie Näf, 16 J Diff)",
    erwartet: { vermNetto2026Min: 700_000 },
    input: buildL2(),
  },
  {
    id: "L3-witwe-eigenheim",
    beschreibung: "Verwitwete Single SG mit Eigenheim",
    erwartet: { vermNetto2026Min: 600_000, ahvAb2030Min: 25_000 },
    input: buildL3(),
  },
  {
    id: "L4-geschieden-mit-kind",
    beschreibung: "Geschiedener Vater ZH mit Alimente + Kind",
    erwartet: { vermNetto2026Min: 50_000 },
    input: buildL4(),
  },
  {
    id: "L5-selbständig-firma",
    beschreibung: "Selbständig + Firmen-Verkauf bei Pension (ZH)",
    erwartet: { vermNetto2026Min: 100_000 },
    input: buildL5(),
  },
];

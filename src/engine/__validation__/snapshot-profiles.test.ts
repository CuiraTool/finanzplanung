/**
 * Snapshot-Tests: stille Engine-Drift sichtbar machen.
 *
 * Methode: definiere 6 Hauptprofile (typische Lebenslagen) → Engine-Output
 * als Vitest-Snapshot speichern. Bei Engine-Änderung muss User Snapshot-
 * Diff bewusst akzeptieren (`pnpm test -u`), sonst Build fails.
 *
 * Sichert ab:
 *  - keine versehentliche AHV-Plafond-Änderung
 *  - keine versehentliche Steuer-Tarif-Drift
 *  - Reform 2030 wirkt wie definiert
 *  - Konkubinat ≠ Verheiratet wie spezifiziert
 *
 * Profile auf wichtigste Cashflow-Reihen reduziert für lesbare Snapshots.
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe } from "../cashflow";
import type { CashflowInput } from "../cashflow";

function baseEinzel(kanton = "ZH"): CashflowInput {
  return {
    fallart: "einzel",
    zivilstand: "ledig",
    person1: {
      vorname: "P1",
      nachname: "T",
      geburtsdatum: "1965-07-01",
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
        aktiverAnschluss: true,
        altersguthabenHeute: 400_000,
        altersguthabenBeiBezug: 500_000,
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
          betragMonatlich: 8_333,
          von: "2026-01",
          bis: "2030-06",
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
      kanton: kanton,
      gemeindeBfsId: null,
      gemeindeName: "",
    },
    einmaligeAusgaben: [],
  };
}

function basePaar(zivilstand: "verheiratet" | "konkubinat" = "verheiratet"): CashflowInput {
  const s = baseEinzel("ZH");
  s.fallart = "paar";
  s.zivilstand = zivilstand;
  s.person2 = {
    vorname: "P2",
    nachname: "T",
    geburtsdatum: "1965-07-01",
    geschlecht: "w",
    telefon: "",
    email: "",
  };
  s.ahv.einkommenP2 = 80_000;
  s.budget.einkommen.push({
    id: "e2",
    beschreibung: "L2",
    personIdx: 2,
    betragMonatlich: 6_667,
    von: "2026-01",
    bis: "2030-06",
  });
  s.bvg.p2 = {
    aktiverAnschluss: true,
    altersguthabenHeute: 300_000,
    altersguthabenBeiBezug: 400_000,
    umwandlungssatzProzent: 6,
    bezugspraeferenz: "rente",
    kapitalanteil: 0,
    freizuegigkeit: [],
    einkaeufe: [],
    wefVorbezuege: [],
  };
  return s;
}

/** Snapshot-Reduktion: nur wichtigste Felder, abgerundet auf 100. */
function snapshotZeile(z: ReturnType<typeof cashflowReihe>[number]) {
  const round100 = (n: number) => Math.round(n / 100) * 100;
  return {
    jahr: z.jahr,
    einkommen: round100(z.einnahmenTotal),
    ausgaben: round100(z.ausgabenTotal),
    steuern: round100(z.ausgabenSteuern),
    netto: round100(z.vermoegenNetto),
    ahv: round100(z.einnahmenAhv),
    bvg: round100(z.einnahmenBvgRente),
  };
}

describe("Snapshot-Profile — sichert stille Engine-Drift ab", () => {
  it("Profil 1: Einzelperson ledig ZH, 100k, Pension 65", () => {
    const r = cashflowReihe(baseEinzel(), 2026, 2035).map(snapshotZeile);
    expect(r).toMatchSnapshot();
  });

  it("Profil 2: Paar verheiratet ZH, 100k+80k, beide 65", () => {
    const r = cashflowReihe(basePaar("verheiratet"), 2026, 2035).map(snapshotZeile);
    expect(r).toMatchSnapshot();
  });

  it("Profil 3: Paar Konkubinat ZH (sollte ≠ Verheiratet)", () => {
    const r = cashflowReihe(basePaar("konkubinat"), 2026, 2035).map(snapshotZeile);
    expect(r).toMatchSnapshot();
  });

  it("Profil 4: Einzelperson hoch ZG, 200k, Pension 65", () => {
    const s = baseEinzel("ZG");
    s.ahv.einkommenP1 = 200_000;
    s.budget.einkommen[0]!.betragMonatlich = 16_667;
    const r = cashflowReihe(s, 2026, 2035).map(snapshotZeile);
    expect(r).toMatchSnapshot();
  });

  it("Profil 5: Reform 2030 — Eigenheim ZH (vor/nach 2030)", () => {
    const s = baseEinzel();
    s.immobilien.items = [
      {
        id: "i1",
        typ: "selbstbewohnt",
        beschreibung: "EH",
        verkehrswert: 1_500_000,
        hypotheken: [
          { id: "h", beschreibung: "", hoehe: 600_000, zinssatzProzent: 1.5, ablaufjahr: 2045 },
        ],
        plan: "behalten",
        verkaufsjahr: 2060,
        jaehrlicheMieteinnahmen: null,
        kaufjahr: 2020,
        anlagekosten: null,
        wertvermehrendeInvestitionen: null,
        wertsteigerungProzent: 0,
      },
    ];
    const r = cashflowReihe(s, 2028, 2032).map(snapshotZeile);
    expect(r).toMatchSnapshot();
  });

  it("Profil 6: Vorbezug AHV 63 — Einzelperson", () => {
    const s = baseEinzel();
    s.ahv.ahvBezugsalterP1 = 63;
    s.ziele.bezugsalterP1 = 63;
    const r = cashflowReihe(s, 2026, 2032).map(snapshotZeile);
    expect(r).toMatchSnapshot();
  });
});

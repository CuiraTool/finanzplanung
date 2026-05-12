/**
 * Test User-Bug: PK-Einkauf 150k wirkt steuerlich.
 * (Tiago-Live-Test Martina + Martin Witt, BE Tramelan).
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe } from "./cashflow";
import type { CashflowInput } from "./cashflow";

function profil(): CashflowInput {
  return {
    fallart: "paar",
    zivilstand: "verheiratet",
    person1: {
      vorname: "Martina",
      nachname: "Witt",
      geburtsdatum: "1964-01-01",
      geschlecht: "w",
      telefon: "",
      email: "",
    },
    person2: {
      vorname: "Martin",
      nachname: "Witt",
      geburtsdatum: "1964-01-01",
      geschlecht: "m",
      telefon: "",
      email: "",
    },
    kinder: [],
    ahv: {
      einkommenP1: 100_000,
      einkommenP2: 80_000,
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
          saldoHeute: 500_000,
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
          bis: "2029-06",
        },
        {
          id: "e2",
          beschreibung: "L2",
          personIdx: 2,
          betragMonatlich: 6_667,
          von: "2026-01",
          bis: "2029-06",
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
      kanton: "BE",
      gemeindeBfsId: null,
      gemeindeName: "",
    },
    einmaligeAusgaben: [],
  };
}

describe("PK-Einkauf Steuerwirkung (User-Bug Witt 150k)", () => {
  it("PK-Einkauf 150k Martina 2027: Steuer 2027 deutlich tiefer", () => {
    const ohne = cashflowReihe(profil(), 2026, 2028);
    const mit = (() => {
      const p = profil();
      p.bvg.p1.einkaeufe = [
        {
          id: "ek1",
          jahr: 2027,
          betrag: 150_000,
          serie: false,
        },
      ];
      return cashflowReihe(p, 2026, 2028);
    })();

    const ohne2027 = ohne.find((z) => z.jahr === 2027)!;
    const mit2027 = mit.find((z) => z.jahr === 2027)!;

    // Steuer-Differenz sollte deutlich > 20'000 sein (150k × ~25% Grenzsteuer)
    const diff = ohne2027.ausgabenSteuern - mit2027.ausgabenSteuern;
    // eslint-disable-next-line no-console
    console.log(
      `[PK-Einkauf-Test] Steuer ohne 2027: ${ohne2027.ausgabenSteuern}, mit: ${mit2027.ausgabenSteuern}, Diff: ${diff}`
    );
    expect(diff).toBeGreaterThan(15_000);
  });

  it("Vermögen 2027: Liquid sinkt um 150k (Einkauf), Vorsorge steigt", () => {
    const ohne = cashflowReihe(profil(), 2026, 2028);
    const mit = (() => {
      const p = profil();
      p.bvg.p1.einkaeufe = [
        {
          id: "ek1",
          jahr: 2027,
          betrag: 150_000,
          serie: false,
        },
      ];
      return cashflowReihe(p, 2026, 2028);
    })();

    const ohne2027 = ohne.find((z) => z.jahr === 2027)!;
    const mit2027 = mit.find((z) => z.jahr === 2027)!;

    // Liquidität ist mit Einkauf tiefer (150k weg)
    // eslint-disable-next-line no-console
    console.log(
      `[Vermögen-Test] Liquid ohne: ${ohne2027.vermoegenLiquiditaet}, mit: ${mit2027.vermoegenLiquiditaet}, Diff: ${ohne2027.vermoegenLiquiditaet - mit2027.vermoegenLiquiditaet}`
    );
    expect(mit2027.vermoegenLiquiditaet).toBeLessThan(
      ohne2027.vermoegenLiquiditaet
    );
    // Vorsorge ist mit Einkauf höher
    // eslint-disable-next-line no-console
    console.log(
      `[Vermögen-Test] Vorsorge ohne: ${ohne2027.vermoegenVorsorge}, mit: ${mit2027.vermoegenVorsorge}, Diff: ${mit2027.vermoegenVorsorge - ohne2027.vermoegenVorsorge}`
    );
    expect(mit2027.vermoegenVorsorge).toBeGreaterThan(
      ohne2027.vermoegenVorsorge
    );
  });
});

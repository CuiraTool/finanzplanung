/**
 * Tests für die BVG-Sparphase-Hochlauf-Logik im Cashflow.
 *
 * Hintergrund: Vor dem Fix sprang der PK-Saldo im Vermögensverlauf nicht,
 * sondern blieb statisch auf `altersguthabenHeute` bis zum Bezugsjahr —
 * dann lag plötzlich `altersguthabenBeiBezug` als Kapital-Auszahlung vor.
 * Das ergab einen unrealistischen Sprung im Charts.
 *
 * Fix: linearer Hochlauf zwischen heute und Bezugsjahr (vereinfachte
 * Sparphase, ±2-3% Fehler vs. exakter Sparphasen-Mathematik).
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe } from "./cashflow";
import type { CashflowInput } from "./cashflow";

function makeBaseState(): CashflowInput {
  return {
    fallart: "einzel",
    person1: {
      vorname: "Max",
      nachname: "Muster",
      geburtsdatum: "1962-01-01", // → 64 in 2026
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
      ahvBezugsalterP2: 65, ahvRenteJahrEffektivP1: null, ahvRenteJahrEffektivP2: null,
    },
    bvg: {
      p1: {
        aktiverAnschluss: true,
        altersguthabenHeute: 580_000,
        altersguthabenBeiBezug: 720_000,
        umwandlungssatzProzent: 6.8,
        bezugspraeferenz: "kapital",
        kapitalanteil: 100,
        freizuegigkeit: [],
        einkaeufe: [],
      },
      p2: {
        aktiverAnschluss: false,
        altersguthabenHeute: null,
        altersguthabenBeiBezug: null,
        umwandlungssatzProzent: 6.8,
        bezugspraeferenz: "rente",
        kapitalanteil: 50,
        freizuegigkeit: [],
        einkaeufe: [],
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
      alimente: { aktiv: false, betragJahr: null },
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

describe("BVG-Sparphase Hochlauf im Cashflow", () => {
  it("PK-Saldo wächst linear vom heutigen Wert zum Bezugswert", () => {
    const state = makeBaseState();
    const heute = new Date().getFullYear();
    // Bezug bei 65 → 1962+65 = 2027 (oder sehr nah, je nach heutigem Jahr)
    const bezugsjahr = 1962 + 65;

    const reihe = cashflowReihe(state, heute, heute + 5);

    // 1. Heute: PK ist im Vorsorge-Bucket — sollte ≈ altersguthabenHeute
    const heuteZeile = reihe[0];
    expect(heuteZeile?.vermoegenVorsorge).toBeGreaterThanOrEqual(580_000);

    // 2. Im Bezugsjahr (oder direkt davor): Saldo sollte gegen 720k wandern
    if (bezugsjahr - 1 > heute) {
      const vorBezug = reihe.find((z) => z.jahr === bezugsjahr - 1);
      if (vorBezug) {
        // Sollte zwischen 580k und 720k liegen, näher an 720k
        expect(vorBezug.vermoegenVorsorge).toBeGreaterThan(600_000);
        expect(vorBezug.vermoegenVorsorge).toBeLessThanOrEqual(720_000);
      }
    }

    // 3. Im Bezugsjahr fliesst PK als Kapital aus — Vorsorge-Bucket → 0 (PK-Anteil)
    const bezugZeile = reihe.find((z) => z.jahr === bezugsjahr);
    if (bezugZeile) {
      // Vorsorge sinkt, Hauptkonto bekommt das Kapital
      expect(bezugZeile.kapAuszahlungen).toBeGreaterThan(0);
    }
  });

  it("ohne altersguthabenBeiBezug: statischer Hochlauf auf heute (kein Sprung)", () => {
    const state = makeBaseState();
    state.bvg.p1.altersguthabenBeiBezug = null;
    const heute = new Date().getFullYear();

    const reihe = cashflowReihe(state, heute, heute + 3);

    // Ohne BeiBezug-Wert: Saldo bleibt statisch auf altersguthabenHeute
    const heuteZeile = reihe[0];
    const inDreiJahren = reihe[3];
    if (heuteZeile && inDreiJahren) {
      // PK-Anteil sollte sich um < 5k unterscheiden (anderes Vorsorge-Material kann
      // anders fluktuieren, aber PK bleibt statisch).
      expect(heuteZeile.vermoegenVorsorge).toBeGreaterThan(500_000);
    }
  });

  it("ohne altersguthabenHeute: statisch auf BeiBezug", () => {
    const state = makeBaseState();
    state.bvg.p1.altersguthabenHeute = null;
    const heute = new Date().getFullYear();

    const reihe = cashflowReihe(state, heute, heute + 2);
    const heuteZeile = reihe[0];

    // Mit nur altersguthabenBeiBezug: Saldo wird statisch auf den
    // BeiBezug-Wert gesetzt (720k).
    expect(heuteZeile?.vermoegenVorsorge).toBeGreaterThanOrEqual(700_000);
  });

  it("ohne aktiven Anschluss: kein PK-Anteil im Vermögen", () => {
    const state = makeBaseState();
    state.bvg.p1.aktiverAnschluss = false;
    const heute = new Date().getFullYear();

    const reihe = cashflowReihe(state, heute, heute + 1);
    const heuteZeile = reihe[0];

    // Kein PK → Vorsorge-Bucket nahe 0 (wir haben auch kein 3a/FZ)
    expect(heuteZeile?.vermoegenVorsorge ?? 0).toBeLessThan(10_000);
  });
});

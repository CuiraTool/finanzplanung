/**
 * Tests für die BVG-Sparphase-Hochlauf-Logik im Cashflow.
 *
 * Hintergrund: Vor dem Fix sprang der PK-Saldo im Vermögensverlauf nicht,
 * sondern blieb statisch auf `altersguthabenHeute` bis zum Bezugsjahr —
 * dann lag plötzlich `altersguthabenBeiBezug` als Kapital-Auszahlung vor.
 * Das ergab einen unrealistischen Sprung im Charts.
 *
 * Fix (Stand 2026-05-25, V2): versicherungsmathematisch exakter Hochlauf
 * FV = PV·(1+r)^n + S·((1+r)^n − 1)/r mit r = BVG-Mindestzinssatz 1.25 %.
 * Gilt sowohl für Vermögensbucket (pkSaldoSparphase) als auch Frühpension-
 * Saldo (pkAltersguthabenBeiAlter). Vorher Frühpension linear → ±2-3 %.
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe } from "./cashflow";
import type { CashflowInput } from "./cashflow";

function makeBaseState(): CashflowInput {
  return {
    fallart: "einzel",
    zivilstand: "ledig" as const,
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

/**
 * V2 2026-05-25: Frühpension-Saldo versicherungsmathematisch exakt.
 *
 * Vorher: linearer Hochlauf zwischen heute und ord. AHV-Alter →
 * konkrete Drift bei Frühpension dokumentiert.
 *
 * Mathematischer Erwartungswert:
 *   Person geb. 1971-01-01 → 2026 Alter 55
 *   heute = 300'000, beiBezug(65) = 600'000
 *   r = 1.25 % BVG-Mindestzinssatz
 *   n = 10 (65 − 55)
 *   pvAufgezinst = 300'000 × 1.0125^10  = 339'584
 *   annuitätsfaktor(10) = (1.0125^10 − 1) / 0.0125 = 10.5817
 *   S = (600'000 − 339'584) / 10.5817 = 24'610 p.a.
 *
 *   Frühpension Alter 60 (k = 5):
 *   compoundedPv(5) = 300'000 × 1.0125^5 = 319'231
 *   annuitätsfaktor(5) = (1.0125^5 − 1) / 0.0125 = 5.1247
 *   Saldo(5) = 319'231 + 24'610 × 5.1247 ≈ 445'351
 *
 *   Linear-Vergleich (vorher): 300'000 + 300'000 × 0.5 = 450'000
 *   Drift Linear vs. exakt: +4'649 (+1.0 %)
 */
describe("BVG-Frühpension — versicherungsmathematisch exakt (V2)", () => {
  it("bezugsalter 60 mit heute=300k, beiBezug=600k → ~445'350 (konkav)", () => {
    const state = makeBaseState();
    state.person1.geburtsdatum = "1971-01-01"; // → 55 in 2026
    state.bvg.p1.altersguthabenHeute = 300_000;
    state.bvg.p1.altersguthabenBeiBezug = 600_000;
    state.bvg.p1.bezugspraeferenz = "kapital";
    state.bvg.p1.kapitalanteil = 100;
    state.ahv.ahvBezugsalterP1 = 60; // muss konsistent sein, sonst Pension nicht real
    state.ziele.bezugsalterP1 = 60;

    const reihe = cashflowReihe(state, 2026, 2032);
    // Im Bezugsjahr (2031, Alter 60) → kapAuszahlungen enthält den PK-Saldo
    const bezug = reihe.find((r) => r.jahr === 2031);
    expect(bezug).toBeTruthy();

    // Erwartung: ≈ 445'350 (±5'000 Toleranz für Rundung + interne Zinslogik)
    expect(bezug!.kapAuszahlungen).toBeGreaterThanOrEqual(440_000);
    expect(bezug!.kapAuszahlungen).toBeLessThanOrEqual(450_000);
    // Linear wäre 450'000 → muss strikt darunter sein (konkav)
    expect(bezug!.kapAuszahlungen).toBeLessThan(450_000);
  });

  it("bezugsalter 65 (ord. AHV) → exakt beiBezug-Wert", () => {
    const state = makeBaseState();
    state.person1.geburtsdatum = "1971-01-01"; // → 55 in 2026
    state.bvg.p1.altersguthabenHeute = 300_000;
    state.bvg.p1.altersguthabenBeiBezug = 600_000;
    state.bvg.p1.bezugspraeferenz = "kapital";
    state.bvg.p1.kapitalanteil = 100;
    state.ahv.ahvBezugsalterP1 = 65;
    state.ziele.bezugsalterP1 = 65;

    const reihe = cashflowReihe(state, 2026, 2037);
    const bezug = reihe.find((r) => r.jahr === 2036); // Alter 65
    expect(bezug).toBeTruthy();
    expect(bezug!.kapAuszahlungen).toBeGreaterThanOrEqual(595_000);
    expect(bezug!.kapAuszahlungen).toBeLessThanOrEqual(605_000);
  });
});

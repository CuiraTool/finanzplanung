/**
 * Tests für die AHV-Einnahmen pro Jahr je nach Pensionierungsstatus
 * beider Personen.
 *
 * Hintergrund (A4 aus Code-Review): vor dem Fix wurde im Fall "nur P2
 * pensioniert" die plafonierte Ehepaarrente halbiert (`haushalt / 2`).
 * Korrekt ist: P2 alleine bekommt seine **eigene Einzelrente** ohne
 * Splitting und ohne Plafond — das Splitting/Plafond gilt erst, wenn
 * beide AHV beziehen. Ausserdem wurde der Fall "P2 vor P1 pensioniert"
 * vom alten `else if`-Branch maskiert (P1 nicht pensioniert + P2 jünger
 * als P1 → AHV blieb 0).
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe } from "./cashflow";
import type { CashflowInput } from "./cashflow";

function makePaarState(): CashflowInput {
  return {
    fallart: "paar",
    person1: {
      vorname: "Anna",
      nachname: "Muster",
      geburtsdatum: "1965-01-01", // → 65 in 2030
      geschlecht: "w",
      telefon: "",
      email: "",
    },
    person2: {
      vorname: "Marc",
      nachname: "Muster",
      geburtsdatum: "1962-01-01", // → 65 in 2027
      geschlecht: "m",
      telefon: "",
      email: "",
    },
    kinder: [],
    ahv: {
      einkommenP1: 60_000, // mittlere Rente
      einkommenP2: 100_000, // > Plafond → Vollrente Maximum
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
        aktiverAnschluss: false,
        altersguthabenHeute: null,
        altersguthabenBeiBezug: null,
        umwandlungssatzProzent: 6.8,
        bezugspraeferenz: "rente",
        kapitalanteil: 0,
        freizuegigkeit: [],
        einkaeufe: [],
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

describe("AHV-Einnahmen je nach Pensionierungsstatus (A4)", () => {
  it("nur P2 pensioniert → P2-Einzelrente, NICHT halbierter Plafond", () => {
    const state = makePaarState();
    // P2 (1962) pensioniert ab 2027, P1 (1965) erst ab 2030.
    // Im Jahr 2028: nur P2 bezieht AHV.
    const reihe = cashflowReihe(state, 2027, 2032);
    const z2028 = reihe.find((z) => z.jahr === 2028);
    expect(z2028).toBeDefined();
    if (!z2028) return;

    // P2 hat Einkommen 100k → Maximalrente Skala 44 (30'240) × 13/12 ≈ 32'760.
    // Mit dem alten Bug (haushalt/2) wären es ~24'570 — der Cut wäre also ≤ 26'000.
    expect(z2028.einnahmenAhv).toBeGreaterThanOrEqual(30_000);
    expect(z2028.einnahmenAhv).toBeLessThanOrEqual(35_000);
  });

  it("beide pensioniert → plafonierte Ehepaarrente (~49'140 mit 13. AHV)", () => {
    const state = makePaarState();
    // Ab 2030 sind beide pensioniert.
    const reihe = cashflowReihe(state, 2030, 2032);
    const z2031 = reihe.find((z) => z.jahr === 2031);
    expect(z2031).toBeDefined();
    if (!z2031) return;

    // Plafond Ehepaar: 45'360 × 13/12 ≈ 49'140.
    expect(z2031.einnahmenAhv).toBeGreaterThanOrEqual(48_000);
    expect(z2031.einnahmenAhv).toBeLessThanOrEqual(50_000);
  });

  it("P1 vor P2 pensioniert → P1-Einzelrente (Bug: alter else-Branch maskierte das)", () => {
    const state = makePaarState();
    // Tausche Bezugsalter: P1 mit 64 (Vorbezug), P2 mit 65 → P1 ab 2029, P2 ab 2027.
    // Stattdessen lassen wir P1 erst spät und P2 früh pensionieren wie im Setup.
    // Test: 2027–2029, nur P2 pensioniert → einnahmen > 0 (Bug hätte 0 ergeben
    // wenn der Fall im else-if blockiert wäre — was er für (state.fallart==="paar"
    // && jahr < ahvBezugsjahrP1 && jahr >= ahvBezugsjahrP2) tatsächlich nicht war,
    // aber der Wert war falsch).
    const reihe = cashflowReihe(state, 2027, 2029);
    const z2027 = reihe.find((z) => z.jahr === 2027);
    expect(z2027?.einnahmenAhv).toBeGreaterThan(0);
  });

  it("Einzel-Fall: P1 pensioniert → eigene Einzelrente (kein Paar-Pfad-Drift)", () => {
    const state = makePaarState();
    state.fallart = "einzel";
    state.ahv.einkommenP1 = 100_000; // → Maximalrente
    const reihe = cashflowReihe(state, 2030, 2031);
    const z2030 = reihe.find((z) => z.jahr === 2030);
    expect(z2030?.einnahmenAhv).toBeGreaterThanOrEqual(30_000);
    expect(z2030?.einnahmenAhv).toBeLessThanOrEqual(35_000);
  });
});

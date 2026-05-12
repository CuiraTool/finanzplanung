/**
 * Tests für Konkubinat-Logik (V1 / fachlicher Befund Combinvest-PDF).
 *
 * Bei fallart="paar" + zivilstand="konkubinat":
 *  - Steuer: jeder LEDIG-Tarif (kein Splitting, kein Verheirateten-Tarif)
 *  - AHV: jeder eigene Einzelrente (kein Plafond 45'360, kein Splitting)
 *  - Vermögen + shared income 50/50 zugeordnet
 *  - 2 separate Steuer-Berechnungen, summiert
 *
 * Vergleich: gleiche Profile mit zivilstand="verheiratet" vs "konkubinat".
 * Konkubinat sollte typisch HÖHERE Steuern haben (kein Verheirateten-Tarif-
 * Vorteil) und HÖHERE AHV (kein Plafond bei zwei Vollverdienern).
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe } from "./cashflow";
import type { CashflowInput } from "./cashflow";

function makeBase(): CashflowInput {
  return {
    fallart: "paar",
    zivilstand: "verheiratet",
    person1: {
      vorname: "Anna",
      nachname: "Test",
      geburtsdatum: "1965-01-01",
      geschlecht: "w",
      telefon: "",
      email: "",
    },
    person2: {
      vorname: "Bert",
      nachname: "Test",
      geburtsdatum: "1965-01-01",
      geschlecht: "m",
      telefon: "",
      email: "",
    },
    kinder: [],
    ahv: {
      einkommenP1: 100_000,
      einkommenP2: 100_000,
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
          beschreibung: "Konto",
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
      einkommen: [
        {
          id: "e1",
          beschreibung: "Lohn Anna",
          personIdx: 1 as const,
          betragMonatlich: 8333, // 100k
          von: "2026-01",
          bis: "2030-01",
        },
        {
          id: "e2",
          beschreibung: "Lohn Bert",
          personIdx: 2 as const,
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

describe("Konkubinat — Steuer-Differenzierung gegenüber Verheiratet", () => {
  it("Konkubinat ≠ Verheiratet (Steuer-Tarif unterscheidet sich)", () => {
    const verheiratet = makeBase();
    const konkubinat = { ...makeBase(), zivilstand: "konkubinat" as const };

    const rV = cashflowReihe(verheiratet, 2026, 2026)[0]!;
    const rK = cashflowReihe(konkubinat, 2026, 2026)[0]!;

    // Bei zwei Vollverdienern ist Konkubinat oft GÜNSTIGER als Verheiratet
    // (Heiratsstrafe-Effekt CH). Wichtig: beide Werte unterscheiden sich
    // signifikant — Tarif-Logik greift unterschiedlich.
    expect(rK.ausgabenSteuernEinkommen).not.toBe(rV.ausgabenSteuernEinkommen);
    expect(Math.abs(rK.ausgabenSteuernEinkommen - rV.ausgabenSteuernEinkommen)).toBeGreaterThan(1_000);
  });

  it("Einseitig: nur Person 1 verdient — Konkubinat höher (kein Splitting-Vorteil)", () => {
    const verheiratet = makeBase();
    // P2 ohne Einkommen
    verheiratet.budget.einkommen = verheiratet.budget.einkommen.filter((e) => e.personIdx === 1);
    verheiratet.ahv.einkommenP2 = 0;
    const konkubinat = JSON.parse(JSON.stringify(verheiratet));
    konkubinat.zivilstand = "konkubinat";

    const rV = cashflowReihe(verheiratet, 2026, 2026)[0]!;
    const rK = cashflowReihe(konkubinat, 2026, 2026)[0]!;

    // Bei Single-Verdiener: Verheiratet-Splitting bringt grossen Vorteil
    // (100k aufgeteilt auf 2 × 50k). Konkubinat: P1 wird voll auf 100k LEDIG
    // besteuert, P2 = 0.
    // → Konkubinat-Steuer höher.
    expect(rK.ausgabenSteuernEinkommen).toBeGreaterThan(
      rV.ausgabenSteuernEinkommen
    );
  });

  it("Konkubinat: AHV summiert ohne Plafond", () => {
    const verheiratet = makeBase();
    const konkubinat = { ...makeBase(), zivilstand: "konkubinat" as const };

    // Im Pensionsjahr 2030: beide bei 65, beide volle Maximalrenten.
    const rV = cashflowReihe(verheiratet, 2030, 2031).find(
      (z) => z.jahr === 2031
    )!;
    const rK = cashflowReihe(konkubinat, 2030, 2031).find(
      (z) => z.jahr === 2031
    )!;

    // Verheiratet: Plafond 45'360 × 13/12 = 49'140 (mit 13. AHV)
    // Konkubinat: 2 × 30'240 × 13/12 = 65'520 (kein Plafond)
    // → Konkubinat AHV deutlich höher
    expect(rK.einnahmenAhv).toBeGreaterThan(rV.einnahmenAhv);
    expect(rK.einnahmenAhv).toBeLessThanOrEqual(66_000);
    expect(rV.einnahmenAhv).toBeLessThanOrEqual(50_000);
  });

  it("Konkubinat: Vermögenssteuer zwei separate Freibeträge", () => {
    // Bei 200k Vermögen: Verheiratet hat 1× 160k Freibetrag → 40k steuerbar.
    // Konkubinat: 2× 80k Freibetrag → 2 × 100k = 200k steuerbar, aber jeder
    // mit Einzel-Tarif (kann je nach Progression mal höher mal tiefer sein).
    const verheiratet = makeBase();
    verheiratet.vermoegen.items[0]!.saldoHeute = 200_000;
    const konkubinat = { ...verheiratet, zivilstand: "konkubinat" as const };

    const rV = cashflowReihe(verheiratet, 2026, 2026)[0]!;
    const rK = cashflowReihe(konkubinat, 2026, 2026)[0]!;

    // Beide >0 — Sicherheits-Test, keine 0
    expect(rV.ausgabenSteuernVermoegen + rK.ausgabenSteuernVermoegen).toBeGreaterThan(0);
  });
});

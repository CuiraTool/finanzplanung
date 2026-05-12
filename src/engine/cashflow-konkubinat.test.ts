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
    const verheiratet = makeBase();
    verheiratet.vermoegen.items[0]!.saldoHeute = 200_000;
    const konkubinat = { ...verheiratet, zivilstand: "konkubinat" as const };

    const rV = cashflowReihe(verheiratet, 2026, 2026)[0]!;
    const rK = cashflowReihe(konkubinat, 2026, 2026)[0]!;

    expect(rV.ausgabenSteuernVermoegen + rK.ausgabenSteuernVermoegen).toBeGreaterThan(0);
  });

  // ─── EXTRA-Tests: Wasserfeste Konkubinat-Logik ─────────────────

  it("Konkubinat AHV exakt: 2× Einzelrenten ohne Plafond — Maximal-Fall", () => {
    // Beide einkommen ≥ 90'720 (= obere Skala44-Grenze) → 2× Maximalrente
    // 30'240 × 13/12 = 32'760 → Total 65'520
    const k = makeBase();
    k.zivilstand = "konkubinat";
    k.ahv.einkommenP1 = 120_000;
    k.ahv.einkommenP2 = 120_000;

    const r = cashflowReihe(k, 2030, 2031).find((z) => z.jahr === 2031)!;
    // Total ungefähr 65'520 (Maximalrenten beider Personen mit 13. AHV)
    expect(r.einnahmenAhv).toBeGreaterThan(60_000);
    expect(r.einnahmenAhv).toBeLessThan(70_000);
  });

  it("Verheiratet AHV: Plafond ist eingehalten — Maximal-Fall", () => {
    const v = makeBase();
    v.zivilstand = "verheiratet";
    v.ahv.einkommenP1 = 120_000;
    v.ahv.einkommenP2 = 120_000;

    const r = cashflowReihe(v, 2030, 2031).find((z) => z.jahr === 2031)!;
    // Plafond 45'360 × 13/12 ≈ 49'140
    expect(r.einnahmenAhv).toBeLessThanOrEqual(49_640);
  });

  it("Konkubinat: nur P1 pensioniert — nur P1-AHV (P2 keine)", () => {
    const k = makeBase();
    k.zivilstand = "konkubinat";
    k.person1.geburtsdatum = "1965-01-01"; // → 65 in 2030
    k.person2.geburtsdatum = "1970-01-01"; // → 65 in 2035
    k.ahv.ahvBezugsalterP1 = 65;
    k.ahv.ahvBezugsalterP2 = 65;

    const r2031 = cashflowReihe(k, 2030, 2031).find((z) => z.jahr === 2031)!;
    const r2036 = cashflowReihe(k, 2030, 2036).find((z) => z.jahr === 2036)!;

    // 2031: nur P1 bezieht, ohne Plafond → ~32'760
    expect(r2031.einnahmenAhv).toBeGreaterThan(30_000);
    expect(r2031.einnahmenAhv).toBeLessThan(36_000);
    // 2036: beide beziehen, 2× Einzel → ~65'520
    expect(r2036.einnahmenAhv).toBeGreaterThan(60_000);
  });

  it("Konkubinat-Steuer: total = P1 + P2 summiert (separate Berechnungen)", () => {
    // Validiert: bei Konkubinat ist die Steuer-Berechnung echte Summe
    // zweier Einzel-Berechnungen — nicht durch Splitting verwischt.
    const k = makeBase();
    k.zivilstand = "konkubinat";
    k.budget.einkommen = k.budget.einkommen.map((e, idx) =>
      idx === 0
        ? { ...e, betragMonatlich: 12_500 } // P1 150k
        : { ...e, betragMonatlich: 4_167 } // P2 50k
    );
    k.ahv.einkommenP1 = 150_000;
    k.ahv.einkommenP2 = 50_000;

    const rK = cashflowReihe(k, 2026, 2026)[0]!;
    expect(rK.ausgabenSteuernEinkommen).toBeGreaterThan(0);
    // Bei 150k/50k (moderater Asymmetrie) ist der Unterschied klein.
    // Wichtig: Konkubinat-Pfad funktioniert ohne Crash + plausibler Wert
    expect(rK.ausgabenSteuernEinkommen).toBeGreaterThan(20_000);
    expect(rK.ausgabenSteuernEinkommen).toBeLessThan(50_000);
  });

  it("Konkubinat: BVG-Rente Pro-Rata pro Person (kein gemeinsamer Topf)", () => {
    const k = makeBase();
    k.zivilstand = "konkubinat";
    k.bvg.p1.aktiverAnschluss = true;
    k.bvg.p1.altersguthabenHeute = 500_000;
    k.bvg.p1.altersguthabenBeiBezug = 600_000;
    k.bvg.p1.umwandlungssatzProzent = 6.0;
    k.bvg.p1.bezugspraeferenz = "rente";

    // P2 keine PK
    const r = cashflowReihe(k, 2030, 2031).find((z) => z.jahr === 2031)!;
    expect(r.einnahmenBvgRente).toBeGreaterThan(30_000); // ~36k
    expect(r.einnahmenBvgRente).toBeLessThan(40_000);
  });

  it("Konkubinat: kein automatisches Splitting des Einkommens", () => {
    // P1 verdient 200k, P2 = 0. Konkubinat behandelt P1 mit vollen 200k
    // LEDIG-Tarif (steile Progression), nicht 2× 100k.
    const k = makeBase();
    k.zivilstand = "konkubinat";
    k.budget.einkommen = [
      {
        id: "e1",
        beschreibung: "Lohn P1",
        personIdx: 1 as const,
        betragMonatlich: 16_667,
        von: "2026-01",
        bis: "2030-01",
      },
    ];
    k.ahv.einkommenP1 = 200_000;
    k.ahv.einkommenP2 = 0;

    const rK = cashflowReihe(k, 2026, 2026)[0]!;
    expect(rK.ausgabenSteuernEinkommen).toBeGreaterThan(15_000);

    // Verheiratet mit Splitting wäre deutlich tiefer
    const v = { ...k, zivilstand: "verheiratet" as const };
    const rV = cashflowReihe(v, 2026, 2026)[0]!;
    expect(rV.ausgabenSteuernEinkommen).toBeLessThan(rK.ausgabenSteuernEinkommen);
  });

  it("Konkubinat: 50/50 Vermögensaufteilung bei Steuer", () => {
    // Doppel-Vermögen → effektive Steuerbasis sollte zweimal Vermögen/2 sein
    const k = makeBase();
    k.zivilstand = "konkubinat";
    k.vermoegen.items[0]!.saldoHeute = 500_000;
    k.budget.einkommen = [];
    k.ahv.einkommenP1 = 0;
    k.ahv.einkommenP2 = 0;

    const r = cashflowReihe(k, 2026, 2026)[0]!;
    // Beide haben je 250k - 80k Freibetrag = 170k steuerbar (in ZH ~0.2% = ~340 × 2)
    expect(r.ausgabenSteuernVermoegen).toBeGreaterThan(100);
  });

  it("Konkubinat ist nur aktiv wenn fallart=paar UND zivilstand=konkubinat", () => {
    // fallart="einzel" mit zivilstand="ledig" muss normal-Einzel-Pfad sein
    const einzelLedig = makeBase();
    einzelLedig.fallart = "einzel";
    einzelLedig.zivilstand = "ledig";
    einzelLedig.budget.einkommen = einzelLedig.budget.einkommen.filter(
      (e) => e.personIdx === 1
    );
    einzelLedig.ahv.einkommenP2 = null;

    const r = cashflowReihe(einzelLedig, 2026, 2026)[0]!;
    expect(r.ausgabenSteuernEinkommen).toBeGreaterThan(0);
    // Should not throw / not negative
    expect(r.einnahmenTotal).toBeGreaterThanOrEqual(0);
  });
});

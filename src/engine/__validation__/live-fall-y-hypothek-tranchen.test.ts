/**
 * Live-Test Fall Y: Hypothek-Mechanik mit mehreren Tranchen (Brunner ZH).
 *
 * Profil:
 *  - P1 Daniela Brunner, w, 1975, Erwerb 180k bis 2040
 *  - P2 Marc Brunner, m, 1977, Erwerb 90k bis 2042
 *  - Verheiratet, Wohnsitz Wädenswil ZH
 *  - 1 Eigenheim Wädenswil 1'600'000, kauf 2018, behalten (Wertsteigerung 0%)
 *  - 3 Hypothek-Tranchen:
 *      A: 500'000 @ 1.5% Fest,  Ablauf 2030
 *      B: 400'000 @ 1.8% Fest,  Ablauf 2032
 *      C: 200'000 @ 2.2% SARON, Ablauf 2028
 *  - Liquid 320k, Depot 280k (Rendite 3%)
 *  - PK beide aktiv (Standard-Werte)
 *  - 3a P1 70k + 7'258/J, 3a P2 50k + 7'258/J
 *
 * Validiert die Hypothek-Mechanik der Cashflow-Engine 2026-2035 auf:
 *  1. hypothekenStand 2026 = 1'100'000 (Σ aller 3 Tranchen)
 *  2. Hypozins 2026 = 500×1.5% + 400×1.8% + 200×2.2% = 19'100/J
 *  3. EMW + Schuldzinsabzug aktiv 2026-2029, ab 2030 beides = 0
 *  4. Tranche-Ablauf wirkt NICHT auto-tilgend (Engine-Vereinfachung):
 *     Stand bleibt bei 1'100k auch nach Ablaufjahr 2028, 2030, 2032
 *  5. Belehnung 1.1M / 1.6M = 68.75% (innerhalb 80% Grenze)
 *  6. Eigenmietwert 1.6M × 1.13% = 18'080/J in 2026-2029, 0 ab 2030
 *
 * WICHTIG: Engine NICHT verändern. Die Beobachtung "Hypotheken-Ablaufjahr
 * ist heute nur ein Datenfeld ohne Auto-Tilgung" ist eine zulässige
 * Engine-Vereinfachung und wird hier dokumentiert/getestet.
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe, type CashflowInput } from "../cashflow";

function buildFallY(): CashflowInput {
  return {
    fallart: "paar",
    zivilstand: "verheiratet",
    person1: {
      vorname: "Daniela",
      nachname: "Brunner",
      geburtsdatum: "1975-04-12",
      geschlecht: "w",
      telefon: "",
      email: "",
    },
    person2: {
      vorname: "Marc",
      nachname: "Brunner",
      geburtsdatum: "1977-08-03",
      geschlecht: "m",
      telefon: "",
      email: "",
    },
    kinder: [],
    ahv: {
      einkommenP1: 180_000,
      einkommenP2: 90_000,
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
        altersguthabenHeute: 420_000,
        altersguthabenBeiBezug: 720_000,
        umwandlungssatzProzent: 5.8,
        bezugspraeferenz: "rente",
        kapitalanteil: 0,
        freizuegigkeit: [],
        einkaeufe: [],
        wefVorbezuege: [],
      },
      p2: {
        aktiverAnschluss: true,
        altersguthabenHeute: 210_000,
        altersguthabenBeiBezug: 380_000,
        umwandlungssatzProzent: 5.8,
        bezugspraeferenz: "rente",
        kapitalanteil: 0,
        freizuegigkeit: [],
        einkaeufe: [],
        wefVorbezuege: [],
      },
    },
    saeuleDrei: {
      p1: [
        {
          id: "3a-p1",
          type: "konto",
          saeule: "3a",
          beschreibung: "3a Bank P1",
          aktuellerWert: 70_000,
          auszahlungsjahr: 2040,
          renditeProzent: 1.5,
          rueckkaufswert: null,
          ablaufswert: null,
          ablaufjahr: 2040,
          jaehrlicheEinzahlung: 7_258,
          einzahlungAb: 2026,
          einzahlungBis: 2040,
        },
      ],
      p2: [
        {
          id: "3a-p2",
          type: "konto",
          saeule: "3a",
          beschreibung: "3a Bank P2",
          aktuellerWert: 50_000,
          auszahlungsjahr: 2042,
          renditeProzent: 1.5,
          rueckkaufswert: null,
          ablaufswert: null,
          ablaufjahr: 2042,
          jaehrlicheEinzahlung: 7_258,
          einzahlungAb: 2026,
          einzahlungBis: 2042,
        },
      ],
    },
    vermoegen: {
      items: [
        {
          id: "v-konto",
          typ: "konto",
          beschreibung: "Privatkonto",
          saldoHeute: 320_000,
          renditeProzent: 0,
          istHauptkonto: true,
        },
        {
          id: "v-depot",
          typ: "depot",
          beschreibung: "Wertschriften-Depot",
          saldoHeute: 280_000,
          renditeProzent: 3.0,
          istHauptkonto: false,
        },
      ],
    },
    immobilien: {
      items: [
        {
          id: "eh-waedi",
          beschreibung: "Eigenheim Wädenswil",
          typ: "selbstbewohnt",
          verkehrswert: 1_600_000,
          hypotheken: [
            {
              id: "tr-a",
              beschreibung: "Tranche A Fest 1.5%",
              hoehe: 500_000,
              zinssatzProzent: 1.5,
              ablaufjahr: 2030,
            },
            {
              id: "tr-b",
              beschreibung: "Tranche B Fest 1.8%",
              hoehe: 400_000,
              zinssatzProzent: 1.8,
              ablaufjahr: 2032,
            },
            {
              id: "tr-c",
              beschreibung: "Tranche C SARON 2.2%",
              hoehe: 200_000,
              zinssatzProzent: 2.2,
              ablaufjahr: 2028,
            },
          ],
          plan: "behalten",
          verkaufsjahr: 2060,
          jaehrlicheMieteinnahmen: null,
          kaufjahr: 2018,
          anlagekosten: 1_400_000,
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
          id: "ek-p1",
          beschreibung: "Daniela — Anstellung",
          personIdx: 1,
          betragMonatlich: Math.round(180_000 / 12),
          von: "2026-01",
          bis: "2040-04",
          typ: "anstellung",
        },
        {
          id: "ek-p2",
          beschreibung: "Marc — Anstellung",
          personIdx: 2,
          betragMonatlich: Math.round(90_000 / 12),
          von: "2026-01",
          bis: "2042-08",
          typ: "anstellung",
        },
      ],
      ausgabenModus: "total",
      ausgabenTotal: 9_500,
      ausgabenKategorien: {
        lebenshaltung: null,
        wohnen: null,
        mobilitaet: null,
        versicherungen: null,
        ferienHobby: null,
        sonstiges: null,
      },
      wunschverbrauchPension: 8_500,
      steuernHeute: null,
      einkommenHeute: null,
      religion: "keine",
      alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
    },
    adresse: {
      strasse: "Seestrasse 1",
      plz: "8820",
      ort: "Wädenswil",
      kanton: "ZH",
      gemeindeBfsId: null,
      gemeindeName: "Wädenswil",
    },
    einmaligeAusgaben: [],
  };
}

describe("Live-Fall Y — Hypothek-Mechanik mit 3 Tranchen Brunner ZH", () => {
  const input = buildFallY();
  const reihe = cashflowReihe(input, 2026, 2035);

  it("liefert eine Reihe für 2026-2035 (10 Jahre)", () => {
    expect(reihe).toHaveLength(10);
    expect(reihe[0]!.jahr).toBe(2026);
    expect(reihe[9]!.jahr).toBe(2035);
  });

  it("Plausi: keine NaN, keine negativen Vermögens-/Steuer-Werte", () => {
    for (const z of reihe) {
      expect(Number.isFinite(z.einnahmenTotal)).toBe(true);
      expect(Number.isFinite(z.vermoegenNetto)).toBe(true);
      expect(Number.isFinite(z.vermoegenImmobilien)).toBe(true);
      expect(Number.isFinite(z.vermoegenSchulden)).toBe(true);
      expect(Number.isFinite(z.ausgabenHypozins)).toBe(true);
      expect(z.ausgabenSteuern).toBeGreaterThanOrEqual(0);
      expect(z.vermoegenSchulden).toBeGreaterThanOrEqual(0);
    }
  });

  // ─── 1. Hypothek-Stand 2026 = Σ 3 Tranchen = 1'100'000 ──────────
  it("hypothekenStand 2026 = 500k + 400k + 200k = 1'100'000", () => {
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    expect(z2026.vermoegenSchulden).toBe(1_100_000);
  });

  // ─── 2. Hypozins-Cashflow 2026 = 19'100/J ───────────────────────
  it("Hypozins 2026 = 500k×1.5% + 400k×1.8% + 200k×2.2% = 7'500 + 7'200 + 4'400 = 19'100", () => {
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    // 500'000 × 0.015 = 7'500
    // 400'000 × 0.018 = 7'200
    // 200'000 × 0.022 = 4'400
    // Summe: 19'100
    expect(z2026.ausgabenHypozins).toBe(19_100);
  });

  // ─── 3. Eigenmietwert 2026 = 1.6M × 1.13% = 18'080 ──────────────
  it("Eigenmietwert 2026 = 1'600'000 × 1.13% = 18'080", () => {
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    // Default-EMW-Prozent = 1.13 in cashflow.ts
    expect(z2026.eigenmietwertJahr).toBe(18_080);
  });

  // ─── 4. EMW + Schuldzinsabzug aktiv 2026-2029 ───────────────────
  it("Eigenmietwert + Schuldzinsabzug aktiv 2026-2029 (vor Reform 2030)", () => {
    for (const jahr of [2026, 2027, 2028, 2029]) {
      const z = reihe.find((zz) => zz.jahr === jahr)!;
      expect(z.eigenmietwertJahr).toBe(18_080);
      // Solange Eigenheim vorhanden ist UND vor 2030 → Schuldzinsabzug = ausgabenHypozins
      expect(z.schuldzinsenAbzug).toBe(z.ausgabenHypozins);
    }
  });

  // ─── 5. Reform 2030: EMW + Schuldzinsabzug entfallen ────────────
  it("Reform 2030: EMW = 0 UND schuldzinsenAbzug = 0 (auch wenn Hypothek noch läuft)", () => {
    for (const jahr of [2030, 2031, 2032, 2033, 2034, 2035]) {
      const z = reihe.find((zz) => zz.jahr === jahr)!;
      expect(z.eigenmietwertJahr).toBe(0);
      expect(z.schuldzinsenAbzug).toBe(0);
    }
  });

  // ─── 6. Hypozins läuft normal weiter ab 2030 ────────────────────
  it("Hypozins-Cashflow läuft auch nach Reform 2030 normal weiter (ausgabenHypozins = 19'100)", () => {
    // Reform schafft nur den Steuer-Abzug ab — die Zinsen selbst zahlt
    // man weiterhin an die Bank.
    for (const jahr of [2030, 2031, 2032, 2033, 2034, 2035]) {
      const z = reihe.find((zz) => zz.jahr === jahr)!;
      expect(z.ausgabenHypozins).toBe(19_100);
    }
  });

  // ─── 7. Tranche-Ablauf 2028 (C) wirkt NICHT auto-tilgend ────────
  it("Tranche C Ablauf 2028: kein Auto-Tilgungs-Effekt — Engine ignoriert ablaufjahr", () => {
    // Die Engine-Vereinfachung: hypothekenZinsenJahr und immobilienBilanz
    // ignorieren ablaufjahr. Tranchen laufen weiter, bis die Liegenschaft
    // verkauft wird. Dokumentiert hier — Erneuerung/Refinanzierung ist
    // (noch) nicht modelliert.
    const z2027 = reihe.find((z) => z.jahr === 2027)!;
    const z2028 = reihe.find((z) => z.jahr === 2028)!;
    const z2029 = reihe.find((z) => z.jahr === 2029)!;
    expect(z2027.vermoegenSchulden).toBe(1_100_000);
    expect(z2028.vermoegenSchulden).toBe(1_100_000);
    expect(z2029.vermoegenSchulden).toBe(1_100_000);
    expect(z2027.ausgabenHypozins).toBe(19_100);
    expect(z2028.ausgabenHypozins).toBe(19_100);
    expect(z2029.ausgabenHypozins).toBe(19_100);
  });

  // ─── 8. Tranche-Ablauf 2030 (A) und 2032 (B): kein Auto-Effekt ──
  it("Tranche A (2030) + Tranche B (2032) Ablauf: kein Auto-Tilgungs-Effekt", () => {
    const z2030 = reihe.find((z) => z.jahr === 2030)!;
    const z2032 = reihe.find((z) => z.jahr === 2032)!;
    const z2033 = reihe.find((z) => z.jahr === 2033)!;
    expect(z2030.vermoegenSchulden).toBe(1_100_000);
    expect(z2032.vermoegenSchulden).toBe(1_100_000);
    expect(z2033.vermoegenSchulden).toBe(1_100_000);
    expect(z2030.ausgabenHypozins).toBe(19_100);
    expect(z2032.ausgabenHypozins).toBe(19_100);
    expect(z2033.ausgabenHypozins).toBe(19_100);
  });

  // ─── 9. Belehnung-Quote 1.1M / 1.6M = 68.75% (innerhalb 80% Grenze) ─
  it("Belehnungsquote 2026 = hypothekTotal / verkehrswert = 1.1M / 1.6M = 68.75% (< 80% Grenze)", () => {
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    // Engine reportet keine Quote direkt — wir rechnen sie nach
    const verkehrswert = 1_600_000;
    const quote = z2026.vermoegenSchulden / verkehrswert;
    expect(quote).toBeCloseTo(0.6875, 4);
    expect(quote).toBeLessThan(0.8);
  });

  // ─── 10. vermoegenImmobilien 2026 = 1'600'000 (Wertsteigerung 0%) ─
  it("vermoegenImmobilien 2026 = 1'600'000 (einzige Liegenschaft, keine Wertsteigerung)", () => {
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    expect(z2026.vermoegenImmobilien).toBe(1_600_000);
  });

  // ─── 11. vermoegenImmobilien stabil über gesamten Zeitraum ──────
  it("vermoegenImmobilien stabil 1'600'000 von 2026-2035 (behalten + Wertsteigerung 0%)", () => {
    for (const jahr of [2026, 2029, 2030, 2032, 2035]) {
      const z = reihe.find((zz) => zz.jahr === jahr)!;
      expect(z.vermoegenImmobilien).toBe(1_600_000);
    }
  });

  // ─── 12. Hypothek konstant 1'100'000 über gesamten Zeitraum ─────
  it("vermoegenSchulden konstant 1'100'000 von 2026-2035 (keine Sondertilgungen)", () => {
    for (const z of reihe) {
      expect(z.vermoegenSchulden).toBe(1_100_000);
    }
  });

  // ─── 13. Hypozins konstant 19'100 über gesamten Zeitraum ────────
  it("ausgabenHypozins konstant 19'100 von 2026-2035 (Engine-Vereinfachung: keine Zins-Reset bei Ablauf)", () => {
    for (const z of reihe) {
      expect(z.ausgabenHypozins).toBe(19_100);
    }
  });

  // ─── 14. Übergang 2029 → 2030: nur Steuer-Effekt, kein Cashflow-Effekt ─
  it("Übergang 2029 → 2030: EMW + Abzug fallen, Hypozins-Cashflow unverändert", () => {
    const z2029 = reihe.find((z) => z.jahr === 2029)!;
    const z2030 = reihe.find((z) => z.jahr === 2030)!;

    // EMW + Schuldzinsabzug brechen ab
    expect(z2029.eigenmietwertJahr).toBe(18_080);
    expect(z2030.eigenmietwertJahr).toBe(0);
    expect(z2029.schuldzinsenAbzug).toBeGreaterThan(0);
    expect(z2030.schuldzinsenAbzug).toBe(0);

    // Cashflow-Hypozins bleibt identisch (zahlt man der Bank weiter)
    expect(z2029.ausgabenHypozins).toBe(z2030.ausgabenHypozins);
    expect(z2030.ausgabenHypozins).toBe(19_100);

    // Steuerbelastung sollte tendenziell steigen (EMW weg ist netto-positiv,
    // aber Schuldzinsabzug auch weg — bei hoher Hypothek meist netto Mehrlast)
    // Wir prüfen nur, dass die Engine sinnvolle Werte liefert
    expect(z2030.ausgabenSteuern).toBeGreaterThan(0);
  });
});

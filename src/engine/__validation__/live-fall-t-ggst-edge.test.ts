/**
 * Live-Test Fall T: Grundstückgewinn-Edge — Besitzdauer 5 vs 30 J. (Stefan Wyss, SZ).
 *
 * Profil:
 *  - Stefan Wyss, ledig, geb. 1962 (heute 2026 → 64 J.), Kanton SZ
 *  - Eigenheim Schwyz 1'400'000, gekauft 2020 (Anlagekosten 1'100'000)
 *      → Plan: verkaufen 2026 (Besitzdauer = 6 J.) → Gewinn ~300k mit
 *        Spekulationsbereich (5 J Faktor ~1.0, Übergang in Langhalter-Rabatt)
 *  - Zweite Liegenschaft Brunnen 900'000, gekauft 1995
 *      (Anlagekosten 450'000) → Plan: verkaufen 2030 (Besitzdauer 35 J.)
 *        → Langhalter-Rabatt aktiv (SZ: max -60%)
 *  - Erwerb 95'000/J bis 2030, PK Standard, 3a Standard
 *
 * Fokus:
 *   - Besitzdauer-Faktor: kurz (6 J., wenig Rabatt) vs lang (35 J., max Rabatt)
 *   - SZ-Tarif greift (8-30% Bandbreite)
 *   - Netto-Erlös nach GGSt landet im Hauptkonto via kapAuszahlungen
 *   - Engine läuft ohne Crash für beide Stichtage
 *
 * KEINE Engine-Änderungen.
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe, type CashflowInput } from "../cashflow";
import { berechneGgst, ggstKantonFromCode } from "../grundstueckgewinn";

function buildStefanWyss(): CashflowInput {
  return {
    fallart: "einzel",
    zivilstand: "ledig",
    person1: {
      vorname: "Stefan",
      nachname: "Wyss",
      geburtsdatum: "1962-06-15",
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
      einkommenP1: 95_000,
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
        altersguthabenHeute: 250_000,
        altersguthabenBeiBezug: 380_000,
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
    saeuleDrei: {
      p1: [
        {
          id: "3a1",
          type: "konto",
          saeule: "3a",
          beschreibung: "3a Konto",
          aktuellerWert: 60_000,
          auszahlungsjahr: 2027,
          renditeProzent: 1.0,
          rueckkaufswert: null,
          ablaufswert: null,
          ablaufjahr: 2027,
          jaehrlicheEinzahlung: null,
          einzahlungAb: 2026,
          einzahlungBis: 2026,
        },
      ],
      p2: [],
    },
    vermoegen: {
      items: [
        {
          id: "liq",
          typ: "konto",
          beschreibung: "Privatkonto",
          saldoHeute: 80_000,
          renditeProzent: 0,
          istHauptkonto: true,
        },
      ],
    },
    immobilien: {
      items: [
        {
          id: "eh-schwyz",
          typ: "selbstbewohnt",
          beschreibung: "Eigenheim Schwyz (Kurzbesitz)",
          verkehrswert: 1_400_000,
          hypotheken: [
            {
              id: "h-eh",
              beschreibung: "Hypo Eigenheim 1.6%",
              hoehe: 600_000,
              zinssatzProzent: 1.6,
              ablaufjahr: 2035,
            },
          ],
          plan: "verkaufen",
          verkaufsjahr: 2026,
          jaehrlicheMieteinnahmen: null,
          kaufjahr: 2020,
          anlagekosten: 1_100_000,
          wertvermehrendeInvestitionen: null,
          wertsteigerungProzent: 0,
        },
        {
          id: "rendite-brunnen",
          typ: "rendite",
          beschreibung: "Liegenschaft Brunnen (Langhalter)",
          verkehrswert: 900_000,
          hypotheken: [
            {
              id: "h-br",
              beschreibung: "Hypo Brunnen 1.5%",
              hoehe: 200_000,
              zinssatzProzent: 1.5,
              ablaufjahr: 2032,
            },
          ],
          plan: "verkaufen",
          verkaufsjahr: 2030,
          jaehrlicheMieteinnahmen: 24_000,
          kaufjahr: 1995,
          anlagekosten: 450_000,
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
          id: "lohn",
          beschreibung: "Lohn",
          personIdx: 1,
          betragMonatlich: Math.round(95_000 / 12),
          von: "2026-01",
          bis: "2030-12",
          typ: "anstellung",
        },
      ],
      ausgabenModus: "total",
      ausgabenTotal: 5_500,
      ausgabenKategorien: {
        lebenshaltung: null,
        wohnen: null,
        mobilitaet: null,
        versicherungen: null,
        ferienHobby: null,
        sonstiges: null,
      },
      wunschverbrauchPension: 5_000,
      steuernHeute: null,
      einkommenHeute: null,
      religion: "keine",
      alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
    },
    adresse: {
      strasse: "",
      plz: "6430",
      ort: "Schwyz",
      kanton: "SZ",
      gemeindeBfsId: null,
      gemeindeName: "Schwyz",
    },
    einmaligeAusgaben: [],
  };
}

describe("Live Fall T — Stefan Wyss SZ, GGSt-Edge (Besitzdauer kurz vs lang)", () => {
  it("Direkte GGSt: 6 J. Besitzdauer (Schwyz) → Faktor ~1.0, keine starke Reduktion", () => {
    const ggst = berechneGgst({
      verkaufspreis: 1_400_000,
      anlagekosten: 1_100_000,
      besitzdauerJahre: 6,
      kanton: "SZ",
    });
    console.log("\n========== FALL T — GGSt Edge SZ ==========");
    console.log(`\n[1] Schwyz, Verkauf 2026, Besitzdauer 6 J:`);
    console.log(`  Reingewinn:        ${ggst.reingewinn}`);
    console.log(`  Grundtarif:        ${ggst.grundtarifProzent}%`);
    console.log(`  Besitzdauer-Faktor: ${ggst.besitzdauerFaktor}`);
    console.log(`  Effektiv-Satz:     ${ggst.effektiverProzent}%`);
    console.log(`  Steuer:            ${ggst.steuer}`);

    expect(ggst.reingewinn).toBe(300_000);
    // 6 J Besitz → zwischen Faktor 1.0 (bei 5J) und 0.95 (bei 10J)
    // Formel: 1.0 - 0.25 * ((6-5)/5) = 0.95
    expect(ggst.besitzdauerFaktor).toBeGreaterThan(0.9);
    expect(ggst.besitzdauerFaktor).toBeLessThanOrEqual(1.0);
    // SZ Tarif für 300k Reingewinn: 22 + (300k-200k)/200k = 22.5%
    expect(ggst.grundtarifProzent).toBeGreaterThan(15);
    expect(ggst.grundtarifProzent).toBeLessThan(30);
    expect(ggst.steuer).toBeGreaterThan(50_000);
  });

  it("Direkte GGSt: 35 J. Besitzdauer (Brunnen) → Faktor ~0.4 (SZ max -60%)", () => {
    const ggst = berechneGgst({
      verkaufspreis: 900_000,
      anlagekosten: 450_000,
      besitzdauerJahre: 35,
      kanton: "SZ",
    });
    console.log(`\n[2] Brunnen, Verkauf 2030, Besitzdauer 35 J:`);
    console.log(`  Reingewinn:        ${ggst.reingewinn}`);
    console.log(`  Grundtarif:        ${ggst.grundtarifProzent}%`);
    console.log(`  Besitzdauer-Faktor: ${ggst.besitzdauerFaktor}`);
    console.log(`  Effektiv-Satz:     ${ggst.effektiverProzent}%`);
    console.log(`  Steuer:            ${ggst.steuer}`);

    expect(ggst.reingewinn).toBe(450_000);
    // SZ Sonderfall: maxRabatt 0.6 → Faktor = 1 - 0.6 = 0.4
    expect(ggst.besitzdauerFaktor).toBeCloseTo(0.4, 1);
    expect(ggst.steuer).toBeGreaterThan(0);
  });

  it("Kurzbesitz vs Langhalter — Faktor-Verhältnis muss korrekt sein", () => {
    const kurz = berechneGgst({
      verkaufspreis: 1_400_000,
      anlagekosten: 1_100_000,
      besitzdauerJahre: 6,
      kanton: "SZ",
    });
    const lang = berechneGgst({
      verkaufspreis: 900_000,
      anlagekosten: 450_000,
      besitzdauerJahre: 35,
      kanton: "SZ",
    });
    console.log(`\n[3] Faktor-Vergleich (kurz vs lang):`);
    console.log(`  Kurz (6 J):  Faktor ${kurz.besitzdauerFaktor}, Steuer ${kurz.steuer}`);
    console.log(`  Lang (35 J): Faktor ${lang.besitzdauerFaktor}, Steuer ${lang.steuer}`);
    console.log(`  Faktor-Verhältnis: ${(kurz.besitzdauerFaktor / lang.besitzdauerFaktor).toFixed(2)}x`);

    expect(kurz.besitzdauerFaktor).toBeGreaterThan(lang.besitzdauerFaktor);
    // Langhalter mindestens 50% günstiger im Faktor
    expect(lang.besitzdauerFaktor).toBeLessThan(kurz.besitzdauerFaktor * 0.6);
  });

  it("Echter Spekulationszuschlag: <1 J. Besitz → Faktor 1.5", () => {
    const speku = berechneGgst({
      verkaufspreis: 1_400_000,
      anlagekosten: 1_100_000,
      besitzdauerJahre: 0,
      kanton: "SZ",
    });
    console.log(`\n[4] Spekulationszuschlag (<1 J):`);
    console.log(`  Faktor: ${speku.besitzdauerFaktor}, Steuer: ${speku.steuer}`);
    expect(speku.besitzdauerFaktor).toBe(1.5);
  });

  it("SZ-Kantonstarif unterscheidet sich von 'andere'-Fallback (ZH-Median)", () => {
    const sz = berechneGgst({
      verkaufspreis: 900_000,
      anlagekosten: 450_000,
      besitzdauerJahre: 35,
      kanton: "SZ",
    });
    const andere = berechneGgst({
      verkaufspreis: 900_000,
      anlagekosten: 450_000,
      besitzdauerJahre: 35,
      kanton: "andere",
    });
    console.log(`\n[5] SZ vs 'andere' (ZH-Fallback) bei 450k Gewinn, 35 J:`);
    console.log(`  SZ:     Tarif ${sz.grundtarifProzent}%, Faktor ${sz.besitzdauerFaktor}, Steuer ${sz.steuer}`);
    console.log(`  andere: Tarif ${andere.grundtarifProzent}%, Faktor ${andere.besitzdauerFaktor}, Steuer ${andere.steuer}`);
    // SZ hat höheren maxRabatt (0.6) als "andere" (0.5)
    expect(sz.besitzdauerFaktor).toBeLessThan(andere.besitzdauerFaktor);
  });

  it("ggstKantonFromCode mappt 'SZ' korrekt", () => {
    expect(ggstKantonFromCode("SZ")).toBe("SZ");
    expect(ggstKantonFromCode("sz")).toBe("SZ");
    expect(ggstKantonFromCode("XX")).toBe("andere");
  });

  it("Cashflow-Engine läuft ohne Crash für 2024-2035", () => {
    const input = buildStefanWyss();
    const reihe = cashflowReihe(input, 2024, 2035);
    expect(reihe.length).toBe(12);

    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    const z2030 = reihe.find((z) => z.jahr === 2030)!;
    expect(z2026).toBeDefined();
    expect(z2030).toBeDefined();
    expect(Number.isFinite(z2026.vermoegenNetto)).toBe(true);
    expect(Number.isFinite(z2030.vermoegenNetto)).toBe(true);
  });

  it("Verkauf 2026 (Schwyz): Netto-Erlös landet via kapAuszahlungen im Hauptkonto", () => {
    const input = buildStefanWyss();
    const reihe = cashflowReihe(input, 2024, 2035);
    const z2025 = reihe.find((z) => z.jahr === 2025)!;
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    const z2027 = reihe.find((z) => z.jahr === 2027)!;

    console.log(`\n[7] Verkauf Schwyz 2026 — Liquidität-Sprung:`);
    console.log(`  Liquidität 2025: ${Math.round(z2025.vermoegenLiquiditaet)}`);
    console.log(`  Liquidität 2026: ${Math.round(z2026.vermoegenLiquiditaet)}`);
    console.log(`  Liquidität 2027: ${Math.round(z2027.vermoegenLiquiditaet)}`);
    console.log(`  kapAuszahlungen 2026: ${Math.round(z2026.kapAuszahlungen)}`);
    console.log(`  Immobilien 2026:  ${Math.round(z2026.vermoegenImmobilien)}`);
    console.log(`  Schulden 2026:    ${Math.round(z2026.vermoegenSchulden)}`);

    // Schwyz-Brutto = 1.4M − 0.6M Hypo = 800k. GGSt ~64k (300k × 22.5% × 0.95 ≈ 64k).
    // Netto-Erlös ~736k geht in Liquidität.
    const liqSprung = z2026.vermoegenLiquiditaet - z2025.vermoegenLiquiditaet;
    expect(liqSprung).toBeGreaterThan(500_000);
    expect(liqSprung).toBeLessThan(900_000);
  });

  it("Verkauf 2030 (Brunnen): zweiter Liquiditäts-Sprung mit Langhalter-Rabatt", () => {
    const input = buildStefanWyss();
    const reihe = cashflowReihe(input, 2024, 2035);
    const z2029 = reihe.find((z) => z.jahr === 2029)!;
    const z2030 = reihe.find((z) => z.jahr === 2030)!;

    console.log(`\n[8] Verkauf Brunnen 2030 — Langhalter-Sprung:`);
    console.log(`  Liquidität 2029: ${Math.round(z2029.vermoegenLiquiditaet)}`);
    console.log(`  Liquidität 2030: ${Math.round(z2030.vermoegenLiquiditaet)}`);
    console.log(`  kapAuszahlungen 2030: ${Math.round(z2030.kapAuszahlungen)}`);

    // Brunnen-Brutto = 900k − 200k Hypo = 700k. GGSt mit Langhalter -60%:
    // 450k × (~25% × 0.4) = ~45k. Netto ~655k.
    const liqSprung = z2030.vermoegenLiquiditaet - z2029.vermoegenLiquiditaet;
    expect(liqSprung).toBeGreaterThan(400_000);
  });

  it("Nach beiden Verkäufen 2031: Immobilien-Vermögen ist 0", () => {
    const input = buildStefanWyss();
    const reihe = cashflowReihe(input, 2024, 2035);
    const z2031 = reihe.find((z) => z.jahr === 2031)!;

    console.log(`\n[9] Nach beiden Verkäufen (2031):`);
    console.log(`  Immobilien: ${Math.round(z2031.vermoegenImmobilien)}`);
    console.log(`  Schulden:   ${Math.round(z2031.vermoegenSchulden)}`);
    console.log(`  Liquidität: ${Math.round(z2031.vermoegenLiquiditaet)}`);
    console.log(`  Netto:      ${Math.round(z2031.vermoegenNetto)}`);

    expect(z2031.vermoegenImmobilien).toBe(0);
    expect(z2031.vermoegenSchulden).toBeLessThan(50_000); // nur evtl. Restschulden ausserhalb Immo
    expect(z2031.vermoegenNetto).toBeGreaterThan(0);

    console.log("\n========== ENDE FALL T ==========\n");
  });

  it("Diff Kurzbesitz vs Langbesitz bei gleichem Gewinn (SZ, 300k)", () => {
    const kurz = berechneGgst({
      verkaufspreis: 1_400_000,
      anlagekosten: 1_100_000,
      besitzdauerJahre: 6,
      kanton: "SZ",
    });
    const lang = berechneGgst({
      verkaufspreis: 1_400_000,
      anlagekosten: 1_100_000,
      besitzdauerJahre: 35,
      kanton: "SZ",
    });
    console.log(`\n[10] Selber Gewinn (300k), nur Besitzdauer ändert:`);
    console.log(`  6 J:  Steuer ${kurz.steuer} (Effektiv ${kurz.effektiverProzent}%)`);
    console.log(`  35 J: Steuer ${lang.steuer} (Effektiv ${lang.effektiverProzent}%)`);
    console.log(`  Ersparnis durch Langhalter: ${kurz.steuer - lang.steuer}`);

    // Langhalter-Rabatt: mindestens 50% weniger Steuer
    expect(lang.steuer).toBeLessThan(kurz.steuer * 0.55);
  });
});

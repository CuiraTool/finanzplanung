/**
 * Live-Test Fall X: Vermögensverlauf jahresweise mit kombiniertem Asset-Mix.
 *
 * Profil (Daniel Kunz — Multi-Asset Berater-Case):
 *  - Ledig, geb. 1968-04-12 (heute 2026 → 58 J.)
 *  - Kanton SG, St. Gallen
 *  - Anstellung 220'000/J bis Pension 2033 (65)
 *  - Vermögen:
 *      Liquidität (Hauptkonto)  380'000 (0% Rendite)
 *      Depot Wertschriften      520'000 (3% Rendite, Compound)
 *      Säule 3a Konto            95'000 (Ablauf 2033)
 *  - PK aktiv: AG-Heute 480k, AG-bei-Bezug 720k, UWS 5.5%, Mix 50/50 (Rente+Kapital)
 *  - Eigenheim St. Gallen     1'400'000 (Kauf 2010, behalten, Wertsteigerung 0%)
 *      Hypothek                 600'000 @ 1.6%, Ablauf 2030
 *  - Renditeliegenschaft Wil    750'000 (Kauf 2018, behalten, Wertsteigerung 0%)
 *      Hypothek                 380'000 @ 1.8%, Mieten 32'000/J
 *  - Firma: Einzelfirma "Kunz Consulting", möglicherVerkaufserlös 600'000,
 *      plan="verkaufen", Verkaufsjahr 2033 (mit Pension)
 *
 * WICHTIG: Engine NICHT verändern, nur testen.
 *
 * Engine-Limit (dokumentiert in CLAUDE.md): Hypothek-Tilgung / Amortisation
 * ist NICHT modelliert. Hypothek-Tranchen bleiben konstant auf ihrer Höhe,
 * unabhängig vom Ablaufjahr. Die im Profil erwähnten Tilgungen 2031 (→500k)
 * und 2035 (→400k) sind daher nicht testbar — wir validieren stattdessen
 * den konstanten Hypothek-Stand und dokumentieren das Limit.
 *
 * Was wir testen (jahresweise):
 *  1. Engine läuft 2026-2045 ohne Crash, keine NaN
 *  2. vermoegenLiquiditaet 2026/2030/2033/2040 — Erwerbsphase wächst,
 *     Pensionsjahr 2033 Kapitalauszahlungen-Boost, danach Verbrauch
 *  3. vermoegenWertschriften 2026/2030/2040 — Depot wächst mit 3% Compound
 *     520k → 520k×1.03^4 ≈ 585k (2030) → 520k×1.03^14 ≈ 786k (2040)
 *  4. vermoegenVorsorge 2026/2032/2033 — PK + 3a wachsen bis Bezugsjahr,
 *     ab 2033 = 0 (alles ausgezahlt)
 *  5. vermoegenImmobilien 2026/2033/2040 — 1'400k + 750k = 2'150k konstant
 *     (Wertsteigerung 0%, beide behalten)
 *  6. vermoegenFirma 2026/2032/2033 — 600k bis 2032, 0 ab 2033 (Verkauf)
 *  7. vermoegenSchulden 2026/2031/2035 — 980k konstant (Tilgung NICHT modelliert,
 *     dokumentiertes Engine-Limit)
 *  8. vermoegenNetto 2026 — Aktiva − Schulden Konsistenz-Check
 *  9. kapAuszahlungen 2033 — 3a + PK-Kapital 50% (~360k) + Firma 600k ≈ 1.1M
 * 10. saldo positiv in Erwerbsphase, negativ nach Pension
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe, type CashflowInput } from "../cashflow";

function buildDanielKunz(): CashflowInput {
  return {
    fallart: "einzel",
    zivilstand: "ledig",
    person1: {
      vorname: "Daniel",
      nachname: "Kunz",
      geburtsdatum: "1968-04-12",
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
      einkommenP1: 220_000,
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
        altersguthabenHeute: 480_000,
        altersguthabenBeiBezug: 720_000,
        umwandlungssatzProzent: 5.5,
        bezugspraeferenz: "mischung",
        kapitalanteil: 50,
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
          id: "3a-dk",
          type: "konto",
          saeule: "3a",
          beschreibung: "Säule 3a Konto",
          aktuellerWert: 95_000,
          auszahlungsjahr: 2033,
          renditeProzent: 1.0,
          rueckkaufswert: null,
          ablaufswert: null,
          ablaufjahr: 2033,
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
          id: "v-liq",
          typ: "konto",
          beschreibung: "Privatkonto Hauptkonto",
          saldoHeute: 380_000,
          renditeProzent: 0,
          istHauptkonto: true,
        },
        {
          id: "v-depot",
          typ: "depot",
          beschreibung: "Wertschriften-Depot",
          saldoHeute: 520_000,
          renditeProzent: 3.0,
          istHauptkonto: false,
        },
      ],
    },
    immobilien: {
      items: [
        {
          id: "eh-sg",
          beschreibung: "Eigenheim St. Gallen",
          typ: "selbstbewohnt",
          verkehrswert: 1_400_000,
          hypotheken: [
            {
              id: "h-sg",
              beschreibung: "Hypothek Eigenheim",
              hoehe: 600_000,
              zinssatzProzent: 1.6,
              ablaufjahr: 2030,
            },
          ],
          plan: "behalten",
          verkaufsjahr: 2060,
          jaehrlicheMieteinnahmen: null,
          kaufjahr: 2010,
          anlagekosten: 1_100_000,
          wertvermehrendeInvestitionen: null,
          wertsteigerungProzent: 0,
        },
        {
          id: "rl-wil",
          beschreibung: "Renditeliegenschaft Wil",
          typ: "rendite",
          verkehrswert: 750_000,
          hypotheken: [
            {
              id: "h-wil",
              beschreibung: "Hypothek Wil",
              hoehe: 380_000,
              zinssatzProzent: 1.8,
              ablaufjahr: 2033,
            },
          ],
          plan: "behalten",
          verkaufsjahr: 2060,
          jaehrlicheMieteinnahmen: 32_000,
          kaufjahr: 2018,
          anlagekosten: 650_000,
          wertvermehrendeInvestitionen: null,
          wertsteigerungProzent: 0,
        },
      ],
    },
    firma: {
      vorhanden: true,
      firmenname: "Kunz Consulting",
      moeglicherVerkaufserloes: 600_000,
      plan: "verkaufen",
      verkaufsjahr: 2033,
    },
    ziele: { bezugsalterP1: 65, bezugsalterP2: 65 },
    budget: {
      einkommen: [
        {
          id: "ek-dk",
          beschreibung: "Daniel — Anstellung",
          personIdx: 1,
          // 220'000 / 12 = 18'333.33 → wir nehmen 18'333 (Round-Diff toleriert)
          betragMonatlich: Math.round(220_000 / 12),
          von: "2026-01",
          bis: "2033-04",
          typ: "anstellung",
        },
      ],
      ausgabenModus: "total",
      ausgabenTotal: 9_500, // 114k/J
      ausgabenKategorien: {
        lebenshaltung: null,
        wohnen: null,
        mobilitaet: null,
        versicherungen: null,
        ferienHobby: null,
        sonstiges: null,
      },
      wunschverbrauchPension: 8_000, // 96k/J in Pension
      steuernHeute: null,
      einkommenHeute: null,
      religion: "keine",
      alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
    },
    adresse: {
      strasse: "Multergasse 1",
      plz: "9000",
      ort: "St. Gallen",
      kanton: "SG",
      gemeindeBfsId: null,
      gemeindeName: "St. Gallen",
    },
    einmaligeAusgaben: [],
  };
}

describe("Live-Fall X — Daniel Kunz SG (Multi-Asset Vermögensverlauf)", () => {
  const input = buildDanielKunz();
  const reihe = cashflowReihe(input, 2026, 2045);

  // ─── 1. Engine läuft 2026-2045 ohne Crash ───────────────────────
  it("liefert eine Reihe für 2026-2045 (20 Jahre), keine NaN", () => {
    expect(reihe).toHaveLength(20);
    expect(reihe[0]!.jahr).toBe(2026);
    expect(reihe[19]!.jahr).toBe(2045);
    for (const z of reihe) {
      expect(Number.isFinite(z.einnahmenTotal)).toBe(true);
      expect(Number.isFinite(z.vermoegenNetto)).toBe(true);
      expect(Number.isFinite(z.vermoegenLiquiditaet)).toBe(true);
      expect(Number.isFinite(z.vermoegenWertschriften)).toBe(true);
      expect(Number.isFinite(z.vermoegenVorsorge)).toBe(true);
      expect(Number.isFinite(z.vermoegenImmobilien)).toBe(true);
      expect(Number.isFinite(z.vermoegenFirma)).toBe(true);
      expect(Number.isFinite(z.vermoegenSchulden)).toBe(true);
      expect(z.ausgabenSteuern).toBeGreaterThanOrEqual(0);
    }
  });

  // ─── 2a. vermoegenLiquiditaet 2026 (Erwerbsphase, kleiner Sparbetrag) ─
  it("vermoegenLiquiditaet 2026 ≥ 380k (Anfang Erwerbsphase, Saldo positiv)", () => {
    const z = reihe.find((zz) => zz.jahr === 2026)!;
    // Start 380k, Saldo positiv (Erwerb 220k − Ausgaben 114k − Steuern − Sozial)
    expect(z.vermoegenLiquiditaet).toBeGreaterThan(380_000);
    expect(z.vermoegenLiquiditaet).toBeLessThan(500_000);
  });

  // ─── 2b. vermoegenLiquiditaet 2030 (mitten in Erwerbsphase) ──────
  it("vermoegenLiquiditaet 2030 > 2026 (monotones Wachstum durch Sparen)", () => {
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    const z2030 = reihe.find((z) => z.jahr === 2030)!;
    expect(z2030.vermoegenLiquiditaet).toBeGreaterThan(z2026.vermoegenLiquiditaet);
  });

  // ─── 2c. vermoegenLiquiditaet 2033 (Pensions-Jahr — Kapital-Boost) ─
  it("vermoegenLiquiditaet 2033 ≫ 2032 (PK-Kapital + 3a + Firma fliessen rein)", () => {
    const z2032 = reihe.find((z) => z.jahr === 2032)!;
    const z2033 = reihe.find((z) => z.jahr === 2033)!;
    // Erwarteter Sprung: 3a-Saldo (~100k) + PK-Kapital 50% (~360k) + Firma 600k
    // ≈ 1.0M brutto, minus Kapital-Steuern ~80-150k → netto ~850k+
    const sprung = z2033.vermoegenLiquiditaet - z2032.vermoegenLiquiditaet;
    expect(sprung).toBeGreaterThan(700_000);
  });

  // ─── 2d. vermoegenLiquiditaet 2040 (post-Pension, Verbrauchsphase) ─
  it("vermoegenLiquiditaet 2040 < 2033 (Wunschverbrauch zehrt Liquidität)", () => {
    const z2033 = reihe.find((z) => z.jahr === 2033)!;
    const z2040 = reihe.find((z) => z.jahr === 2040)!;
    // Saldo nach Pension ist negativ → Liquidität sinkt
    expect(z2040.vermoegenLiquiditaet).toBeLessThan(z2033.vermoegenLiquiditaet);
  });

  // ─── 3a. vermoegenWertschriften 2026 — Depot startet mit 520k ────
  it("vermoegenWertschriften 2026 ≈ 520k × 1.03 = 535.6k (1 Jahr Compound)", () => {
    const z = reihe.find((zz) => zz.jahr === 2026)!;
    // Engine verzinst Depot in Block 7 jährlich mit 3% — nach 1 Jahr ≈ 535'600
    expect(z.vermoegenWertschriften).toBeGreaterThan(530_000);
    expect(z.vermoegenWertschriften).toBeLessThan(545_000);
  });

  // ─── 3b. vermoegenWertschriften 2030 — Compound 5 Jahre ──────────
  it("vermoegenWertschriften 2030 ≈ 520k × 1.03^5 = 602.8k (Compound 5J)", () => {
    const z = reihe.find((zz) => zz.jahr === 2030)!;
    // 520'000 × 1.03^5 = 602'765
    expect(z.vermoegenWertschriften).toBeGreaterThan(580_000);
    expect(z.vermoegenWertschriften).toBeLessThan(625_000);
  });

  // ─── 3c. vermoegenWertschriften 2040 — Compound 15 Jahre ─────────
  it("vermoegenWertschriften 2040 ≈ 520k × 1.03^15 = 810k (Compound 15J)", () => {
    const z = reihe.find((zz) => zz.jahr === 2040)!;
    // 520'000 × 1.03^15 = 810'041
    expect(z.vermoegenWertschriften).toBeGreaterThan(770_000);
    expect(z.vermoegenWertschriften).toBeLessThan(850_000);
  });

  // ─── 4a. vermoegenVorsorge 2026 — PK + 3a noch da ────────────────
  it("vermoegenVorsorge 2026: PK 480k + 3a 95k + Hochlauf ≈ 580-620k", () => {
    const z = reihe.find((zz) => zz.jahr === 2026)!;
    // PK 480'000 (linearer Hochlauf), 3a 95'000 mit 1% Rendite
    expect(z.vermoegenVorsorge).toBeGreaterThan(560_000);
    expect(z.vermoegenVorsorge).toBeLessThan(640_000);
  });

  // ─── 4b. vermoegenVorsorge 2032 — kurz vor Bezug, fast bei beiBezug ─
  it("vermoegenVorsorge 2032 > 2026 (linearer PK-Hochlauf 480→720k)", () => {
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    const z2032 = reihe.find((z) => z.jahr === 2032)!;
    expect(z2032.vermoegenVorsorge).toBeGreaterThan(z2026.vermoegenVorsorge);
    // 2032 ist ein Jahr vor Bezug — PK fast bei 720k + 3a-Saldo
    expect(z2032.vermoegenVorsorge).toBeGreaterThan(700_000);
    expect(z2032.vermoegenVorsorge).toBeLessThan(850_000);
  });

  // ─── 4c. vermoegenVorsorge 2033 = 0 (alles ausgezahlt) ───────────
  it("vermoegenVorsorge 2033 = 0 (PK-Kapital + 3a beide ausgezahlt)", () => {
    const z = reihe.find((zz) => zz.jahr === 2033)!;
    // Rente-Anteil bleibt nicht als Vermögen — wird als jährliche Rente konsumiert
    // Kapital-Anteil und 3a fliessen in kapAuszahlungen → Liquidität
    expect(z.vermoegenVorsorge).toBeLessThan(50_000);
  });

  // ─── 5a. vermoegenImmobilien 2026 = 2'150k (Sicht-Wert) ──────────
  it("vermoegenImmobilien 2026 = 1'400k + 750k = 2'150k (Wertsteigerung 0%)", () => {
    const z = reihe.find((zz) => zz.jahr === 2026)!;
    expect(z.vermoegenImmobilien).toBe(2_150_000);
  });

  // ─── 5b. vermoegenImmobilien konstant 2026/2033/2040 ─────────────
  it("vermoegenImmobilien konstant: 2026 = 2033 = 2040 = 2'150k (behalten + 0%)", () => {
    const j = [2026, 2033, 2040];
    for (const y of j) {
      const z = reihe.find((zz) => zz.jahr === y)!;
      expect(z.vermoegenImmobilien).toBe(2_150_000);
    }
  });

  // ─── 6a. vermoegenFirma 2026/2032 = 600k (noch da) ───────────────
  it("vermoegenFirma 2026 + 2032 = 600k (Firma gehalten bis Verkauf 2033)", () => {
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    const z2032 = reihe.find((z) => z.jahr === 2032)!;
    expect(z2026.vermoegenFirma).toBe(600_000);
    expect(z2032.vermoegenFirma).toBe(600_000);
  });

  // ─── 6b. vermoegenFirma 2033 = 0 (verkauft, Erlös in Liquidität) ─
  it("vermoegenFirma 2033 = 0 (Verkauf — Erlös wandert in vermoegenLiquiditaet)", () => {
    const z = reihe.find((zz) => zz.jahr === 2033)!;
    expect(z.vermoegenFirma).toBe(0);
  });

  // ─── 7a. vermoegenSchulden 2026 = 980k (600k + 380k Hypotheken) ──
  it("vermoegenSchulden 2026 = 600k + 380k = 980k (Σ Hypotheken)", () => {
    const z = reihe.find((zz) => zz.jahr === 2026)!;
    expect(z.vermoegenSchulden).toBe(980_000);
  });

  // ─── 7b. Engine-Limit: Hypothek-Tilgung NICHT modelliert ─────────
  it("DOKU: vermoegenSchulden 2031 + 2035 = 980k konstant — Tilgung nicht modelliert", () => {
    const z2031 = reihe.find((z) => z.jahr === 2031)!;
    const z2035 = reihe.find((z) => z.jahr === 2035)!;
    // Profil-Idee Tilgung 2031 (→880k) + 2035 (→780k) ist nicht testbar:
    // Engine kennt nur statische Hypothek-Tranchen ohne Amortisationsplan.
    // Bestätigt durch Test: Hypothek-Stand bleibt 980k über alle Jahre.
    expect(z2031.vermoegenSchulden).toBe(980_000);
    expect(z2035.vermoegenSchulden).toBe(980_000);
  });

  // ─── 8. vermoegenNetto 2026 Konsistenz: Aktiva − Schulden ────────
  it("vermoegenNetto 2026 = Aktiva − Schulden (Komponenten-Identität)", () => {
    const z = reihe.find((zz) => zz.jahr === 2026)!;
    const aktiva =
      z.vermoegenLiquiditaet +
      z.vermoegenWertschriften +
      z.vermoegenVorsorge +
      z.vermoegenImmobilien +
      z.vermoegenFirma;
    // vermoegenAktiva ist auch im Output (Σ der Buckets)
    expect(z.vermoegenAktiva).toBe(aktiva);
    expect(z.vermoegenNetto).toBe(z.vermoegenAktiva - z.vermoegenSchulden);
    // Plausi: Netto ungefähr Start-Netto (380+520+95+480+600+1400+750 − 980)
    //   = 3'245k Start; nach 1 J Erwerb-Saldo + Compound ≈ etwas darüber
    expect(z.vermoegenNetto).toBeGreaterThan(3_200_000);
    expect(z.vermoegenNetto).toBeLessThan(3_500_000);
  });

  // ─── 9. kapAuszahlungen 2033 — 3a + PK-Kapital 50% + Firma 600k ──
  it("kapAuszahlungen 2033 ≈ 1.05-1.15M (3a + PK-Kapital 50% + Firma 600k)", () => {
    const z = reihe.find((zz) => zz.jahr === 2033)!;
    // Erwartung Brutto:
    //   3a ~100k (95k + Zinsen)
    //   PK-Kapital 50% von 720k = 360k
    //   Firma 600k
    //   Σ ≈ 1.06M
    expect(z.kapAuszahlungen).toBeGreaterThan(1_000_000);
    expect(z.kapAuszahlungen).toBeLessThan(1_200_000);
  });

  // ─── 10. saldo: positiv in Erwerbsphase, negativ in Pension ──────
  it("saldo: 2026-2032 positiv (Erwerbsphase), 2034+ negativ (Verbrauchsphase)", () => {
    // Erwerbsphase: Erwerb 220k − Ausgaben 114k − Steuern/Sozial → positiv
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    const z2030 = reihe.find((z) => z.jahr === 2030)!;
    const z2032 = reihe.find((z) => z.jahr === 2032)!;
    expect(z2026.saldo).toBeGreaterThan(0);
    expect(z2030.saldo).toBeGreaterThan(0);
    expect(z2032.saldo).toBeGreaterThan(0);

    // Post-Pension: AHV + BVG-Rente + Mieten < Wunschverbrauch 96k + Steuern + Hypozins
    // → negativer Saldo
    const z2035 = reihe.find((z) => z.jahr === 2035)!;
    expect(z2035.saldo).toBeLessThan(0);
  });
});

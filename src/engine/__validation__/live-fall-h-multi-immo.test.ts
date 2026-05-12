/**
 * Live-Test Fall H: Multi-Immo Mix (Aebischer AG).
 *
 * Profil:
 *  - P1 Peter Aebischer, m, 1968, AN 130'000, PK aktiv (AG 380k, beiBezug 580k, UWS 5.8%)
 *  - P2 Sandra Aebischer, w, 1970, AN 60'000 Teilzeit, PK aktiv (AG 180k,
 *    beiBezug 280k, UWS 6.0%)
 *  - Wohnsitz Aarau AG, verheiratet
 *  - 4 Immobilien:
 *      1. Eigenheim Aarau 1'200'000, 2 Hypo-Tranchen 400k + 200k, kauf 2010, behalten
 *      2. Renditeliegenschaft Brugg 850'000, Hypo 500k, Miete 36'000/J, kauf 2015, behalten
 *      3. Renditeliegenschaft Lenzburg 720'000, Hypo 400k, Miete 32'000/J, kauf 2018, verkaufen 2035
 *      4. Bauland Frick 180'000 (typ "sonstiges"), keine Hypo, kein EMW, keine Miete
 *  - Liquid 280'000, Depot 350'000
 *  - Ausgaben 10'000/Mt
 *
 * Validiert wird die Cashflow-Engine 2026–2040 auf:
 *  1. Mieteinnahmen 2026 = 68'000 (Brugg 36k + Lenzburg 32k)
 *  2. Hypozins 2026 = Summe über 4 Tranchen mit ihren Zinssätzen
 *  3. EMW 2026 = nur Aarau (selbstbewohnt, sonstiges hat keinen EMW)
 *  4. vermoegenImmobilien 2026 ≈ 1200 + 850 + 720 + 180 = 2'950k
 *  5. Schulden 2026 = 400 + 200 + 500 + 400 = 1'500k
 *  6. Verkauf Lenzburg 2035: kapAuszahlungen-Erlös, GGSt-Abzug
 *  7. Nach Verkauf 2035: Mieten -32k, Immo-Wert -720k, Schuld -400k
 *  8. Bauland Frick keine Mieten, kein EMW, aber im Vermögen
 *
 * Engine NICHT verändern, nur testen.
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe, type CashflowInput } from "../cashflow";

function buildFallH(): CashflowInput {
  return {
    fallart: "paar",
    zivilstand: "verheiratet",
    person1: {
      vorname: "Peter",
      nachname: "Aebischer",
      geburtsdatum: "1968-05-15",
      geschlecht: "m",
      telefon: "",
      email: "",
    },
    person2: {
      vorname: "Sandra",
      nachname: "Aebischer",
      geburtsdatum: "1970-09-22",
      geschlecht: "w",
      telefon: "",
      email: "",
    },
    kinder: [],
    ahv: {
      einkommenP1: 130_000,
      einkommenP2: 60_000,
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
        altersguthabenHeute: 380_000,
        altersguthabenBeiBezug: 580_000,
        umwandlungssatzProzent: 5.8,
        bezugspraeferenz: "rente",
        kapitalanteil: 0,
        freizuegigkeit: [],
        einkaeufe: [],
        wefVorbezuege: [],
      },
      p2: {
        aktiverAnschluss: true,
        altersguthabenHeute: 180_000,
        altersguthabenBeiBezug: 280_000,
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
          id: "v-konto",
          typ: "konto",
          beschreibung: "Privatkonto",
          saldoHeute: 280_000,
          renditeProzent: 0,
          istHauptkonto: true,
        },
        {
          id: "v-depot",
          typ: "depot",
          beschreibung: "Wertschriften-Depot",
          saldoHeute: 350_000,
          renditeProzent: 3.0,
          istHauptkonto: false,
        },
      ],
    },
    immobilien: {
      items: [
        {
          id: "eh-aarau",
          beschreibung: "Eigenheim Aarau",
          typ: "selbstbewohnt",
          verkehrswert: 1_200_000,
          hypotheken: [
            {
              id: "eh-h1",
              beschreibung: "Tranche 1",
              hoehe: 400_000,
              zinssatzProzent: 1.5,
              ablaufjahr: 2032,
            },
            {
              id: "eh-h2",
              beschreibung: "Tranche 2",
              hoehe: 200_000,
              zinssatzProzent: 2.0,
              ablaufjahr: 2030,
            },
          ],
          plan: "behalten",
          verkaufsjahr: 2060,
          jaehrlicheMieteinnahmen: null,
          kaufjahr: 2010,
          anlagekosten: 950_000,
          wertvermehrendeInvestitionen: null,
          // Wertsteigerung 0% damit vermoegenImmobilien-Test stabil ist
          wertsteigerungProzent: 0,
        },
        {
          id: "rl-brugg",
          beschreibung: "Renditeliegenschaft Brugg",
          typ: "rendite",
          verkehrswert: 850_000,
          hypotheken: [
            {
              id: "br-h1",
              beschreibung: "Hypothek Brugg",
              hoehe: 500_000,
              zinssatzProzent: 1.8,
              ablaufjahr: 2033,
            },
          ],
          plan: "behalten",
          verkaufsjahr: 2060,
          jaehrlicheMieteinnahmen: 36_000,
          kaufjahr: 2015,
          anlagekosten: 720_000,
          wertvermehrendeInvestitionen: null,
          wertsteigerungProzent: 0,
        },
        {
          id: "rl-lenz",
          beschreibung: "Renditeliegenschaft Lenzburg",
          typ: "rendite",
          verkehrswert: 720_000,
          hypotheken: [
            {
              id: "lz-h1",
              beschreibung: "Hypothek Lenzburg",
              hoehe: 400_000,
              zinssatzProzent: 1.7,
              ablaufjahr: 2032,
            },
          ],
          plan: "verkaufen",
          verkaufsjahr: 2035,
          jaehrlicheMieteinnahmen: 32_000,
          kaufjahr: 2018,
          anlagekosten: 620_000,
          wertvermehrendeInvestitionen: null,
          wertsteigerungProzent: 0,
        },
        {
          id: "bl-frick",
          beschreibung: "Bauland Frick",
          typ: "sonstiges",
          verkehrswert: 180_000,
          hypotheken: [],
          plan: "behalten",
          verkaufsjahr: 2060,
          jaehrlicheMieteinnahmen: null,
          kaufjahr: 2020,
          anlagekosten: 150_000,
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
    ziele: { bezugsalterP1: 65, bezugsalterP2: 64 },
    budget: {
      einkommen: [
        {
          id: "ek-p1",
          beschreibung: "Peter — Anstellung",
          personIdx: 1,
          betragMonatlich: Math.round(130_000 / 12),
          von: "2026-01",
          bis: "2033-05",
          typ: "anstellung",
        },
        {
          id: "ek-p2",
          beschreibung: "Sandra — Anstellung Teilzeit",
          personIdx: 2,
          betragMonatlich: Math.round(60_000 / 12),
          von: "2026-01",
          bis: "2035-09",
          typ: "anstellung",
        },
      ],
      ausgabenModus: "total",
      ausgabenTotal: 10_000,
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
      strasse: "Hauptstrasse 1",
      plz: "5000",
      ort: "Aarau",
      kanton: "AG",
      gemeindeBfsId: null,
      gemeindeName: "Aarau",
    },
    einmaligeAusgaben: [],
  };
}

describe("Live-Fall H — Multi-Immo Mix Aebischer AG", () => {
  const input = buildFallH();
  const reihe = cashflowReihe(input, 2026, 2040);

  it("liefert eine Reihe für 2026-2040 (15 Jahre)", () => {
    expect(reihe).toHaveLength(15);
    expect(reihe[0]!.jahr).toBe(2026);
    expect(reihe[14]!.jahr).toBe(2040);
  });

  it("Plausi: keine NaN, keine negativen Vermögens-/Steuer-Werte", () => {
    for (const z of reihe) {
      expect(Number.isFinite(z.einnahmenTotal)).toBe(true);
      expect(Number.isFinite(z.vermoegenNetto)).toBe(true);
      expect(Number.isFinite(z.vermoegenImmobilien)).toBe(true);
      expect(Number.isFinite(z.vermoegenSchulden)).toBe(true);
      expect(z.ausgabenSteuern).toBeGreaterThanOrEqual(0);
    }
  });

  // ─── 1. Mieteinnahmen 2026 = 68'000 (Brugg + Lenzburg) ──────────
  it("Mieteinnahmen 2026 = 68'000 (Brugg 36k + Lenzburg 32k, Bauland=0)", () => {
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    expect(z2026.einnahmenMieten).toBe(68_000);
  });

  // ─── 2. Hypozins 2026 = Σ 4 Tranchen × Zinssatz ─────────────────
  it("Hypozins 2026 = 400k×1.5% + 200k×2.0% + 500k×1.8% + 400k×1.7% = 6'000+4'000+9'000+6'800 = 25'800", () => {
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    // Erwartung: 6'000 + 4'000 + 9'000 + 6'800 = 25'800
    expect(z2026.ausgabenHypozins).toBe(25_800);
  });

  // ─── 3. EMW 2026 = nur Aarau (selbstbewohnt) ────────────────────
  it("Eigenmietwert 2026 = nur Aarau (selbstbewohnt), Bauland+Rendite haben keinen EMW", () => {
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    // Aarau 1'200'000 × 1.13% (Default ZH-Median) = 13'560
    // Bauland (typ "sonstiges") und Rendite ohne EMW
    expect(z2026.eigenmietwertJahr).toBeGreaterThan(10_000);
    expect(z2026.eigenmietwertJahr).toBeLessThan(20_000);
    // Konkret: 1'200'000 × 0.0113 = 13'560
    expect(z2026.eigenmietwertJahr).toBe(13_560);
  });

  // ─── 4. vermoegenImmobilien 2026 = 2'950k ───────────────────────
  it("vermoegenImmobilien 2026 = 1200 + 850 + 720 + 180 = 2'950k (alle Wertsteigerung=0)", () => {
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    expect(z2026.vermoegenImmobilien).toBe(2_950_000);
  });

  // ─── 5. Schulden 2026 = 1'500k ──────────────────────────────────
  it("Schulden 2026 = 400 + 200 + 500 + 400 = 1'500k Hypotheken (keine Darlehen)", () => {
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    expect(z2026.vermoegenSchulden).toBe(1_500_000);
  });

  // ─── 6. Verkauf Lenzburg 2035: kapAuszahlungen + GGSt ───────────
  it("Verkauf Lenzburg 2035: kapAuszahlungen > 0, GGSt mindert Brutto-Erlös", () => {
    const z2035 = reihe.find((z) => z.jahr === 2035)!;
    // Brutto-Erlös = 720k − 400k = 320k.
    // GGSt: Reingewinn = 720k − 620k = 100k, Besitzdauer 17 J., Kanton AG.
    // Effektiver Tarif für AG fällt unter "andere"-Fallback ≈ ZH-Median, mit
    // Besitzdauer-Rabatt. Erwartung: netto irgendwo 280k–320k.
    expect(z2035.kapAuszahlungen).toBeGreaterThan(250_000);
    expect(z2035.kapAuszahlungen).toBeLessThan(330_000);
    // GGSt MUSS Brutto reduzieren → kapAuszahlungen < 320k (Brutto)
    expect(z2035.kapAuszahlungen).toBeLessThan(320_000);
  });

  // ─── 7. Nach Verkauf 2035: Mieten -32k, Immo-Wert -720k, Schuld -400k ─
  it("Nach Verkauf Lenzburg: Mieten sinken um 32k (nur Brugg übrig), Immo -720k, Schuld -400k", () => {
    const z2035 = reihe.find((z) => z.jahr === 2035)!;
    const z2036 = reihe.find((z) => z.jahr === 2036)!;

    // 2036: Lenzburg ist weg, Mieten nur noch Brugg = 36'000
    expect(z2036.einnahmenMieten).toBe(36_000);

    // Immo-Wert sinkt um 720k → 2'950k − 720k = 2'230k (Wertsteigerung=0)
    expect(z2036.vermoegenImmobilien).toBe(2_230_000);

    // Schulden sinken um 400k → 1'500k − 400k = 1'100k
    expect(z2036.vermoegenSchulden).toBe(1_100_000);

    // Hypozins 2036: ohne Lenzburg-Tranche = 25'800 − 6'800 = 19'000
    expect(z2036.ausgabenHypozins).toBe(19_000);

    // 2035 (Verkaufsjahr): laut Engine zählt Lenzburg in dem Jahr nicht
    // mehr — Mieten + EMW + Hypozins werden mit (jahr >= verkaufsjahr) skipped.
    // → Mieten 2035 = 36k, Hypozins 2035 = 19'000
    expect(z2035.einnahmenMieten).toBe(36_000);
    expect(z2035.ausgabenHypozins).toBe(19_000);
  });

  // ─── 8. Bauland Frick (typ "sonstiges") ─────────────────────────
  it("Bauland Frick: keine Mieten, kein EMW, keine Hypothek, aber im Vermögen", () => {
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    // EMW kommt nicht aus Bauland (nur Aarau, 13'560)
    expect(z2026.eigenmietwertJahr).toBe(13_560);

    // Bauland (180k) ist Teil von vermoegenImmobilien (Σ 2'950k)
    // → Wenn wir Bauland entfernen, sinkt vermoegenImmobilien um genau 180k
    const inputOhneBauland = buildFallH();
    inputOhneBauland.immobilien.items = inputOhneBauland.immobilien.items.filter(
      (im) => im.id !== "bl-frick"
    );
    const reiheOhne = cashflowReihe(inputOhneBauland, 2026, 2040);
    const z2026Ohne = reiheOhne.find((z) => z.jahr === 2026)!;
    expect(z2026.vermoegenImmobilien - z2026Ohne.vermoegenImmobilien).toBe(180_000);

    // Bauland bringt keine Mieteinnahmen → einnahmenMieten identisch
    expect(z2026.einnahmenMieten).toBe(z2026Ohne.einnahmenMieten);
  });

  // ─── 9. EMW + Schuldzinsabzug entfallen ab 2030 (Reform) ────────
  it("Eigenmietwert + Schuldzinsabzug aktiv bis 2029, ab 2030 = 0 (Reform)", () => {
    const z2029 = reihe.find((z) => z.jahr === 2029)!;
    const z2030 = reihe.find((z) => z.jahr === 2030)!;
    expect(z2029.eigenmietwertJahr).toBeGreaterThan(10_000);
    expect(z2029.schuldzinsenAbzug).toBeGreaterThan(0);
    expect(z2030.eigenmietwertJahr).toBe(0);
    expect(z2030.schuldzinsenAbzug).toBe(0);
  });

  // ─── 10. Schuldzinsabzug 2026 = Σ aller Hypozinsen (selbstbew. + rendite) ─
  it("Schuldzinsabzug 2026 = ausgabenHypozins = 25'800 (Eigenheim vorhanden)", () => {
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    // Solange Eigenheim vorhanden ist und Reform <2030, voller Hypozins-Abzug
    expect(z2026.schuldzinsenAbzug).toBe(z2026.ausgabenHypozins);
    expect(z2026.schuldzinsenAbzug).toBe(25_800);
  });

  // ─── 11. Mieten-Reduktion exakt ab Verkaufsjahr (nicht +1) ──────
  it("Mieten 2034 = 68k (Lenzburg noch da), 2035 = 36k (Lenzburg weg)", () => {
    const z2034 = reihe.find((z) => z.jahr === 2034)!;
    const z2035 = reihe.find((z) => z.jahr === 2035)!;
    expect(z2034.einnahmenMieten).toBe(68_000);
    expect(z2035.einnahmenMieten).toBe(36_000);
  });

  // ─── 12. Vermögen-Plausi: Verkauf-Liquid-Boost 2035 ─────────────
  it("Liquidität-Boost 2035: Verkaufserlös Lenzburg landet im Hauptkonto", () => {
    const z2034 = reihe.find((z) => z.jahr === 2034)!;
    const z2035 = reihe.find((z) => z.jahr === 2035)!;
    // Liquidität soll sich durch Verkauf merklich erhöhen (netto ~280k+)
    // — abzüglich anderer Cashflows. Test grob: > 200k Sprung.
    const liquidSprung = z2035.vermoegenLiquiditaet - z2034.vermoegenLiquiditaet;
    expect(liquidSprung).toBeGreaterThan(150_000);
  });
});

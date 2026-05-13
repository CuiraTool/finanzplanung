/**
 * Live-Test Fall G: Ehepaar Plafond-Edge — beide Max-AHV-Rente.
 *
 * Profil (Robert + Elena Hofmann, Kanton ZG):
 *  - Robert geb. 1960-04-12, m → ord. AHV-Alter 65 → bezugsjahr 2025
 *  - Elena  geb. 1961-09-08, w → ord. AHV-Alter 65 → bezugsjahr 2026
 *  - Verheiratet, ZG
 *  - Beide hohe Einkommen P1=180'000, P2=120'000 → Vollrenten bei Skala 44
 *  - Beide IK-Auszug komplett (Override-Pfad):
 *      ahvRenteJahrEffektivP1=30'240 (Max Einzelrente)
 *      ahvRenteJahrEffektivP2=30'240 (Max Einzelrente)
 *      Summe Override = 60'480
 *      Ehepaar-Plafond ohne 13. AHV = 45'360
 *      Ehepaar-Plafond mit 13. AHV ab 2026 ≈ 49'140
 *  - PK beide aktiv, AG bei Bezug 850'000 + 720'000, UWS 5.7%, Rente
 *      Robert: 850k × 5.7% ≈ 48'450
 *      Elena : 720k × 5.7% ≈ 41'040
 *  - Liquid 500'000, Depot 800'000 (3.5%)
 *  - Eigenheim Zug 1'800'000, Hypo 700'000 @1.4% Zins, kaufjahr 2015
 *  - Ausgaben 12'500/Mt = 150'000/J
 *
 * Test-Fokus:
 *  1. Override-Pfad korrekt (beide Override > 0).
 *  2. Plafond beißt: Summe 60'480 > 45'360/49'140 → wird gekappt.
 *  3. Plafond ab 2026 (mit 13. AHV) = 49'140; refJahr < 2026 = 45'360.
 *  4. Vermögensbilanz, PK-Rente-Auszahlung.
 *  5. Tiefer Steuer-Kanton ZG.
 *
 * ⚠️ DOKUMENTIERTE ENGINE-EIGENART (NICHT ZU FIXEN HIER):
 *  - Override-Pfad p1Einzel/p2Einzel multipliziert pro Person mit
 *    `dreizehnteAhvFaktor(bezugsjahrPx)`. Robert (bezugsjahr 2025) bekommt
 *    Faktor 1.0, Elena (bezugsjahr 2026) Faktor 13/12.
 *  - Plafond verwendet max(bezugsjahrP1, bezugsjahrP2) = 2026 → 49'140.
 *  - Resultat: p1Einzel(30'240) + p2Einzel(32'760) = 63'000, gekappt auf 49'140.
 *  - Pre-2026-Pensionierte erhalten so im Override-Pfad keine 13. AHV in p1Einzel,
 *    aber der Plafond kennt 13. AHV. Bekannte Lücke (vgl. Fall E).
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe, type CashflowInput } from "../cashflow";

function buildFallG(): CashflowInput {
  return {
    fallart: "paar",
    zivilstand: "verheiratet",
    person1: {
      vorname: "Robert",
      nachname: "Hofmann",
      geburtsdatum: "1960-04-12",
      geschlecht: "m",
      telefon: "",
      email: "",
    },
    person2: {
      vorname: "Elena",
      nachname: "Hofmann",
      geburtsdatum: "1961-09-08",
      geschlecht: "w",
      telefon: "",
      email: "",
    },
    kinder: [],
    ahv: {
      einkommenP1: 180_000,
      einkommenP2: 120_000,
      hatIkAuszugP1: true,
      hatIkAuszugP2: true,
      hatFehljahreP1: false,
      hatFehljahreP2: false,
      fehljahreAnzahlP1: 0,
      fehljahreAnzahlP2: 0,
      ahvBezugsalterP1: 65,
      ahvBezugsalterP2: 65,
      ahvRenteJahrEffektivP1: 30_240, // Max Einzelrente Skala 44
      ahvRenteJahrEffektivP2: 30_240,
    },
    bvg: {
      p1: {
        aktiverAnschluss: true,
        altersguthabenHeute: 700_000,
        altersguthabenBeiBezug: 850_000,
        umwandlungssatzProzent: 5.7,
        bezugspraeferenz: "rente",
        kapitalanteil: 0,
        freizuegigkeit: [],
        einkaeufe: [],
        wefVorbezuege: [],
      },
      p2: {
        aktiverAnschluss: true,
        altersguthabenHeute: 580_000,
        altersguthabenBeiBezug: 720_000,
        umwandlungssatzProzent: 5.7,
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
          id: "liq",
          typ: "konto",
          beschreibung: "Privatkonto",
          saldoHeute: 500_000,
          renditeProzent: 0,
          istHauptkonto: true,
        },
        {
          id: "dep",
          typ: "depot",
          beschreibung: "Wertschriften-Depot",
          saldoHeute: 800_000,
          renditeProzent: 3.5,
          istHauptkonto: false,
        },
      ],
    },
    immobilien: {
      items: [
        {
          id: "eh-zug",
          typ: "selbstbewohnt",
          beschreibung: "Eigenheim Zug",
          verkehrswert: 1_800_000,
          hypotheken: [
            {
              id: "h1",
              beschreibung: "Hypothek 1.4%",
              hoehe: 700_000,
              zinssatzProzent: 1.4,
              ablaufjahr: 2035,
            },
          ],
          plan: "behalten",
          verkaufsjahr: 2060,
          jaehrlicheMieteinnahmen: null,
          kaufjahr: 2015,
          anlagekosten: null,
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
      einkommen: [],
      ausgabenModus: "total",
      ausgabenTotal: 12_500,
      ausgabenKategorien: {
        lebenshaltung: null,
        wohnen: null,
        mobilitaet: null,
        versicherungen: null,
        ferienHobby: null,
        sonstiges: null,
      },
      wunschverbrauchPension: 12_500,
      steuernHeute: null,
      einkommenHeute: null,
      religion: "reformiert",
      alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
    },
    adresse: {
      strasse: "",
      plz: "6300",
      ort: "Zug",
      kanton: "ZG",
      gemeindeBfsId: null,
      gemeindeName: "Zug",
    },
    einmaligeAusgaben: [],
  };
}

describe("Live-Fall G — Ehepaar Plafond-Edge (Hofmann ZG)", () => {
  const state = buildFallG();
  const reihe = cashflowReihe(state, 2026, 2045);
  const z2026 = reihe.find((r) => r.jahr === 2026)!;
  const z2030 = reihe.find((r) => r.jahr === 2030)!;
  const z2045 = reihe.find((r) => r.jahr === 2045)!;

  it("Cashflow läuft 2026-2045 ohne NaN", () => {
    expect(reihe.length).toBe(20);
    for (const z of reihe) {
      expect(Number.isFinite(z.einnahmenTotal)).toBe(true);
      expect(Number.isFinite(z.vermoegenNetto)).toBe(true);
      expect(Number.isFinite(z.ausgabenSteuern)).toBe(true);
      expect(z.ausgabenSteuern).toBeGreaterThanOrEqual(0);
    }
  });

  it("Override-Pfad: beide Override-Werte gesetzt (30'240 + 30'240)", () => {
    expect(state.ahv.ahvRenteJahrEffektivP1).toBe(30_240);
    expect(state.ahv.ahvRenteJahrEffektivP2).toBe(30_240);
    // Summe ungekappt = 60'480 — muss vom Plafond runtergeschnitten werden.
    const summeOhnePlafond =
      state.ahv.ahvRenteJahrEffektivP1! + state.ahv.ahvRenteJahrEffektivP2!;
    expect(summeOhnePlafond).toBe(60_480);
  });

  it("Plafond-Cap aktiv 2026: gewichtete Pro-Rata oder Plafond (Min-Cap)", () => {
    // Engine-Fix (Ehepaar Pro-Rata): einnahmenAhv = min(plafond, p1×f1 + p2×f2).
    // Robert (Jg 1960, AHV ab 2025) hat 2026 f1=1. Elena (Jg 1961, AHV ab Sept
    // 2026) hat f2=4/12. Gewichtete Summe ~40'700 ≤ Plafond 49'140.
    expect(z2026.einnahmenAhv).toBeLessThanOrEqual(49_200);
    expect(z2026.einnahmenAhv).toBeGreaterThanOrEqual(38_000);
  });

  it("Plafond auch in späteren Jahren (2030, 2045) ≤ 49'140", () => {
    // Override + Plafond gilt jedes Jahr ab Bezug.
    expect(z2030.einnahmenAhv).toBeLessThanOrEqual(49_200);
    expect(z2045.einnahmenAhv).toBeLessThanOrEqual(49_200);
    // Aber > 0 (beide voll im Bezug).
    expect(z2045.einnahmenAhv).toBeGreaterThan(40_000);
  });

  it("Übergangsjahr-Pro-Rata 2026 < Vollbezug 2027 (Elena f<1)", () => {
    // 2026: Elena Pro-Rata 4/12 → Summe weighted ~40k.
    // 2027: Elena full year, beide voll → Plafond beißt → 49'140.
    const z2027 = reihe.find((r) => r.jahr === 2027)!;
    expect(z2026.einnahmenAhv).toBeLessThan(z2027.einnahmenAhv);
  });

  it("PK-Rente ab 2027 voll: Robert 48'450 + Elena 41'040 ≈ 89'490", () => {
    // 850k × 5.7% = 48'450 (Robert), 720k × 5.7% = 41'040 (Elena)
    // 2026 ist für Elena Pro-Rata-Jahr (geb. Sept 1961 → PK ab Okt 2026).
    // Robert ist seit 2025 voll im Bezug. 2027 sollten beide voll laufen.
    const z2027 = reihe.find((r) => r.jahr === 2027)!;
    expect(z2027.einnahmenBvgRente).toBeGreaterThanOrEqual(85_000);
    expect(z2027.einnahmenBvgRente).toBeLessThanOrEqual(93_000);
    // 2026: Robert voll, Elena Pro-Rata → ca. 58k
    expect(z2026.einnahmenBvgRente).toBeGreaterThanOrEqual(50_000);
    expect(z2026.einnahmenBvgRente).toBeLessThanOrEqual(70_000);
  });

  it("Vermögensbilanz 2026: Aktiva ~3.1M (500+800+1800), Schulden 700k", () => {
    // Liquidität 500 + Depot 800 + Immo 1800 = 3'100 (+ PK Vorsorge im Bezugsjahr).
    expect(z2026.vermoegenAktiva).toBeGreaterThanOrEqual(3_000_000);
    expect(z2026.vermoegenAktiva).toBeLessThanOrEqual(4_500_000);
    expect(z2026.vermoegenSchulden).toBeGreaterThanOrEqual(690_000);
    expect(z2026.vermoegenSchulden).toBeLessThanOrEqual(710_000);
  });

  it("Erwerbseinkommen = 0 ab 2026 (beide pensioniert)", () => {
    expect(z2026.einnahmenErwerb).toBe(0);
    expect(z2045.einnahmenErwerb).toBe(0);
  });

  it("Tiefer Steuer-Kanton ZG: Steuern moderat vs ZH-Vergleich", () => {
    // ZG ist tiefster Steuer-Kanton CH.
    // AHV 49k + PK 89k = 138k Einkommen vs Vermögen ~3M.
    // Erwartung: Steuern in ZG < entsprechender ZH-Wert.
    const stateZh = { ...buildFallG() };
    stateZh.adresse = { ...stateZh.adresse, kanton: "ZH", ort: "Zürich", plz: "8001" };
    const reiheZh = cashflowReihe(stateZh, 2026, 2026);
    const z2026Zh = reiheZh[0]!;

    expect(z2026.ausgabenSteuern).toBeLessThan(z2026Zh.ausgabenSteuern);
    // Sanity: beide > 0
    expect(z2026.ausgabenSteuern).toBeGreaterThan(0);
    expect(z2026Zh.ausgabenSteuern).toBeGreaterThan(0);
  });

  it("Alter steigt korrekt jahresweise (Robert 1960, Elena 1961)", () => {
    expect(z2026.alterP1).toBe(66); // 2026 - 1960
    expect(z2026.alterP2).toBe(65); // 2026 - 1961
    expect(z2045.alterP1).toBe(85);
    expect(z2045.alterP2).toBe(84);
  });

  it("Schuldzins existiert (Hypo 700k × 1.4% ≈ 9'800)", () => {
    expect(z2026.ausgabenHypozins).toBeGreaterThanOrEqual(9_000);
    expect(z2026.ausgabenHypozins).toBeLessThanOrEqual(10_500);
  });
});

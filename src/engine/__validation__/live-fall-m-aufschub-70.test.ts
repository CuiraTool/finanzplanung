/**
 * Live-Fall M: AHV-Aufschub bis 70 — max +31.5% (BSV-Tabelle).
 *
 * Profil (Thomas Roth, ledig, SZ Einsiedeln):
 *  - geb 1962 (heute 64 in 2026), ledig, Kanton SZ
 *  - Einkommen 145'000/J — arbeitet freiwillig bis 70 weiter (bis 2032)
 *  - AHV-Aufschub bis 70 = +5 J. = +31.5% (BSV-Aufschubs-Zuschlag-Tabelle)
 *  - ahvBezugsalterP1 = 70 → erstes volles AHV-Jahr = 2033 (Geb-Mt April)
 *  - PK aktiv: AG heute 580k, AG bei Bezug (ord. 65) = 700k, UWS 5.8%
 *      → ENGINE-LIMITATION: pkAltersguthabenBeiBezug ist fix bei ord. Alter 65;
 *        bei bezugsalter ≥ 65 wird "beiBezug"-Wert genommen, kein weiterer
 *        Hochlauf bis 70 — Saldo bei 70 wäre real höher.
 *  - 3a Konto 95'000, Einzahlung bis 2031 (letztes Erwerbsjahr ist 2031, da
 *    Pension 70 = April 2032 → 2031 letzter voller AN-Beitrag)
 *  - Liquid 220'000, Depot 380'000 (3% Rendite)
 *  - Eigenheim Einsiedeln 950'000, Hypothek 300'000 @ 1.4%
 *
 * Test-Fokus:
 *  1. bezugsfaktor(70) > 1.3 (BSV-Aufschub-Zuschlag 31.5% bei +60 Mt).
 *  2. AHV-Rente 2033 (erstes volles Jahr nach 70-Bezug) deutlich höher
 *     als ord. Vollrente bei 65 (× ~1.315 × 13/12).
 *  3. PK-Saldo bei 70: beiBezug-Wert (700k) wird genommen, kein Hochlauf bis 70.
 *  4. Erwerbseinkommen läuft bis 2031, drop 2032+.
 *  5. Steuern höher in Erwerbsphase (2026-2031), drop nach 2033.
 *  6. Engine läuft ohne NaN/crash.
 */

import { describe, expect, it } from "vitest";
import {
  bezugsfaktor,
  ORDENTLICHES_AHV_ALTER,
  vollrenteEinzelSkala44,
  dreizehnteAhvFaktor,
} from "../ahv";
import { cashflowReihe, type CashflowInput } from "../cashflow";

function buildFallM(): CashflowInput {
  return {
    fallart: "einzel",
    zivilstand: "ledig",
    person1: {
      vorname: "Thomas",
      nachname: "Roth",
      geburtsdatum: "1962-04-15",
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
      einkommenP1: 145_000,
      einkommenP2: null,
      hatIkAuszugP1: false,
      hatIkAuszugP2: false,
      hatFehljahreP1: false,
      hatFehljahreP2: false,
      fehljahreAnzahlP1: 0,
      fehljahreAnzahlP2: 0,
      // Aufschub bis 70 = +5 Jahre
      ahvBezugsalterP1: 70,
      ahvBezugsalterP2: 65,
      ahvRenteJahrEffektivP1: null,
      ahvRenteJahrEffektivP2: null,
    },
    bvg: {
      p1: {
        aktiverAnschluss: true,
        altersguthabenHeute: 580_000,
        altersguthabenBeiBezug: 700_000,
        umwandlungssatzProzent: 5.8,
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
        umwandlungssatzProzent: 6,
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
          id: "3a-th",
          type: "konto",
          saeule: "3a",
          beschreibung: "3a-Konto",
          aktuellerWert: 95_000,
          auszahlungsjahr: 2032,
          renditeProzent: 1.0,
          rueckkaufswert: null,
          ablaufswert: null,
          ablaufjahr: 2032,
          jaehrlicheEinzahlung: 7_258,
          einzahlungAb: 2026,
          einzahlungBis: 2031,
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
          saldoHeute: 220_000,
          renditeProzent: 0,
          istHauptkonto: true,
        },
        {
          id: "dep",
          typ: "depot",
          beschreibung: "Wertschriften-Depot",
          saldoHeute: 380_000,
          renditeProzent: 3.0,
          istHauptkonto: false,
        },
      ],
    },
    immobilien: {
      items: [
        {
          id: "eh-ein",
          typ: "selbstbewohnt",
          beschreibung: "Eigenheim Einsiedeln SZ",
          verkehrswert: 950_000,
          hypotheken: [
            {
              id: "hy1",
              beschreibung: "1. Hypothek SaffaBank",
              hoehe: 300_000,
              zinssatzProzent: 1.4,
              ablaufjahr: 2055,
            },
          ],
          plan: "behalten",
          verkaufsjahr: 2060,
          jaehrlicheMieteinnahmen: null,
          kaufjahr: 2005,
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
    ziele: { bezugsalterP1: 70, bezugsalterP2: 65 },
    budget: {
      einkommen: [
        {
          id: "e1",
          beschreibung: "Lohn",
          personIdx: 1 as const,
          betragMonatlich: 12_083, // ≈ 145k/J
          von: "2026-01",
          bis: "2031-12",
        },
      ],
      ausgabenModus: "total",
      ausgabenTotal: 7_000, // 84k/J
      ausgabenKategorien: {
        lebenshaltung: null,
        wohnen: null,
        mobilitaet: null,
        versicherungen: null,
        ferienHobby: null,
        sonstiges: null,
      },
      wunschverbrauchPension: 6_000,
      steuernHeute: null,
      einkommenHeute: null,
      religion: "keine",
      alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
    },
    adresse: {
      strasse: "Hauptstrasse 1",
      plz: "8840",
      ort: "Einsiedeln",
      kanton: "SZ",
      gemeindeBfsId: null,
      gemeindeName: "Einsiedeln",
    },
    einmaligeAusgaben: [],
  };
}

describe("Live-Fall M — AHV-Aufschub 70 (Thomas Roth SZ)", () => {
  const state = buildFallM();
  const reihe = cashflowReihe(state, 2026, 2040);
  const z2026 = reihe.find((r) => r.jahr === 2026)!;
  const z2031 = reihe.find((r) => r.jahr === 2031)!;
  const z2032 = reihe.find((r) => r.jahr === 2032)!;
  const z2033 = reihe.find((r) => r.jahr === 2033)!;
  const z2040 = reihe.find((r) => r.jahr === 2040)!;

  it("Engine läuft 2026-2040 ohne NaN/crash", () => {
    expect(reihe.length).toBe(15);
    for (const z of reihe) {
      expect(Number.isFinite(z.einnahmenTotal)).toBe(true);
      expect(Number.isFinite(z.vermoegenNetto)).toBe(true);
      expect(Number.isFinite(z.ausgabenSteuern)).toBe(true);
      expect(z.ausgabenSteuern).toBeGreaterThanOrEqual(0);
    }
  });

  it("bezugsfaktor(70) liegt bei 1.315 (BSV-Aufschub +60 Mt = +31.5%)", () => {
    const bf = bezugsfaktor(70, ORDENTLICHES_AHV_ALTER);
    expect(bf).toBeGreaterThan(1.3);
    expect(bf).toBeCloseTo(1.315, 3);
  });

  it("bezugsfaktor monoton: 65 = 1 < 66 < 68 < 70 = 1.315", () => {
    expect(bezugsfaktor(65)).toBe(1);
    const bf66 = bezugsfaktor(66);
    const bf68 = bezugsfaktor(68);
    const bf70 = bezugsfaktor(70);
    expect(bf66).toBeGreaterThan(1);
    expect(bf68).toBeGreaterThan(bf66);
    expect(bf70).toBeGreaterThan(bf68);
  });

  it("AHV-Rente 2033 (erstes volles Jahr nach 70-Bezug) deutlich über ord. Bezug bei 65", () => {
    // Ord. Vollrente bei 145k Einkommen × 13/12 (13. AHV)
    const ordVollrente = vollrenteEinzelSkala44(145_000, 0);
    const ordMit13 = ordVollrente * dreizehnteAhvFaktor(2033);
    // Mit Aufschub 70: × 1.315
    const erwartetAufschub = ordMit13 * 1.315;
    // 2033 ist erstes volles Bezugsjahr (Geb April 1962 → 70 erreicht April 2032)
    expect(z2033.einnahmenAhv).toBeGreaterThan(ordMit13);
    expect(z2033.einnahmenAhv).toBeGreaterThan(35_000); // ord. wäre ~30k inkl. 13.
    // Im Bereich der erwarteten Aufschub-Rente (±10%)
    expect(z2033.einnahmenAhv).toBeGreaterThan(erwartetAufschub * 0.9);
    expect(z2033.einnahmenAhv).toBeLessThan(erwartetAufschub * 1.1);
  });

  it("AHV vor Bezugsalter 70: keine Auszahlung bis und mit 2031", () => {
    expect(z2026.einnahmenAhv).toBe(0);
    expect(z2031.einnahmenAhv).toBe(0);
  });

  it("Erwerbseinkommen läuft 2026-2031, drop ab 2032", () => {
    expect(z2026.einnahmenErwerb).toBeGreaterThanOrEqual(140_000);
    expect(z2026.einnahmenErwerb).toBeLessThanOrEqual(150_000);
    expect(z2031.einnahmenErwerb).toBeGreaterThanOrEqual(140_000);
    expect(z2031.einnahmenErwerb).toBeLessThanOrEqual(150_000);
    expect(z2032.einnahmenErwerb).toBe(0);
    expect(z2040.einnahmenErwerb).toBe(0);
  });

  it("PK-Saldo bei 70: nur 'beiBezug'-Wert (700k × 5.8%) — keine Verlängerung bis 70 (ENGINE-LIMITATION)", () => {
    // Erwartet: PK-Rente ≈ 700'000 × 0.058 = 40'600/J, NICHT höher
    // (real wäre Saldo bei 70 nach 5 weiteren Sparjahren deutlich höher).
    // Ab 2033 (erstes volles PK-Rentenjahr nach Bezug April 2032)
    expect(z2033.einnahmenBvgRente).toBeGreaterThanOrEqual(39_000);
    expect(z2033.einnahmenBvgRente).toBeLessThanOrEqual(42_000);
    // Verifiziert: 700k × 5.8% = 40'600 (beiBezug-Wert, kein Hochlauf bis 70)
  });

  it("Steuern höher in Erwerbsphase (2026-2031) als nach Pensionierung (ab 2033)", () => {
    // Erwerbsphase: 145k Lohn + Eigenmietwert → hohe Steuer
    // Pensionsphase: AHV ~40k + PK ~40k → deutlich tiefere Steuer
    expect(z2026.ausgabenSteuern).toBeGreaterThan(z2033.ausgabenSteuern);
    expect(z2031.ausgabenSteuern).toBeGreaterThan(z2033.ausgabenSteuern);
    // Differenz substantiell (>30% Drop)
    expect(z2033.ausgabenSteuern).toBeLessThan(z2031.ausgabenSteuern * 0.7);
  });

  it("3a-Einzahlungen laufen bis 2031, 3a-Auszahlung 2032", () => {
    // 3a-Ablauf 2032 → kapAuszahlungen 2032 enthält 3a-Saldo
    expect(z2032.kapAuszahlungen).toBeGreaterThan(90_000);
    // Kapital-Sondertarif greift 2032
    expect(z2032.ausgabenSteuernKapital).toBeGreaterThan(0);
  });

  it("Vermögensbilanz 2026: Aktiva ≈ 2.27M (Liq+Depot+Immo+PK+3a+Cashflow), Schulden 300k Hypo", () => {
    // Free Vermögen 220+380+950 = 1.55M + PK 580k + 3a 95k + erwerbsphasen-Cashflow-Surplus
    expect(z2026.vermoegenAktiva).toBeGreaterThanOrEqual(2_100_000);
    expect(z2026.vermoegenAktiva).toBeLessThanOrEqual(2_400_000);
    // Vorsorgevermögen separat ausgewiesen
    expect(z2026.vermoegenVorsorge).toBeGreaterThanOrEqual(670_000);
    expect(z2026.vermoegenVorsorge).toBeLessThanOrEqual(690_000);
    expect(z2026.vermoegenSchulden).toBeGreaterThanOrEqual(299_000);
    expect(z2026.vermoegenSchulden).toBeLessThanOrEqual(301_000);
  });

  it("Alter steigt korrekt: 64 (2026) → 70 (2032) → 78 (2040)", () => {
    expect(z2026.alterP1).toBe(64);
    expect(z2032.alterP1).toBe(70);
    expect(z2040.alterP1).toBe(78);
  });
});

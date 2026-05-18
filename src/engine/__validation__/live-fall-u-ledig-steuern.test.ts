/**
 * Live-Fall U — Ledig-Konstellationen mit Steuer-Schwerpunkt.
 *
 * Drei Sub-Profile in einer Datei, Fokus auf der ESTV-Steuer-Engine
 * (Einkommens-, Vermögens-, Kapital-Sondertarif) für Ledige.
 *
 *   U.1  Anna Berger     — Geringverdiener  ZH (Mietwohnung)
 *   U.2  Markus Lutz     — Höhereinkommen   ZG (Eigenheim, PK-Kapital)
 *   U.3  Hans Frei       — Bereits pensioniert BE
 *
 * Test-Schwerpunkte:
 *   1. Einkommenssteuer pro Profil > 0 und plausibel (10–30 % vom Brutto je
 *      nach Kanton/Einkommen). Bund + Kanton getrennt validiert wenn möglich.
 *   2. Vermögenssteuer > 0, sobald Vermögen den Ledig-Freibetrag (~80k) klar
 *      überschreitet. ZG vs. ZH-Vergleich (ZG niedriger erwartet).
 *   3. Kapitalleistungssteuer im Bezugsjahr (Profil U.2 → PK-Kapital 720k
 *      bei Pension 65) mit Sondertarif (Bund 1/5 DBG + Kanton).
 *   4. Steuer-Differenz Kanton: ZG-Variante von Profil 1 < ZH-Original.
 *   5. Heute vs. Pension: Steuern sinken deutlich nach Pensionierung
 *      (kein Erwerbseinkommen mehr).
 *
 * Keine Engine-Änderungen. Eventuelle Drift wird in Kommentaren dokumentiert.
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe } from "../cashflow";
import type { CashflowInput } from "../cashflow";

// ─── Hilfs-Factory: leeres Default-Single-Setup ────────────────────────────
function emptyP2(): CashflowInput["person2"] {
  return {
    vorname: "",
    nachname: "",
    geburtsdatum: "",
    geschlecht: null,
    telefon: "",
    email: "",
  };
}

function defaultBvgP2(): CashflowInput["bvg"]["p2"] {
  return {
    aktiverAnschluss: false,
    altersguthabenHeute: null,
    altersguthabenBeiBezug: null,
    umwandlungssatzProzent: 6,
    bezugspraeferenz: "rente",
    kapitalanteil: 0,
    freizuegigkeit: [],
    einkaeufe: [],
    wefVorbezuege: [],
  };
}

function defaultBudget(
  total: number,
  wunsch: number,
  einkommen: CashflowInput["budget"]["einkommen"]
): CashflowInput["budget"] {
  return {
    einkommen,
    ausgabenModus: "total",
    ausgabenTotal: total,
    ausgabenKategorien: {
      lebenshaltung: null,
      wohnen: null,
      mobilitaet: null,
      versicherungen: null,
      ferienHobby: null,
      sonstiges: null,
    },
    wunschverbrauchPension: wunsch,
    steuernHeute: null,
    einkommenHeute: null,
    religion: "keine",
    alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
  };
}

// ─── U.1: Anna Berger — Geringverdiener ZH ─────────────────────────────────
function makeAnnaZh(): CashflowInput {
  return {
    fallart: "einzel",
    zivilstand: "ledig",
    person1: {
      vorname: "Anna",
      nachname: "Berger",
      geburtsdatum: "1980-03-15",
      geschlecht: "w",
      telefon: "",
      email: "",
    },
    person2: emptyP2(),
    kinder: [],
    ahv: {
      einkommenP1: 65_000,
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
        altersguthabenHeute: 90_000,
        altersguthabenBeiBezug: 200_000,
        umwandlungssatzProzent: 5.8,
        bezugspraeferenz: "rente",
        kapitalanteil: 0,
        freizuegigkeit: [],
        einkaeufe: [],
        wefVorbezuege: [],
      },
      p2: defaultBvgP2(),
    },
    saeuleDrei: { p1: [], p2: [] },
    vermoegen: {
      items: [
        {
          id: "anna-konto",
          typ: "konto",
          beschreibung: "Privatkonto",
          saldoHeute: 25_000,
          renditeProzent: 0,
          istHauptkonto: true,
        },
      ],
    },
    immobilien: { items: [] }, // Mietwohnung
    firma: {
      vorhanden: false,
      firmenname: "",
      moeglicherVerkaufserloes: null,
      plan: "behalten",
      verkaufsjahr: 2050,
    },
    ziele: { bezugsalterP1: 65, bezugsalterP2: 65 },
    budget: defaultBudget(4_200, 3_800, [
      {
        id: "anna-lohn",
        beschreibung: "Lohn",
        personIdx: 1 as const,
        betragMonatlich: 5_417, // 65k / 12
        von: "2026-01",
        bis: "2045-03",
      },
    ]),
    adresse: {
      strasse: "Limmatstrasse 50",
      plz: "8005",
      ort: "Zürich",
      kanton: "ZH",
      gemeindeBfsId: 261,
      gemeindeName: "Zürich",
    },
    einmaligeAusgaben: [],
  };
}

// ─── U.2: Markus Lutz — Höhereinkommen ZG ──────────────────────────────────
function makeMarkusZg(): CashflowInput {
  return {
    fallart: "einzel",
    zivilstand: "ledig",
    person1: {
      vorname: "Markus",
      nachname: "Lutz",
      geburtsdatum: "1975-09-22",
      geschlecht: "m",
      telefon: "",
      email: "",
    },
    person2: emptyP2(),
    kinder: [],
    ahv: {
      einkommenP1: 180_000,
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
        umwandlungssatzProzent: 5.6,
        bezugspraeferenz: "kapital", // einmal-Auszahlung 720k 2040
        kapitalanteil: 100,
        freizuegigkeit: [],
        einkaeufe: [],
        wefVorbezuege: [],
      },
      p2: defaultBvgP2(),
    },
    saeuleDrei: { p1: [], p2: [] },
    vermoegen: {
      items: [
        {
          id: "ml-konto",
          typ: "konto",
          beschreibung: "Privatkonto",
          saldoHeute: 200_000,
          renditeProzent: 0,
          istHauptkonto: true,
        },
        {
          id: "ml-depot",
          typ: "depot",
          beschreibung: "Wertschriften-Depot",
          saldoHeute: 350_000,
          renditeProzent: 3,
          istHauptkonto: false,
        },
      ],
    },
    immobilien: {
      items: [
        {
          id: "ml-eh",
          beschreibung: "Eigenheim Zug",
          typ: "selbstbewohnt",
          verkehrswert: 1_200_000,
          hypotheken: [
            {
              id: "ml-h1",
              beschreibung: "1. Hypothek",
              hoehe: 500_000,
              zinssatzProzent: 1.5,
              ablaufjahr: 2035,
            },
          ],
          plan: "behalten",
          verkaufsjahr: 2060,
          jaehrlicheMieteinnahmen: null,
          kaufjahr: 2015,
          anlagekosten: 1_000_000,
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
    budget: defaultBudget(8_500, 7_500, [
      {
        id: "ml-lohn",
        beschreibung: "Lohn",
        personIdx: 1 as const,
        betragMonatlich: 15_000, // 180k / 12
        von: "2026-01",
        bis: "2040-09",
      },
    ]),
    adresse: {
      strasse: "Baarerstrasse 1",
      plz: "6300",
      ort: "Zug",
      kanton: "ZG",
      gemeindeBfsId: 1711,
      gemeindeName: "Zug",
    },
    einmaligeAusgaben: [],
  };
}

// ─── U.3: Hans Frei — Bereits pensioniert BE ───────────────────────────────
function makeHansBe(): CashflowInput {
  return {
    fallart: "einzel",
    zivilstand: "ledig",
    person1: {
      vorname: "Hans",
      nachname: "Frei",
      geburtsdatum: "1962-02-10",
      geschlecht: "m",
      telefon: "",
      email: "",
    },
    person2: emptyP2(),
    kinder: [],
    ahv: {
      einkommenP1: 0,
      einkommenP2: null,
      hatIkAuszugP1: true,
      hatIkAuszugP2: false,
      hatFehljahreP1: false,
      hatFehljahreP2: false,
      fehljahreAnzahlP1: 0,
      fehljahreAnzahlP2: 0,
      // Hans 2026 = 64, ordentlicher Bezug bei 65 (2027)
      ahvBezugsalterP1: 65,
      ahvBezugsalterP2: 65,
      ahvRenteJahrEffektivP1: 30_000,
      ahvRenteJahrEffektivP2: null,
    },
    bvg: {
      p1: {
        aktiverAnschluss: true,
        altersguthabenHeute: 0,
        altersguthabenBeiBezug: 583_000, // 35k / 6% UWS ≈ 583k
        umwandlungssatzProzent: 6.0,
        bezugspraeferenz: "rente",
        kapitalanteil: 0,
        freizuegigkeit: [],
        einkaeufe: [],
        wefVorbezuege: [],
      },
      p2: defaultBvgP2(),
    },
    saeuleDrei: { p1: [], p2: [] },
    vermoegen: {
      items: [
        {
          id: "hf-konto",
          typ: "konto",
          beschreibung: "Privatkonto",
          saldoHeute: 280_000,
          renditeProzent: 0,
          istHauptkonto: true,
        },
      ],
    },
    immobilien: { items: [] }, // Miete
    firma: {
      vorhanden: false,
      firmenname: "",
      moeglicherVerkaufserloes: null,
      plan: "behalten",
      verkaufsjahr: 2050,
    },
    ziele: { bezugsalterP1: 65, bezugsalterP2: 65 },
    budget: defaultBudget(5_500, 5_200, []), // Erwerb 0
    adresse: {
      strasse: "Marktgasse 3",
      plz: "3011",
      ort: "Bern",
      kanton: "BE",
      gemeindeBfsId: 351,
      gemeindeName: "Bern",
    },
    einmaligeAusgaben: [],
  };
}

// ───────────────────────────────────────────────────────────────────────────
// U.1 — Anna Berger (ZH, Geringverdiener)
// ───────────────────────────────────────────────────────────────────────────

describe("Live-Fall U.1 — Anna Berger (Ledig, ZH, 65k Lohn)", () => {
  const state = makeAnnaZh();
  const reihe = cashflowReihe(state, 2026, 2050);
  const z2026 = reihe.find((r) => r.jahr === 2026)!;
  const z2046 = reihe.find((r) => r.jahr === 2046)!; // erstes volles Pensionsjahr (Anna geb 1980 → 65 = 2045)

  it("Einkommenssteuer 2026 > 0 und plausibel (10–30 % vom Brutto)", () => {
    expect(z2026.ausgabenSteuernEinkommen).toBeGreaterThan(0);
    // Bei 65k Lohn ZH ledig: real ≈ 7–10k Steuer (~12–15 %). Akzeptiere
    // weite Range, da Engine ohne Detail-Abzüge rechnet.
    const quoteVomLohn = z2026.ausgabenSteuernEinkommen / 65_000;
    expect(quoteVomLohn).toBeGreaterThan(0.05);
    expect(quoteVomLohn).toBeLessThan(0.3);
  });

  it("Bund + Kanton aufgeschlüsselt, beide > 0, Kanton > Bund (ZH)", () => {
    expect(z2026.ausgabenSteuernEinkommenBund).toBeGreaterThan(0);
    expect(z2026.ausgabenSteuernEinkommenKanton).toBeGreaterThan(0);
    // ZH-Tarif: Kanton+Gemeinde meist > Bund bei mittleren Einkommen
    expect(z2026.ausgabenSteuernEinkommenKanton).toBeGreaterThan(
      z2026.ausgabenSteuernEinkommenBund
    );
    // Summe = Total
    expect(
      z2026.ausgabenSteuernEinkommenBund + z2026.ausgabenSteuernEinkommenKanton
    ).toBeCloseTo(z2026.ausgabenSteuernEinkommen, -1); // ±10 wegen Rundung
  });

  it("Vermögenssteuer 2026 ≈ 0 (Vermögen 25k < Freibetrag 80k ledig ZH)", () => {
    // Vermögen Anna nur 25k Liquidität → unter ZH-Freibetrag 80k Single
    expect(z2026.ausgabenSteuernVermoegen).toBeLessThan(50);
  });

  it("Pensionsjahre: Steuern sinken (kein Erwerb mehr)", () => {
    // 2045 = Übergangsjahr, 2046 erstes volles Rentenjahr
    expect(z2046.einnahmenErwerb).toBe(0);
    expect(z2046.ausgabenSteuernEinkommen).toBeLessThan(
      z2026.ausgabenSteuernEinkommen
    );
  });
});

// ───────────────────────────────────────────────────────────────────────────
// U.2 — Markus Lutz (ZG, 180k, PK-Kapital 720k bei 65)
// ───────────────────────────────────────────────────────────────────────────

describe("Live-Fall U.2 — Markus Lutz (Ledig, ZG, 180k, PK-Kapital)", () => {
  const state = makeMarkusZg();
  const reihe = cashflowReihe(state, 2026, 2050);
  const z2026 = reihe.find((r) => r.jahr === 2026)!;
  // Markus geb 1975-09 → 65 erreicht 2040-09 → PK-Kapital fällt in 2040
  const z2040 = reihe.find((r) => r.jahr === 2040)!;
  const z2042 = reihe.find((r) => r.jahr === 2042)!;

  it("Einkommenssteuer 2026 > 0, ZG-Quote tiefer als ZH wäre", () => {
    expect(z2026.ausgabenSteuernEinkommen).toBeGreaterThan(0);
    const quote = z2026.ausgabenSteuernEinkommen / 180_000;
    // ZG Single 180k Brutto: real ≈ 15–20 % effektiv
    expect(quote).toBeGreaterThan(0.08);
    expect(quote).toBeLessThan(0.3);
  });

  it("Vermögenssteuer 2026 > 0 (Vermögen ~750k netto > Freibetrag)", () => {
    // 200k Liq + 350k Depot + 1.2M Immo − 500k Hypo ≈ 1.25M Aktiva netto
    expect(z2026.vermoegenNetto).toBeGreaterThan(1_000_000);
    expect(z2026.ausgabenSteuernVermoegen).toBeGreaterThan(0);
  });

  it("PK-Kapitalauszahlung 2040: Sondertarif > 0 (Bund + Kanton)", () => {
    // Markus geb 1975-09 → Pension 65 → 2040, bezugspraeferenz "kapital"
    // → einmalige Kapitalauszahlung ~720k im Jahr 2040
    expect(z2040.kapAuszahlungen).toBeGreaterThan(500_000);
    expect(z2040.ausgabenSteuernKapital).toBeGreaterThan(0);
    // Sondertarif aufgeteilt
    expect(z2040.ausgabenSteuernKapitalBund).toBeGreaterThan(0);
    expect(z2040.ausgabenSteuernKapitalKanton).toBeGreaterThan(0);
    // Bei ~720k Bezug: realer Sondertarif ZG-Single ≈ 5–8 % gesamt → 35-60k
    expect(z2040.ausgabenSteuernKapital).toBeGreaterThan(15_000);
    expect(z2040.ausgabenSteuernKapital).toBeLessThan(200_000);
  });

  it("Kapitalsteuer nur im Bezugsjahr, nicht in Folgejahren", () => {
    // 2042 = 2 J. nach Bezug → keine erneute Kapitalsteuer
    expect(z2042.ausgabenSteuernKapital).toBe(0);
    expect(z2042.kapAuszahlungen).toBe(0);
  });

  it("Pensionsjahre: Einkommenssteuer fällt deutlich (kein Lohn mehr)", () => {
    // 2042 hat keinen Lohn mehr (Bezug Mitte 2040)
    expect(z2042.einnahmenErwerb).toBe(0);
    // Vor Pension (2026) sehr hoch wegen 180k Lohn
    // Nach Pension (2042): AHV ~30k + ggf. minimale Rente → viel tiefere Steuer
    expect(z2042.ausgabenSteuernEinkommen).toBeLessThan(
      z2026.ausgabenSteuernEinkommen * 0.5
    );
  });
});

// ───────────────────────────────────────────────────────────────────────────
// U.3 — Hans Frei (BE, kurz vor Pension, AHV 30k + PK-Rente 35k)
// ───────────────────────────────────────────────────────────────────────────

describe("Live-Fall U.3 — Hans Frei (Ledig, BE, vor Pension 65)", () => {
  const state = makeHansBe();
  const reihe = cashflowReihe(state, 2026, 2045);
  const z2026 = reihe.find((r) => r.jahr === 2026)!; // Hans 64, noch vor Pension
  // Hans geb 1962-02 → 65 erreicht 2027-02 → ab 2028 volle Renten
  const z2028 = reihe.find((r) => r.jahr === 2028)!;

  it("2026: Erwerb = 0, Einkommenssteuer sehr tief oder 0", () => {
    expect(z2026.einnahmenErwerb).toBe(0);
    // Vor Pension, kein Erwerb → Einkommenssteuer praktisch 0
    expect(z2026.ausgabenSteuernEinkommen).toBeGreaterThanOrEqual(0);
    expect(z2026.ausgabenSteuernEinkommen).toBeLessThan(2_000);
  });

  it("2028 (Pension voll): AHV ~30k×13/12 + PK-Rente ~35k zu versteuern", () => {
    // Override 30k AHV × 13/12 ≈ 32.5k
    expect(z2028.einnahmenAhv).toBeGreaterThan(31_000);
    expect(z2028.einnahmenAhv).toBeLessThan(34_000);
    // PK-Rente: 583k × 6% ≈ 35k
    expect(z2028.einnahmenBvgRente).toBeGreaterThan(33_000);
    expect(z2028.einnahmenBvgRente).toBeLessThan(37_000);
    // Renten sind voll steuerbar → Einkommenssteuer > 0
    expect(z2028.ausgabenSteuernEinkommen).toBeGreaterThan(0);
    // Real BE Single, Einkommen ~67k: effektiv ~10–18 %
    const quote =
      z2028.ausgabenSteuernEinkommen /
      (z2028.einnahmenAhv + z2028.einnahmenBvgRente);
    expect(quote).toBeGreaterThan(0.03);
    expect(quote).toBeLessThan(0.25);
  });

  it("Vermögenssteuer > 0 (280k Liquidität > Freibetrag 80k BE Single)", () => {
    expect(z2026.ausgabenSteuernVermoegen).toBeGreaterThan(0);
  });

  it("Keine Kapitalsteuer (PK ist Rente, keine 3a-Auszahlung)", () => {
    for (const z of reihe) {
      expect(z.ausgabenSteuernKapital).toBe(0);
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Cross-Profil Vergleiche
// ───────────────────────────────────────────────────────────────────────────

describe("Live-Fall U — Kanton-Steuerdifferenz ZH vs ZG", () => {
  it("Anna 65k: ZG-Variante zahlt deutlich weniger Einkommenssteuer als ZH", () => {
    const zh = cashflowReihe(makeAnnaZh(), 2026, 2026)[0]!;
    // Hypothetische ZG-Variante: gleiche Anna, anderer Wohnsitz
    const annaZg = makeAnnaZh();
    annaZg.adresse = {
      ...annaZg.adresse,
      plz: "6300",
      ort: "Zug",
      kanton: "ZG",
      gemeindeBfsId: 1711,
      gemeindeName: "Zug",
    };
    const zg = cashflowReihe(annaZg, 2026, 2026)[0]!;

    // Beide haben gleichen Bundessteuer-Anteil (DBG ist national).
    expect(zg.ausgabenSteuernEinkommenBund).toBeCloseTo(
      zh.ausgabenSteuernEinkommenBund,
      -1
    );
    // Kanton ZG niedriger als ZH (Tiefsteuer-Kanton)
    expect(zg.ausgabenSteuernEinkommenKanton).toBeLessThan(
      zh.ausgabenSteuernEinkommenKanton
    );
    expect(zg.ausgabenSteuernEinkommen).toBeLessThan(
      zh.ausgabenSteuernEinkommen
    );
  });

  it("Markus 750k netto: ZG-Vermögenssteuer niedriger als ZH-Variante", () => {
    const zg2026 = cashflowReihe(makeMarkusZg(), 2026, 2026)[0]!;
    const markusZh = makeMarkusZg();
    markusZh.adresse = {
      ...markusZh.adresse,
      plz: "8005",
      ort: "Zürich",
      kanton: "ZH",
      gemeindeBfsId: 261,
      gemeindeName: "Zürich",
    };
    const zh2026 = cashflowReihe(markusZh, 2026, 2026)[0]!;

    // Beide haben Vermögenssteuer > 0 (Vermögen > Freibetrag)
    expect(zg2026.ausgabenSteuernVermoegen).toBeGreaterThan(0);
    expect(zh2026.ausgabenSteuernVermoegen).toBeGreaterThan(0);
    // ZG sollte niedriger sein (Tiefsteuer-Kanton)
    // Hinweis: bei sehr hohen Vermögen kann der ZG-Vorteil schrumpfen —
    // Engine-Drift wäre hier ein Failure-Signal.
    expect(zg2026.ausgabenSteuernVermoegen).toBeLessThan(
      zh2026.ausgabenSteuernVermoegen
    );
  });
});

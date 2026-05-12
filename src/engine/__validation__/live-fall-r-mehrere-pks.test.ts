/**
 * Live-Test Fall R: Einzelperson mit Stellenwechsel-Historie —
 * mehrere Vorsorge-Töpfe (aktuelle PK + Freizügigkeitskonto).
 *
 * Profil (Andreas Lüthi):
 *  - ledig, geb. 1966-04-15 (heute 2026 → 60 J., Pension mit 65 = 2031)
 *  - Kanton AG (Aarau)
 *  - Stellenwechsel 2020: alte PK-Gelder aufs Freizügigkeitskonto übertragen
 *  - Erwerbseinkommen 105'000/J — Anstellung seit 2020 (neue PK)
 *  - Aktuelle PK: aktiverAnschluss=true, AG heute 240k, AG bei Bezug 65 = 380k,
 *    UWS 5.8%, Bezugspräferenz "rente"
 *  - Freizügigkeitskonto (alte PK): Saldo 180k, Rendite 1%, Auszahlung 2031
 *    (gleiches Jahr wie Pension)
 *  - Säule 3a 65'000, Einzahlung 7'258/J (Max 2026)
 *  - Liquidität 95k, Depot 140k
 *  - Mietwohnung (keine Immobilie)
 *
 * Ziel: validieren, dass die Engine mehrere Vorsorge-Töpfe parallel verwaltet:
 *   1. vermoegenVorsorge enthält FZ + aktuelle PK (vor Bezug)
 *   2. FZ-Auszahlung 2031 fliesst in kapAuszahlungen
 *   3. FZ-Kapital wird im Bezugsjahr mit Sondertarif besteuert
 *   4. Engine läuft stabil mit mehreren Vorsorge-Töpfen
 *
 * Engine NICHT verändern, nur testen.
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe, type CashflowInput } from "../cashflow";
import { freizuegigkeitAuszahlung } from "../bvg";

function buildAndreasLuethi(): CashflowInput {
  return {
    fallart: "einzel",
    zivilstand: "ledig",
    person1: {
      vorname: "Andreas",
      nachname: "Lüthi",
      geburtsdatum: "1966-04-15",
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
      einkommenP1: 105_000,
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
        altersguthabenHeute: 240_000,
        altersguthabenBeiBezug: 380_000,
        umwandlungssatzProzent: 5.8,
        bezugspraeferenz: "rente",
        kapitalanteil: 0,
        freizuegigkeit: [
          {
            id: "fz-alte-pk-2020",
            beschreibung: "FZ-Konto Migros Bank (alte PK, Stellenwechsel 2020)",
            saldoHeute: 180_000,
            auszahlungsjahr: 2031, // gleiches Jahr wie Pension
            renditeProzent: 1.0,
          },
        ],
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
          id: "3a-andreas",
          type: "konto",
          saeule: "3a",
          beschreibung: "Säule 3a Raiffeisen",
          aktuellerWert: 65_000,
          auszahlungsjahr: 2031,
          renditeProzent: 1.0,
          rueckkaufswert: null,
          ablaufswert: null,
          ablaufjahr: 2031,
          jaehrlicheEinzahlung: 7_258,
          einzahlungAb: 2026,
          einzahlungBis: 2030,
        },
      ],
      p2: [],
    },
    vermoegen: {
      items: [
        {
          id: "liq",
          typ: "konto",
          beschreibung: "Privatkonto Raiffeisen",
          saldoHeute: 95_000,
          renditeProzent: 0,
          istHauptkonto: true,
        },
        {
          id: "depot",
          typ: "depot",
          beschreibung: "Wertschriften-Depot",
          saldoHeute: 140_000,
          renditeProzent: 3.0,
          istHauptkonto: false,
        },
      ],
    },
    immobilien: { items: [] }, // Mietwohnung — keine Immobilie
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
          beschreibung: "Anstellung",
          personIdx: 1,
          betragMonatlich: Math.round(105_000 / 12),
          von: "2020-01",
          bis: "2031-04", // Pension 65 (April 2031)
          typ: "anstellung",
        },
      ],
      ausgabenModus: "total",
      ausgabenTotal: 5_500, // 5'500/Mt = 66'000/J — Miete + Lebenshaltung
      ausgabenKategorien: {
        lebenshaltung: null,
        wohnen: null,
        mobilitaet: null,
        versicherungen: null,
        ferienHobby: null,
        sonstiges: null,
      },
      wunschverbrauchPension: 4_800,
      steuernHeute: null,
      einkommenHeute: 105_000,
      religion: "keine",
      alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
    },
    adresse: {
      strasse: "",
      plz: "5000",
      ort: "Aarau",
      kanton: "AG",
      gemeindeBfsId: null,
      gemeindeName: "Aarau",
    },
    einmaligeAusgaben: [],
  };
}

describe("Live Fall R — Andreas Lüthi (Stellenwechsel, mehrere Vorsorge-Töpfe)", () => {
  it("freizuegigkeitAuszahlung: FZ-Saldo 180k mit 1% Rendite über 5 J ≈ 189k", () => {
    const a = freizuegigkeitAuszahlung(
      { saldoHeute: 180_000, auszahlungsjahr: 2031, renditeProzent: 1.0 },
      2026
    );
    expect(a.jahr).toBe(2031);
    // 180k × 1.01^5 = 189'182
    expect(a.betrag).toBeGreaterThan(188_000);
    expect(a.betrag).toBeLessThan(190_000);
  });

  it("vermoegenVorsorge 2026 enthält PK-Saldo + FZ + 3a (alle Töpfe parallel)", () => {
    const reihe = cashflowReihe(buildAndreasLuethi(), 2026, 2035);
    const z2026 = reihe.find((z) => z.jahr === 2026)!;

    // Erwartung 2026 (vor Bezug 2031):
    //  - PK-Sparphase ~240k (heute)
    //  - FZ-Saldo ~180k (180k × 1.01^0 = 180k)
    //  - 3a ~65k
    //  → ~485k
    console.log(`\n=== FALL R 2026 — Vorsorge-Vermögen ===`);
    console.log(`vermoegenVorsorge: ${z2026.vermoegenVorsorge}`);
    console.log(`  Erwartet ~PK 240k + FZ 180k + 3a 65k = ~485k`);

    expect(z2026.vermoegenVorsorge).toBeGreaterThan(450_000);
    expect(z2026.vermoegenVorsorge).toBeLessThan(520_000);
  });

  it("vermoegenVorsorge wächst bis 2030: PK-Hochlauf + FZ-Rendite + 3a-Einzahlungen", () => {
    const reihe = cashflowReihe(buildAndreasLuethi(), 2026, 2035);
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    const z2030 = reihe.find((z) => z.jahr === 2030)!;

    console.log(`\n=== FALL R — Vorsorge-Hochlauf ===`);
    console.log(`2026: ${z2026.vermoegenVorsorge}`);
    console.log(`2030: ${z2030.vermoegenVorsorge}`);

    // 2030 (letztes Jahr vor Bezug):
    //   PK ~365k (linearer Hochlauf 240k→380k über 5 J)
    //   FZ ~187k (180k × 1.01^4)
    //   3a ~110k (65k + 4×7'258 + Verzinsung)
    //   → ~660k
    expect(z2030.vermoegenVorsorge).toBeGreaterThan(z2026.vermoegenVorsorge);
    expect(z2030.vermoegenVorsorge).toBeGreaterThan(600_000);
    expect(z2030.vermoegenVorsorge).toBeLessThan(720_000);
  });

  it("Bezugsjahr 2031: FZ + 3a fliessen in kapAuszahlungen", () => {
    const reihe = cashflowReihe(buildAndreasLuethi(), 2026, 2035);
    const z2031 = reihe.find((z) => z.jahr === 2031)!;
    const z2030 = reihe.find((z) => z.jahr === 2030)!;

    console.log(`\n=== FALL R 2031 — Bezugsjahr ===`);
    console.log(`kapAuszahlungen 2030: ${z2030.kapAuszahlungen}`);
    console.log(`kapAuszahlungen 2031: ${z2031.kapAuszahlungen}`);
    console.log(`  Erwartet: FZ ~189k + 3a ~115k = ~304k`);

    // 2030 keine Kapitalauszahlungen
    expect(z2030.kapAuszahlungen).toBe(0);

    // 2031: FZ 189k + 3a 115k ≈ 304k (PK ist Rente, kein Kapital)
    expect(z2031.kapAuszahlungen).toBeGreaterThan(280_000);
    expect(z2031.kapAuszahlungen).toBeLessThan(330_000);
  });

  it("Bezugsjahr 2031: Kapital-Steuer (Sondertarif) wird auf FZ + 3a berechnet", () => {
    const reihe = cashflowReihe(buildAndreasLuethi(), 2026, 2035);
    const z2030 = reihe.find((z) => z.jahr === 2030)!;
    const z2031 = reihe.find((z) => z.jahr === 2031)!;

    console.log(`\n=== FALL R 2031 — Kapital-Steuer ===`);
    console.log(`Steuer Kapital 2030: ${z2030.ausgabenSteuernKapital}`);
    console.log(`Steuer Kapital 2031: ${z2031.ausgabenSteuernKapital}`);
    console.log(`  davon Bund:        ${z2031.ausgabenSteuernKapitalBund}`);
    console.log(`  davon Kanton AG:   ${z2031.ausgabenSteuernKapitalKanton}`);

    // 2030 kein Kapitalbezug → keine Sondertarif-Steuer
    expect(z2030.ausgabenSteuernKapital).toBe(0);

    // 2031: Sondertarif greift auf ~304k Kapital (FZ + 3a)
    expect(z2031.ausgabenSteuernKapital).toBeGreaterThan(10_000);
    // Kanton-Anteil > 0 (AG-Sondertarif)
    expect(z2031.ausgabenSteuernKapitalKanton).toBeGreaterThan(0);
    // Bund-Anteil > 0 (1/5 DBG)
    expect(z2031.ausgabenSteuernKapitalBund).toBeGreaterThan(0);
  });

  it("Nach Bezug 2031: vermoegenVorsorge sinkt deutlich (FZ + 3a ausgezahlt)", () => {
    const reihe = cashflowReihe(buildAndreasLuethi(), 2026, 2035);
    const z2030 = reihe.find((z) => z.jahr === 2030)!;
    const z2031 = reihe.find((z) => z.jahr === 2031)!;

    console.log(`\n=== FALL R — Vorsorge vor/nach Bezug ===`);
    console.log(`vermoegenVorsorge 2030: ${z2030.vermoegenVorsorge}`);
    console.log(`vermoegenVorsorge 2031: ${z2031.vermoegenVorsorge}`);

    // 2031: FZ ist ausgezahlt (auf Hauptkonto), 3a auch, PK = Rente (Saldo = 0).
    // → vermoegenVorsorge sollte stark sinken (FZ + 3a + PK alle weg).
    expect(z2031.vermoegenVorsorge).toBeLessThan(z2030.vermoegenVorsorge);
    // Nach komplettem Bezug erwarten wir < 50k Restposten
    expect(z2031.vermoegenVorsorge).toBeLessThan(50_000);
  });

  it("Hauptkonto bekommt FZ + 3a-Auszahlung im Bezugsjahr — vermoegenLiquiditaet steigt", () => {
    const reihe = cashflowReihe(buildAndreasLuethi(), 2026, 2035);
    const z2030 = reihe.find((z) => z.jahr === 2030)!;
    const z2031 = reihe.find((z) => z.jahr === 2031)!;

    console.log(`\n=== FALL R — Liquidität vor/nach Bezug ===`);
    console.log(`vermoegenLiquiditaet 2030: ${z2030.vermoegenLiquiditaet}`);
    console.log(`vermoegenLiquiditaet 2031: ${z2031.vermoegenLiquiditaet}`);
    console.log(`Δ: ${z2031.vermoegenLiquiditaet - z2030.vermoegenLiquiditaet}`);

    // FZ ~189k + 3a ~115k = ~304k fliessen ins Hauptkonto, abzüglich
    // Sondertarif-Steuer und laufende Ausgaben → Δ Liquidität ~+250k
    expect(z2031.vermoegenLiquiditaet).toBeGreaterThan(z2030.vermoegenLiquiditaet);
    expect(z2031.vermoegenLiquiditaet - z2030.vermoegenLiquiditaet).toBeGreaterThan(200_000);
  });

  it("Engine läuft stabil mit mehreren Vorsorge-Töpfen: alle 10 Jahre konsistent", () => {
    const reihe = cashflowReihe(buildAndreasLuethi(), 2026, 2035);

    expect(reihe.length).toBe(10);

    console.log(`\n=== FALL R — Cashflow-Reihe Übersicht ===`);
    console.log(`Jahr | Alter | Erwerb | AHV  | PK-Rente | KapAusz. | Vermögen Netto`);
    for (const z of reihe) {
      console.log(
        `${z.jahr} | ${String(z.alterP1).padStart(5)} |` +
          ` ${String(Math.round(z.einnahmenErwerb)).padStart(6)} |` +
          ` ${String(Math.round(z.einnahmenAhv)).padStart(4)} |` +
          ` ${String(Math.round(z.einnahmenBvgRente)).padStart(8)} |` +
          ` ${String(Math.round(z.kapAuszahlungen)).padStart(8)} |` +
          ` ${String(Math.round(z.vermoegenNetto)).padStart(14)}`
      );
    }

    // Sanity: keine NaN / Negativ-Vermögen
    for (const z of reihe) {
      expect(Number.isFinite(z.vermoegenNetto)).toBe(true);
      expect(Number.isFinite(z.vermoegenVorsorge)).toBe(true);
      expect(Number.isFinite(z.kapAuszahlungen)).toBe(true);
      expect(z.vermoegenNetto).toBeGreaterThan(0);
    }

    // Vor Pension keine PK-Rente
    const z2030 = reihe.find((z) => z.jahr === 2030)!;
    expect(z2030.einnahmenBvgRente).toBe(0);

    // Nach Pension PK-Rente läuft (380k × 5.8% ≈ 22'040)
    const z2032 = reihe.find((z) => z.jahr === 2032)!;
    expect(z2032.einnahmenBvgRente).toBeGreaterThan(20_000);
    expect(z2032.einnahmenBvgRente).toBeLessThan(24_000);
  });
});

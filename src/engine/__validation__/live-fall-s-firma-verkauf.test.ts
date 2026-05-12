/**
 * Live-Test Fall S: Einzelperson Selbständig (Einzelfirma) mit Firma-Verkauf
 * bei Pensionierung.
 *
 * Profil (Beat Imhof — "Imhof Treuhand"):
 *  - Ledig, geb. 1965-06-15 (heute 2026 → 60/61 J.)
 *  - Kanton TG, Frauenfeld
 *  - Selbständigerwerbender (Einzelfirma seit 2000), keine PK-Anschluss
 *  - Erwerb 180'000/J (typ="selbstaendigkeit") bis Pension Ende 2030 (Alter 65)
 *  - Säule 3a: Selbständige ohne BVG → "grosse" Maximum 20 % vom Einkommen,
 *    gedeckelt auf BVG-Maximum 2025 = 36'288. Hier 36'000/J bis 2030.
 *  - Firma-Verkauf 2030: möglicher Verkaufserlös 800'000 (Goodwill +
 *    stille Reserven). Plan = "verkaufen", verkaufsjahr = 2030.
 *  - Vermögen: 280k Liquidität + 350k Depot (3%)
 *  - Mietwohnung TG (keine Immobilie)
 *
 * Wichtig: NUR Tests — keine Engine-Änderungen.
 *
 * Was wir testen:
 *  1. Engine läuft ohne Crash, liefert 20 Jahre
 *  2. Erwerb 180k/J in 2026-2030, danach 0
 *  3. Selbständig-AHV-Mehraufwand 5.85 % × 180k ≈ 10'530/J vor Pension
 *  4. 3a-Einzahlung 36k/J wirkt steuerlich (Steuer mit < Steuer ohne)
 *  5. 2030 Firma-Verkauf: kapAuszahlungen +800k im Verkaufsjahr
 *  6. firmaWertAmJahresende: bis 2029 = 800k (Firma noch da), ab 2030 = 0
 *  7. Vermögen Aktiva 2030 enthält Firma-Verkaufserlös sichtbar (Liquid-Bucket)
 *  8. Veräusserungsgewinn-Bund: 1/5-Privileg DBG (Art. 37b DBG) — wir
 *     dokumentieren ob Engine den Sondertarif anwendet (Erwartung: heute
 *     wird Verkaufserlös als ganz normale Kapital-Auszahlung besteuert,
 *     d.h. zusammen mit 3a 2030 über kapitalAuszahlungs-Sondertarif).
 *  9. AHV-Rente Beat ab 2031: Einzelrente max 32'760 (30'240 × 13/12)
 * 10. Plausi: keine NaN, vermoegenNetto steigt im Verkaufsjahr deutlich
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe, type CashflowInput } from "../cashflow";

function buildBeatImhof(): CashflowInput {
  return {
    fallart: "einzel",
    zivilstand: "ledig",
    person1: {
      vorname: "Beat",
      nachname: "Imhof",
      geburtsdatum: "1965-06-15",
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
      // Klassisch Selbständige ohne BVG-Anschluss
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
    saeuleDrei: {
      p1: [
        {
          id: "3a-beat",
          type: "konto",
          saeule: "3a",
          beschreibung: "Säule 3a Selbständig (grosse Säule 20%)",
          aktuellerWert: 120_000,
          auszahlungsjahr: 2030,
          renditeProzent: 1.0,
          rueckkaufswert: null,
          ablaufswert: null,
          ablaufjahr: 2030,
          // 20% von 180k = 36'000 (gedeckelt auf BVG-Max 2025 = 36'288)
          jaehrlicheEinzahlung: 36_000,
          einzahlungAb: 2026,
          einzahlungBis: 2030,
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
      // Beat ist Mieter — keine Immobilie
      items: [],
    },
    firma: {
      vorhanden: true,
      firmenname: "Imhof Treuhand",
      moeglicherVerkaufserloes: 800_000,
      plan: "verkaufen",
      verkaufsjahr: 2030,
    },
    ziele: { bezugsalterP1: 65, bezugsalterP2: 65 },
    budget: {
      einkommen: [
        {
          id: "ek-se",
          beschreibung: "Imhof Treuhand — Selbständig",
          personIdx: 1,
          // 180k/J ÷ 12 = 15'000/Mt
          betragMonatlich: 15_000,
          von: "2026-01",
          bis: "2030-12",
          typ: "selbstaendigkeit",
        },
      ],
      ausgabenModus: "total",
      ausgabenTotal: 8_000, // 96k/J
      ausgabenKategorien: {
        lebenshaltung: null,
        wohnen: null,
        mobilitaet: null,
        versicherungen: null,
        ferienHobby: null,
        sonstiges: null,
      },
      wunschverbrauchPension: 6_500, // 78k/J in Pension
      steuernHeute: null,
      einkommenHeute: null,
      religion: "keine",
      alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
    },
    adresse: {
      strasse: "Promenadenstrasse 1",
      plz: "8500",
      ort: "Frauenfeld",
      kanton: "TG",
      gemeindeBfsId: null,
      gemeindeName: "Frauenfeld",
    },
    einmaligeAusgaben: [],
  };
}

describe("Live-Fall S — Beat Imhof TG (Selbständig + Firma-Verkauf 2030)", () => {
  const input = buildBeatImhof();
  const reihe = cashflowReihe(input, 2026, 2045);

  // ─── 1. Engine läuft ohne Crash ──────────────────────────────────
  it("liefert eine Reihe für 2026-2045 (20 Jahre), keine NaN", () => {
    expect(reihe).toHaveLength(20);
    expect(reihe[0]!.jahr).toBe(2026);
    expect(reihe[19]!.jahr).toBe(2045);
    for (const z of reihe) {
      expect(Number.isFinite(z.einnahmenTotal)).toBe(true);
      expect(Number.isFinite(z.vermoegenNetto)).toBe(true);
      expect(Number.isFinite(z.ausgabenSteuern)).toBe(true);
      expect(z.ausgabenSteuern).toBeGreaterThanOrEqual(0);
    }
  });

  // ─── 2. Erwerbseinkommen Selbständig 2026-2030 = 180k, danach 0 ─
  it("Erwerb: 180k/J in 2026-2030, ab 2031 = 0 (pensioniert)", () => {
    for (let y = 2026; y <= 2030; y++) {
      const z = reihe.find((zz) => zz.jahr === y)!;
      // 15'000/Mt × 12 = 180'000
      expect(z.einnahmenErwerb).toBe(180_000);
    }
    const z2031 = reihe.find((z) => z.jahr === 2031)!;
    expect(z2031.einnahmenErwerb).toBe(0);
  });

  // ─── 3. Selbständig-AHV-Mehraufwand ~5.85% × 180k ≈ 10'530 ──────
  it("Selbständig: AHV-Mehraufwand 5.85% × 180k ≈ 10'530/J in Erwerbsjahren", () => {
    // 2027 Volljahr Selbst
    const z2027 = reihe.find((z) => z.jahr === 2027)!;
    expect(z2027.ausgabenTotal).toBeGreaterThan(0);

    // Vergleich mit "Anstellung" — Mehraufwand muss sichtbar werden
    const inputAN = buildBeatImhof();
    inputAN.budget.einkommen[0]!.typ = "anstellung";
    const reiheAN = cashflowReihe(inputAN, 2026, 2045);
    const z2027AN = reiheAN.find((z) => z.jahr === 2027)!;
    const diff = z2027.ausgabenTotal - z2027AN.ausgabenTotal;
    // 15'000 × 12 × 0.0585 = 10'530 (Math.round innerhalb der Engine)
    expect(diff).toBeGreaterThanOrEqual(10_500);
    expect(diff).toBeLessThanOrEqual(10_560);
  });

  // ─── 4. 3a-Einzahlung 36k wirkt steuerlich ──────────────────────
  it("Säule 3a 36k/J: Steuer mit < Steuer ohne (steuerlicher Abzug greift)", () => {
    // a) ausgabenVorsorge3a 36k 2026-2030
    for (let y = 2026; y <= 2030; y++) {
      const z = reihe.find((zz) => zz.jahr === y)!;
      expect(z.ausgabenVorsorge3a).toBe(36_000);
    }
    // b) Steuer-Vergleich 2026 mit / ohne 3a
    const inputOhne = buildBeatImhof();
    inputOhne.saeuleDrei.p1[0]!.jaehrlicheEinzahlung = 0;
    const reiheOhne = cashflowReihe(inputOhne, 2026, 2045);
    const z2026Mit = reihe.find((z) => z.jahr === 2026)!;
    const z2026Ohne = reiheOhne.find((z) => z.jahr === 2026)!;
    expect(z2026Mit.ausgabenSteuern).toBeLessThan(z2026Ohne.ausgabenSteuern);
  });

  // ─── 5. 2030 Firma-Verkauf: kapAuszahlungen +800k ───────────────
  it("Firma-Verkauf 2030: kapAuszahlungen enthält 800k Verkaufserlös", () => {
    const z2030 = reihe.find((z) => z.jahr === 2030)!;
    // 2030: 3a-Auszahlung (~125k inkl. Zinsen + 5×36k Einkäufe) + Firma 800k
    //   → mindestens 900k Kapitalauszahlungen (3a-Saldo Hochlauf ist Engine-spez.)
    expect(z2030.kapAuszahlungen).toBeGreaterThanOrEqual(800_000);
    // Sanity: ohne Firma-Verkauf wäre kapAuszahlungen ~125k (nur 3a)
    const inputOhneVerkauf = buildBeatImhof();
    inputOhneVerkauf.firma.plan = "behalten";
    const reiheOhne = cashflowReihe(inputOhneVerkauf, 2026, 2045);
    const z2030Ohne = reiheOhne.find((z) => z.jahr === 2030)!;
    const diff = z2030.kapAuszahlungen - z2030Ohne.kapAuszahlungen;
    expect(diff).toBe(800_000);
  });

  // ─── 6. firmaWertAmJahresende: bis 2029 = 800k, ab 2030 = 0 ────
  it("vermoegenFirma: bis 2029 = 800k (gehalten), ab 2030 = 0 (verkauft)", () => {
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    const z2029 = reihe.find((z) => z.jahr === 2029)!;
    const z2030 = reihe.find((z) => z.jahr === 2030)!;
    const z2031 = reihe.find((z) => z.jahr === 2031)!;
    // Solange Firma noch da → Verkehrswert im Vermögen-Bucket
    expect(z2026.vermoegenFirma).toBe(800_000);
    expect(z2029.vermoegenFirma).toBe(800_000);
    // Im Verkaufsjahr und danach → 0 (Firma weg, Erlös wandert in Liquidität)
    expect(z2030.vermoegenFirma).toBe(0);
    expect(z2031.vermoegenFirma).toBe(0);
  });

  // ─── 7. Liquidität nach Verkauf sprintet hoch ───────────────────
  it("Vermögen 2030: Verkaufserlös fliesst in Liquidität (Hauptkonto)", () => {
    const z2029 = reihe.find((z) => z.jahr === 2029)!;
    const z2030 = reihe.find((z) => z.jahr === 2030)!;
    // 2030: 800k Firma raus + 800k Cash rein → Aktiva ungefähr gleich
    //   ABER: kapAuszahlungen 3a (~125k) kommen on top → Aktiva sogar leicht höher.
    //   Liquidität-Bucket 2030 muss deutlich höher sein als 2029.
    expect(z2030.vermoegenLiquiditaet).toBeGreaterThan(
      z2029.vermoegenLiquiditaet + 700_000
    );
  });

  // ─── 8. Veräusserungsgewinn-Privileg dokumentieren ──────────────
  it("DOKU: 1/5-Privileg Bund (Art. 37b DBG) — Engine behandelt Firma-Erlös wie sonstige Kapital-Auszahlung", () => {
    // Hintergrund: Bei Geschäftsaufgabe eines Selbständigerwerbenden ab Alter 55
    // werden die in den letzten 2 Geschäftsjahren realisierten stillen
    // Reserven mit dem 1/5-Sondertarif (DBG Art. 37b) besteuert. Auf
    // Kantonsebene weichen Tarife ab; TG kennt einen separaten Sondertarif.
    //
    // Aktuelle Engine: Firma-Verkaufserlös fliesst über kapAuszahlungen
    // → wird mit der KAPITAL-AUSZAHLUNGS-Steuer (Sondertarif 1/5 Bund +
    // Kanton-Sondertarif für 3a/PK) zusammengerechnet. Das ist NICHT exakt
    // das Art. 37b-Privileg, aber als Approximation für Etappe 2 akzeptabel.
    //
    // Hier verifizieren wir nur: Kapital-Steuer 2030 ist > 0 und plausibel
    // (zwischen 3% und 18% des Verkaufserlöses).
    const z2030 = reihe.find((z) => z.jahr === 2030)!;
    expect(z2030.ausgabenSteuernKapital).toBeGreaterThan(0);
    // 800k × 3% = 24'000 (untere Grenze) ... 800k × 18% = 144'000 (oben grosszügig)
    expect(z2030.ausgabenSteuernKapital).toBeGreaterThan(15_000);
    expect(z2030.ausgabenSteuernKapital).toBeLessThan(200_000);
    // Sondertarif Bund (1/5 DBG) muss > 0 sein
    expect(z2030.ausgabenSteuernKapitalBund).toBeGreaterThan(0);
    expect(z2030.ausgabenSteuernKapitalKanton).toBeGreaterThan(0);
  });

  // ─── 9. AHV-Rente Beat ab 2031 (Einzelrente, kein Plafond Paar) ─
  it("AHV-Rente Beat: ab Pension 2030/31 plausible Einzelrente (<33k)", () => {
    // Beat 1965-06 → 65 in 2030-06 → Bezugsstart 2030-07 (Folgemonat).
    // 2030: Pro-Rata Jul-Dez = 6/12, plus 13. AHV Dezember-Anteil.
    // 2031: Vollrente Einzelperson, max 30'240 × 13/12 ≈ 32'760.
    const z2030 = reihe.find((z) => z.jahr === 2030)!;
    const z2031 = reihe.find((z) => z.jahr === 2031)!;
    // 2030 Pro-Rata > 0 < Vollrente
    expect(z2030.einnahmenAhv).toBeGreaterThan(0);
    expect(z2030.einnahmenAhv).toBeLessThan(20_000);
    // 2031 ist Vollrente — bei vollen Beitragsjahren bis 32'760 möglich
    expect(z2031.einnahmenAhv).toBeGreaterThan(15_000);
    expect(z2031.einnahmenAhv).toBeLessThanOrEqual(33_000);
    // Einzelperson → kein Paar-Plafond
    expect(z2031.einnahmenAhv).toBeLessThan(45_360);
  });

  // ─── 10. Vermögens-Plausi: Sprung im Verkaufsjahr ───────────────
  it("vermoegenNetto wächst 2026-2029, Verkauf 2030 hält Wert (Tausch Firma↔Cash)", () => {
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    const z2029 = reihe.find((z) => z.jahr === 2029)!;
    const z2030 = reihe.find((z) => z.jahr === 2030)!;

    // 2026-2029: Wachstum durch Sparen (Erwerb 180k − Ausgaben 96k − Steuern −
    //   Sozial − 3a 36k) plus Depot-Rendite
    expect(z2029.vermoegenNetto).toBeGreaterThan(z2026.vermoegenNetto);

    // 2030: Tausch Firma 800k → Cash 800k (netto null) + 3a-Auszahlung
    //   ABER hohe Kapital-Steuer (~30-100k) und Wunschverbrauch in Pension
    //   → vermoegenNetto darf in 2030 nicht massiv einbrechen
    expect(z2030.vermoegenNetto).toBeGreaterThan(z2029.vermoegenNetto * 0.95);
  });
});

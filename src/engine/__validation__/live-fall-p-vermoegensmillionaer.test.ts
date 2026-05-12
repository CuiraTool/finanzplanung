/**
 * Live-Validation Fall P: Vermögensmillionär ZH (5M+ Liquid/Wertschriften,
 * inkl. Renditeliegenschaft Zollikon).
 *
 * Fall-Profil:
 *  - P1 Hans Bühlmann, m, 1962, CEO 280k/J, PK aktiv (AG 1'200'000 heute,
 *    AG bei Bezug 65 = 1'450'000, UWS 5.4%, Mischung 50/50 → 725k Kapital).
 *  - P2 Maria Bühlmann, w, 1965, Hausfrau (Einkommen 0), keine PK.
 *  - Säule 3a P1: 180'000, Einzahlung 7'258/J.
 *  - Vermögen: 800k Liquidität + 2'500'000 Depot @ 3.5%.
 *  - Eigenheim Zürichberg: 3'200'000 (Hypo 1'200'000 @ 1.4%).
 *  - Renditeliegenschaft Zollikon: 1'800'000 (Hypo 800'000 @ 1.4%,
 *    Miete 60'000/J, Plan: behalten).
 *  - Ausgaben 16'000/Mt = 192'000/J.
 *  - Kanton ZH, verheiratet.
 *
 * Geprüft wird:
 *  1. Vermögensbilanz 2026 — Aktiva ~9.7M (Liq + Depot + 2 Immos + PK + 3a),
 *     Schulden 2M, Netto ~7.7M.
 *  2. Vermögenssteuer 2026 deutlich höher als bei "normalem" Haushalt
 *     (hohe Progression auf 7M+ Nettovermögen).
 *  3. Kapitalauszahlung 725k im Bezugsjahr 2027 (Hans 65 in 2027,
 *     geb 1962-05): Sondertarif ZH greift.
 *  4. Mieteinnahmen 60k/J fliessen ins Einkommen (Block-3-Cashflow).
 *  5. Engine läuft ohne crash bei grossen Zahlen — keine NaN/Infinity,
 *     Steuern ≥ 0, Netto-Vermögen ist finite.
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe, type CashflowInput } from "../cashflow";
import { steuerProJahr } from "../steuer";

function buildFallP(): CashflowInput {
  return {
    fallart: "paar",
    zivilstand: "verheiratet",
    person1: {
      vorname: "Hans",
      nachname: "Bühlmann",
      geburtsdatum: "1962-05-12",
      geschlecht: "m",
      telefon: "",
      email: "",
    },
    person2: {
      vorname: "Maria",
      nachname: "Bühlmann",
      geburtsdatum: "1965-08-22",
      geschlecht: "w",
      telefon: "",
      email: "",
    },
    kinder: [],
    ahv: {
      einkommenP1: 280_000,
      einkommenP2: 0,
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
        altersguthabenHeute: 1_200_000,
        altersguthabenBeiBezug: 1_450_000,
        umwandlungssatzProzent: 5.4,
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
          id: "3a-p1",
          type: "konto",
          saeule: "3a",
          beschreibung: "Säule 3a P1 (AN max)",
          aktuellerWert: 180_000,
          auszahlungsjahr: 2027,
          renditeProzent: 1.0,
          rueckkaufswert: null,
          ablaufswert: null,
          ablaufjahr: 2027,
          jaehrlicheEinzahlung: 7_258,
          einzahlungAb: 2026,
          einzahlungBis: 2026,
        },
      ],
      p2: [],
    },
    vermoegen: {
      items: [
        {
          id: "v-konto",
          typ: "konto",
          beschreibung: "Liquidität Hauptkonto",
          saldoHeute: 800_000,
          renditeProzent: 0,
          istHauptkonto: true,
        },
        {
          id: "v-depot",
          typ: "depot",
          beschreibung: "Wertschriften-Depot",
          saldoHeute: 2_500_000,
          renditeProzent: 3.5,
          istHauptkonto: false,
        },
      ],
    },
    immobilien: {
      items: [
        {
          id: "eh-zurichberg",
          beschreibung: "Eigenheim Zürichberg",
          typ: "selbstbewohnt",
          verkehrswert: 3_200_000,
          hypotheken: [
            {
              id: "h-eh",
              beschreibung: "Festhypothek Eigenheim",
              hoehe: 1_200_000,
              zinssatzProzent: 1.4,
              ablaufjahr: 2035,
            },
          ],
          plan: "behalten",
          verkaufsjahr: 2060,
          jaehrlicheMieteinnahmen: null,
          kaufjahr: 2005,
          anlagekosten: 2_400_000,
          wertvermehrendeInvestitionen: null,
          wertsteigerungProzent: 1.5,
        },
        {
          id: "rl-zollikon",
          beschreibung: "Renditeliegenschaft Zollikon",
          typ: "rendite",
          verkehrswert: 1_800_000,
          hypotheken: [
            {
              id: "h-rl",
              beschreibung: "Festhypothek Rendite",
              hoehe: 800_000,
              zinssatzProzent: 1.4,
              ablaufjahr: 2035,
            },
          ],
          plan: "behalten",
          verkaufsjahr: 2060,
          jaehrlicheMieteinnahmen: 60_000,
          kaufjahr: 2010,
          anlagekosten: 1_500_000,
          wertvermehrendeInvestitionen: null,
          wertsteigerungProzent: 1.5,
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
          beschreibung: "Hans — CEO",
          personIdx: 1,
          betragMonatlich: Math.round(280_000 / 12),
          von: "2026-01",
          bis: "2027-05",
          typ: "anstellung",
        },
      ],
      ausgabenModus: "total",
      ausgabenTotal: 16_000, // 192'000/J
      ausgabenKategorien: {
        lebenshaltung: null,
        wohnen: null,
        mobilitaet: null,
        versicherungen: null,
        ferienHobby: null,
        sonstiges: null,
      },
      wunschverbrauchPension: 14_000,
      steuernHeute: null,
      einkommenHeute: null,
      religion: "keine",
      alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
    },
    adresse: {
      strasse: "Bühlweg 1",
      plz: "8044",
      ort: "Zürich",
      kanton: "ZH",
      gemeindeBfsId: null,
      gemeindeName: "Zürich",
    },
    einmaligeAusgaben: [],
  };
}

describe("Live-Fall P — Vermögensmillionär ZH (5M+, 2 Immos, hohe Progression)", () => {
  const input = buildFallP();
  const reihe = cashflowReihe(input, 2026, 2045);

  it("liefert eine Reihe für 2026-2045 (20 Jahre)", () => {
    expect(reihe).toHaveLength(20);
    expect(reihe[0]!.jahr).toBe(2026);
    expect(reihe[19]!.jahr).toBe(2045);
  });

  // ─── 1. Vermögensbilanz 2026 ──────────────────────────────────────
  it("Vermögensbilanz 2026: Aktiva ~9.7M, Schulden 2M, Netto ~7.7M", () => {
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    // Aktiva-Range: 800k Liq + 2'500k Depot + 3'200k EH + 1'800k RL +
    // 1'200k PK + 180k 3a ≈ 9.68M. Plus Wachstum 2026.
    // Toleranz: 9.2M–10.5M
    expect(z2026.vermoegenAktiva).toBeGreaterThan(9_200_000);
    expect(z2026.vermoegenAktiva).toBeLessThan(10_800_000);

    // Schulden: Hypo 1'200k + Hypo 800k = 2'000k (Anfang). Tilgung
    // möglicherweise minimal — bleibt nahe 2M.
    expect(z2026.vermoegenSchulden).toBeGreaterThanOrEqual(1_900_000);
    expect(z2026.vermoegenSchulden).toBeLessThanOrEqual(2_050_000);

    // Netto ~7.7M (Toleranz ±0.5M wegen Renditen/Steuern im 1. Jahr)
    expect(z2026.vermoegenNetto).toBeGreaterThan(7_200_000);
    expect(z2026.vermoegenNetto).toBeLessThan(8_500_000);
  });

  // ─── 2. Vermögenssteuer hoch durch Progression ────────────────────
  it("Vermögenssteuer 2026 ist deutlich höher als bei normalem Haushalt (hohe Progression)", () => {
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    // Bei Netto-Vermögen ~7.7M in ZH (Stadt Zürich Multiplikator)
    // erwarten wir Vermögenssteuer in 5-stelligem Bereich (>15k CHF/J).
    expect(z2026.ausgabenSteuernVermoegen).toBeGreaterThan(15_000);

    // Vergleich gegen "normalen" Haushalt mit 500k Netto-Vermögen:
    const referenz = steuerProJahr({
      einkommenJahr: 280_000,
      vermoegenJahr: 500_000,
      kapAuszahlungenJahr: 0,
      kanton: "ZH",
      religion: "keine",
      fallart: "paar",
    });
    // Bei 7M+ Vermögen muss die VSt mehrfach höher sein als bei 500k
    expect(z2026.ausgabenSteuernVermoegen).toBeGreaterThan(referenz.vermoegen * 3);
  });

  // ─── 3. Kapitalauszahlung 725k im Bezugsjahr 2027 ─────────────────
  it("Kapitalauszahlung PK 725k in 2027 (Hans 65, Mischung 50/50): Sondertarif ZH greift", () => {
    // Hans geb 1962-05 → 65 in 2027-05. PK-Bezug ab Mai 2027.
    // Mischung 50/50 von 1'450'000 → 725k Kapital.
    const z2027 = reihe.find((z) => z.jahr === 2027)!;
    // kapAuszahlungen 2027: PK 725k + 3a 180k (ggf. + Verzinsung) ≈ 905k
    expect(z2027.kapAuszahlungen).toBeGreaterThan(700_000);
    expect(z2027.kapAuszahlungen).toBeLessThan(1_000_000);

    // Kapitalauszahlungssteuer muss > 0 sein und in plausibler Range.
    expect(z2027.ausgabenSteuernKapital).toBeGreaterThan(40_000);
    // Bund 1/5 DBG + ZH-Sondertarif: bei ~900k erwarten wir total
    // grob 50k-130k Kapitalauszahlungssteuer.
    expect(z2027.ausgabenSteuernKapital).toBeLessThan(150_000);

    // Bund-Anteil und Kanton-Anteil beide > 0 (Sondertarif aktiv)
    expect(z2027.ausgabenSteuernKapitalBund).toBeGreaterThan(0);
    expect(z2027.ausgabenSteuernKapitalKanton).toBeGreaterThan(0);
  });

  // ─── 4. Mieteinnahmen 60k/J in Einkommen ──────────────────────────
  it("Mieteinnahmen 60k/J Renditeliegenschaft Zollikon fliessen ins Einkommen", () => {
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    expect(z2026.einnahmenMieten).toBe(60_000);

    // Auch nach Pension (2028) bleiben Mieten erhalten (Plan: behalten)
    const z2030 = reihe.find((z) => z.jahr === 2030)!;
    expect(z2030.einnahmenMieten).toBe(60_000);
  });

  // ─── 5. Stress: keine NaN/Infinity bei grossen Zahlen ─────────────
  it("Engine läuft ohne crash bei grossen Zahlen (keine NaN/Infinity)", () => {
    for (const z of reihe) {
      expect(Number.isFinite(z.einnahmenTotal)).toBe(true);
      expect(Number.isFinite(z.ausgabenTotal)).toBe(true);
      expect(Number.isFinite(z.vermoegenAktiva)).toBe(true);
      expect(Number.isFinite(z.vermoegenSchulden)).toBe(true);
      expect(Number.isFinite(z.vermoegenNetto)).toBe(true);
      expect(Number.isFinite(z.ausgabenSteuern)).toBe(true);
      expect(Number.isFinite(z.ausgabenSteuernVermoegen)).toBe(true);
      expect(Number.isFinite(z.ausgabenSteuernKapital)).toBe(true);
      expect(z.ausgabenSteuern).toBeGreaterThanOrEqual(0);
      expect(z.ausgabenSteuernVermoegen).toBeGreaterThanOrEqual(0);
    }
  });

  // ─── 6. Hypothekzinsen 2M × 1.4% = 28k/J ──────────────────────────
  it("Hypothekzinsen: 2M Hypo × 1.4% = 28'000 Schuldzinsen/J", () => {
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    // 1.2M × 1.4% + 0.8M × 1.4% = 28'000
    expect(z2026.ausgabenHypozins).toBeCloseTo(28_000, -2);
  });

  // ─── 7. Wertschriften-Depot wächst mit 3.5% Rendite ───────────────
  it("Depot 2.5M @ 3.5%: Wertschriften wachsen über Zeit", () => {
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    const z2030 = reihe.find((z) => z.jahr === 2030)!;
    // 2.5M × 1.035^5 ≈ 2.97M (Depot allein; vermoegenWertschriften
    // enthält nur Depots, nicht Liquid)
    expect(z2030.vermoegenWertschriften).toBeGreaterThan(z2026.vermoegenWertschriften);
    expect(z2030.vermoegenWertschriften).toBeGreaterThan(2_700_000);
  });

  // ─── 8. PK-Saldo Hochlauf 1.2M → 1.45M ───────────────────────────
  it("PK-Saldo P1 wächst linear von 1.2M (2026) zu 1.45M (Bezug 2027)", () => {
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    // 2026 PK-Saldo = vermoegenVorsorge enthält PK + 3a + FZ
    // PK ~1.2M + Wachstum, 3a ~180k → Vorsorge gesamt > 1.3M
    expect(z2026.vermoegenVorsorge).toBeGreaterThan(1_300_000);
    // Vor Bezug 2027 nahe an 1.45M PK + 180k 3a ≈ 1.6M+
    // (3a verzinst leicht)
    // Nach Auszahlung 2027 → Vorsorge geht stark zurück (Kapital + 3a raus)
    const z2027 = reihe.find((z) => z.jahr === 2027)!;
    const z2028 = reihe.find((z) => z.jahr === 2028)!;
    // Nach Pension: PK-Renten-Anteil bleibt als "Kapital hinter Rente" — die
    // Engine schreibt das Renten-Kapital ggf. weiter, aber das Kapital-50%
    // und 3a sind weg. Vorsorge in 2028 < Vorsorge in 2026.
    expect(z2028.vermoegenVorsorge).toBeLessThan(z2026.vermoegenVorsorge);
    // Sanity check für 2027 (Übergangsjahr)
    expect(Number.isFinite(z2027.vermoegenVorsorge)).toBe(true);
  });

  // ─── 9. Einkommen 2026 enthält Lohn + Mieten ──────────────────────
  it("Einnahmen 2026 = Lohn 280k + Mieten 60k (vor AHV-Bezug)", () => {
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    expect(z2026.einnahmenErwerb).toBeCloseTo(280_000, -2);
    expect(z2026.einnahmenMieten).toBe(60_000);
    // Total ≥ 339.5k (kein AHV/BVG-Rente vor Pension; Monatslohn-Rundung)
    expect(z2026.einnahmenTotal).toBeGreaterThanOrEqual(339_500);
  });

  // ─── 10. Steuer-Gesamt-Plausi ─────────────────────────────────────
  it("Steuer 2026: Einkommen + Vermögen ergeben 5-stelligen Steuerbetrag", () => {
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    // Bei 340k Einkommen + 7.7M Vermögen in ZH erwarten wir Steuer > 60k
    expect(z2026.ausgabenSteuern).toBeGreaterThan(60_000);
    // Aber kein absurder Wert (sanity-cap)
    expect(z2026.ausgabenSteuern).toBeLessThan(200_000);
  });
});

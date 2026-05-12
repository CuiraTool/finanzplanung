/**
 * Live-Test Fall K: Einzelperson kurz vor Pension — Last-Mile-Optimierung.
 *
 * Profil (Karin Frey):
 *  - Ledig, geb. 1963-06-15 (heute 2026 → 63 J.)
 *  - AHV21-Übergangsjahrgang Frau Jg 1963 (ordentlich 64.75, mit
 *    Wunschalter 65 → AHV-Start im Folgemonat nach 65. Geb. = Juli 2028)
 *  - Pensionierung Juli 2028 (Anstellung bis 2028-07)
 *  - Kanton LU, römisch-katholisch
 *  - Einkommen CHF 105'000/J (Anstellung bis 2028-07)
 *  - PK aktiv: AG heute 580'000, AG bei Bezug 620'000 (nur 2 Jahre Hochlauf),
 *    UWS 5.8%, Bezugspräferenz Rente → 620'000 × 5.8% = ~35'960/J
 *  - Säule 3a: aktuell 78'000, Einzahlung 7'258/J bis 2027, Auszahlung 2028
 *  - Liquidität 140'000
 *  - Depot 320'000, Rendite 3%
 *  - Mietwohnung (keine Immobilie)
 *  - Ausgaben 5'500/Mt = 66'000/J
 *
 * Ziel: Last-Mile vor Pension. Engine soll Pro-Rata Pension korrekt darstellen
 * (2028 ist Mischjahr), 3a-Auszahlung in 2028 erscheinen, ab 2029 voller
 * AHV+PK-Rentenbezug.
 *
 * Engine NICHT verändern, nur testen.
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe, type CashflowInput } from "../cashflow";

function buildKarinFrey(): CashflowInput {
  return {
    fallart: "einzel",
    zivilstand: "ledig",
    person1: {
      vorname: "Karin",
      nachname: "Frey",
      geburtsdatum: "1963-06-15",
      geschlecht: "w",
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
        altersguthabenHeute: 580_000,
        altersguthabenBeiBezug: 620_000,
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
          id: "3a-karin",
          type: "konto",
          saeule: "3a",
          beschreibung: "Säule 3a Karin (Bank)",
          aktuellerWert: 78_000,
          auszahlungsjahr: 2028,
          renditeProzent: 1.0,
          rueckkaufswert: null,
          ablaufswert: null,
          ablaufjahr: 2028,
          jaehrlicheEinzahlung: 7_258,
          einzahlungAb: 2026,
          einzahlungBis: 2027,
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
          saldoHeute: 140_000,
          renditeProzent: 0,
          istHauptkonto: true,
        },
        {
          id: "dep",
          typ: "depot",
          beschreibung: "Wertschriftendepot",
          saldoHeute: 320_000,
          renditeProzent: 3.0,
          istHauptkonto: false,
        },
      ],
    },
    immobilien: { items: [] }, // Mietwohnung — keine Immobilie im Vermögen
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
          id: "ek-karin",
          beschreibung: "Karin — Anstellung",
          personIdx: 1,
          betragMonatlich: Math.round(105_000 / 12),
          von: "2026-01",
          bis: "2028-07",
          typ: "anstellung",
        },
      ],
      ausgabenModus: "total",
      ausgabenTotal: 5_500, // 5'500/Mt = 66'000/J
      ausgabenKategorien: {
        lebenshaltung: null,
        wohnen: null,
        mobilitaet: null,
        versicherungen: null,
        ferienHobby: null,
        sonstiges: null,
      },
      wunschverbrauchPension: 5_500,
      steuernHeute: null,
      einkommenHeute: null,
      religion: "katholisch",
      alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
    },
    adresse: {
      strasse: "",
      plz: "6000",
      ort: "Luzern",
      kanton: "LU",
      gemeindeBfsId: null,
      gemeindeName: "Luzern",
    },
    einmaligeAusgaben: [],
  };
}

describe("Live-Fall K — Karin Frey LU (Kurz-vor-Pension, Last-Mile)", () => {
  const input = buildKarinFrey();
  const reihe = cashflowReihe(input, 2026, 2046);

  it("liefert eine Reihe für 2026-2046 (21 Jahre)", () => {
    expect(reihe).toHaveLength(21);
    expect(reihe[0]!.jahr).toBe(2026);
    expect(reihe[20]!.jahr).toBe(2046);
  });

  it("Plausi: keine NaN, keine negativen Steuern, Vermögen stets endlich", () => {
    for (const z of reihe) {
      expect(Number.isFinite(z.einnahmenTotal)).toBe(true);
      expect(Number.isFinite(z.vermoegenNetto)).toBe(true);
      expect(Number.isFinite(z.ausgabenSteuern)).toBe(true);
      expect(z.ausgabenSteuern).toBeGreaterThanOrEqual(0);
    }
  });

  // ─── 1. 2026/2027: Erwerbsphase voll ─────────────────────────────
  it("2026 + 2027: noch volle Erwerbsphase → einnahmenErwerb ≈ 105'000, keine AHV/PK", () => {
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    const z2027 = reihe.find((z) => z.jahr === 2027)!;

    // Vollständiges Erwerbseinkommen (12 Monate)
    expect(z2026.einnahmenErwerb).toBeGreaterThan(100_000);
    expect(z2026.einnahmenErwerb).toBeLessThanOrEqual(105_500);
    expect(z2027.einnahmenErwerb).toBeGreaterThan(100_000);
    expect(z2027.einnahmenErwerb).toBeLessThanOrEqual(105_500);

    // Vor Pension: keine AHV, keine PK-Rente
    expect(z2026.einnahmenAhv).toBe(0);
    expect(z2026.einnahmenBvgRente).toBe(0);
    expect(z2027.einnahmenAhv).toBe(0);
    expect(z2027.einnahmenBvgRente).toBe(0);

    console.log(
      `\n[2026] Erwerb: ${z2026.einnahmenErwerb} | AHV: ${z2026.einnahmenAhv} | PK: ${z2026.einnahmenBvgRente}`
    );
    console.log(
      `[2027] Erwerb: ${z2027.einnahmenErwerb} | AHV: ${z2027.einnahmenAhv} | PK: ${z2027.einnahmenBvgRente}`
    );
  });

  // ─── 2. 2028 Pro-Rata: Erwerb (Jan-Jul) + AHV/PK (ab Folgemonat 65. Geb) ───
  it("2028: Mischjahr — teilweise Erwerb (bis Juli) + teilweise AHV/PK (ab August)", () => {
    const z2028 = reihe.find((z) => z.jahr === 2028)!;

    // Erwerbseinkommen Pro-Rata: 7 Monate × ~8'750 ≈ 61'250
    expect(z2028.einnahmenErwerb).toBeGreaterThan(50_000);
    expect(z2028.einnahmenErwerb).toBeLessThan(70_000);

    // AHV anteilig — Karin (geb. Juni 1963, Bezugsalter 65 = Juni 2028)
    // → Folgemonat Juli 2028: ca. 6 Monate AHV
    // BSV-Max Einzelperson 2025 = 30'240 + 13. AHV → ~32'760 voll p.a.
    // Pro-Rata 5-6 Monate: ~13'000 - 17'000
    expect(z2028.einnahmenAhv).toBeGreaterThan(8_000);
    expect(z2028.einnahmenAhv).toBeLessThan(20_000);

    // PK-Rente anteilig (ähnlich)
    expect(z2028.einnahmenBvgRente).toBeGreaterThan(5_000);
    expect(z2028.einnahmenBvgRente).toBeLessThan(25_000);

    console.log(
      `\n[2028 Mischjahr] Erwerb: ${z2028.einnahmenErwerb} | AHV: ${z2028.einnahmenAhv} | PK: ${z2028.einnahmenBvgRente}`
    );
  });

  // ─── 3. 2029: erstes volles Rentnerjahr ──────────────────────────
  it("2029: erstes volles AHV-Jahr → kein Erwerb, AHV voll, PK voll", () => {
    const z2029 = reihe.find((z) => z.jahr === 2029)!;

    // Kein Erwerb mehr
    expect(z2029.einnahmenErwerb).toBe(0);

    // AHV voll — Einzelperson BSV-Max 2025 = 30'240 × 13/12 = 32'760
    // (Karin hat 105k Einkommen → Vollrente nahe Maximum, je nach Skala-Logik)
    expect(z2029.einnahmenAhv).toBeGreaterThan(25_000);
    expect(z2029.einnahmenAhv).toBeLessThan(35_000);

    // PK-Rente voll: 620'000 × 5.8% = 35'960
    expect(z2029.einnahmenBvgRente).toBeGreaterThan(34_000);
    expect(z2029.einnahmenBvgRente).toBeLessThan(38_000);

    console.log(
      `\n[2029 Voll-Pension] AHV: ${z2029.einnahmenAhv} | PK: ${z2029.einnahmenBvgRente} | Total: ${z2029.einnahmenTotal}`
    );
  });

  // ─── 4. 3a-Auszahlung 2028 ──────────────────────────────────────
  it("3a-Auszahlung: erscheint im Auszahlungsjahr 2028, Betrag ~Saldo+Einzahlungen+Rendite", () => {
    // 3a-Konto: 78'000 heute + 2× 7'258 Einzahlung (2026+2027) bei 1% Rendite
    // Rohbetrag-Range: zwischen 90'000 und 100'000
    const z2027 = reihe.find((z) => z.jahr === 2027)!;
    const z2028 = reihe.find((z) => z.jahr === 2028)!;
    const z2029 = reihe.find((z) => z.jahr === 2029)!;

    // Vermögensbilanz: Vorsorge sollte 2027 noch das 3a-Saldo enthalten,
    // 2028 dann ausbezahlt (= im Hauptkonto/Liquidität gelandet)
    console.log(
      `\n[3a-Auszahlung] Vorsorge 2027: ${z2027.vermoegenVorsorge} → 2028: ${z2028.vermoegenVorsorge}`
    );
    console.log(
      `[3a-Auszahlung] Liquidität 2027: ${z2027.vermoegenLiquiditaet} → 2028: ${z2028.vermoegenLiquiditaet}`
    );

    // Liquidität muss in 2028 deutlich gestiegen sein durch 3a-Auszahlung
    // (Sprung um mind. 80'000 - selbst nach Ausgaben/Steuern minus Erwerb)
    const liqDelta = z2028.vermoegenLiquiditaet - z2027.vermoegenLiquiditaet;
    expect(liqDelta).toBeGreaterThan(70_000);

    // 2029 läuft kein 3a-Topf mehr → Vorsorge enthält nur PK-Renten-Logik
    expect(z2029.vermoegenVorsorge).toBeLessThanOrEqual(z2028.vermoegenVorsorge);
  });

  // ─── 5. Vermögen heute (2026) ─────────────────────────────────────
  it("Vermögen 2026: Liquid 140k + Depot 320k + PK 580k + 3a 78k ≈ 1'118k brutto, keine Hypo", () => {
    const z2026 = reihe.find((z) => z.jahr === 2026)!;

    console.log(
      `\n[Vermögen 2026] Liq: ${z2026.vermoegenLiquiditaet} | Vorsorge: ${z2026.vermoegenVorsorge} | Aktiva: ${z2026.vermoegenAktiva} | Netto: ${z2026.vermoegenNetto}`
    );

    // Aktiva grob: 460k Liq+Depot + 658k Vorsorge ≈ 1.1M (nach Cashflow-Effekt 2026)
    expect(z2026.vermoegenAktiva).toBeGreaterThan(1_000_000);
    expect(z2026.vermoegenAktiva).toBeLessThan(1_250_000);

    // Keine Immobilie → keine Schulden → Netto = Aktiva
    expect(z2026.vermoegenSchulden).toBe(0);
    expect(z2026.vermoegenNetto).toBe(z2026.vermoegenAktiva);
  });

  // ─── 6. Vermögen bei Pension (2029) vs heute ──────────────────────
  it("Vermögen 2029 (Pension): nach PK-Rentenwahl Vorsorge stark gesunken (Rente statt Kapital)", () => {
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    const z2029 = reihe.find((z) => z.jahr === 2029)!;

    // Bei Rente bleibt das PK-Guthaben in der Kasse, fliesst nicht ins Vermögen.
    // Die Engine zeigt Vorsorge-Vermögen 2029 stark reduziert (PK ist "weg" als Asset).
    console.log(
      `\n[Pension 2029 vs heute] Vorsorge: ${z2026.vermoegenVorsorge} → ${z2029.vermoegenVorsorge}`
    );
    console.log(
      `[Pension 2029 vs heute] Netto:    ${z2026.vermoegenNetto} → ${z2029.vermoegenNetto}`
    );

    // Vorsorge schrumpft drastisch (PK-Rente → kein Kapital mehr)
    expect(z2029.vermoegenVorsorge).toBeLessThan(z2026.vermoegenVorsorge);
  });

  // ─── 7. Vermögen +20J (2046) — Inflation/Depot-Rendite-Effekt ────
  it("Vermögen 2046: lebt von Renten + Depot/Liquidität, sollte nicht ins Negative kippen", () => {
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    const z2046 = reihe.find((z) => z.jahr === 2046)!;

    console.log(
      `\n[+20J] Netto 2026: ${z2026.vermoegenNetto} → 2046: ${z2046.vermoegenNetto}`
    );
    console.log(`[+20J] Δ = ${z2046.vermoegenNetto - z2026.vermoegenNetto}`);

    // Karin ist im Renten-Pull-Modus. AHV+PK ≈ 65-69k, Ausgaben 66k.
    // Mit 3% Depot-Rendite sollte Vermögen halbwegs stabil bleiben.
    expect(z2046.vermoegenNetto).toBeGreaterThan(0);
  });

  // ─── 8. Saldo-Trend: Erwerb vs. Pension ───────────────────────────
  it("Saldo 2026/2027 (Erwerb) deutlich positiv, 2029+ (Pension) ggf. negativ je nach Steuer", () => {
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    const z2027 = reihe.find((z) => z.jahr === 2027)!;
    const z2029 = reihe.find((z) => z.jahr === 2029)!;

    console.log(
      `\n[Saldo] 2026: ${z2026.saldo} | 2027: ${z2027.saldo} | 2029: ${z2029.saldo}`
    );

    // Erwerbsjahre: Einnahmen 105k − Ausgaben 66k − Steuern → Saldo positiv
    expect(z2026.saldo).toBeGreaterThan(0);
    expect(z2027.saldo).toBeGreaterThan(0);

    // 2029: AHV+PK ≈ 65-69k vs. 66k Ausgaben → eng, je nach Steuer +/−
    // Hier nur Plausi: nicht <-20k
    expect(z2029.saldo).toBeGreaterThan(-20_000);
  });

  // ─── 9. Steuer-Effekt: Pensionierungsjahr ────────────────────────
  it("Steuern 2027 (voll erwerbstätig) > Steuern 2029 (nur Renten) — Pension senkt Steuerlast", () => {
    const z2027 = reihe.find((z) => z.jahr === 2027)!;
    const z2029 = reihe.find((z) => z.jahr === 2029)!;

    console.log(
      `\n[Steuern] 2027 (Erwerb): ${z2027.ausgabenSteuern} | 2029 (Pension): ${z2029.ausgabenSteuern}`
    );

    // Renten-Jahr ist steuerlich tiefer als 105k-Erwerb
    expect(z2029.ausgabenSteuern).toBeLessThan(z2027.ausgabenSteuern);
  });

  // ─── 10. AHV-Bezugsstart-Validierung (Karin Jg 1963, w, BezAlter 65) ───
  it("AHV-Bezug startet 2028 (Folgemonat nach 65. Geb. Juni 2028) — 2027 noch 0", () => {
    const z2027 = reihe.find((z) => z.jahr === 2027)!;
    const z2028 = reihe.find((z) => z.jahr === 2028)!;
    const z2029 = reihe.find((z) => z.jahr === 2029)!;

    expect(z2027.einnahmenAhv).toBe(0); // 2027 noch nicht
    expect(z2028.einnahmenAhv).toBeGreaterThan(0); // 2028 erstmals
    expect(z2029.einnahmenAhv).toBeGreaterThan(z2028.einnahmenAhv); // 2029 voll

    console.log(
      `\n[AHV-Bezugsstart] 2027: ${z2027.einnahmenAhv} → 2028 (Pro-Rata): ${z2028.einnahmenAhv} → 2029 (Voll): ${z2029.einnahmenAhv}`
    );
  });
});

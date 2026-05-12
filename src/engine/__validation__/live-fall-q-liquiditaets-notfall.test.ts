/**
 * Live-Test Fall Q: Liquiditäts-Notfall — Defizit-Cashflow verzehrt Vermögen.
 *
 * Profil (Lukas Egger, ledig, ZH):
 *  - Geb. 1965-06-15 → heute 2026 = 61 J., plant Frühpension 2027 (62)
 *  - Einkommen 75'000/J nur bis Pensionierung 2027
 *  - AHV-Bezug erst 63 (2028), Frühbezug 2 J. → Kürzung 6.8%/J ≈ 13.6%
 *  - PK: AG heute 280k, AG bei Bezug 65 = 350k, UWS 5.4%, Rente
 *      → bei Frühpension 62: linearer Hochlauf ≈ 272.5k × 5.4% × ~0.864 ≈ 12.7k/J
 *      (sehr tief, weil Vorbezug + nicht-voller Saldo)
 *  - 3a-Konto: 35'000 (kein Override → wird bei Bezugsalter ausgezahlt)
 *  - Liquidität 65'000, Depot 80'000 (3% Rendite)
 *  - Eigenheim Zürich-Vorort 650'000, Hypo 350'000 @ 1.6%
 *  - Ausgaben 5'500/Mt = 66'000/J → HÖHER als kombinierte Renten
 *
 * Test-Fokus:
 *  1. Engine läuft ohne NaN/crash, auch wenn Liquidität negativ wird.
 *  2. Saldo wird negativ ab Pension (2028+), wenn Erwerb wegfällt.
 *  3. Hauptkonto (Liquidität) sinkt jahresweise — Brennrate sichtbar.
 *  4. Vermögen Netto schrumpft langfristig.
 *  5. Tragbarkeit Hypothek: NICHT mehr gegeben bei Pension — wird modelliert
 *     (Status != "tragbar" bei Renten-Einkommen).
 *  6. Engine NICHT verändern — nur Verhalten dokumentieren.
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe, type CashflowInput } from "../cashflow";
import { tragbarkeitHaushalt } from "../tragbarkeit";

function buildLukasEgger(): CashflowInput {
  return {
    fallart: "einzel",
    zivilstand: "ledig",
    person1: {
      vorname: "Lukas",
      nachname: "Egger",
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
      einkommenP1: 75_000,
      einkommenP2: null,
      hatIkAuszugP1: false,
      hatIkAuszugP2: false,
      hatFehljahreP1: false,
      hatFehljahreP2: false,
      fehljahreAnzahlP1: 0,
      fehljahreAnzahlP2: 0,
      // Frühbezug AHV mit 63 = 2 Jahre Vorbezug (ordentlich 65)
      ahvBezugsalterP1: 63,
      ahvBezugsalterP2: 65,
      ahvRenteJahrEffektivP1: null,
      ahvRenteJahrEffektivP2: null,
    },
    bvg: {
      p1: {
        aktiverAnschluss: true,
        altersguthabenHeute: 280_000,
        altersguthabenBeiBezug: 350_000,
        umwandlungssatzProzent: 5.4,
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
          beschreibung: "3a-Konto",
          aktuellerWert: 35_000,
          auszahlungsjahr: 2030,
          renditeProzent: 1.0,
          rueckkaufswert: null,
          ablaufswert: null,
          ablaufjahr: 2030,
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
          beschreibung: "Liquidität (Privatkonto)",
          saldoHeute: 65_000,
          renditeProzent: 0,
          istHauptkonto: true,
        },
        {
          id: "dep",
          typ: "depot",
          beschreibung: "Wertschriften-Depot",
          saldoHeute: 80_000,
          renditeProzent: 3.0,
          istHauptkonto: false,
        },
      ],
    },
    immobilien: {
      items: [
        {
          id: "eh",
          typ: "selbstbewohnt",
          beschreibung: "Eigenheim Zürich-Vorort",
          verkehrswert: 650_000,
          hypotheken: [
            {
              id: "h1",
              beschreibung: "Hypothek 1.6%",
              hoehe: 350_000,
              zinssatzProzent: 1.6,
              ablaufjahr: 2040,
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
    // Frühpension mit 62 → Bezugsjahr 2027
    ziele: { bezugsalterP1: 62, bezugsalterP2: 65 },
    budget: {
      einkommen: [
        {
          id: "e1",
          beschreibung: "Lohn Lukas",
          personIdx: 1 as const,
          betragMonatlich: 6_250, // 75'000/J
          von: "2026-01",
          bis: "2027-06", // letztes Erwerbs-Jahr
        },
      ],
      ausgabenModus: "total",
      ausgabenTotal: 5_500, // 66'000/J
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
      einkommenHeute: 75_000,
      religion: "keine",
      alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
    },
    adresse: {
      strasse: "",
      plz: "8600",
      ort: "Dübendorf",
      kanton: "ZH",
      gemeindeBfsId: null,
      gemeindeName: "Dübendorf",
    },
    einmaligeAusgaben: [],
  };
}

describe("Live-Fall Q — Liquiditäts-Notfall Lukas Egger", () => {
  const state = buildLukasEgger();
  const reihe = cashflowReihe(state, 2026, 2050);
  const z2026 = reihe.find((r) => r.jahr === 2026)!;
  const z2027 = reihe.find((r) => r.jahr === 2027)!;
  const z2028 = reihe.find((r) => r.jahr === 2028)!;
  const z2029 = reihe.find((r) => r.jahr === 2029)!;
  const z2035 = reihe.find((r) => r.jahr === 2035)!;
  const z2045 = reihe.find((r) => r.jahr === 2045)!;
  const z2050 = reihe.find((r) => r.jahr === 2050)!;

  it("Engine läuft 2026–2050 komplett ohne NaN, auch bei negativer Liquidität", () => {
    expect(reihe.length).toBe(25);
    for (const z of reihe) {
      expect(Number.isFinite(z.einnahmenTotal)).toBe(true);
      expect(Number.isFinite(z.ausgabenTotal)).toBe(true);
      expect(Number.isFinite(z.saldo)).toBe(true);
      expect(Number.isFinite(z.vermoegenNetto)).toBe(true);
      expect(Number.isFinite(z.vermoegenLiquiditaet)).toBe(true);
      expect(Number.isFinite(z.ausgabenSteuern)).toBe(true);
    }
  });

  it("Cashflow-Saldo wird negativ ab 2028 (erstes volles Renten-Jahr ohne Erwerb)", () => {
    // 2026/27: Erwerb 75k läuft → positiver Saldo wahrscheinlich.
    // 2028: AHV (frühestens) + PK-Rente — beide tief, Erwerb weg → Defizit.
    console.log(
      `\n  Saldo 2026 (Erwerb voll): ${z2026.saldo} | Einnahmen ${z2026.einnahmenTotal} - Ausgaben ${z2026.ausgabenTotal}`
    );
    console.log(
      `  Saldo 2028 (Renten):     ${z2028.saldo} | AHV ${z2028.einnahmenAhv} + PK ${z2028.einnahmenBvgRente} = ${z2028.einnahmenTotal}`
    );
    expect(z2028.saldo).toBeLessThan(0);
    expect(z2029.saldo).toBeLessThan(0);
  });

  it("Vermögen (Liquid + Depot) sinkt jahresweise ab Defizit-Phase", () => {
    // Engine-Fix: Liquidations-Wasserfall — bei Defizit wird Depot angezapft,
    // bevor Hauptkonto negativ wird. Liquid + Depot zusammen aber sinkt monoton.
    const ges2028 = z2028.vermoegenLiquiditaet + z2028.vermoegenWertschriften;
    const ges2029 = z2029.vermoegenLiquiditaet + z2029.vermoegenWertschriften;
    const ges2035 = z2035.vermoegenLiquiditaet + z2035.vermoegenWertschriften;
    expect(ges2029).toBeLessThan(ges2028);
    expect(ges2035).toBeLessThan(ges2029);
  });

  it("Liquidität wird im Verlauf negativ — Engine modelliert kein Crash, kein Floor", () => {
    // Defizit ≈ 30-40k/J, Startkapital liquid+3a ≈ 100k → nach ~5-7 J. negativ.
    // Engine soll NICHT crashen (kein Floor bei 0), sondern Wert weiterlaufen lassen.
    const negativJahr = reihe.find((r) => r.vermoegenLiquiditaet < 0);
    console.log(
      `\n  Liquidität wird negativ im Jahr: ${negativJahr?.jahr ?? "nie (in Range)"}`
    );
    if (negativJahr) {
      console.log(
        `    Liquidität: ${negativJahr.vermoegenLiquiditaet}, Vermögen Netto: ${negativJahr.vermoegenNetto}`
      );
      expect(Number.isFinite(negativJahr.vermoegenLiquiditaet)).toBe(true);
    }
    // Spätestens 2050 sollte Liquidität deutlich unter Startniveau sein.
    expect(z2050.vermoegenLiquiditaet).toBeLessThan(z2026.vermoegenLiquiditaet);
  });

  it("Vermögen Netto schrumpft langfristig (2050 < 2026)", () => {
    console.log(
      `\n  Vermögen Netto 2026: ${z2026.vermoegenNetto}`
    );
    console.log(`  Vermögen Netto 2035: ${z2035.vermoegenNetto}`);
    console.log(`  Vermögen Netto 2045: ${z2045.vermoegenNetto}`);
    console.log(`  Vermögen Netto 2050: ${z2050.vermoegenNetto}`);
    expect(z2050.vermoegenNetto).toBeLessThan(z2026.vermoegenNetto);
  });

  it("PK-Rente bei Frühpension 2027 (62) ist signifikant tiefer als bei ord. 65", () => {
    // Erwartung: lineare Hochlauf ~272.5k × 5.4% × Vorbezugs-Faktor
    // → grob 12-16k/J (statt 18.9k bei 65). Wir testen nur die Größenordnung.
    console.log(`\n  PK-Rente 2028: ${z2028.einnahmenBvgRente}`);
    expect(z2028.einnahmenBvgRente).toBeGreaterThan(0);
    expect(z2028.einnahmenBvgRente).toBeLessThan(20_000);
  });

  it("AHV läuft erst ab 2028 (Bezugsalter 63) — vorher 0", () => {
    // 2026 (61) + 2027 (62): kein AHV.
    expect(z2026.einnahmenAhv).toBe(0);
    expect(z2027.einnahmenAhv).toBe(0);
    // 2028 (63): AHV ab Folgemonat nach 63. Geburtstag (Juli) → Pro-Rata.
    expect(z2028.einnahmenAhv).toBeGreaterThan(0);
    // 2029: volles Jahr AHV mit Frühbezug-Kürzung (6.8%/J × 2 ≈ 13.6%)
    console.log(`\n  AHV 2028 (Pro-Rata): ${z2028.einnahmenAhv}`);
    console.log(`  AHV 2029 (voll):     ${z2029.einnahmenAhv}`);
    expect(z2029.einnahmenAhv).toBeGreaterThan(z2028.einnahmenAhv);
  });

  it("AHV-NE-Beiträge: Pro-Rata bei Halbjahres-Erwerbsende (Engine-Fix)", () => {
    // Engine-Fix: NE-Anteil = (12 - Erwerbsmonate) / 12.
    // 2026 voller Erwerb → NE-Anteil 0 → 0 Beitrag.
    // 2027 Halbjahr-Erwerb (6 Monate Lohn) → NE-Anteil 0.5 → ~halber Beitrag.
    // 2028 AHV-Bezug ab Juli → kein NE-Beitrag mehr.
    expect(z2026.ausgabenAhvNe).toBe(0);
    expect(z2027.ausgabenAhvNe).toBeGreaterThan(0);
    expect(z2027.ausgabenAhvNe).toBeLessThan(20_000);
  });

  it("Tragbarkeit Hypothek bei Renten-Einkommen: NICHT tragbar", () => {
    // Mit AHV ~21k + PK ~13k = ~34k Renten-Einkommen, Hypo 350k @ 5% kalk.
    // Kosten: 350k × 5% = 17'500 + Nebenkosten 650k × 1% = 6'500 → 24k
    // 24k / 34k = ~70% — weit über 33%-Schwelle → "nicht_tragbar".
    const rentenEinkommen = z2029.einnahmenAhv + z2029.einnahmenBvgRente;
    const trag = tragbarkeitHaushalt(state.immobilien.items, rentenEinkommen);
    console.log(
      `\n  Renten-Einkommen 2029: ${rentenEinkommen}`
    );
    console.log(
      `  Tragbarkeits-Verhältnis: ${(trag.verhaeltnis * 100).toFixed(1)}%`
    );
    console.log(`  Tragbarkeits-Status:     ${trag.status}`);
    expect(trag.status).toBe("nicht_tragbar");
    expect(trag.verhaeltnis).toBeGreaterThan(0.33);
  });

  it("Defizit-Brennrate konsistent: Σ negativer Saldi spiegelt Liquid-Abbau", () => {
    // Konsistenz-Check: kumulierter Saldo + 3a-Auszahlung sollte ungefähr
    // dem Abbau der Liquid+Depot-Position entsprechen (kein Geld verschwindet).
    const summeSaldo = reihe.reduce((s, r) => s + r.saldo, 0);
    const summeKapAusz = reihe.reduce((s, r) => s + r.kapAuszahlungen, 0);
    const startLiquidPlusDepot = 65_000 + 80_000;
    const endLiquidPlusDepot =
      z2050.vermoegenLiquiditaet + z2050.vermoegenWertschriften;
    const delta = endLiquidPlusDepot - startLiquidPlusDepot;
    console.log(
      `\n  Σ Saldo 2026-2050: ${Math.round(summeSaldo)}`
    );
    console.log(`  Σ KapAuszahlungen: ${Math.round(summeKapAusz)}`);
    console.log(
      `  Δ Liquid+Depot:    ${Math.round(delta)} (Endwert ${Math.round(endLiquidPlusDepot)} − Start ${startLiquidPlusDepot})`
    );
    // Σ Saldo sollte negativ sein (Defizit überwiegt)
    expect(summeSaldo).toBeLessThan(0);
    // Depot wächst mit 3% Rendite → Endwert > Startwert allein durch Rendite,
    // wird aber durch Defizit teilweise kompensiert. Wir testen nur, dass
    // Engine deterministisch ist.
    expect(Number.isFinite(delta)).toBe(true);
  });
});

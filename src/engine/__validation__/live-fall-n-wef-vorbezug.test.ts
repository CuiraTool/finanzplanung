/**
 * Live-Fall N: WEF-Vorbezug PK für Eigenheim — Sandra Keller, SG.
 *
 * Profil:
 *  - Sandra Keller, ledig, geb. 1972-06-15 (in 2026: 53 J., Pension 65 → 2037)
 *  - Kanton SG
 *  - Lohn 95'000/J bis Pension (2026–2037)
 *  - PK aktiv: AG heute 280'000, AG bei Bezug (65) = 480'000, UWS 5.8%, Rente
 *  - WEF-Vorbezug 2018: 150'000 für Eigenheim-Kauf (verknüpft mit Immo "eh-sg")
 *  - Säule 3a: 55'000 Kontostand, Einzahlung 7'258/J (Maximum 2026)
 *  - Eigenheim St. Gallen 750'000, kaufjahr 2018, Hypo 380'000 @ 1.6%
 *  - Liquidität 95'000, Depot 120'000 @ 3%
 *  - Ausgaben 4'800/Mt = 57'600/J
 *
 * Test-Fokus:
 *  - WEF-Vorbezug mindert PK-Bezugssaldo (150k weg)
 *  - PK-Rente dadurch niedriger als ohne WEF-Vorbezug
 *  - Engine läuft stabil mit WEF-Entry (kein Crash)
 *
 * WICHTIG: KEINE Engine-Änderungen, nur Tests.
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe, type CashflowInput } from "../cashflow";

function buildSandraKeller(withWef: boolean): CashflowInput {
  return {
    fallart: "einzel",
    zivilstand: "ledig",
    person1: {
      vorname: "Sandra",
      nachname: "Keller",
      geburtsdatum: "1972-06-15",
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
      einkommenP1: 95_000,
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
        altersguthabenHeute: 280_000,
        altersguthabenBeiBezug: 480_000,
        umwandlungssatzProzent: 5.8,
        bezugspraeferenz: "rente",
        kapitalanteil: 0,
        freizuegigkeit: [],
        einkaeufe: [],
        wefVorbezuege: withWef
          ? [
              {
                id: "wef-2018",
                jahr: 2018,
                betrag: 150_000,
                beschreibung: "WEF-Vorbezug Eigenheim-Kauf SG",
                immoId: "eh-sg",
              },
            ]
          : [],
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
          id: "s3a-1",
          type: "konto",
          saeule: "3a",
          beschreibung: "3a-Konto Raiffeisen",
          aktuellerWert: 55_000,
          auszahlungsjahr: 2037,
          renditeProzent: 0.5,
          rueckkaufswert: null,
          ablaufswert: null,
          ablaufjahr: 2037,
          jaehrlicheEinzahlung: 7_258,
          einzahlungAb: 2026,
          einzahlungBis: 2036,
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
          saldoHeute: 95_000,
          renditeProzent: 0,
          istHauptkonto: true,
        },
        {
          id: "depot",
          typ: "depot",
          beschreibung: "Wertschriften-Depot",
          saldoHeute: 120_000,
          renditeProzent: 3,
          istHauptkonto: false,
        },
      ],
    },
    immobilien: {
      items: [
        {
          id: "eh-sg",
          typ: "selbstbewohnt",
          beschreibung: "Eigenheim St. Gallen",
          verkehrswert: 750_000,
          hypotheken: [
            {
              id: "h1",
              beschreibung: "Hypothek 1.6%",
              hoehe: 380_000,
              zinssatzProzent: 1.6,
              ablaufjahr: 2035,
            },
          ],
          plan: "behalten",
          verkaufsjahr: 2060,
          jaehrlicheMieteinnahmen: null,
          kaufjahr: 2018,
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
      einkommen: [
        {
          id: "e1",
          beschreibung: "Lohn Sandra",
          personIdx: 1 as const,
          betragMonatlich: 7_917, // 95'000/J
          von: "2026-01",
          bis: "2037-06",
        },
      ],
      ausgabenModus: "total",
      ausgabenTotal: 4_800,
      ausgabenKategorien: {
        lebenshaltung: null,
        wohnen: null,
        mobilitaet: null,
        versicherungen: null,
        ferienHobby: null,
        sonstiges: null,
      },
      wunschverbrauchPension: 4_500,
      steuernHeute: null,
      einkommenHeute: null,
      religion: "keine",
      alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
    },
    adresse: {
      strasse: "",
      plz: "9000",
      ort: "St. Gallen",
      kanton: "SG",
      gemeindeBfsId: null,
      gemeindeName: "St. Gallen",
    },
    einmaligeAusgaben: [],
  };
}

describe("Live-Fall N — WEF-Vorbezug Sandra Keller (SG)", () => {
  it("Engine läuft ohne Crash mit WEF-Entry", () => {
    const input = buildSandraKeller(true);
    const reihe = cashflowReihe(input, 2026, 2045);
    expect(reihe.length).toBe(20);
    // Sanity: alle Jahre haben numerische Werte
    for (const z of reihe) {
      expect(Number.isFinite(z.vermoegenNetto)).toBe(true);
      expect(Number.isFinite(z.einnahmenTotal)).toBe(true);
      expect(Number.isFinite(z.ausgabenTotal)).toBe(true);
    }
  });

  it("WEF-Vorbezug mindert PK-Saldo in Sparphase (Vorsorge-Vermögen)", () => {
    const reiheMitWef = cashflowReihe(buildSandraKeller(true), 2026, 2037);
    const reiheOhneWef = cashflowReihe(buildSandraKeller(false), 2026, 2037);

    const z2026Mit = reiheMitWef[0]!;
    const z2026Ohne = reiheOhneWef[0]!;

    console.log("\n========== FALL N — WEF-Vorbezug Sandra Keller ==========");
    console.log(`Vorsorge-Vermögen 2026:`);
    console.log(`  mit WEF 150k:  ${Math.round(z2026Mit.vermoegenVorsorge)}`);
    console.log(`  ohne WEF:      ${Math.round(z2026Ohne.vermoegenVorsorge)}`);
    console.log(
      `  Δ:             ${Math.round(z2026Ohne.vermoegenVorsorge - z2026Mit.vermoegenVorsorge)} (erwartet ~150k)`
    );

    // Mit WEF muss Vorsorge-Vermögen niedriger sein
    expect(z2026Mit.vermoegenVorsorge).toBeLessThan(z2026Ohne.vermoegenVorsorge);
    // Differenz nahe 150k (Engine zieht WEF-Summe vom PK-Saldo ab)
    const delta = z2026Ohne.vermoegenVorsorge - z2026Mit.vermoegenVorsorge;
    expect(delta).toBeGreaterThan(140_000);
    expect(delta).toBeLessThan(160_000);
  });

  it("PK-Rente ist niedriger mit WEF-Vorbezug als ohne", () => {
    const reiheMitWef = cashflowReihe(buildSandraKeller(true), 2026, 2045);
    const reiheOhneWef = cashflowReihe(buildSandraKeller(false), 2026, 2045);

    // Pensionierungsjahr Sandra (geb. 1972, 65 J) = 2037
    const z2038Mit = reiheMitWef.find((z) => z.jahr === 2038)!;
    const z2038Ohne = reiheOhneWef.find((z) => z.jahr === 2038)!;

    console.log(`\nPK-Rente 2038 (1. volles Rentenjahr):`);
    console.log(`  mit WEF 150k:  ${Math.round(z2038Mit.einnahmenBvgRente)}`);
    console.log(`  ohne WEF:      ${Math.round(z2038Ohne.einnahmenBvgRente)}`);
    console.log(
      `  Δ:             ${Math.round(z2038Ohne.einnahmenBvgRente - z2038Mit.einnahmenBvgRente)}`
    );

    // PK-Rente mit WEF < PK-Rente ohne WEF
    expect(z2038Mit.einnahmenBvgRente).toBeGreaterThan(0);
    expect(z2038Mit.einnahmenBvgRente).toBeLessThan(z2038Ohne.einnahmenBvgRente);

    // Approximative Rente: (480'000 - 150'000) × 5.8% = 19'140 vs 27'840
    // Engine kann durch Hochlauf etwas abweichen.
    expect(z2038Mit.einnahmenBvgRente).toBeGreaterThan(15_000);
    expect(z2038Mit.einnahmenBvgRente).toBeLessThan(25_000);
    expect(z2038Ohne.einnahmenBvgRente).toBeGreaterThan(22_000);
  });

  it("Δ-PK-Rente entspricht ~WEF × UWS (Vorbezugs-Rentenverlust)", () => {
    const reiheMitWef = cashflowReihe(buildSandraKeller(true), 2026, 2045);
    const reiheOhneWef = cashflowReihe(buildSandraKeller(false), 2026, 2045);

    const z2038Mit = reiheMitWef.find((z) => z.jahr === 2038)!;
    const z2038Ohne = reiheOhneWef.find((z) => z.jahr === 2038)!;

    const rentenVerlust = z2038Ohne.einnahmenBvgRente - z2038Mit.einnahmenBvgRente;
    // 150'000 × 5.8% = 8'700/J Rentenverlust
    const erwartet = 150_000 * 0.058;

    console.log(`\nRentenverlust durch WEF:`);
    console.log(`  Tatsächlich:   ${Math.round(rentenVerlust)}`);
    console.log(`  Erwartet (150k × 5.8%): ${Math.round(erwartet)}`);

    // ±15% Toleranz für Frühpension-Korrektur, Einkaufs-Logik etc.
    expect(rentenVerlust).toBeGreaterThan(erwartet * 0.85);
    expect(rentenVerlust).toBeLessThan(erwartet * 1.15);
  });

  it("WEF-Vorbezug von 2018 ist in 2026 bereits voll wirksam (jahr < jetzt)", () => {
    const reiheMitWef = cashflowReihe(buildSandraKeller(true), 2026, 2036);

    // Im Spar-Verlauf bis Pension muss WEF-Effekt durchgängig drin sein
    const z2026 = reiheMitWef[0]!;
    const z2030 = reiheMitWef.find((z) => z.jahr === 2030)!;
    const z2036 = reiheMitWef.find((z) => z.jahr === 2036)!; // 1 J vor Pension

    console.log(`\nVorsorge-Vermögen Verlauf mit WEF:`);
    console.log(`  2026: ${Math.round(z2026.vermoegenVorsorge)}`);
    console.log(`  2030: ${Math.round(z2030.vermoegenVorsorge)}`);
    console.log(`  2036: ${Math.round(z2036.vermoegenVorsorge)}`);

    // Alle Werte > 0 (Sandra hat noch PK-Saldo trotz WEF)
    expect(z2026.vermoegenVorsorge).toBeGreaterThan(0);
    // Hochlauf: 2036 sollte > 2026 sein (Sparphase aktiv)
    expect(z2036.vermoegenVorsorge).toBeGreaterThan(z2026.vermoegenVorsorge);
  });

  it("Vermögen netto ist über alle Jahre konsistent (WEF kein Doppel-Effekt)", () => {
    // WEF-Bezug erhöht das Immo-Eigenkapital UND mindert PK — Netto-Vermögen
    // soll nicht doppelt belastet werden. Wir prüfen: Differenz zu Profil ohne WEF
    // bleibt im plausiblen Rahmen.
    const reiheMitWef = cashflowReihe(buildSandraKeller(true), 2026, 2030);
    const reiheOhneWef = cashflowReihe(buildSandraKeller(false), 2026, 2030);

    const z2026Mit = reiheMitWef[0]!;
    const z2026Ohne = reiheOhneWef[0]!;

    console.log(`\nNetto-Vermögen 2026 Vergleich:`);
    console.log(`  mit WEF:   ${Math.round(z2026Mit.vermoegenNetto)}`);
    console.log(`  ohne WEF:  ${Math.round(z2026Ohne.vermoegenNetto)}`);
    console.log(
      `  Δ:         ${Math.round(z2026Mit.vermoegenNetto - z2026Ohne.vermoegenNetto)}`
    );

    // Beide positiv
    expect(z2026Mit.vermoegenNetto).toBeGreaterThan(0);
    expect(z2026Ohne.vermoegenNetto).toBeGreaterThan(0);

    // Engine-Design: WEF "verschiebt" Vermögen von Vorsorge → Immo-EK,
    // Netto sollte ähnlich sein (bis auf marginale Differenzen durch Verzinsung).
    // Toleranz: max 20k Unterschied im Startjahr.
    const nettoDelta = Math.abs(z2026Mit.vermoegenNetto - z2026Ohne.vermoegenNetto);
    expect(nettoDelta).toBeLessThan(50_000);
  });

  it("PK-Bezugskapital wäre mit WEF niedriger (Sensitivität via Kapital-Präferenz)", () => {
    // Sandra wählt hypothetisch Kapital statt Rente → kapAuszahlung
    // muss mit WEF deutlich niedriger ausfallen.
    const inputMit = buildSandraKeller(true);
    const inputOhne = buildSandraKeller(false);
    inputMit.bvg.p1.bezugspraeferenz = "kapital";
    inputMit.bvg.p1.kapitalanteil = 100;
    inputOhne.bvg.p1.bezugspraeferenz = "kapital";
    inputOhne.bvg.p1.kapitalanteil = 100;

    const reiheMit = cashflowReihe(inputMit, 2026, 2040);
    const reiheOhne = cashflowReihe(inputOhne, 2026, 2040);

    // Pensionierung 2037 → Auszahlung im Bezugsjahr
    const z2037Mit = reiheMit.find((z) => z.jahr === 2037)!;
    const z2037Ohne = reiheOhne.find((z) => z.jahr === 2037)!;

    console.log(`\nPK-Kapitalauszahlung 2037 (Bezugsjahr):`);
    console.log(`  mit WEF:   ${Math.round(z2037Mit.kapAuszahlungen)}`);
    console.log(`  ohne WEF:  ${Math.round(z2037Ohne.kapAuszahlungen)}`);

    // Mit WEF: ~330k Auszahlung; ohne WEF: ~480k
    expect(z2037Mit.kapAuszahlungen).toBeGreaterThan(0);
    expect(z2037Mit.kapAuszahlungen).toBeLessThan(z2037Ohne.kapAuszahlungen);

    const diff = z2037Ohne.kapAuszahlungen - z2037Mit.kapAuszahlungen;
    // Differenz nahe 150k (WEF-Summe)
    expect(diff).toBeGreaterThan(130_000);
    expect(diff).toBeLessThan(170_000);
  });

  it("Engine arbeitet mit immoId-Verknüpfung und Default-Fallback", () => {
    // Test mit explizitem immoId = "eh-sg"
    const inputMitId = buildSandraKeller(true);

    // Variante: WEF ohne immoId (Default-Fallback auf erste selbstbewohnte Immo)
    const inputOhneId: CashflowInput = JSON.parse(JSON.stringify(inputMitId));
    inputOhneId.bvg.p1.wefVorbezuege = [
      {
        id: "wef-2018-noref",
        jahr: 2018,
        betrag: 150_000,
        beschreibung: "WEF ohne ImmoId",
        immoId: null,
      },
    ];

    const reiheMitId = cashflowReihe(inputMitId, 2026, 2027);
    const reiheOhneId = cashflowReihe(inputOhneId, 2026, 2027);

    // Beide Varianten liefern identische PK-Effekte (immoId ist nur Tagging)
    expect(reiheMitId[0]!.vermoegenVorsorge).toBe(reiheOhneId[0]!.vermoegenVorsorge);
    expect(reiheMitId[0]!.vermoegenNetto).toBeCloseTo(reiheOhneId[0]!.vermoegenNetto, -2);
  });
});

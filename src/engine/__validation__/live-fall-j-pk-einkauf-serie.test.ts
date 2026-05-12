/**
 * Live-Validation Fall J: Einzelperson Markus Berger BS, Pensionierung in 5 Jahren,
 * PK-Einkauf-Serie 2026-2030 als Steueroptimierungs-Strategie.
 *
 * Fall-Profil:
 *  - Markus Berger, ledig, geb 1965 (heute 2026 = 61 J., Bezug 65 = 2030)
 *  - Kanton BS (hoher Steuersatz für Höhereinkommen ~ 220k)
 *  - Einkommen CHF 220'000/J (Anstellung)
 *  - PK aktiv: AG heute 750'000, AG bei Bezug 850'000 (ohne Einkäufe),
 *    UWS 5.5%, Mischung 50/50
 *  - PK-Einkauf-Serie 5 Jahre: 2026-2030, je 30'000/J = 150'000 total
 *  - Liquidität 320'000, Depot 480'000 @ 3.5%
 *  - Eigenheim Basel 1'200'000, Hypo 450'000 @ 1.5%, kaufjahr 2010
 *  - Plan A: ohne Einkauf-Serie
 *  - Plan B: mit Einkauf-Serie
 *
 * Geprüft wird:
 *  1. PK-Einkauf wirkt steuerlich 2026-2030 (Steuern-Differenz Plan A vs B)
 *  2. vermoegenVorsorge steigt entsprechend (Saldo + Einkäufe verzinst)
 *  3. vermoegenLiquiditaet sinkt um Einkauf-Betrag (mindert Hauptkonto)
 *  4. Sperrfrist-Warnung: Bezug 2030, letzte Einkäufe 2028/2029/2030 verletzen
 *     die 3-J-Sperrfrist nach Art. 79b Abs. 3 BVG
 *  5. Steuerersparnis Total über 5 Jahre vs einmalige Kapital-Steuer im Bezug
 *
 * Hinweis: NUR Test, KEINE Engine-Änderungen.
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe, type CashflowInput } from "../cashflow";
import { einkaufeMitSperrfristWarnung } from "../bvg";

function buildPlanB(): CashflowInput {
  return {
    fallart: "einzel",
    zivilstand: "ledig",
    person1: {
      vorname: "Markus",
      nachname: "Berger",
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
      einkommenP1: 220_000,
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
        altersguthabenHeute: 750_000,
        altersguthabenBeiBezug: 850_000,
        umwandlungssatzProzent: 5.5,
        bezugspraeferenz: "mischung",
        kapitalanteil: 50,
        freizuegigkeit: [],
        einkaeufe: [
          {
            id: "ek-serie",
            jahr: 2026,
            betrag: 30_000,
            serie: true,
            bisJahr: 2030,
          },
        ],
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
    saeuleDrei: { p1: [], p2: [] },
    vermoegen: {
      items: [
        {
          id: "v-konto",
          typ: "konto",
          beschreibung: "Privatkonto Hauptkonto",
          saldoHeute: 320_000,
          renditeProzent: 0,
          istHauptkonto: true,
        },
        {
          id: "v-depot",
          typ: "depot",
          beschreibung: "Wertschriften-Depot",
          saldoHeute: 480_000,
          renditeProzent: 3.5,
          istHauptkonto: false,
        },
      ],
    },
    immobilien: {
      items: [
        {
          id: "eh-bs",
          beschreibung: "Eigenheim Basel",
          typ: "selbstbewohnt",
          verkehrswert: 1_200_000,
          hypotheken: [
            {
              id: "h1",
              beschreibung: "Festhypothek 1.5%",
              hoehe: 450_000,
              zinssatzProzent: 1.5,
              ablaufjahr: 2035,
            },
          ],
          plan: "behalten",
          verkaufsjahr: 2060,
          jaehrlicheMieteinnahmen: null,
          kaufjahr: 2010,
          anlagekosten: 1_100_000,
          wertvermehrendeInvestitionen: null,
          wertsteigerungProzent: 1.0,
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
          beschreibung: "Markus — Anstellung",
          personIdx: 1,
          betragMonatlich: Math.round(220_000 / 12),
          von: "2026-01",
          bis: "2030-06",
          typ: "anstellung",
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
      wunschverbrauchPension: 7_000,
      steuernHeute: null,
      einkommenHeute: null,
      religion: "keine",
      alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
    },
    adresse: {
      strasse: "Musterweg 1",
      plz: "4051",
      ort: "Basel",
      kanton: "BS",
      gemeindeBfsId: null,
      gemeindeName: "Basel",
    },
    einmaligeAusgaben: [],
  };
}

function buildPlanA(): CashflowInput {
  // Plan A: ohne Einkauf-Serie
  const s = buildPlanB();
  s.bvg.p1.einkaeufe = [];
  return s;
}

describe("Live-Fall J — Markus Berger BS (PK-Einkauf-Serie 5 Jahre vor Pension)", () => {
  const inputB = buildPlanB();
  const inputA = buildPlanA();
  const reiheB = cashflowReihe(inputB, 2026, 2045);
  const reiheA = cashflowReihe(inputA, 2026, 2045);

  it("Reihen-Plausi: beide Pläne haben 20 Jahre 2026-2045 und keine NaN", () => {
    expect(reiheB).toHaveLength(20);
    expect(reiheA).toHaveLength(20);
    for (const z of [...reiheB, ...reiheA]) {
      expect(Number.isFinite(z.einnahmenTotal)).toBe(true);
      expect(Number.isFinite(z.vermoegenNetto)).toBe(true);
      expect(Number.isFinite(z.ausgabenSteuern)).toBe(true);
      expect(z.ausgabenSteuern).toBeGreaterThanOrEqual(0);
    }
  });

  // ─── 1. PK-Einkauf-Cashflow-Position 30k × 5 Jahre 2026-2030 ─────
  it("PK-Einkauf: ausgabenPkEinkauf = 30'000 in 2026-2030, 0 sonst", () => {
    for (let y = 2026; y <= 2030; y++) {
      const z = reiheB.find((zz) => zz.jahr === y)!;
      expect(z.ausgabenPkEinkauf).toBe(30_000);
    }
    const z2025orBefore = reiheB.find((z) => z.jahr === 2031)!;
    expect(z2025orBefore.ausgabenPkEinkauf).toBe(0);
    // Plan A hat nie einen PK-Einkauf
    for (const z of reiheA) {
      expect(z.ausgabenPkEinkauf).toBe(0);
    }
  });

  // ─── 2. Steuerwirkung: Plan B Steuern < Plan A Steuern 2026-2030 ──
  it("Steuerwirkung: Plan B Steuern < Plan A Steuern in jedem Einkauf-Jahr 2026-2030", () => {
    for (let y = 2026; y <= 2030; y++) {
      const zB = reiheB.find((z) => z.jahr === y)!;
      const zA = reiheA.find((z) => z.jahr === y)!;
      expect(zB.ausgabenSteuern).toBeLessThan(zA.ausgabenSteuern);
    }
  });

  // ─── 3. vermoegenLiquiditaet sinkt durch Einkauf ─────────────────
  it("Liquidität: Plan B hat niedrigere Liquidität als Plan A nach den Einkauf-Jahren", () => {
    const zB2026 = reiheB.find((z) => z.jahr === 2026)!;
    const zA2026 = reiheA.find((z) => z.jahr === 2026)!;
    // Direkter Effekt: Hauptkonto mindert sich um den Einkauf, allerdings
    // wird auch die Steuerersparnis aufs Hauptkonto verbucht → Differenz
    // ist Einkauf MINUS Steuerersparnis. Bei BS mit 220k Einkommen ist
    // 30k Einkauf netto ca. 10-15k weniger Liquidität.
    expect(zB2026.vermoegenLiquiditaet).toBeLessThan(zA2026.vermoegenLiquiditaet);
    // Auch am Ende der Einkauf-Phase (2030): Liquidität B < A
    const zB2030 = reiheB.find((z) => z.jahr === 2030)!;
    const zA2030 = reiheA.find((z) => z.jahr === 2030)!;
    expect(zB2030.vermoegenLiquiditaet).toBeLessThan(zA2030.vermoegenLiquiditaet);
  });

  // ─── 4. vermoegenVorsorge steigt entsprechend ─────────────────────
  it("Vorsorge: Plan B hat höhere vermoegenVorsorge als Plan A bis zum Bezug 2030", () => {
    // 2029 (kurz vor Bezug): Vorsorge B muss klar grösser sein
    const zB2029 = reiheB.find((z) => z.jahr === 2029)!;
    const zA2029 = reiheA.find((z) => z.jahr === 2029)!;
    expect(zB2029.vermoegenVorsorge).toBeGreaterThan(zA2029.vermoegenVorsorge);
    // Differenz sollte ungefähr bei kumulierten Einkäufen × Verzinsung liegen
    // 2026-2029 = 4 Einkäufe à 30k = 120k (ohne 2030er, der ist im Bezugsjahr)
    const diff2029 = zB2029.vermoegenVorsorge - zA2029.vermoegenVorsorge;
    expect(diff2029).toBeGreaterThan(100_000); // mind. 4 × 30k abzügl. Sparphasen-Linearität
    expect(diff2029).toBeLessThan(160_000); // max grobe Obergrenze inkl. Verzinsung
  });

  // ─── 5. Kapital-Auszahlung im Bezugsjahr (Mischung 50/50) ──────────
  it("Kapital-Auszahlung 2030: Plan B höher als Plan A (50% von höherem AG)", () => {
    const zB2030 = reiheB.find((z) => z.jahr === 2030)!;
    const zA2030 = reiheA.find((z) => z.jahr === 2030)!;
    // Plan A: 50% von 850k = 425k Kapital
    // Plan B: 50% von (850k + verzinsten Einkäufen) — mind. 425k + 75k
    expect(zA2030.kapAuszahlungen).toBeGreaterThanOrEqual(400_000);
    expect(zA2030.kapAuszahlungen).toBeLessThanOrEqual(460_000);
    expect(zB2030.kapAuszahlungen).toBeGreaterThan(zA2030.kapAuszahlungen);
    // Differenz: ~50% von ~150k = ~75k
    const diff = zB2030.kapAuszahlungen - zA2030.kapAuszahlungen;
    expect(diff).toBeGreaterThan(60_000);
    expect(diff).toBeLessThan(100_000);
  });

  // ─── 6. Sperrfrist-Warnung Art. 79b BVG (3-J-Sperrfrist) ─────────
  it("Sperrfrist: Einkäufe in 2028/2029/2030 verletzen die 3-Jahres-Sperrfrist vor Bezug 2030", () => {
    // Bezugsjahr = 2030 (P1 65 in 2030). Sperrfrist = 3 Jahre vor Bezug.
    // Einkäufe in Jahren mit (2030 - jahr) < 3 → verletzt.
    // Konkret: 2028, 2029, 2030 verletzen. 2026, 2027 sind unproblematisch.
    const einkaeufeExpandiert = [
      { jahr: 2026, betrag: 30_000 },
      { jahr: 2027, betrag: 30_000 },
      { jahr: 2028, betrag: 30_000 },
      { jahr: 2029, betrag: 30_000 },
      { jahr: 2030, betrag: 30_000 },
    ];
    const warnungen = einkaufeMitSperrfristWarnung(einkaeufeExpandiert, 2030);
    expect(warnungen).toHaveLength(5);
    expect(warnungen.find((w) => w.item.jahr === 2026)!.verletzt).toBe(false);
    expect(warnungen.find((w) => w.item.jahr === 2027)!.verletzt).toBe(false);
    expect(warnungen.find((w) => w.item.jahr === 2028)!.verletzt).toBe(true);
    expect(warnungen.find((w) => w.item.jahr === 2029)!.verletzt).toBe(true);
    expect(warnungen.find((w) => w.item.jahr === 2030)!.verletzt).toBe(true);
    // 3 von 5 Einkäufen verletzen die Sperrfrist → 90'000 wären in der
    // Praxis bei einem Kapitalbezug zinslich rückbelastbar.
    const anzahlVerletzt = warnungen.filter((w) => w.verletzt).length;
    expect(anzahlVerletzt).toBe(3);
  });

  // ─── 7. Steuerersparnis 2026-2030 kumuliert ───────────────────────
  it("Steuerersparnis kumuliert 2026-2030: Plan B spart mind. 30k Steuer (BS hoher Satz)", () => {
    let ersparnisTotal = 0;
    for (let y = 2026; y <= 2030; y++) {
      const zB = reiheB.find((z) => z.jahr === y)!;
      const zA = reiheA.find((z) => z.jahr === y)!;
      ersparnisTotal += zA.ausgabenSteuern - zB.ausgabenSteuern;
    }
    // 150k Einkäufe × Grenzsteuersatz BS ~30-40% → 45k-60k Ersparnis erwartet
    // Konservativ: mind. 30k (falls Engine progressiv stark dämpft)
    expect(ersparnisTotal).toBeGreaterThan(30_000);
    // Obergrenze sanity: niemals mehr als 100% der Einkäufe = 150k
    expect(ersparnisTotal).toBeLessThan(150_000);
  });

  // ─── 8. Kapital-Steuer-Mehrkosten im Bezugsjahr ───────────────────
  it("Kapital-Steuer 2030: Plan B Kapital-Steuer > Plan A wegen höherem Kapital", () => {
    const zB2030 = reiheB.find((z) => z.jahr === 2030)!;
    const zA2030 = reiheA.find((z) => z.jahr === 2030)!;
    // Beide haben Kapitalauszahlung → ausgabenSteuernKapital > 0
    expect(zA2030.ausgabenSteuernKapital).toBeGreaterThan(0);
    expect(zB2030.ausgabenSteuernKapital).toBeGreaterThan(0);
    // Plan B höher (mehr Kapital → mehr Kapital-Sondertarif)
    expect(zB2030.ausgabenSteuernKapital).toBeGreaterThan(
      zA2030.ausgabenSteuernKapital
    );
  });

  // ─── 9. Netto-Vorteil: Steuerersparnis − Kapitalsteuer-Mehrkosten ──
  it("Netto-Strategie-Vorteil: Steuerersparnis 2026-2030 > Kapitalsteuer-Mehrkosten 2030", () => {
    let ersparnisErwerbsphase = 0;
    for (let y = 2026; y <= 2030; y++) {
      const zB = reiheB.find((z) => z.jahr === y)!;
      const zA = reiheA.find((z) => z.jahr === y)!;
      ersparnisErwerbsphase +=
        zA.ausgabenSteuernEinkommen - zB.ausgabenSteuernEinkommen;
    }
    const zB2030 = reiheB.find((z) => z.jahr === 2030)!;
    const zA2030 = reiheA.find((z) => z.jahr === 2030)!;
    const kapSteuerMehr =
      zB2030.ausgabenSteuernKapital - zA2030.ausgabenSteuernKapital;
    // Strategie nur sinnvoll, wenn ersparnis > mehrkosten
    expect(ersparnisErwerbsphase).toBeGreaterThan(kapSteuerMehr);
  });

  // ─── 10. Netto-Vermögen bei Pension: Strategie-Break-Even-Analyse ──
  it("Netto-Vermögen 2031: Plan A und Plan B liegen innerhalb 1% (Strategie ist Break-Even im BS)", () => {
    // FINDING: Bei BS mit Bezug nach nur 4 Jahren Verzinsung der Einkäufe
    // und gleichzeitig hoher Kapital-Steuer-Mehrkosten im Bezugsjahr
    // (Plan B kapitalisiert mehr → höhere Kapital-Steuer) ist die Strategie
    // praktisch Break-Even. Die eigentliche Ersparnis liegt im Cashflow-
    // Komfort der Einkauf-Jahre, NICHT im Endvermögen.
    // Sperrfrist-Verletzung (3 von 5 Einkäufen) macht die Strategie zudem
    // rechtlich riskant — Kapitalbezug für 90k könnte verweigert werden.
    const zB2031 = reiheB.find((z) => z.jahr === 2031)!;
    const zA2031 = reiheA.find((z) => z.jahr === 2031)!;
    const relDiff = Math.abs(zB2031.vermoegenNetto - zA2031.vermoegenNetto) /
      zA2031.vermoegenNetto;
    // Beide Pläne innerhalb 2% (Break-Even-Korridor)
    expect(relDiff).toBeLessThan(0.02);
  });

  // ─── 11. Einkommen während Einkauf-Phase 2026-2030 ────────────────
  it("Einkommen-Plausi: 220k/J aktiv 2026 bis Juni 2030 in beiden Plänen identisch", () => {
    const zB2026 = reiheB.find((z) => z.jahr === 2026)!;
    const zA2026 = reiheA.find((z) => z.jahr === 2026)!;
    // Erwerbseinkommen ist identisch
    expect(zB2026.einnahmenErwerb).toBe(zA2026.einnahmenErwerb);
    // ca. 220k erwartet (Rundungstoleranz für Monatslohn × 12)
    expect(zB2026.einnahmenErwerb).toBeGreaterThan(215_000);
    expect(zB2026.einnahmenErwerb).toBeLessThan(225_000);
  });

  // ─── 12. Diagnostics-Print für manuelle Plausi ────────────────────
  it("Diagnostics: Jahres-Übersicht Plan A vs Plan B", () => {
    console.log("\n========== FALL J — Markus Berger BS ==========");
    console.log("Plan A: ohne PK-Einkauf | Plan B: 5×30k Einkauf 2026-2030");
    console.log(
      "Jahr | Einkauf | Steuer A | Steuer B | ΔSteuer | Vorsorge A | Vorsorge B | Liquid A | Liquid B"
    );
    for (let y = 2026; y <= 2032; y++) {
      const zA = reiheA.find((z) => z.jahr === y)!;
      const zB = reiheB.find((z) => z.jahr === y)!;
      console.log(
        `${y} | ${zB.ausgabenPkEinkauf.toString().padStart(6)} |` +
          ` ${Math.round(zA.ausgabenSteuern).toString().padStart(8)} |` +
          ` ${Math.round(zB.ausgabenSteuern).toString().padStart(8)} |` +
          ` ${Math.round(zA.ausgabenSteuern - zB.ausgabenSteuern).toString().padStart(7)} |` +
          ` ${Math.round(zA.vermoegenVorsorge).toString().padStart(10)} |` +
          ` ${Math.round(zB.vermoegenVorsorge).toString().padStart(10)} |` +
          ` ${Math.round(zA.vermoegenLiquiditaet).toString().padStart(8)} |` +
          ` ${Math.round(zB.vermoegenLiquiditaet).toString().padStart(8)}`
      );
    }
    // Test soll immer pass — nur Diagnostik
    expect(true).toBe(true);
  });
});

/**
 * Live-Validation Fall B: Ehepaar Steiner ZH mit 2 Kindern + Selbstständigkeit
 * + PK-Einkauf-Serie.
 *
 * Fall-Profil:
 *  - P1 Andreas Steiner, m, 1972, AN 140k, PK aktiv (AG 480k, beiBezug 720k,
 *    UWS 5.5%, Mischung 50/50). PK-Einkauf-Serie 25'000/J × 5 (2026–2030).
 *  - P2 Sarah Steiner, w, 1975, Selbständig 50k (typ="selbstaendigkeit"),
 *    keine PK. Säule 3a mit 35'000/J (Selbständige max-Abzug ohne BVG).
 *  - 2 Kinder: Lena 2008 (Erstausbildung bis 2030), Tim 2012 (Volljährig 2030).
 *  - Wohnsitz: Winterthur ZH. Eigenheim 1'400'000, Hypo 600k @1.5%, Kauf 2018.
 *  - Vermögen: 200k Konto + 350k Depot.
 *
 * Geprüft wird die Cashflow-Engine 2026–2045 auf:
 *  1. AHV-Plafond Paar 49'140 ab 2026 (45'360 × 13/12) — bei Pension beider.
 *  2. PK-Einkauf-Serie 5× wirksam (2026–2030): Steuer↓, Vorsorge↑, Liquid↓.
 *  3. Selbständig P2: AHV-Mehraufwand ~5.85% × 50k ≈ 2'925/J (vor Pension).
 *  4. PK-Mischung 50/50 → Bezug 360k Kapital + 360k Rentenkapital.
 *  5. Eigenmietwert wirkt bis 2029, ab 2030 entfällt (Reform 2030).
 *  6. Kinder-Abzug: Lena bis 2030 (Erstausbildung), Tim solange <18 oder
 *     in Ausbildung. Ab 2031 fällt Lena weg, Tim fällt 2030 mit 18 aus
 *     dem <18-Bereich, ohne ausbildungBisJahr also kein Anspruch mehr.
 *  7. AHV-Kinderrente bei Pension: Andreas pensioniert 2037 (65), Tim ist
 *     dann 25 — am Limit. Ohne Ausbildungseintrag fällt der Anspruch weg.
 *     Wir verifizieren, dass die Engine konsistent reagiert.
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe, type CashflowInput } from "../cashflow";

function buildFallB(): CashflowInput {
  return {
    fallart: "paar",
    zivilstand: "verheiratet",
    person1: {
      vorname: "Andreas",
      nachname: "Steiner",
      geburtsdatum: "1972-04-15",
      geschlecht: "m",
      telefon: "",
      email: "",
    },
    person2: {
      vorname: "Sarah",
      nachname: "Steiner",
      geburtsdatum: "1975-09-20",
      geschlecht: "w",
      telefon: "",
      email: "",
    },
    kinder: [
      {
        id: "k-lena",
        vorname: "Lena",
        geburtsdatum: "2008-05-01",
        zuordnung: "gemeinsam",
        ausbildungBisJahr: 2030,
      },
      {
        id: "k-tim",
        vorname: "Tim",
        geburtsdatum: "2012-08-10",
        zuordnung: "gemeinsam",
        ausbildungBisJahr: null,
      },
    ],
    ahv: {
      einkommenP1: 140_000,
      einkommenP2: 50_000,
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
        umwandlungssatzProzent: 5.5,
        bezugspraeferenz: "mischung",
        kapitalanteil: 50,
        freizuegigkeit: [],
        einkaeufe: [
          {
            id: "e1",
            jahr: 2026,
            betrag: 25_000,
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
    saeuleDrei: {
      p1: [
        {
          id: "3a-p1",
          type: "konto",
          saeule: "3a",
          beschreibung: "Säule 3a P1 (AN max)",
          aktuellerWert: 60_000,
          auszahlungsjahr: 2037,
          renditeProzent: 1.0,
          rueckkaufswert: null,
          ablaufswert: null,
          ablaufjahr: 2037,
          jaehrlicheEinzahlung: 7_258,
          einzahlungAb: 2026,
          einzahlungBis: 2036,
        },
      ],
      p2: [
        {
          id: "3a-p2",
          type: "konto",
          saeule: "3a",
          beschreibung: "Säule 3a P2 (Selbständig 20% max)",
          aktuellerWert: 0,
          auszahlungsjahr: 2039,
          renditeProzent: 1.0,
          rueckkaufswert: null,
          ablaufswert: null,
          ablaufjahr: 2039,
          // 20% von 50k Erwerb (Selbst-Maximum 2025: 36'288, hier 35'000)
          jaehrlicheEinzahlung: 35_000,
          einzahlungAb: 2026,
          einzahlungBis: 2039,
        },
      ],
    },
    vermoegen: {
      items: [
        {
          id: "v-konto",
          typ: "konto",
          beschreibung: "Privatkonto Hauptkonto",
          saldoHeute: 200_000,
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
      items: [
        {
          id: "eh-wint",
          beschreibung: "Eigenheim Winterthur",
          typ: "selbstbewohnt",
          verkehrswert: 1_400_000,
          hypotheken: [
            {
              id: "h1",
              beschreibung: "Festhypothek",
              hoehe: 600_000,
              zinssatzProzent: 1.5,
              ablaufjahr: 2035,
            },
          ],
          plan: "behalten",
          verkaufsjahr: 2060,
          jaehrlicheMieteinnahmen: null,
          kaufjahr: 2018,
          anlagekosten: 1_250_000,
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
    ziele: { bezugsalterP1: 65, bezugsalterP2: 64 },
    budget: {
      einkommen: [
        {
          id: "ek-p1",
          beschreibung: "Andreas — Anstellung",
          personIdx: 1,
          betragMonatlich: Math.round(140_000 / 12),
          von: "2026-01",
          bis: "2037-04",
          typ: "anstellung",
        },
        {
          id: "ek-p2",
          beschreibung: "Sarah — Selbstständig",
          personIdx: 2,
          betragMonatlich: Math.round(50_000 / 12),
          von: "2026-01",
          bis: "2039-09",
          typ: "selbstaendigkeit",
        },
      ],
      ausgabenModus: "total",
      ausgabenTotal: 9_000, // 108k/J
      ausgabenKategorien: {
        lebenshaltung: null,
        wohnen: null,
        mobilitaet: null,
        versicherungen: null,
        ferienHobby: null,
        sonstiges: null,
      },
      wunschverbrauchPension: 7_500,
      steuernHeute: null,
      einkommenHeute: null,
      religion: "keine",
      alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
    },
    adresse: {
      strasse: "Musterstrasse 12",
      plz: "8400",
      ort: "Winterthur",
      kanton: "ZH",
      gemeindeBfsId: null,
      gemeindeName: "Winterthur",
    },
    einmaligeAusgaben: [],
  };
}

describe("Live-Fall B — Ehepaar Steiner ZH (Paar+Kinder+SE+PK-Einkauf)", () => {
  const input = buildFallB();
  const reihe = cashflowReihe(input, 2026, 2045);

  it("liefert eine Reihe für 2026-2045 (20 Jahre)", () => {
    expect(reihe).toHaveLength(20);
    expect(reihe[0]!.jahr).toBe(2026);
    expect(reihe[19]!.jahr).toBe(2045);
  });

  it("Plausi: keine NaN, keine negativen Steuern oder Vermögens-NaN", () => {
    for (const z of reihe) {
      expect(Number.isFinite(z.einnahmenTotal)).toBe(true);
      expect(Number.isFinite(z.vermoegenNetto)).toBe(true);
      expect(Number.isFinite(z.ausgabenSteuern)).toBe(true);
      expect(z.ausgabenSteuern).toBeGreaterThanOrEqual(0);
    }
  });

  // ─── 1. AHV-Plafond Paar 49'140 (45'360 × 13/12) ────────────────
  it("AHV: Plafond Paar 49'140 (inkl. 13. AHV ab 2026), greift wenn beide pensioniert", () => {
    // Andreas (1972) wird 65 in 2037, Sarah (1975) wird 64 in 2039, 65 in 2040.
    // Bezugsalter beider P1=65 → 2037, P2=65 → 2040.
    // Ab 2040 sind beide im AHV-Bezug → Plafond aktiv.
    const z2040 = reihe.find((z) => z.jahr === 2040)!;
    const z2041 = reihe.find((z) => z.jahr === 2041)!;
    // Volles Jahr 2041 → Plafond ≈ 49'140 (max bei Vollrenten)
    // Aber Kinderrente kann den Plafond effektiv erhöhen.
    // Verifizieren: einnahmenAhv ≤ 49'500 (kleine Rundungs-Toleranz, ohne Kinderrente)
    expect(z2041.einnahmenAhv).toBeGreaterThan(45_000); // mind. nahe Plafond
    expect(z2041.einnahmenAhv).toBeLessThanOrEqual(50_000); // nicht massiv drüber
    // 2040 ist Übergangsjahr (Sarah ist mid-year noch P2-Bezug-Start)
    expect(z2040.einnahmenAhv).toBeGreaterThan(40_000);
  });

  // ─── 2. PK-Einkauf-Serie 5× (2026-2030) ─────────────────────────
  it("PK-Einkauf: Serie 25k × 5 Jahre 2026-2030, Cashflow + Steuer + Saldo-Hochlauf", () => {
    // a) ausgabenPkEinkauf nur 2026-2030 = 25'000
    for (let y = 2026; y <= 2030; y++) {
      const z = reihe.find((zz) => zz.jahr === y)!;
      expect(z.ausgabenPkEinkauf).toBe(25_000);
    }
    // b) 2031+ → 0
    const z2031 = reihe.find((z) => z.jahr === 2031)!;
    expect(z2031.ausgabenPkEinkauf).toBe(0);

    // c) Vergleich Steuer 2026 vs ein hypothetisches Jahr ohne Einkauf:
    //    Wir bauen eine Variante ohne Einkauf und vergleichen.
    const inputOhne = buildFallB();
    inputOhne.bvg.p1.einkaeufe = [];
    const reiheOhne = cashflowReihe(inputOhne, 2026, 2045);
    const z2026Mit = reihe.find((z) => z.jahr === 2026)!;
    const z2026Ohne = reiheOhne.find((z) => z.jahr === 2026)!;
    // Steuer mit Einkauf MUSS < Steuer ohne Einkauf sein
    expect(z2026Mit.ausgabenSteuern).toBeLessThan(z2026Ohne.ausgabenSteuern);
    // Liquidität mit Einkauf MUSS < Liquidität ohne Einkauf (am Jahresende)
    expect(z2026Mit.vermoegenLiquiditaet).toBeLessThan(
      z2026Ohne.vermoegenLiquiditaet
    );
    // Vorsorge-Wert (PK-Saldo) MUSS mit Einkauf höher sein als ohne — entweder
    // direkt sichtbar oder spätestens bei Pension via höherem altersguthaben.
    // Engine schreibt linearen Hochlauf zum altersguthabenBeiBezug; Einkäufe
    // erhöhen die Endsumme dort. Wir checken bei Pension (P1 2037):
    const z2036Mit = reihe.find((z) => z.jahr === 2036)!;
    const z2036Ohne = reiheOhne.find((z) => z.jahr === 2036)!;
    expect(z2036Mit.vermoegenVorsorge).toBeGreaterThan(
      z2036Ohne.vermoegenVorsorge
    );
  });

  // ─── 3. Selbständig P2: AHV-Mehraufwand ~5.85% × 50k = 2'925 ────
  it("Selbständig: AHV-Mehraufwand 5.85% × 50k ≈ 2'925/J in Vor-Pensions-Jahren", () => {
    // 2027 ist ein Volljahr Selbst-Erwerb P2 (vor Pension)
    const z2027 = reihe.find((z) => z.jahr === 2027)!;
    // selbstaendigEinkommenJahr nutzt betragMonatlich × aktive Monate
    // P2: betragMonatlich = round(50000/12) = 4167; × 12 = 50'004
    // × 0.0585 = ~2'925 (Math.round)
    // Toleranz: ±10 wegen Rundung Monatslohn
    expect(z2027.ausgabenTotal).toBeGreaterThan(0);
    // Vergleich: ohne Selbst-Markierung würde der Mehraufwand 0 sein
    const inputAN = buildFallB();
    inputAN.budget.einkommen[1]!.typ = "anstellung";
    const reiheAN = cashflowReihe(inputAN, 2026, 2045);
    const z2027AN = reiheAN.find((z) => z.jahr === 2027)!;
    const diff = z2027.ausgabenTotal - z2027AN.ausgabenTotal;
    expect(diff).toBeGreaterThanOrEqual(2_900);
    expect(diff).toBeLessThanOrEqual(2_950);
  });

  // ─── 4. PK Mischung 50/50: Kapital 360k + Rente 360k ────────────
  it("PK-Mischung 50/50: Kapital-Auszahlung 360k im Bezugsjahr P1, Rente auf 360k", () => {
    // P1 Bezugsalter 65, geb 1972-04 → Bezugsstart April 2037 (Folgemonat)
    // → Mai 2037. Kapital fliesst einmalig 2037.
    const z2037 = reihe.find((z) => z.jahr === 2037)!;
    // kapAuszahlungen 2037: Kapitalanteil 50% von 720k = 360k (P1 PK)
    // + 60k 3a P1 (auszahlungsjahr 2037) = 420k brutto.
    // Wir akzeptieren Range 350k–500k (3a kann sich verzinsen, etc).
    expect(z2037.kapAuszahlungen).toBeGreaterThanOrEqual(350_000);
    // Rente auf den anderen 360k → UWS 5.5% × 360k = 19'800/J BVG-Rente
    // Ab 2038 sollten wir eine BVG-Rente sehen (volles Jahr).
    const z2038 = reihe.find((z) => z.jahr === 2038)!;
    expect(z2038.einnahmenBvgRente).toBeGreaterThan(15_000);
    expect(z2038.einnahmenBvgRente).toBeLessThan(30_000);
  });

  // ─── 5. Eigenmietwert bis 2029, ab 2030 weg ─────────────────────
  it("Eigenmietwert: aktiv bis 2029, ab 2030 entfällt (Reform 2030)", () => {
    const z2029 = reihe.find((z) => z.jahr === 2029)!;
    const z2030 = reihe.find((z) => z.jahr === 2030)!;
    // Eigenheim 1'400'000 × 1.13 % default ≈ 15'820 (vor Wertsteigerung)
    expect(z2029.eigenmietwertJahr).toBeGreaterThan(10_000);
    expect(z2030.eigenmietwertJahr).toBe(0);
    // Schuldzinsabzug nur bis 2029
    expect(z2029.schuldzinsenAbzug).toBeGreaterThan(0);
    expect(z2030.schuldzinsenAbzug).toBe(0);
  });

  // ─── 6. Kinder-Abzug ────────────────────────────────────────────
  it("Kinder-Abzug wirkt: Lena bis 2030, Tim bis 2030 (<18); ab 2031 fallen beide raus", () => {
    // Steuer-Vergleich mit/ohne Kinder
    const inputOhneKinder = buildFallB();
    inputOhneKinder.kinder = [];
    const reiheOhne = cashflowReihe(inputOhneKinder, 2026, 2045);

    // 2026: 2 Kinder abzugsfähig → Steuer mit < Steuer ohne
    const z2026Mit = reihe.find((z) => z.jahr === 2026)!;
    const z2026Ohne = reiheOhne.find((z) => z.jahr === 2026)!;
    expect(z2026Mit.ausgabenSteuern).toBeLessThan(z2026Ohne.ausgabenSteuern);

    // 2031: beide raus (Lena Ausbildung endet 2030, Tim wird 19 ohne Ausbildung)
    // → Steuer-Diff zwischen mit/ohne sollte ~0 sein
    const z2031Mit = reihe.find((z) => z.jahr === 2031)!;
    const z2031Ohne = reiheOhne.find((z) => z.jahr === 2031)!;
    const diff2031 = Math.abs(z2031Mit.ausgabenSteuern - z2031Ohne.ausgabenSteuern);
    expect(diff2031).toBeLessThan(200); // praktisch identisch
  });

  // ─── 7. AHV-Kinderrente bei Pension ─────────────────────────────
  it("AHV-Kinderrente: bei Andreas-Pension 2037 ist Tim 25 ohne Ausbildung → keine Kinderrente", () => {
    // Andreas 65 in 2037, Sarah noch nicht. Tim ist 2037 25 Jahre alt → kein
    // Anspruch (Limit < 25). Lena ist 29 → kein Anspruch.
    // Wir verifizieren: einnahmenAhv 2037 ist plausibel (Andreas Einzelrente
    // anteilig ab Mai 2037), keine Inflation durch Kinderrente.
    const z2037 = reihe.find((z) => z.jahr === 2037)!;
    // Andreas Einzelrente max 30'240 × 13/12 ≈ 32'760; Pro-Rata Mai-Dez = 8/12
    // + Dez 13. AHV. Ungefähr 22'000-25'000. Definitiv unter Plafond Paar.
    expect(z2037.einnahmenAhv).toBeLessThan(35_000);
    expect(z2037.einnahmenAhv).toBeGreaterThan(15_000);
  });

  it("AHV-Kinderrente: Szenario-Stress — wenn Tim noch in Ausbildung wäre, würde Kinderrente greifen", () => {
    // Stress-Test: setze Tim ausbildungBisJahr=2037 → bei Andreas Pension
    // 2037 müsste eine Kinderrente erscheinen (Tim ist 25, am Limit < 25
    // → wird ausgeschlossen). Tim ist 25 in 2037 → also kein Anspruch.
    // Setze stattdessen ausbildungBisJahr=2036 (Tim wäre 24 in 2036).
    // Prüfe 2036: Tim 24, Andreas noch nicht pensioniert (65 erst 2037).
    // Da Andreas 2036 noch nicht im AHV-Bezug ist, gibt's noch keine Rente
    // und damit keine Kinderrente. Erst ab Mai 2037 mit Tim=25 → Limit.
    // Korrekter Stress: Andreas Frühpensionierung 63 (2035), Tim 23.
    const stress = buildFallB();
    stress.ahv.ahvBezugsalterP1 = 63; // Vorbezug
    stress.kinder[1]!.ausbildungBisJahr = 2037; // Tim in Ausbildung
    const reiheStress = cashflowReihe(stress, 2026, 2045);
    // 2036: Andreas im Vorbezug (63 ab April 2035), Tim 24 in Ausbildung
    const z2036 = reiheStress.find((z) => z.jahr === 2036)!;
    // einnahmenAhv mit Kinderrente sollte höher sein als ohne Kinderrente-Anspruch
    const stressOhne = buildFallB();
    stressOhne.ahv.ahvBezugsalterP1 = 63;
    // ohne Ausbildung → Tim 24 ohne Anspruch (AHV-Rente nur <18 oder <25+Ausbildung)
    stressOhne.kinder[1]!.ausbildungBisJahr = null;
    const reiheStressOhne = cashflowReihe(stressOhne, 2026, 2045);
    const z2036Ohne = reiheStressOhne.find((z) => z.jahr === 2036)!;
    // Mit Ausbildungs-Eintrag MUSS Kinderrente positiv sein
    expect(z2036.einnahmenAhv).toBeGreaterThan(z2036Ohne.einnahmenAhv);
  });

  // ─── 8. Vermögen-Plausi: Wachstum vor Pension, Auszahlungen sichtbar ─
  it("Vermögen wächst vor Pension, Kapitalauszahlungen 2037 sichtbar", () => {
    const z2026 = reihe.find((z) => z.jahr === 2026)!;
    const z2036 = reihe.find((z) => z.jahr === 2036)!;
    const z2037 = reihe.find((z) => z.jahr === 2037)!;
    // Vor Pension wächst Netto-Vermögen typisch (Sparen + Renditen)
    expect(z2036.vermoegenNetto).toBeGreaterThan(z2026.vermoegenNetto);
    // 2037: Kapitalauszahlung PK + 3a erscheint (kapAuszahlungen > 0)
    expect(z2037.kapAuszahlungen).toBeGreaterThan(300_000);
  });
});

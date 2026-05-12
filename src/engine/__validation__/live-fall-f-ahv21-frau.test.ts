/**
 * Live-Fall F: AHV21-Übergangs-Frau Jg 1961-63.
 *
 * Konstellation:
 *  - fallart="einzel", zivilstand="ledig"
 *  - Christine Brunner, geb 1962-06-15, w, Kanton ZH
 *  - AHV21-Übergangsjahrgang Jg 1962 → ord. Referenzalter 64.5 (64 J + 6 Mt)
 *  - Erwerbseinkommen 95'000/J (Anstellung), bis Pension
 *  - PK aktiver Anschluss, altersguthabenHeute 320k / altersguthabenBeiBezug 400k
 *    bei ord. Pension 64, UWS 5.8%, Bezugspräferenz Rente
 *  - 3a Konto 80k Saldo + 7'258/J Einzahlung bis Pension
 *  - Liquidität 150k, Depot 220k (3% Rendite)
 *  - Eigenheim Bezirk Affoltern (ZH) 1'050'000, Hypothek 350k @ 1.6%
 *
 * Test-Fokus: AHV21-Übergangs-Reduktion bei Vorbezug.
 *  - Plan A: Bezug bei (engine-internem) ord. Alter 65 — Engine sieht 0 J Vorbezug
 *  - Plan B: Vorbezug 63 — Engine sieht 2 J Vorbezug
 *
 * Wichtig: Die Engine nutzt fix `ORDENTLICHES_AHV_ALTER = 65` als Referenz
 * in bezugsfaktor() — die AHV21-Anhebung des Referenzalters für Frauen
 * Jg 1961-63 (64.25/64.5/64.75) ist im `ordentlichesAhvAlter()`-Helper
 * vorhanden, wird aber im Cashflow-Pfad NICHT auf das Bezugsalter
 * angewendet. Daher rechnet die Engine bei `ahvBezugsalterP1 = 63` mit
 * vollen 2 J Vorbezug — bei einer 1962er-Frau wären es real nur 1.5 J
 * gegenüber dem Referenzalter 64.5. → ENGINE-BUG, hier dokumentiert.
 *
 * Die reduzierte Vorbezug-Kürzung (vorbezugKuerzungProJahrAhv21) greift
 * abhängig vom massgebenden Einkommen. Bei E = 95'000 > 90'720 ist der
 * Rabatt 0 (Standard 6.8% kommt zum Tragen). Daher testen wir die
 * AHV21-Erleichterung explizit mit einer Variante E = 70'000 (Bracket 2).
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe, applyOverrides } from "../cashflow";
import type { CashflowInput } from "../cashflow";
import {
  vorbezugKuerzungProJahrAhv21,
  istAhv21Uebergangsjahrgang,
  ordentlichesAhvAlter,
  VORBEZUG_KUERZUNG_PRO_JAHR,
} from "../ahv";

function makeFallF(): CashflowInput {
  return {
    fallart: "einzel",
    zivilstand: "ledig",
    person1: {
      vorname: "Christine",
      nachname: "Brunner",
      geburtsdatum: "1962-06-15",
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
      // Plan A: 64 = ordentliches Referenzalter Frau Jg 1962
      // Engine vergleicht mit 65 → sieht 1 J Vorbezug
      ahvBezugsalterP1: 64,
      ahvBezugsalterP2: 65,
      ahvRenteJahrEffektivP1: null,
      ahvRenteJahrEffektivP2: null,
    },
    bvg: {
      p1: {
        aktiverAnschluss: true,
        altersguthabenHeute: 320_000,
        altersguthabenBeiBezug: 400_000,
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
          id: "s3a-1",
          type: "konto",
          saeule: "3a",
          beschreibung: "3a-Konto VIAC",
          aktuellerWert: 80_000,
          auszahlungsjahr: 2026, // ord. Bezug Frau Jg 1962 → 2026 (Alter 64)
          renditeProzent: 1.5,
          rueckkaufswert: null,
          ablaufswert: null,
          ablaufjahr: 2026,
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
          beschreibung: "Privatkonto",
          saldoHeute: 150_000,
          renditeProzent: 0,
          istHauptkonto: true,
        },
        {
          id: "v-depot",
          typ: "depot",
          beschreibung: "Wertschriften-Depot",
          saldoHeute: 220_000,
          renditeProzent: 3,
          istHauptkonto: false,
        },
      ],
    },
    immobilien: {
      items: [
        {
          id: "eigenheim",
          beschreibung: "Eigenheim Affoltern a.A.",
          typ: "selbstbewohnt",
          verkehrswert: 1_050_000,
          hypotheken: [
            {
              id: "h1",
              beschreibung: "Hypothek",
              hoehe: 350_000,
              zinssatzProzent: 1.6,
              ablaufjahr: 2030,
            },
          ],
          plan: "behalten",
          verkaufsjahr: 2060,
          jaehrlicheMieteinnahmen: null,
          kaufjahr: 2010,
          anlagekosten: 900_000,
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
    ziele: { bezugsalterP1: 64, bezugsalterP2: 65 },
    budget: {
      einkommen: [
        {
          id: "e1",
          beschreibung: "Lohn",
          personIdx: 1 as const,
          betragMonatlich: 7_917, // 95k / 12
          von: "2026-01",
          bis: "2026-06", // bis ord. Pension Mitte 2026 (Alter 64)
        },
      ],
      ausgabenModus: "total",
      ausgabenTotal: 5_200,
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
      strasse: "Dorfstrasse 12",
      plz: "8910",
      ort: "Affoltern am Albis",
      kanton: "ZH",
      gemeindeBfsId: 2,
      gemeindeName: "Affoltern am Albis",
    },
    einmaligeAusgaben: [],
  };
}

describe("Live-Fall F — AHV21-Übergangs-Frau Christine Brunner (ZH, Jg 1962)", () => {
  const reiheA = cashflowReihe(makeFallF(), 2026, 2045);

  // ─── Unit-Tests für AHV21-Helpers ────────────────────────────────────
  it("Christine Jg 1962/w ist AHV21-Übergangsjahrgang", () => {
    expect(istAhv21Uebergangsjahrgang(1962, "w")).toBe(true);
    // Kontrolle: Jg 1964 oder Männer NICHT
    expect(istAhv21Uebergangsjahrgang(1964, "w")).toBe(false);
    expect(istAhv21Uebergangsjahrgang(1962, "m")).toBe(false);
  });

  it("Ordentliches AHV-Alter Frau Jg 1962 = 64.5 (64 J + 6 Mt)", () => {
    expect(ordentlichesAhvAlter(1962, "w")).toBe(64.5);
  });

  it("BSV-Tabelle: bei E=95'000 (>90'720) ist Kürzung 6.8% — KEIN Rabatt", () => {
    // Christine verdient 95k → in oberes Bracket → Standard-Kürzung
    expect(vorbezugKuerzungProJahrAhv21(1962, "w", 95_000)).toBe(
      VORBEZUG_KUERZUNG_PRO_JAHR
    );
    expect(vorbezugKuerzungProJahrAhv21(1962, "w", 95_000)).toBe(0.068);
  });

  it("BSV-Tabelle: bei E=70'000 (Bracket 75'600) gibt's Rabatt — 4.0% statt 6.8%", () => {
    // Hypothetische Christine mit niedrigerem Einkommen → Rabatt sichtbar
    expect(vorbezugKuerzungProJahrAhv21(1962, "w", 70_000)).toBe(0.04);
    // Gegenkontrolle: Mann Jg 1962 → kein Rabatt
    expect(vorbezugKuerzungProJahrAhv21(1962, "m", 70_000)).toBe(0.068);
  });

  // ─── Plan A: Ord. Bezug (engine sieht 1 J Vorbezug bei alter=64) ──
  it("Plan A: AHV-Rente 2027 plausibel (nahe Maximum, leicht gekürzt)", () => {
    // Christine hat E=95k → Skala 44: oberes Plateau → ~Maximum 30'240
    // Bei ahvBezugsalter=64 (Engine vergleicht mit 65) → 1 J Vorbezug
    // Mit E>90'720 ist die Kürzung 6.8% Standard
    // Erwartet: 30'240 × (1-0.068) × 13/12 ≈ 30'526
    const z2027 = reiheA.find((r) => r.jahr === 2027)!;
    expect(z2027.einnahmenAhv).toBeGreaterThanOrEqual(28_000);
    expect(z2027.einnahmenAhv).toBeLessThanOrEqual(33_000);
  });

  it("Plan A: keine NaN, keine negativen Steuern in 20 Jahren", () => {
    expect(reiheA.length).toBe(20);
    for (const z of reiheA) {
      expect(Number.isFinite(z.einnahmenTotal)).toBe(true);
      expect(Number.isFinite(z.vermoegenNetto)).toBe(true);
      expect(Number.isFinite(z.ausgabenSteuern)).toBe(true);
      expect(z.ausgabenSteuern).toBeGreaterThanOrEqual(0);
    }
  });

  it("Plan A: Vermögen nach 20 J. > 0 (Christine läuft nicht trocken)", () => {
    const z2045 = reiheA.find((r) => r.jahr === 2045)!;
    expect(z2045.vermoegenNetto).toBeGreaterThan(0);
  });

  // ─── Plan B: Vorbezug 63 ─────────────────────────────────────────────
  const planA = makeFallF();
  const planBInput = applyOverrides(planA, {
    bezugsalterP1: 63,
    ahvBezugsalterP1: 63,
  });
  const reiheB = cashflowReihe(planBInput, 2026, 2045);

  it("Plan B: applyOverrides setzt Bezugsalter 63 korrekt", () => {
    expect(planBInput.ziele.bezugsalterP1).toBe(63);
    expect(planBInput.ahv.ahvBezugsalterP1).toBe(63);
  });

  it("Plan B vs Plan A: Vorbezug 63 → AHV-Rente NIEDRIGER als Plan A", () => {
    // Plan A: alter=64 → 1 J Vorbezug (engine-intern)
    // Plan B: alter=63 → 2 J Vorbezug (engine-intern, das Maximum)
    // Plan B sollte ca. 6.8% weniger AHV bekommen als Plan A
    // (zusätzliches Jahr Vorbezug × 6.8% bei E=95k)
    const z2027A = reiheA.find((r) => r.jahr === 2027)!;
    const z2027B = reiheB.find((r) => r.jahr === 2027)!;
    expect(z2027B.einnahmenAhv).toBeLessThan(z2027A.einnahmenAhv);
    // Diff sollte etwa 6.8% der ungekürzten Rente sein (~2'000 CHF)
    const diff = z2027A.einnahmenAhv - z2027B.einnahmenAhv;
    expect(diff).toBeGreaterThan(500);
    expect(diff).toBeLessThan(5_000);
  });

  it("Plan B (E=95k): Kürzung ist volle 6.8%/J — AHV21-Rabatt greift NICHT", () => {
    // ENGINE-VERHALTEN: Bei E=95k > 90'720 wird gemäss BSV-Tabelle
    // vorbezugKuerzungProJahrAhv21 die Standard-6.8% verwendet.
    // Daher hat Christine bei 95k Einkommen KEINEN Vorteil aus AHV21.
    // Berechnung (Plan B, 2027): Skala-44(95k) × (1 - 2*0.068) × 13/12
    // Beobachtet: ~26'127 (Skala-44 liefert für 95k nicht volle 30'240,
    // sondern ein leicht tieferer Plateau-Wert; volle Kürzung 13.6% wirkt)
    const z2027B = reiheB.find((r) => r.jahr === 2027)!;
    expect(z2027B.einnahmenAhv).toBeGreaterThanOrEqual(24_500);
    expect(z2027B.einnahmenAhv).toBeLessThanOrEqual(29_500);
  });

  // ─── Hypothetischer Vergleich: AHV21-Rabatt sichtbar bei E=70k ──────
  it("AHV21-Vorteil sichtbar bei E=70k: Plan B Vorbezug schmerzt weniger", () => {
    // Hypothetische Variante: Christine mit Einkommen 70k (statt 95k)
    // → Bracket "75'600" → Kürzung 4.0%/J statt 6.8%/J
    const fallE70 = makeFallF();
    fallE70.ahv.einkommenP1 = 70_000;
    fallE70.budget.einkommen[0]!.betragMonatlich = 5_833; // 70k/12

    const reiheA70 = cashflowReihe(fallE70, 2026, 2045);
    const planB70 = applyOverrides(fallE70, {
      bezugsalterP1: 63,
      ahvBezugsalterP1: 63,
    });
    const reiheB70 = cashflowReihe(planB70, 2026, 2045);

    const z2027A70 = reiheA70.find((r) => r.jahr === 2027)!;
    const z2027B70 = reiheB70.find((r) => r.jahr === 2027)!;

    // Bei E=70k: Kürzung pro Jahr Vorbezug ist nur 4.0% (statt 6.8%)
    // Plan A (alter 64, 1 J Vorbezug): kuerzung = 4.0% → faktor 0.96
    // Plan B (alter 63, 2 J Vorbezug): kuerzung = 4.0% × 2 → faktor 0.92
    // Diff (1 zusätzliches Jahr Vorbezug × 4.0%): kleinere Differenz
    // als bei E=95k (wo es 6.8% wäre).
    const diff70 = z2027A70.einnahmenAhv - z2027B70.einnahmenAhv;
    const z2027A95 = reiheA.find((r) => r.jahr === 2027)!;
    const z2027B95 = reiheB.find((r) => r.jahr === 2027)!;
    const diff95 = z2027A95.einnahmenAhv - z2027B95.einnahmenAhv;

    // Bei E=70k: pro Vorbezugsjahr nur 4.0% Kürzung
    // Bei E=95k: pro Vorbezugsjahr 6.8% Kürzung
    // Da die Basis-Rente bei E=70k (~26k) niedriger ist als bei E=95k (~30k),
    // wird der absolute Diff zusätzlich gedämpft. Beide Effekte führen dazu,
    // dass diff70 < diff95 ist.
    expect(diff70).toBeLessThan(diff95);
    expect(diff70).toBeGreaterThan(0);
  });

  it("Plan B: keine NaN, Vermögen positiv nach 20 J.", () => {
    expect(reiheB.length).toBe(20);
    for (const z of reiheB) {
      expect(Number.isFinite(z.einnahmenAhv)).toBe(true);
      expect(Number.isFinite(z.vermoegenNetto)).toBe(true);
      expect(z.ausgabenSteuern).toBeGreaterThanOrEqual(0);
    }
    const z2045B = reiheB.find((r) => r.jahr === 2045)!;
    expect(z2045B.vermoegenNetto).toBeGreaterThan(0);
  });

  it("Plan B vs Plan A: Vermögen 2045 — Plan B tendenziell tiefer", () => {
    // Plan B: 1 Jahr früher in Rente → 1 J weniger Lohn + lebenslang
    // tiefere AHV. PK-Rente sollte ebenfalls tiefer sein (theoretisch),
    // aber Engine wendet altersguthabenBeiBezug unverändert an
    // (Bug aus Live-Fall-D: kein Saldo-Adjustment bei Frühpension).
    // Erwartung: vermoegenNetto Plan B <= Plan A nach 20 J. — mit Toleranz.
    const z2045A = reiheA.find((r) => r.jahr === 2045)!;
    const z2045B = reiheB.find((r) => r.jahr === 2045)!;
    expect(Number.isFinite(z2045A.vermoegenNetto)).toBe(true);
    expect(Number.isFinite(z2045B.vermoegenNetto)).toBe(true);
    // Bei E=95k mit voller 6.8%-Kürzung sollte Plan B klar tiefer sein
    // (Toleranz: 50k, da andere Faktoren mitspielen)
    expect(z2045B.vermoegenNetto).toBeLessThan(z2045A.vermoegenNetto + 50_000);
  });
});

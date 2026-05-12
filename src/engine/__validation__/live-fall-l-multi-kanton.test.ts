/**
 * Live-Fall L: Multi-Kanton — Ehepaar Vogt mit geplanter Umzug ZH → ZG vor
 * Pensionierung.
 *
 * Konstellation:
 *  - P1 Markus Vogt, m, 1968, AN 180k, PK aktiv (AG-beiBezug 920k, UWS 5.6%,
 *    Mischung 50/50 → 460k Kapital + 460k Rentenkapital).
 *  - P2 Andrea Vogt, w, 1970, AN 80k, PK aktiv (AG-beiBezug 440k, UWS 5.8%,
 *    Mischung 50/50 → 220k Kapital + 220k Rentenkapital).
 *  - Verheiratet, Wohnsitz HEUTE Kanton ZH (Zürich Wollishofen).
 *  - Eigenheim ZH: Verkehrswert 1'400'000, Hypo 700k @ 1.5%, Kauf 2010,
 *    Anlagekosten 1'050'000. Plan = verkaufen 2032.
 *  - Umzug-Plan im Block O: 2032 nach ZG (Zug) — Verkauf ZH-Haus + neue
 *    Liegenschaft. Im Modell nicht abbildbar (siehe Engine-Limitation).
 *
 * Engine-Limitation, die dieser Test dokumentiert:
 *   `state.adresse.kanton` ist FIX über die gesamte Cashflow-Reihe. Auch
 *   `SzenarioBOverrides` enthält KEIN Feld zum Override des Kantons. Das
 *   Block-O-Feld `wohnortPlan.umzugStatus` ist reine UI-Erfassung — die
 *   Cashflow-Engine konsumiert es nicht.
 *
 * Was wir prüfen:
 *  1. Steuerlast 2026 mit kanton=ZH realistisch (~50–80k bei 260k Einkommen
 *     Paar + Eigenheim).
 *  2. GGSt-Trigger 2032: PK-Verkauf ZH-Haus löst Grundstückgewinnsteuer aus
 *     (kanton=ZH, Kanton des Liegenschafts-Standorts).
 *  3. Mit kanton=ZG simulieren wir die "nach-Umzug-Welt" durch direkten
 *     Override auf state.adresse — dokumentiert was passieren WÜRDE, wenn
 *     der Mandant sein Domizil bereits heute in ZG hätte. Vergleich ZH↔ZG.
 *  4. PK-Kapital-Auszahlung 2032 (Markus 64) + 2034 (Andrea 64): Sondertarif
 *     greift im Wohnsitz-Kanton des Bezugsjahres = WIRD AKTUELL IMMER ZH
 *     berechnet, weil Engine den Umzug nicht kennt — das ist der Kern-Bug
 *     für Multi-Kanton-Plan.
 *  5. SzenarioBOverrides kann den Kanton NICHT überschreiben — dokumentiert.
 *  6. Plausi: keine NaN, keine negativen Steuern über Reihe 2026–2040.
 *
 * WICHTIG: Dieser Test ändert keinen Engine-Code. Wo eine Limitation
 * besteht, wird sie als TODO/Bug-Notiz im Test festgehalten.
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe, applyOverrides } from "../cashflow";
import type { CashflowInput } from "../cashflow";

function makeFallL(): CashflowInput {
  return {
    fallart: "paar",
    zivilstand: "verheiratet",
    person1: {
      vorname: "Markus",
      nachname: "Vogt",
      geburtsdatum: "1968-03-15",
      geschlecht: "m",
      telefon: "",
      email: "",
    },
    person2: {
      vorname: "Andrea",
      nachname: "Vogt",
      geburtsdatum: "1970-07-22",
      geschlecht: "w",
      telefon: "",
      email: "",
    },
    kinder: [],
    ahv: {
      einkommenP1: 180_000,
      einkommenP2: 80_000,
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
        altersguthabenHeute: 700_000,
        altersguthabenBeiBezug: 920_000,
        umwandlungssatzProzent: 5.6,
        bezugspraeferenz: "mischung",
        kapitalanteil: 50, // → 460k Kapital + 460k Rentenkapital
        freizuegigkeit: [],
        einkaeufe: [],
        wefVorbezuege: [],
      },
      p2: {
        aktiverAnschluss: true,
        altersguthabenHeute: 320_000,
        altersguthabenBeiBezug: 440_000,
        umwandlungssatzProzent: 5.8,
        bezugspraeferenz: "mischung",
        kapitalanteil: 50, // → 220k Kapital + 220k Rentenkapital
        freizuegigkeit: [],
        einkaeufe: [],
        wefVorbezuege: [],
      },
    },
    saeuleDrei: { p1: [], p2: [] },
    vermoegen: {
      items: [
        {
          id: "v1",
          typ: "konto",
          beschreibung: "Privatkonto",
          saldoHeute: 150_000,
          renditeProzent: 0,
          istHauptkonto: true,
        },
        {
          id: "v2",
          typ: "depot",
          beschreibung: "Wertschriften-Depot",
          saldoHeute: 250_000,
          renditeProzent: 3,
          istHauptkonto: false,
        },
      ],
    },
    immobilien: {
      items: [
        {
          id: "eigenheim-zh",
          beschreibung: "Eigenheim Wollishofen",
          typ: "selbstbewohnt",
          verkehrswert: 1_400_000,
          hypotheken: [
            {
              id: "h1",
              beschreibung: "Festhypo 10 J.",
              hoehe: 700_000,
              zinssatzProzent: 1.5,
              ablaufjahr: 2034,
            },
          ],
          plan: "verkaufen",
          verkaufsjahr: 2032,
          jaehrlicheMieteinnahmen: null,
          kaufjahr: 2010,
          anlagekosten: 1_050_000,
          wertvermehrendeInvestitionen: null,
          wertsteigerungProzent: 1.5,
          // Adresse der Liegenschaft = ZH (am Wohnsitz, daher kein adresse-Override).
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
    ziele: { bezugsalterP1: 64, bezugsalterP2: 64 },
    budget: {
      einkommen: [
        {
          id: "e1",
          beschreibung: "Lohn Markus",
          personIdx: 1 as const,
          betragMonatlich: 15_000, // 180k/J
          von: "2026-01",
          bis: "2032-03", // Pension Markus 64 (geb. 1968-03 → erreicht 64 am 2032-03)
        },
        {
          id: "e2",
          beschreibung: "Lohn Andrea",
          personIdx: 2 as const,
          betragMonatlich: 6_667, // 80k/J
          von: "2026-01",
          bis: "2034-07", // Pension Andrea 64 (geb. 1970-07 → erreicht 64 am 2034-07)
        },
      ],
      ausgabenModus: "total",
      ausgabenTotal: 9_000,
      ausgabenKategorien: {
        lebenshaltung: null,
        wohnen: null,
        mobilitaet: null,
        versicherungen: null,
        ferienHobby: null,
        sonstiges: null,
      },
      wunschverbrauchPension: 8_500,
      steuernHeute: null,
      einkommenHeute: null,
      religion: "keine",
      alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
    },
    adresse: {
      strasse: "Seestrasse 1",
      plz: "8038",
      ort: "Zürich",
      kanton: "ZH",
      gemeindeBfsId: 261, // Stadt Zürich
      gemeindeName: "Zürich",
    },
    einmaligeAusgaben: [],
  };
}

describe("Live-Fall L — Multi-Kanton ZH→ZG (Ehepaar Vogt)", () => {
  const planA = makeFallL();
  const reiheA = cashflowReihe(planA, 2026, 2040);

  it("2026 ZH: Steuerlast realistisch bei 260k Einkommen Paar + Eigenheim", () => {
    const z = reiheA.find((r) => r.jahr === 2026)!;
    // Erwartung Grobcheck: Einkommens-Steuer ZH (Stadt Zürich) bei 260k
    // Brutto Paar + Eigenmietwert ≈ Steuerbar 230–270k → Steuerlast Einkommen
    // 35–65k. Plus Vermögenssteuer ≈ 1–5k. Total 40–80k.
    expect(z.ausgabenSteuern).toBeGreaterThan(30_000);
    expect(z.ausgabenSteuern).toBeLessThan(95_000);
    expect(z.ausgabenSteuernEinkommen).toBeGreaterThan(20_000);
    expect(z.ausgabenSteuernEinkommen).toBeLessThan(90_000);
    expect(z.ausgabenSteuernVermoegen).toBeGreaterThanOrEqual(0);
  });

  it("2032 ZH: Verkauf Eigenheim triggert Grundstückgewinnsteuer", () => {
    const z2032 = reiheA.find((r) => r.jahr === 2032)!;
    // Im Verkaufsjahr 2032 fliesst der Netto-Erlös als Kapital-Auszahlung
    // ein. Netto = Verkehrswert (gewachsen mit 1.5%/J seit 2026)
    // − Hypothek 700k − GGSt (ZH-Tarif, 22 J. Besitzdauer → Langhalter-Rabatt).
    expect(z2032.kapAuszahlungen).toBeGreaterThan(0);
    // Plausi: Brutto-Erlös ≈ 1.4M × 1.015^(2032-2026) ≈ 1.53M, − 700k Hypo
    // = ~830k. Reingewinn ≈ 1.53M − 1.05M Anlagekosten = ~480k. ZH-GGSt mit
    // 22 J. Besitzdauer (→ Rabatt) ergibt ca. 80–150k GGSt → Netto ≈ 680–750k.
    expect(z2032.kapAuszahlungen).toBeGreaterThan(500_000);
    expect(z2032.kapAuszahlungen).toBeLessThan(1_700_000);
  });

  it("2032: Vermögen Immobilien fällt nach Verkauf auf 0 (Plan=verkaufen)", () => {
    const z2031 = reiheA.find((r) => r.jahr === 2031)!;
    const z2032 = reiheA.find((r) => r.jahr === 2032)!;
    expect(z2031.vermoegenImmobilien).toBeGreaterThan(1_400_000);
    // Ab Verkaufsjahr (>=) wird Immo nicht mehr im Vermögens-Aktiva geführt
    expect(z2032.vermoegenImmobilien).toBe(0);
    // Schulden ebenfalls weg (Hypo abgelöst)
    expect(z2032.vermoegenSchulden).toBeLessThan(z2031.vermoegenSchulden);
  });

  it("Variante ZG (Wohnsitz-Override): tiefere Einkommenssteuer als ZH", () => {
    // Engine-Limitation-Workaround: Wir override state.adresse.kanton direkt
    // auf "ZG", um die "Welt nach Umzug" zu simulieren. ACHTUNG: Das tut so,
    // als wäre Familie Vogt bereits HEUTE in ZG ansässig — nicht erst ab 2032.
    // Eine echte Multi-Kanton-Modellierung müsste den Wechseljahr-Stichtag
    // kennen (state.wohnortPlan.umzugStatus wird von der Engine ignoriert).
    const planZg = makeFallL();
    planZg.adresse = {
      strasse: "Bahnhofstrasse 1",
      plz: "6300",
      ort: "Zug",
      kanton: "ZG",
      gemeindeBfsId: 1711, // Stadt Zug
      gemeindeName: "Zug",
    };
    const reiheZg = cashflowReihe(planZg, 2026, 2040);
    const z2026Zh = reiheA.find((r) => r.jahr === 2026)!;
    const z2026Zg = reiheZg.find((r) => r.jahr === 2026)!;
    // ZG ist eines der steuergünstigsten Kantone → Kantons-Anteil deutlich
    // tiefer. Bund bleibt gleich, daher Gesamt-Steuer in ZG < ZH.
    expect(z2026Zg.ausgabenSteuern).toBeLessThan(z2026Zh.ausgabenSteuern);
    // Bund-Anteil sollte gleich bleiben (DBG ist kantonsunabhängig)
    expect(z2026Zg.ausgabenSteuernEinkommenBund).toBeCloseTo(
      z2026Zh.ausgabenSteuernEinkommenBund,
      -2 // Toleranz 100 CHF
    );
    // Kanton-Anteil ZG < ZH
    expect(z2026Zg.ausgabenSteuernEinkommenKanton).toBeLessThan(
      z2026Zh.ausgabenSteuernEinkommenKanton
    );
  });

  it("PK-Kapital 2032 (Markus 64) wird IMMER im Wohnsitz-Kanton=ZH besteuert (Limitation)", () => {
    // Markus geb. 1968-03 → 64 erreicht am 2032-03 → PK-Bezug Mischung
    // löst 460k Kapital aus im Bezugsjahr 2032. Sondertarif greift am
    // Wohnsitz im Bezugsjahr.
    const z2032 = reiheA.find((r) => r.jahr === 2032)!;
    expect(z2032.kapAuszahlungen).toBeGreaterThan(460_000); // PK 460k + Immo-Erlös
    expect(z2032.ausgabenSteuernKapital).toBeGreaterThan(0);
    // BUG/LIMITATION: Selbst wenn der Mandant in 2032 nach ZG umzieht, würde
    // die Engine den PK-Bezug am ZH-Sondertarif rechnen — weil
    // state.adresse.kanton fix ist. ZG-Kapitalsteuer ist deutlich tiefer
    // (Tarif ZG ~5–7% effektiv vs ZH ~10–14%). Differenz bei 460k Bezug:
    // ca. 15–30k Steuer-Ersparnis bei tatsächlichem Wohnsitz ZG.
    // Test stellt nur sicher: Kapital-Steuer > 0 und plausibel <30% des Bezugs.
    expect(z2032.ausgabenSteuernKapital).toBeLessThan(
      z2032.kapAuszahlungen * 0.3
    );
  });

  it("Variante ZG: PK-Kapital-Sondertarif 2032 wäre tiefer als in ZH", () => {
    // Workaround-Vergleich: ZG-Variante (Wohnsitz schon heute ZG) zeigt
    // den Steuer-Vorteil, der dem Mandanten bei korrektem Umzug-Timing
    // entginge. Beispiel-Vergleich: Kapital-Steuer ZG < Kapital-Steuer ZH.
    const planZg = makeFallL();
    planZg.adresse = {
      strasse: "Bahnhofstrasse 1",
      plz: "6300",
      ort: "Zug",
      kanton: "ZG",
      gemeindeBfsId: 1711,
      gemeindeName: "Zug",
    };
    // Wichtig: Immobilie liegt physisch in ZH — GGSt-Kanton bleibt ZH
    // (Liegenschafts-Kanton, nicht Wohnsitz). Aber Sondertarif PK greift
    // am Wohnsitz im Bezugsjahr.
    const reiheZg = cashflowReihe(planZg, 2026, 2040);
    const z2032Zh = reiheA.find((r) => r.jahr === 2032)!;
    const z2032Zg = reiheZg.find((r) => r.jahr === 2032)!;
    // Sondertarif PK-Kapital in ZG < ZH erwartet.
    expect(z2032Zg.ausgabenSteuernKapital).toBeLessThan(
      z2032Zh.ausgabenSteuernKapital
    );
    // Bund-Anteil (1/5 DBG-Tarif): erwartet ähnlich, aber kann minimal
    // abweichen wenn DBG-Sondertarif progressiv über kombinierte Bezüge
    // wirkt und kantonale Hilfsgrössen einfliessen. Toleranz ±5%.
    const bundZh = z2032Zh.ausgabenSteuernKapitalBund;
    const bundZg = z2032Zg.ausgabenSteuernKapitalBund;
    expect(Math.abs(bundZg - bundZh) / Math.max(bundZh, 1)).toBeLessThan(
      0.05
    );
  });

  it("LIMITATION: SzenarioBOverrides kennt KEIN kanton-Feld", () => {
    // Beweisführung: applyOverrides ignoriert jeden Versuch, einen Kanton-
    // Override zu setzen, weil das Feld in der Typ-Definition fehlt.
    const planB = applyOverrides(planA, {
      bezugsalterP1: 65, // legitimer Override
      // Ein hypothetisches `adresseKantonOverride: "ZG"` würde im
      // TypeScript-Compile bereits scheitern. Daher hier nur Stamm-Override.
    });
    // adresse bleibt unverändert in der overridden Variant
    expect(planB.adresse.kanton).toBe("ZH");
    // Workaround dokumentiert: User muss adresse direkt mutieren bzw. zwei
    // komplette Plan-Varianten in Block A/B/C anlegen.
  });

  it("LIMITATION: wohnortPlan.umzugStatus wird von Cashflow-Engine ignoriert", () => {
    // Block O hat zwar UI-Felder umzugStatus + umzugZiel, aber kein Engine-
    // Modul liest sie. Suche `wohnortPlan` in src/engine/ → nur in
    // schema-coverage.test.ts und stress-tests.test.ts (Default-Fixtures),
    // nie als Input. Daher: ein in der UI gesetzter "Umzug 2032 → ZG" hat
    // KEINE Auswirkung auf Cashflow-, Steuer- oder GGSt-Berechnung.
    //
    // Folge: Live-Fall L ist mit dem heutigen Engine-Stand nur als zwei
    // separate Plan-Varianten korrekt darstellbar (Plan A = ZH durchgehend,
    // Plan B = ZG durchgehend). Ein gemischter Zeit-Verlauf braucht eine
    // Engine-Erweiterung (z.B. `kantonVerlauf: { ab: 2032, kanton: "ZG" }`).
    //
    // Dieser Test dient als ausführbarer Marker für die Limitation.
    expect(true).toBe(true);
  });

  it("Plan A 2026–2040: keine NaN, keine negativen Steuern", () => {
    expect(reiheA.length).toBe(15);
    for (const z of reiheA) {
      expect(Number.isFinite(z.einnahmenTotal)).toBe(true);
      expect(Number.isFinite(z.ausgabenTotal)).toBe(true);
      expect(Number.isFinite(z.vermoegenNetto)).toBe(true);
      expect(z.ausgabenSteuern).toBeGreaterThanOrEqual(0);
      expect(z.ausgabenSteuernKapital).toBeGreaterThanOrEqual(0);
    }
  });
});

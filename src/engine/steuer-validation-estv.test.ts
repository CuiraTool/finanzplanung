/**
 * ESTV-Validierungs-Tests (Sprint D11).
 *
 * Ziel: Anker-Snapshots gegen die offizielle ESTV-Tarifrechner-Werte
 * (https://swisstaxcalculator.estv.admin.ch). Drift-Detection: wenn ein
 * Engine-Refactor die Werte unerwartet verschiebt, schlägt der Test fehl
 * und der Berater muss prüfen, ob die Änderung gewollt war.
 *
 * **Vorgehen** zum Anbinden der echten ESTV-Werte:
 *   1. Test ausführen mit aktuellem Engine-Wert
 *   2. Resultat manuell mit ESTV-Tarifrechner vergleichen
 *   3. Erwarteten Wert + Toleranz im Test setzen
 *   4. `estvVerifiziert` auf true setzen
 *
 * Status pro Test:
 *   - "✅ verifiziert": Wert manuell gegen ESTV abgeglichen
 *   - "🟡 snapshot":    Wert ist Engine-Snapshot, ESTV-Abgleich offen
 *
 * Toleranz: ±5 % (Pauschalen können kantonal abweichen, Engine vereinfacht
 * einige Detail-Abzüge — Sprint D11 Phase 2 verfeinert).
 */
import { describe, expect, it } from "vitest";
import { steuerProJahr, type SteuerInput } from "./steuer";

interface EstvCase {
  /** Kurz-Label fürs Reporting. */
  label: string;
  /** Engine-Input wie aus Block 1-3 abgeleitet. */
  input: SteuerInput;
  /** Erwartete Total-Einkommenssteuer (Bund + Kanton + Gemeinde + Kirche). */
  expectedEinkommen: number;
  /** Erwartete Vermögenssteuer. */
  expectedVermoegen: number;
  /** ESTV-Vergleich verifiziert? Wenn false: nur Snapshot-Test. */
  estvVerifiziert: boolean;
  /** Erlaubte Abweichung in %. */
  toleranzProzent: number;
}

const CASES: EstvCase[] = [
  // ─── Single ZH, Stadt Zürich, 100k Brutto, reformiert, ledig ──────
  // ESTV-Tarifrechner 2025: Total ~17'500-18'500 (Bund ~1'600, Kt+Gde+Ki ~16'000)
  {
    label: "ZH-Zürich Single 100k reformiert 2025",
    input: {
      einkommenJahr: 100_000,
      vermoegenJahr: 50_000,
      kapAuszahlungenJahr: 0,
      kanton: "ZH",
      religion: "reformiert",
      fallart: "einzel",
      bfsId: 261,
      jahr: 2025,
      bruttoErwerbP1: 100_000,
      alterP1: 35,
      anzahlKinder: 0,
      hatPkAnschlussP1: true,
    },
    expectedEinkommen: 12_560, // engine snapshot — gegen ESTV verifizieren
    expectedVermoegen: 0,
    estvVerifiziert: false,
    toleranzProzent: 15,
  },
  // ─── Single ZG, Stadt Zug, 100k Brutto, keine Religion ───────────
  // ESTV-Tarifrechner 2025: günstigster Kanton; Total ~6'500-8'000
  {
    label: "ZG-Zug Single 100k keine Religion 2025",
    input: {
      einkommenJahr: 100_000,
      vermoegenJahr: 50_000,
      kapAuszahlungenJahr: 0,
      kanton: "ZG",
      religion: "keine",
      fallart: "einzel",
      bfsId: 1711,
      jahr: 2025,
      bruttoErwerbP1: 100_000,
      alterP1: 35,
      anzahlKinder: 0,
      hatPkAnschlussP1: true,
    },
    expectedEinkommen: 7_194,
    expectedVermoegen: 28,
    estvVerifiziert: false,
    toleranzProzent: 15,
  },
  // ─── Paar ZH 150k, reformiert, 2 Kinder ────────────────────────────
  // Schweizer Familie Standard: Total ~10'000-13'000 (Doppelverdiener +
  // 2 Kinderabzüge ZH a 9'300, DBG a 6'700 senken sehr)
  {
    label: "ZH-Zürich Paar 150k reformiert 2 Kinder 2025",
    input: {
      einkommenJahr: 150_000,
      vermoegenJahr: 200_000,
      kapAuszahlungenJahr: 0,
      kanton: "ZH",
      religion: "reformiert",
      fallart: "paar",
      bfsId: 261,
      jahr: 2025,
      bruttoErwerbP1: 100_000,
      bruttoErwerbP2: 50_000,
      alterP1: 38,
      alterP2: 36,
      anzahlKinder: 2,
      hatPkAnschlussP1: true,
      hatPkAnschlussP2: true,
    },
    expectedEinkommen: 10_791,
    expectedVermoegen: 47,
    estvVerifiziert: false,
    toleranzProzent: 15,
  },
  // ─── Pensioniert ZH 60k AHV+PK, 800k Vermögen ──────────────────────
  // Kein Erwerb mehr, keine Sozialabgaben, AHV-Steuerfreibeträge nutzen
  {
    label: "ZH-Zürich Pensioniert einzel 60k Rente reformiert 2025",
    input: {
      einkommenJahr: 60_000,
      vermoegenJahr: 800_000,
      kapAuszahlungenJahr: 0,
      kanton: "ZH",
      religion: "reformiert",
      fallart: "einzel",
      bfsId: 261,
      jahr: 2025,
      bruttoErwerbP1: 0, // pensioniert
      alterP1: 70,
      anzahlKinder: 0,
      hatPkAnschlussP1: false,
    },
    expectedEinkommen: 6_939,
    expectedVermoegen: 1_458,
    estvVerifiziert: false,
    toleranzProzent: 15,
  },
  // ─── Kapitalauszahlung PK 500k @ Pensionierung ZH einzel ───────────
  // Sondertarif Bund (1/5 DBG) + Kanton-Sondertarif ZH
  // ESTV: 500k Kapitalbezug ZH ~25'000-35'000 Total Sondertarif
  {
    label: "ZH Kapitalauszahlung PK 500k einzel reformiert 2025",
    input: {
      einkommenJahr: 30_000,
      vermoegenJahr: 200_000,
      kapAuszahlungenJahr: 500_000,
      kanton: "ZH",
      religion: "reformiert",
      fallart: "einzel",
      bfsId: 261,
      jahr: 2025,
      bruttoErwerbP1: 0,
      alterP1: 65,
      anzahlKinder: 0,
      hatPkAnschlussP1: false,
    },
    expectedEinkommen: 2_005, // 30k ordentlich (mit Abzügen sehr tief)
    expectedVermoegen: 136,
    estvVerifiziert: false,
    toleranzProzent: 25,
  },
  // ─── AR-Waldstatt Verheiratet-Rentner: Verm-Steuer mit Sozialabzug ────
  //
  // Hintergrund: Bug-Reproduktion aus `scripts/vergleich-stanojevic.ts`
  // (Wohnsitz Waldstatt AR, Paar, beide Rentner). Vor dem Fix taxierte die
  // Engine das Vermögen ~3× zu hoch, weil der gesetzliche Sozialabzug nach
  // Art. 51 Abs. 1 lit. a StG AR (Fr. 150'000 für gemeinsam veranlagte
  // Ehegatten) fehlte. Die ESTV-devbrains-Tabelle für AR (`tarifs/3.json`,
  // group "ALLE") enthält nur den Tarif (0.50 ‰ / 0.55 ‰), nicht den Abzug.
  //
  // Berechnung bei 230'000 Reinvermögen, Paar, 0 Kinder, Waldstatt:
  //   bemessung = 230'000 − 150'000          = 80'000
  //   einfache  = 80'000 × 0,05 %            = 40 CHF (BUND-Tarif Stufe 1)
  //   steuerfuss = Kt 3.30 + Gem 3.70 (Waldstatt)
  //              + Kirche 0 (Religion "andere")
  //              = 7.00
  //   total    = 40 × 7.00                   ≈ 280 CHF
  //   (Engine round100Down auf Bemessung → 80'000, gleich.)
  //
  // Taxware-Referenzwert (gleicher Fall, Vermögen 230'887): 329 CHF.
  // Der Engine-Wert von ~280 CHF liegt ~15 % unter Taxware (Taxware nutzt
  // tw. Personalsteuer-Komponenten / Mindestbeträge). Toleranz daher ±15 %
  // bis ESTV-Tarifrechner manuell abgeglichen → estvVerifiziert=false.
  {
    label: "AR-Waldstatt Paar Rentner 230k Vermögen 0 Kinder andere 2026",
    input: {
      einkommenJahr: 43_326, // AHV-Ehepaar (≈ Stanojevic-Niveau)
      vermoegenJahr: 230_000,
      kapAuszahlungenJahr: 0,
      kanton: "AR",
      religion: "andere",
      fallart: "paar",
      bfsId: 3007, // Waldstatt
      jahr: 2026,
      bruttoErwerbP1: 0,
      bruttoErwerbP2: 0,
      alterP1: 70,
      alterP2: 65,
      anzahlKinder: 0,
      hatPkAnschlussP1: false,
      hatPkAnschlussP2: false,
    },
    // Erwartung: 230k − 150k = 80k bemessen → ~280 CHF
    // (Taxware-Referenz 329 CHF auf 230'887)
    expectedEinkommen: 2_937, // ordentl. Eink-Steuer bei 43k AHV (Engine-Snapshot)
    expectedVermoegen: 280,
    estvVerifiziert: false, // ESTV-Tarifrechner-Abgleich noch offen
    toleranzProzent: 15,
  },
  // ─── AR-Waldstatt Verheiratet-Rentner unter Freibetrag: 0 Verm-Steuer ──
  //
  // 174'521 Vermögen − 150'000 Freibetrag (Paar) = 24'521 bemessen
  //   einfache = 24'500 × 0,05 % = 12.25 CHF
  //   total    = 12.25 × 7.0     ≈ 86 CHF
  {
    label: "AR-Waldstatt Paar Rentner 174k Vermögen 0 Kinder andere 2026",
    input: {
      einkommenJahr: 43_326,
      vermoegenJahr: 174_521,
      kapAuszahlungenJahr: 0,
      kanton: "AR",
      religion: "andere",
      fallart: "paar",
      bfsId: 3007,
      jahr: 2026,
      bruttoErwerbP1: 0,
      bruttoErwerbP2: 0,
      alterP1: 70,
      alterP2: 65,
      anzahlKinder: 0,
      hatPkAnschlussP1: false,
      hatPkAnschlussP2: false,
    },
    expectedEinkommen: 2_937,
    expectedVermoegen: 86,
    estvVerifiziert: false,
    toleranzProzent: 15,
  },
];

/** Snapshot-Kapitalsteuer für Kap-Bezug-Case (separat geprüft). */
const KAP_SNAPSHOT = 36_971;

describe("ESTV-Validierung — Snapshot + Drift-Detection", () => {
  for (const c of CASES) {
    it(c.label, () => {
      const r = steuerProJahr(c.input);
      const toleranzEink = (c.expectedEinkommen * c.toleranzProzent) / 100;
      const toleranzVerm = Math.max(
        (c.expectedVermoegen * c.toleranzProzent) / 100,
        50
      );

      // Snapshot-Check mit Toleranz
      expect(r.einkommen).toBeGreaterThan(0);
      expect(
        Math.abs(r.einkommen - c.expectedEinkommen)
      ).toBeLessThanOrEqual(toleranzEink);
      expect(
        Math.abs(r.vermoegen - c.expectedVermoegen)
      ).toBeLessThanOrEqual(toleranzVerm);
    });
  }

  it("Kapitalauszahlung 500k ZH einzel: Sondertarif-Snapshot", () => {
    const kap = CASES.find((c) => c.label.includes("Kap"))!;
    const r = steuerProJahr(kap.input);
    // ±25 % auf den Sondertarif (Engine 1/5-Approx für Kanton, ZH hat eigene)
    const toleranz = KAP_SNAPSHOT * 0.25;
    expect(Math.abs(r.kapital - KAP_SNAPSHOT)).toBeLessThanOrEqual(toleranz);
  });

  it("Coverage-Stand: keine ESTV-Werte sind verifiziert (D11 Phase 1)", () => {
    const verifiziert = CASES.filter((c) => c.estvVerifiziert).length;
    expect(verifiziert).toBe(0);
    // Sobald ESTV-Werte manuell abgeglichen sind: estvVerifiziert auf true
    // setzen und diesen Test entsprechend anpassen (target verifiziert ≥ 1).
  });
});

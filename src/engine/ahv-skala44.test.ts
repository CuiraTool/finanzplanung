import { describe, it, expect } from "vitest";
import { vollrenteEinzelSkala44 } from "./ahv";
import skala44Daten from "./ahv-data/skala44-2025.json";

/**
 * Validierungs-Test für die BSV-Skala-44-Tabelle (Stand 1.1.2025).
 *
 * Quelle: BSV Vollzug Dokument 6462 (sozialversicherungen.admin.ch).
 *   "Rentenskala 44 — Monatliche Vollrenten der AHV/IV, gültig ab 1.1.2025"
 *
 * Methodik:
 *   - 12 Stütz-Einkommen über die ganze Skala (0 / Min / Stufen / Max / >Max)
 *   - Erwartung = Stufenwert aus JSON × 12 (= offizielle BSV-Monatsrente × 12)
 *   - Toleranz: ±50 CHF/Jahr für Rundungen an Stufengrenzen
 *
 * Ziel: garantieren, dass `vollrenteEinzelSkala44()` an jeder Stufe das
 * gleiche Ergebnis liefert wie die offizielle BSV-Tabelle.
 */

const TOLERANZ = 50; // CHF/Jahr

interface BsvStufe {
  einkommen: number;
  erwarteteJahresrente: number;
  label: string;
}

// Ausgewählte Stützstellen aus skala44-2025.json (Quelle BSV-Tabelle Stand 2025)
const STUETZSTELLEN: BsvStufe[] = [
  { einkommen: 0, erwarteteJahresrente: 15_120, label: "0 / unter Min → Minimum" },
  { einkommen: 15_120, erwarteteJahresrente: 15_120, label: "Untere Grenze (1'260 × 12)" },
  { einkommen: 22_680, erwarteteJahresrente: 17_088, label: "1.5× Min (1'424 × 12)" },
  { einkommen: 30_240, erwarteteJahresrente: 19_056, label: "2× Min (1'588 × 12)" },
  { einkommen: 45_360, erwarteteJahresrente: 22_980, label: "3× Min — Plafond Ehepaar (1'915 × 12)" },
  { einkommen: 60_480, erwarteteJahresrente: 25_404, label: "4× Min — typ. Mittelstand (2'117 × 12)" },
  { einkommen: 66_528, erwarteteJahresrente: 26_364, label: "Mittlerer Bereich (2'197 × 12)" },
  { einkommen: 75_600, erwarteteJahresrente: 27_816, label: "5× Min (2'318 × 12)" },
  { einkommen: 81_648, erwarteteJahresrente: 28_788, label: "Knapp unter Max (2'399 × 12)" },
  { einkommen: 90_720, erwarteteJahresrente: 30_240, label: "Obere Grenze / Maximum (2'520 × 12)" },
  { einkommen: 120_000, erwarteteJahresrente: 30_240, label: "Über Max → Plafond" },
  { einkommen: 500_000, erwarteteJahresrente: 30_240, label: "Top-Income → Plafond" },
];

describe("AHV — Skala 44 Validierung gegen BSV-Faktenblatt 2025", () => {
  it.each(STUETZSTELLEN)(
    "Einkommen $einkommen → ~CHF $erwarteteJahresrente/J ($label)",
    ({ einkommen, erwarteteJahresrente }) => {
      const rente = vollrenteEinzelSkala44(einkommen);
      expect(Math.abs(rente - erwarteteJahresrente)).toBeLessThanOrEqual(TOLERANZ);
    }
  );

  it("Stütz-Set hat ≥ 10 Punkte über den ganzen Einkommens-Bereich", () => {
    expect(STUETZSTELLEN.length).toBeGreaterThanOrEqual(10);
    const minIn = Math.min(...STUETZSTELLEN.map((s) => s.einkommen));
    const maxIn = Math.max(...STUETZSTELLEN.map((s) => s.einkommen));
    expect(minIn).toBe(0);
    expect(maxIn).toBeGreaterThanOrEqual(90_720);
  });
});

describe("AHV — Skala 44 Tabellen-Integrität", () => {
  it("JSON enthält 51 Stufen (BSV-Standard 2025)", () => {
    expect(skala44Daten.stufen.length).toBe(51);
  });

  it("Erste Stufe = Min-Einkommen, letzte Stufe = Max-Einkommen", () => {
    const stufen = skala44Daten.stufen as [number, number][];
    expect(stufen[0]![0]).toBe(skala44Daten.minEinkommen);
    expect(stufen[stufen.length - 1]![0]).toBe(skala44Daten.maxEinkommen);
  });

  it("Min-Monatsrente × 12 = minRenteJahr (CHF 15'120)", () => {
    const stufen = skala44Daten.stufen as [number, number][];
    expect(stufen[0]![1] * 12).toBe(skala44Daten.minRenteJahr);
  });

  it("Max-Monatsrente × 12 = maxRenteJahr (CHF 30'240)", () => {
    const stufen = skala44Daten.stufen as [number, number][];
    expect(stufen[stufen.length - 1]![1] * 12).toBe(skala44Daten.maxRenteJahr);
  });

  it("Stufen sind monoton steigend (Einkommen + Rente)", () => {
    const stufen = skala44Daten.stufen as [number, number][];
    for (let i = 1; i < stufen.length; i++) {
      expect(stufen[i]![0]).toBeGreaterThan(stufen[i - 1]![0]);
      expect(stufen[i]![1]).toBeGreaterThan(stufen[i - 1]![1]);
    }
  });

  it("Einkommens-Schritt zwischen Stufen = CHF 1'512 (= 1/10 Min)", () => {
    const stufen = skala44Daten.stufen as [number, number][];
    for (let i = 1; i < stufen.length; i++) {
      expect(stufen[i]![0] - stufen[i - 1]![0]).toBe(1_512);
    }
  });

  it("Lineare Interpolation: Zwischenwert zwischen Stufe 30'240 (1'588) und 31'752 (1'620)", () => {
    // Mittelpunkt 30'996 → ca. 1'604/Mt → 19'248/Jahr
    const rente = vollrenteEinzelSkala44(30_996);
    expect(rente).toBeGreaterThanOrEqual(19_200);
    expect(rente).toBeLessThanOrEqual(19_300);
  });
});

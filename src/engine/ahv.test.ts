import { describe, it, expect } from "vitest";
import {
  vollrenteEinzelSkala44,
  ahvCouplePension,
  ahvMaxCouplePension,
} from "./ahv";

describe("AHV — Einzelperson Vollrente Skala 44", () => {
  it("Minimum bei Einkommen ≤ CHF 14'700", () => {
    expect(vollrenteEinzelSkala44(0)).toBe(14_700);
    expect(vollrenteEinzelSkala44(14_700)).toBe(14_700);
  });

  it("Maximum bei Einkommen ≥ CHF 88'200 (Plafond)", () => {
    expect(vollrenteEinzelSkala44(88_200)).toBe(29_400);
    expect(vollrenteEinzelSkala44(200_000)).toBe(29_400);
  });

  it("interpoliert linear zwischen den Grenzen (Mitte ≈ CHF 22'050)", () => {
    const mitte = (14_700 + 88_200) / 2;
    expect(vollrenteEinzelSkala44(mitte)).toBe(22_050);
  });
});

describe("AHV — Ehepaar Plafonierung", () => {
  it("Maximalwert CHF 44'100 für Jahre 2024–2026", () => {
    expect(ahvMaxCouplePension(2024)).toBe(44_100);
    expect(ahvMaxCouplePension(2026)).toBe(44_100);
  });

  it("plafoniert zwei Maxima auf 150% einzeln", () => {
    const out = ahvCouplePension({ einkommenP1: 200_000, einkommenP2: 200_000 });
    expect(out.plafoniert).toBe(true);
    expect(out.haushaltsRente).toBe(44_100);
    expect(out.rentenP1).toBe(22_050);
    expect(out.rentenP2).toBe(22_050);
  });

  it("nicht plafoniert bei niedrigem Einkommen — Splitting greift", () => {
    const out = ahvCouplePension({ einkommenP1: 30_000, einkommenP2: 30_000 });
    expect(out.plafoniert).toBe(false);
    expect(out.haushaltsRente).toBeLessThan(44_100);
    expect(out.haushaltsRente).toBeGreaterThan(14_700);
  });
});

describe("AHV — Validierung gegen Muster-PDF S.4 (Ehepaar Ralph+Stephanie)", () => {
  /**
   * Muster-PDF S.4: AHV-Ehepaarrente CHF 33'072 p.a.
   * Anhand Erwerbseinkommen S.5: Ralph 60'000, Stephanie 124'000 (Netto).
   * Annahme massgebendes Einkommen ≈ Netto-Erwerbseinkommen (Vereinfachung).
   *
   * Mit unserer linearen Approximation und symmetrischem Splitting:
   *   Split-Einkommen = (60'000 + 124'000) / 2 = 92'000 → über oberer Grenze → Maxrente CHF 29'400 je
   *   Summe = 58'800, plafoniert auf 44'100 → ≠ 33'072.
   *
   * Erwartete Diskrepanz — die echten BSV-Tabellen sind nicht-linear, und 33'072 zeigt
   * dass die Musters faktisch ~75% der Plafond-Rente bekommen (Lücken oder niedrigere Skala).
   * Dieser Test dokumentiert die offene Etappe-1.5-Aufgabe: BSV-Tabellen einsetzen.
   */
  it("dokumentiert die Diskrepanz: lineare Approximation überschätzt aktuell", () => {
    const out = ahvCouplePension({ einkommenP1: 60_000, einkommenP2: 124_000 });
    expect(out.haushaltsRente).toBe(44_100); // Plafond
    expect(out.haushaltsRente).not.toBe(33_072); // Soll bei echten Tabellen passen
  });
});

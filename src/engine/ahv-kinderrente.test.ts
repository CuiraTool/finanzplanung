/**
 * Tests V2 AHV-Kinderrente (Art. 22ter AHVG).
 */

import { describe, expect, it } from "vitest";
import { ahvKinderrente } from "./ahv";

describe("V2 — AHV-Kinderrente", () => {
  it("Pensionierter mit 1 Kind unter 18: 40 % der Altersrente", () => {
    const altersrente = 30_000;
    const r = ahvKinderrente(altersrente, 1, 2025);
    // 30k × 0.4 = 12'000; Plafond 45'360 − 30k = 15'360 → 12'000 voll
    expect(r).toBe(12_000);
  });

  it("Mit 2 Kindern: 80 % (40 % × 2), plafoniert", () => {
    const altersrente = 30_000;
    const r = ahvKinderrente(altersrente, 2, 2025);
    // 30k × 0.4 × 2 = 24'000; Plafond 45'360 − 30k = 15'360 → cap 15'360
    expect(r).toBe(15_360);
  });

  it("Maximalrente: Plafond bereits erreicht, keine Kinderrente", () => {
    // Maximale Einzelrente ist 30'240 (2025) und Ehepaarplafond bei 45'360.
    // Wenn Altersrente das Plafond bereits ist → 0 Kinderrente.
    const r = ahvKinderrente(45_360, 1, 2025);
    expect(r).toBe(0);
  });

  it("Kind 0 oder negative Altersrente: 0", () => {
    expect(ahvKinderrente(30_000, 0, 2025)).toBe(0);
    expect(ahvKinderrente(0, 1, 2025)).toBe(0);
  });

  it("13. AHV ab 2026: Plafond steigt entsprechend", () => {
    const v2025 = ahvKinderrente(30_000, 2, 2025);
    const v2026 = ahvKinderrente(30_000, 2, 2026);
    // 2026 hat höheren Plafond → mehr Kinderrente möglich
    expect(v2026).toBeGreaterThan(v2025);
  });

  it("Tiefe Altersrente 15k mit 1 Kind: voll 6k Kinderrente", () => {
    const r = ahvKinderrente(15_000, 1, 2025);
    expect(r).toBe(6_000);
  });
});

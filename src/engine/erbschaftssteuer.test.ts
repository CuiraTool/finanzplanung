/**
 * Tests Erbschaftssteuer-Engine V10.
 */

import { describe, expect, it } from "vitest";
import { berechneErbschaftssteuer } from "./erbschaftssteuer";

describe("Erbschaftssteuer V10 — kantonale Tarife", () => {
  it("Ehegatte in allen Kantonen: steuerfrei", () => {
    const kantone = ["ZH", "BE", "ZG", "BS", "GE", "TI"];
    for (const k of kantone) {
      const r = berechneErbschaftssteuer({
        betrag: 1_000_000,
        verwandtschaft: "ehegatte",
        kanton: k,
      });
      expect(r.steuerBetrag).toBe(0);
      expect(r.steuerfrei).toBe(true);
    }
  });

  it("Direkter Nachkomme in ZH: steuerfrei", () => {
    const r = berechneErbschaftssteuer({
      betrag: 500_000,
      verwandtschaft: "nachkomme",
      kanton: "ZH",
    });
    expect(r.steuerBetrag).toBe(0);
  });

  it("Direkter Nachkomme in VD: 3.5 % über Freibetrag 250k", () => {
    const r = berechneErbschaftssteuer({
      betrag: 500_000,
      verwandtschaft: "nachkomme",
      kanton: "VD",
    });
    // (500k − 250k) × 3.5 % = 8'750
    expect(r.steuerBetrag).toBe(8_750);
  });

  it("Geschwister in ZH: 18 % über Freibetrag 15k", () => {
    const r = berechneErbschaftssteuer({
      betrag: 200_000,
      verwandtschaft: "geschwister",
      kanton: "ZH",
    });
    // (200k − 15k) × 18 % = 33'300
    expect(r.steuerBetrag).toBe(33_300);
  });

  it("Konkubinat in ZH: 36 % (nicht-verwandt-Tarif)", () => {
    const r = berechneErbschaftssteuer({
      betrag: 300_000,
      verwandtschaft: "konkubinat",
      kanton: "ZH",
    });
    // (300k − 50k Freibetrag Konkubinat) × 36 % = 90'000
    expect(r.steuerBetrag).toBe(90_000);
    expect(r.hinweis).toContain("nicht-verwandt");
  });

  it("Kanton SZ: alle Verwandtschaftsgrade steuerfrei", () => {
    const r = berechneErbschaftssteuer({
      betrag: 1_000_000,
      verwandtschaft: "geschwister",
      kanton: "SZ",
    });
    expect(r.steuerBetrag).toBe(0);
    expect(r.hinweis).toContain("SZ");
  });

  it("BS: Geschwister 25 %", () => {
    const r = berechneErbschaftssteuer({
      betrag: 100_000,
      verwandtschaft: "geschwister",
      kanton: "BS",
    });
    expect(r.steuerBetrag).toBe(25_000);
  });

  it("BS: Nicht-Verwandt 49.5 % (Spitzentarif CH)", () => {
    const r = berechneErbschaftssteuer({
      betrag: 100_000,
      verwandtschaft: "nicht_verwandt",
      kanton: "BS",
    });
    expect(r.steuerBetrag).toBe(49_500);
  });

  it("Unbekannter Kanton: 20 % Default mit Hinweis", () => {
    const r = berechneErbschaftssteuer({
      betrag: 100_000,
      verwandtschaft: "geschwister",
      kanton: "XX",
    });
    expect(r.steuerBetrag).toBe(20_000);
    expect(r.hinweis).toContain("nicht erkannt");
  });

  it("Betrag unter Freibetrag: 0 Steuer", () => {
    const r = berechneErbschaftssteuer({
      betrag: 50_000,
      verwandtschaft: "konkubinat",
      kanton: "ZH",
    });
    // 50k < 50k Freibetrag → 0
    expect(r.steuerBetrag).toBe(0);
  });

  it("Eltern in ZH: 6 % über Freibetrag 200k", () => {
    const r = berechneErbschaftssteuer({
      betrag: 300_000,
      verwandtschaft: "eltern",
      kanton: "ZH",
    });
    // (300k − 200k) × 6 % = 6'000
    expect(r.steuerBetrag).toBe(6_000);
  });
});

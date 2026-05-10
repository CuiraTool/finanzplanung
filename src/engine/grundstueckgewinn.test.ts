import { describe, expect, it } from "vitest";
import {
  berechneGgst,
  ggstKantonFromCode,
  type GgstInput,
} from "./grundstueckgewinn";

describe("berechneGgst", () => {
  describe("Grundlogik", () => {
    it("kein Gewinn → keine Steuer", () => {
      const r = berechneGgst({
        verkaufspreis: 1_000_000,
        anlagekosten: 1_000_000,
        besitzdauerJahre: 10,
        kanton: "ZH",
      });
      expect(r.steuer).toBe(0);
      expect(r.reingewinn).toBe(0);
    });

    it("Verlust → keine Steuer (kein negativer Gewinn)", () => {
      const r = berechneGgst({
        verkaufspreis: 800_000,
        anlagekosten: 1_000_000,
        besitzdauerJahre: 5,
        kanton: "ZH",
      });
      expect(r.steuer).toBe(0);
      expect(r.reingewinn).toBe(0);
    });

    it("Gewinn rundet auf ganze CHF", () => {
      const r = berechneGgst({
        verkaufspreis: 1_500_000.49,
        anlagekosten: 1_000_000,
        besitzdauerJahre: 10,
        kanton: "ZH",
      });
      expect(Number.isInteger(r.reingewinn)).toBe(true);
      expect(Number.isInteger(r.steuer)).toBe(true);
    });
  });

  describe("ZH Tarif (Standardfall)", () => {
    it("kleiner Gewinn unter 20k → ~10%", () => {
      const r = berechneGgst({
        verkaufspreis: 600_000,
        anlagekosten: 590_000,
        besitzdauerJahre: 5, // neutraler Faktor 1.0
        kanton: "ZH",
      });
      expect(r.reingewinn).toBe(10_000);
      expect(r.grundtarifProzent).toBe(10);
      expect(r.besitzdauerFaktor).toBe(1.0);
      expect(r.steuer).toBe(1_000); // 10% × 10k
    });

    it("mittlerer Gewinn 250k bei 5 J. → ca. 25%", () => {
      const r = berechneGgst({
        verkaufspreis: 1_500_000,
        anlagekosten: 1_250_000,
        besitzdauerJahre: 5,
        kanton: "ZH",
      });
      expect(r.reingewinn).toBe(250_000);
      // 250k im 100k-500k-Segment: 20% + (150/400)*10% = 23.75%
      expect(r.grundtarifProzent).toBeCloseTo(23.8, 0);
      expect(r.besitzdauerFaktor).toBe(1.0);
      // Steuer: ~23.8% von 250k = ca. 59'375
      expect(r.steuer).toBeGreaterThan(55_000);
      expect(r.steuer).toBeLessThan(65_000);
    });

    it("grosser Gewinn 800k bei 20 J. → hoher Tarif aber 50% Rabatt", () => {
      const r = berechneGgst({
        verkaufspreis: 2_500_000,
        anlagekosten: 1_700_000,
        besitzdauerJahre: 20,
        kanton: "ZH",
      });
      expect(r.reingewinn).toBe(800_000);
      // 800k im >500k-Segment: 30 + 300k/200k = 31.5%
      expect(r.grundtarifProzent).toBeCloseTo(31.5, 0);
      expect(r.besitzdauerFaktor).toBe(0.5);
      // Steuer: 31.5% × 0.5 × 800k = 126'000
      expect(r.steuer).toBeGreaterThan(120_000);
      expect(r.steuer).toBeLessThan(135_000);
    });

    it("Spekulationszuschlag bei <1 J. Halten", () => {
      const r = berechneGgst({
        verkaufspreis: 1_200_000,
        anlagekosten: 1_000_000,
        besitzdauerJahre: 0,
        kanton: "ZH",
      });
      expect(r.reingewinn).toBe(200_000);
      expect(r.besitzdauerFaktor).toBe(1.5);
      // 200k Tarif: 20 + (100/400)*10 = 22.5%; effektiv mit 1.5x = 33.75%
      // Steuer: 33.75% von 200k = 67'500
      expect(r.steuer).toBeGreaterThan(60_000);
      expect(r.steuer).toBeLessThan(75_000);
    });
  });

  describe("ZG Tarif (tiefer + stärkerer Rabatt)", () => {
    it("ZG hat tieferen Höchstsatz als ZH", () => {
      const inputBase: Omit<GgstInput, "kanton"> = {
        verkaufspreis: 2_500_000,
        anlagekosten: 1_700_000,
        besitzdauerJahre: 5,
      };
      const zh = berechneGgst({ ...inputBase, kanton: "ZH" });
      const zg = berechneGgst({ ...inputBase, kanton: "ZG" });
      expect(zg.steuer).toBeLessThan(zh.steuer);
    });

    it("ZG bei 25 Jahren Halten: 60% Rabatt (statt 50% in ZH)", () => {
      const r = berechneGgst({
        verkaufspreis: 2_000_000,
        anlagekosten: 1_500_000,
        besitzdauerJahre: 25,
        kanton: "ZG",
      });
      expect(r.besitzdauerFaktor).toBeCloseTo(0.4, 1);
    });
  });

  describe("Default-Anlagekosten (wenn nicht spezifiziert)", () => {
    it("Default bei 15 J. → 75% Annahme → 25% Reingewinn", () => {
      const r = berechneGgst({
        verkaufspreis: 1_000_000,
        besitzdauerJahre: 15,
        kanton: "ZH",
      });
      expect(r.reingewinn).toBe(250_000); // 1M - 750k
    });

    it("Default bei 30+ J. → 55% Annahme → 45% Reingewinn", () => {
      const r = berechneGgst({
        verkaufspreis: 1_000_000,
        besitzdauerJahre: 30,
        kanton: "ZH",
      });
      expect(r.reingewinn).toBe(450_000);
    });

    it("Default bei 0 J. → fast kein Gewinn", () => {
      const r = berechneGgst({
        verkaufspreis: 1_000_000,
        besitzdauerJahre: 0,
        kanton: "ZH",
      });
      expect(r.reingewinn).toBeLessThan(40_000); // 3% Default-Spread
    });
  });

  describe("Edge Cases", () => {
    it("negative besitzdauer wird auf 0 geklammt", () => {
      const r = berechneGgst({
        verkaufspreis: 1_000_000,
        anlagekosten: 800_000,
        besitzdauerJahre: -5,
        kanton: "ZH",
      });
      // Spekulationszuschlag (kurzer Halt)
      expect(r.besitzdauerFaktor).toBe(1.5);
    });

    it("verkaufspreis < 0 → 0 Steuer", () => {
      const r = berechneGgst({
        verkaufspreis: -100_000,
        besitzdauerJahre: 10,
        kanton: "ZH",
      });
      expect(r.steuer).toBe(0);
    });
  });

  describe("Kanton-Mapping", () => {
    it("bekannte Kantone mappen direkt", () => {
      expect(ggstKantonFromCode("ZH")).toBe("ZH");
      expect(ggstKantonFromCode("zh")).toBe("ZH"); // case-insensitive
      expect(ggstKantonFromCode("ZG")).toBe("ZG");
      expect(ggstKantonFromCode("VD")).toBe("VD");
    });

    it("unbekannte Kantone fallen auf 'andere'", () => {
      expect(ggstKantonFromCode("GR")).toBe("andere");
      expect(ggstKantonFromCode("UR")).toBe("andere");
      expect(ggstKantonFromCode("")).toBe("andere");
    });
  });
});

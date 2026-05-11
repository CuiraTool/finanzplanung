import { describe, expect, it } from "vitest";
import { berechneHinterlassenen } from "./hinterlassenen";

describe("Hinterlassenen-Leistungen", () => {
  it("Witwe 50 J, 20 J Ehe, kein Kind: AHV 80 % + BVG 60 %", () => {
    const r = berechneHinterlassenen({
      ahvAltersrenteVerstorbener: 30_240,
      bvgAltersrenteVerstorbener: 24_000,
      alterUeberlebender: 50,
      ehejahre: 20,
      halbwaisen: 0,
    });
    expect(r.ahvAnspruchsberechtigt).toBe(true);
    // 80% × 30'240 = 24'192 (= Plafond)
    expect(r.ahvWitwenrente).toBe(24_192);
    // 60% × 24'000 = 14'400
    expect(r.bvgWitwenrente).toBe(14_400);
    expect(r.ahvWaisenrenten).toBe(0);
    expect(r.total).toBe(24_192 + 14_400);
  });

  it("Witwe 35 J, 3 J Ehe, kein Kind: kein AHV-Anspruch", () => {
    const r = berechneHinterlassenen({
      ahvAltersrenteVerstorbener: 30_240,
      bvgAltersrenteVerstorbener: 24_000,
      alterUeberlebender: 35,
      ehejahre: 3,
      halbwaisen: 0,
    });
    expect(r.ahvAnspruchsberechtigt).toBe(false);
    expect(r.ahvWitwenrente).toBe(0);
    expect(r.bvgWitwenrente).toBe(0);
    expect(r.hinweise.length).toBeGreaterThan(0);
  });

  it("Witwe 35 J, 2 J Ehe, 2 Halbwaisen: AHV-Anspruch via Kind", () => {
    const r = berechneHinterlassenen({
      ahvAltersrenteVerstorbener: 20_000,
      bvgAltersrenteVerstorbener: 18_000,
      alterUeberlebender: 35,
      ehejahre: 2,
      halbwaisen: 2,
    });
    expect(r.ahvAnspruchsberechtigt).toBe(true);
    // 80% × 20'000 = 16'000 (unter Plafond)
    expect(r.ahvWitwenrente).toBe(16_000);
    // 2 Halbwaisen × 40 % × 20'000 = 16'000
    expect(r.ahvWaisenrenten).toBe(16_000);
    // BVG-Waisen 2 × 20 % × 18'000 = 7'200
    expect(r.bvgWaisenrenten).toBe(7_200);
    // BVG-Witwen 60% × 18'000 = 10'800
    expect(r.bvgWitwenrente).toBe(10_800);
  });

  it("Plafond Witwen-Rente: max 80 % × 30'240 = 24'192", () => {
    const r = berechneHinterlassenen({
      ahvAltersrenteVerstorbener: 50_000, // hypothetisch hoch
      bvgAltersrenteVerstorbener: 0,
      alterUeberlebender: 50,
      ehejahre: 20,
      halbwaisen: 0,
    });
    expect(r.ahvWitwenrente).toBe(24_192);
  });

  it("Kombination Witwen + eigene AHV-Rente: Plafond 30'240", () => {
    const r = berechneHinterlassenen({
      ahvAltersrenteVerstorbener: 30_240,
      bvgAltersrenteVerstorbener: 0,
      alterUeberlebender: 65,
      ehejahre: 20,
      halbwaisen: 0,
      eigeneAhvAltersrente: 18_000,
    });
    // Witwen-Anteil + eigene Rente max 30'240
    // → Witwen = 30'240 - 18'000 = 12'240
    expect(r.ahvWitwenrente).toBe(12_240);
    expect(r.hinweise.some((h) => h.includes("plafoniert"))).toBe(true);
  });

  it("Konkubinat ohne Kind: Hinweis BVG abhängig vom Reglement", () => {
    const r = berechneHinterlassenen({
      ahvAltersrenteVerstorbener: 30_000,
      bvgAltersrenteVerstorbener: 20_000,
      alterUeberlebender: 50,
      ehejahre: 0,
      halbwaisen: 0,
    });
    expect(r.ahvAnspruchsberechtigt).toBe(false);
    expect(r.hinweise.some((h) => h.includes("Konkubinat"))).toBe(true);
  });
});

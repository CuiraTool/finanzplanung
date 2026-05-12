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
    // 80% × 30'240 = 24'192 (natürliches Max aus Skala 44, kein Cap)
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

  it("Hohe hypothetische Altersrente: Witwenrente = 80 % davon (kein Cap)", () => {
    const r = berechneHinterlassenen({
      ahvAltersrenteVerstorbener: 50_000, // hypothetisch (Skala-44-Max wäre 30'240)
      bvgAltersrenteVerstorbener: 0,
      alterUeberlebender: 50,
      ehejahre: 20,
      halbwaisen: 0,
    });
    expect(r.ahvWitwenrente).toBe(40_000); // 80 % × 50'000
  });

  it("Art. 24b: Witwenanspruch > eigene Altersrente → Differenz fliesst", () => {
    const r = berechneHinterlassenen({
      ahvAltersrenteVerstorbener: 30_240, // Witwenanspruch 24'192
      bvgAltersrenteVerstorbener: 0,
      alterUeberlebender: 65,
      ehejahre: 20,
      halbwaisen: 0,
      eigeneAhvAltersrente: 18_000,
    });
    // Witwenanspruch 24'192 > eigene 18'000 → Differenz 6'192 zusätzlich
    expect(r.ahvWitwenrente).toBe(6_192);
    expect(r.hinweise.some((h) => h.includes("24b"))).toBe(true);
  });

  it("Art. 24b: eigene Rente > Witwenanspruch → Witwen entfällt", () => {
    const r = berechneHinterlassenen({
      ahvAltersrenteVerstorbener: 20_000, // Witwenanspruch 16'000
      bvgAltersrenteVerstorbener: 0,
      alterUeberlebender: 65,
      ehejahre: 20,
      halbwaisen: 0,
      eigeneAhvAltersrente: 22_000, // > 16'000
    });
    expect(r.ahvWitwenrente).toBe(0);
    expect(r.hinweise.some((h) => h.includes("eigene Altersrente"))).toBe(true);
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

  // ─── V7: Reglement-konfigurierbarkeit ─────────────────

  it("V7: Reglement-Override Witwenrente 65 % (über BVG-Minimum 60 %)", () => {
    const r = berechneHinterlassenen({
      ahvAltersrenteVerstorbener: 30_240,
      bvgAltersrenteVerstorbener: 24_000,
      alterUeberlebender: 50,
      ehejahre: 20,
      halbwaisen: 0,
      bvgWitwenrenteProzent: 65, // Reglement zahlt 65 % statt 60 %
    });
    expect(r.bvgWitwenrente).toBe(15_600); // 65 % × 24'000
  });

  it("V7: Reglement-Override Waisenrente 25 % statt 20 %", () => {
    const r = berechneHinterlassenen({
      ahvAltersrenteVerstorbener: 20_000,
      bvgAltersrenteVerstorbener: 18_000,
      alterUeberlebender: 40,
      ehejahre: 10,
      halbwaisen: 2,
      bvgHalbwaisenrenteProzent: 25,
    });
    // 2 × 25 % × 18'000 = 9'000
    expect(r.bvgWaisenrenten).toBe(9_000);
  });

  it("V7: Konkubinat + Reglement-Berechtigung 5+ J → BVG-Witwenrente fliesst", () => {
    const r = berechneHinterlassenen({
      ahvAltersrenteVerstorbener: 30_000,
      bvgAltersrenteVerstorbener: 20_000,
      alterUeberlebender: 50,
      ehejahre: 6, // wird als Lebensgemeinschafts-Dauer gewertet
      halbwaisen: 0,
      istKonkubinat: true,
      konkubinatBerechtigt: true,
    });
    expect(r.bvgWitwenrente).toBe(12_000); // 60 % × 20'000
    expect(r.ahvWitwenrente).toBe(0); // AHV kennt kein Konkubinat
    expect(r.hinweise.some((h) => h.includes("Lebenspartner"))).toBe(true);
  });

  it("V7: Konkubinat OHNE Reglement-Berechtigung → keine BVG-Witwenrente", () => {
    const r = berechneHinterlassenen({
      ahvAltersrenteVerstorbener: 30_000,
      bvgAltersrenteVerstorbener: 20_000,
      alterUeberlebender: 50,
      ehejahre: 6,
      halbwaisen: 0,
      istKonkubinat: true,
      konkubinatBerechtigt: false,
    });
    expect(r.bvgWitwenrente).toBe(0);
    expect(r.hinweise.some((h) => h.includes("Reglement"))).toBe(true);
  });

  it("V7: Konkubinat mit Kind → BVG-Berechtigung auch ohne 5 J", () => {
    const r = berechneHinterlassenen({
      ahvAltersrenteVerstorbener: 30_000,
      bvgAltersrenteVerstorbener: 20_000,
      alterUeberlebender: 35,
      ehejahre: 2,
      halbwaisen: 1,
      istKonkubinat: true,
      konkubinatBerechtigt: true,
    });
    expect(r.bvgWitwenrente).toBe(12_000);
    expect(r.bvgWaisenrenten).toBe(4_000); // 1 × 20 % × 20'000
  });
});

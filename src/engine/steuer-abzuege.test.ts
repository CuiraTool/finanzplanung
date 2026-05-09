import { describe, it, expect } from "vitest";
import {
  abzuegeDbg,
  abzuegeKanton,
  type AbzugInput,
} from "./steuer-abzuege";

describe("Steuer-Abzüge — Sozialversicherung", () => {
  it("AHV/IV/EO + ALV + NBU: Brutto 100k → ~7'400 CHF Sozialabgaben", () => {
    // 5.3% + 1.1% + 1% = 7.4% bei 100k = 7'400
    const r = abzuegeDbg({
      bruttoErwerbP1: 100_000,
      bruttoErwerbP2: 0,
      alterP1: 40,
      alterP2: 40,
      fallart: "einzel",
      anzahlKinder: 0,
      saeule3aEinzahlungJahr: 0,
      hatPkAnschlussP1: false,
      hatPkAnschlussP2: false,
    });
    expect(r.sozialversicherungP1).toBeGreaterThan(7_300);
    expect(r.sozialversicherungP1).toBeLessThan(7_500);
  });

  it("Sehr hohe Brutto: ALV-Satz fällt ab Schwelle 148'200", () => {
    // bei 200k: AHV 10'600 + ALV (148'200×1.1% + 51'800×0.5%) + NBU 2'000
    const r = abzuegeDbg({
      bruttoErwerbP1: 200_000,
      bruttoErwerbP2: 0,
      alterP1: 40,
      alterP2: 40,
      fallart: "einzel",
      anzahlKinder: 0,
      saeule3aEinzahlungJahr: 0,
      hatPkAnschlussP1: false,
      hatPkAnschlussP2: false,
    });
    // AHV 5.3% × 200k = 10'600
    // ALV: 148'200 × 0.011 + 51'800 × 0.005 = 1'630 + 259 = 1'889
    // NBU: 200k × 0.01 = 2'000
    // Total: ~14'489
    expect(r.sozialversicherungP1).toBeGreaterThan(14_300);
    expect(r.sozialversicherungP1).toBeLessThan(14_700);
  });
});

describe("Steuer-Abzüge — BVG-Beitrag", () => {
  it("Unter Eintrittsschwelle 22'680: 0 BVG-Beitrag", () => {
    const r = abzuegeDbg({
      bruttoErwerbP1: 20_000,
      bruttoErwerbP2: 0,
      alterP1: 40,
      alterP2: 40,
      fallart: "einzel",
      anzahlKinder: 0,
      saeule3aEinzahlungJahr: 0,
      hatPkAnschlussP1: true,
      hatPkAnschlussP2: false,
    });
    expect(r.bvgBeitragP1).toBe(0);
  });

  it("Brutto 100k, Alter 40 → BVG-AN ≈ 3'087 (10% × koord 61'740 / 2)", () => {
    // koord. Lohn = min(100k, 88'200) - 26'460 = 61'740
    // gesamt 10% × 61'740 = 6'174 → AN-Anteil 50% = 3'087
    const r = abzuegeDbg({
      bruttoErwerbP1: 100_000,
      bruttoErwerbP2: 0,
      alterP1: 40,
      alterP2: 40,
      fallart: "einzel",
      anzahlKinder: 0,
      saeule3aEinzahlungJahr: 0,
      hatPkAnschlussP1: true,
      hatPkAnschlussP2: false,
    });
    expect(r.bvgBeitragP1).toBeCloseTo(3_087, -1);
  });

  it("Brutto 100k, Alter 55 → BVG-AN höher (18% Staffel) ≈ 5'557", () => {
    // 61'740 × 18% / 2 = 5'557
    const r = abzuegeDbg({
      bruttoErwerbP1: 100_000,
      bruttoErwerbP2: 0,
      alterP1: 55,
      alterP2: 40,
      fallart: "einzel",
      anzahlKinder: 0,
      saeule3aEinzahlungJahr: 0,
      hatPkAnschlussP1: true,
      hatPkAnschlussP2: false,
    });
    expect(r.bvgBeitragP1).toBeCloseTo(5_557, -1);
  });

  it("Über 88'200: koord. Lohn capped", () => {
    // bei 200k: koordLohn = 88'200 - 26'460 = 61'740
    // 10% × 61'740 / 2 = 3'087
    const r = abzuegeDbg({
      bruttoErwerbP1: 200_000,
      bruttoErwerbP2: 0,
      alterP1: 40,
      alterP2: 40,
      fallart: "einzel",
      anzahlKinder: 0,
      saeule3aEinzahlungJahr: 0,
      hatPkAnschlussP1: true,
      hatPkAnschlussP2: false,
    });
    expect(r.bvgBeitragP1).toBeCloseTo(3_087, -1);
  });

  it("Ohne PK-Anschluss: 0 BVG", () => {
    const r = abzuegeDbg({
      bruttoErwerbP1: 100_000,
      bruttoErwerbP2: 0,
      alterP1: 40,
      alterP2: 40,
      fallart: "einzel",
      anzahlKinder: 0,
      saeule3aEinzahlungJahr: 0,
      hatPkAnschlussP1: false,
      hatPkAnschlussP2: false,
    });
    expect(r.bvgBeitragP1).toBe(0);
  });
});

describe("Steuer-Abzüge — DBG (Bund) Pauschalen", () => {
  it("Single 100k: Versicherungspauschale 1'800 (DBG)", () => {
    const r = abzuegeDbg({
      bruttoErwerbP1: 100_000,
      bruttoErwerbP2: 0,
      alterP1: 40,
      alterP2: 40,
      fallart: "einzel",
      anzahlKinder: 0,
      saeule3aEinzahlungJahr: 0,
      hatPkAnschlussP1: true,
      hatPkAnschlussP2: false,
    });
    expect(r.versicherungspraemien).toBe(1_800);
  });

  it("Familie mit 2 Kindern: Versicherungspauschale 3'600 + 2×700 = 5'000 (DBG)", () => {
    const r = abzuegeDbg({
      bruttoErwerbP1: 120_000,
      bruttoErwerbP2: 80_000,
      alterP1: 42,
      alterP2: 38,
      fallart: "paar",
      anzahlKinder: 2,
      saeule3aEinzahlungJahr: 14_516,
      hatPkAnschlussP1: true,
      hatPkAnschlussP2: true,
    });
    expect(r.versicherungspraemien).toBe(3_600 + 2 * 700);
  });

  it("Doppelverdiener: 50% des Niedrigeren, max 14'600", () => {
    // P1=120k, P2=80k → 50% × 80k = 40k → cap 14'600
    const r = abzuegeDbg({
      bruttoErwerbP1: 120_000,
      bruttoErwerbP2: 80_000,
      alterP1: 42,
      alterP2: 38,
      fallart: "paar",
      anzahlKinder: 0,
      saeule3aEinzahlungJahr: 0,
      hatPkAnschlussP1: true,
      hatPkAnschlussP2: true,
    });
    expect(r.doppelverdienerabzug).toBe(14_600);
  });

  it("Doppelverdiener Min 8'400 bei kleinem Zweit-Lohn", () => {
    // P2=12k → 50% = 6k → unter Min 8'400 → 8'400
    const r = abzuegeDbg({
      bruttoErwerbP1: 120_000,
      bruttoErwerbP2: 12_000,
      alterP1: 42,
      alterP2: 38,
      fallart: "paar",
      anzahlKinder: 0,
      saeule3aEinzahlungJahr: 0,
      hatPkAnschlussP1: true,
      hatPkAnschlussP2: true,
    });
    expect(r.doppelverdienerabzug).toBe(8_400);
  });

  it("Einzel: kein Doppelverdienerabzug", () => {
    const r = abzuegeDbg({
      bruttoErwerbP1: 100_000,
      bruttoErwerbP2: 0,
      alterP1: 40,
      alterP2: 40,
      fallart: "einzel",
      anzahlKinder: 0,
      saeule3aEinzahlungJahr: 0,
      hatPkAnschlussP1: true,
      hatPkAnschlussP2: false,
    });
    expect(r.doppelverdienerabzug).toBe(0);
  });

  it("Säule 3a: max 7'258 mit BVG, deckelt eingegebenen Betrag", () => {
    const r = abzuegeDbg({
      bruttoErwerbP1: 100_000,
      bruttoErwerbP2: 0,
      alterP1: 40,
      alterP2: 40,
      fallart: "einzel",
      anzahlKinder: 0,
      saeule3aEinzahlungJahr: 10_000, // mehr als Max
      hatPkAnschlussP1: true,
      hatPkAnschlussP2: false,
    });
    expect(r.saeule3aAbzug).toBe(7_258);
  });

  it("Säule 3a ohne PK: 20% Erwerbseinkommen, max 36'288", () => {
    // 80k × 20% = 16k, eingezahlt 20k → cap 16k
    const r = abzuegeDbg({
      bruttoErwerbP1: 80_000,
      bruttoErwerbP2: 0,
      alterP1: 40,
      alterP2: 40,
      fallart: "einzel",
      anzahlKinder: 0,
      saeule3aEinzahlungJahr: 20_000,
      hatPkAnschlussP1: false, // selbständig
      hatPkAnschlussP2: false,
    });
    expect(r.saeule3aAbzug).toBe(16_000);
  });

  it("Kinderabzug DBG: 6'700 × Anzahl Kinder", () => {
    const r = abzuegeDbg({
      bruttoErwerbP1: 100_000,
      bruttoErwerbP2: 0,
      alterP1: 40,
      alterP2: 40,
      fallart: "einzel",
      anzahlKinder: 3,
      saeule3aEinzahlungJahr: 0,
      hatPkAnschlussP1: true,
      hatPkAnschlussP2: false,
    });
    expect(r.kinderabzug).toBe(3 * 6_700);
  });
});

describe("Steuer-Abzüge — Kanton ZH abweichende Pauschalen", () => {
  it("Versicherungspauschale ZH höher als DBG", () => {
    const dbg = abzuegeDbg({
      bruttoErwerbP1: 100_000,
      bruttoErwerbP2: 0,
      alterP1: 40,
      alterP2: 40,
      fallart: "einzel",
      anzahlKinder: 0,
      saeule3aEinzahlungJahr: 0,
      hatPkAnschlussP1: true,
      hatPkAnschlussP2: false,
    });
    const kt = abzuegeKanton(
      {
        bruttoErwerbP1: 100_000,
        bruttoErwerbP2: 0,
        alterP1: 40,
        alterP2: 40,
        fallart: "einzel",
        anzahlKinder: 0,
        saeule3aEinzahlungJahr: 0,
        hatPkAnschlussP1: true,
        hatPkAnschlussP2: false,
      },
      "ZH"
    );
    expect(kt.versicherungspraemien).toBeGreaterThan(dbg.versicherungspraemien);
    expect(kt.versicherungspraemien).toBe(2_600);
  });

  it("Kinderabzug ZH (9'300) vs. DBG (6'700)", () => {
    const input: AbzugInput = {
      bruttoErwerbP1: 100_000,
      bruttoErwerbP2: 0,
      alterP1: 40,
      alterP2: 40,
      fallart: "einzel",
      anzahlKinder: 2,
      saeule3aEinzahlungJahr: 0,
      hatPkAnschlussP1: true,
      hatPkAnschlussP2: false,
    };
    const dbg = abzuegeDbg(input);
    const kt = abzuegeKanton(input, "ZH");
    expect(dbg.kinderabzug).toBe(2 * 6_700);
    expect(kt.kinderabzug).toBe(2 * 9_300);
  });

  it("Steuerbares Einkommen Kanton i.d.R. tiefer als Bund (höhere Pauschalen)", () => {
    const input: AbzugInput = {
      bruttoErwerbP1: 120_000,
      bruttoErwerbP2: 80_000,
      alterP1: 42,
      alterP2: 38,
      fallart: "paar",
      anzahlKinder: 2,
      saeule3aEinzahlungJahr: 14_516,
      hatPkAnschlussP1: true,
      hatPkAnschlussP2: true,
    };
    const dbg = abzuegeDbg(input);
    const kt = abzuegeKanton(input, "ZH");
    expect(kt.steuerbar).toBeLessThan(dbg.steuerbar);
  });
});

describe("Steuer-Abzüge — Real-Szenarien", () => {
  it("Single 30k → kaum BVG, geringe Abzüge", () => {
    const r = abzuegeDbg({
      bruttoErwerbP1: 30_000,
      bruttoErwerbP2: 0,
      alterP1: 30,
      alterP2: 0,
      fallart: "einzel",
      anzahlKinder: 0,
      saeule3aEinzahlungJahr: 0,
      hatPkAnschlussP1: true,
      hatPkAnschlussP2: false,
    });
    // Sozial: ~2'200, BVG: ~125 (30k - 26'460 = 3'540 × 7% / 2)
    // Berufsauslagen: 2'000 (Min)
    // Versicherung: 1'800
    // Total ~6'125
    // Steuerbar: ~23'875
    expect(r.steuerbar).toBeGreaterThan(22_000);
    expect(r.steuerbar).toBeLessThan(26_000);
  });

  it("Single 150k mit 3a max → steuerbar ~115k", () => {
    const r = abzuegeDbg({
      bruttoErwerbP1: 150_000,
      bruttoErwerbP2: 0,
      alterP1: 45,
      alterP2: 0,
      fallart: "einzel",
      anzahlKinder: 0,
      saeule3aEinzahlungJahr: 7_258,
      hatPkAnschlussP1: true,
      hatPkAnschlussP2: false,
    });
    expect(r.steuerbar).toBeGreaterThan(110_000);
    expect(r.steuerbar).toBeLessThan(125_000);
  });

  it("Familie 200k, 2 Kinder, beide max 3a → steuerbar ~110-130k", () => {
    const r = abzuegeDbg({
      bruttoErwerbP1: 120_000,
      bruttoErwerbP2: 80_000,
      alterP1: 42,
      alterP2: 38,
      fallart: "paar",
      anzahlKinder: 2,
      saeule3aEinzahlungJahr: 2 * 7_258,
      hatPkAnschlussP1: true,
      hatPkAnschlussP2: true,
    });
    // Sozial: ~14'800
    // BVG: ~7'400 + ~3'700 = 11'100
    // Berufsauslagen: 2 × ~3'400
    // Versicherung: 3'600 + 1'400 = 5'000
    // 3a: 14'516
    // Doppelverdiener: 14'600
    // Kinder: 13'400
    // Total: ~80'000
    // Steuerbar: ~120'000
    expect(r.steuerbar).toBeGreaterThan(105_000);
    expect(r.steuerbar).toBeLessThan(135_000);
  });

  it("Pensionierter (kein Erwerb): keine Sozial+BVG+Berufsauslagen+3a", () => {
    const r = abzuegeDbg({
      bruttoErwerbP1: 0, // keine Erwerbstätigkeit mehr
      bruttoErwerbP2: 0,
      alterP1: 67,
      alterP2: 0,
      fallart: "einzel",
      anzahlKinder: 0,
      saeule3aEinzahlungJahr: 0,
      hatPkAnschlussP1: false,
      hatPkAnschlussP2: false,
    });
    expect(r.sozialversicherungP1).toBe(0);
    expect(r.bvgBeitragP1).toBe(0);
    expect(r.berufsauslagenP1).toBe(0);
    expect(r.saeule3aAbzug).toBe(0);
    // Nur Versicherungspauschale 1'800 + Bruttototal 0 → steuerbar 0
    expect(r.versicherungspraemien).toBe(1_800);
    expect(r.steuerbar).toBe(0);
  });
});

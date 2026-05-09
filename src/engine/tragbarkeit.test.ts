import { describe, it, expect } from "vitest";
import {
  tragbarkeit,
  KALK_ZINS_DEFAULT,
  NEBENKOSTEN_DEFAULT,
} from "./tragbarkeit";

describe("Tragbarkeit — Schweizer Bankenformel", () => {
  it("Eigenheim 1.0M, Hypo 800k (80%), Einkommen 200k → tragbar", () => {
    // Hypo1 (65%): 650k, Hypo2: 150k → Amortisation 150/15 = 10k
    // Zinskosten: 800k × 5% = 40k
    // Nebenkosten: 1.0M × 1% = 10k
    // Total: 60k. Verhältnis: 60k / 200k = 30% → tragbar
    const r = tragbarkeit({
      verkehrswert: 1_000_000,
      hypothekTotal: 800_000,
      einkommenJahr: 200_000,
    });
    expect(r.zinsKosten).toBe(40_000);
    expect(r.amortisation2Hypo).toBe(10_000);
    expect(r.nebenkosten).toBe(10_000);
    expect(r.kostenJahr).toBe(60_000);
    expect(r.verhaeltnis).toBeCloseTo(0.3, 2);
    expect(r.status).toBe("tragbar");
  });

  it("Belehnung 65% (1. Hypothek max) → keine 2.-Hypo-Amortisation", () => {
    const r = tragbarkeit({
      verkehrswert: 1_000_000,
      hypothekTotal: 650_000,
      einkommenJahr: 150_000,
    });
    expect(r.amortisation2Hypo).toBe(0);
  });

  it("Sehr hohe Belehnung 80%, kleines Einkommen → nicht tragbar", () => {
    // Wohnkosten 60k auf Einkommen 100k = 60% → nicht_tragbar
    const r = tragbarkeit({
      verkehrswert: 1_000_000,
      hypothekTotal: 800_000,
      einkommenJahr: 100_000,
    });
    expect(r.status).toBe("nicht_tragbar");
    expect(r.verhaeltnis).toBeGreaterThan(0.4);
  });

  it("Grenzwertig zwischen 33-40%", () => {
    // Wohnkosten 60k auf 170k = 35.3% → grenzwertig
    const r = tragbarkeit({
      verkehrswert: 1_000_000,
      hypothekTotal: 800_000,
      einkommenJahr: 170_000,
    });
    expect(r.status).toBe("grenzwertig");
  });

  it("Einkommen = 0 → Infinity-Verhältnis, nicht tragbar", () => {
    const r = tragbarkeit({
      verkehrswert: 500_000,
      hypothekTotal: 300_000,
      einkommenJahr: 0,
    });
    expect(r.verhaeltnis).toBe(Infinity);
    expect(r.status).toBe("nicht_tragbar");
  });

  it("Kein Eigenheim (verkehrswert 0) → Verhältnis 0", () => {
    const r = tragbarkeit({
      verkehrswert: 0,
      hypothekTotal: 0,
      einkommenJahr: 100_000,
    });
    expect(r.verhaeltnis).toBe(0);
    expect(r.status).toBe("tragbar");
  });

  it("Custom Zins 1.5% (statt 5%) reduziert Kosten massiv", () => {
    const standard = tragbarkeit({
      verkehrswert: 1_000_000,
      hypothekTotal: 800_000,
      einkommenJahr: 100_000,
    });
    const reell = tragbarkeit({
      verkehrswert: 1_000_000,
      hypothekTotal: 800_000,
      einkommenJahr: 100_000,
      kalkZins: 0.015,
    });
    expect(reell.zinsKosten).toBeLessThan(standard.zinsKosten);
    expect(reell.kostenJahr).toBeLessThan(standard.kostenJahr);
  });

  it("Default-Konstanten korrekt", () => {
    expect(KALK_ZINS_DEFAULT).toBe(0.05);
    expect(NEBENKOSTEN_DEFAULT).toBe(0.01);
  });
});

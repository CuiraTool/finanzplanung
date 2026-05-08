/**
 * Sanity-Tests für die neue ESTV-basierte Steuer-Engine.
 *
 * Cross-Check gegen Comparis-Median-Werte und unsere alten Hand-Tarife
 * für ZH/ZG aus Phase 4.3-4.6.
 */

import { describe, it, expect } from "vitest";
import {
  einkommensteuerKanton,
  vermoegensteuerKanton,
  bundessteuerEinkommen,
  bundessteuerKapitalNeu,
  ALLE_KANTONE,
} from ".";

describe("Steuer-Engine Neu — Bundessteuer (DBG)", () => {
  it("Single 100k steuerbar 2025: ~2'500-3'000", () => {
    const s = bundessteuerEinkommen(100_000, "einzel", 2025);
    // 2025 DBG einzel: Stufe ~78'200, Basis 1'427.80, marginal 6.6%
    // Aber 2025 sind die Stufen leicht angehoben (Indexanpassung)
    expect(s).toBeGreaterThan(2_400);
    expect(s).toBeLessThan(3_200);
  });

  it("Verheiratet 100k steuerbar 2025: günstiger als single", () => {
    const einzel = bundessteuerEinkommen(100_000, "einzel", 2025);
    const paar = bundessteuerEinkommen(100_000, "paar", 2025);
    expect(paar).toBeLessThan(einzel);
  });

  it("Plafond 11.5% bei 2M Einkommen", () => {
    const s = bundessteuerEinkommen(2_000_000, "einzel", 2025);
    expect(s).toBeLessThan(2_000_000 * 0.115 + 100);
  });

  it("Bundes-Kapitalsteuer = 1/5 ordentlicher DBG", () => {
    const ord = bundessteuerEinkommen(500_000, "einzel", 2025);
    const kap = bundessteuerKapitalNeu(500_000, "einzel", 2025);
    expect(kap).toBeCloseTo(ord / 5, -1);
  });
});

describe("Steuer-Engine Neu — Kantonssteuer Einkommen", () => {
  it("ZH single reformiert 100k Stadt Zürich: ~16'000 Total Kanton+Gemeinde+Kirche", () => {
    // Bei 100k STEUERBAR (nach Abzügen) liefert der ZH-Tarif ~16'000-18'000
    const r = einkommensteuerKanton(100_000, {
      kanton: "ZH",
      fallart: "einzel",
      religion: "reformiert",
      jahr: 2025,
    });
    expect(r.total).toBeGreaterThan(13_000);
    expect(r.total).toBeLessThan(20_000);
    expect(r.kanton).toBeGreaterThan(0);
    expect(r.gemeinde).toBeGreaterThan(0);
    expect(r.kirche).toBeGreaterThan(0);
  });

  it("ZG single reformiert 100k Stadt Zug: günstiger als ZH", () => {
    const zh = einkommensteuerKanton(100_000, {
      kanton: "ZH",
      fallart: "einzel",
      religion: "reformiert",
      jahr: 2025,
    });
    const zg = einkommensteuerKanton(100_000, {
      kanton: "ZG",
      fallart: "einzel",
      religion: "reformiert",
      jahr: 2025,
    });
    expect(zg.total).toBeLessThan(zh.total);
  });

  it("Religion 'keine' günstiger als 'reformiert'", () => {
    const ref = einkommensteuerKanton(100_000, {
      kanton: "ZH",
      fallart: "einzel",
      religion: "reformiert",
      jahr: 2025,
    });
    const keine = einkommensteuerKanton(100_000, {
      kanton: "ZH",
      fallart: "einzel",
      religion: "keine",
      jahr: 2025,
    });
    expect(keine.kirche).toBe(0);
    expect(keine.total).toBeLessThan(ref.total);
  });

  it("Verheiratet günstiger als einzel (Splitting/Tarif)", () => {
    const einzel = einkommensteuerKanton(150_000, {
      kanton: "ZG",
      fallart: "einzel",
      religion: "reformiert",
      jahr: 2025,
    });
    const paar = einkommensteuerKanton(150_000, {
      kanton: "ZG",
      fallart: "paar",
      religion: "reformiert",
      jahr: 2025,
    });
    expect(paar.total).toBeLessThan(einzel.total);
  });

  it("Alle 26 Kantone liefern positive Steuer für 100k", () => {
    for (const kanton of ALLE_KANTONE) {
      const r = einkommensteuerKanton(100_000, {
        kanton,
        fallart: "einzel",
        religion: "keine",
        jahr: 2025,
      });
      expect(r.total, `Kanton ${kanton}`).toBeGreaterThan(0);
      expect(r.total, `Kanton ${kanton}`).toBeLessThan(40_000);
    }
  });
});

describe("Steuer-Engine Neu — Vermögenssteuer", () => {
  it("ZH 1M single reformiert: ~1'500-3'000 (echter Tarif §47)", () => {
    const r = vermoegensteuerKanton(1_000_000, {
      kanton: "ZH",
      fallart: "einzel",
      religion: "reformiert",
      jahr: 2025,
    });
    expect(r.total).toBeGreaterThan(1_500);
    expect(r.total).toBeLessThan(3_500);
  });

  it("ZG 1M single: ähnlich oder günstiger als ZH", () => {
    const zh = vermoegensteuerKanton(1_000_000, {
      kanton: "ZH",
      fallart: "einzel",
      religion: "keine",
      jahr: 2025,
    });
    const zg = vermoegensteuerKanton(1_000_000, {
      kanton: "ZG",
      fallart: "einzel",
      religion: "keine",
      jahr: 2025,
    });
    expect(zg.total).toBeLessThan(zh.total + 500); // wenig differenz
  });

  it("Vermögen unter Freibetrag: 0", () => {
    const r = vermoegensteuerKanton(50_000, {
      kanton: "ZH",
      fallart: "einzel",
      religion: "reformiert",
      jahr: 2025,
    });
    expect(r.total).toBe(0);
  });

  it("Alle 26 Kantone liefern Vermögenssteuer >= 0 für 500k", () => {
    for (const kanton of ALLE_KANTONE) {
      const r = vermoegensteuerKanton(500_000, {
        kanton,
        fallart: "einzel",
        religion: "keine",
        jahr: 2025,
      });
      expect(r.total, `Kanton ${kanton}`).toBeGreaterThanOrEqual(0);
      expect(r.total, `Kanton ${kanton}`).toBeLessThan(15_000);
    }
  });
});

describe("Steuer-Engine Neu — Jahres-Differenzierung", () => {
  it("2025 vs 2026 Bund: ähnliche Werte (Index-Anpassung minimal)", () => {
    const y2025 = bundessteuerEinkommen(100_000, "einzel", 2025);
    const y2026 = bundessteuerEinkommen(100_000, "einzel", 2026);
    // Jahre-Anpassung sollte <10% sein
    expect(Math.abs(y2026 - y2025) / y2025).toBeLessThan(0.1);
  });
});

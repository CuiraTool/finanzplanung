import { describe, it, expect } from "vitest";
import { steuerProJahr, indikativeSteuerHeute } from "./steuer";
import { bundessteuer, bundessteuerKapital } from "./steuer-bund";
import { kantonsteuerZhKapital, vermoegenssteuerZh } from "./steuer-zh";
import {
  einfacheStaatssteuerZh,
  kantonsteuerZh,
  ZH_STEUERFUSS_KANTON,
  ZH_STEUERFUSS_STADT_ZH,
} from "./steuer-zh";
import {
  einfacheKantonssteuerZg,
  kantonsteuerZg,
  ZG_STEUERFUSS_KANTON,
  ZG_STEUERFUSS_STADT_ZUG,
} from "./steuer-zg";

describe("Bundessteuer — DBG progressive Tarife", () => {
  it("Einzeltarif: Einkommen unter 14'500 = 0", () => {
    expect(bundessteuer(10_000, "einzel")).toBe(0);
    expect(bundessteuer(14_500, "einzel")).toBe(0);
  });

  it("Einzeltarif bei 50'000: ~360 CHF", () => {
    // Stufe 41'400-55'200, Marginalsatz 2.64%, Basis 217.90
    // Bei 50'000: 217.90 + (50'000 - 41'400) × 0.0264 = 217.90 + 227 = ~445
    const s = bundessteuer(50_000, "einzel");
    expect(s).toBeGreaterThan(300);
    expect(s).toBeLessThan(600);
  });

  it("Einzeltarif bei 100'000 steuerbar: ~2'800 CHF", () => {
    // Stufe 78'100-103'600: Basis 1'427.80 + 6.6% × (100'000 - 78'100)
    // = 1'427.80 + 1'445.40 ≈ 2'873
    const s = bundessteuer(100_000, "einzel");
    expect(s).toBeGreaterThan(2_500);
    expect(s).toBeLessThan(3_200);
  });

  it("Verheiratet bei 100'000: weniger als Einzeltarif", () => {
    const einzel = bundessteuer(100_000, "einzel");
    const verheiratet = bundessteuer(100_000, "verheiratet");
    expect(verheiratet).toBeLessThan(einzel);
  });

  it("Plafond 11.5% bei sehr hohem Einkommen", () => {
    const s = bundessteuer(2_000_000, "einzel");
    expect(s).toBeLessThanOrEqual(2_000_000 * 0.115);
  });
});

describe("Kantonsteuer ZH — progressive Tarife (§35 StG)", () => {
  it("Grundtarif: Einkommen unter 6'700 = 0", () => {
    expect(einfacheStaatssteuerZh(0, "grundtarif")).toBe(0);
    expect(einfacheStaatssteuerZh(6_700, "grundtarif")).toBe(0);
  });

  it("Grundtarif bei 50'000: Stufe 43'700-56'100, Basis 1'646 + 7%", () => {
    // 1'646 + 7% × (50'000 - 43'700) = 1'646 + 441 = 2'087
    expect(einfacheStaatssteuerZh(50_000, "grundtarif")).toBeCloseTo(2_087, 0);
  });

  it("Grundtarif bei 100'000: Stufe 73'000-105'500, Basis 3'866 + 9%", () => {
    // 3'866 + 9% × (100'000 - 73'000) = 3'866 + 2'430 = 6'296
    expect(einfacheStaatssteuerZh(100_000, "grundtarif")).toBeCloseTo(6_296, 0);
  });

  it("Verheiratetentarif bei 100'000: günstiger als Grundtarif", () => {
    const grundtarif = einfacheStaatssteuerZh(100_000, "grundtarif");
    const verheiratet = einfacheStaatssteuerZh(100_000, "verheiratet");
    expect(verheiratet).toBeLessThan(grundtarif);
  });

  it("Höchste Stufe ab 254'900 (Grundtarif): 13% Marginalsatz", () => {
    // bei 300'000: 23'565 + 13% × (300'000 - 254'900) = 23'565 + 5'863 = 29'428
    expect(einfacheStaatssteuerZh(300_000, "grundtarif")).toBeCloseTo(29_428, 0);
  });

  it("kantonsteuerZh wendet Steuerfuss 2.27 an (Stadt ZH + Kirche reformiert)", () => {
    // einfache 6'296 × (0.98 + 1.19 + 0.10) = 6'296 × 2.27 = 14'292
    const total = kantonsteuerZh({
      steuerbaresEinkommen: 100_000,
      kategorie: "grundtarif",
      religion: "reformiert",
    });
    expect(total).toBeCloseTo(14_292, 0);
  });

  it("Religion 'keine' ergibt Steuerfuss 2.17 (ohne Kirche)", () => {
    const reformiert = kantonsteuerZh({
      steuerbaresEinkommen: 100_000,
      kategorie: "grundtarif",
      religion: "reformiert",
    });
    const keine = kantonsteuerZh({
      steuerbaresEinkommen: 100_000,
      kategorie: "grundtarif",
      religion: "keine",
    });
    expect(keine).toBeLessThan(reformiert);
    // Kirchen-Anteil = 6'296 × 0.10 = 630
    expect(reformiert - keine).toBeCloseTo(630, 0);
  });

  it("Steuerfuss-Konstanten korrekt", () => {
    expect(ZH_STEUERFUSS_KANTON).toBe(0.98);
    expect(ZH_STEUERFUSS_STADT_ZH).toBe(1.19);
  });
});

describe("Kantonsteuer ZG — progressive Tarife (§35 StG ZG, Steuerperiode 2025)", () => {
  it("Grundtarif: Einkommen 0 = 0", () => {
    expect(einfacheKantonssteuerZg(0, "grundtarif")).toBe(0);
  });

  it("Grundtarif bei 50'000: Stufe 46'400-59'700, Basis 1'800 + 5.5%", () => {
    // 1'800 + 5.5% × (50'000 - 46'400) = 1'800 + 198 = 1'998
    expect(einfacheKantonssteuerZg(50_000, "grundtarif")).toBeCloseTo(1_998, 0);
  });

  it("Grundtarif bei 100'000: Stufe 94'800-120'100, Basis 5'114.50 + 10%", () => {
    // 5'114.50 + 10% × (100'000 - 94'800) = 5'114.50 + 520 = 5'634.50
    expect(einfacheKantonssteuerZg(100_000, "grundtarif")).toBeCloseTo(5_634.5, 0);
  });

  it("Mehrpersonentarif bei 100'000: günstiger als Grundtarif (Splitting-Effekt)", () => {
    const grundtarif = einfacheKantonssteuerZg(100_000, "grundtarif");
    const mehrpersonen = einfacheKantonssteuerZg(100_000, "mehrpersonen");
    expect(mehrpersonen).toBeLessThan(grundtarif);
  });

  it("Höchste Stufe ab 149'900 (Grundtarif): 8% Marginalsatz", () => {
    // bei 200'000: 10'326.50 + 8% × (200'000 - 149'900) = 10'326.50 + 4'008 = 14'334.50
    expect(einfacheKantonssteuerZg(200_000, "grundtarif")).toBeCloseTo(14_334.5, 0);
  });

  it("kantonsteuerZg wendet Steuerfuss 1.42 an (Stadt Zug + Kirche reformiert)", () => {
    // einfache 5'634.50 × (0.82 + 0.51 + 0.09) = × 1.42 = 8'000.99
    const total = kantonsteuerZg({
      steuerbaresEinkommen: 100_000,
      kategorie: "grundtarif",
      religion: "reformiert",
    });
    expect(total).toBeCloseTo(8_001, 0);
  });

  it("Steuerfuss-Konstanten korrekt", () => {
    expect(ZG_STEUERFUSS_KANTON).toBe(0.82);
    expect(ZG_STEUERFUSS_STADT_ZUG).toBe(0.51);
  });
});

describe("Steuer — Default-Sätze pro Kanton", () => {
  it("ZH bei 100'000 Brutto-Einkommen (single, reformiert): ~13'000 CHF", () => {
    // Mit echtem ZH-Tarif (Phase 4.3): steuerbar 85'000
    //   Bund: 1'427.80 + 6.6% × (85'000 - 78'100) ≈ 1'883
    //   ZH-Grundtarif: 3'866 + 9% × (85'000 - 73'000) = 4'946
    //   × Steuerfuss (0.98 + 1.19 + 0.10) = 2.27 → 11'227
    //   Total ≈ 13'110
    const out = steuerProJahr({
      einkommenJahr: 100_000,
      vermoegenJahr: 0,
      kapAuszahlungenJahr: 0,
      kanton: "ZH",
      religion: "reformiert",
    });
    expect(out.einkommen).toBeGreaterThan(11_500);
    expect(out.einkommen).toBeLessThan(15_000);
    expect(out.einkommenBund).toBeGreaterThan(0);
    expect(out.einkommenKanton).toBeGreaterThan(0);
    expect(out.kalibriert).toBe(false);
  });

  it("ZG günstiger als ZH", () => {
    const zh = steuerProJahr({
      einkommenJahr: 100_000,
      vermoegenJahr: 0,
      kapAuszahlungenJahr: 0,
      kanton: "ZH",
      religion: "reformiert",
    });
    const zg = steuerProJahr({
      einkommenJahr: 100_000,
      vermoegenJahr: 0,
      kapAuszahlungenJahr: 0,
      kanton: "ZG",
      religion: "reformiert",
    });
    expect(zg.einkommen).toBeLessThan(zh.einkommen);
  });

  it("Religion 'keine' spart ~4% Einkommensteuer", () => {
    const mit = steuerProJahr({
      einkommenJahr: 100_000,
      vermoegenJahr: 0,
      kapAuszahlungenJahr: 0,
      kanton: "ZH",
      religion: "katholisch",
    });
    const ohne = steuerProJahr({
      einkommenJahr: 100_000,
      vermoegenJahr: 0,
      kapAuszahlungenJahr: 0,
      kanton: "ZH",
      religion: "keine",
    });
    expect(ohne.einkommen).toBeLessThan(mit.einkommen);
    // Religion-Multiplikator wirkt nur auf den Kanton-Anteil, nicht auf
    // Bundessteuer — der Effekt ist daher kleiner als 4% des Totals.
  });

  it("Vermögenssteuer ZH progressiv (Phase 4.6): 1M single reformiert ~2'140", () => {
    // ZH-Tarif §47: bis 80k = 0‰ (Freibetrag), Stufe 717-1353k: 1.5‰ marginal
    // einfache: 518 + 1.5‰ × (1M - 717k) = 942.50 × 2.27 (Steuerfuss) = 2'139.48
    const out = steuerProJahr({
      einkommenJahr: 100_000,
      vermoegenJahr: 1_000_000,
      kapAuszahlungenJahr: 0,
      kanton: "ZH",
      religion: "reformiert",
    });
    expect(out.vermoegen).toBeGreaterThan(2_000);
    expect(out.vermoegen).toBeLessThan(2_300);
    // Sum-of-rounded kann ±1 abweichen vom rounded-sum
    expect(Math.abs(out.total - (out.einkommen + out.vermoegen))).toBeLessThanOrEqual(1);
  });

  it("Kapitalauszahlungssteuer ZH 500'000 (Bruchteilstarif): ~38'000", () => {
    // Phase 4.5: ZH nutzt 1/20-Bruchteilstarif statt Pauschal 8.5%
    //   Bund (1/5 DBG): 53'161 / 5 ≈ 10'632
    //   ZH-Bruchteilstarif: 12'080 × 2.27 = 27'422
    //   Total ≈ 38'054
    const out = steuerProJahr({
      einkommenJahr: 0,
      vermoegenJahr: 0,
      kapAuszahlungenJahr: 500_000,
      kanton: "ZH",
      religion: "reformiert",
    });
    expect(out.kapital).toBeGreaterThan(36_000);
    expect(out.kapital).toBeLessThan(40_000);
    expect(out.kapitalBund).toBeGreaterThan(10_000);
    expect(out.kapitalKanton).toBeGreaterThan(25_000);
  });
});

describe("Kapitalauszahlungssteuer — Phase 4.5 (Bund + ZH progressiv)", () => {
  it("Bundessteuer Kapital = 1/5 DBG-Tarif (Art. 38 DBG)", () => {
    // 500k einzel: DBG ≈ 53'161 → /5 = 10'632
    expect(bundessteuerKapital(500_000, "einzel")).toBeCloseTo(10_632, -1);
  });

  it("Bundessteuer Kapital bei 0 = 0", () => {
    expect(bundessteuerKapital(0, "einzel")).toBe(0);
  });

  it("Bundessteuer Kapital plafoniert bei 2.3% (= 11.5%/5)", () => {
    // bei sehr hoher Auszahlung
    const s = bundessteuerKapital(2_000_000, "einzel");
    expect(s).toBeLessThanOrEqual(2_000_000 * 0.023);
  });

  it("Verheiratet günstiger als einzel (auch beim Kapital)", () => {
    const einzel = bundessteuerKapital(500_000, "einzel");
    const verh = bundessteuerKapital(500_000, "verheiratet");
    expect(verh).toBeLessThan(einzel);
  });

  it("ZH Kapital 500'000 single reformiert: ~27'400 (Bruchteilstarif × Steuerfuss)", () => {
    // 1/20-Methode: fiktive Rente 25'000 → einfache 604 → Satz 2.416% → 12'080
    // × Steuerfuss 2.27 = 27'422
    const s = kantonsteuerZhKapital({
      kapital: 500_000,
      kategorie: "grundtarif",
      religion: "reformiert",
    });
    expect(s).toBeCloseTo(27_422, -1);
  });

  it("ZH Kapital Mindestsatz 2% einfache Steuer greift bei kleinem Kapital", () => {
    // Bei 50k Kapital: fiktive Rente 2'500 < 6'700 → einfache 0
    // → Mindestsatz 2% greift → einfache 1'000 × 2.27 = 2'270
    const s = kantonsteuerZhKapital({
      kapital: 50_000,
      kategorie: "grundtarif",
      religion: "reformiert",
    });
    expect(s).toBeCloseTo(2_270, -1);
  });

  it("ZH Kapital 0 = 0", () => {
    expect(
      kantonsteuerZhKapital({
        kapital: 0,
        kategorie: "grundtarif",
        religion: "reformiert",
      })
    ).toBe(0);
  });

  it("ZH Kapital: Religion 'keine' günstiger", () => {
    const reformiert = kantonsteuerZhKapital({
      kapital: 500_000,
      kategorie: "grundtarif",
      religion: "reformiert",
    });
    const keine = kantonsteuerZhKapital({
      kapital: 500_000,
      kategorie: "grundtarif",
      religion: "keine",
    });
    expect(keine).toBeLessThan(reformiert);
  });

  it("Andere Kantone (z.B. ZG) nutzen weiter Pauschalsatz", () => {
    // ZG Pauschal 4% - 1.5% Bund-Anteil = 2.5% Kanton + Bund 1/5-DBG
    // Bei 500k: ZG-Kanton 2.5% × 500k = 12'500. Bund ≈ 10'632. Total ≈ 23'132
    const out = steuerProJahr({
      einkommenJahr: 0,
      vermoegenJahr: 0,
      kapAuszahlungenJahr: 500_000,
      kanton: "ZG",
      religion: "reformiert",
    });
    expect(out.kapital).toBeGreaterThan(20_000);
    expect(out.kapital).toBeLessThan(26_000);
    expect(out.kapitalBund).toBeGreaterThan(0);
    expect(out.kapitalKanton).toBeGreaterThan(0);
  });
});

describe("Vermögenssteuer ZH — progressiver Tarif §47 StG (Phase 4.6)", () => {
  it("Freibetrag 80'000 single (de-facto, 0‰-Stufe)", () => {
    expect(
      vermoegenssteuerZh({
        vermoegen: 80_000,
        kategorie: "grundtarif",
        religion: "reformiert",
      })
    ).toBe(0);
    expect(
      vermoegenssteuerZh({
        vermoegen: 50_000,
        kategorie: "grundtarif",
        religion: "reformiert",
      })
    ).toBe(0);
  });

  it("Freibetrag 159'000 verheiratet", () => {
    expect(
      vermoegenssteuerZh({
        vermoegen: 159_000,
        kategorie: "verheiratet",
        religion: "reformiert",
      })
    ).toBe(0);
  });

  it("Bei 200'000 single (Stufe 80-318k, 0.5‰): einfache 60 × Steuerfuss", () => {
    // 0 + 0.5‰ × (200'000 - 80'000) = 60. × 2.27 = 136.20
    const s = vermoegenssteuerZh({
      vermoegen: 200_000,
      kategorie: "grundtarif",
      religion: "reformiert",
    });
    expect(s).toBeCloseTo(136.2, 0);
  });

  it("Bei 1'000'000 single: einfache 942.50 × 2.27 = 2'139", () => {
    // Stufe 717'000-1'353'000: Basis 518, Marginal 1.5‰
    // 518 + 1.5‰ × (1'000'000 - 717'000) = 518 + 424.50 = 942.50
    const s = vermoegenssteuerZh({
      vermoegen: 1_000_000,
      kategorie: "grundtarif",
      religion: "reformiert",
    });
    expect(s).toBeCloseTo(2_139.48, 0);
  });

  it("Verheiratet günstiger als single (Splitting + höherer Freibetrag)", () => {
    const single = vermoegenssteuerZh({
      vermoegen: 1_000_000,
      kategorie: "grundtarif",
      religion: "reformiert",
    });
    const verh = vermoegenssteuerZh({
      vermoegen: 1_000_000,
      kategorie: "verheiratet",
      religion: "reformiert",
    });
    expect(verh).toBeLessThan(single);
  });

  it("Höchste Stufe ab 3'262'000 single: 3‰ marginal", () => {
    // Bei 4M: Basis 5'766.50 + 3‰ × (4M - 3.262M) = 5'766.50 + 2'214 = 7'980.50
    // × Steuerfuss 2.27 = 18'115.74
    const s = vermoegenssteuerZh({
      vermoegen: 4_000_000,
      kategorie: "grundtarif",
      religion: "reformiert",
    });
    expect(s).toBeCloseTo(18_115.74, 0);
  });
});

describe("Vermögenssteuer — andere Kantone mit Default-Freibetrag", () => {
  it("ZG bei 1M single: (1M - 80k) × 1.5‰ = 1'380", () => {
    // ZG nutzt Pauschalsatz mit Default-Freibetrag (Phase 4.6)
    const out = steuerProJahr({
      einkommenJahr: 0,
      vermoegenJahr: 1_000_000,
      kapAuszahlungenJahr: 0,
      kanton: "ZG",
      religion: "reformiert",
    });
    expect(out.vermoegen).toBe(1_380); // (1'000'000 - 80'000) × 0.0015
  });

  it("Paar-Freibetrag 160k bei BE single 1M: (1M - 160k) × 3.5‰", () => {
    const out = steuerProJahr({
      einkommenJahr: 0,
      vermoegenJahr: 1_000_000,
      kapAuszahlungenJahr: 0,
      kanton: "BE",
      religion: "reformiert",
      fallart: "paar",
    });
    expect(out.vermoegen).toBe(2_940); // (1'000'000 - 160'000) × 0.0035
  });

  it("Vermögen unter Freibetrag → 0", () => {
    const out = steuerProJahr({
      einkommenJahr: 0,
      vermoegenJahr: 50_000,
      kapAuszahlungenJahr: 0,
      kanton: "BE",
      religion: "reformiert",
    });
    expect(out.vermoegen).toBe(0);
  });
});

describe("Steuer — Anker-Kalibrierung", () => {
  it("Anker überschreibt Default-Satz, proportional zum Einkommen", () => {
    const out = steuerProJahr({
      einkommenJahr: 110_000,
      vermoegenJahr: 0,
      kapAuszahlungenJahr: 0,
      kanton: "ZH",
      religion: "reformiert",
      ankerSteuernHeute: 30_000,
      ankerEinkommenHeute: 100_000,
    });
    expect(out.einkommen).toBe(33_000); // 30k × 1.1
    expect(out.kalibriert).toBe(true);
  });

  it("Anker mit 0 Einkommen wird ignoriert (fallback Default)", () => {
    const out = steuerProJahr({
      einkommenJahr: 100_000,
      vermoegenJahr: 0,
      kapAuszahlungenJahr: 0,
      kanton: "ZH",
      religion: "reformiert",
      ankerSteuernHeute: 30_000,
      ankerEinkommenHeute: 0,
    });
    expect(out.kalibriert).toBe(false);
    // ZH echter Tarif: ~13'100
    expect(out.einkommen).toBeGreaterThan(11_500);
    expect(out.einkommen).toBeLessThan(15_000);
  });
});

describe("Steuer — Unbekannter Kanton", () => {
  it("nutzt Schweiz-Default-Satz", () => {
    const out = steuerProJahr({
      einkommenJahr: 100_000,
      vermoegenJahr: 0,
      kapAuszahlungenJahr: 0,
      kanton: "XX",
      religion: "reformiert",
    });
    expect(out.einkommen).toBeGreaterThan(18_000);
    expect(out.einkommen).toBeLessThan(26_000);
  });

  it("indikativeSteuerHeute funktioniert auch ohne Kanton", () => {
    const t = indikativeSteuerHeute(100_000, 500_000, "", "reformiert");
    expect(t).toBeGreaterThan(0);
  });
});

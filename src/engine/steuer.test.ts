import { describe, it, expect } from "vitest";
import { steuerProJahr, indikativeSteuerHeute } from "./steuer";
import { bundessteuer } from "./steuer-bund";

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

describe("Steuer — Default-Sätze pro Kanton", () => {
  it("ZH bei 100'000 Brutto-Einkommen liefert plausible Total-Steuer (~22'000)", () => {
    const out = steuerProJahr({
      einkommenJahr: 100_000,
      vermoegenJahr: 0,
      kapAuszahlungenJahr: 0,
      kanton: "ZH",
      religion: "reformiert",
    });
    // Bund + Kanton sollten zusammen plausibel sein (im Bereich 20-25k bei
    // 100k Brutto, mittlerer Single-Steuerbelastung in ZH)
    expect(out.einkommen).toBeGreaterThan(18_000);
    expect(out.einkommen).toBeLessThan(26_000);
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

  it("Vermögensteuer additiv", () => {
    const out = steuerProJahr({
      einkommenJahr: 100_000,
      vermoegenJahr: 1_000_000,
      kapAuszahlungenJahr: 0,
      kanton: "ZH",
      religion: "reformiert",
    });
    expect(out.vermoegen).toBe(3_000); // 1'000'000 × 3‰
    expect(out.total).toBe(out.einkommen + out.vermoegen);
  });

  it("Kapitalauszahlungssteuer ZH 8.5%", () => {
    const out = steuerProJahr({
      einkommenJahr: 0,
      vermoegenJahr: 0,
      kapAuszahlungenJahr: 500_000,
      kanton: "ZH",
      religion: "reformiert",
    });
    expect(out.kapital).toBe(42_500); // 500'000 × 8.5%
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
    expect(out.einkommen).toBeGreaterThan(18_000);
    expect(out.einkommen).toBeLessThan(26_000);
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

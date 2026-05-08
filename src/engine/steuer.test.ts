/**
 * Tests für die public Steuer-API (steuerProJahr / indikativeSteuerHeute).
 *
 * Detail-Tests zur ESTV-basierten Engine sind in
 * `./steuer-engine/sanity.test.ts`.
 */

import { describe, it, expect } from "vitest";
import { steuerProJahr, indikativeSteuerHeute } from "./steuer";

describe("Steuer — Default-Sätze pro Kanton (via ESTV-Engine)", () => {
  it("ZH bei 100'000 Brutto-Einkommen (single, reformiert): plausible Total-Steuer", () => {
    const out = steuerProJahr({
      einkommenJahr: 100_000,
      vermoegenJahr: 0,
      kapAuszahlungenJahr: 0,
      kanton: "ZH",
      religion: "reformiert",
    });
    expect(out.einkommen).toBeGreaterThan(11_000);
    expect(out.einkommen).toBeLessThan(16_000);
    expect(out.einkommenBund).toBeGreaterThan(0);
    expect(out.einkommenKanton).toBeGreaterThan(0);
    expect(out.kalibriert).toBe(false);
  });

  it("ZG günstiger als ZH bei 100k", () => {
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

  it("Religion 'keine' spart Kirchensteuer", () => {
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
  });

  it("Verheiratet günstiger als single (Splitting/eigener Tarif)", () => {
    const einzel = steuerProJahr({
      einkommenJahr: 150_000,
      vermoegenJahr: 0,
      kapAuszahlungenJahr: 0,
      kanton: "ZG",
      religion: "reformiert",
    });
    const paar = steuerProJahr({
      einkommenJahr: 150_000,
      vermoegenJahr: 0,
      kapAuszahlungenJahr: 0,
      kanton: "ZG",
      religion: "reformiert",
      fallart: "paar",
    });
    expect(paar.einkommen).toBeLessThan(einzel.einkommen);
  });

  it("Vermögenssteuer additiv ZH 1M", () => {
    const out = steuerProJahr({
      einkommenJahr: 100_000,
      vermoegenJahr: 1_000_000,
      kapAuszahlungenJahr: 0,
      kanton: "ZH",
      religion: "reformiert",
    });
    expect(out.vermoegen).toBeGreaterThan(1_500);
    expect(out.vermoegen).toBeLessThan(3_500);
    expect(
      Math.abs(out.total - (out.einkommen + out.vermoegen))
    ).toBeLessThanOrEqual(1);
  });

  it("Kapitalauszahlungssteuer ZH 500k single (1/20-Bruchteilstarif)", () => {
    const out = steuerProJahr({
      einkommenJahr: 0,
      vermoegenJahr: 0,
      kapAuszahlungenJahr: 500_000,
      kanton: "ZH",
      religion: "reformiert",
    });
    // Bund (1/5 DBG) + ZH (Bruchteilstarif): 30-50k Range
    expect(out.kapital).toBeGreaterThan(25_000);
    expect(out.kapital).toBeLessThan(50_000);
    expect(out.kapitalBund).toBeGreaterThan(8_000);
    expect(out.kapitalKanton).toBeGreaterThan(0);
  });
});

describe("Steuer — Anker-Kalibrierung (User-Input überschreibt)", () => {
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

  it("Anker mit 0 Einkommen wird ignoriert (fallback Engine)", () => {
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
    expect(out.einkommen).toBeGreaterThan(11_000);
    expect(out.einkommen).toBeLessThan(16_000);
  });
});

describe("Steuer — Fallback bei unbekanntem Kanton", () => {
  it("Pauschal-Fallback bei nicht-existierendem Kanton-Code", () => {
    const out = steuerProJahr({
      einkommenJahr: 100_000,
      vermoegenJahr: 0,
      kapAuszahlungenJahr: 0,
      kanton: "XX",
      religion: "reformiert",
    });
    expect(out.einkommen).toBeGreaterThan(10_000);
    expect(out.einkommen).toBeLessThan(20_000);
  });

  it("indikativeSteuerHeute funktioniert auch ohne Kanton", () => {
    const t = indikativeSteuerHeute(100_000, 500_000, "", "reformiert");
    expect(t).toBeGreaterThan(0);
  });
});

describe("Steuer — Jahres-Differenzierung (2025 vs 2026)", () => {
  it("Jahr 2026 nutzt eigene Tarif-Tabelle", () => {
    const y2025 = steuerProJahr({
      einkommenJahr: 100_000,
      vermoegenJahr: 0,
      kapAuszahlungenJahr: 0,
      kanton: "ZH",
      religion: "reformiert",
      jahr: 2025,
    });
    const y2026 = steuerProJahr({
      einkommenJahr: 100_000,
      vermoegenJahr: 0,
      kapAuszahlungenJahr: 0,
      kanton: "ZH",
      religion: "reformiert",
      jahr: 2026,
    });
    // Jahre-Anpassung minimal aber messbar
    expect(Math.abs(y2026.einkommen - y2025.einkommen)).toBeLessThan(2_000);
  });

  it("Zukünftige Jahre fallen auf 2026 zurück (Engine-Limit)", () => {
    const y2030 = steuerProJahr({
      einkommenJahr: 100_000,
      vermoegenJahr: 0,
      kapAuszahlungenJahr: 0,
      kanton: "ZH",
      religion: "reformiert",
      jahr: 2030,
    });
    const y2026 = steuerProJahr({
      einkommenJahr: 100_000,
      vermoegenJahr: 0,
      kapAuszahlungenJahr: 0,
      kanton: "ZH",
      religion: "reformiert",
      jahr: 2026,
    });
    expect(y2030.einkommen).toBe(y2026.einkommen);
  });
});

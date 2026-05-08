import { describe, it, expect } from "vitest";
import { steuerProJahr, indikativeSteuerHeute } from "./steuer";

describe("Steuer — Default-Sätze pro Kanton", () => {
  it("ZH ~22% bei 100'000 Einkommen", () => {
    const out = steuerProJahr({
      einkommenJahr: 100_000,
      vermoegenJahr: 0,
      kapAuszahlungenJahr: 0,
      kanton: "ZH",
      religion: "reformiert",
    });
    expect(out.einkommen).toBe(22_000);
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
    expect(ohne.einkommen).toBeCloseTo(mit.einkommen * 0.96, -1);
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
    expect(out.einkommen).toBe(22_000);
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
    expect(out.einkommen).toBe(22_000); // 22% default
  });

  it("indikativeSteuerHeute funktioniert auch ohne Kanton", () => {
    const t = indikativeSteuerHeute(100_000, 500_000, "", "reformiert");
    expect(t).toBeGreaterThan(0);
  });
});

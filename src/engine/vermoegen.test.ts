import { describe, it, expect } from "vitest";
import { vermoegenStandHeute, vermoegenAufteilung } from "./vermoegen";

describe("Vermögen — Standheute", () => {
  it("Summe Konto + Depot, minus Darlehen", () => {
    expect(
      vermoegenStandHeute([
        { typ: "konto", saldoHeute: 50_000 },
        { typ: "depot", saldoHeute: 100_000 },
        { typ: "darlehen", saldoHeute: 30_000 },
      ])
    ).toBe(120_000);
  });

  it("nur Konten = Aktiva", () => {
    expect(
      vermoegenStandHeute([
        { typ: "konto", saldoHeute: 10_000 },
        { typ: "konto", saldoHeute: 20_000 },
      ])
    ).toBe(30_000);
  });

  it("nur Darlehen = negativ", () => {
    expect(
      vermoegenStandHeute([{ typ: "darlehen", saldoHeute: 50_000 }])
    ).toBe(-50_000);
  });

  it("null-Saldi werden ignoriert", () => {
    expect(
      vermoegenStandHeute([
        { typ: "konto", saldoHeute: null },
        { typ: "konto", saldoHeute: 10_000 },
      ])
    ).toBe(10_000);
  });
});

describe("Vermögen — Aufteilung Aktiva/Schulden", () => {
  it("trennt korrekt", () => {
    const out = vermoegenAufteilung([
      { typ: "konto", saldoHeute: 50_000 },
      { typ: "depot", saldoHeute: 100_000 },
      { typ: "darlehen", saldoHeute: 30_000 },
    ]);
    expect(out.aktiva).toBe(150_000);
    expect(out.schulden).toBe(30_000);
    expect(out.netto).toBe(120_000);
  });
});

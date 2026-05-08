import { describe, it, expect } from "vitest";
import {
  immobilieNettoHeute,
  immobilienAufteilung,
  immobilienVerkaufsAuszahlung,
} from "./immobilien";

describe("Immobilien — Netto heute", () => {
  it("Wert minus Hypotheken", () => {
    expect(
      immobilieNettoHeute({
        verkehrswert: 1_500_000,
        hypothekenSumme: 600_000,
        plan: "behalten",
        verkaufsjahr: 2030,
      })
    ).toBe(900_000);
  });

  it("Verkehrswert null → null", () => {
    expect(
      immobilieNettoHeute({
        verkehrswert: null,
        hypothekenSumme: 600_000,
        plan: "behalten",
        verkaufsjahr: 2030,
      })
    ).toBeNull();
  });

  it("Negative Netto möglich (überschuldet)", () => {
    expect(
      immobilieNettoHeute({
        verkehrswert: 500_000,
        hypothekenSumme: 600_000,
        plan: "behalten",
        verkaufsjahr: 2030,
      })
    ).toBe(-100_000);
  });
});

describe("Immobilien — Aufteilung über mehrere Liegenschaften", () => {
  it("aggregiert Aktiva und Hypotheken", () => {
    const out = immobilienAufteilung([
      {
        verkehrswert: 1_500_000,
        hypothekenSumme: 600_000,
        plan: "behalten",
        verkaufsjahr: 2030,
      },
      {
        verkehrswert: 800_000,
        hypothekenSumme: 400_000,
        plan: "behalten",
        verkaufsjahr: 2030,
      },
    ]);
    expect(out.aktivaImmobilien).toBe(2_300_000);
    expect(out.hypothekenTotal).toBe(1_000_000);
    expect(out.netto).toBe(1_300_000);
  });

  it("Items ohne Verkehrswert fallen aus Aktiva, Hypotheken bleiben", () => {
    const out = immobilienAufteilung([
      {
        verkehrswert: null,
        hypothekenSumme: 200_000,
        plan: "behalten",
        verkaufsjahr: 2030,
      },
    ]);
    expect(out.aktivaImmobilien).toBe(0);
    expect(out.hypothekenTotal).toBe(200_000);
    expect(out.netto).toBe(-200_000);
  });
});

describe("Immobilien — Verkaufsauszahlung", () => {
  it("Plan=verkaufen → Netto-Erlös im Verkaufsjahr", () => {
    expect(
      immobilienVerkaufsAuszahlung({
        verkehrswert: 1_500_000,
        hypothekenSumme: 600_000,
        plan: "verkaufen",
        verkaufsjahr: 2035,
      })
    ).toEqual({ jahr: 2035, betrag: 900_000 });
  });

  it("Plan=behalten → null", () => {
    expect(
      immobilienVerkaufsAuszahlung({
        verkehrswert: 1_500_000,
        hypothekenSumme: 600_000,
        plan: "behalten",
        verkaufsjahr: 2035,
      })
    ).toBeNull();
  });

  it("Plan=verkaufen aber Verkehrswert null → null", () => {
    expect(
      immobilienVerkaufsAuszahlung({
        verkehrswert: null,
        hypothekenSumme: 600_000,
        plan: "verkaufen",
        verkaufsjahr: 2035,
      })
    ).toBeNull();
  });
});

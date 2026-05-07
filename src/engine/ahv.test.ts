import { describe, it, expect } from "vitest";
import { calculateAhv, calculateAhvCouplePensionMax } from "./ahv";

describe("AHV — Ehepaar-Vollrente", () => {
  it("Muster-PDF S.4: CHF 33'072 für Ehepaar 2026 (Ralph+Stephanie, ordentlich Alter 65)", () => {
    expect(calculateAhvCouplePensionMax(2026)).toBe(33072);
  });
});

describe("AHV — Einzelperson", () => {
  it("calculateAhv ist Etappe-1-TODO und soll daher noch werfen", () => {
    expect(() =>
      calculateAhv({
        geburtsjahr: 1967,
        geschlecht: "m",
        fehljahre: 0,
        bezugsalter: 65,
        zivilstandBeiBezug: "verheiratet",
        ehepartnerBezugsalter: 65,
      })
    ).toThrow(/noch nicht implementiert/);
  });
});

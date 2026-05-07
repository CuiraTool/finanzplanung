import { describe, it, expect } from "vitest";
import { calculateSaeuleDreiA } from "./saeule3";

describe("3. Säule — Skelett", () => {
  it("calculateSaeuleDreiA ist Etappe-1-TODO", () => {
    expect(() =>
      calculateSaeuleDreiA({
        saldoHeute: 117100,
        jaehrlicheEinzahlung: 7056,
        bezugsplan: [{ jahr: 2034, betrag: 106410 }],
        zinssatz: 0.005,
      })
    ).toThrow(/noch nicht implementiert/);
  });
});

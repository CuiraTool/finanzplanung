import { describe, it, expect } from "vitest";
import { calculateBvg } from "./bvg";

describe("BVG — Skelett", () => {
  it("calculateBvg ist Etappe-1-TODO", () => {
    expect(() =>
      calculateBvg({
        altersguthabenHeute: 604149,
        geburtsjahr: 1972,
        bezugsjahr: 2037,
        jaehrlichesAltersguthabenZuwachs: 0,
        einkaeufe: [],
        wefBezuege: [],
        umwandlungssatz: 0.06,
      })
    ).toThrow(/noch nicht implementiert/);
  });
});

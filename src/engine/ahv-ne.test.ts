import { describe, expect, it } from "vitest";
import {
  ahvNeBeitragAusBemessung,
  ahvNeBeitragJahr,
  istNichterwerbstaetig,
  NE_MIN_BEITRAG,
  NE_MAX_BEITRAG,
} from "./ahv-ne";

describe("AHV-NE-Beitrag", () => {
  it("Mindest-Beitrag bei Bemessung < 350k", () => {
    expect(ahvNeBeitragAusBemessung(0)).toBe(NE_MIN_BEITRAG);
    expect(ahvNeBeitragAusBemessung(100_000)).toBe(NE_MIN_BEITRAG);
    expect(ahvNeBeitragAusBemessung(349_999)).toBe(NE_MIN_BEITRAG);
  });

  it("steigt linear ab 350k Bemessung", () => {
    expect(ahvNeBeitragAusBemessung(350_000)).toBe(NE_MIN_BEITRAG);
    expect(ahvNeBeitragAusBemessung(400_000)).toBe(581);
    expect(ahvNeBeitragAusBemessung(500_000)).toBe(683);
    expect(ahvNeBeitragAusBemessung(1_000_000)).toBe(1_193);
  });

  it("Maximum bei sehr hohem Vermögen", () => {
    expect(ahvNeBeitragAusBemessung(10_000_000)).toBe(NE_MAX_BEITRAG);
    expect(ahvNeBeitragAusBemessung(100_000_000)).toBe(NE_MAX_BEITRAG);
  });

  it("ahvNeBeitragJahr aus Vermögen + Renten", () => {
    // 500k Vermögen × 20 = 10M Bemessung → max
    expect(
      ahvNeBeitragJahr({ vermoegen: 500_000, rentenJahr: 0 })
    ).toBe(NE_MAX_BEITRAG);
    // 50k Vermögen + 0 Renten = 1M Bemessung → 1193
    expect(
      ahvNeBeitragJahr({ vermoegen: 50_000, rentenJahr: 0 })
    ).toBe(1_193);
  });

  it("istNichterwerbstaetig: nur 20-64 ohne Erwerb", () => {
    expect(
      istNichterwerbstaetig({ alter: 60, ahvBezugsalter: 65, erwerbsEinkommenJahr: 0 })
    ).toBe(true);
    expect(
      istNichterwerbstaetig({ alter: 65, ahvBezugsalter: 65, erwerbsEinkommenJahr: 0 })
    ).toBe(false); // AHV-Bezug aktiv
    expect(
      istNichterwerbstaetig({ alter: 55, ahvBezugsalter: 65, erwerbsEinkommenJahr: 80_000 })
    ).toBe(false); // noch erwerbstätig
    expect(
      istNichterwerbstaetig({ alter: 19, ahvBezugsalter: 65, erwerbsEinkommenJahr: 0 })
    ).toBe(false);
  });
});

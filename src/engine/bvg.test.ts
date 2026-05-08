import { describe, it, expect } from "vitest";
import {
  bvgProjektion,
  bvgRenteAusSaldo,
  bvgBezug,
  BVG_UMWANDLUNGSSATZ_MIND_65,
  BVG_MINDESTZINSSATZ_2025,
} from "./bvg";

describe("BVG — Projektion mit Mindestzinssatz 1.25%", () => {
  it("saldoHeute mit jahreBisBezug=0 unverändert", () => {
    expect(bvgProjektion(500_000, 0)).toBe(500_000);
  });

  it("10 Jahre @ 1.25% verzinst", () => {
    const expected = Math.round(500_000 * Math.pow(1.0125, 10));
    expect(bvgProjektion(500_000, 10)).toBe(expected);
  });

  it("nimmt expliziten Zinssatz", () => {
    expect(bvgProjektion(100_000, 10, 0.02)).toBe(
      Math.round(100_000 * Math.pow(1.02, 10))
    );
  });
});

describe("BVG — Rente aus Saldo (Umwandlungssatz 6.8%)", () => {
  it("Saldo × Umwandlungssatz", () => {
    expect(bvgRenteAusSaldo(500_000)).toBe(34_000); // 500'000 × 6.8%
  });

  it("nimmt expliziten Umwandlungssatz", () => {
    expect(bvgRenteAusSaldo(500_000, 0.05)).toBe(25_000);
  });
});

describe("BVG — Bezug Rente / Kapital / Mischung", () => {
  it("100% Rente: kein Kapital, voller Saldo verrentet", () => {
    const out = bvgBezug({
      altersguthabenHeute: 500_000,
      jahreBisBezug: 0,
      bezugspraeferenz: "rente",
    });
    expect(out.kapitalauszahlung).toBe(0);
    expect(out.jahresrente).toBe(34_000);
    expect(out.saldoBeiBezug).toBe(500_000);
  });

  it("100% Kapital: kein Rentenanteil", () => {
    const out = bvgBezug({
      altersguthabenHeute: 500_000,
      jahreBisBezug: 0,
      bezugspraeferenz: "kapital",
    });
    expect(out.kapitalauszahlung).toBe(500_000);
    expect(out.jahresrente).toBe(0);
  });

  it("Mischung 50/50", () => {
    const out = bvgBezug({
      altersguthabenHeute: 500_000,
      jahreBisBezug: 0,
      bezugspraeferenz: "mischung",
      kapitalanteilProzent: 50,
    });
    expect(out.kapitalauszahlung).toBe(250_000);
    expect(out.jahresrente).toBe(17_000); // 250'000 × 6.8%
  });

  it("Mischung 25/75: 25% Kapital, 75% Rente", () => {
    const out = bvgBezug({
      altersguthabenHeute: 400_000,
      jahreBisBezug: 0,
      bezugspraeferenz: "mischung",
      kapitalanteilProzent: 25,
    });
    expect(out.kapitalauszahlung).toBe(100_000);
    expect(out.jahresrente).toBe(20_400); // 300'000 × 6.8%
  });

  it("Projektion und Bezug kombiniert: Saldo wächst, dann verrentet", () => {
    const out = bvgBezug({
      altersguthabenHeute: 500_000,
      jahreBisBezug: 10,
      bezugspraeferenz: "rente",
    });
    const erwarteterSaldo = Math.round(500_000 * Math.pow(1.0125, 10));
    expect(out.saldoBeiBezug).toBe(erwarteterSaldo);
    expect(out.jahresrente).toBe(Math.round(erwarteterSaldo * 0.068));
  });
});

describe("BVG — Konstanten", () => {
  it("Mindestumwandlungssatz Alter 65 = 6.8%", () => {
    expect(BVG_UMWANDLUNGSSATZ_MIND_65).toBe(0.068);
  });

  it("Mindestzinssatz 2025 = 1.25%", () => {
    expect(BVG_MINDESTZINSSATZ_2025).toBe(0.0125);
  });
});

import { describe, it, expect } from "vitest";
import {
  bvgProjektion,
  bvgRenteAusSaldo,
  bvgGesamtkapitalBeiBezug,
  bvgBezug,
  einkaufeMitSperrfristWarnung,
  BVG_UMWANDLUNGSSATZ_MIND_65,
  BVG_MINDESTZINSSATZ_2025,
  SPERRFRIST_EINKAUF_JAHRE,
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
    expect(bvgRenteAusSaldo(500_000)).toBe(34_000);
  });

  it("nimmt expliziten Umwandlungssatz", () => {
    expect(bvgRenteAusSaldo(500_000, 0.05)).toBe(25_000);
  });
});

describe("BVG — Gesamtkapital aus Komponenten", () => {
  it("nur Altersguthaben → unverändert", () => {
    expect(
      bvgGesamtkapitalBeiBezug({
        altersguthabenBeiBezug: 500_000,
        bezugsjahr: 2030,
        jetztJahr: 2026,
      })
    ).toBe(500_000);
  });

  it("Freizügigkeit verzinst sich von jetzt bis Bezug", () => {
    const out = bvgGesamtkapitalBeiBezug({
      altersguthabenBeiBezug: 500_000,
      bezugsjahr: 2030,
      jetztJahr: 2026,
      freizuegigkeit: [{ saldoHeute: 100_000 }],
    });
    const expected = 500_000 + Math.round(100_000 * Math.pow(1.0125, 4));
    expect(out).toBe(expected);
  });

  it("Einkauf wird ab Einkaufsjahr verzinst", () => {
    const out = bvgGesamtkapitalBeiBezug({
      altersguthabenBeiBezug: 500_000,
      bezugsjahr: 2030,
      jetztJahr: 2026,
      einkaeufe: [{ jahr: 2027, betrag: 50_000 }],
    });
    const expected = 500_000 + Math.round(50_000 * Math.pow(1.0125, 3));
    expect(out).toBe(expected);
  });

  it("Einkauf in der Vergangenheit → Verzinsung 0 Jahre", () => {
    const out = bvgGesamtkapitalBeiBezug({
      altersguthabenBeiBezug: 500_000,
      bezugsjahr: 2026,
      jetztJahr: 2026,
      einkaeufe: [{ jahr: 2030, betrag: 50_000 }], // jahr > bezugsjahr → 0 J.
    });
    expect(out).toBe(550_000);
  });

  it("kombiniert AG + FZ + mehrere Einkäufe", () => {
    const out = bvgGesamtkapitalBeiBezug({
      altersguthabenBeiBezug: 500_000,
      bezugsjahr: 2030,
      jetztJahr: 2026,
      freizuegigkeit: [{ saldoHeute: 50_000 }, { saldoHeute: 30_000 }],
      einkaeufe: [
        { jahr: 2026, betrag: 20_000 },
        { jahr: 2027, betrag: 20_000 },
      ],
    });
    const fzExp =
      50_000 * Math.pow(1.0125, 4) + 30_000 * Math.pow(1.0125, 4);
    const ekExp = 20_000 * Math.pow(1.0125, 4) + 20_000 * Math.pow(1.0125, 3);
    expect(out).toBe(500_000 + Math.round(fzExp + ekExp));
  });
});

describe("BVG — Bezug Rente / Kapital / Mischung", () => {
  it("100% Rente: kein Kapital, voller Saldo verrentet", () => {
    const out = bvgBezug({
      saldoBeiBezug: 500_000,
      bezugspraeferenz: "rente",
    });
    expect(out.kapitalauszahlung).toBe(0);
    expect(out.jahresrente).toBe(34_000);
  });

  it("100% Kapital", () => {
    const out = bvgBezug({
      saldoBeiBezug: 500_000,
      bezugspraeferenz: "kapital",
    });
    expect(out.kapitalauszahlung).toBe(500_000);
    expect(out.jahresrente).toBe(0);
  });

  it("Mischung 50/50", () => {
    const out = bvgBezug({
      saldoBeiBezug: 500_000,
      bezugspraeferenz: "mischung",
      kapitalanteilProzent: 50,
    });
    expect(out.kapitalauszahlung).toBe(250_000);
    expect(out.jahresrente).toBe(17_000);
  });

  it("nimmt PK-spezifischen Umwandlungssatz", () => {
    const out = bvgBezug({
      saldoBeiBezug: 500_000,
      bezugspraeferenz: "rente",
      umwandlungssatz: 0.055, // 5.5% — typisch für reale PK mit Überobligatorium
    });
    expect(out.jahresrente).toBe(27_500);
  });
});

describe("BVG — 3-Jahres-Sperrfrist bei Einkäufen", () => {
  it("Einkauf weit vor Bezug → keine Warnung", () => {
    const out = einkaufeMitSperrfristWarnung(
      [{ jahr: 2024, betrag: 20_000 }],
      2030
    );
    expect(out[0]?.verletzt).toBe(false);
  });

  it("Einkauf 3 Jahre vor Bezug → keine Warnung (genau am Limit)", () => {
    const out = einkaufeMitSperrfristWarnung(
      [{ jahr: 2027, betrag: 20_000 }],
      2030
    );
    expect(out[0]?.verletzt).toBe(false);
  });

  it("Einkauf 2 Jahre vor Bezug → Warnung", () => {
    const out = einkaufeMitSperrfristWarnung(
      [{ jahr: 2028, betrag: 20_000 }],
      2030
    );
    expect(out[0]?.verletzt).toBe(true);
  });

  it("Einkauf im Bezugsjahr → Warnung", () => {
    const out = einkaufeMitSperrfristWarnung(
      [{ jahr: 2030, betrag: 20_000 }],
      2030
    );
    expect(out[0]?.verletzt).toBe(true);
  });
});

describe("BVG — Konstanten", () => {
  it("Mindestumwandlungssatz Alter 65 = 6.8%", () => {
    expect(BVG_UMWANDLUNGSSATZ_MIND_65).toBe(0.068);
  });

  it("Mindestzinssatz 2025 = 1.25%", () => {
    expect(BVG_MINDESTZINSSATZ_2025).toBe(0.0125);
  });

  it("Sperrfrist = 3 Jahre", () => {
    expect(SPERRFRIST_EINKAUF_JAHRE).toBe(3);
  });
});

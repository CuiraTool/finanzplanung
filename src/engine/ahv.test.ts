import { describe, it, expect } from "vitest";
import {
  vollrenteEinzelSkala44,
  ahvCouplePension,
  ahvMaxCouplePension,
  ahvJahresrenteEinzel,
  bezugsfaktor,
  dreizehnteAhvFaktor,
  ORDENTLICHES_AHV_ALTER,
  ERSTES_JAHR_13TE_AHV,
} from "./ahv";

describe("AHV — Einzelperson Vollrente Skala 44 (Stand 2025)", () => {
  it("Minimum bei Einkommen ≤ CHF 15'120", () => {
    expect(vollrenteEinzelSkala44(0)).toBe(15_120);
    expect(vollrenteEinzelSkala44(15_120)).toBe(15_120);
  });

  it("Maximum bei Einkommen ≥ CHF 90'720 (Plafond)", () => {
    expect(vollrenteEinzelSkala44(90_720)).toBe(30_240);
    expect(vollrenteEinzelSkala44(200_000)).toBe(30_240);
  });

  it("interpoliert linear zwischen den Grenzen (Mitte ≈ CHF 22'680)", () => {
    const mitte = (15_120 + 90_720) / 2;
    expect(vollrenteEinzelSkala44(mitte)).toBe(22_680);
  });
});

describe("AHV — Fehljahre kürzen die Rente proportional", () => {
  it("0 Fehljahre = volle Rente", () => {
    expect(vollrenteEinzelSkala44(90_720, 0)).toBe(30_240);
  });

  it("11 Fehljahre = 33/44 = 75% der Vollrente", () => {
    expect(vollrenteEinzelSkala44(90_720, 11)).toBe(22_680);
  });

  it("22 Fehljahre = 50% der Vollrente", () => {
    expect(vollrenteEinzelSkala44(90_720, 22)).toBe(15_120);
  });

  it("≥ 44 Fehljahre = 0 Rente", () => {
    expect(vollrenteEinzelSkala44(90_720, 44)).toBe(0);
    expect(vollrenteEinzelSkala44(90_720, 50)).toBe(0);
  });
});

describe("AHV — 13. Rente", () => {
  it("Faktor 1 vor 2026", () => {
    expect(dreizehnteAhvFaktor(2024)).toBe(1);
    expect(dreizehnteAhvFaktor(2025)).toBe(1);
  });

  it("Faktor 13/12 ab 2026", () => {
    expect(dreizehnteAhvFaktor(2026)).toBeCloseTo(13 / 12);
    expect(dreizehnteAhvFaktor(2030)).toBeCloseTo(13 / 12);
  });
});

describe("AHV — Vorbezug (max 2 Jahre, 6.8% pro Jahr)", () => {
  it("ordentliches Alter = Faktor 1", () => {
    expect(bezugsfaktor(65)).toBe(1);
  });

  it("1 Jahr Vorbezug = -6.8%", () => {
    expect(bezugsfaktor(64)).toBeCloseTo(0.932, 3);
  });

  it("2 Jahre Vorbezug = -13.6%", () => {
    expect(bezugsfaktor(63)).toBeCloseTo(0.864, 3);
  });

  it("> 2 Jahre Vorbezug wirft", () => {
    expect(() => bezugsfaktor(62)).toThrow(/Vorbezug max 2 Jahre/);
  });
});

describe("AHV — Aufschub (max 5 Jahre, BSV-Tabelle)", () => {
  it("1 Jahr Aufschub = +5.2%", () => {
    expect(bezugsfaktor(66)).toBeCloseTo(1.052, 3);
  });

  it("3 Jahre Aufschub = +17.1%", () => {
    expect(bezugsfaktor(68)).toBeCloseTo(1.171, 3);
  });

  it("5 Jahre Aufschub = +31.5%", () => {
    expect(bezugsfaktor(70)).toBeCloseTo(1.315, 3);
  });

  it("> 5 Jahre Aufschub wirft", () => {
    expect(() => bezugsfaktor(71)).toThrow(/Aufschub max 5 Jahre/);
  });
});

describe("AHV — Jahresrente Einzel mit allen Faktoren", () => {
  it("Maxrente, ordentlich, Bezug 2025: CHF 30'240", () => {
    const r = ahvJahresrenteEinzel({
      massgebendesEinkommen: 90_720,
      bezugsjahr: 2025,
    });
    expect(r.jahresrente).toBe(30_240);
    expect(r.hat13te).toBe(false);
  });

  it("Maxrente, ordentlich, Bezug 2026: CHF 32'760 (mit 13. AHV)", () => {
    const r = ahvJahresrenteEinzel({
      massgebendesEinkommen: 90_720,
      bezugsjahr: 2026,
    });
    expect(r.jahresrente).toBe(32_760);
    expect(r.hat13te).toBe(true);
  });

  it("Maxrente, Vorbezug 2 Jahre, Bezug 2026: 30'240 × 0.864 × 13/12 ≈ 28'304", () => {
    const r = ahvJahresrenteEinzel({
      massgebendesEinkommen: 90_720,
      bezugsalter: 63,
      bezugsjahr: 2026,
    });
    expect(r.jahresrente).toBe(Math.round(30_240 * 0.864 * (13 / 12)));
    expect(r.vorbezugJahre).toBe(2);
  });

  it("Maxrente, Aufschub 5 Jahre, Bezug 2030: 30'240 × 1.315 × 13/12 ≈ 43'080", () => {
    const r = ahvJahresrenteEinzel({
      massgebendesEinkommen: 90_720,
      bezugsalter: 70,
      bezugsjahr: 2030,
    });
    expect(r.jahresrente).toBe(Math.round(30_240 * 1.315 * (13 / 12)));
    expect(r.aufschubJahre).toBe(5);
  });
});

describe("AHV — Ehepaar Plafonierung (Stand 2025 + 13. AHV)", () => {
  it("Plafond 2025: CHF 45'360", () => {
    expect(ahvMaxCouplePension(2025)).toBe(45_360);
  });

  it("Plafond 2026 mit 13. AHV: CHF 49'140 (= 45'360 × 13/12)", () => {
    expect(ahvMaxCouplePension(2026)).toBe(Math.round(45_360 * (13 / 12)));
  });

  it("plafoniert bei zwei Maxima 2025", () => {
    const out = ahvCouplePension({
      einkommenP1: 200_000,
      einkommenP2: 200_000,
      bezugsjahr: 2025,
    });
    expect(out.plafoniert).toBe(true);
    expect(out.haushaltsRente).toBe(45_360);
  });

  it("plafoniert bei zwei Maxima 2026 inkl. 13. AHV", () => {
    const out = ahvCouplePension({
      einkommenP1: 200_000,
      einkommenP2: 200_000,
      bezugsjahr: 2026,
    });
    expect(out.plafoniert).toBe(true);
    expect(out.haushaltsRente).toBe(49_140);
    expect(out.hat13te).toBe(true);
  });

  it("nicht plafoniert bei niedrigem Einkommen — Splitting greift", () => {
    const out = ahvCouplePension({
      einkommenP1: 30_000,
      einkommenP2: 30_000,
      bezugsjahr: 2025,
    });
    expect(out.plafoniert).toBe(false);
    expect(out.haushaltsRente).toBeLessThan(45_360);
  });
});

describe("AHV — Konstanten", () => {
  it("ordentliches AHV-Alter = 65", () => {
    expect(ORDENTLICHES_AHV_ALTER).toBe(65);
  });

  it("erste 13. AHV im Jahr 2026", () => {
    expect(ERSTES_JAHR_13TE_AHV).toBe(2026);
  });
});

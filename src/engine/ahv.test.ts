import { describe, it, expect } from "vitest";
import {
  vollrenteEinzelSkala44,
  ahvCouplePension,
  ahvMaxCouplePension,
  ahvJahresrenteEinzel,
  bezugsfaktor,
  dreizehnteAhvFaktor,
  ordentlichesAhvAlter,
  istAhv21Uebergangsjahrgang,
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

  it("BSV-Tabelle: Einkommen 30'240 → Rente 19'056 (1'588 × 12)", () => {
    // Echte BSV-Skala 44 Stand 2025: Stufe bei 30'240 → CHF 1'588/Monat
    expect(vollrenteEinzelSkala44(30_240)).toBe(19_056);
  });

  it("BSV-Tabelle: Einkommen 60'480 → Rente 25'404 (2'117 × 12)", () => {
    // Real-world Mittelstands-Einkommen erreicht ca. 84% der Maxrente
    expect(vollrenteEinzelSkala44(60_480)).toBe(25_404);
  });

  it("Lineare Interpolation zwischen Stufen", () => {
    // Genau zwischen Stufe 30'240 (1'588) und 31'752 (1'620):
    // bei 30'996 → mittlerer Wert 1'604/Monat = 19'248/Jahr
    const ergebnis = vollrenteEinzelSkala44(30_996);
    expect(ergebnis).toBeGreaterThan(19_000);
    expect(ergebnis).toBeLessThan(19_500);
  });
});

describe("AHV — Fehljahre kürzen die Rente proportional", () => {
  it("0 Fehljahre bei Max-Einkommen = volle Maxrente", () => {
    expect(vollrenteEinzelSkala44(90_720, 0)).toBe(30_240);
  });

  it("11 Fehljahre = 33/44 = 75% der Vollrente", () => {
    // Bei Max-Einkommen 90'720 → Vollrente 30'240 → 75% = 22'680
    expect(vollrenteEinzelSkala44(90_720, 11)).toBe(22_680);
  });

  it("22 Fehljahre = 50% der Vollrente", () => {
    // 30'240 × 0.5 = 15'120
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

  it("> 2 Jahre Vorbezug wird auf -2 J. geclamped (defensiv)", () => {
    expect(bezugsfaktor(62)).toBeCloseTo(0.864, 3);
    expect(bezugsfaktor(50)).toBeCloseTo(0.864, 3);
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

  it("> 5 Jahre Aufschub wird auf +5 J. geclamped (defensiv)", () => {
    expect(bezugsfaktor(71)).toBeCloseTo(1.315, 3);
    expect(bezugsfaktor(80)).toBeCloseTo(1.315, 3);
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

  it("Realistisches Mittelstands-Einkommen 60'000 → BSV-Tabellenwert", () => {
    // Echte BSV-Skala 44 Stand 2025: Einkommen 60'000 liegt zwischen Stufen
    // 58'968 (2'097/Mt) und 60'480 (2'117/Mt) → ~25'250/Jahr (84% der Max)
    const r = ahvJahresrenteEinzel({
      massgebendesEinkommen: 60_000,
      bezugsjahr: 2025,
    });
    expect(r.jahresrente).toBeGreaterThan(24_500);
    expect(r.jahresrente).toBeLessThan(26_000);
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
    // Mit Two-Segment-Approx ist bei mittlerem Einkommen die Rente nahe Max,
    // daher braucht's tieferes Einkommen für nicht-plafonierten Test.
    const out = ahvCouplePension({
      einkommenP1: 20_000,
      einkommenP2: 20_000,
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

describe("AHV21 — Frauen-Übergangsalter (Stufenplan)", () => {
  it("Männer immer 65 (alle Jahrgänge)", () => {
    expect(ordentlichesAhvAlter(1955, "m")).toBe(65);
    expect(ordentlichesAhvAlter(1962, "m")).toBe(65);
    expect(ordentlichesAhvAlter(1990, "m")).toBe(65);
  });

  it("Frauen Jg 1960 oder älter: 64", () => {
    expect(ordentlichesAhvAlter(1955, "w")).toBe(64);
    expect(ordentlichesAhvAlter(1960, "w")).toBe(64);
  });

  it("Frauen Jg 1961: 64.25 (64 + 3 Mt)", () => {
    expect(ordentlichesAhvAlter(1961, "w")).toBe(64.25);
  });

  it("Frauen Jg 1962: 64.5 (64 + 6 Mt)", () => {
    expect(ordentlichesAhvAlter(1962, "w")).toBe(64.5);
  });

  it("Frauen Jg 1963: 64.75 (64 + 9 Mt)", () => {
    expect(ordentlichesAhvAlter(1963, "w")).toBe(64.75);
  });

  it("Frauen Jg 1964 und später: 65", () => {
    expect(ordentlichesAhvAlter(1964, "w")).toBe(65);
    expect(ordentlichesAhvAlter(1980, "w")).toBe(65);
  });

  it("Geschlecht 'andere' / null: 65 (Default)", () => {
    expect(ordentlichesAhvAlter(1962, "andere")).toBe(65);
    expect(ordentlichesAhvAlter(1962, null)).toBe(65);
  });

  it("istAhv21Uebergangsjahrgang: nur Frauen 1961-63", () => {
    expect(istAhv21Uebergangsjahrgang(1961, "w")).toBe(true);
    expect(istAhv21Uebergangsjahrgang(1962, "w")).toBe(true);
    expect(istAhv21Uebergangsjahrgang(1963, "w")).toBe(true);
    expect(istAhv21Uebergangsjahrgang(1960, "w")).toBe(false);
    expect(istAhv21Uebergangsjahrgang(1964, "w")).toBe(false);
    expect(istAhv21Uebergangsjahrgang(1962, "m")).toBe(false);
  });
});

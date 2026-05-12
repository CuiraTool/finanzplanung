import { describe, it, expect } from "vitest";
import {
  vollrenteEinzelSkala44,
  ahvCouplePension,
  ahvMaxCouplePension,
  ahvJahresrenteEinzel,
  ahvBezugsstart,
  ahvJahresFaktor,
  bezugsfaktor,
  dreizehnteAhvFaktor,
  ordentlichesAhvAlter,
  istAhv21Uebergangsjahrgang,
  vorbezugKuerzungProJahrAhv21,
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

describe("AHV — Bezugsstart-Monat (BSV-Merkblatt 3.04 'Flexibler Rentenbezug')", () => {
  it("ordentlich 65: Folgemonat nach 65. Geburtstag", () => {
    // Geb. Juli 1967 → 65. Geb. Juli 2032 → AHV ab August 2032
    expect(ahvBezugsstart("1967-07-29", 65)).toEqual({ jahr: 2032, monat: 8 });
    // Geb. Januar 1980 → 65. Geb. Jan 2045 → AHV ab Februar 2045
    expect(ahvBezugsstart("1980-01-15", 65)).toEqual({ jahr: 2045, monat: 2 });
    // Geb. Dezember 1960 → 65. Geb. Dez 2025 → AHV ab Januar 2026
    expect(ahvBezugsstart("1960-12-01", 65)).toEqual({ jahr: 2026, monat: 1 });
  });

  it("Vorbezug volle Jahre", () => {
    // 1 Jahr Vorbezug: bezugsalter 64 → AHV ab Folgemonat des 64. Geb.
    expect(ahvBezugsstart("1967-07-29", 64)).toEqual({ jahr: 2031, monat: 8 });
    // 2 Jahre Vorbezug: bezugsalter 63
    expect(ahvBezugsstart("1967-07-29", 63)).toEqual({ jahr: 2030, monat: 8 });
  });

  it("Vorbezug monatsweise (AHV21 flexibel)", () => {
    // 6 Mt Vorbezug: bezugsalter 64.5 → erreicht Jan 2032 → AHV ab Feb 2032
    expect(ahvBezugsstart("1967-07-29", 64.5)).toEqual({ jahr: 2032, monat: 2 });
    // 3 Mt Vorbezug: bezugsalter 64.75 → erreicht Apr 2032 → AHV ab Mai 2032
    expect(ahvBezugsstart("1967-07-29", 64.75)).toEqual({ jahr: 2032, monat: 5 });
  });

  it("Aufschub monatsweise", () => {
    // 1 J 6 Mt Aufschub: bezugsalter 66.5 → erreicht Jan 2034 → AHV ab Feb 2034
    expect(ahvBezugsstart("1967-07-29", 66.5)).toEqual({ jahr: 2034, monat: 2 });
    // 5 J Aufschub: bezugsalter 70 → erreicht Juli 2037 → AHV ab Aug 2037
    expect(ahvBezugsstart("1967-07-29", 70)).toEqual({ jahr: 2037, monat: 8 });
  });

  it("liefert null bei ungültigem Datum", () => {
    expect(ahvBezugsstart("", 65)).toBeNull();
    expect(ahvBezugsstart("invalid", 65)).toBeNull();
    expect(ahvBezugsstart("1900-13-01", 65)).toBeNull();
  });
});

describe("AHV — Jahres-Faktor (Pro-Rata im Bezugsstart-Jahr)", () => {
  it("vor Bezugsstart: 0", () => {
    const start = { jahr: 2032, monat: 8 };
    expect(ahvJahresFaktor(2030, start)).toBe(0);
    expect(ahvJahresFaktor(2031, start)).toBe(0);
  });

  it("nach Bezugsstart: 1 (volles Jahr)", () => {
    const start = { jahr: 2032, monat: 8 };
    expect(ahvJahresFaktor(2033, start)).toBe(1);
    expect(ahvJahresFaktor(2050, start)).toBe(1);
  });

  it("Bezugsstart-Jahr nach 2026: anteilig mit 13. AHV (Divisor 13)", () => {
    // Start Aug 2032: 5 ord. Monate Aug-Dez + 1 × 13. AHV Dez = 6/13
    expect(ahvJahresFaktor(2032, { jahr: 2032, monat: 8 })).toBeCloseTo(6 / 13, 5);
    // Start Jan: voller Anspruch im Bezugsjahr (12 + 1 = 13/13 = 1)
    expect(ahvJahresFaktor(2030, { jahr: 2030, monat: 1 })).toBe(1);
    // Start Dezember: nur 1 ord. + 1 × 13. AHV = 2/13
    expect(ahvJahresFaktor(2032, { jahr: 2032, monat: 12 })).toBeCloseTo(2 / 13, 5);
  });

  it("Bezugsstart-Jahr vor 2026: anteilig ohne 13. AHV (Divisor 12)", () => {
    // Start Aug 2024 → 5/12
    expect(ahvJahresFaktor(2024, { jahr: 2024, monat: 8 })).toBeCloseTo(5 / 12, 5);
    // Start Jan 2025: 12/12 = 1
    expect(ahvJahresFaktor(2025, { jahr: 2025, monat: 1 })).toBe(1);
  });

  it("liefert 0 bei null-Start", () => {
    expect(ahvJahresFaktor(2030, null)).toBe(0);
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

describe("V3 — AHV-Aufschub Ehepaar: Plafond × Aufschub-Faktor", () => {
  it("Aufschub beider 2 J: Plafond erhöht auf 45'360 × 1.108", () => {
    const ohne = ahvCouplePension({
      einkommenP1: 120_000,
      einkommenP2: 120_000,
      bezugsalterP1: 65,
      bezugsalterP2: 65,
      bezugsjahr: 2025,
    });
    const mitAufschub = ahvCouplePension({
      einkommenP1: 120_000,
      einkommenP2: 120_000,
      bezugsalterP1: 67,
      bezugsalterP2: 67,
      bezugsjahr: 2025,
    });
    // Ohne Aufschub: Plafond 45'360
    expect(ohne.haushaltsRente).toBe(45_360);
    // Mit 2 J Aufschub: 45'360 × 1.108 ≈ 50'259
    expect(mitAufschub.haushaltsRente).toBeGreaterThan(48_000);
    expect(mitAufschub.haushaltsRente).toBeLessThan(52_000);
  });

  it("Asymmetrischer Aufschub: höherer der beiden Faktoren wirkt auf Plafond", () => {
    const r = ahvCouplePension({
      einkommenP1: 120_000,
      einkommenP2: 120_000,
      bezugsalterP1: 65, // ord.
      bezugsalterP2: 70, // 5 J Aufschub, Faktor 1.315
      bezugsjahr: 2025,
    });
    // Plafond = 45'360 × 1.315 ≈ 59'648
    expect(r.haushaltsRente).toBeGreaterThan(50_000);
    expect(r.haushaltsRente).toBeLessThan(60_000);
  });

  it("Vorbezug: Plafond bleibt 45'360 (clamp ≥ 1)", () => {
    const r = ahvCouplePension({
      einkommenP1: 120_000,
      einkommenP2: 120_000,
      bezugsalterP1: 63,
      bezugsalterP2: 63,
      bezugsjahr: 2025,
    });
    // Beide max einkommen → summe Vor13 > 45'360 trotz Vorbezug-Kürzung
    // (max × 2 × 0.864 = 52'255 > 45'360) → plafoniert auf 45'360
    expect(r.haushaltsRente).toBe(45_360);
    expect(r.plafoniert).toBe(true);
  });
});

describe("V4 — AHV21 Vorbezug-Kürzung reduzierte Sätze (Übergangsfrauen)", () => {
  it("Männer + Frauen ausserhalb 1961-63: Standard 6.8 % / J", () => {
    expect(vorbezugKuerzungProJahrAhv21(1965, "m", 50_000)).toBe(0.068);
    expect(vorbezugKuerzungProJahrAhv21(1960, "w", 50_000)).toBe(0.068);
    expect(vorbezugKuerzungProJahrAhv21(1964, "w", 50_000)).toBe(0.068);
  });

  it("Frau Jg 1961, tiefes Einkommen (≤60'480): 0 % Kürzung", () => {
    expect(vorbezugKuerzungProJahrAhv21(1961, "w", 50_000)).toBe(0.0);
    expect(vorbezugKuerzungProJahrAhv21(1961, "w", 60_480)).toBe(0.0);
  });

  it("Frau Jg 1961, mittleres Einkommen: 2.5 % Kürzung", () => {
    expect(vorbezugKuerzungProJahrAhv21(1961, "w", 70_000)).toBe(0.025);
  });

  it("Frau Jg 1961, hohes Einkommen (>90'720): voller Satz 6.8 %", () => {
    expect(vorbezugKuerzungProJahrAhv21(1961, "w", 100_000)).toBe(0.068);
  });

  it("Frau Jg 1962: weniger Rabatt als Jg 1961 bei gleichem Einkommen", () => {
    const k1961 = vorbezugKuerzungProJahrAhv21(1961, "w", 50_000);
    const k1962 = vorbezugKuerzungProJahrAhv21(1962, "w", 50_000);
    expect(k1962).toBeGreaterThan(k1961);
  });

  it("Frau Jg 1963: weniger Rabatt als Jg 1962", () => {
    const k1962 = vorbezugKuerzungProJahrAhv21(1962, "w", 50_000);
    const k1963 = vorbezugKuerzungProJahrAhv21(1963, "w", 50_000);
    expect(k1963).toBeGreaterThan(k1962);
  });

  it("ahvJahresrenteEinzel: Frau Jg 1961 mit Vorbezug bekommt höhere Rente", () => {
    const standard = ahvJahresrenteEinzel({
      massgebendesEinkommen: 50_000,
      bezugsalter: 63, // 1 Jahr Vorbezug von 64 (Ord-Alter 1961)
      bezugsjahr: 2025,
    });
    const ahv21 = ahvJahresrenteEinzel({
      massgebendesEinkommen: 50_000,
      bezugsalter: 63,
      bezugsjahr: 2025,
      geburtsjahr: 1961,
      geschlecht: "w",
    });
    // Mit AHV21-Rabatt (0 % bei tiefem Einkommen) ist Rente höher
    expect(ahv21.jahresrente).toBeGreaterThan(standard.jahresrente);
  });
});

/**
 * Tests für wefValidiere — prüft die vier BVG-Limiten:
 *   • Mindestbetrag CHF 20'000
 *   • 5-Jahres-Intervall zwischen Bezügen
 *   • 3-Jahres-Sperrfrist vor PK-Bezug
 *   • 50-%-Regel ab Alter 50
 *
 * Quelle der Limiten: BVG Art. 30c–d.
 */

import { describe, expect, it } from "vitest";
import { wefValidiere } from "./bvg";

describe("wefValidiere — Mindestbetrag CHF 20'000", () => {
  it("Bezug unter 20'000 → Fehler", () => {
    const w = wefValidiere({
      vorbezuege: [{ id: "a", jahr: 2025, betrag: 15_000 }],
      altersguthabenHeute: 200_000,
      geburtsjahr: 1980,
      pkBezugsjahr: 2045,
    });
    expect(w).toHaveLength(1);
    expect(w[0]?.schwere).toBe("fehler");
    expect(w[0]?.text).toContain("Mindestbetrag");
  });

  it("Bezug genau 20'000 → keine Fehler", () => {
    const w = wefValidiere({
      vorbezuege: [{ id: "a", jahr: 2025, betrag: 20_000 }],
      altersguthabenHeute: 200_000,
      geburtsjahr: 1980,
      pkBezugsjahr: 2045,
    });
    expect(w).toHaveLength(0);
  });
});

describe("wefValidiere — 5-Jahres-Intervall", () => {
  it("zwei Bezüge im Abstand von 3 Jahren → Fehler beim zweiten", () => {
    const w = wefValidiere({
      vorbezuege: [
        { id: "a", jahr: 2020, betrag: 30_000 },
        { id: "b", jahr: 2023, betrag: 30_000 },
      ],
      altersguthabenHeute: 200_000,
      geburtsjahr: 1980,
      pkBezugsjahr: 2045,
    });
    const fehler = w.filter((x) => x.entryId === "b" && x.schwere === "fehler");
    expect(fehler.length).toBeGreaterThan(0);
    expect(fehler[0]?.text).toMatch(/5 Jahre/);
  });

  it("zwei Bezüge im Abstand von 5 Jahren → kein Intervall-Fehler", () => {
    const w = wefValidiere({
      vorbezuege: [
        { id: "a", jahr: 2020, betrag: 30_000 },
        { id: "b", jahr: 2025, betrag: 30_000 },
      ],
      altersguthabenHeute: 200_000,
      geburtsjahr: 1980,
      pkBezugsjahr: 2045,
    });
    expect(w.filter((x) => x.text.includes("Jahre Abstand"))).toHaveLength(0);
  });
});

describe("wefValidiere — 3-Jahres-Sperrfrist vor PK-Bezug", () => {
  it("Bezug 1 Jahr vor PK-Bezug → Warnung", () => {
    const w = wefValidiere({
      vorbezuege: [{ id: "a", jahr: 2029, betrag: 50_000 }],
      altersguthabenHeute: 200_000,
      geburtsjahr: 1965,
      pkBezugsjahr: 2030,
    });
    const warn = w.find((x) => x.text.includes("PK-Bezug"));
    expect(warn).toBeDefined();
    expect(warn?.schwere).toBe("warnung");
  });

  it("Bezug 4 Jahre vor PK-Bezug → keine Sperrfrist-Warnung", () => {
    const w = wefValidiere({
      vorbezuege: [{ id: "a", jahr: 2026, betrag: 50_000 }],
      altersguthabenHeute: 200_000,
      geburtsjahr: 1965,
      pkBezugsjahr: 2030,
    });
    expect(w.filter((x) => x.text.includes("PK-Bezug"))).toHaveLength(0);
  });
});

describe("wefValidiere — 50-%-Regel ab Alter 50", () => {
  it("Alter 55, Bezug > 50 % des Saldos → Warnung", () => {
    const w = wefValidiere({
      vorbezuege: [{ id: "a", jahr: 2025, betrag: 150_000 }],
      altersguthabenHeute: 200_000, // 50 % wären 100'000
      geburtsjahr: 1970,
      pkBezugsjahr: 2035,
    });
    const warn = w.find((x) => x.text.includes("50 %"));
    expect(warn).toBeDefined();
    expect(warn?.schwere).toBe("warnung");
  });

  it("Alter 45, Bezug > 50 % → keine Halbierungs-Warnung (gilt erst ab 50)", () => {
    const w = wefValidiere({
      vorbezuege: [{ id: "a", jahr: 2025, betrag: 150_000 }],
      altersguthabenHeute: 200_000,
      geburtsjahr: 1980,
      pkBezugsjahr: 2045,
    });
    expect(w.filter((x) => x.text.includes("50 %"))).toHaveLength(0);
  });

  it("Alter 55, Bezug < 50 % → keine Warnung", () => {
    const w = wefValidiere({
      vorbezuege: [{ id: "a", jahr: 2025, betrag: 80_000 }],
      altersguthabenHeute: 200_000,
      geburtsjahr: 1970,
      pkBezugsjahr: 2035,
    });
    expect(w).toHaveLength(0);
  });
});

describe("wefValidiere — Robustheit", () => {
  it("ignoriert Einträge ohne Betrag oder Jahr", () => {
    const w = wefValidiere({
      vorbezuege: [
        { id: "a", jahr: 2025, betrag: null },
        { id: "b", jahr: 0, betrag: 50_000 },
      ],
      altersguthabenHeute: 200_000,
      geburtsjahr: 1980,
      pkBezugsjahr: 2045,
    });
    expect(w).toHaveLength(0);
  });
});

/**
 * Tests für die A3-Korrektur: PK-Einkäufe sind voll abzugsfähig und
 * dürfen nicht (wie zuvor in der Massnahmen-Heuristik) durch den
 * 3a-Cap gedeckelt werden.
 *
 * Vor dem Fix nutzte massnahmen.ts `saeule3aEinzahlungJahr: aktuell3a + 30_000`
 * als Stellvertreter — der Wert wurde durch den 3a-Maximalbetrag (≈ 7'258
 * mit PK) zurück­geschnitten und die berechnete Ersparnis war ≤ 0. Die
 * Empfehlung erschien nie oder war drastisch zu klein.
 *
 * Nach dem Fix gibt es ein eigenes Feld `pkEinkaufJahr`, das voll
 * abgezogen wird (BVG Art. 79b).
 */

import { describe, expect, it } from "vitest";
import { steuerProJahr } from "./steuer";

const baseInput = {
  einkommenJahr: 150_000,
  vermoegenJahr: 200_000,
  kapAuszahlungenJahr: 0,
  kanton: "ZH",
  fallart: "einzel" as const,
  bruttoErwerbP1: 150_000,
  bruttoErwerbP2: 0,
  alterP1: 50,
  alterP2: 0,
  anzahlKinder: 0,
  saeule3aEinzahlungJahr: 7_258, // bereits maxiert
  hatPkAnschlussP1: true,
  hatPkAnschlussP2: false,
  religion: "keine" as const,
};

describe("PK-Einkauf voll abzugsfähig (A3)", () => {
  it("PK-Einkauf 30k zusätzlich zu maxiertem 3a → spürbare Steuerersparnis", () => {
    const ohne = steuerProJahr(baseInput);
    const mit = steuerProJahr({ ...baseInput, pkEinkaufJahr: 30_000 });
    const ersparnis = ohne.einkommen - mit.einkommen;

    // Bei Einkommen 150k Ledig ZH liegt der Grenzsteuersatz bei ≈ 25 %
    // → 30k × 0.25 ≈ 7'500 CHF. Wir verlangen mindestens 5'000.
    expect(ersparnis).toBeGreaterThan(5_000);
  });

  it("PK-Einkauf wird NICHT durch 3a-Cap geschnitten", () => {
    // Wenn der Bug noch da wäre und 30k via saeule3aEinzahlungJahr ginge,
    // bliebe nach min(7258, 7258+30000) immer 7258 — keine zusätzliche
    // Ersparnis. Der echte Pfad muss das tun, was wir hier prüfen:
    const ohne = steuerProJahr(baseInput);
    const mit3aGedeckelt = steuerProJahr({
      ...baseInput,
      saeule3aEinzahlungJahr: 7_258 + 30_000, // alter Bug-Pfad
    });
    const mitPkEinkauf = steuerProJahr({
      ...baseInput,
      pkEinkaufJahr: 30_000, // korrekter Pfad
    });

    // Alter Pfad bringt fast nichts (Cap), neuer Pfad bringt Tausende.
    const ersparnisAlt = ohne.einkommen - mit3aGedeckelt.einkommen;
    const ersparnisNeu = ohne.einkommen - mitPkEinkauf.einkommen;
    expect(ersparnisAlt).toBeLessThan(500);
    expect(ersparnisNeu).toBeGreaterThan(5_000);
  });

  it("ohne pkEinkaufJahr: identisch zum Aufruf ohne das Feld (Backwards Compat)", () => {
    const a = steuerProJahr(baseInput);
    const b = steuerProJahr({ ...baseInput, pkEinkaufJahr: 0 });
    expect(a.einkommen).toBe(b.einkommen);
  });

  it("PK-Einkauf erscheint im Abzüge-Detail", () => {
    const out = steuerProJahr({ ...baseInput, pkEinkaufJahr: 30_000 });
    expect(out.abzuegeKanton?.pkEinkaufAbzug).toBe(30_000);
    expect(out.abzuegeDbg?.pkEinkaufAbzug).toBe(30_000);
  });
});

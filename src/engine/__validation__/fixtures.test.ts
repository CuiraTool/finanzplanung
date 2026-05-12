/**
 * Fixture-Bibliothek-Tests: prüft alle 5 Lebenslagen.
 * Jede Lebenslage durchläuft die Engine + Plausi-Check.
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe } from "../cashflow";
import { LEBENSLAGEN } from "./fixtures/lebenslagen";

describe("Fixture-Bibliothek — alle Lebenslagen plausibel", () => {
  for (const ll of LEBENSLAGEN) {
    it(`${ll.id} — ${ll.beschreibung}`, () => {
      const reihe = cashflowReihe(ll.input, 2026, 2045);
      expect(reihe.length).toBeGreaterThan(0);

      const z2026 = reihe[0]!;
      // Plausi: keine NaN, keine negativen Steuern
      expect(Number.isFinite(z2026.einnahmenTotal)).toBe(true);
      expect(Number.isFinite(z2026.vermoegenNetto)).toBe(true);
      expect(z2026.ausgabenSteuern).toBeGreaterThanOrEqual(0);

      // Erwartungs-Bounds (sanft)
      if (ll.erwartet.vermNetto2026Min != null) {
        expect(z2026.vermoegenNetto).toBeGreaterThanOrEqual(
          ll.erwartet.vermNetto2026Min
        );
      }
      if (ll.erwartet.vermNetto2026Max != null) {
        expect(z2026.vermoegenNetto).toBeLessThanOrEqual(
          ll.erwartet.vermNetto2026Max
        );
      }
      if (ll.erwartet.steuern2026Min != null) {
        expect(z2026.ausgabenSteuern).toBeGreaterThanOrEqual(
          ll.erwartet.steuern2026Min
        );
      }
      if (ll.erwartet.steuern2026Max != null) {
        expect(z2026.ausgabenSteuern).toBeLessThanOrEqual(
          ll.erwartet.steuern2026Max
        );
      }
      if (ll.erwartet.ahvAb2030Min != null) {
        const z2030 = reihe.find((z) => z.jahr === 2030);
        if (z2030) {
          expect(z2030.einnahmenAhv).toBeGreaterThanOrEqual(
            ll.erwartet.ahvAb2030Min
          );
        }
      }
    });
  }
});

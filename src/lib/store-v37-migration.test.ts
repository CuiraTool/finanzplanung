/**
 * Tests für v36 → v37 Migration und neue Defaults im Store:
 *  - Budget.alimente: { aktiv: false, betragJahr: null }
 *  - EinkaufEntry.serie: false (Default bei neu erstellten)
 *  - Immobilie.eigenmietwertProzent: bleibt undefined (Engine-Default 1.13)
 *
 * Wir testen das Verhalten der Setter und Defaults, nicht den Migrate-Code
 * direkt (der läuft im Persist-Middleware nur beim Hydrieren).
 */

import { describe, expect, it, beforeEach } from "vitest";
import { usePlanStore } from "@/lib/store";

describe("V37 Store — Alimente, Einkauf-Serie, Eigenmietwert", () => {
  beforeEach(() => {
    usePlanStore.getState().reset();
  });

  describe("Alimente (F2)", () => {
    it("Default: alimente.aktiv=false, betragJahr=null", () => {
      const s = usePlanStore.getState();
      expect(s.budget.alimente).toEqual({ aktiv: false, betragJahr: null });
    });

    it("setAlimente toggelt aktiv und setzt Betrag", () => {
      const s = usePlanStore.getState();
      s.setAlimente({ aktiv: true, betragJahr: 24_000 });
      const after = usePlanStore.getState();
      expect(after.budget.alimente.aktiv).toBe(true);
      expect(after.budget.alimente.betragJahr).toBe(24_000);
    });

    it("Partial-Update via setAlimente merged korrekt", () => {
      const s = usePlanStore.getState();
      s.setAlimente({ betragJahr: 12_000 });
      const a = usePlanStore.getState().budget.alimente;
      expect(a.aktiv).toBe(false); // unverändert
      expect(a.betragJahr).toBe(12_000);
    });
  });

  describe("PK-Einkauf-Serie (F3)", () => {
    it("addEinkauf erstellt Einkauf mit serie=false", () => {
      const s = usePlanStore.getState();
      s.addEinkauf(1);
      const e = usePlanStore.getState().bvg.p1.einkaeufe[0];
      expect(e).toBeDefined();
      expect(e!.serie).toBe(false);
      expect(e!.bisJahr).toBeUndefined();
    });

    it("updateEinkauf kann serie + bisJahr setzen", () => {
      const s = usePlanStore.getState();
      s.addEinkauf(1);
      const id = usePlanStore.getState().bvg.p1.einkaeufe[0]!.id;
      s.updateEinkauf(1, id, { serie: true, bisJahr: 2032, betrag: 20_000 });
      const e = usePlanStore.getState().bvg.p1.einkaeufe[0]!;
      expect(e.serie).toBe(true);
      expect(e.bisJahr).toBe(2032);
      expect(e.betrag).toBe(20_000);
    });
  });

  describe("Eigenmietwert (F1)", () => {
    it("addImmobilie erstellt Immobilie ohne eigenmietwertProzent (undefined → Engine-Default)", () => {
      const s = usePlanStore.getState();
      s.addImmobilie({ typ: "selbstbewohnt", verkehrswert: 1_500_000 });
      const im = usePlanStore.getState().immobilien.items[0]!;
      expect(im.eigenmietwertProzent).toBeFalsy();
    });

    it("updateImmobilie kann eigenmietwertProzent setzen", () => {
      const s = usePlanStore.getState();
      s.addImmobilie({ typ: "selbstbewohnt", verkehrswert: 1_500_000 });
      const id = usePlanStore.getState().immobilien.items[0]!.id;
      s.updateImmobilie(id, { eigenmietwertProzent: 1.5 });
      const im = usePlanStore.getState().immobilien.items[0]!;
      expect(im.eigenmietwertProzent).toBe(1.5);
    });
  });
});

/**
 * Test C1 (aus Code-Review): prüft, ob importState() die Setter-Funktionen
 * erhält oder ob sie durch das Snapshot-Objekt verloren gehen.
 *
 * Hypothese aus dem Review: `set(() => snapshot)` ersetzt den State
 * komplett, alle Setter sind weg → jede Edit-Aktion danach crasht.
 *
 * Realität (Zustand v4+): set(updater) macht shallow-merge by default.
 * JSON-deserialisierter Snapshot enthält keine Funktionen (JSON.stringify
 * droppt sie), also bleiben die Setter beim Merge erhalten.
 *
 * Dieser Test schreibt das Verhalten fest, damit eine zukünftige
 * Refactoring-Welle (z.B. mit `set(() => snapshot, true)`) das nicht
 * unbemerkt bricht.
 */

import { describe, expect, it, beforeEach } from "vitest";
import { usePlanStore } from "@/lib/store";

describe("importState — Setter-Erhaltung (C1)", () => {
  beforeEach(() => {
    usePlanStore.getState().reset();
  });

  it("nach importState sind alle Setter noch Funktionen", () => {
    const before = usePlanStore.getState();
    expect(typeof before.setFallart).toBe("function");
    expect(typeof before.setBvgP1).toBe("function");
    expect(typeof before.addImmobilie).toBe("function");

    // Daten-only Snapshot (so wie er nach JSON.stringify + JSON.parse aussieht)
    const dataOnly: Record<string, unknown> = {};
    for (const k in before) {
      const v = (before as unknown as Record<string, unknown>)[k];
      if (typeof v !== "function") {
        dataOnly[k] = v;
      }
    }

    before.importState(dataOnly as Partial<typeof before>);

    const after = usePlanStore.getState();
    expect(typeof after.setFallart).toBe("function");
    expect(typeof after.setBvgP1).toBe("function");
    expect(typeof after.addImmobilie).toBe("function");
  });

  it("nach importState funktionieren Setter weiterhin korrekt", () => {
    const initial = usePlanStore.getState();
    const dataOnly: Record<string, unknown> = {};
    for (const k in initial) {
      const v = (initial as unknown as Record<string, unknown>)[k];
      if (typeof v !== "function") {
        dataOnly[k] = v;
      }
    }
    initial.importState(dataOnly as Partial<typeof initial>);

    // Setter aufrufen — darf nicht werfen
    expect(() => usePlanStore.getState().setFallart("paar")).not.toThrow();
    expect(usePlanStore.getState().fallart).toBe("paar");
  });

  it("importState überschreibt Daten-Felder aus dem Snapshot", () => {
    const initial = usePlanStore.getState();
    const dataOnly: Record<string, unknown> = {};
    for (const k in initial) {
      const v = (initial as unknown as Record<string, unknown>)[k];
      if (typeof v !== "function") {
        dataOnly[k] = v;
      }
    }
    // Snapshot mit verändertem Wert
    const snapshot = { ...dataOnly, fallart: "paar" } as Partial<typeof initial>;
    initial.importState(snapshot);

    expect(usePlanStore.getState().fallart).toBe("paar");
  });
});

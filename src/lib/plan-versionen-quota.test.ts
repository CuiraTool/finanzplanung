/**
 * Tests für C3 (aus Code-Review): saveVersion muss QuotaExceededError
 * sauber behandeln — älteste Version droppen und retry, schliesslich
 * sauber werfen wenn selbst die neue Version nicht reinpasst.
 *
 * Vor dem Fix: bei voller localStorage-Quota wurde der set() still in
 * der zustand-persist-middleware geloggt, der UI-Counter zeigte aber
 * Erfolg — die Version war faktisch nicht persistiert.
 */

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

const PROBE_KEY = "__cuira-versionen-probe__";

function makeQuotaError(): Error {
  const e = new Error("Quota exceeded");
  e.name = "QuotaExceededError";
  return e;
}

interface FakeStorage {
  setItem: (k: string, v: string) => void;
  getItem: (k: string) => string | null;
  removeItem: (k: string) => void;
  clear: () => void;
  key: (i: number) => string | null;
  length: number;
}

let probeBehaviour: (key: string) => void = () => {};

function makeFakeStorage(): FakeStorage {
  const data: Record<string, string> = {};
  return {
    setItem: (k, v) => {
      probeBehaviour(k);
      data[k] = v;
    },
    getItem: (k) => data[k] ?? null,
    removeItem: (k) => {
      delete data[k];
    },
    clear: () => {
      for (const k in data) delete data[k];
    },
    key: () => null,
    length: 0,
  };
}

describe("saveVersion — Quota-Exceeded Handling (C3)", () => {
  let originalWindow: unknown;

  beforeEach(() => {
    originalWindow = (globalThis as { window?: unknown }).window;
    probeBehaviour = () => {};
    (globalThis as unknown as { window: { localStorage: FakeStorage } }).window =
      { localStorage: makeFakeStorage() };
  });

  afterEach(() => {
    (globalThis as { window?: unknown }).window = originalWindow;
    vi.restoreAllMocks();
  });

  it("wirft sauberen Error wenn schon der erste setItem-Call wirft (Quota total voll)", async () => {
    probeBehaviour = (k) => {
      if (k === PROBE_KEY) throw makeQuotaError();
    };
    const { usePlanVersionenStore } = await import("@/lib/plan-versionen");
    usePlanVersionenStore.getState().clearAll();
    expect(() =>
      usePlanVersionenStore.getState().saveVersion({} as never, "voll")
    ).toThrow(/Speicher voll/);
  });

  it("droppt ältere Versionen wenn Quota nur fast voll ist", async () => {
    const { usePlanVersionenStore } = await import("@/lib/plan-versionen");
    usePlanVersionenStore.getState().clearAll();

    // Population ohne Quota-Block
    usePlanVersionenStore.getState().saveVersion({} as never, "V1");
    usePlanVersionenStore.getState().saveVersion({} as never, "V2");
    usePlanVersionenStore.getState().saveVersion({} as never, "V3");
    expect(usePlanVersionenStore.getState().versionen).toHaveLength(3);

    // Jetzt Mock anziehen: erste 3 Probe-Calls (Liste mit 4, 3, 2) werfen,
    // erst der 4. (Liste mit 1 = nur die neue Version) klappt.
    let probeCalls = 0;
    probeBehaviour = (k) => {
      if (k === PROBE_KEY) {
        probeCalls++;
        if (probeCalls < 4) throw makeQuotaError();
      }
    };

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const id = usePlanVersionenStore
      .getState()
      .saveVersion({} as never, "V4");
    expect(id).toBeTruthy();
    expect(warnSpy).toHaveBeenCalled();
    expect(usePlanVersionenStore.getState().versionen).toHaveLength(1);
  });
});

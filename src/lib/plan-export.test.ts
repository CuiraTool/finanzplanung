import { describe, expect, it } from "vitest";
import {
  AKTUELLE_SCHEMA_VERSION,
  SNAPSHOT_FORMAT_TAG,
  buildSnapshot,
  buildSnapshotFilename,
  parseSnapshot,
  snapshotToJson,
  type ProSnapshot,
} from "./plan-export";
import type { PlanState } from "./store";

function makeMinimalState(): PlanState {
  return {
    person1: {
      vorname: "Hans",
      nachname: "Müller",
      geburtsdatum: "1965-04-15",
      geschlecht: "m",
      telefon: "",
      email: "",
    },
    person2: {
      vorname: "",
      nachname: "",
      geburtsdatum: "",
      geschlecht: null,
      telefon: "",
      email: "",
    },
    fallart: "einzel",
    zivilstand: "ledig",
    // Setter-Functions als Dummies — werden beim Stringify gestripped
    setFallart: () => {},
    setPerson1: () => {},
  } as unknown as PlanState;
}

describe("plan-export.parseSnapshot", () => {
  it("erkennt Pro-Tool-Snapshot mit aktueller Schema-Version", () => {
    const snap: ProSnapshot = {
      format: SNAPSHOT_FORMAT_TAG,
      schemaVersion: AKTUELLE_SCHEMA_VERSION,
      exportedAt: "2026-05-18T12:00:00Z",
      kundeName: "Müller, Hans",
      beraterName: "Kathirsan",
      plan: { fallart: "einzel" } as Partial<PlanState>,
    };
    const r = parseSnapshot(JSON.stringify(snap));
    expect(r.ok).toBe(true);
    expect(r.ausErfassung).toBe(false);
    expect(r.migriert).toBe(false);
    expect(r.plan?.fallart).toBe("einzel");
  });

  it("lehnt Snapshot aus neuerer Schema-Version ab", () => {
    const snap = {
      format: SNAPSHOT_FORMAT_TAG,
      schemaVersion: AKTUELLE_SCHEMA_VERSION + 1,
      exportedAt: "2027-01-01T00:00:00Z",
      kundeName: "X",
      beraterName: "Y",
      plan: {},
    };
    const r = parseSnapshot(JSON.stringify(snap));
    expect(r.ok).toBe(false);
    expect(r.hinweis).toContain("neuerer");
  });

  it("akzeptiert FlowAntworten-Format (V2-Erfassung)", () => {
    const flow = {
      plan: { fallart: "paar", person1: { vorname: "Anna" } },
      erfasstAm: "2026-04-30T10:00:00Z",
      beraterMeta: {
        beraterName: "Berater A",
        kundeP1Name: "Anna B",
      },
    };
    const r = parseSnapshot(JSON.stringify(flow));
    expect(r.ok).toBe(true);
    expect(r.ausErfassung).toBe(true);
    expect(r.plan?.fallart).toBe("paar");
    expect(r.hinweis).toContain("Anna B");
  });

  it("lehnt unbekanntes JSON ab", () => {
    const r = parseSnapshot(JSON.stringify({ random: "data" }));
    expect(r.ok).toBe(false);
    expect(r.hinweis).toContain("unbekannt");
  });

  it("lehnt ungültiges JSON ab", () => {
    const r = parseSnapshot("{not valid json}");
    expect(r.ok).toBe(false);
    expect(r.hinweis).toContain("Ungültiges JSON");
  });

  it("lehnt Snapshot ohne schemaVersion ab", () => {
    const r = parseSnapshot(
      JSON.stringify({
        format: SNAPSHOT_FORMAT_TAG,
        exportedAt: "2026-01-01",
        plan: {},
        kundeName: "X",
        beraterName: "Y",
      })
    );
    expect(r.ok).toBe(false);
    expect(r.hinweis).toContain("schemaVersion");
  });
});

describe("plan-export.buildSnapshot + snapshotToJson", () => {
  it("baut konsistente ProSnapshot-Struktur", () => {
    const state = makeMinimalState();
    const snap = buildSnapshot(state, "Kathirsan K.");
    expect(snap.format).toBe(SNAPSHOT_FORMAT_TAG);
    expect(snap.schemaVersion).toBe(AKTUELLE_SCHEMA_VERSION);
    expect(snap.kundeName).toBe("Müller, Hans");
    expect(snap.beraterName).toBe("Kathirsan K.");
  });

  it("snapshotToJson strippt Setter-Funktionen", () => {
    const state = makeMinimalState();
    const snap = buildSnapshot(state, "Test");
    const json = snapshotToJson(snap);
    expect(json).not.toContain("setFallart");
    expect(json).not.toContain("setPerson1");
    expect(json).toContain('"fallart"');
  });

  it("Round-Trip: build → toJson → parse → plan === input", () => {
    const state = makeMinimalState();
    const snap = buildSnapshot(state, "Tester");
    const json = snapshotToJson(snap);
    const r = parseSnapshot(json);
    expect(r.ok).toBe(true);
    expect(r.plan?.fallart).toBe("einzel");
    expect(r.plan?.person1?.vorname).toBe("Hans");
  });
});

describe("plan-export.buildSnapshotFilename", () => {
  it("nutzt nachname_vorname slug", () => {
    const state = makeMinimalState();
    const name = buildSnapshotFilename(state);
    expect(name).toMatch(/^cuira-plan_mueller_hans_\d{4}-\d{2}-\d{2}\.json$/);
  });

  it("Fallback bei leerem Namen", () => {
    const state = makeMinimalState();
    state.person1 = {
      ...state.person1,
      nachname: "",
      vorname: "",
    };
    const name = buildSnapshotFilename(state);
    expect(name).toMatch(/^cuira-plan_kunde_\d{4}-\d{2}-\d{2}\.json$/);
  });
});

/**
 * Plan-Versionierung — Snapshots des PlanStore mit Diff-View.
 *
 * Differenziator vs. Logismata (kann Varianten, aber keine zeitliche
 * Historie sichtbar) und VZ (geschlossen). Ermöglicht:
 *  - "Plan A v3 vs. v2" — was hat sich seit dem letzten Termin geändert?
 *  - "auf v1 zurück" wenn der User ein Szenario verworfen hat
 *  - Audit-Trail für die Beratungs-Dokumentation
 *
 * Datenmodell:
 *  - VersionsHistorie wird in localStorage unter eigenem Key persistiert
 *    (NICHT im Hauptstore — würde sich gegenseitig serialisieren)
 *  - Pro Version ein vollständiger PlanState-Snapshot (kompakt JSON)
 *  - Max 20 Versionen, älteste werden bei Überschreitung gelöscht
 */

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PlanState } from "./store";
import { formatChf } from "./format";

const MAX_VERSIONEN = 20;

export interface PlanVersion {
  id: string;
  erstelltAm: string; // ISO
  notiz: string;
  /** Snapshot der relevanten Plan-Daten (ohne Setter-Funktionen). */
  snapshot: SerialPlan;
}

/**
 * Subset des PlanState ohne Setter — was tatsächlich serialisiert wird.
 * Gleich wie was zustand persist auch macht.
 */
export type SerialPlan = Omit<
  PlanState,
  // Alle Setter rausnehmen — Liste muss synchron mit PlanState gehalten werden,
  // aber zustand persist macht das automatisch via JSON.stringify.
  | "setFallart"
  | "setZivilstand"
  | "setAdresse"
  | "setPerson1"
  | "setPerson2"
  | "addKind"
  | "updateKind"
  | "removeKind"
  | "setZiele"
  | "addEinmaligAusgabe"
  | "updateEinmaligAusgabe"
  | "removeEinmaligAusgabe"
  | "addEinkommensperiode"
  | "updateEinkommensperiode"
  | "removeEinkommensperiode"
  | "setAusgabenModus"
  | "setAusgabenTotal"
  | "setAusgabenKategorie"
  | "setWunschverbrauchPension"
  | "setSteuerAnker"
  | "setReligion"
  | "setAhv"
  | "setBvgP1"
  | "setBvgP2"
  | "addFreizuegigkeit"
  | "updateFreizuegigkeit"
  | "removeFreizuegigkeit"
  | "addEinkauf"
  | "updateEinkauf"
  | "removeEinkauf"
  | "addSaeuleDrei"
  | "updateSaeuleDrei"
  | "removeSaeuleDrei"
  | "addVermoegen"
  | "updateVermoegen"
  | "removeVermoegen"
  | "setHauptkonto"
  | "addImmobilie"
  | "updateImmobilie"
  | "removeImmobilie"
  | "addHypothek"
  | "updateHypothek"
  | "removeHypothek"
  | "setNachlass"
  | "setFirma"
  | "setAnlagen"
  | "setErbschaft"
  | "setWohnortPlan"
  | "setVersicherungen"
  | "setPrioritaeten"
  | "setErweitert"
  | "setSzenarioBAktiv"
  | "setSzenarioBOverride"
  | "setAktiverBlock"
  | "reset"
  | "importState"
>;

interface VersionsState {
  versionen: PlanVersion[];

  /** Erstellt eine neue Version aus dem aktuellen PlanState. */
  saveVersion: (snapshot: SerialPlan, notiz: string) => string;
  /** Findet eine Version per ID. */
  getVersion: (id: string) => PlanVersion | undefined;
  /** Löscht eine Version. */
  removeVersion: (id: string) => void;
  /** Aktualisiert die Notiz einer bestehenden Version. */
  updateNotiz: (id: string, notiz: string) => void;
  /** Löscht alle Versionen (z.B. bei neuem Mandant). */
  clearAll: () => void;
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export const usePlanVersionenStore = create<VersionsState>()(
  persist(
    (set, get) => ({
      versionen: [],

      saveVersion: (snapshot, notiz) => {
        const id = newId();
        const v: PlanVersion = {
          id,
          erstelltAm: new Date().toISOString(),
          notiz: notiz.trim() || "Snapshot",
          // Deep-Clone via JSON-Roundtrip — entfernt allfällige Setter-Refs
          // und stellt sicher, dass keine Mutation der Live-Daten passiert.
          snapshot: JSON.parse(
            JSON.stringify(snapshot, (_k, val) =>
              typeof val === "function" ? undefined : val
            )
          ) as SerialPlan,
        };
        const next = [v, ...get().versionen].slice(0, MAX_VERSIONEN);
        set({ versionen: next });
        return id;
      },

      getVersion: (id) => get().versionen.find((v) => v.id === id),

      removeVersion: (id) =>
        set({ versionen: get().versionen.filter((v) => v.id !== id) }),

      updateNotiz: (id, notiz) =>
        set({
          versionen: get().versionen.map((v) =>
            v.id === id ? { ...v, notiz } : v
          ),
        }),

      clearAll: () => set({ versionen: [] }),
    }),
    {
      name: "cuira-plan-versionen-v1",
    }
  )
);

/* ═══════════════════════════════════════════════════════════════════════
   Diff-Logik — vergleicht 2 Versionen anhand der wichtigsten Eckwerte
   ═══════════════════════════════════════════════════════════════════════ */

export interface DiffEntry {
  pfad: string; // menschenlesbarer Pfad, z.B. "Pensionskasse P1 → Altersguthaben"
  alt: string;
  neu: string;
  kategorie:
    | "stammdaten"
    | "ziele"
    | "budget"
    | "ahv"
    | "bvg"
    | "saeule3"
    | "vermoegen"
    | "immobilien"
    | "firma"
    | "nachlass"
    | "sonstiges";
}

/**
 * Vergleicht zwei Plan-Snapshots und liefert eine Liste der relevanten
 * Unterschiede. Nur nicht-triviale Felder (z.B. nicht jeder UI-State).
 */
export function diffSnapshots(a: SerialPlan, b: SerialPlan): DiffEntry[] {
  const diffs: DiffEntry[] = [];
  const fmt = (v: unknown): string => {
    if (v == null || v === "") return "—";
    if (typeof v === "number") return formatChf(v);
    if (typeof v === "boolean") return v ? "ja" : "nein";
    return String(v);
  };

  const cmp = (
    pfad: string,
    alt: unknown,
    neu: unknown,
    kategorie: DiffEntry["kategorie"]
  ) => {
    const altS = fmt(alt);
    const neuS = fmt(neu);
    if (altS !== neuS) {
      diffs.push({ pfad, alt: altS, neu: neuS, kategorie });
    }
  };

  // Stammdaten
  cmp("Fall-Art", a.fallart, b.fallart, "stammdaten");
  cmp("Zivilstand", a.zivilstand, b.zivilstand, "stammdaten");
  cmp("Kanton", a.adresse.kanton, b.adresse.kanton, "stammdaten");
  cmp("Person 1 · Vorname", a.person1.vorname, b.person1.vorname, "stammdaten");
  cmp("Person 1 · Nachname", a.person1.nachname, b.person1.nachname, "stammdaten");
  cmp(
    "Person 1 · Geburtsdatum",
    a.person1.geburtsdatum,
    b.person1.geburtsdatum,
    "stammdaten"
  );
  if (a.fallart === "paar" || b.fallart === "paar") {
    cmp("Person 2 · Vorname", a.person2.vorname, b.person2.vorname, "stammdaten");
    cmp(
      "Person 2 · Nachname",
      a.person2.nachname,
      b.person2.nachname,
      "stammdaten"
    );
  }
  cmp("Anzahl Kinder", a.kinder.length, b.kinder.length, "stammdaten");

  // Ziele
  cmp(
    "Pensionsalter P1",
    a.ziele.bezugsalterP1,
    b.ziele.bezugsalterP1,
    "ziele"
  );
  if (a.fallart === "paar" || b.fallart === "paar") {
    cmp(
      "Pensionsalter P2",
      a.ziele.bezugsalterP2,
      b.ziele.bezugsalterP2,
      "ziele"
    );
  }

  // Budget
  cmp("Einkommen / Jahr", a.budget.einkommenHeute, b.budget.einkommenHeute, "budget");
  cmp("Ausgaben / Monat", a.budget.ausgabenTotal, b.budget.ausgabenTotal, "budget");
  cmp(
    "Wunschverbrauch Pension",
    a.budget.wunschverbrauchPension,
    b.budget.wunschverbrauchPension,
    "budget"
  );
  cmp("Steuern (Anker)", a.budget.steuernHeute, b.budget.steuernHeute, "budget");
  cmp("Religion", a.budget.religion, b.budget.religion, "budget");

  // AHV
  cmp("AHV · Massg. Eink. P1", a.ahv.einkommenP1, b.ahv.einkommenP1, "ahv");
  cmp("AHV · Bezugsalter P1", a.ahv.ahvBezugsalterP1, b.ahv.ahvBezugsalterP1, "ahv");
  cmp("AHV · Fehljahre P1", a.ahv.fehljahreAnzahlP1, b.ahv.fehljahreAnzahlP1, "ahv");
  if (a.fallart === "paar" || b.fallart === "paar") {
    cmp("AHV · Massg. Eink. P2", a.ahv.einkommenP2, b.ahv.einkommenP2, "ahv");
    cmp(
      "AHV · Bezugsalter P2",
      a.ahv.ahvBezugsalterP2,
      b.ahv.ahvBezugsalterP2,
      "ahv"
    );
  }

  // BVG
  cmp(
    "PK P1 · Altersguthaben heute",
    a.bvg.p1.altersguthabenHeute,
    b.bvg.p1.altersguthabenHeute,
    "bvg"
  );
  cmp(
    "PK P1 · Altersguthaben bei Bezug",
    a.bvg.p1.altersguthabenBeiBezug,
    b.bvg.p1.altersguthabenBeiBezug,
    "bvg"
  );
  cmp(
    "PK P1 · Umwandlungssatz",
    `${a.bvg.p1.umwandlungssatzProzent}%`,
    `${b.bvg.p1.umwandlungssatzProzent}%`,
    "bvg"
  );
  cmp(
    "PK P1 · Bezugsform",
    a.bvg.p1.bezugspraeferenz,
    b.bvg.p1.bezugspraeferenz,
    "bvg"
  );
  cmp(
    "PK P1 · Einkäufe (Anzahl)",
    a.bvg.p1.einkaeufe.length,
    b.bvg.p1.einkaeufe.length,
    "bvg"
  );
  if (a.fallart === "paar" || b.fallart === "paar") {
    cmp(
      "PK P2 · Altersguthaben heute",
      a.bvg.p2.altersguthabenHeute,
      b.bvg.p2.altersguthabenHeute,
      "bvg"
    );
    cmp(
      "PK P2 · Bezugsform",
      a.bvg.p2.bezugspraeferenz,
      b.bvg.p2.bezugspraeferenz,
      "bvg"
    );
  }

  // 3a
  const sum3aA =
    a.saeuleDrei.p1.reduce(
      (s, e) => s + (e.aktuellerWert ?? 0) + (e.rueckkaufswert ?? 0),
      0
    ) +
    a.saeuleDrei.p2.reduce(
      (s, e) => s + (e.aktuellerWert ?? 0) + (e.rueckkaufswert ?? 0),
      0
    );
  const sum3aB =
    b.saeuleDrei.p1.reduce(
      (s, e) => s + (e.aktuellerWert ?? 0) + (e.rueckkaufswert ?? 0),
      0
    ) +
    b.saeuleDrei.p2.reduce(
      (s, e) => s + (e.aktuellerWert ?? 0) + (e.rueckkaufswert ?? 0),
      0
    );
  cmp("Säule 3 · Total", sum3aA, sum3aB, "saeule3");
  cmp(
    "Säule 3 · Anzahl Konten/Policen",
    a.saeuleDrei.p1.length + a.saeuleDrei.p2.length,
    b.saeuleDrei.p1.length + b.saeuleDrei.p2.length,
    "saeule3"
  );

  // Vermögen
  const sumVA = a.vermoegen.items.reduce((s, it) => s + (it.saldoHeute ?? 0), 0);
  const sumVB = b.vermoegen.items.reduce((s, it) => s + (it.saldoHeute ?? 0), 0);
  cmp("Vermögen · Total", sumVA, sumVB, "vermoegen");
  cmp(
    "Vermögen · Positionen",
    a.vermoegen.items.length,
    b.vermoegen.items.length,
    "vermoegen"
  );

  // Immobilien
  cmp(
    "Immobilien · Anzahl",
    a.immobilien.items.length,
    b.immobilien.items.length,
    "immobilien"
  );
  const immoVerkA = a.immobilien.items.reduce(
    (s, im) => s + (im.verkehrswert ?? 0),
    0
  );
  const immoVerkB = b.immobilien.items.reduce(
    (s, im) => s + (im.verkehrswert ?? 0),
    0
  );
  cmp(
    "Immobilien · Verkehrswert Total",
    immoVerkA,
    immoVerkB,
    "immobilien"
  );
  const hypoA = a.immobilien.items.reduce(
    (s, im) => s + im.hypotheken.reduce((b2, h) => b2 + (h.hoehe ?? 0), 0),
    0
  );
  const hypoB = b.immobilien.items.reduce(
    (s, im) => s + im.hypotheken.reduce((b2, h) => b2 + (h.hoehe ?? 0), 0),
    0
  );
  cmp("Immobilien · Hypothek Total", hypoA, hypoB, "immobilien");

  // Firma
  cmp("Firma · vorhanden", a.firma.vorhanden, b.firma.vorhanden, "firma");
  if (a.firma.vorhanden || b.firma.vorhanden) {
    cmp("Firma · Name", a.firma.firmenname, b.firma.firmenname, "firma");
    cmp("Firma · Plan", a.firma.plan, b.firma.plan, "firma");
    cmp(
      "Firma · Verkaufserlös",
      a.firma.moeglicherVerkaufserloes,
      b.firma.moeglicherVerkaufserloes,
      "firma"
    );
  }

  // Nachlass
  for (const key of Object.keys(a.nachlass) as (keyof typeof a.nachlass)[]) {
    cmp(`Nachlass · ${key}`, a.nachlass[key], b.nachlass[key], "nachlass");
  }

  // Szenario B
  cmp(
    "Variante B · aktiv",
    a.szenarioB.aktiv,
    b.szenarioB.aktiv,
    "sonstiges"
  );

  return diffs;
}

export function diffsByCategory(
  diffs: DiffEntry[]
): Record<DiffEntry["kategorie"], DiffEntry[]> {
  const out: Record<DiffEntry["kategorie"], DiffEntry[]> = {
    stammdaten: [],
    ziele: [],
    budget: [],
    ahv: [],
    bvg: [],
    saeule3: [],
    vermoegen: [],
    immobilien: [],
    firma: [],
    nachlass: [],
    sonstiges: [],
  };
  for (const d of diffs) out[d.kategorie].push(d);
  return out;
}

export const KATEGORIE_LABELS: Record<DiffEntry["kategorie"], string> = {
  stammdaten: "Stammdaten",
  ziele: "Ziele",
  budget: "Budget",
  ahv: "1. Säule (AHV)",
  bvg: "2. Säule (PK)",
  saeule3: "3. Säule",
  vermoegen: "Vermögen",
  immobilien: "Immobilien",
  firma: "Firma",
  nachlass: "Nachlass",
  sonstiges: "Sonstiges",
};

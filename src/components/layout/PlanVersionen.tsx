"use client";

/**
 * Plan-Versionen-Modal — manage / compare / restore.
 *
 * Geöffnet über den Versionen-Button im Topbar (History-Icon).
 *
 * Features:
 *  - "Aktuell als Version speichern" mit Notiz-Eingabe
 *  - Liste aller Versionen (max 20, älteste rotieren)
 *  - Click auf Version → Vergleichs-View aktueller Plan vs. Version
 *  - "Diese Version laden" überschreibt den aktuellen Plan
 *
 * Differenziator: Logismata kann Varianten, aber keine zeitliche Historie.
 * VZ ist closed. TaxWare hat keine Versionierung.
 */

import { useState } from "react";
import {
  X,
  GitBranch,
  Save,
  Trash2,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";
import { usePlanStore } from "@/lib/store";
import {
  usePlanVersionenStore,
  diffSnapshots,
  diffsByCategory,
  KATEGORIE_LABELS,
  type PlanVersion,
  type SerialPlan,
  type DiffEntry,
} from "@/lib/plan-versionen";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function PlanVersionenModal({ open, onClose }: Props) {
  const [view, setView] = useState<"list" | "compare" | "save">("list");
  const [comparingId, setComparingId] = useState<string | null>(null);
  const [neuNotiz, setNeuNotiz] = useState("");

  const versionen = usePlanVersionenStore((s) => s.versionen);
  const saveVersion = usePlanVersionenStore((s) => s.saveVersion);
  const removeVersion = usePlanVersionenStore((s) => s.removeVersion);

  if (!open) return null;

  const closeAll = () => {
    setView("list");
    setComparingId(null);
    setNeuNotiz("");
    onClose();
  };

  const handleSave = () => {
    const currentState = usePlanStore.getState();
    saveVersion(currentState as unknown as SerialPlan, neuNotiz);
    setNeuNotiz("");
    setView("list");
  };

  const handleRestore = (v: PlanVersion) => {
    if (
      !window.confirm(
        `Aktuellen Plan überschreiben mit Version vom ${formatDatum(v.erstelltAm)}?\n\n„${v.notiz}"\n\nDer aktuelle Plan geht verloren — wenn du ihn behalten willst, speichere ihn vorher als neue Version.`
      )
    ) {
      return;
    }
    usePlanStore.getState().importState(v.snapshot);
    closeAll();
  };

  const handleDelete = (v: PlanVersion) => {
    if (
      !window.confirm(
        `Version „${v.notiz}" vom ${formatDatum(v.erstelltAm)} löschen?`
      )
    ) {
      return;
    }
    removeVersion(v.id);
  };

  const comparing = comparingId
    ? versionen.find((v) => v.id === comparingId)
    : null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center"
      style={{
        background: "rgba(10, 37, 64, 0.4)",
        backdropFilter: "blur(4px)",
        paddingTop: "8vh",
        paddingBottom: "4vh",
      }}
      onClick={closeAll}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[84vh] w-[92%] max-w-[760px] flex-col overflow-hidden rounded-[14px] border shadow-[var(--shadow-pop)]"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        {/* Header */}
        <header
          className="flex items-center justify-between gap-3 border-b px-5 py-3"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2">
            {view !== "list" && (
              <button
                type="button"
                onClick={() => {
                  setView("list");
                  setComparingId(null);
                }}
                className="cui-topbar-icon-btn"
                title="Zurück zur Liste"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <GitBranch
              className="h-4 w-4"
              style={{ color: "var(--accent-ink)" }}
            />
            <h2
              className="text-[15px] font-semibold"
              style={{ color: "var(--ink)" }}
            >
              {view === "compare"
                ? `Vergleich · ${comparing?.notiz ?? ""}`
                : view === "save"
                ? "Neue Version speichern"
                : "Plan-Versionen"}
            </h2>
            {view === "list" && (
              <span
                className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                style={{
                  background: "var(--surface-2)",
                  color: "var(--ink-3)",
                }}
              >
                {versionen.length} / 20
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={closeAll}
            className="cui-topbar-icon-btn"
            title="Schliessen"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {view === "list" && (
            <ListView
              versionen={versionen}
              onSave={() => setView("save")}
              onCompare={(id) => {
                setComparingId(id);
                setView("compare");
              }}
              onRestore={handleRestore}
              onDelete={handleDelete}
            />
          )}

          {view === "save" && (
            <SaveView
              notiz={neuNotiz}
              setNotiz={setNeuNotiz}
              onSubmit={handleSave}
              onCancel={() => setView("list")}
            />
          )}

          {view === "compare" && comparing && (
            <CompareView
              version={comparing}
              onRestore={() => handleRestore(comparing)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   List View
   ═══════════════════════════════════════════════════════════════════════ */

function ListView({
  versionen,
  onSave,
  onCompare,
  onRestore,
  onDelete,
}: {
  versionen: PlanVersion[];
  onSave: () => void;
  onCompare: (id: string) => void;
  onRestore: (v: PlanVersion) => void;
  onDelete: (v: PlanVersion) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Save-Trigger */}
      <button
        type="button"
        onClick={onSave}
        className="cui-btn cui-btn-primary w-full justify-center"
      >
        <Save className="h-4 w-4" />
        Aktuellen Plan als Version speichern
      </button>

      {/* Empty state */}
      {versionen.length === 0 && (
        <div
          className="rounded-[10px] border border-dashed p-6 text-center text-[12.5px]"
          style={{
            borderColor: "var(--border-strong)",
            background: "var(--surface-2)",
            color: "var(--ink-3)",
          }}
        >
          Noch keine Versionen gespeichert.
          <br />
          Speichere den aktuellen Plan, um später vergleichen oder
          zurückwechseln zu können.
        </div>
      )}

      {/* List */}
      {versionen.length > 0 && (
        <ul className="space-y-2">
          {versionen.map((v, i) => (
            <li
              key={v.id}
              className="flex items-start gap-3 rounded-[10px] border p-3 transition-colors hover:bg-[var(--surface-hover)]"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-mono font-semibold"
                style={{
                  background: i === 0 ? "var(--accent)" : "var(--surface-2)",
                  color: i === 0 ? "white" : "var(--ink-3)",
                }}
              >
                v{versionen.length - i}
              </div>

              <div className="flex-1 min-w-0">
                <div
                  className="text-[13px] font-medium"
                  style={{ color: "var(--ink)" }}
                >
                  {v.notiz}
                </div>
                <div
                  className="mt-0.5 text-[11px]"
                  style={{ color: "var(--ink-3)" }}
                >
                  {formatDatum(v.erstelltAm)}
                </div>
              </div>

              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => onCompare(v.id)}
                  className="rounded-md border px-2 py-1 text-[11px] transition-colors hover:bg-[var(--surface-hover)]"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--ink-2)",
                  }}
                  title="Diff zum aktuellen Plan"
                >
                  Vergleich
                </button>
                <button
                  type="button"
                  onClick={() => onRestore(v)}
                  className="cui-topbar-icon-btn"
                  title="Diese Version laden"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(v)}
                  className="cui-topbar-icon-btn"
                  title="Löschen"
                  style={{ color: "var(--ink-3)" }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p
        className="text-[10.5px]"
        style={{ color: "var(--ink-3)" }}
      >
        Versionen werden im Browser-LocalStorage gespeichert (max 20 — älteste
        werden bei Überschreitung gelöscht). Mit Etappe 4 kommen sie in die
        Cloud-DB.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Save View
   ═══════════════════════════════════════════════════════════════════════ */

function SaveView({
  notiz,
  setNotiz,
  onSubmit,
  onCancel,
}: {
  notiz: string;
  setNotiz: (s: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-3">
      <p
        className="text-[12.5px] leading-relaxed"
        style={{ color: "var(--ink-2)" }}
      >
        Speichert den aktuellen Plan-Stand als Snapshot. Du kannst später
        zurückwechseln oder Versionen vergleichen.
      </p>
      <label className="block">
        <span
          className="mb-1.5 block text-[12px] font-medium"
          style={{ color: "var(--ink-2)" }}
        >
          Notiz / Begründung
        </span>
        <input
          type="text"
          autoFocus
          value={notiz}
          onChange={(e) => setNotiz(e.target.value)}
          placeholder={`z.B. „Vor PK-Einkauf-Szenario" oder „Nach Beratungstermin 11.05."`}
          className="cui-input"
        />
        <span
          className="mt-1 block text-[10.5px]"
          style={{ color: "var(--ink-3)" }}
        >
          Optional — wenn leer, wird „Snapshot" als Notiz verwendet.
        </span>
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="cui-btn cui-btn-ghost"
        >
          Abbrechen
        </button>
        <button
          type="button"
          onClick={onSubmit}
          className="cui-btn cui-btn-primary"
        >
          <Save className="h-4 w-4" />
          Speichern
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Compare View
   ═══════════════════════════════════════════════════════════════════════ */

function CompareView({
  version,
  onRestore,
}: {
  version: PlanVersion;
  onRestore: () => void;
}) {
  const aktuell = usePlanStore.getState();
  const diffs = diffSnapshots(
    version.snapshot,
    aktuell as unknown as SerialPlan
  );
  const grouped = diffsByCategory(diffs);
  const kategorien = (Object.keys(grouped) as Array<keyof typeof grouped>).filter(
    (k) => grouped[k].length > 0
  );

  return (
    <div className="space-y-4">
      <div
        className="rounded-md border p-3 text-[12px]"
        style={{
          background: "var(--surface-2)",
          borderColor: "var(--border)",
          color: "var(--ink-2)",
        }}
      >
        <div
          className="mb-1 text-[10px] font-medium uppercase tracking-wider"
          style={{ color: "var(--ink-3)" }}
        >
          Vergleich
        </div>
        <div>
          Version vom {formatDatum(version.erstelltAm)} ({version.notiz}) ↔
          aktueller Plan
        </div>
      </div>

      {diffs.length === 0 && (
        <div
          className="rounded-[10px] border border-dashed p-6 text-center text-[12.5px]"
          style={{
            borderColor: "var(--border-strong)",
            background: "var(--surface-2)",
            color: "var(--ink-3)",
          }}
        >
          Keine Unterschiede — der Plan ist identisch zur Version.
        </div>
      )}

      {kategorien.map((k) => (
        <DiffSection key={k} titel={KATEGORIE_LABELS[k]} diffs={grouped[k]} />
      ))}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onRestore}
          className="cui-btn cui-btn-primary"
        >
          <RotateCcw className="h-4 w-4" />
          Diese Version laden
        </button>
      </div>
    </div>
  );
}

function DiffSection({
  titel,
  diffs,
}: {
  titel: string;
  diffs: DiffEntry[];
}) {
  return (
    <div>
      <div
        className="mb-2 text-[10.5px] font-mono font-semibold uppercase tracking-wider"
        style={{ color: "var(--ink-3)" }}
      >
        {titel} · {diffs.length} Änderung{diffs.length > 1 ? "en" : ""}
      </div>
      <div
        className="overflow-hidden rounded-[10px] border"
        style={{ borderColor: "var(--border)" }}
      >
        <table className="w-full text-[12px]">
          <thead>
            <tr
              className="border-b"
              style={{
                background: "var(--surface-2)",
                borderColor: "var(--border)",
              }}
            >
              <th
                className="px-3 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider"
                style={{ color: "var(--ink-3)" }}
              >
                Feld
              </th>
              <th
                className="px-3 py-1.5 text-right text-[10px] font-medium uppercase tracking-wider"
                style={{ color: "var(--ink-3)" }}
              >
                Version
              </th>
              <th
                className="px-3 py-1.5 text-right text-[10px] font-medium uppercase tracking-wider"
                style={{ color: "var(--ink-3)" }}
              >
                Aktuell
              </th>
            </tr>
          </thead>
          <tbody>
            {diffs.map((d, i) => (
              <tr
                key={i}
                className={i < diffs.length - 1 ? "border-b" : ""}
                style={{ borderColor: "var(--border)" }}
              >
                <td
                  className="px-3 py-2"
                  style={{ color: "var(--ink-2)" }}
                >
                  {d.pfad}
                </td>
                <td
                  className="px-3 py-2 text-right font-mono tabular-nums"
                  style={{ color: "var(--ink-3)" }}
                >
                  {d.alt}
                </td>
                <td
                  className="px-3 py-2 text-right font-mono font-medium tabular-nums"
                  style={{ color: "var(--ink)" }}
                >
                  {d.neu}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════ */

function formatDatum(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sekDiff = Math.round((now.getTime() - d.getTime()) / 1000);
  if (sekDiff < 60) return "gerade eben";
  if (sekDiff < 3600) return `vor ${Math.round(sekDiff / 60)} Min`;
  if (sekDiff < 86400) return `vor ${Math.round(sekDiff / 3600)} Std`;
  return d.toLocaleString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

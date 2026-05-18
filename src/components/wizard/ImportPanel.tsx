"use client";

import { useRef, useState } from "react";
import { usePlanStore } from "@/lib/store";
import {
  buildSnapshot,
  buildSnapshotFilename,
  parseSnapshot,
  snapshotToJson,
} from "@/lib/plan-export";
import { useBeraterProfil } from "@/lib/berater-profil";

/**
 * Daten Import/Export-Panel.
 *
 * IMPORT: akzeptiert zwei JSON-Formate (Auto-Erkennung in parseSnapshot):
 *  1. Pro-Tool-Snapshot (`format: "cuira-pro-snapshot"`) — vorher per
 *     Export-Knopf hier erzeugt; läuft durch Migration-Chain wenn aus
 *     älterer Schema-Version.
 *  2. FlowAntworten (V2-Erfassung) — Berater hat per Email vom
 *     Kunden-Erfassungs-Flow erhalten.
 *
 * EXPORT: schreibt aktuellen Pro-Tool-State als Pro-Snapshot-JSON, damit
 * der Berater die Datei lokal speichern + später wieder importieren kann.
 * Setter-Funktionen werden beim Serialisieren ausgefiltert.
 */
interface ImportPanelProps {
  /** Wenn gesetzt: Komponente ist immer offen, Schliessen ruft onClose auf. */
  controlled?: { onClose: () => void };
}

export function ImportPanel({ controlled }: ImportPanelProps = {}) {
  const importState = usePlanStore((s) => s.importState);
  const { profil: beraterProfil } = useBeraterProfil();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [status, setStatus] = useState<{
    type: "info" | "ok" | "error";
    msg: string;
  } | null>(null);
  const isControlled = !!controlled;
  const isOpen = isControlled || open;

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      applyJson(text, `Datei "${file.name}"`);
    } catch (e) {
      setStatus({
        type: "error",
        msg: `Datei konnte nicht gelesen werden: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  };

  const applyJson = (text: string, source: string) => {
    const result = parseSnapshot(text);
    if (!result.ok || !result.plan) {
      setStatus({ type: "error", msg: `${source}: ${result.hinweis}` });
      return;
    }
    importState(result.plan);
    setStatus({ type: "ok", msg: `${source}: ${result.hinweis}` });
    setPasteText("");
    if (controlled) controlled.onClose();
    else setOpen(false);
  };

  const handleExport = () => {
    const state = usePlanStore.getState();
    const snap = buildSnapshot(state, beraterProfil.name);
    const json = snapshotToJson(snap);
    const filename = buildSnapshotFilename(state);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatus({
      type: "ok",
      msg: `Snapshot heruntergeladen: ${filename}`,
    });
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setStatus(null);
        }}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 hover:border-slate-400 hover:bg-slate-50"
        title="Plan-Daten importieren oder als JSON-Snapshot exportieren"
      >
        ⇅ Daten Import / Export
      </button>
    );
  }

  return (
    <div className="rounded-md border border-slate-300 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-700">
            Daten Import / Export
          </div>
          <div className="text-xs text-slate-500">
            Pro-Tool-Snapshot speichern · Erfassungs-JSON oder älteren Snapshot
            laden
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (controlled) controlled.onClose();
            else setOpen(false);
          }}
          className="text-xs text-slate-500 hover:underline"
        >
          Schliessen
        </button>
      </div>

      <div className="space-y-5">
        {/* ─── EXPORT ─── */}
        <div className="rounded-md border border-emerald-200 bg-emerald-50/50 p-3">
          <div className="mb-2 text-xs font-semibold text-emerald-900">
            ⬆ Snapshot exportieren
          </div>
          <p className="mb-2 text-xs text-emerald-800">
            Lädt den aktuellen Plan-Zustand als JSON-Datei herunter. Datei
            kann später hier wieder importiert werden — auch nach Tool-Updates
            (Migrations-Logik eingebaut).
          </p>
          <button
            type="button"
            onClick={handleExport}
            className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700"
          >
            Snapshot herunterladen
          </button>
        </div>

        {/* ─── IMPORT ─── */}
        <div className="rounded-md border border-slate-200 bg-slate-50/50 p-3">
          <div className="mb-2 text-xs font-semibold text-slate-700">
            ⬇ Snapshot importieren
          </div>
          <p className="mb-2 text-xs text-slate-600">
            Erkennt automatisch: Pro-Tool-Snapshot (aus früherem Export) oder
            V2-Erfassungs-JSON (per Email vom Kunden-Erfassungs-Flow).
          </p>

          <div className="space-y-3">
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md bg-[var(--color-cuira-deep)] px-3 py-2 text-xs font-medium text-white hover:opacity-90"
              >
                Datei wählen …
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>

            <div className="text-center text-xs text-slate-400">— oder —</div>

            <div>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder='JSON hier einfügen … {"format": "cuira-pro-snapshot", ...} oder {"plan": {...}, "erfasstAm": ...}'
                rows={4}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => applyJson(pasteText, "Paste-Eingabe")}
                disabled={pasteText.trim().length === 0}
                className="mt-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                JSON übernehmen
              </button>
            </div>
          </div>
        </div>

        {status && (
          <div
            className={`rounded-md border px-3 py-2 text-xs ${
              status.type === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : status.type === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-800"
                  : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            {status.msg}
          </div>
        )}
      </div>
    </div>
  );
}

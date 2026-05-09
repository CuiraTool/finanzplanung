"use client";

import { useRef, useState } from "react";
import { usePlanStore, type PlanState } from "@/lib/store";
import type { FlowAntworten } from "@/flow/types";

/**
 * Import-Panel im Hauptool.
 *
 * Akzeptiert ein JSON-File oder Paste-Text mit einem FlowAntworten-Output
 * (aus V2-Erfassung). Übernimmt den Plan-Snapshot in den Hauptstore.
 *
 * Sicherheits-Idee: nur die "Daten-Felder" aus snapshot.plan werden übernommen,
 * keine Setter-Funktionen (die kommen aus dem Store-Init). Berater-Meta wird
 * angezeigt aber nicht in den Store geschrieben.
 */
interface ImportPanelProps {
  /** Wenn gesetzt: Komponente ist immer offen, kein eigener Trigger,
   *  Schließen ruft onClose auf. */
  controlled?: { onClose: () => void };
}

export function ImportPanel({ controlled }: ImportPanelProps = {}) {
  const importState = usePlanStore((s) => s.importState);
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
    let parsed: FlowAntworten;
    try {
      parsed = JSON.parse(text) as FlowAntworten;
    } catch {
      setStatus({
        type: "error",
        msg: `${source}: ungültiges JSON`,
      });
      return;
    }
    if (!parsed.plan || typeof parsed.plan !== "object") {
      setStatus({
        type: "error",
        msg: `${source}: kein gültiger Cuira-Erfassungs-JSON`,
      });
      return;
    }

    // State der Store-Methoden behalten — nur Datenfelder überschreiben
    const current = usePlanStore.getState();
    const merged: Partial<PlanState> = {
      ...parsed.plan,
    };
    importState(merged);
    const beraterName = parsed.beraterMeta?.beraterName ?? "(ohne Berater-Meta)";
    const kunde =
      parsed.beraterMeta?.kundeP1Name ?? current.person1.vorname ?? "Kunde";
    setStatus({
      type: "ok",
      msg: `Importiert: ${kunde} (von ${beraterName}, ${parsed.erfasstAm.slice(0, 10)})`,
    });
    setPasteText("");
    if (controlled) controlled.onClose();
    else setOpen(false);
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
        title="JSON aus V2-Erfassung importieren"
      >
        ⬇ Daten importieren
      </button>
    );
  }

  return (
    <div className="rounded-md border border-slate-300 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-700">
            Daten importieren
          </div>
          <div className="text-xs text-slate-500">
            JSON aus V2-Erfassung (per Email erhalten)
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

      <div className="space-y-3">
        {/* File upload */}
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

        {/* Paste */}
        <div>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder='JSON hier einfügen … {"plan": {...}, ...}'
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

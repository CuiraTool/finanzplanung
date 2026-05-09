"use client";

import { useMemo } from "react";
import { gemeindenForKanton } from "@/engine/steuer-engine/locations";

const selectClass =
  "w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200";

interface Props {
  kanton: string;
  bfsId: number | null;
  onChange: (bfsId: number | null, name: string) => void;
}

/**
 * Dropdown mit allen Gemeinden des gewählten Kantons.
 * Leerer Wert = "Hauptort des Kantons" (Default-Verhalten der Steuer-Engine).
 */
export function GemeindeSelect({ kanton, bfsId, onChange }: Props) {
  const gemeinden = useMemo(() => gemeindenForKanton(kanton), [kanton]);

  if (gemeinden.length === 0) {
    return (
      <p className="text-xs text-slate-400">
        Keine Gemeinden für Kanton {kanton} verfügbar.
      </p>
    );
  }

  return (
    <select
      value={bfsId ?? ""}
      onChange={(e) => {
        const v = e.target.value;
        if (!v) {
          onChange(null, "");
          return;
        }
        const id = Number(v);
        const g = gemeinden.find((x) => x.BfsID === id);
        onChange(id, g?.BfsName ?? "");
      }}
      className={selectClass}
    >
      <option value="">— Hauptort {kanton} —</option>
      {gemeinden.map((g) => (
        <option key={g.BfsID} value={g.BfsID}>
          {g.BfsName}
        </option>
      ))}
    </select>
  );
}

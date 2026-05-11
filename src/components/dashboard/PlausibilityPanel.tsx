"use client";

import { useMemo } from "react";
import { usePlanStore } from "@/lib/store";
import { checkePlan, type PlausibilitySchwere } from "@/lib/plausibility";

/**
 * Plausibilitäts-Panel — Berater-Fehlersicherung im Dashboard.
 *
 * Zeigt nur an wenn mindestens ein Hinweis vorhanden. Nach Schweregrad
 * sortiert (Fehler → Warnung → Info). Pro Hinweis: Block-Sprungmarke,
 * Schwere-Pill, Text.
 *
 * Differenziator: Cuira validiert, Wettbewerber rechnen einfach durch.
 */
export function PlausibilityPanel() {
  const state = usePlanStore();
  const hinweise = useMemo(() => checkePlan(state), [state]);

  if (hinweise.length === 0) return null;

  // Sortieren: fehler > warnung > info, dann nach Block
  const sortiert = [...hinweise].sort((a, b) => {
    const ord = { fehler: 0, warnung: 1, info: 2 } as const;
    if (ord[a.schwere] !== ord[b.schwere]) return ord[a.schwere] - ord[b.schwere];
    return a.block.localeCompare(b.block);
  });

  const counts = {
    fehler: hinweise.filter((h) => h.schwere === "fehler").length,
    warnung: hinweise.filter((h) => h.schwere === "warnung").length,
    info: hinweise.filter((h) => h.schwere === "info").length,
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4">
      <header className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="text-sm font-semibold text-amber-900">
            Plausibilitäts-Check
          </div>
          <div className="text-xs text-amber-700/80">
            {hinweise.length} Hinweise · vor PDF-Versand prüfen
          </div>
        </div>
        <div className="flex gap-2 text-[10px]">
          {counts.fehler > 0 && (
            <CountPill schwere="fehler" n={counts.fehler} />
          )}
          {counts.warnung > 0 && (
            <CountPill schwere="warnung" n={counts.warnung} />
          )}
          {counts.info > 0 && <CountPill schwere="info" n={counts.info} />}
        </div>
      </header>
      <ul className="space-y-1.5">
        {sortiert.map((h) => (
          <li
            key={h.id}
            className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${
              h.schwere === "fehler"
                ? "border-rose-200 bg-rose-50"
                : h.schwere === "warnung"
                  ? "border-amber-200 bg-amber-50"
                  : "border-slate-200 bg-slate-50"
            }`}
          >
            <SchwereDot schwere={h.schwere} />
            <div className="flex-1">
              <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Block {h.block}
              </div>
              <div
                className={
                  h.schwere === "fehler"
                    ? "text-rose-800"
                    : h.schwere === "warnung"
                      ? "text-amber-800"
                      : "text-slate-700"
                }
              >
                {h.text}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CountPill({
  schwere,
  n,
}: {
  schwere: PlausibilitySchwere;
  n: number;
}) {
  const farbe = {
    fehler: "bg-rose-100 text-rose-800 border-rose-300",
    warnung: "bg-amber-100 text-amber-800 border-amber-300",
    info: "bg-slate-100 text-slate-700 border-slate-300",
  }[schwere];
  const label = {
    fehler: "Fehler",
    warnung: "Warnung",
    info: "Info",
  }[schwere];
  return (
    <span
      className={`rounded-full border px-2 py-0.5 font-semibold uppercase tracking-wider ${farbe}`}
    >
      {n} {label}
    </span>
  );
}

function SchwereDot({ schwere }: { schwere: PlausibilitySchwere }) {
  const farbe = {
    fehler: "bg-rose-500",
    warnung: "bg-amber-500",
    info: "bg-slate-400",
  }[schwere];
  return (
    <span
      className={`mt-1.5 inline-block size-2 shrink-0 rounded-full ${farbe}`}
    />
  );
}

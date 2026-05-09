"use client";

import { useInflation } from "@/lib/inflation";

/**
 * Toggle für die Inflations-Anzeige im Dashboard.
 *
 * Zeigt einen Schalter "Heute / Nominal" und bei "Heute" eine
 * Rate-Eingabe (Default 1.5 %).
 */
export function InflationToggle() {
  const { enabled, rateProzent, toggle, setRate } = useInflation();

  return (
    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs">
      <span className="text-slate-500">Anzeige:</span>
      <button
        type="button"
        onClick={toggle}
        title={
          enabled
            ? "Werte sind kaufkraftbereinigt (in heutigen CHF)"
            : "Werte nominal (CHF in zukünftigen Jahren)"
        }
        className={`flex items-center gap-1 rounded border px-2 py-0.5 font-medium transition-colors ${
          enabled
            ? "border-[var(--color-cuira-deep)] bg-[var(--color-cuira-deep)] text-white"
            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        {enabled ? "Heutige Kaufkraft" : "Nominal"}
      </button>
      {enabled && (
        <label className="flex items-center gap-1 text-slate-500">
          <span>Inflation</span>
          <input
            type="number"
            value={rateProzent}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n) && n >= 0 && n <= 10) setRate(n);
            }}
            step={0.1}
            min={0}
            max={10}
            className="w-12 rounded border border-slate-300 bg-white px-1 py-0.5 text-center tabular-nums focus:border-[var(--color-cuira-deep)] focus:outline-none focus:ring-1 focus:ring-[var(--color-cuira-deep)]/20"
          />
          <span>% p.a.</span>
        </label>
      )}
    </div>
  );
}

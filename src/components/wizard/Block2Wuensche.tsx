"use client";

import { usePlanStore } from "@/lib/store";

export function Block2Wuensche() {
  const fallart = usePlanStore((s) => s.fallart);
  const ziele = usePlanStore((s) => s.ziele);
  const setZiele = usePlanStore((s) => s.setZiele);

  return (
    <div className="space-y-6">
      <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">
          Pensionierung
          <span className="ml-2 text-xs font-normal text-slate-400">
            Wunschalter zwischen 58 und 70
          </span>
        </legend>
        <Field label="Pensionierungsalter Person 1">
          <input
            type="number"
            min={58}
            max={70}
            value={ziele.bezugsalterP1}
            onChange={(e) => setZiele({ bezugsalterP1: Number(e.target.value) })}
            className="w-24 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm tabular-nums focus:border-blue-500 focus:outline-none"
          />
        </Field>
        {fallart === "paar" && (
          <Field label="Pensionierungsalter Person 2">
            <input
              type="number"
              min={58}
              max={70}
              value={ziele.bezugsalterP2}
              onChange={(e) => setZiele({ bezugsalterP2: Number(e.target.value) })}
              className="w-24 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm tabular-nums focus:border-blue-500 focus:outline-none"
            />
          </Field>
        )}
      </fieldset>

      <p className="text-xs text-slate-400">
        Wunschverbrauch, einmalige Ausgaben und Lebensziele kommen mit dem nächsten Iterationsschritt.
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-slate-600">{label}</div>
      {children}
    </label>
  );
}

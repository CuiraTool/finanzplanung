"use client";

import { usePlanStore } from "@/lib/store";

export function Block3Budget() {
  const budget = usePlanStore((s) => s.budget);
  const setBudget = usePlanStore((s) => s.setBudget);

  return (
    <div className="space-y-6">
      <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">
          Monatlicher Verbrauch
          <span className="ml-2 text-xs font-normal text-slate-400">
            Haushalt total
          </span>
        </legend>

        <Field label="Aktuell (CHF/Monat)" hint="Lebenshaltung, Wohnen, Mobilität, Versicherungen, Diverses">
          <input
            type="number"
            inputMode="numeric"
            value={budget.monatlichHeute ?? ""}
            onChange={(e) =>
              setBudget({
                monatlichHeute: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            placeholder="z.B. 8'500"
            className={`${inputClass} tabular-nums`}
          />
        </Field>

        <Field label="Wunsch in Pensionierung (CHF/Monat)" hint="meist tiefer als heute (kein Pendeln, weniger Versicherungen)">
          <input
            type="number"
            inputMode="numeric"
            value={budget.monatlichPension ?? ""}
            onChange={(e) =>
              setBudget({
                monatlichPension: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            placeholder="z.B. 7'000"
            className={`${inputClass} tabular-nums`}
          />
        </Field>
      </fieldset>

      <p className="text-xs text-slate-400">
        Detaillierte Kategorien (Wohnen separat, Krankenkasse, Mobilität etc.) folgen,
        sobald die Cashflow-Engine ausgebaut ist.
      </p>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-slate-600">{label}</div>
      {hint && <div className="mb-1 text-xs text-slate-400">{hint}</div>}
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

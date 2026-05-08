"use client";

import { usePlanStore, type Fallart } from "@/lib/store";

const FALLARTEN: { value: Fallart; label: string }[] = [
  { value: "einzel", label: "Einzelperson" },
  { value: "paar", label: "Paar" },
];

export function Block1Personen() {
  const fallart = usePlanStore((s) => s.fallart);
  const person1 = usePlanStore((s) => s.person1);
  const person2 = usePlanStore((s) => s.person2);
  const setFallart = usePlanStore((s) => s.setFallart);
  const setPerson1 = usePlanStore((s) => s.setPerson1);
  const setPerson2 = usePlanStore((s) => s.setPerson2);

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">
          Fallart
        </label>
        <div className="flex gap-2">
          {FALLARTEN.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFallart(f.value)}
              className={`flex-1 rounded-md border px-3 py-2 text-sm transition ${
                fallart === f.value
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <PersonForm
        title="Person 1"
        person={person1}
        onChange={setPerson1}
      />

      {fallart === "paar" && (
        <PersonForm
          title="Person 2"
          person={person2}
          onChange={setPerson2}
        />
      )}
    </div>
  );
}

interface PersonFormProps {
  title: string;
  person: { geburtsdatum: string; massgebendesEinkommen: number | null; bezugsalter: number };
  onChange: (patch: Partial<{ geburtsdatum: string; massgebendesEinkommen: number | null; bezugsalter: number }>) => void;
}

function PersonForm({ title, person, onChange }: PersonFormProps) {
  return (
    <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <legend className="px-1 text-sm font-semibold text-slate-700">{title}</legend>

      <Field label="Geburtsdatum">
        <input
          type="date"
          value={person.geburtsdatum}
          onChange={(e) => onChange({ geburtsdatum: e.target.value })}
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </Field>

      <Field label="Massgebendes Jahreseinkommen (CHF)" hint="durchschnittlich über die Karriere">
        <input
          type="number"
          inputMode="numeric"
          value={person.massgebendesEinkommen ?? ""}
          onChange={(e) =>
            onChange({
              massgebendesEinkommen: e.target.value === "" ? null : Number(e.target.value),
            })
          }
          placeholder="z.B. 80'000"
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm tabular-nums focus:border-blue-500 focus:outline-none"
        />
      </Field>

      <Field label="Gewünschtes Pensionierungsalter">
        <input
          type="number"
          min={58}
          max={70}
          value={person.bezugsalter}
          onChange={(e) => onChange({ bezugsalter: Number(e.target.value) })}
          className="w-24 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm tabular-nums focus:border-blue-500 focus:outline-none"
        />
      </Field>
    </fieldset>
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

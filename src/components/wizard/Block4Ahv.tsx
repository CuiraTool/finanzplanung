"use client";

import { usePlanStore, type AhvInput, type TriState } from "@/lib/store";
import { personLabel } from "@/lib/pension";

const TRISTATE_OPTIONS: { value: TriState; label: string }[] = [
  { value: "ja", label: "Ja" },
  { value: "nein", label: "Nein" },
  { value: "unbekannt", label: "Weiss nicht" },
];

export function Block4Ahv() {
  const fallart = usePlanStore((s) => s.fallart);
  const person1 = usePlanStore((s) => s.person1);
  const person2 = usePlanStore((s) => s.person2);
  const ahv = usePlanStore((s) => s.ahv);
  const setAhv = usePlanStore((s) => s.setAhv);

  return (
    <div className="space-y-6">
      <PersonAhvForm
        title={personLabel(1, person1.vorname, fallart)}
        einkommen={ahv.einkommenP1}
        ikAuszug={ahv.ikAuszugP1}
        fehljahreStatus={ahv.fehljahreStatusP1}
        fehljahreAnzahl={ahv.fehljahreAnzahlP1}
        onPatch={(p) => setAhv(mapToP1(p))}
      />

      {fallart === "paar" && (
        <PersonAhvForm
          title={personLabel(2, person2.vorname, fallart)}
          einkommen={ahv.einkommenP2}
          ikAuszug={ahv.ikAuszugP2}
          fehljahreStatus={ahv.fehljahreStatusP2}
          fehljahreAnzahl={ahv.fehljahreAnzahlP2}
          onPatch={(p) => setAhv(mapToP2(p))}
        />
      )}

      <p className="text-xs text-slate-400">
        Frühbezug- und Aufschub-Logik (mit Bezugsalter aus Block 2) folgt im nächsten Iterationsschritt.
      </p>
    </div>
  );
}

interface PersonAhvPatch {
  einkommen?: number | null;
  ikAuszug?: TriState;
  fehljahreStatus?: TriState;
  fehljahreAnzahl?: number;
}

function mapToP1(p: PersonAhvPatch): Partial<AhvInput> {
  const r: Partial<AhvInput> = {};
  if (p.einkommen !== undefined) r.einkommenP1 = p.einkommen;
  if (p.ikAuszug !== undefined) r.ikAuszugP1 = p.ikAuszug;
  if (p.fehljahreStatus !== undefined) r.fehljahreStatusP1 = p.fehljahreStatus;
  if (p.fehljahreAnzahl !== undefined) r.fehljahreAnzahlP1 = p.fehljahreAnzahl;
  return r;
}

function mapToP2(p: PersonAhvPatch): Partial<AhvInput> {
  const r: Partial<AhvInput> = {};
  if (p.einkommen !== undefined) r.einkommenP2 = p.einkommen;
  if (p.ikAuszug !== undefined) r.ikAuszugP2 = p.ikAuszug;
  if (p.fehljahreStatus !== undefined) r.fehljahreStatusP2 = p.fehljahreStatus;
  if (p.fehljahreAnzahl !== undefined) r.fehljahreAnzahlP2 = p.fehljahreAnzahl;
  return r;
}

function PersonAhvForm({
  title,
  einkommen,
  ikAuszug,
  fehljahreStatus,
  fehljahreAnzahl,
  onPatch,
}: {
  title: string;
  einkommen: number | null;
  ikAuszug: TriState;
  fehljahreStatus: TriState;
  fehljahreAnzahl: number;
  onPatch: (p: PersonAhvPatch) => void;
}) {
  return (
    <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <legend className="px-1 text-sm font-semibold text-slate-700">{title}</legend>

      <Field
        label="Massgebendes Jahreseinkommen (CHF)"
        hint="durchschnittlich über die Karriere — laut IK-Auszug"
      >
        <input
          type="number"
          inputMode="numeric"
          value={einkommen ?? ""}
          onChange={(e) =>
            onPatch({
              einkommen: e.target.value === "" ? null : Number(e.target.value),
            })
          }
          placeholder="z.B. 80'000"
          className={`${inputClass} tabular-nums`}
        />
      </Field>

      <div>
        <div className="mb-1 text-xs font-medium text-slate-600">
          Aktueller IK-Auszug vorhanden?
        </div>
        <TriStateButtons value={ikAuszug} onChange={(v) => onPatch({ ikAuszug: v })} />
      </div>

      <div>
        <div className="mb-1 text-xs font-medium text-slate-600">
          Fehljahre in der AHV?
        </div>
        <div className="mb-1 text-xs text-slate-400">
          z.B. Auslandjahre, Studium ohne AHV-Beitrag, Lücken
        </div>
        <TriStateButtons
          value={fehljahreStatus}
          onChange={(v) =>
            onPatch({
              fehljahreStatus: v,
              ...(v !== "ja" ? { fehljahreAnzahl: 0 } : {}),
            })
          }
        />
        {fehljahreStatus === "ja" && (
          <div className="mt-3">
            <Field label="Anzahl Fehljahre">
              <input
                type="number"
                min={0}
                max={44}
                value={fehljahreAnzahl}
                onChange={(e) =>
                  onPatch({ fehljahreAnzahl: Number(e.target.value) })
                }
                className={`${inputClass} w-24 text-center tabular-nums`}
              />
            </Field>
          </div>
        )}
      </div>
    </fieldset>
  );
}

function TriStateButtons({
  value,
  onChange,
}: {
  value: TriState;
  onChange: (v: TriState) => void;
}) {
  return (
    <div className="flex gap-2">
      {TRISTATE_OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-md border px-3 py-2 text-sm transition ${
            value === o.value
              ? "border-blue-600 bg-blue-50 text-blue-700"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
          }`}
        >
          {o.label}
        </button>
      ))}
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

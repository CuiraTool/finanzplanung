"use client";

import { usePlanStore, type BezugsPraeferenz, type BvgInput } from "@/lib/store";
import { personLabel } from "@/lib/pension";

const PRAEFERENZEN: { value: BezugsPraeferenz; label: string; sub: string }[] = [
  { value: "rente", label: "Rente", sub: "100% verrentet" },
  { value: "kapital", label: "Kapital", sub: "100% einmalig" },
  { value: "mischung", label: "Mischung", sub: "Anteil wählbar" },
];

export function Block5Bvg() {
  const fallart = usePlanStore((s) => s.fallart);
  const person1 = usePlanStore((s) => s.person1);
  const person2 = usePlanStore((s) => s.person2);
  const bvg = usePlanStore((s) => s.bvg);
  const setBvg = usePlanStore((s) => s.setBvg);

  return (
    <div className="space-y-6">
      <PersonBvgForm
        title={personLabel(1, person1.vorname, fallart)}
        aktiv={bvg.aktiverAnschlussP1}
        altersguthaben={bvg.altersguthabenP1}
        praeferenz={bvg.bezugspraeferenzP1}
        kapitalanteil={bvg.kapitalanteilP1}
        onPatch={(p) => setBvg(mapToP1(p))}
      />

      {fallart === "paar" && (
        <PersonBvgForm
          title={personLabel(2, person2.vorname, fallart)}
          aktiv={bvg.aktiverAnschlussP2}
          altersguthaben={bvg.altersguthabenP2}
          praeferenz={bvg.bezugspraeferenzP2}
          kapitalanteil={bvg.kapitalanteilP2}
          onPatch={(p) => setBvg(mapToP2(p))}
        />
      )}

      <p className="text-xs text-slate-400">
        Freizügigkeitskonten, WEF-Bezüge und freiwillige Einkäufe folgen mit der
        nächsten Iteration.
      </p>
    </div>
  );
}

interface PersonBvgPatch {
  aktiv?: boolean;
  altersguthaben?: number | null;
  praeferenz?: BezugsPraeferenz;
  kapitalanteil?: number;
}

function mapToP1(p: PersonBvgPatch): Partial<BvgInput> {
  const r: Partial<BvgInput> = {};
  if (p.aktiv !== undefined) r.aktiverAnschlussP1 = p.aktiv;
  if (p.altersguthaben !== undefined) r.altersguthabenP1 = p.altersguthaben;
  if (p.praeferenz !== undefined) r.bezugspraeferenzP1 = p.praeferenz;
  if (p.kapitalanteil !== undefined) r.kapitalanteilP1 = p.kapitalanteil;
  return r;
}

function mapToP2(p: PersonBvgPatch): Partial<BvgInput> {
  const r: Partial<BvgInput> = {};
  if (p.aktiv !== undefined) r.aktiverAnschlussP2 = p.aktiv;
  if (p.altersguthaben !== undefined) r.altersguthabenP2 = p.altersguthaben;
  if (p.praeferenz !== undefined) r.bezugspraeferenzP2 = p.praeferenz;
  if (p.kapitalanteil !== undefined) r.kapitalanteilP2 = p.kapitalanteil;
  return r;
}

function PersonBvgForm({
  title,
  aktiv,
  altersguthaben,
  praeferenz,
  kapitalanteil,
  onPatch,
}: {
  title: string;
  aktiv: boolean;
  altersguthaben: number | null;
  praeferenz: BezugsPraeferenz;
  kapitalanteil: number;
  onPatch: (p: PersonBvgPatch) => void;
}) {
  return (
    <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <legend className="px-1 text-sm font-semibold text-slate-700">{title}</legend>

      <div>
        <div className="mb-1 text-xs font-medium text-slate-600">
          Aktiver PK-Anschluss?
        </div>
        <YesNoButtons value={aktiv} onChange={(v) => onPatch({ aktiv: v })} />
      </div>

      {aktiv && (
        <>
          <Field
            label="Aktuelles PK-Altersguthaben (CHF)"
            hint="laut letztem PK-Ausweis"
          >
            <input
              type="number"
              inputMode="numeric"
              value={altersguthaben ?? ""}
              onChange={(e) =>
                onPatch({
                  altersguthaben: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              placeholder="z.B. 450'000"
              className={`${inputClass} tabular-nums`}
            />
          </Field>

          <div>
            <div className="mb-1 text-xs font-medium text-slate-600">
              Bezugspräferenz
            </div>
            <div className="flex gap-2">
              {PRAEFERENZEN.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => onPatch({ praeferenz: p.value })}
                  className={`flex-1 rounded-md border px-3 py-2 text-left text-sm transition ${
                    praeferenz === p.value
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <div className="font-medium">{p.label}</div>
                  <div className="text-xs text-slate-400">{p.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {praeferenz === "mischung" && (
            <Field
              label={`Kapitalanteil: ${kapitalanteil}%`}
              hint={`→ Rentenanteil: ${100 - kapitalanteil}%`}
            >
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={kapitalanteil}
                onChange={(e) => onPatch({ kapitalanteil: Number(e.target.value) })}
                className="w-full"
              />
            </Field>
          )}
        </>
      )}
    </fieldset>
  );
}

function YesNoButtons({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex gap-2">
      {[
        { v: true, l: "Ja" },
        { v: false, l: "Nein" },
      ].map((o) => (
        <button
          key={o.l}
          type="button"
          onClick={() => onChange(o.v)}
          className={`flex-1 rounded-md border px-3 py-2 text-sm transition ${
            value === o.v
              ? "border-blue-600 bg-blue-50 text-blue-700"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
          }`}
        >
          {o.l}
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

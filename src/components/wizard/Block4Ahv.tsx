"use client";

import { usePlanStore, type AhvInput } from "@/lib/store";
import { personLabel } from "@/lib/pension";
import {
  bezugsfaktor,
  ORDENTLICHES_AHV_ALTER,
  MAX_VORBEZUG_JAHRE,
  MAX_AUFSCHUB_JAHRE,
} from "@/engine/ahv";

const AHV_ALTER_MIN = ORDENTLICHES_AHV_ALTER - MAX_VORBEZUG_JAHRE; // 63
const AHV_ALTER_MAX = ORDENTLICHES_AHV_ALTER + MAX_AUFSCHUB_JAHRE; // 70

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
        hatIkAuszug={ahv.hatIkAuszugP1}
        hatFehljahre={ahv.hatFehljahreP1}
        fehljahreAnzahl={ahv.fehljahreAnzahlP1}
        ahvBezugsalter={ahv.ahvBezugsalterP1}
        onPatch={(p) => setAhv(mapToP1(p))}
      />

      {fallart === "paar" && (
        <PersonAhvForm
          title={personLabel(2, person2.vorname, fallart)}
          einkommen={ahv.einkommenP2}
          hatIkAuszug={ahv.hatIkAuszugP2}
          hatFehljahre={ahv.hatFehljahreP2}
          fehljahreAnzahl={ahv.fehljahreAnzahlP2}
          ahvBezugsalter={ahv.ahvBezugsalterP2}
          onPatch={(p) => setAhv(mapToP2(p))}
        />
      )}

      <p className="text-xs text-slate-400">
        AHV-Bezugsalter ist unabhängig vom Pensionierungsalter (Block 2). Mit 63 in
        Pension gehen und AHV trotzdem mit 65 ordentlich beziehen ist möglich.
      </p>
    </div>
  );
}

interface PersonAhvPatch {
  einkommen?: number | null;
  hatIkAuszug?: boolean;
  hatFehljahre?: boolean;
  fehljahreAnzahl?: number;
  ahvBezugsalter?: number;
}

function mapToP1(p: PersonAhvPatch): Partial<AhvInput> {
  const r: Partial<AhvInput> = {};
  if (p.einkommen !== undefined) r.einkommenP1 = p.einkommen;
  if (p.hatIkAuszug !== undefined) r.hatIkAuszugP1 = p.hatIkAuszug;
  if (p.hatFehljahre !== undefined) r.hatFehljahreP1 = p.hatFehljahre;
  if (p.fehljahreAnzahl !== undefined) r.fehljahreAnzahlP1 = p.fehljahreAnzahl;
  if (p.ahvBezugsalter !== undefined) r.ahvBezugsalterP1 = p.ahvBezugsalter;
  return r;
}

function mapToP2(p: PersonAhvPatch): Partial<AhvInput> {
  const r: Partial<AhvInput> = {};
  if (p.einkommen !== undefined) r.einkommenP2 = p.einkommen;
  if (p.hatIkAuszug !== undefined) r.hatIkAuszugP2 = p.hatIkAuszug;
  if (p.hatFehljahre !== undefined) r.hatFehljahreP2 = p.hatFehljahre;
  if (p.fehljahreAnzahl !== undefined) r.fehljahreAnzahlP2 = p.fehljahreAnzahl;
  if (p.ahvBezugsalter !== undefined) r.ahvBezugsalterP2 = p.ahvBezugsalter;
  return r;
}

function PersonAhvForm({
  title,
  einkommen,
  hatIkAuszug,
  hatFehljahre,
  fehljahreAnzahl,
  ahvBezugsalter,
  onPatch,
}: {
  title: string;
  einkommen: number | null;
  hatIkAuszug: boolean;
  hatFehljahre: boolean;
  fehljahreAnzahl: number;
  ahvBezugsalter: number;
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

      <Field
        label="AHV-Bezugsalter"
        hint="63/64 = Vorbezug, 65 = ordentlich, 66–70 = Aufschub"
      >
        <div className="flex items-center gap-3">
          <select
            value={ahvBezugsalter}
            onChange={(e) =>
              onPatch({ ahvBezugsalter: Number(e.target.value) })
            }
            className={`${selectClass} w-24 text-center tabular-nums`}
          >
            {alterOptionen().map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <BezugsalterHint alter={ahvBezugsalter} />
        </div>
      </Field>

      <div>
        <div className="mb-1 text-xs font-medium text-slate-600">
          Aktueller IK-Auszug vorhanden?
        </div>
        <YesNoButtons value={hatIkAuszug} onChange={(v) => onPatch({ hatIkAuszug: v })} />
      </div>

      <div>
        <div className="mb-1 text-xs font-medium text-slate-600">
          Fehljahre in der AHV?
        </div>
        <div className="mb-1 text-xs text-slate-400">
          z.B. Auslandjahre, Studium ohne AHV-Beitrag, Lücken
        </div>
        <YesNoButtons
          value={hatFehljahre}
          onChange={(v) =>
            onPatch({
              hatFehljahre: v,
              ...(v === false ? { fehljahreAnzahl: 0 } : {}),
            })
          }
        />
        {hatFehljahre && (
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

function alterOptionen(): number[] {
  const out: number[] = [];
  for (let a = AHV_ALTER_MIN; a <= AHV_ALTER_MAX; a++) out.push(a);
  return out;
}

function BezugsalterHint({ alter }: { alter: number }) {
  if (alter === ORDENTLICHES_AHV_ALTER) {
    return (
      <span className="text-xs text-slate-500">
        ordentlich · Faktor 1.000
      </span>
    );
  }
  const faktor = bezugsfaktor(alter);
  const pct = ((faktor - 1) * 100).toFixed(1);
  if (alter < ORDENTLICHES_AHV_ALTER) {
    const jahre = ORDENTLICHES_AHV_ALTER - alter;
    return (
      <span className="text-xs text-amber-700">
        Vorbezug {jahre} J. · {pct}% · Faktor {faktor.toFixed(3)}
      </span>
    );
  }
  const jahre = alter - ORDENTLICHES_AHV_ALTER;
  return (
    <span className="text-xs text-emerald-700">
      Aufschub {jahre} J. · +{pct}% · Faktor {faktor.toFixed(3)}
    </span>
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
const selectClass = `${inputClass} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 12 12%22><path fill=%22%2364748b%22 d=%22M6 8L2 4h8z%22/></svg>')] bg-[length:12px] bg-[right_10px_center] bg-no-repeat pr-8`;

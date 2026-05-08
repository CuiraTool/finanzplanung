"use client";

import {
  usePlanStore,
  type Immobilie,
  type ImmobilienTyp,
  type ImmobilienPlan,
  type Hypothek,
} from "@/lib/store";
import { immobilienAufteilung, immobilieNettoHeute } from "@/engine/immobilien";
import { formatChf } from "@/lib/format";

const TYPEN: { value: ImmobilienTyp; label: string; sub: string }[] = [
  { value: "selbstbewohnt", label: "Selbstbewohnt", sub: "Eigenheim, Ferienhaus" },
  { value: "rendite", label: "Renditeliegenschaft", sub: "vermietet" },
];

const PLAENE: { value: ImmobilienPlan; label: string; sub: string }[] = [
  { value: "behalten", label: "Behalten", sub: "bleibt im Vermögen" },
  { value: "verkaufen", label: "Verkaufen", sub: "Erlös fliesst ins Vermögen" },
];

export function Block8Immobilien() {
  const items = usePlanStore((s) => s.immobilien.items);
  const addImmobilie = usePlanStore((s) => s.addImmobilie);
  const updateImmobilie = usePlanStore((s) => s.updateImmobilie);
  const removeImmobilie = usePlanStore((s) => s.removeImmobilie);
  const addHypothek = usePlanStore((s) => s.addHypothek);
  const updateHypothek = usePlanStore((s) => s.updateHypothek);
  const removeHypothek = usePlanStore((s) => s.removeHypothek);

  const aufteilung = immobilienAufteilung(
    items.map((im) => ({
      verkehrswert: im.verkehrswert,
      hypothekenSumme: hypothekenSumme(im.hypotheken),
      plan: im.plan,
      verkaufsjahr: im.verkaufsjahr,
    }))
  );

  return (
    <div className="space-y-6">
      <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">
          Immobilien
          <span className="ml-2 text-xs font-normal text-slate-400">
            selbstbewohnt oder Renditeliegenschaft
          </span>
        </legend>

        {items.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <KpiPill
              label="Verkehrswert"
              value={formatChf(aufteilung.aktivaImmobilien)}
            />
            <KpiPill label="Hypotheken" value={formatChf(aufteilung.hypothekenTotal)} />
            <KpiPill label="Netto" value={formatChf(aufteilung.netto)} bold />
          </div>
        )}

        {items.length === 0 && (
          <p className="text-xs text-slate-400">Noch keine Immobilie erfasst.</p>
        )}

        <ul className="space-y-3">
          {items.map((im, idx) => (
            <ImmobilieCard
              key={im.id}
              index={idx + 1}
              item={im}
              onUpdate={(p) => updateImmobilie(im.id, p)}
              onRemove={() => removeImmobilie(im.id)}
              onAddHypothek={() => addHypothek(im.id)}
              onUpdateHypothek={(hid, p) => updateHypothek(im.id, hid, p)}
              onRemoveHypothek={(hid) => removeHypothek(im.id, hid)}
            />
          ))}
        </ul>

        <button
          type="button"
          onClick={addImmobilie}
          className="w-full rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:border-slate-400 hover:text-slate-800"
        >
          + Immobilie hinzufügen
        </button>
      </fieldset>

      <p className="text-xs text-slate-400">
        Eigenmietwert + Schuldzinsabzug + Grundstückgewinnsteuer (kantonal) folgen
        mit der Steuer-Engine in Etappe 2.
      </p>
    </div>
  );
}

function hypothekenSumme(hypotheken: Hypothek[]): number {
  return hypotheken.reduce((s, h) => s + (h.hoehe ?? 0), 0);
}

function ImmobilieCard({
  index,
  item,
  onUpdate,
  onRemove,
  onAddHypothek,
  onUpdateHypothek,
  onRemoveHypothek,
}: {
  index: number;
  item: Immobilie;
  onUpdate: (p: Partial<Omit<Immobilie, "id" | "hypotheken">>) => void;
  onRemove: () => void;
  onAddHypothek: () => void;
  onUpdateHypothek: (hypothekId: string, p: Partial<Omit<Hypothek, "id">>) => void;
  onRemoveHypothek: (hypothekId: string) => void;
}) {
  const hypoSumme = hypothekenSumme(item.hypotheken);
  const netto = immobilieNettoHeute({
    verkehrswert: item.verkehrswert,
    hypothekenSumme: hypoSumme,
    plan: item.plan,
    verkaufsjahr: item.verkaufsjahr,
  });

  return (
    <li className="space-y-3 rounded-md border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">
          Immobilie {index}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-red-600 hover:underline"
        >
          Entfernen
        </button>
      </div>

      <Field label="Beschreibung">
        <input
          type="text"
          value={item.beschreibung}
          onChange={(e) => onUpdate({ beschreibung: e.target.value })}
          placeholder="z.B. Eigenheim Zürich"
          className={inputClass}
        />
      </Field>

      <div>
        <div className="mb-1 text-xs font-medium text-slate-600">Typ</div>
        <div className="flex gap-2">
          {TYPEN.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => onUpdate({ typ: t.value })}
              className={`flex-1 rounded-md border px-3 py-2 text-left text-sm transition ${
                item.typ === t.value
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <div className="font-medium">{t.label}</div>
              <div className="text-xs text-slate-400">{t.sub}</div>
            </button>
          ))}
        </div>
      </div>

      <Field label="Verkehrswert (CHF)">
        <input
          type="number"
          inputMode="numeric"
          value={item.verkehrswert ?? ""}
          onChange={(e) =>
            onUpdate({
              verkehrswert: e.target.value === "" ? null : Number(e.target.value),
            })
          }
          placeholder="z.B. 1'500'000"
          className={`${inputClass} tabular-nums`}
        />
      </Field>

      {item.typ === "rendite" && (
        <Field
          label="Jährliche Mieteinnahmen brutto (CHF)"
          hint="fliesst in den Cashflow — bei Verkauf ab Verkaufsjahr nicht mehr"
        >
          <input
            type="number"
            inputMode="numeric"
            value={item.jaehrlicheMieteinnahmen ?? ""}
            onChange={(e) =>
              onUpdate({
                jaehrlicheMieteinnahmen:
                  e.target.value === "" ? null : Number(e.target.value),
              })
            }
            placeholder="z.B. 48'000"
            className={`${inputClass} tabular-nums`}
          />
        </Field>
      )}

      <HypothekenListe
        hypotheken={item.hypotheken}
        onAdd={onAddHypothek}
        onUpdate={onUpdateHypothek}
        onRemove={onRemoveHypothek}
      />

      <div>
        <div className="mb-1 text-xs font-medium text-slate-600">
          Plan nach Pensionierung
        </div>
        <div className="flex gap-2">
          {PLAENE.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => onUpdate({ plan: p.value })}
              className={`flex-1 rounded-md border px-3 py-2 text-left text-sm transition ${
                item.plan === p.value
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

      {item.plan === "verkaufen" && (
        <Field label="Verkaufsjahr">
          <input
            type="number"
            min={2024}
            max={2080}
            value={item.verkaufsjahr}
            onChange={(e) => onUpdate({ verkaufsjahr: Number(e.target.value) })}
            className={`${inputClass} w-32 tabular-nums`}
          />
        </Field>
      )}

      {netto != null && (
        <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
          <span className="text-slate-500">
            {item.plan === "verkaufen"
              ? `Voraussichtliche Auszahlung im Jahr ${item.verkaufsjahr}:`
              : "Netto-Wert heute:"}
          </span>{" "}
          <span className="font-semibold tabular-nums text-slate-700">
            {formatChf(netto)}
          </span>
          <div className="mt-1 text-slate-400">
            Verkehrswert {formatChf(item.verkehrswert)} − Hypotheken {formatChf(hypoSumme)}
          </div>
        </div>
      )}
    </li>
  );
}

function HypothekenListe({
  hypotheken,
  onAdd,
  onUpdate,
  onRemove,
}: {
  hypotheken: Hypothek[];
  onAdd: () => void;
  onUpdate: (id: string, p: Partial<Omit<Hypothek, "id">>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-2 rounded-md border border-slate-100 bg-slate-50/50 p-3">
      <div>
        <div className="text-xs font-medium text-slate-700">Hypotheken</div>
        <div className="text-xs text-slate-400">
          mehrere Tranchen möglich, jeweils mit Zinssatz und Ablauf
        </div>
      </div>

      {hypotheken.length === 0 && (
        <p className="text-xs text-slate-400">Keine Hypothek erfasst.</p>
      )}

      <ul className="space-y-2">
        {hypotheken.map((h, idx) => (
          <li
            key={h.id}
            className="space-y-2 rounded-md border border-slate-200 bg-white p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Tranche {idx + 1}
              </span>
              <button
                type="button"
                onClick={() => onRemove(h.id)}
                className="text-xs text-red-600 hover:underline"
              >
                Entfernen
              </button>
            </div>
            <Field label="Beschreibung">
              <input
                type="text"
                value={h.beschreibung}
                onChange={(e) => onUpdate(h.id, { beschreibung: e.target.value })}
                placeholder="z.B. Festhypothek 5J Raiffeisen"
                className={inputClass}
              />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Höhe (CHF)">
                <input
                  type="number"
                  inputMode="numeric"
                  value={h.hoehe ?? ""}
                  onChange={(e) =>
                    onUpdate(h.id, {
                      hoehe: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  placeholder="z.B. 600'000"
                  className={`${inputClass} tabular-nums`}
                />
              </Field>
              <Field label="Zinssatz (%)">
                <input
                  type="number"
                  inputMode="decimal"
                  step={0.05}
                  min={0}
                  max={10}
                  value={h.zinssatzProzent}
                  onChange={(e) =>
                    onUpdate(h.id, { zinssatzProzent: Number(e.target.value) })
                  }
                  className={`${inputClass} tabular-nums`}
                />
              </Field>
              <Field label="Ablaufjahr">
                <input
                  type="number"
                  min={2024}
                  max={2080}
                  value={h.ablaufjahr}
                  onChange={(e) => onUpdate(h.id, { ablaufjahr: Number(e.target.value) })}
                  className={`${inputClass} tabular-nums`}
                />
              </Field>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onAdd}
        className="mt-1 w-full rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:border-slate-400 hover:text-slate-800"
      >
        + Hypothek-Tranche hinzufügen
      </button>
    </div>
  );
}

function KpiPill({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-center">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div
        className={`tabular-nums text-slate-700 ${
          bold ? "text-base font-semibold" : "text-sm"
        }`}
      >
        {value}
      </div>
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

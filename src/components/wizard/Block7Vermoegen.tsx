"use client";

import { useEffect } from "react";
import { usePlanStore, type VermoegenItem, type VermoegenTyp } from "@/lib/store";
import { vermoegenAufteilung } from "@/engine/vermoegen";
import { formatChf } from "@/lib/format";
import { Field } from "@/components/ui/Field";
import { KpiPill } from "@/components/ui/KpiPill";
import { inputClass } from "@/components/ui/styles";

const TYP_LABELS: Record<VermoegenTyp, { label: string; sub: string; badge: string }> = {
  konto: {
    label: "Konto",
    sub: "Bank / Sparkonto",
    badge: "bg-blue-50 text-blue-700",
  },
  depot: {
    label: "Depot",
    sub: "Wertschriften",
    badge: "bg-emerald-50 text-emerald-700",
  },
  darlehen: {
    label: "Darlehen",
    sub: "Schuld",
    badge: "bg-rose-50 text-rose-700",
  },
};

export function Block7Vermoegen() {
  const items = usePlanStore((s) => s.vermoegen.items);
  const addVermoegen = usePlanStore((s) => s.addVermoegen);
  const updateVermoegen = usePlanStore((s) => s.updateVermoegen);
  const removeVermoegen = usePlanStore((s) => s.removeVermoegen);
  const setHauptkonto = usePlanStore((s) => s.setHauptkonto);

  const aufteilung = vermoegenAufteilung(items);

  // Auto-First-Row: leeres Hauptkonto bei leerer Liste, damit Cashflow-Saldo
  // von Anfang an einen Träger hat. Berater kann später Beschreibung füllen.
  useEffect(() => {
    if (items.length === 0) addVermoegen("konto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  return (
    <div className="space-y-6">
      <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">
          Konten, Depots & Darlehen
          <span className="ml-2 text-xs font-normal text-slate-400">
            Hauptkonto trägt den Cashflow-Saldo
          </span>
        </legend>

        <div className="grid grid-cols-3 gap-2">
          <KpiPill label="Aktiva" value={formatChf(aufteilung.aktiva)} positive />
          <KpiPill label="Schulden" value={formatChf(aufteilung.schulden)} />
          <KpiPill label="Netto" value={formatChf(aufteilung.netto)} bold />
        </div>

        <ul className="space-y-2">
          {items.map((it, idx) => (
            <VermoegenCard
              key={it.id}
              index={idx + 1}
              item={it}
              canRemove={items.length > 1}
              onUpdate={(p) => updateVermoegen(it.id, p)}
              onRemove={() => removeVermoegen(it.id)}
              onSetHauptkonto={() => setHauptkonto(it.id)}
            />
          ))}
        </ul>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => addVermoegen("konto")}
            className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:border-slate-400 hover:text-slate-800"
          >
            + Konto
          </button>
          <button
            type="button"
            onClick={() => addVermoegen("depot")}
            className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:border-slate-400 hover:text-slate-800"
          >
            + Depot
          </button>
          <button
            type="button"
            onClick={() => addVermoegen("darlehen")}
            className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:border-slate-400 hover:text-slate-800"
          >
            + Darlehen
          </button>
        </div>
      </fieldset>

      <p className="text-xs text-slate-400">
        Sobald die Cashflow-Engine läuft (Etappe 2), wird der jährliche Überschuss
        bzw. das Defizit automatisch auf das Hauptkonto gebucht.
      </p>
    </div>
  );
}

function VermoegenCard({
  index,
  item,
  canRemove,
  onUpdate,
  onRemove,
  onSetHauptkonto,
}: {
  index: number;
  item: VermoegenItem;
  canRemove: boolean;
  onUpdate: (p: Partial<Omit<VermoegenItem, "id">>) => void;
  onRemove: () => void;
  onSetHauptkonto: () => void;
}) {
  const meta = TYP_LABELS[item.typ];
  const istDarlehen = item.typ === "darlehen";

  return (
    <li
      className={`space-y-2 rounded-md border p-3 ${
        item.istHauptkonto ? "border-blue-300 bg-blue-50/40" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.badge}`}
          >
            {meta.label}
          </span>
          <span className="text-xs font-medium text-slate-500">
            Position {index}
          </span>
          {item.istHauptkonto && (
            <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
              Hauptkonto
            </span>
          )}
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-red-600 hover:underline"
          >
            Entfernen
          </button>
        )}
      </div>

      <Field label="Beschreibung">
        <input
          type="text"
          value={item.beschreibung}
          onChange={(e) => onUpdate({ beschreibung: e.target.value })}
          placeholder={
            item.typ === "konto"
              ? "z.B. Privatkonto ZKB"
              : item.typ === "depot"
                ? "z.B. ETF-Depot Saxo"
                : "z.B. Privatdarlehen Eltern"
          }
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label={istDarlehen ? "Schuld heute (CHF)" : "Saldo heute (CHF)"}>
          <input
            type="number"
            inputMode="numeric"
            value={item.saldoHeute ?? ""}
            onChange={(e) =>
              onUpdate({
                saldoHeute: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            placeholder={istDarlehen ? "z.B. 50'000" : "z.B. 100'000"}
            className={`${inputClass} tabular-nums`}
          />
        </Field>
        {item.typ === "konto" ? (
          <Field label="Rendite p.a. (%)" hint="Liquidität nicht verzinst">
            <input
              type="number"
              value={0}
              disabled
              className={`${inputClass} tabular-nums bg-slate-100 text-slate-500`}
            />
          </Field>
        ) : (
          <Field label="Rendite p.a. (%)" hint={istDarlehen ? "Zinssatz" : ""}>
            <input
              type="number"
              inputMode="decimal"
              step={0.1}
              min={-10}
              max={20}
              value={item.renditeProzent}
              onChange={(e) => onUpdate({ renditeProzent: Number(e.target.value) })}
              className={`${inputClass} tabular-nums`}
            />
          </Field>
        )}
      </div>

      {!istDarlehen && !item.istHauptkonto && (
        <button
          type="button"
          onClick={onSetHauptkonto}
          className="text-xs text-blue-600 hover:underline"
        >
          → als Hauptkonto setzen
        </button>
      )}
    </li>
  );
}


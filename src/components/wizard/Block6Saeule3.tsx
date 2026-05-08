"use client";

import { usePlanStore, type SaeuleDreiEntry, type SaeuleDreiTyp } from "@/lib/store";
import { personLabel } from "@/lib/pension";
import { saeuleDreiAuszahlung } from "@/engine/saeule3";
import { formatChf } from "@/lib/format";
import { Field } from "@/components/ui/Field";
import { inputClass } from "@/components/ui/styles";

export function Block6Saeule3() {
  const fallart = usePlanStore((s) => s.fallart);
  const person1 = usePlanStore((s) => s.person1);
  const person2 = usePlanStore((s) => s.person2);
  const items = usePlanStore((s) => s.saeuleDrei);
  const add = usePlanStore((s) => s.addSaeuleDrei);
  const update = usePlanStore((s) => s.updateSaeuleDrei);
  const remove = usePlanStore((s) => s.removeSaeuleDrei);

  return (
    <div className="space-y-6">
      <PersonSaeuleDrei
        title={personLabel(1, person1.vorname, fallart)}
        items={items.p1}
        onAdd={(t) => add(1, t)}
        onUpdate={(id, p) => update(1, id, p)}
        onRemove={(id) => remove(1, id)}
      />

      {fallart === "paar" && (
        <PersonSaeuleDrei
          title={personLabel(2, person2.vorname, fallart)}
          items={items.p2}
          onAdd={(t) => add(2, t)}
          onUpdate={(id, p) => update(2, id, p)}
          onRemove={(id) => remove(2, id)}
        />
      )}

      <p className="text-xs text-slate-400">
        3a- und 3b-Steuerlogik (Maximalbeitrag-Check, Bezugsregeln 3a frühestens 60)
        kommt mit der Steuer-Engine.
      </p>
    </div>
  );
}

function PersonSaeuleDrei({
  title,
  items,
  onAdd,
  onUpdate,
  onRemove,
}: {
  title: string;
  items: SaeuleDreiEntry[];
  onAdd: (t: SaeuleDreiTyp) => void;
  onUpdate: (id: string, p: Partial<Omit<SaeuleDreiEntry, "id">>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <legend className="px-1 text-sm font-semibold text-slate-700">{title}</legend>

      {items.length === 0 && (
        <p className="text-xs text-slate-400">
          Noch keine 3.-Säule-Einträge. Wähle Konto oder Versicherung.
        </p>
      )}

      <ul className="space-y-2">
        {items.map((it, idx) => (
          <SaeuleDreiCard
            key={it.id}
            index={idx + 1}
            item={it}
            onUpdate={(p) => onUpdate(it.id, p)}
            onRemove={() => onRemove(it.id)}
          />
        ))}
      </ul>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onAdd("konto")}
          className="flex-1 rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:border-slate-400 hover:text-slate-800"
        >
          + Konto / Bank
        </button>
        <button
          type="button"
          onClick={() => onAdd("versicherung")}
          className="flex-1 rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:border-slate-400 hover:text-slate-800"
        >
          + Versicherung
        </button>
      </div>
    </fieldset>
  );
}

function SaeuleDreiCard({
  index,
  item,
  onUpdate,
  onRemove,
}: {
  index: number;
  item: SaeuleDreiEntry;
  onUpdate: (p: Partial<Omit<SaeuleDreiEntry, "id">>) => void;
  onRemove: () => void;
}) {
  const auszahlung = saeuleDreiAuszahlung(item);

  return (
    <li className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              item.type === "konto"
                ? "bg-blue-50 text-blue-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {item.type === "konto" ? "Konto" : "Versicherung"}
          </span>
          <span className="text-xs font-medium text-slate-500">
            Eintrag {index}
          </span>
        </div>
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
          placeholder={
            item.type === "konto" ? "z.B. ZKB 3a-Konto" : "z.B. AXA 3a-Police"
          }
          className={inputClass}
        />
      </Field>

      {item.type === "konto" ? (
        <KontoFelder item={item} onUpdate={onUpdate} />
      ) : (
        <VersicherungsFelder item={item} onUpdate={onUpdate} />
      )}

      <EinzahlungsFelder item={item} onUpdate={onUpdate} />

      {auszahlung && (
        <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
          <span className="text-slate-500">Voraussichtliche Auszahlung im Jahr {auszahlung.jahr}:</span>{" "}
          <span className="font-semibold tabular-nums text-slate-700">
            {formatChf(auszahlung.betrag)}
          </span>
        </div>
      )}
    </li>
  );
}

function KontoFelder({
  item,
  onUpdate,
}: {
  item: SaeuleDreiEntry;
  onUpdate: (p: Partial<Omit<SaeuleDreiEntry, "id">>) => void;
}) {
  return (
    <>
      <Field label="Aktueller Wert (CHF)">
        <input
          type="number"
          inputMode="numeric"
          value={item.aktuellerWert ?? ""}
          onChange={(e) =>
            onUpdate({
              aktuellerWert: e.target.value === "" ? null : Number(e.target.value),
            })
          }
          placeholder="z.B. 50'000"
          className={`${inputClass} tabular-nums`}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Auszahlungsjahr">
          <input
            type="number"
            min={2024}
            max={2080}
            value={item.auszahlungsjahr}
            onChange={(e) => onUpdate({ auszahlungsjahr: Number(e.target.value) })}
            className={`${inputClass} tabular-nums`}
          />
        </Field>
        <Field label="Rendite p.a. (%)" hint="zur Simulation">
          <input
            type="number"
            inputMode="decimal"
            step={0.1}
            min={0}
            max={20}
            value={item.renditeProzent}
            onChange={(e) => onUpdate({ renditeProzent: Number(e.target.value) })}
            className={`${inputClass} tabular-nums`}
          />
        </Field>
      </div>
    </>
  );
}

function EinzahlungsFelder({
  item,
  onUpdate,
}: {
  item: SaeuleDreiEntry;
  onUpdate: (p: Partial<Omit<SaeuleDreiEntry, "id">>) => void;
}) {
  return (
    <div className="space-y-2 rounded-md border border-slate-100 bg-slate-50/50 p-3">
      <div>
        <div className="text-xs font-medium text-slate-700">
          {item.type === "konto" ? "Jährliche Einzahlung" : "Jahresprämie"}
        </div>
        <div className="text-xs text-slate-400">
          {item.type === "konto"
            ? "z.B. CHF 7'258 (Maximum mit PK)"
            : "feste Prämie laut Police"}
          {" — "}leer lassen wenn nicht regelmässig eingezahlt
        </div>
      </div>
      <Field label="Betrag (CHF / Jahr)">
        <input
          type="number"
          inputMode="numeric"
          value={item.jaehrlicheEinzahlung ?? ""}
          onChange={(e) =>
            onUpdate({
              jaehrlicheEinzahlung:
                e.target.value === "" ? null : Number(e.target.value),
            })
          }
          placeholder={item.type === "konto" ? "z.B. 7258" : "z.B. 6000"}
          className={`${inputClass} tabular-nums`}
        />
      </Field>
      {item.jaehrlicheEinzahlung != null && item.jaehrlicheEinzahlung > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Von Jahr">
            <input
              type="number"
              min={2000}
              max={2080}
              value={item.einzahlungAb}
              onChange={(e) =>
                onUpdate({ einzahlungAb: Number(e.target.value) })
              }
              className={`${inputClass} tabular-nums`}
            />
          </Field>
          <Field label="Bis Jahr">
            <input
              type="number"
              min={2000}
              max={2080}
              value={item.einzahlungBis}
              onChange={(e) =>
                onUpdate({ einzahlungBis: Number(e.target.value) })
              }
              className={`${inputClass} tabular-nums`}
            />
          </Field>
        </div>
      )}
    </div>
  );
}

function VersicherungsFelder({
  item,
  onUpdate,
}: {
  item: SaeuleDreiEntry;
  onUpdate: (p: Partial<Omit<SaeuleDreiEntry, "id">>) => void;
}) {
  return (
    <>
      <Field
        label="Rückkaufswert heute (CHF)"
        hint="bei vorzeitiger Auflösung — informativ"
      >
        <input
          type="number"
          inputMode="numeric"
          value={item.rueckkaufswert ?? ""}
          onChange={(e) =>
            onUpdate({
              rueckkaufswert: e.target.value === "" ? null : Number(e.target.value),
            })
          }
          placeholder="z.B. 30'000"
          className={`${inputClass} tabular-nums`}
        />
      </Field>
      <Field
        label="Ablaufwert (CHF)"
        hint="Erlebensfallleistung bei Ablauf — wird im Ablaufjahr ausbezahlt"
      >
        <input
          type="number"
          inputMode="numeric"
          value={item.ablaufswert ?? ""}
          onChange={(e) =>
            onUpdate({
              ablaufswert: e.target.value === "" ? null : Number(e.target.value),
            })
          }
          placeholder="z.B. 38'000"
          className={`${inputClass} tabular-nums`}
        />
      </Field>
      <Field label="Ablaufjahr">
        <input
          type="number"
          min={2024}
          max={2080}
          value={item.ablaufjahr}
          onChange={(e) => onUpdate({ ablaufjahr: Number(e.target.value) })}
          className={`${inputClass} w-32 tabular-nums`}
        />
      </Field>
    </>
  );
}


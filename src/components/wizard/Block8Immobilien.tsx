"use client";

import {
  usePlanStore,
  type Immobilie,
  type ImmobilienTyp,
  type ImmobilienPlan,
  type Hypothek,
} from "@/lib/store";
import {
  immobilienAufteilung,
  immobilieNettoHeute,
  immobilienVerkaufsAuszahlungNetto,
} from "@/engine/immobilien";
import { formatChf } from "@/lib/format";
import { Field } from "@/components/ui/Field";
import { KpiPill } from "@/components/ui/KpiPill";
import { inputClass } from "@/components/ui/styles";
import { TragbarkeitPanel } from "./TragbarkeitPanel";

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
          onClick={() => addImmobilie()}
          className="w-full rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:border-slate-400 hover:text-slate-800"
        >
          + Immobilie hinzufügen
        </button>
      </fieldset>

      <TragbarkeitPanel />

      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <div className="mb-1 font-medium text-slate-700">
          ℹ️ Eigenmietwert &amp; Schuldzinsabzug — bewusst nicht modelliert
        </div>
        <p className="leading-relaxed">
          Die Schweiz schafft die Eigenmietwertbesteuerung per <strong>2028</strong>{" "}
          ab (Volksabstimmung Sept 2025 angenommen). Mit dem Wegfall des
          Eigenmietwerts entfällt auch der Schuldzinsabzug bei selbstbewohnten
          Liegenschaften weitgehend. Da die Reform vor der Pensionierung der
          meisten Cuira-Kunden greift, modellieren wir bewusst <em>weder</em>{" "}
          den Eigenmietwert <em>noch</em> den Schuldzinsabzug — die Auslegeordnung
          ist damit für den Zustand <strong>nach 2028</strong> realistisch.
          Kurzfristig kann das die Steuerschätzung der nächsten 1-3 Jahre
          leicht überzeichnen.
        </p>
      </div>

      <p className="text-xs text-slate-400">
        Grundstückgewinnsteuer (kantonal beim Verkauf) folgt mit Etappe 6.
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

      <Field
        label="Erwartete Wertsteigerung pro Jahr (%)"
        hint="historischer CH-Mittelwert ~1.5 % p.a. — wird im Cashflow compounded"
      >
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            step={0.1}
            min={-5}
            max={10}
            value={item.wertsteigerungProzent ?? ""}
            onChange={(e) =>
              onUpdate({
                wertsteigerungProzent:
                  e.target.value === "" ? null : Number(e.target.value),
              })
            }
            placeholder="1.5"
            className={`${inputClass} w-24 tabular-nums`}
          />
          <span className="text-xs text-slate-500">%/Jahr</span>
        </div>
      </Field>

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
        <div className="space-y-3 rounded-md border border-amber-100 bg-amber-50/50 p-3">
          <div className="text-[11px] font-medium uppercase tracking-wider text-amber-800">
            Verkaufs-Daten · GGSt-Berechnung
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Verkaufsjahr">
              <input
                type="number"
                min={2024}
                max={2080}
                value={item.verkaufsjahr}
                onChange={(e) =>
                  onUpdate({ verkaufsjahr: Number(e.target.value) })
                }
                className={`${inputClass} tabular-nums`}
              />
            </Field>
            <Field
              label="Kaufjahr"
              hint="Für Besitzdauer-Rabatt — leer = 15 J. Annahme"
            >
              <input
                type="number"
                min={1950}
                max={2030}
                value={item.kaufjahr ?? ""}
                placeholder="z.B. 2010"
                onChange={(e) =>
                  onUpdate({
                    kaufjahr: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                className={`${inputClass} tabular-nums`}
              />
            </Field>
            <Field
              label="Anlagekosten"
              hint="Kaufpreis + Investitionen + Nebenkosten"
            >
              <input
                type="number"
                min={0}
                value={item.anlagekosten ?? ""}
                placeholder="leer = Default"
                onChange={(e) =>
                  onUpdate({
                    anlagekosten:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                className={`${inputClass} tabular-nums`}
              />
            </Field>
          </div>
        </div>
      )}

      <VerkaufsErloesPanel
        item={item}
        netto={netto}
        hypoSumme={hypoSumme}
      />
    </li>
  );
}

/**
 * Zeigt den Verkaufs-Erlös vor und nach Grundstückgewinnsteuer.
 * Bei Plan "behalten" einfach den Netto-Wert heute.
 */
function VerkaufsErloesPanel({
  item,
  netto,
  hypoSumme,
}: {
  item: Immobilie;
  netto: number | null;
  hypoSumme: number;
}) {
  const kantonCode = usePlanStore((s) => s.adresse.kanton);
  if (netto == null) return null;

  // Bei "behalten" einfach Netto-Wert heute
  if (item.plan !== "verkaufen") {
    return (
      <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
        <span className="text-slate-500">Netto-Wert heute:</span>{" "}
        <span className="font-semibold tabular-nums text-slate-700">
          {formatChf(netto)}
        </span>
        <div className="mt-1 text-slate-400">
          Verkehrswert {formatChf(item.verkehrswert)} − Hypotheken{" "}
          {formatChf(hypoSumme)}
        </div>
      </div>
    );
  }

  // Bei "verkaufen" → GGSt mit-rechnen
  // Verkehrswert wird mit Wertsteigerung auf das Verkaufsjahr hochgerechnet
  const heuteJahr = new Date().getFullYear();
  const wachstumProzent = item.wertsteigerungProzent ?? 1.5;
  const dauer = Math.max(0, item.verkaufsjahr - heuteJahr);
  const verkehrswertHochgerechnet = item.verkehrswert
    ? Math.round(
        item.verkehrswert * Math.pow(1 + wachstumProzent / 100, dauer)
      )
    : 0;

  const auszahlung = immobilienVerkaufsAuszahlungNetto(
    {
      verkehrswert: verkehrswertHochgerechnet,
      hypothekenSumme: hypoSumme,
      plan: item.plan,
      verkaufsjahr: item.verkaufsjahr,
      kaufjahr: item.kaufjahr,
      anlagekosten: item.anlagekosten,
    },
    kantonCode ?? ""
  );

  if (!auszahlung) return null;

  return (
    <div className="space-y-1.5 rounded-md border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-xs">
      <div className="flex justify-between">
        <span className="text-slate-500">
          Verkehrswert {item.verkaufsjahr}{" "}
          <span className="text-slate-400">
            (+{wachstumProzent}%/J über {dauer}J)
          </span>
          :
        </span>
        <span className="font-semibold tabular-nums text-slate-700">
          {formatChf(verkehrswertHochgerechnet)}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-500">− Hypotheken:</span>
        <span className="font-mono tabular-nums text-slate-600">
          −{formatChf(hypoSumme)}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-500">
          − Grundstückgewinnsteuer ({kantonCode || "—"},{" "}
          {auszahlung.ggst.effektiverProzent}% auf{" "}
          {formatChf(auszahlung.ggst.reingewinn)} Reingewinn):
        </span>
        <span className="font-mono tabular-nums text-amber-700">
          −{formatChf(auszahlung.ggst.steuer)}
        </span>
      </div>
      <div className="border-t border-emerald-200 pt-1.5 flex justify-between">
        <span className="font-medium text-slate-700">Auszahlung netto:</span>
        <span className="font-bold tabular-nums text-emerald-800">
          {formatChf(auszahlung.netto)}
        </span>
      </div>
      {item.kaufjahr == null && (
        <div className="pt-1 text-slate-400">
          ⚠ Kaufjahr leer — GGSt rechnet mit 15 J. Besitzdauer-Annahme. Genauer
          mit echtem Kaufjahr.
        </div>
      )}
    </div>
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


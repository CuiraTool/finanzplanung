"use client";

import {
  usePlanStore,
  type BezugsPraeferenz,
  type BvgPersonInput,
  type EinkaufEntry,
  type FreizuegigkeitEntry,
} from "@/lib/store";
import { personLabel, pensionsjahr } from "@/lib/pension";
import { SPERRFRIST_EINKAUF_JAHRE } from "@/engine/bvg";

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
  const ziele = usePlanStore((s) => s.ziele);

  const setBvgP1 = usePlanStore((s) => s.setBvgP1);
  const setBvgP2 = usePlanStore((s) => s.setBvgP2);
  const addFz = usePlanStore((s) => s.addFreizuegigkeit);
  const updateFz = usePlanStore((s) => s.updateFreizuegigkeit);
  const removeFz = usePlanStore((s) => s.removeFreizuegigkeit);
  const addEk = usePlanStore((s) => s.addEinkauf);
  const updateEk = usePlanStore((s) => s.updateEinkauf);
  const removeEk = usePlanStore((s) => s.removeEinkauf);

  const bezugsalterP1 = ziele.bezugsalterP1;
  const bezugsalterP2 = ziele.bezugsalterP2;
  const bezugsjahrP1 = pensionsjahr(person1.geburtsdatum, bezugsalterP1);
  const bezugsjahrP2 = pensionsjahr(person2.geburtsdatum, bezugsalterP2);

  return (
    <div className="space-y-6">
      <PersonBvgForm
        title={personLabel(1, person1.vorname, fallart)}
        person={bvg.p1}
        bezugsalter={bezugsalterP1}
        bezugsjahr={bezugsjahrP1}
        onPatch={setBvgP1}
        onAddFz={() => addFz(1)}
        onUpdateFz={(id, p) => updateFz(1, id, p)}
        onRemoveFz={(id) => removeFz(1, id)}
        onAddEk={() => addEk(1)}
        onUpdateEk={(id, p) => updateEk(1, id, p)}
        onRemoveEk={(id) => removeEk(1, id)}
      />

      {fallart === "paar" && (
        <PersonBvgForm
          title={personLabel(2, person2.vorname, fallart)}
          person={bvg.p2}
          bezugsalter={bezugsalterP2}
          bezugsjahr={bezugsjahrP2}
          onPatch={setBvgP2}
          onAddFz={() => addFz(2)}
          onUpdateFz={(id, p) => updateFz(2, id, p)}
          onRemoveFz={(id) => removeFz(2, id)}
          onAddEk={() => addEk(2)}
          onUpdateEk={(id, p) => updateEk(2, id, p)}
          onRemoveEk={(id) => removeEk(2, id)}
        />
      )}
    </div>
  );
}

function PersonBvgForm({
  title,
  person,
  bezugsalter,
  bezugsjahr,
  onPatch,
  onAddFz,
  onUpdateFz,
  onRemoveFz,
  onAddEk,
  onUpdateEk,
  onRemoveEk,
}: {
  title: string;
  person: BvgPersonInput;
  bezugsalter: number;
  bezugsjahr: number | null;
  onPatch: (p: Partial<BvgPersonInput>) => void;
  onAddFz: () => void;
  onUpdateFz: (id: string, p: Partial<FreizuegigkeitEntry>) => void;
  onRemoveFz: (id: string) => void;
  onAddEk: () => void;
  onUpdateEk: (id: string, p: Partial<EinkaufEntry>) => void;
  onRemoveEk: (id: string) => void;
}) {
  return (
    <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <legend className="px-1 text-sm font-semibold text-slate-700">{title}</legend>

      <div>
        <div className="mb-1 text-xs font-medium text-slate-600">
          Aktiver PK-Anschluss?
        </div>
        <YesNoButtons
          value={person.aktiverAnschluss}
          onChange={(v) => onPatch({ aktiverAnschluss: v })}
        />
      </div>

      {person.aktiverAnschluss && (
        <>
          <Field
            label="Aktuelles Altersguthaben heute (CHF)"
            hint="vom letzten PK-Ausweis — informativ, nicht für Bezugsberechnung"
          >
            <input
              type="number"
              inputMode="numeric"
              value={person.altersguthabenHeute ?? ""}
              onChange={(e) =>
                onPatch({
                  altersguthabenHeute:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
              placeholder="z.B. 320'000"
              className={`${inputClass} tabular-nums`}
            />
          </Field>

          <Field
            label={`Voraussichtliches Altersguthaben mit Alter ${bezugsalter} (CHF)`}
            hint="vom PK-Ausweis (Bezugsalter aus Block 2) — wird für die Berechnung genutzt"
          >
            <input
              type="number"
              inputMode="numeric"
              value={person.altersguthabenBeiBezug ?? ""}
              onChange={(e) =>
                onPatch({
                  altersguthabenBeiBezug:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
              placeholder="z.B. 450'000"
              className={`${inputClass} tabular-nums`}
            />
          </Field>

          <Field
            label="Umwandlungssatz (%)"
            hint="laut PK-Reglement — gesetzliches Mindest 6.8%, real meist tiefer"
          >
            <input
              type="number"
              inputMode="decimal"
              step={0.1}
              min={0}
              max={10}
              value={person.umwandlungssatzProzent}
              onChange={(e) =>
                onPatch({ umwandlungssatzProzent: Number(e.target.value) })
              }
              className={`${inputClass} w-32 tabular-nums`}
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
                  onClick={() => onPatch({ bezugspraeferenz: p.value })}
                  className={`flex-1 rounded-md border px-3 py-2 text-left text-sm transition ${
                    person.bezugspraeferenz === p.value
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

          {person.bezugspraeferenz === "mischung" && (
            <Field
              label={`Kapitalanteil: ${person.kapitalanteil}%`}
              hint={`→ Rentenanteil: ${100 - person.kapitalanteil}%`}
            >
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={person.kapitalanteil}
                onChange={(e) => onPatch({ kapitalanteil: Number(e.target.value) })}
                className="w-full"
              />
            </Field>
          )}

          <Freizuegigkeit
            items={person.freizuegigkeit}
            onAdd={onAddFz}
            onUpdate={onUpdateFz}
            onRemove={onRemoveFz}
          />

          <Einkaeufe
            items={person.einkaeufe}
            bezugsjahr={bezugsjahr}
            kapitalIstAnteil={
              person.bezugspraeferenz === "kapital" ||
              (person.bezugspraeferenz === "mischung" && person.kapitalanteil > 0)
            }
            onAdd={onAddEk}
            onUpdate={onUpdateEk}
            onRemove={onRemoveEk}
          />
        </>
      )}
    </fieldset>
  );
}

function Freizuegigkeit({
  items,
  onAdd,
  onUpdate,
  onRemove,
}: {
  items: FreizuegigkeitEntry[];
  onAdd: () => void;
  onUpdate: (id: string, p: Partial<FreizuegigkeitEntry>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-2 rounded-md border border-slate-100 bg-slate-50/50 p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-slate-700">Freizügigkeit</div>
          <div className="text-xs text-slate-400">
            Konten/Policen aus früheren Anstellungen — wird mit 1.25% verzinst
          </div>
        </div>
      </div>

      {items.length === 0 && (
        <p className="text-xs text-slate-400">Noch keine Freizügigkeit erfasst.</p>
      )}

      <ul className="space-y-2">
        {items.map((it, idx) => (
          <li
            key={it.id}
            className="space-y-2 rounded-md border border-slate-200 bg-white p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Eintrag {idx + 1}
              </span>
              <button
                type="button"
                onClick={() => onRemove(it.id)}
                className="text-xs text-red-600 hover:underline"
              >
                Entfernen
              </button>
            </div>
            <Field label="Beschreibung">
              <input
                type="text"
                value={it.beschreibung}
                onChange={(e) => onUpdate(it.id, { beschreibung: e.target.value })}
                placeholder="z.B. FZ-Konto Migros Bank"
                className={inputClass}
              />
            </Field>
            <Field label="Saldo heute (CHF)">
              <input
                type="number"
                inputMode="numeric"
                value={it.saldoHeute ?? ""}
                onChange={(e) =>
                  onUpdate(it.id, {
                    saldoHeute:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                placeholder="z.B. 80'000"
                className={`${inputClass} tabular-nums`}
              />
            </Field>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onAdd}
        className="mt-1 w-full rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:border-slate-400 hover:text-slate-800"
      >
        + Freizügigkeit hinzufügen
      </button>
    </div>
  );
}

function Einkaeufe({
  items,
  bezugsjahr,
  kapitalIstAnteil,
  onAdd,
  onUpdate,
  onRemove,
}: {
  items: EinkaufEntry[];
  bezugsjahr: number | null;
  kapitalIstAnteil: boolean;
  onAdd: () => void;
  onUpdate: (id: string, p: Partial<EinkaufEntry>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-2 rounded-md border border-slate-100 bg-slate-50/50 p-3">
      <div>
        <div className="text-xs font-medium text-slate-700">Einkäufe simulieren</div>
        <div className="text-xs text-slate-400">
          freiwillige Einzahlungen — werden bis Bezugsjahr verzinst, steuerlich abzugsfähig
        </div>
      </div>

      {items.length === 0 && (
        <p className="text-xs text-slate-400">Noch keine Einkäufe simuliert.</p>
      )}

      <ul className="space-y-2">
        {items.map((it, idx) => {
          const sperrfristVerletzt =
            bezugsjahr != null &&
            it.jahr >= bezugsjahr - SPERRFRIST_EINKAUF_JAHRE + 1;
          const warnen = sperrfristVerletzt && kapitalIstAnteil;
          return (
            <li
              key={it.id}
              className={`space-y-2 rounded-md border p-3 ${
                warnen ? "border-amber-300 bg-amber-50/50" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Einkauf {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(it.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Entfernen
                </button>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <Field label="Jahr">
                  <input
                    type="number"
                    min={2000}
                    max={2100}
                    value={it.jahr}
                    onChange={(e) =>
                      onUpdate(it.id, { jahr: Number(e.target.value) })
                    }
                    className={`${inputClass} tabular-nums`}
                  />
                </Field>
                <Field label="Betrag (CHF)">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={it.betrag ?? ""}
                    onChange={(e) =>
                      onUpdate(it.id, {
                        betrag:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    placeholder="z.B. 20'000"
                    className={`${inputClass} tabular-nums`}
                  />
                </Field>
              </div>
              {warnen && (
                <p className="text-xs text-amber-700">
                  ⚠ 3-Jahres-Sperrfrist verletzt: dieser Einkauf liegt weniger als
                  3 Jahre vor dem Kapitalbezug — der Betrag darf gemäss Art. 79b
                  Abs. 3 BVG nicht als Kapital bezogen werden.
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onAdd}
        className="mt-1 w-full rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:border-slate-400 hover:text-slate-800"
      >
        + Einkauf hinzufügen
      </button>
    </div>
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

"use client";

import { usePlanStore } from "@/lib/store";
import { ORDENTLICHES_AHV_ALTER, pensionsjahr, personLabel } from "@/lib/pension";

export function Block2Wuensche() {
  const fallart = usePlanStore((s) => s.fallart);
  const ziele = usePlanStore((s) => s.ziele);
  const setZiele = usePlanStore((s) => s.setZiele);
  const person1 = usePlanStore((s) => s.person1);
  const person2 = usePlanStore((s) => s.person2);
  const ausgaben = usePlanStore((s) => s.einmaligeAusgaben);
  const addAusgabe = usePlanStore((s) => s.addEinmaligAusgabe);
  const updateAusgabe = usePlanStore((s) => s.updateEinmaligAusgabe);
  const removeAusgabe = usePlanStore((s) => s.removeEinmaligAusgabe);

  return (
    <div className="space-y-6">
      {/* Sub-Block 1: Pensionierung */}
      <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">
          Pensionierung
          <span className="ml-2 text-xs font-normal text-slate-400">
            ordentlich vs. Wunsch
          </span>
        </legend>

        <PensionierungZeile
          label={personLabel(1, person1.vorname, fallart)}
          geburtsdatum={person1.geburtsdatum}
          wunschalter={ziele.bezugsalterP1}
          onChangeWunsch={(n) => setZiele({ bezugsalterP1: n })}
        />

        {fallart === "paar" && (
          <PensionierungZeile
            label={personLabel(2, person2.vorname, fallart)}
            geburtsdatum={person2.geburtsdatum}
            wunschalter={ziele.bezugsalterP2}
            onChangeWunsch={(n) => setZiele({ bezugsalterP2: n })}
          />
        )}
      </fieldset>

      {/* Sub-Block 2: Einmalige Ausgaben */}
      <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">
          Einmalige zusätzliche Ausgaben
          <span className="ml-2 text-xs font-normal text-slate-400">
            werden im Cashflow berücksichtigt
          </span>
        </legend>

        {ausgaben.length === 0 && (
          <p className="text-xs text-slate-400">Noch keine Einträge.</p>
        )}

        <ul className="space-y-2">
          {ausgaben.map((a, idx) => (
            <li
              key={a.id}
              className="space-y-2 rounded-md border border-slate-200 bg-white p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Ausgabe {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeAusgabe(a.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Entfernen
                </button>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <Field label="Jahr">
                  <input
                    type="number"
                    min={2024}
                    max={2080}
                    value={a.jahr}
                    onChange={(e) =>
                      updateAusgabe(a.id, { jahr: Number(e.target.value) })
                    }
                    className={`${inputClass} tabular-nums`}
                  />
                </Field>
                <Field label="Betrag (CHF)">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={a.betrag ?? ""}
                    onChange={(e) =>
                      updateAusgabe(a.id, {
                        betrag: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    placeholder="z.B. 50'000"
                    className={`${inputClass} tabular-nums`}
                  />
                </Field>
              </div>
              <Field label="Beschreibung">
                <input
                  type="text"
                  value={a.beschreibung}
                  onChange={(e) =>
                    updateAusgabe(a.id, { beschreibung: e.target.value })
                  }
                  placeholder="z.B. Renovation, Reise, Auto"
                  className={inputClass}
                />
              </Field>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={addAusgabe}
          className="mt-2 w-full rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:border-slate-400 hover:text-slate-800"
        >
          + Ausgabe hinzufügen
        </button>
      </fieldset>
    </div>
  );
}

function PensionierungZeile({
  label,
  geburtsdatum,
  wunschalter,
  onChangeWunsch,
}: {
  label: string;
  geburtsdatum: string;
  wunschalter: number;
  onChangeWunsch: (n: number) => void;
}) {
  const ordentlichJahr = pensionsjahr(geburtsdatum, ORDENTLICHES_AHV_ALTER);
  const wunschJahr = pensionsjahr(geburtsdatum, wunschalter);

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-slate-700">{label}</div>
      <div className="grid grid-cols-[1fr_120px_120px] items-center gap-2 text-sm">
        <div className="text-xs uppercase tracking-wide text-slate-500">Variante</div>
        <div className="text-xs uppercase tracking-wide text-slate-500">Alter</div>
        <div className="text-xs uppercase tracking-wide text-slate-500">Jahr</div>

        <div className="text-slate-700">Ordentlich</div>
        <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-center tabular-nums text-slate-500">
          {ORDENTLICHES_AHV_ALTER}
        </div>
        <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-center tabular-nums text-slate-500">
          {ordentlichJahr ?? "—"}
        </div>

        <div className="text-slate-700">Wunsch</div>
        <input
          type="number"
          min={58}
          max={70}
          value={wunschalter}
          onChange={(e) => onChangeWunsch(Number(e.target.value))}
          className={`${inputClass} text-center tabular-nums`}
        />
        <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-center tabular-nums text-slate-500">
          {wunschJahr ?? "—"}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-slate-600">{label}</div>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

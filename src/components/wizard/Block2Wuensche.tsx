"use client";

import { usePlanStore } from "@/lib/store";
import { ORDENTLICHES_AHV_ALTER, pensionsjahr, personLabel } from "@/lib/pension";
import { Field } from "@/components/ui/Field";
import { inputClass, selectClass } from "@/components/ui/styles";

const PK_ALTER_MIN = 58;
const PK_ALTER_MAX = 70;

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
  const wunschJahr = pensionsjahr(geburtsdatum, Math.floor(wunschalter));
  const jahre = Math.floor(wunschalter);
  const monate = Math.round((wunschalter - jahre) * 12);

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-slate-700">{label}</div>
      <div className="grid grid-cols-[1fr_220px_120px] items-center gap-2 text-sm">
        <div className="text-xs uppercase tracking-wide text-slate-500">Variante</div>
        <div className="text-xs uppercase tracking-wide text-slate-500">Alter (Jahre · Monate)</div>
        <div className="text-xs uppercase tracking-wide text-slate-500">Jahr</div>

        <div className="text-slate-700">Ordentlich</div>
        <ReadCell value={`${ORDENTLICHES_AHV_ALTER} J · 0 Mt`} />
        <ReadCell value={ordentlichJahr ?? "—"} />

        <div className="text-slate-700">Wunsch</div>
        <div className="flex items-center gap-1">
          <select
            value={jahre}
            onChange={(e) => {
              const j = Number(e.target.value);
              onChangeWunsch(combinePkAlter(j, monate));
            }}
            className={`${selectClass} w-16 text-center tabular-nums`}
            aria-label="PK-Bezugsalter Jahre"
          >
            {pkJahreOptionen().map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <span className="text-xs text-slate-500">J</span>
          <select
            value={monate}
            onChange={(e) => {
              const m = Number(e.target.value);
              onChangeWunsch(combinePkAlter(jahre, m));
            }}
            className={`${selectClass} w-16 text-center tabular-nums`}
            aria-label="PK-Bezugsalter Monate"
          >
            {pkMonateOptionen().map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <span className="text-xs text-slate-500">Mt</span>
        </div>
        <ReadCell value={wunschJahr ?? "—"} />
      </div>
    </div>
  );
}

function pkJahreOptionen(): number[] {
  const out: number[] = [];
  for (let a = PK_ALTER_MIN; a <= PK_ALTER_MAX; a++) out.push(a);
  return out;
}

function pkMonateOptionen(): number[] {
  return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
}

function combinePkAlter(jahre: number, monate: number): number {
  const raw = jahre + monate / 12;
  return Math.max(PK_ALTER_MIN, Math.min(PK_ALTER_MAX, raw));
}

/**
 * Read-Only-Zelle als Div (statt readonly-Input) — vermeidet Klick-Frust
 * beim Berater, der versucht reinzuklicken (Y-2b W7).
 */
function ReadCell({ value }: { value: string | number }) {
  return (
    <div
      className={`flex h-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm tabular-nums text-slate-500`}
      aria-readonly="true"
    >
      {String(value)}
    </div>
  );
}

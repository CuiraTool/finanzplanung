"use client";

import { usePlanStore, type AusgabenKategorien, type AusgabenModus } from "@/lib/store";
import { Field } from "@/components/ui/Field";
import { inputClass, selectClass } from "@/components/ui/styles";

const KATEGORIEN: { key: keyof AusgabenKategorien; label: string; hint?: string }[] = [
  {
    key: "lebenshaltung",
    label: "Lebenshaltung",
    hint: "Haushalt, Essen, persönliche Auslagen, Energie & Kommunikation",
  },
  { key: "wohnen", label: "Wohnen", hint: "Miete oder Nebenkosten Eigenheim" },
  { key: "mobilitaet", label: "Mobilität", hint: "ÖV, Auto inkl. Versicherung" },
  {
    key: "versicherungen",
    label: "Versicherungen",
    hint: "Krankenkasse, Hausrat, Haftpflicht etc.",
  },
  { key: "ferienHobby", label: "Ferien & Hobby" },
  { key: "sonstiges", label: "Sonstiges" },
];

export function Block3Budget() {
  const fallart = usePlanStore((s) => s.fallart);
  const person1 = usePlanStore((s) => s.person1);
  const person2 = usePlanStore((s) => s.person2);
  const budget = usePlanStore((s) => s.budget);

  const addEink = usePlanStore((s) => s.addEinkommensperiode);
  const updateEink = usePlanStore((s) => s.updateEinkommensperiode);
  const removeEink = usePlanStore((s) => s.removeEinkommensperiode);
  const setModus = usePlanStore((s) => s.setAusgabenModus);
  const setTotal = usePlanStore((s) => s.setAusgabenTotal);
  const setKategorie = usePlanStore((s) => s.setAusgabenKategorie);
  const setWunsch = usePlanStore((s) => s.setWunschverbrauchPension);

  function personOption(idx: 1 | 2): string {
    const v = (idx === 1 ? person1.vorname : person2.vorname).trim();
    if (fallart === "einzel") return v ? `${v}` : "Person";
    return v ? `Person ${idx} — ${v}` : `Person ${idx}`;
  }

  const ausgabenSummeKategorien = KATEGORIEN.reduce(
    (s, k) => s + (budget.ausgabenKategorien[k.key] ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Einnahmen */}
      <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">
          Einnahmen
          <span className="ml-2 text-xs font-normal text-slate-400">
            mehrere Perioden möglich (Job-Wechsel, Pensumsreduktion …)
          </span>
        </legend>

        {budget.einkommen.length === 0 && (
          <p className="text-xs text-slate-400">Noch keine Einnahmen erfasst.</p>
        )}

        <ul className="space-y-2">
          {budget.einkommen.map((e, idx) => (
            <li
              key={e.id}
              className="space-y-2 rounded-md border border-slate-200 bg-white p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Periode {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeEink(e.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Entfernen
                </button>
              </div>

              <Field label="Beschreibung">
                <input
                  type="text"
                  value={e.beschreibung}
                  onChange={(ev) =>
                    updateEink(e.id, { beschreibung: ev.target.value })
                  }
                  placeholder="z.B. Hauptjob, Teilzeit ab 60"
                  className={inputClass}
                />
              </Field>

              {fallart === "paar" && (
                <Field label="Person">
                  <select
                    value={e.personIdx}
                    onChange={(ev) =>
                      updateEink(e.id, {
                        personIdx: Number(ev.target.value) as 1 | 2,
                      })
                    }
                    className={selectClass}
                  >
                    <option value={1}>{personOption(1)}</option>
                    <option value={2}>{personOption(2)}</option>
                  </select>
                </Field>
              )}

              <Field label="Betrag pro Monat (CHF, netto)">
                <input
                  type="number"
                  inputMode="numeric"
                  value={e.betragMonatlich ?? ""}
                  onChange={(ev) =>
                    updateEink(e.id, {
                      betragMonatlich:
                        ev.target.value === "" ? null : Number(ev.target.value),
                    })
                  }
                  placeholder="z.B. 8'000"
                  className={`${inputClass} tabular-nums`}
                />
              </Field>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Von (Monat)">
                  <input
                    type="month"
                    value={e.von}
                    onChange={(ev) => updateEink(e.id, { von: ev.target.value })}
                    className={`${inputClass} tabular-nums`}
                  />
                </Field>
                <Field label="Bis (Monat)" hint="leer = bis Pensionierung / offen">
                  <input
                    type="month"
                    value={e.bis}
                    onChange={(ev) => updateEink(e.id, { bis: ev.target.value })}
                    className={`${inputClass} tabular-nums`}
                  />
                </Field>
              </div>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={addEink}
          className="mt-2 w-full rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:border-slate-400 hover:text-slate-800"
        >
          + Einnahme hinzufügen
        </button>
      </fieldset>

      {/* Ausgaben */}
      <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">
          Ausgaben
          <span className="ml-2 text-xs font-normal text-slate-400">
            CHF / Monat, Haushalt total
          </span>
        </legend>

        <div className="flex gap-2">
          <ModusButton
            value="total"
            current={budget.ausgabenModus}
            onClick={() => setModus("total")}
            label="Total"
            sub="eine Summe"
          />
          <ModusButton
            value="detailliert"
            current={budget.ausgabenModus}
            onClick={() => setModus("detailliert")}
            label="Detailliert"
            sub="6 Kategorien"
          />
        </div>

        {budget.ausgabenModus === "total" ? (
          <Field label="Monatliche Ausgaben Haushalt total">
            <input
              type="number"
              inputMode="numeric"
              value={budget.ausgabenTotal ?? ""}
              onChange={(e) =>
                setTotal(e.target.value === "" ? null : Number(e.target.value))
              }
              placeholder="z.B. 8'500"
              className={`${inputClass} tabular-nums`}
            />
          </Field>
        ) : (
          <div className="space-y-3">
            {KATEGORIEN.map((k) => (
              <Field key={k.key} label={k.label} hint={k.hint}>
                <input
                  type="number"
                  inputMode="numeric"
                  value={budget.ausgabenKategorien[k.key] ?? ""}
                  onChange={(e) =>
                    setKategorie(
                      k.key,
                      e.target.value === "" ? null : Number(e.target.value)
                    )
                  }
                  placeholder="0"
                  className={`${inputClass} tabular-nums`}
                />
              </Field>
            ))}
            <div className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
              <span className="text-xs uppercase tracking-wide text-slate-500">
                Summe
              </span>
              <span className="text-sm font-semibold tabular-nums text-slate-700">
                CHF {ausgabenSummeKategorien.toLocaleString("de-CH")}
              </span>
            </div>
          </div>
        )}
      </fieldset>

      {/* Wunsch in Pension */}
      <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">
          Wunsch in Pensionierung
          <span className="ml-2 text-xs font-normal text-slate-400">
            Ziel-Lebensstandard
          </span>
        </legend>
        <Field
          label="Wunschverbrauch (CHF/Monat)"
          hint="meist tiefer als heute (kein Pendeln, weniger Versicherungen)"
        >
          <input
            type="number"
            inputMode="numeric"
            value={budget.wunschverbrauchPension ?? ""}
            onChange={(e) =>
              setWunsch(e.target.value === "" ? null : Number(e.target.value))
            }
            placeholder="z.B. 7'000"
            className={`${inputClass} tabular-nums`}
          />
        </Field>
      </fieldset>
    </div>
  );
}

function ModusButton({
  value,
  current,
  onClick,
  label,
  sub,
}: {
  value: AusgabenModus;
  current: AusgabenModus;
  onClick: () => void;
  label: string;
  sub: string;
}) {
  const active = value === current;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-md border px-3 py-2 text-left text-sm transition ${
        active
          ? "border-blue-600 bg-blue-50 text-blue-700"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
      }`}
    >
      <div className="font-medium">{label}</div>
      <div className="text-xs text-slate-400">{sub}</div>
    </button>
  );
}


"use client";

import {
  usePlanStore,
  type AusgabenKategorien,
  type AusgabenModus,
} from "@/lib/store";
import { indikativeSteuerHeute } from "@/engine/steuer";
import { Field } from "@/components/ui/Field";
import { MonthYearPicker } from "@/components/ui/MonthYearPicker";
import { inputClass, selectClass } from "@/components/ui/styles";
import { formatChf } from "@/lib/format";

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
  const setSteuerAnker = usePlanStore((s) => s.setSteuerAnker);
  const adresse = usePlanStore((s) => s.adresse);

  const indikativHeute =
    budget.einkommenHeute != null && budget.einkommenHeute > 0
      ? indikativeSteuerHeute(budget.einkommenHeute, 0, adresse.kanton, budget.religion)
      : null;

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
            brutto vor Steuer — mehrere Perioden möglich
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

              <Field
                label="Betrag pro Monat (CHF, brutto)"
                hint="vor Steuerabzug — Steuern werden separat berechnet (Block 3 unten)"
              >
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
                  placeholder="z.B. 8'500"
                  className={`${inputClass} tabular-nums`}
                />
              </Field>

              <Field label="Von (Monat)">
                <MonthYearPicker
                  value={e.von}
                  onChange={(v) => updateEink(e.id, { von: v })}
                />
              </Field>
              <Field label="Bis (Monat)" hint="leer = bis Pensionierung / offen">
                <MonthYearPicker
                  value={e.bis}
                  onChange={(v) => updateEink(e.id, { bis: v })}
                  allowEmpty
                />
              </Field>
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

      {/* Steuern — optionaler Anker aus letzter Veranlagung */}
      <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">
          Steuern
          <span className="ml-2 text-xs font-normal text-slate-400">
            optional — die Engine rechnet sonst aus dem Netto-Einkommen
          </span>
        </legend>

        <Field
          label="Aktuelle Jahressteuer (CHF) — laut letzter Veranlagung"
          hint="leer lassen, wenn unbekannt — dann nutzt die Engine die ESTV-Tarif-Berechnung pro Kanton/Gemeinde"
        >
          <input
            type="number"
            inputMode="numeric"
            value={budget.steuernHeute ?? ""}
            onChange={(e) =>
              setSteuerAnker(
                e.target.value === "" ? null : Number(e.target.value),
                budget.einkommenHeute
              )
            }
            placeholder={
              indikativHeute != null
                ? `z.B. ${formatChf(indikativHeute)} (indikativ)`
                : "z.B. 30'000"
            }
            className={`${inputClass} tabular-nums`}
          />
        </Field>

        {indikativHeute != null && budget.steuernHeute == null && (
          <p className="text-xs text-slate-500">
            Engine schätzt: ca. {formatChf(indikativHeute)} Steuer/Jahr auf
            das Netto-Einkommen — Religion und Wohnort werden in Block 1
            erfasst.
          </p>
        )}
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


"use client";

import { useEffect } from "react";
import {
  usePlanStore,
  type AusgabenKategorien,
  type AusgabenModus,
  type Einkommensperiode,
} from "@/lib/store";
import { indikativeSteuerHeute } from "@/engine/steuer";
import { Field } from "@/components/ui/Field";
import { MonthYearPicker } from "@/components/ui/MonthYearPicker";
import { inputClass } from "@/components/ui/styles";
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
  const setAlimente = usePlanStore((s) => s.setAlimente);
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
            netto pro Monat — mehrere Einkommen möglich (Hauptjob, Nebenjob,
            Renten, Mieteinnahmen Privat usw.)
          </span>
        </legend>

        <EinkommenInlineListe
          items={budget.einkommen}
          fallart={fallart}
          personOption={personOption}
          onAdd={addEink}
          onUpdate={updateEink}
          onRemove={removeEink}
        />
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

      {/* Alimente / Unterhalt — voll abzugsfähig nach Art. 33 DBG */}
      <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">
          Alimente / Unterhalt
          <span className="ml-2 text-xs font-normal text-slate-400">
            optional — Unterhaltsbeiträge an Ex-Partner oder Kinder
          </span>
        </legend>

        <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={budget.alimente.aktiv}
            onChange={(e) => setAlimente({ aktiv: e.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-slate-300"
          />
          <span>
            Alimente / Unterhaltsbeiträge sind Teil meiner Situation
            <span className="block text-xs font-normal text-slate-500">
              Zahlende Person: Abzug vom steuerbaren Einkommen (Art. 33 Abs. 1
              lit. c DBG). Empfangende Person: voll steuerbar als Einkommen
              (Art. 23 lit. f DBG).
            </span>
          </span>
        </label>

        {budget.alimente.aktiv && (
          <div className="space-y-3">
            <div>
              <div className="mb-1 text-xs font-medium text-slate-600">Richtung</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAlimente({ richtung: "zahlt" })}
                  className={`rounded-md border px-3 py-2 text-xs ${
                    budget.alimente.richtung === "zahlt"
                      ? "border-blue-400 bg-blue-50 text-blue-800"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Ich zahle Alimente
                </button>
                <button
                  type="button"
                  onClick={() => setAlimente({ richtung: "erhaelt" })}
                  className={`rounded-md border px-3 py-2 text-xs ${
                    budget.alimente.richtung === "erhaelt"
                      ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Ich erhalte Alimente
                </button>
              </div>
            </div>
            <Field
              label="Betrag (CHF/Jahr)"
              hint="Vollständige jährliche Unterhaltszahlung — wird laufend wirksam"
            >
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={budget.alimente.betragJahr ?? ""}
                onChange={(e) =>
                  setAlimente({
                    betragJahr:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                placeholder="z.B. 24'000"
                className={`${inputClass} tabular-nums`}
              />
            </Field>
          </div>
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

/* ═══════════════════════════════════════════════════════════════════════
   Einnahmen — Inline-Liste mit Auto-First-Row
   ═══════════════════════════════════════════════════════════════════════ */

function EinkommenInlineListe({
  items,
  fallart,
  personOption,
  onAdd,
  onUpdate,
  onRemove,
}: {
  items: Einkommensperiode[];
  fallart: "einzel" | "paar";
  personOption: (idx: 1 | 2) => string;
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<Einkommensperiode>) => void;
  onRemove: (id: string) => void;
}) {
  // Auto-First-Row: wenn die Liste leer ist, eine erste Zeile erzeugen
  // damit der Berater direkt tippen kann. Lazy via useEffect.
  useEffect(() => {
    if (items.length === 0) onAdd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {items.map((e, idx) => (
          <li
            key={e.id}
            className="relative rounded-md border border-slate-200 bg-white p-3 pt-7"
          >
            {/* Entfernen-Button — absolut top-right, raus aus dem Grid */}
            <button
              type="button"
              onClick={() => onRemove(e.id)}
              className="absolute right-2 top-2 text-[11px] text-red-600 hover:underline"
              title="Einnahme entfernen"
              disabled={items.length === 1}
              style={{ opacity: items.length === 1 ? 0.3 : 1 }}
            >
              ✕ Entfernen
            </button>

            <div className="grid grid-cols-12 gap-2">
              {/* Beschreibung — 4 cols */}
              <div className="col-span-12 sm:col-span-4">
                <label
                  className="mb-1 block text-[11px] font-medium"
                  style={{ color: "var(--ink-2)" }}
                >
                  Beschreibung
                </label>
                <input
                  type="text"
                  value={e.beschreibung}
                  onChange={(ev) =>
                    onUpdate(e.id, { beschreibung: ev.target.value })
                  }
                  placeholder={
                    idx === 0 ? "Hauptjob" : "z.B. Teilzeit, Rente, Miete"
                  }
                  className={inputClass}
                />
              </div>

              {/* Betrag — 2 cols */}
              <div className="col-span-6 sm:col-span-2">
                <label
                  className="mb-1 block text-[11px] font-medium"
                  style={{ color: "var(--ink-2)" }}
                >
                  CHF / Monat (netto)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={e.betragMonatlich ?? ""}
                  onChange={(ev) =>
                    onUpdate(e.id, {
                      betragMonatlich:
                        ev.target.value === "" ? null : Number(ev.target.value),
                    })
                  }
                  placeholder="z.B. 7'500"
                  className={`${inputClass} tabular-nums`}
                />
              </div>

              {/* Von — 3 cols (Picker braucht ~200px für Monat+Jahr) */}
              <div className="col-span-6 sm:col-span-3">
                <label
                  className="mb-1 block text-[11px] font-medium"
                  style={{ color: "var(--ink-2)" }}
                >
                  Von
                </label>
                <MonthYearPicker
                  value={e.von}
                  onChange={(v) => onUpdate(e.id, { von: v })}
                />
              </div>

              {/* Bis — 3 cols */}
              <div className="col-span-12 sm:col-span-3">
                <label
                  className="mb-1 block text-[11px] font-medium"
                  style={{ color: "var(--ink-2)" }}
                >
                  Bis
                </label>
                <MonthYearPicker
                  value={e.bis}
                  onChange={(v) => onUpdate(e.id, { bis: v })}
                  allowEmpty
                />
              </div>

              {/* Person-Dropdown nur bei Paar */}
              {fallart === "paar" && (
                <div className="col-span-12">
                  <label
                    className="mb-1 block text-[11px] font-medium"
                    style={{ color: "var(--ink-2)" }}
                  >
                    Person
                  </label>
                  <div className="flex gap-2">
                    {([1, 2] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => onUpdate(e.id, { personIdx: p })}
                        className={`rounded-md border px-3 py-1 text-xs transition ${
                          e.personIdx === p
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {personOption(p)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div
              className="mt-1 text-[10px]"
              style={{ color: "var(--ink-3)" }}
            >
              Bis-Feld leer = bis Pensionierung / offen
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onAdd}
        className="mt-1 w-full rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:border-slate-400 hover:text-slate-800"
      >
        + Weitere Einnahme hinzufügen
      </button>
    </div>
  );
}

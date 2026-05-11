"use client";

import {
  usePlanStore,
  type NachlassThemaKey,
} from "@/lib/store";
import { Field } from "@/components/ui/Field";
import { inputClass } from "@/components/ui/styles";

const THEMEN: { key: NachlassThemaKey; titel: string; erklaerung: string }[] = [
  {
    key: "vorsorgeauftrag",
    titel: "Vorsorgeauftrag",
    erklaerung:
      "Regelt im Voraus, wer Personensorge, Vermögenssorge und Rechtsverkehr für Sie übernimmt, wenn Sie urteilsunfähig werden. Muss eigenhändig verfasst oder öffentlich beurkundet sein.",
  },
  {
    key: "patientenverfuegung",
    titel: "Patientenverfügung",
    erklaerung:
      "Hält fest, welche medizinischen Massnahmen Sie bei Urteilsunfähigkeit wollen oder ablehnen — z.B. Reanimation, künstliche Ernährung, Schmerztherapie.",
  },
  {
    key: "generalvollmacht",
    titel: "Generalvollmacht",
    erklaerung:
      "Bevollmächtigt eine Person, in Ihrem Namen rechtliche und finanzielle Geschäfte zu erledigen. Gilt zu Lebzeiten und ist sofort wirksam (im Gegensatz zum Vorsorgeauftrag, der erst bei Urteilsunfähigkeit greift).",
  },
  {
    key: "testament",
    titel: "Testament",
    erklaerung:
      "Regelt, wer nach Ihrem Tod wie viel vom Vermögen erhält — im Rahmen der gesetzlichen Pflichtteile. Eigenhändig oder öffentlich beurkundet.",
  },
  {
    key: "erbvertrag",
    titel: "Erbvertrag",
    erklaerung:
      "Verbindlicher Vertrag mit Erben über die Nachlassregelung — kann nur einvernehmlich aufgelöst oder geändert werden. Sinnvoll bei Patchwork, Unternehmen oder grossen Vermögen.",
  },
  {
    key: "ehevertrag",
    titel: "Ehevertrag",
    erklaerung:
      "Regelt den Güterstand der Ehe (Errungenschaftsbeteiligung, Gütertrennung oder Gütergemeinschaft). Beeinflusst die Vermögensaufteilung bei Trennung und im Todesfall.",
  },
];

export function Block10Nachlass() {
  const nachlass = usePlanStore((s) => s.nachlass);
  const setNachlass = usePlanStore((s) => s.setNachlass);
  const erbschaft = usePlanStore((s) => s.erbschaft);
  const setErbschaft = usePlanStore((s) => s.setErbschaft);

  // "Erledigt" = entweder explizit "gemacht" oder "nicht_notwendig" (= bewusst entschieden)
  const erledigt = THEMEN.filter(
    (t) => nachlass[t.key] === "ja" || nachlass[t.key] === "nicht_notwendig"
  ).length;

  return (
    <div className="space-y-6">
      {/* Anwartschaften / erwartete Erbschaft */}
      <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">
          Anwartschaften
          <span className="ml-2 text-xs font-normal text-slate-400">
            erwartete Erbschaften / Schenkungen in den nächsten Jahren
          </span>
        </legend>

        <Field
          label="Wird in den nächsten Jahren eine Erbschaft / ein Erbvorbezug erwartet?"
          hint="bewusst weich gefragt — der Mandant darf 'möglich' wählen ohne sich festzulegen"
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                { value: "ja_absehbar", label: "Ja, absehbar" },
                { value: "moeglich", label: "Möglich" },
                { value: "nein", label: "Nein" },
                { value: "keine_angabe", label: "Keine Angabe" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setErbschaft({ erwartet: opt.value })}
                className={`rounded-md border px-3 py-2 text-sm transition ${
                  erbschaft.erwartet === opt.value
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>

        {(erbschaft.erwartet === "ja_absehbar" ||
          erbschaft.erwartet === "moeglich") && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Erwarteter Betrag (CHF)">
                <input
                  type="number"
                  inputMode="numeric"
                  value={erbschaft.erwartetBetrag ?? ""}
                  onChange={(e) =>
                    setErbschaft({
                      erwartetBetrag:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  placeholder="z.B. 350'000"
                  className={`${inputClass} tabular-nums`}
                />
              </Field>
              <Field label="Erwartetes Jahr">
                <input
                  type="number"
                  min={2024}
                  max={2080}
                  value={erbschaft.erwartetJahr ?? ""}
                  onChange={(e) =>
                    setErbschaft({
                      erwartetJahr:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  placeholder="z.B. 2032"
                  className={`${inputClass} tabular-nums`}
                />
              </Field>
            </div>
            <ToggleRow
              label="Im Vermögensverlauf berücksichtigen"
              hint="Wenn aktiv: Erbschaft fliesst im Erwartungs-Jahr als Einmaleingang ins Hauptkonto"
              checked={erbschaft.erwartetBeruecksichtigen}
              onChange={(v) => setErbschaft({ erwartetBeruecksichtigen: v })}
            />
          </>
        )}

        <Field
          label="Schenkungen / Erbvorbezüge an Kinder"
          hint="bereits getätigt, geplant oder nicht vorgesehen?"
        >
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { value: "getaetigt", label: "Bereits getätigt" },
                { value: "geplant", label: "Geplant" },
                { value: "nein", label: "Nein" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setErbschaft({ schenkungenStatus: opt.value })}
                className={`rounded-md border px-3 py-2 text-sm transition ${
                  erbschaft.schenkungenStatus === opt.value
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>

        {(erbschaft.schenkungenStatus === "getaetigt" ||
          erbschaft.schenkungenStatus === "geplant") && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Betrag (CHF)">
                <input
                  type="number"
                  inputMode="numeric"
                  value={erbschaft.schenkungenBetrag ?? ""}
                  onChange={(e) =>
                    setErbschaft({
                      schenkungenBetrag:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  placeholder="z.B. 100'000"
                  className={`${inputClass} tabular-nums`}
                />
              </Field>
              <Field label="Jahr">
                <input
                  type="number"
                  min={1990}
                  max={2080}
                  value={erbschaft.schenkungenJahr ?? ""}
                  onChange={(e) =>
                    setErbschaft({
                      schenkungenJahr:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  placeholder={
                    erbschaft.schenkungenStatus === "getaetigt"
                      ? "z.B. 2023"
                      : "z.B. 2027"
                  }
                  className={`${inputClass} tabular-nums`}
                />
              </Field>
            </div>
            <ToggleRow
              label="Als Minus im Vermögensverlauf berücksichtigen"
              hint={
                erbschaft.schenkungenStatus === "getaetigt"
                  ? "Bei 'getätigt': falls die Schenkung schon im aktuellen Vermögen abgebildet ist, lassen Sie den Toggle aus"
                  : "Bei 'geplant': im Schenkungsjahr fliesst der Betrag als Einmal-Ausgang aus dem Hauptkonto"
              }
              checked={erbschaft.schenkungenBeruecksichtigen}
              onChange={(v) => setErbschaft({ schenkungenBeruecksichtigen: v })}
            />
            <Field
              label="Details (optional)"
              hint="Begünstigte und Hintergrund — frei in Worten"
            >
              <textarea
                value={erbschaft.schenkungenDetails}
                onChange={(e) =>
                  setErbschaft({ schenkungenDetails: e.target.value })
                }
                rows={2}
                placeholder="z.B. Erbvorbezug an Tochter Sarah, später als Anzahlung Eigentumswohnung"
                className={`${inputClass} resize-none`}
              />
            </Field>
          </>
        )}
      </fieldset>

      {/* Vorsorge-Dokumente */}
      <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">
          Vorsorge- und Nachlassdokumente
          <span className="ml-2 text-xs font-normal text-slate-400">
            {erledigt} von {THEMEN.length} erledigt
          </span>
        </legend>

        <ul className="space-y-2">
          {THEMEN.map((t) => (
            <ThemaCard
              key={t.key}
              titel={t.titel}
              erklaerung={t.erklaerung}
              erledigt={nachlass[t.key]}
              onToggle={(v) => setNachlass(t.key, v)}
            />
          ))}
        </ul>
      </fieldset>

      <p className="text-xs text-slate-400">
        Die Nachlassthemen sollten in jeder Pensionsplanung mindestens einmal
        besprochen sein. Beratung dazu erfolgt im Termin — die Tools für die
        Erstellung können von Notar, Anwalt oder spezialisierten Plattformen
        kommen.
      </p>
    </div>
  );
}


function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition ${
        checked
          ? "border-blue-300 bg-blue-50/40"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      />
      <div className="flex-1">
        <div className="text-sm font-medium text-slate-700">{label}</div>
        {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
      </div>
    </label>
  );
}

function ThemaCard({
  titel,
  erklaerung,
  erledigt,
  onToggle,
}: {
  titel: string;
  erklaerung: string;
  erledigt: import("@/lib/store").NachlassStatus;
  onToggle: (v: import("@/lib/store").NachlassStatus) => void;
}) {
  const borderColor =
    erledigt === "ja"
      ? "border-emerald-300 bg-emerald-50/40"
      : erledigt === "nicht_notwendig"
        ? "border-slate-200 bg-slate-50/60"
        : "border-slate-200 bg-white";
  return (
    <li className={`rounded-md border p-3 transition ${borderColor}`}>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">{titel}</span>
          {erledigt === "ja" && (
            <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
              Gemacht
            </span>
          )}
          {erledigt === "nicht_notwendig" && (
            <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
              Nicht nötig
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500">{erklaerung}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onToggle("ja")}
            className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition ${
              erledigt === "ja"
                ? "border-emerald-500 bg-emerald-100 text-emerald-800"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            ✓ Gemacht
          </button>
          <button
            type="button"
            onClick={() => onToggle("nein")}
            className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition ${
              erledigt === "nein"
                ? "border-amber-400 bg-amber-50 text-amber-800"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            ✗ Nicht gemacht
          </button>
          <button
            type="button"
            onClick={() => onToggle("nicht_notwendig")}
            className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition ${
              erledigt === "nicht_notwendig"
                ? "border-slate-400 bg-slate-100 text-slate-800"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            — Nicht nötig
          </button>
        </div>
      </div>
    </li>
  );
}

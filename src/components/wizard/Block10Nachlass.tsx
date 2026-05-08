"use client";

import { usePlanStore, type NachlassThemaKey } from "@/lib/store";

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

  const erledigt = THEMEN.filter((t) => nachlass[t.key]).length;

  return (
    <div className="space-y-6">
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

function ThemaCard({
  titel,
  erklaerung,
  erledigt,
  onToggle,
}: {
  titel: string;
  erklaerung: string;
  erledigt: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <li
      className={`rounded-md border p-3 transition ${
        erledigt
          ? "border-emerald-300 bg-emerald-50/40"
          : "border-slate-200 bg-white"
      }`}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={erledigt}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-0.5 size-4 cursor-pointer rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
        />
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">{titel}</span>
            {erledigt && (
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                Erledigt
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">{erklaerung}</p>
        </div>
      </label>
    </li>
  );
}

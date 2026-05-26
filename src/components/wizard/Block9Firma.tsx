"use client";

import { usePlanStore, type FirmaInput } from "@/lib/store";
import { Field } from "@/components/ui/Field";
import { inputClass } from "@/components/ui/styles";

const PLAENE: { value: FirmaInput["plan"]; label: string; sub: string }[] = [
  { value: "behalten", label: "Behalten", sub: "weiterführen oder familien-intern übergeben" },
  { value: "verkaufen", label: "Verkaufen", sub: "Erlös fliesst ins Vermögen" },
];

export function Block9Firma() {
  const firma = usePlanStore((s) => s.firma);
  const setFirma = usePlanStore((s) => s.setFirma);

  return (
    <div className="space-y-6">
      <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">
          Firma / Selbständigkeit
        </legend>

        <div>
          <div className="mb-1 text-xs font-medium text-slate-600">
            Eigene Firma oder Beteiligung &gt; 10%?
          </div>
          <div className="flex gap-2">
            {[
              { v: true, l: "Ja" },
              { v: false, l: "Nein" },
            ].map((o) => (
              <button
                key={o.l}
                type="button"
                onClick={() =>
                  setFirma({
                    vorhanden: o.v,
                    // Bei "Nein" wird Block automatisch als geprüft markiert
                    // (Berater hat aktiv bestätigt, keine Firma).
                    geprueft: o.v === false ? true : firma.geprueft,
                  })
                }
                className={`flex-1 rounded-md border px-3 py-2 text-sm transition ${
                  firma.vorhanden === o.v
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>

        {firma.vorhanden && (
          <>
            <Field label="Firmenname">
              <input
                type="text"
                value={firma.firmenname}
                onChange={(e) => setFirma({ firmenname: e.target.value })}
                placeholder="z.B. Cuira Partners GmbH"
                className={inputClass}
              />
            </Field>

            <Field
              label="Möglicher Verkaufserlös bei Pensionierung (CHF)"
              hint="Schätzung — wird ggf. später durch professionelle Bewertung ersetzt"
            >
              <input
                type="number"
                inputMode="numeric"
                value={firma.moeglicherVerkaufserloes ?? ""}
                onChange={(e) =>
                  setFirma({
                    moeglicherVerkaufserloes:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                placeholder="z.B. 500'000"
                className={`${inputClass} tabular-nums`}
              />
            </Field>

            <div>
              <div className="mb-1 text-xs font-medium text-slate-600">
                Plan bei Pensionierung
              </div>
              <div className="flex gap-2">
                {PLAENE.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setFirma({ plan: p.value })}
                    className={`flex-1 rounded-md border px-3 py-2 text-left text-sm transition ${
                      firma.plan === p.value
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

            {firma.plan === "verkaufen" && (
              <Field label="Verkaufsjahr">
                <input
                  type="number"
                  min={2024}
                  max={2080}
                  value={firma.verkaufsjahr}
                  onChange={(e) =>
                    setFirma({ verkaufsjahr: Number(e.target.value) })
                  }
                  className={`${inputClass} w-32 tabular-nums`}
                />
              </Field>
            )}
          </>
        )}
      </fieldset>

      <p className="text-xs text-slate-400">
        Nachfolge-Lösung, Lohn vs. Dividende und steuerliche Gestaltung folgen mit
        der Steuer-Engine in Etappe 2.
      </p>
    </div>
  );
}


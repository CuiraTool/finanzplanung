"use client";

import { usePlanStore } from "@/lib/store";
import { Block1Personen } from "./Block1Personen";

/**
 * Wizard-Block-Reihenfolge.
 *
 * Mapping zu den Typeform-Blöcken (siehe docs/Pensionsplanung_Typeform_Optimierung):
 *  1 → A + B (Personen: Kopfdaten, Zivilstand, Familie, Pensionsziel)
 *  2 → D     (Ziele & Wünsche)
 *  3 → E     (1. Säule AHV)
 *  4 → F     (2. Säule Pensionskasse)
 *  5 → G     (3. Säule 3a/3b)
 *  6 → H     (Vermögen, Liquidität, Verbindlichkeiten)
 *  7 → I+J+K (Immobilien: Eigenheim, Ferien, Rendite)
 *  8 → L     (Firma / Selbständigkeit)
 *  9 → N+Q   (Nachlass: Erbschaft/Schenkung + Vorsorge-/Nachlassdokumente)
 */
const BLOCKS = [
  { id: 1, title: "Personen" },
  { id: 2, title: "Ziele & Wünsche" },
  { id: 3, title: "1. Säule (AHV)" },
  { id: 4, title: "2. Säule (Pensionskasse)" },
  { id: 5, title: "3. Säule (3a / 3b)" },
  { id: 6, title: "Vermögen" },
  { id: 7, title: "Immobilien" },
  { id: 8, title: "Firma / Selbständigkeit" },
  { id: 9, title: "Nachlass" },
] as const;

export function Wizard() {
  const aktiverBlock = usePlanStore((s) => s.aktiverBlock);
  const setAktiverBlock = usePlanStore((s) => s.setAktiverBlock);

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold">Pensionsplanung</h1>
        <p className="text-sm text-slate-500">Eingabe</p>
      </header>

      <ol className="mb-6 space-y-1">
        {BLOCKS.map((b) => {
          const isActive = aktiverBlock === b.id;
          const isImplemented = b.id === 1;
          return (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => isImplemented && setAktiverBlock(b.id)}
                disabled={!isImplemented}
                className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition ${
                  isActive
                    ? "border-blue-600 bg-blue-50"
                    : isImplemented
                      ? "border-slate-200 bg-slate-50 hover:border-slate-300"
                      : "border-slate-200 bg-slate-50 text-slate-400"
                }`}
              >
                <span
                  className={`flex size-6 items-center justify-center rounded-full text-xs font-medium tabular-nums ${
                    isActive ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {b.id}
                </span>
                <span className="flex-1">{b.title}</span>
                {!isImplemented && (
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">
                    bald
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {aktiverBlock === 1 && <Block1Personen />}
    </div>
  );
}

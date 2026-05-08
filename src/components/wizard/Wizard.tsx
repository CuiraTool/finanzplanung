"use client";

import { usePlanStore } from "@/lib/store";
import { Block1Personen } from "./Block1Personen";
import { Block2Wuensche } from "./Block2Wuensche";
import { Block3Budget } from "./Block3Budget";
import { Block4Ahv } from "./Block4Ahv";
import { Block5Bvg } from "./Block5Bvg";
import { Block6Saeule3 } from "./Block6Saeule3";
import { Block7Vermoegen } from "./Block7Vermoegen";
import { Block8Immobilien } from "./Block8Immobilien";
import { Block10Nachlass } from "./Block10Nachlass";

/**
 * Wizard-Block-Reihenfolge.
 *
 * Mapping zu den Typeform-Blöcken (siehe docs/Pensionsplanung_Typeform_Optimierung):
 *   1 → A + B (Personen: Kopfdaten, Zivilstand, Familie, Adresse, Kontakt)
 *   2 → C + D (Ziele: Pensionierungsalter ordentlich/Wunsch, einmalige Ausgaben)
 *   3 → H/aktuell (Budget: monatlicher Verbrauch heute + Wunsch in Pension) — NEU
 *   4 → E     (1. Säule AHV)
 *   5 → F     (2. Säule Pensionskasse)
 *   6 → G     (3. Säule 3a/3b)
 *   7 → H-Vermögensteil (Liquidität, Wertschriften, Verbindlichkeiten)
 *   8 → I+J+K (Immobilien: Eigenheim, Ferien, Rendite)
 *   9 → L     (Firma / Selbständigkeit)
 *  10 → N+Q   (Nachlass: Erbschaft/Schenkung + Vorsorge-/Nachlassdokumente)
 */
const BLOCKS = [
  { id: 1, title: "Personen", implemented: true },
  { id: 2, title: "Ziele & Wünsche", implemented: true },
  { id: 3, title: "Budget", implemented: true },
  { id: 4, title: "1. Säule (AHV)", implemented: true },
  { id: 5, title: "2. Säule (Pensionskasse)", implemented: true },
  { id: 6, title: "3. Säule (3a / 3b)", implemented: true },
  { id: 7, title: "Vermögen", implemented: true },
  { id: 8, title: "Immobilien", implemented: true },
  { id: 9, title: "Firma / Selbständigkeit", implemented: false },
  { id: 10, title: "Nachlass", implemented: true },
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
          return (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => b.implemented && setAktiverBlock(b.id)}
                disabled={!b.implemented}
                className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition ${
                  isActive
                    ? "border-blue-600 bg-blue-50"
                    : b.implemented
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
                {!b.implemented && (
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
      {aktiverBlock === 2 && <Block2Wuensche />}
      {aktiverBlock === 3 && <Block3Budget />}
      {aktiverBlock === 4 && <Block4Ahv />}
      {aktiverBlock === 5 && <Block5Bvg />}
      {aktiverBlock === 6 && <Block6Saeule3 />}
      {aktiverBlock === 7 && <Block7Vermoegen />}
      {aktiverBlock === 8 && <Block8Immobilien />}
      {aktiverBlock === 10 && <Block10Nachlass />}
    </div>
  );
}

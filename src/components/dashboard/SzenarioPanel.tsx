"use client";

import {
  usePlanStore,
  type SzenarioBOverrides,
  type BezugsPraeferenz,
} from "@/lib/store";
import { personLabel } from "@/lib/pension";

const PRAEFERENZEN: { value: BezugsPraeferenz; label: string }[] = [
  { value: "rente", label: "Rente" },
  { value: "kapital", label: "Kapital" },
  { value: "mischung", label: "Mischung" },
];

export function SzenarioPanel() {
  const fallart = usePlanStore((s) => s.fallart);
  const person1 = usePlanStore((s) => s.person1);
  const person2 = usePlanStore((s) => s.person2);
  const ziele = usePlanStore((s) => s.ziele);
  const ahv = usePlanStore((s) => s.ahv);
  const bvg = usePlanStore((s) => s.bvg);
  const szenarioB = usePlanStore((s) => s.szenarioB);
  const setAktiv = usePlanStore((s) => s.setSzenarioBAktiv);
  const setOverride = usePlanStore((s) => s.setSzenarioBOverride);

  if (!szenarioB.aktiv) {
    return (
      <button
        type="button"
        onClick={() => setAktiv(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-violet-300 bg-violet-50/40 px-4 py-3 text-sm text-violet-700 transition hover:border-violet-400 hover:bg-violet-50"
      >
        <span className="text-base leading-none">+</span>
        <span>Variante B vergleichen (Frühpensionierung, Kapitalbezug …)</span>
      </button>
    );
  }

  const o = szenarioB.overrides;

  // Effektive Werte = Override falls gesetzt, sonst Plan-A-Wert
  const eff = {
    bezugsalterP1: o.bezugsalterP1 ?? ziele.bezugsalterP1,
    bezugsalterP2: o.bezugsalterP2 ?? ziele.bezugsalterP2,
    ahvBezugsalterP1: o.ahvBezugsalterP1 ?? ahv.ahvBezugsalterP1,
    ahvBezugsalterP2: o.ahvBezugsalterP2 ?? ahv.ahvBezugsalterP2,
    bvgPraefP1: o.bvgBezugspraeferenzP1 ?? bvg.p1.bezugspraeferenz,
    bvgPraefP2: o.bvgBezugspraeferenzP2 ?? bvg.p2.bezugspraeferenz,
  };

  return (
    <div className="rounded-xl border border-violet-300 bg-violet-50/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-violet-900">
            Variante B — Vergleichsszenario
          </div>
          <div className="text-xs text-violet-700/80">
            Charts zeigen B als gestrichelte Linie + Differenz pro Stichtag
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAktiv(false)}
          className="text-xs text-violet-700 hover:underline"
        >
          Schliessen
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <PersonSpalte
          title={personLabel(1, person1.vorname, fallart)}
          bezugsalterPlanA={ziele.bezugsalterP1}
          ahvBezugsalterPlanA={ahv.ahvBezugsalterP1}
          bvgPraefPlanA={bvg.p1.bezugspraeferenz}
          eff={{
            bezugsalter: eff.bezugsalterP1,
            ahvBezugsalter: eff.ahvBezugsalterP1,
            bvgPraef: eff.bvgPraefP1,
          }}
          onPatch={(p) =>
            setOverride({
              bezugsalterP1: p.bezugsalter,
              ahvBezugsalterP1: p.ahvBezugsalter,
              bvgBezugspraeferenzP1: p.bvgPraef,
            })
          }
        />
        {fallart === "paar" && (
          <PersonSpalte
            title={personLabel(2, person2.vorname, fallart)}
            bezugsalterPlanA={ziele.bezugsalterP2}
            ahvBezugsalterPlanA={ahv.ahvBezugsalterP2}
            bvgPraefPlanA={bvg.p2.bezugspraeferenz}
            eff={{
              bezugsalter: eff.bezugsalterP2,
              ahvBezugsalter: eff.ahvBezugsalterP2,
              bvgPraef: eff.bvgPraefP2,
            }}
            onPatch={(p) =>
              setOverride({
                bezugsalterP2: p.bezugsalter,
                ahvBezugsalterP2: p.ahvBezugsalter,
                bvgBezugspraeferenzP2: p.bvgPraef,
              })
            }
          />
        )}
      </div>
    </div>
  );
}

function PersonSpalte({
  title,
  bezugsalterPlanA,
  ahvBezugsalterPlanA,
  bvgPraefPlanA,
  eff,
  onPatch,
}: {
  title: string;
  bezugsalterPlanA: number;
  ahvBezugsalterPlanA: number;
  bvgPraefPlanA: BezugsPraeferenz;
  eff: {
    bezugsalter: number;
    ahvBezugsalter: number;
    bvgPraef: BezugsPraeferenz;
  };
  onPatch: (p: {
    bezugsalter?: number;
    ahvBezugsalter?: number;
    bvgPraef?: BezugsPraeferenz;
  }) => void;
}) {
  return (
    <div className="space-y-2 rounded-md border border-violet-200 bg-white p-3">
      <div className="text-xs font-medium text-slate-700">{title}</div>

      <Compact label="Pensionierungsalter">
        <select
          value={eff.bezugsalter}
          onChange={(e) => onPatch({ bezugsalter: Number(e.target.value) })}
          className={selectClass}
        >
          {alterRange(58, 70).map((a) => (
            <option key={a} value={a}>
              {a}
              {a === bezugsalterPlanA ? " (Plan A)" : ""}
            </option>
          ))}
        </select>
      </Compact>

      <Compact label="AHV-Bezugsalter">
        <select
          value={eff.ahvBezugsalter}
          onChange={(e) => onPatch({ ahvBezugsalter: Number(e.target.value) })}
          className={selectClass}
        >
          {alterRange(63, 70).map((a) => (
            <option key={a} value={a}>
              {a}
              {a === ahvBezugsalterPlanA ? " (Plan A)" : ""}
            </option>
          ))}
        </select>
      </Compact>

      <Compact label="PK-Bezugspräferenz">
        <select
          value={eff.bvgPraef}
          onChange={(e) =>
            onPatch({ bvgPraef: e.target.value as BezugsPraeferenz })
          }
          className={selectClass}
        >
          {PRAEFERENZEN.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
              {p.value === bvgPraefPlanA ? " (Plan A)" : ""}
            </option>
          ))}
        </select>
      </Compact>
    </div>
  );
}

function Compact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-2">
      <span className="text-xs text-slate-600">{label}</span>
      {children}
    </div>
  );
}

function alterRange(min: number, max: number): number[] {
  const out: number[] = [];
  for (let a = min; a <= max; a++) out.push(a);
  return out;
}

const selectClass =
  "w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs focus:border-violet-500 focus:outline-none";

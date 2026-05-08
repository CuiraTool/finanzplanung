"use client";

import {
  usePlanStore,
  type BezugsPraeferenz,
  type ImmobilienPlan,
} from "@/lib/store";
import { personLabel } from "@/lib/pension";
import { formatChf } from "@/lib/format";

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
  const budget = usePlanStore((s) => s.budget);
  const immobilien = usePlanStore((s) => s.immobilien);
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

      <div className="space-y-3">
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

        {/* Cashflow-Stellschrauben */}
        <div className="space-y-2 rounded-md border border-violet-200 bg-white p-3">
          <div className="text-xs font-medium text-slate-700">Cashflow-Varianten</div>

          <Compact label="Erwerbseinkommen ×">
            <select
              value={szenarioB.overrides.einkommensMultiplikator ?? 1}
              onChange={(e) =>
                setOverride({
                  einkommensMultiplikator: Number(e.target.value),
                })
              }
              className={selectClass}
            >
              <option value={0.7}>0.7 (−30%)</option>
              <option value={0.8}>0.8 (−20%)</option>
              <option value={0.9}>0.9 (−10%)</option>
              <option value={1}>1.0 (Plan A)</option>
              <option value={1.1}>1.1 (+10%)</option>
              <option value={1.2}>1.2 (+20%)</option>
              <option value={1.3}>1.3 (+30%)</option>
            </select>
          </Compact>

          <Compact label={`Wunschverbrauch Pension (CHF/Mt)`}>
            <input
              type="number"
              inputMode="numeric"
              value={
                szenarioB.overrides.wunschverbrauchPension ??
                budget.wunschverbrauchPension ??
                ""
              }
              onChange={(e) =>
                setOverride({
                  wunschverbrauchPension:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
              placeholder={
                budget.wunschverbrauchPension != null
                  ? `Plan A: ${formatChf(budget.wunschverbrauchPension)}`
                  : "z.B. 6'000"
              }
              className={`${inputClass} tabular-nums`}
            />
          </Compact>

          <Compact label="Ausgaben heute total (CHF/Mt)">
            <input
              type="number"
              inputMode="numeric"
              value={
                szenarioB.overrides.ausgabenTotal ??
                budget.ausgabenTotal ??
                ""
              }
              onChange={(e) =>
                setOverride({
                  ausgabenTotal:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
              placeholder={
                budget.ausgabenTotal != null
                  ? `Plan A: ${formatChf(budget.ausgabenTotal)}`
                  : "z.B. 8'500"
              }
              className={`${inputClass} tabular-nums`}
            />
          </Compact>
        </div>

        {/* Immobilien-Plan-Overrides */}
        {immobilien.items.length > 0 && (
          <div className="space-y-2 rounded-md border border-violet-200 bg-white p-3">
            <div className="text-xs font-medium text-slate-700">
              Immobilien-Pläne
            </div>
            {immobilien.items.map((im, idx) => {
              const ov = szenarioB.overrides.immobilienOverrides?.[im.id];
              const effPlan = ov?.plan ?? im.plan;
              const effJahr = ov?.verkaufsjahr ?? im.verkaufsjahr;
              return (
                <div
                  key={im.id}
                  className="grid grid-cols-[1fr_140px_100px] items-center gap-2 text-xs"
                >
                  <span className="truncate text-slate-700">
                    {im.beschreibung || `Immobilie ${idx + 1}`}
                  </span>
                  <select
                    value={effPlan}
                    onChange={(e) => {
                      const aktuelleOv = szenarioB.overrides.immobilienOverrides ?? {};
                      setOverride({
                        immobilienOverrides: {
                          ...aktuelleOv,
                          [im.id]: { ...ov, plan: e.target.value as ImmobilienPlan },
                        },
                      });
                    }}
                    className={selectClass}
                  >
                    <option value="behalten">
                      Behalten{im.plan === "behalten" ? " (Plan A)" : ""}
                    </option>
                    <option value="verkaufen">
                      Verkaufen{im.plan === "verkaufen" ? " (Plan A)" : ""}
                    </option>
                  </select>
                  {effPlan === "verkaufen" && (
                    <input
                      type="number"
                      min={2024}
                      max={2080}
                      value={effJahr}
                      onChange={(e) => {
                        const aktuelleOv =
                          szenarioB.overrides.immobilienOverrides ?? {};
                        setOverride({
                          immobilienOverrides: {
                            ...aktuelleOv,
                            [im.id]: { ...ov, verkaufsjahr: Number(e.target.value) },
                          },
                        });
                      }}
                      className={`${selectClass} tabular-nums`}
                    />
                  )}
                </div>
              );
            })}
          </div>
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
const inputClass =
  "w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs focus:border-violet-500 focus:outline-none";

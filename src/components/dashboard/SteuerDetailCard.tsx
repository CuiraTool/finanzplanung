"use client";

import type { CashflowZeile } from "@/engine/cashflow";
import { steuerProJahr } from "@/engine/steuer";
import { usePlanStore } from "@/lib/store";
import { formatChf } from "@/lib/format";

interface Props {
  cashflow: CashflowZeile[];
}

/**
 * Steuer-Detail-Card unter dem Steuer-Chart.
 *
 * Zeigt vier KPI auf einen Blick:
 *  - Effektivsteuersatz heute  = Steuer / steuerbares Einkommen
 *  - Grenzsteuersatz (marginal) = Δ Steuer bei +1'000 CHF Einkommen
 *  - Lebenszeit-Steuerlast = Σ aller Einkommens- + Vermögens- + Kapital-
 *    Steuern über die gesamte Cashflow-Reihe
 *  - Kapitalauszahlungs-Steuer-Total: Σ aller Sondertarif-Bezüge
 *
 * Plus: Tabelle der Jahre mit Kapital-Sondertarif-Bezug — das sind die
 * fiskalisch teuersten Jahre eines Plans, müssen prominent sichtbar sein.
 */
export function SteuerDetailCard({ cashflow }: Props) {
  const kanton = usePlanStore((s) => s.adresse.kanton);
  const bfsId = usePlanStore((s) => s.adresse.gemeindeBfsId);
  const religion = usePlanStore((s) => s.budget.religion);
  const fallart = usePlanStore((s) => s.fallart);

  if (cashflow.length === 0) return null;

  const heuteJahr = new Date().getFullYear();
  const heuteZeile = cashflow.find((z) => z.jahr === heuteJahr) ?? cashflow[0]!;

  // Tiago-Fix: Effektivsteuersatz entfernt (machte für Mandant keinen Sinn).
  // Nur Grenzsteuersatz + Lebenszeit + Sondertarif sind die relevanten KPIs.
  const einkommenHeuteJahr =
    heuteZeile.einnahmenErwerb +
    heuteZeile.einnahmenAhv +
    heuteZeile.einnahmenBvgRente +
    heuteZeile.einnahmenMieten;

  // Grenzsteuersatz: extra-Berechnung mit Einkommen + 1'000
  const grenzProzent = berechneGrenzsteuersatz(
    einkommenHeuteJahr,
    kanton,
    bfsId ?? null,
    religion,
    fallart
  );

  // Lebenszeit-Steuerlast
  const lebenszeitSteuern = cashflow.reduce(
    (sum, z) => sum + z.ausgabenSteuern,
    0
  );

  // Kapital-Sondertarif: pro Jahr mit Bezug
  const kapitalJahre = cashflow.filter((z) => z.ausgabenSteuernKapital > 0);
  const kapitalSteuerTotal = kapitalJahre.reduce(
    (sum, z) => sum + z.ausgabenSteuernKapital,
    0
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <div>
          <div className="text-base font-semibold text-slate-700">
            Steuer-Detail
          </div>
          <div className="text-xs text-slate-500">
            Grenzsteuersatz (aktuelles Jahr) · Lebenszeit-Last · Sondertarif-Jahre
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <KpiTile
          label="Grenzsteuersatz (aktuelles Jahr)"
          value={`${grenzProzent.toFixed(1)} %`}
          sub="auf +1'000 CHF Mehreinkommen heute"
          accent="amber"
        />
        <KpiTile
          label="Lebenszeit-Steuern"
          value={formatChf(lebenszeitSteuern)}
          sub={`Σ ${cashflow.length} Jahre Planung`}
          accent="slate"
        />
        <KpiTile
          label="Kapitalauszahlung-Steuer"
          value={formatChf(kapitalSteuerTotal)}
          sub={
            kapitalJahre.length > 0
              ? `${kapitalJahre.length} Jahr${kapitalJahre.length > 1 ? "e" : ""} Sondertarif`
              : "keine Bezüge geplant"
          }
          accent="emerald"
        />
      </div>

      {kapitalJahre.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Kapitalbezüge (Sondertarif) — alle Bezüge pro Jahr summiert
          </div>
          <div className="mb-2 text-[11px] text-slate-500">
            Eine Zeile pro Bezugs-Jahr. Wenn PK + 3a im gleichen Jahr → Beträge summiert (Steuer-Sondertarif progressiv auf Total).
          </div>
          <div className="overflow-hidden rounded-md border border-slate-100">
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr className="text-left text-slate-500">
                  <th className="px-3 py-2 font-medium">Jahr</th>
                  <th className="px-3 py-2 text-right font-medium">Bezug</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Bund (1/5)
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    Kanton-Sondertarif
                  </th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  <th className="px-3 py-2 text-right font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {kapitalJahre.map((z) => {
                  const proz =
                    z.kapAuszahlungen > 0
                      ? (z.ausgabenSteuernKapital / z.kapAuszahlungen) * 100
                      : 0;
                  return (
                    <tr key={z.jahr} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium tabular-nums">
                        {z.jahr}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatChf(z.kapAuszahlungen)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                        {formatChf(z.ausgabenSteuernKapitalBund)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                        {formatChf(z.ausgabenSteuernKapitalKanton)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums text-amber-700">
                        {formatChf(z.ausgabenSteuernKapital)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                        {proz.toFixed(1)} %
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[10px] text-slate-400">
            Sondertarif = Bund 1/5 vom DBG-Tarif + Kanton-Sondertarif (in ZH
            BfsId-spezifisch, übrige Kantone 1/5-Approximation).
          </p>
        </div>
      )}
    </div>
  );
}

function KpiTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent: "blue" | "amber" | "slate" | "emerald";
}) {
  const farbe = {
    blue: { border: "border-blue-100", bg: "bg-blue-50/50", text: "text-blue-700" },
    amber: { border: "border-amber-100", bg: "bg-amber-50/50", text: "text-amber-700" },
    slate: { border: "border-slate-100", bg: "bg-slate-50", text: "text-slate-700" },
    emerald: { border: "border-emerald-100", bg: "bg-emerald-50/50", text: "text-emerald-700" },
  }[accent];

  return (
    <div className={`rounded-md border ${farbe.border} ${farbe.bg} p-3`}>
      <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${farbe.text}`}>
        {value}
      </div>
      <div className="mt-0.5 text-[10px] text-slate-400">{sub}</div>
    </div>
  );
}

/**
 * Grenzsteuersatz = (Steuer bei Einkommen+1000) − (Steuer bei Einkommen).
 * Marginal-Belastung auf das nächste verdiente CHF 1'000.
 */
function berechneGrenzsteuersatz(
  einkommen: number,
  kanton: string,
  bfsId: number | null,
  religion: import("@/lib/store").Religion,
  fallart: "einzel" | "paar"
): number {
  if (einkommen <= 0) return 0;
  const heuteJahr = new Date().getFullYear();
  const baseInput = {
    einkommenJahr: einkommen,
    vermoegenJahr: 0,
    kapAuszahlungenJahr: 0,
    kanton,
    bfsId: bfsId ?? undefined,
    religion,
    fallart,
    jahr: heuteJahr <= 2025 ? (2025 as const) : (2026 as const),
    einkommenIstNetto: true,
  };
  const steuer0 = steuerProJahr(baseInput).einkommen;
  const steuer1 = steuerProJahr({
    ...baseInput,
    einkommenJahr: einkommen + 1_000,
  }).einkommen;
  return Math.max(0, ((steuer1 - steuer0) / 1_000) * 100);
}

"use client";

import { useMemo } from "react";
import { usePlanStore } from "@/lib/store";
import { vermoegensbilanz } from "@/engine/vermoegensbilanz";
import { formatChf } from "@/lib/format";

export function Dashboard() {
  // Spezifische Selectoren statt usePlanStore() ohne Argumente — verhindert,
  // dass das gesamte Dashboard bei jedem Tastendruck im Wizard re-rendert.
  const fallart = usePlanStore((s) => s.fallart);
  const person1 = usePlanStore((s) => s.person1);
  const person2 = usePlanStore((s) => s.person2);
  const ahv = usePlanStore((s) => s.ahv);
  const bvg = usePlanStore((s) => s.bvg);
  const saeuleDrei = usePlanStore((s) => s.saeuleDrei);
  const vermoegen = usePlanStore((s) => s.vermoegen);
  const immobilien = usePlanStore((s) => s.immobilien);
  const firma = usePlanStore((s) => s.firma);
  const ziele = usePlanStore((s) => s.ziele);
  const budget = usePlanStore((s) => s.budget);

  const bilanz = useMemo(
    () =>
      vermoegensbilanz({
        fallart,
        person1,
        person2,
        ahv,
        bvg,
        saeuleDrei,
        vermoegen,
        immobilien,
        firma,
        ziele,
        budget,
      }),
    [
      fallart,
      person1,
      person2,
      ahv,
      bvg,
      saeuleDrei,
      vermoegen,
      immobilien,
      firma,
      ziele,
      budget,
    ]
  );

  const heutigesJahr = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Live-Dashboard</h2>
          <p className="text-xs text-slate-400">
            Aktualisiert sich auf jede Eingabe in Echtzeit
          </p>
        </div>
        <span className="text-xs text-slate-400">
          Etappe 1 — vereinfachte Vermögensbilanz
        </span>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <KpiCard
          label="Nettovermögen heute"
          jahr={heutigesJahr}
          value={formatChf(bilanz.heute)}
          hint="Summe aller eingegebenen Aktiva minus Schulden"
        />
        <KpiCard
          label="Nettovermögen bei Pension"
          jahr={bilanz.pensionierungsjahr}
          value={
            bilanz.pensionierungsjahr == null
              ? "—"
              : formatChf(bilanz.beiPensionierung)
          }
          hint={
            bilanz.pensionierungsjahr == null
              ? "Geburtsdatum + Pensionsalter eingeben"
              : "PK-Kapitalanteil + 3a/FZ-Auszahlungen + Rest-Vermögen"
          }
        />
        <KpiCard
          label="Nettovermögen nach 20 J."
          jahr={bilanz.zwanzigJahreReferenzjahr}
          value={
            bilanz.zwanzigJahreReferenzjahr == null
              ? "—"
              : formatChf(bilanz.zwanzig20JahreSpaeter)
          }
          hint={
            bilanz.zwanzigJahreReferenzjahr == null
              ? "—"
              : "Bei Pension + 20 × (Renten + Mieten − Verbrauch)"
          }
        />
      </div>

      <div className="space-y-4">
        <ChartPlaceholder title="Einnahmen / Ausgaben" />
        <ChartPlaceholder title="Vermögensentwicklung" />
        <ChartPlaceholder title="Steuerentwicklung" />
        <ChartPlaceholder title="Massnahmen-Liste" />
      </div>
    </div>
  );
}

function KpiCard({
  label,
  jahr,
  value,
  hint,
}: {
  label: string;
  jahr: number | null;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-baseline justify-between">
        <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
        {jahr != null && (
          <div className="text-xs tabular-nums text-slate-400">{jahr}</div>
        )}
      </div>
      <div className="mt-2 text-3xl font-semibold tabular-nums">{value}</div>
      <div className="mt-2 text-xs text-slate-400">{hint}</div>
    </div>
  );
}

function ChartPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex h-72 flex-col rounded-xl border border-dashed border-slate-300 bg-white p-5">
      <div className="text-base font-semibold text-slate-700">{title}</div>
      <div className="grid flex-1 place-items-center text-sm text-slate-400">
        Chart kommt mit der Cashflow-Engine (Etappe 2)
      </div>
    </div>
  );
}

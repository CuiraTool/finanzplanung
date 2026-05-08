"use client";

import { usePlanStore } from "@/lib/store";
import { vermoegensbilanz } from "@/engine/vermoegensbilanz";
import { formatChf } from "@/lib/format";

export function Dashboard() {
  const state = usePlanStore();
  const bilanz = vermoegensbilanz(state);

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

      {/* 3 KPIs: heute / Pensionierung / 20 Jahre nach Pensionierung */}
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
            bilanz.pensionierungsjahr == null ? "—" : formatChf(bilanz.beiPensionierung)
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

      {/* 4 Chart-Slots vertikal gestapelt */}
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

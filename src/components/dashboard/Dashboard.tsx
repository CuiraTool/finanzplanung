export function Dashboard() {
  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <h2 className="text-2xl font-semibold">Live-Dashboard</h2>
        <span className="text-xs text-slate-400">Etappe 0 — Platzhalter</span>
      </header>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard label="AHV-Rente p.a." value="—" />
        <KpiCard label="PK-Vorsorgekapital" value="—" />
        <KpiCard label="Nettovermögen heute" value="—" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartPlaceholder title="Cashflow 25 Jahre" />
        <ChartPlaceholder title="Vermögensentwicklung" />
        <ChartPlaceholder title="Steuerentwicklung" />
        <ChartPlaceholder title="Massnahmen-Liste" />
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function ChartPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex h-56 flex-col rounded-xl border border-dashed border-slate-300 bg-white p-4">
      <div className="text-sm font-medium text-slate-700">{title}</div>
      <div className="grid flex-1 place-items-center text-xs text-slate-400">
        Chart kommt in Etappe 1
      </div>
    </div>
  );
}

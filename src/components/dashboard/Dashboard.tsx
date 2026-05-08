"use client";

import { usePlanStore } from "@/lib/store";
import { ahvCouplePension, vollrenteEinzelSkala44 } from "@/engine/ahv";
import { formatChf } from "@/lib/format";

export function Dashboard() {
  const fallart = usePlanStore((s) => s.fallart);
  const ahvInput = usePlanStore((s) => s.ahv);

  const ahv = computeAhv();

  function computeAhv(): { haushalt: number | null; details: string } {
    const e1 = ahvInput.einkommenP1;
    if (e1 == null)
      return { haushalt: null, details: "Massgebendes Einkommen fehlt — Block 4" };

    const fehljahreP1 =
      ahvInput.fehljahreStatusP1 === "ja" ? ahvInput.fehljahreAnzahlP1 : 0;

    if (fallart === "einzel") {
      return {
        haushalt: vollrenteEinzelSkala44(e1, fehljahreP1),
        details:
          fehljahreP1 > 0
            ? `Einzelperson, ${fehljahreP1} Fehljahre`
            : "Einzelperson, volle Beitragsdauer",
      };
    }

    const e2 = ahvInput.einkommenP2;
    if (e2 == null)
      return { haushalt: null, details: "Massgebendes Einkommen P2 fehlt — Block 4" };

    const fehljahreP2 =
      ahvInput.fehljahreStatusP2 === "ja" ? ahvInput.fehljahreAnzahlP2 : 0;

    const out = ahvCouplePension({
      einkommenP1: e1,
      einkommenP2: e2,
      fehljahreP1,
      fehljahreP2,
    });
    return {
      haushalt: out.haushaltsRente,
      details: out.plafoniert
        ? "Ehepaar plafoniert auf 150% Maximum"
        : "Ehepaar mit Splitting",
    };
  }

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Live-Dashboard</h2>
          <p className="text-xs text-slate-400">
            Aktualisiert sich auf jede Eingabe in Echtzeit
          </p>
        </div>
        <span className="text-xs text-slate-400">Etappe 1 — AHV live</span>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard
          label="AHV-Rente p.a."
          value={formatChf(ahv.haushalt)}
          hint={ahv.details}
        />
        <KpiCard label="PK-Vorsorgekapital" value="—" hint="Block 4 in Arbeit" />
        <KpiCard label="Nettovermögen heute" value="—" hint="Block 6 in Arbeit" />
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

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

function ChartPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex h-56 flex-col rounded-xl border border-dashed border-slate-300 bg-white p-4">
      <div className="text-sm font-medium text-slate-700">{title}</div>
      <div className="grid flex-1 place-items-center text-xs text-slate-400">
        Chart kommt mit den nächsten Blöcken
      </div>
    </div>
  );
}

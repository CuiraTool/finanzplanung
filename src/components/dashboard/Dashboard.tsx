"use client";

import { useMemo } from "react";
import { usePlanStore } from "@/lib/store";
import { vermoegensbilanz } from "@/engine/vermoegensbilanz";
import { cashflowReihe } from "@/engine/cashflow";
import { pensionsjahr, ORDENTLICHES_AHV_ALTER } from "@/lib/pension";
import { formatChf } from "@/lib/format";
import { EinnahmenAusgabenChart } from "./EinnahmenAusgabenChart";
import { VermoegensChart } from "./VermoegensChart";
import { SteuerChart } from "./SteuerChart";
import { MassnahmenListe } from "./MassnahmenListe";
import { massnahmenAusState } from "@/engine/massnahmen";

const PROJEKTIONS_END_ALTER = 85;

export function Dashboard() {
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
  const adresse = usePlanStore((s) => s.adresse);
  const einmaligeAusgaben = usePlanStore((s) => s.einmaligeAusgaben);

  const heutigesJahr = new Date().getFullYear();

  const cashflowState = useMemo(
    () => ({
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
      adresse,
      einmaligeAusgaben,
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
      adresse,
      einmaligeAusgaben,
    ]
  );

  const bilanz = useMemo(() => vermoegensbilanz(cashflowState), [cashflowState]);

  // Cashflow-Reihe von heute bis Alter 85 der älteren Person
  const endJahr = useMemo(() => {
    const j1 = chartEndJahr(person1.geburtsdatum, PROJEKTIONS_END_ALTER);
    if (fallart === "einzel") return j1 ?? heutigesJahr + 30;
    const j2 = chartEndJahr(person2.geburtsdatum, PROJEKTIONS_END_ALTER);
    return Math.max(j1 ?? 0, j2 ?? 0) || heutigesJahr + 30;
  }, [fallart, person1.geburtsdatum, person2.geburtsdatum, heutigesJahr]);

  const cashflow = useMemo(
    () => cashflowReihe(cashflowState, heutigesJahr, endJahr),
    [cashflowState, heutigesJahr, endJahr]
  );

  const fullState = usePlanStore();
  const massnahmen = useMemo(() => massnahmenAusState(fullState), [fullState]);

  // Marker-Jahre für die Charts
  const ordPensionsjahr = useMemo(
    () => pensionsjahr(person1.geburtsdatum, ORDENTLICHES_AHV_ALTER),
    [person1.geburtsdatum]
  );
  const wunschPensionsjahr = useMemo(() => {
    if (ziele.bezugsalterP1 === ORDENTLICHES_AHV_ALTER) return null;
    return pensionsjahr(person1.geburtsdatum, ziele.bezugsalterP1);
  }, [person1.geburtsdatum, ziele.bezugsalterP1]);

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--color-cuira-deep)]">
            Live-Dashboard
          </h2>
          <p className="text-xs text-slate-400">
            Aktualisiert sich auf jede Eingabe in Echtzeit
          </p>
        </div>
        <span className="text-xs text-slate-400">
          {cashflow.length > 0
            ? `${heutigesJahr}–${endJahr} (${cashflow.length} Jahre)`
            : "Etappe 2 — Cashflow-Iteration"}
        </span>
      </header>

      {/* 3 KPI-Karten */}
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
          label="Nettovermögen mit 85"
          jahr={bilanz.zwanzigJahreReferenzjahr}
          value={
            bilanz.zwanzigJahreReferenzjahr == null
              ? "—"
              : formatChf(bilanz.zwanzig20JahreSpaeter)
          }
          hint={
            bilanz.zwanzigJahreReferenzjahr == null
              ? "—"
              : "Bei Pension + 20 × (Renten + Mieten − Verbrauch − Steuern)"
          }
        />
      </div>

      {/* Charts */}
      <div className="space-y-4">
        {cashflow.length > 0 ? (
          <>
            <EinnahmenAusgabenChart
              daten={cashflow}
              pensionsjahr={ordPensionsjahr}
              wunschPensionsjahr={wunschPensionsjahr}
              fallart={fallart}
            />
            <VermoegensChart
              daten={cashflow}
              pensionsjahr={ordPensionsjahr}
              wunschPensionsjahr={wunschPensionsjahr}
              fallart={fallart}
            />
            <SteuerChart
              daten={cashflow}
              pensionsjahr={ordPensionsjahr}
              wunschPensionsjahr={wunschPensionsjahr}
              fallart={fallart}
            />
          </>
        ) : (
          <ChartPlaceholder title="Charts brauchen Geburtsdatum + Einkommen" />
        )}

        <MassnahmenListe
          massnahmen={massnahmen}
          vornameP1={person1.vorname}
          vornameP2={fallart === "paar" ? person2.vorname : undefined}
          fallart={fallart}
        />
      </div>
    </div>
  );
}

function chartEndJahr(geburtsdatum: string, endAlter: number): number | null {
  if (!geburtsdatum) return null;
  const j = Number.parseInt(geburtsdatum.slice(0, 4), 10);
  if (!Number.isFinite(j)) return null;
  return j + endAlter;
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
      <div className="mt-2 text-3xl font-semibold tabular-nums text-[var(--color-cuira-deep)]">
        {value}
      </div>
      <div className="mt-2 text-xs text-slate-400">{hint}</div>
    </div>
  );
}

function ChartPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex h-[480px] flex-col rounded-xl border border-dashed border-slate-300 bg-white p-5">
      <div className="text-base font-semibold text-slate-700">{title}</div>
      <div className="grid flex-1 place-items-center text-sm text-slate-400">
        Chart kommt mit der Cashflow-Engine V2
      </div>
    </div>
  );
}

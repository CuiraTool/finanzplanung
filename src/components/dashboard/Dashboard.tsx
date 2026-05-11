"use client";

import { useMemo } from "react";
import { usePlanStore, type PlanState } from "@/lib/store";
import { vermoegensbilanz } from "@/engine/vermoegensbilanz";
import { cashflowReihe, applyOverrides } from "@/engine/cashflow";
import { pensionsjahr, ORDENTLICHES_AHV_ALTER } from "@/lib/pension";
import { formatChf } from "@/lib/format";
import { EinnahmenAusgabenChart } from "./EinnahmenAusgabenChart";
import { VermoegensChart } from "./VermoegensChart";
import { SteuerChart } from "./SteuerChart";
import { SteuerDetailCard } from "./SteuerDetailCard";
import { DreiSaeulenKpi } from "./DreiSaeulenKpi";
import { PlausibilityPanel } from "./PlausibilityPanel";
import { HinterlassenenCard } from "./HinterlassenenCard";
import { MassnahmenListe } from "./MassnahmenListe";
import { KiMassnahmen } from "./KiMassnahmen";
import { StressTests } from "./StressTests";
import { InflationToggle } from "./InflationToggle";
import { massnahmenAusState } from "@/engine/massnahmen";
import { useInflation, deflationiereReihe } from "@/lib/inflation";

const PROJEKTIONS_END_ALTER = 85;

export function Dashboard() {
  const fallart = usePlanStore((s) => s.fallart);
  const person1 = usePlanStore((s) => s.person1);
  const person2 = usePlanStore((s) => s.person2);
  const kinder = usePlanStore((s) => s.kinder);
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
  const szenarioB = usePlanStore((s) => s.szenarioB);
  const erbschaft = usePlanStore((s) => s.erbschaft);

  const heutigesJahr = new Date().getFullYear();

  const cashflowState = useMemo(
    () => ({
      fallart,
      person1,
      person2,
      kinder,
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
      erbschaft,
    }),
    [
      fallart,
      person1,
      person2,
      kinder,
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
      erbschaft,
    ]
  );

  const bilanz = useMemo(() => vermoegensbilanz(cashflowState), [cashflowState]);

  const endJahr = useMemo(() => {
    const j1 = chartEndJahr(person1.geburtsdatum, PROJEKTIONS_END_ALTER);
    if (fallart === "einzel") return j1 ?? heutigesJahr + 30;
    const j2 = chartEndJahr(person2.geburtsdatum, PROJEKTIONS_END_ALTER);
    return Math.max(j1 ?? 0, j2 ?? 0) || heutigesJahr + 30;
  }, [fallart, person1.geburtsdatum, person2.geburtsdatum, heutigesJahr]);

  const cashflowARaw = useMemo(
    () => cashflowReihe(cashflowState, heutigesJahr, endJahr),
    [cashflowState, heutigesJahr, endJahr]
  );

  // Variante B: zweite Cashflow-Reihe mit Overrides
  const cashflowBRaw = useMemo(() => {
    if (!szenarioB.aktiv) return null;
    const stateB = applyOverrides(cashflowState, szenarioB.overrides);
    return cashflowReihe(stateB, heutigesJahr, endJahr);
  }, [cashflowState, szenarioB.aktiv, szenarioB.overrides, heutigesJahr, endJahr]);

  // Inflation: kaufkraftbereinigte Werte für die Anzeige (Toggle im Header)
  const { enabled: inflationEnabled, rateProzent: inflationRate } =
    useInflation();
  const cashflowA = useMemo(
    () =>
      deflationiereReihe(
        cashflowARaw,
        heutigesJahr,
        inflationRate,
        inflationEnabled
      ),
    [cashflowARaw, heutigesJahr, inflationRate, inflationEnabled]
  );
  const cashflowB = useMemo(
    () =>
      cashflowBRaw
        ? deflationiereReihe(
            cashflowBRaw,
            heutigesJahr,
            inflationRate,
            inflationEnabled
          )
        : null,
    [cashflowBRaw, heutigesJahr, inflationRate, inflationEnabled]
  );

  // massnahmenAusState braucht zusätzlich nachlass + zivilstand zum cashflowState.
  // Wir selektieren granular statt usePlanStore() (würde bei jedem Wizard-
  // Tastendruck einen kompletten Store-Snapshot triggern → useMemo nutzlos).
  const nachlass = usePlanStore((s) => s.nachlass);
  const zivilstand = usePlanStore((s) => s.zivilstand);
  const massnahmenState = useMemo(
    () => ({ ...cashflowState, nachlass, zivilstand }),
    [cashflowState, nachlass, zivilstand]
  );
  const massnahmen = useMemo(
    () => massnahmenAusState(massnahmenState as unknown as PlanState),
    [massnahmenState]
  );

  const ordPensionsjahr = useMemo(
    () => pensionsjahr(person1.geburtsdatum, ORDENTLICHES_AHV_ALTER),
    [person1.geburtsdatum]
  );
  const wunschPensionsjahr = useMemo(() => {
    if (ziele.bezugsalterP1 === ORDENTLICHES_AHV_ALTER) return null;
    return pensionsjahr(person1.geburtsdatum, ziele.bezugsalterP1);
  }, [person1.geburtsdatum, ziele.bezugsalterP1]);

  // Differenz B − A für 3 Stichtage
  const diffPension = useMemo(() => {
    if (!cashflowB || !ordPensionsjahr) return null;
    const aZeile = cashflowA.find((z) => z.jahr === ordPensionsjahr);
    const bZeile = cashflowB.find((z) => z.jahr === ordPensionsjahr);
    if (!aZeile || !bZeile) return null;
    return bZeile.vermoegenNetto - aZeile.vermoegenNetto;
  }, [cashflowA, cashflowB, ordPensionsjahr]);

  const diff85 = useMemo(() => {
    if (!cashflowB) return null;
    const aLetzte = cashflowA[cashflowA.length - 1];
    const bLetzte = cashflowB[cashflowB.length - 1];
    if (!aLetzte || !bLetzte) return null;
    return bLetzte.vermoegenNetto - aLetzte.vermoegenNetto;
  }, [cashflowA, cashflowB]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--color-cuira-deep)]">
            Live-Dashboard
          </h2>
          <p className="text-xs text-slate-400">
            Aktualisiert sich auf jede Eingabe in Echtzeit
            {inflationEnabled && (
              <span className="ml-2 text-[var(--color-cuira-deep)]">
                · in heutiger Kaufkraft ({inflationRate.toFixed(1)} % Inflation
                p.a.)
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <InflationToggle />
          <span className="text-xs text-slate-400">
            {cashflowA.length > 0
              ? `${heutigesJahr}–${endJahr} (${cashflowA.length} Jahre)`
              : "Etappe 2 — Cashflow-Iteration"}
          </span>
        </div>
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
          diff={diffPension}
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
          diff={diff85}
        />
      </div>

      <PlausibilityPanel />

      <DreiSaeulenKpi />

      <HinterlassenenCard />

      <div className="space-y-4">
        {cashflowA.length > 0 ? (
          <>
            <EinnahmenAusgabenChart
              daten={cashflowA}
              datenB={cashflowB}
              pensionsjahr={ordPensionsjahr}
              wunschPensionsjahr={wunschPensionsjahr}
              fallart={fallart}
            />
            <VermoegensChart
              daten={cashflowA}
              datenB={cashflowB}
              pensionsjahr={ordPensionsjahr}
              wunschPensionsjahr={wunschPensionsjahr}
              fallart={fallart}
            />
            <SteuerChart
              daten={cashflowA}
              pensionsjahr={ordPensionsjahr}
              wunschPensionsjahr={wunschPensionsjahr}
              fallart={fallart}
            />
            <SteuerDetailCard cashflow={cashflowA} />
          </>
        ) : (
          <ChartPlaceholder title="Charts brauchen Geburtsdatum + Einkommen" />
        )}

        <StressTests />

        <KiMassnahmen />

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
  diff,
}: {
  label: string;
  jahr: number | null;
  value: string;
  hint: string;
  diff?: number | null;
}) {
  return (
    <div
      className="cui-kpi"
      style={{
        padding: "16px 18px",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <div className="cui-kpi-row flex items-baseline justify-between">
        <div className="cui-kpi-label">{label}</div>
        {jahr != null && <div className="cui-kpi-year">{jahr}</div>}
      </div>
      <div
        className="cui-kpi-value"
        style={{ fontSize: "26px", marginTop: "4px" }}
      >
        {value}
      </div>
      {diff != null && (
        <div
          className="mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums"
          style={{
            background: diff >= 0 ? "var(--pos-soft)" : "var(--neg-soft)",
            color: diff >= 0 ? "var(--pos)" : "var(--neg)",
            fontFamily: "var(--font-mono)",
          }}
        >
          B: {diff >= 0 ? "+" : ""}
          {formatChf(diff)}
        </div>
      )}
      <div
        className="mt-2 text-[11.5px] leading-snug"
        style={{ color: "var(--ink-3)" }}
      >
        {hint}
      </div>
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

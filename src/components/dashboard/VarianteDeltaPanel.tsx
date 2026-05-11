"use client";

import { useMemo, useState } from "react";
import {
  usePlanStore,
  type PlanSlot,
  type PlanState,
  type PlanVariantData,
} from "@/lib/store";
import { cashflowReihe, type CashflowInput } from "@/engine/cashflow";
import { steuerProJahr } from "@/engine/steuer";
import { formatChf } from "@/lib/format";
import { VarianteDiffModal } from "./VarianteDiffModal";

const PROJEKTIONS_END_ALTER = 90;

/**
 * Δ-KPI-Panel — zeigt aktiven Plan + Vergleich zu anderen Slots.
 *
 * Renders nur wenn mindestens ein anderer Plan-Slot existiert. Pro Δ-Karte:
 *  - Aktiv-Wert + Δ vs. Vergleich
 *  - Farb-Code grün (besser) / gelb (schlechter) / weiss (neutral)
 *  - Klick auf Detail-Diff öffnet Modal mit Block-Level-Auflistung
 */
export function VarianteDeltaPanel() {
  const fullState = usePlanStore();
  const aktiverPlan = fullState.aktiverPlan;
  const plaene = fullState.plaene;
  const [diffModalSlot, setDiffModalSlot] = useState<PlanSlot | null>(null);

  // Andere Slots: alle aktiven Pläne ausser aktuell aktivem
  const andereSlots = useMemo<PlanSlot[]>(() => {
    const out: PlanSlot[] = [];
    if (aktiverPlan !== "a") out.push("a");
    if (aktiverPlan !== "b" && plaene.b) out.push("b");
    if (aktiverPlan !== "c" && plaene.c) out.push("c");
    return out;
  }, [aktiverPlan, plaene.b, plaene.c]);

  // Wenn keine Vergleichs-Pläne → nichts rendern
  if (andereSlots.length === 0) return null;

  return (
    <div className="space-y-3">
      {andereSlots.map((slot) => (
        <DeltaKarte
          key={slot}
          fullState={fullState}
          aktiverSlot={aktiverPlan}
          vergleichsSlot={slot}
          onDiffOpen={() => setDiffModalSlot(slot)}
        />
      ))}
      {diffModalSlot && (
        <VarianteDiffModal
          aktivVariant={extractVariantFromState(fullState)}
          vergleichVariant={plaene[diffModalSlot]!}
          aktivSlot={aktiverPlan}
          vergleichSlot={diffModalSlot}
          onClose={() => setDiffModalSlot(null)}
        />
      )}
    </div>
  );
}

function DeltaKarte({
  fullState,
  aktiverSlot,
  vergleichsSlot,
  onDiffOpen,
}: {
  fullState: PlanState;
  aktiverSlot: PlanSlot;
  vergleichsSlot: PlanSlot;
  onDiffOpen: () => void;
}) {
  const heutigesJahr = new Date().getFullYear();
  const endJahr = useMemo(() => {
    const j1 = jahresfeld(fullState.person1.geburtsdatum, PROJEKTIONS_END_ALTER);
    if (fullState.fallart === "einzel") return j1 ?? heutigesJahr + 30;
    const j2 = jahresfeld(fullState.person2.geburtsdatum, PROJEKTIONS_END_ALTER);
    return Math.max(j1 ?? 0, j2 ?? 0) || heutigesJahr + 30;
  }, [
    fullState.person1.geburtsdatum,
    fullState.person2.geburtsdatum,
    fullState.fallart,
    heutigesJahr,
  ]);

  const aktivKpis = useMemo(
    () => kpisFuerVariant(extractVariantFromState(fullState), fullState, heutigesJahr, endJahr),
    [fullState, heutigesJahr, endJahr]
  );
  const vergleichKpis = useMemo(() => {
    const variant = fullState.plaene[vergleichsSlot];
    if (!variant) return null;
    return kpisFuerVariant(variant, fullState, heutigesJahr, endJahr);
  }, [fullState, vergleichsSlot, heutigesJahr, endJahr]);

  if (!vergleichKpis) return null;

  const farben = {
    a: { dot: "bg-blue-500", text: "text-blue-700", bg: "bg-blue-50/30", border: "border-blue-200" },
    b: { dot: "bg-violet-500", text: "text-violet-700", bg: "bg-violet-50/30", border: "border-violet-200" },
    c: { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50/30", border: "border-amber-200" },
  };
  const aktivFarbe = farben[aktiverSlot];
  const vergleichFarbe = farben[vergleichsSlot];

  return (
    <div
      className={`rounded-xl border ${vergleichFarbe.border} ${vergleichFarbe.bg} p-4`}
    >
      <header className="mb-3 flex items-baseline justify-between">
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${aktivFarbe.dot}`} />
          <span className={`text-sm font-semibold ${aktivFarbe.text}`}>
            Plan {aktiverSlot.toUpperCase()} (aktiv)
          </span>
          <span className="text-xs text-slate-400">vs.</span>
          <span className={`size-2 rounded-full ${vergleichFarbe.dot}`} />
          <span className={`text-sm font-semibold ${vergleichFarbe.text}`}>
            Plan {vergleichsSlot.toUpperCase()}
          </span>
        </div>
        <button
          type="button"
          onClick={onDiffOpen}
          className="text-xs text-blue-600 hover:underline"
        >
          Detail-Diff anzeigen →
        </button>
      </header>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
        <DeltaZeile
          label="Vermögen heute"
          aktiv={aktivKpis.vermoegenHeute}
          vergleich={vergleichKpis.vermoegenHeute}
          richtung="hoch-gut"
        />
        <DeltaZeile
          label="Vermögen bei Pension"
          aktiv={aktivKpis.vermoegenPension}
          vergleich={vergleichKpis.vermoegenPension}
          richtung="hoch-gut"
        />
        <DeltaZeile
          label="Vermögen bei 85"
          aktiv={aktivKpis.vermoegenMit85}
          vergleich={vergleichKpis.vermoegenMit85}
          richtung="hoch-gut"
        />
        <DeltaZeile
          label="Pension-Einkommen p.a."
          aktiv={aktivKpis.pensionEinkommen}
          vergleich={vergleichKpis.pensionEinkommen}
          richtung="hoch-gut"
        />
        <DeltaZeile
          label="Lebenszeit-Steuern"
          aktiv={aktivKpis.lebenszeitSteuern}
          vergleich={vergleichKpis.lebenszeitSteuern}
          richtung="tief-gut"
        />
        <DeltaZeile
          label="Effektivsteuersatz heute"
          aktiv={aktivKpis.effektivSatzProzent}
          vergleich={vergleichKpis.effektivSatzProzent}
          richtung="tief-gut"
          formatProzent
        />
      </div>
    </div>
  );
}

function DeltaZeile({
  label,
  aktiv,
  vergleich,
  richtung,
  formatProzent,
}: {
  label: string;
  aktiv: number;
  vergleich: number;
  richtung: "hoch-gut" | "tief-gut";
  formatProzent?: boolean;
}) {
  const delta = aktiv - vergleich;
  const istBesser =
    delta === 0 ? null : richtung === "hoch-gut" ? delta > 0 : delta < 0;
  const pfeil = delta === 0 ? "—" : delta > 0 ? "↑" : "↓";
  const farbeText =
    istBesser === null
      ? "text-slate-500"
      : istBesser
        ? "text-emerald-700"
        : "text-amber-700";
  const farbeBg =
    istBesser === null
      ? "bg-white"
      : istBesser
        ? "bg-emerald-50/50"
        : "bg-amber-50/50";

  const fmt = (n: number) =>
    formatProzent ? `${n.toFixed(1)} %` : formatChf(Math.round(n));
  const deltaPct =
    vergleich !== 0 ? `${((delta / Math.abs(vergleich)) * 100).toFixed(0)} %` : "";

  return (
    <div className={`rounded-md border border-slate-100 px-3 py-2 ${farbeBg}`}>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold tabular-nums text-slate-800">
          {fmt(aktiv)}
        </span>
        <span className={`text-xs font-medium tabular-nums ${farbeText}`}>
          {pfeil} {delta !== 0 ? fmt(Math.abs(delta)) : "0"}
          {deltaPct && delta !== 0 && (
            <span className="ml-1 text-[10px] opacity-70">({deltaPct})</span>
          )}
        </span>
      </div>
    </div>
  );
}

export interface VariantKpis {
  vermoegenHeute: number;
  vermoegenPension: number;
  vermoegenMit85: number;
  pensionEinkommen: number;
  lebenszeitSteuern: number;
  effektivSatzProzent: number;
}

export function extractVariantFromState(s: PlanState): PlanVariantData {
  return {
    ziele: s.ziele,
    einmaligeAusgaben: s.einmaligeAusgaben,
    budget: s.budget,
    ahv: s.ahv,
    bvg: s.bvg,
    saeuleDrei: s.saeuleDrei,
    vermoegen: s.vermoegen,
    immobilien: s.immobilien,
    firma: s.firma,
    nachlass: s.nachlass,
    anlagen: s.anlagen,
    erbschaft: s.erbschaft,
    wohnortPlan: s.wohnortPlan,
    versicherungen: s.versicherungen,
    prioritaeten: s.prioritaeten,
    erweitert: s.erweitert,
  };
}

/**
 * KPI-Berechnung für eine Variant — kombiniert Stammdaten vom Top-Level
 * State mit dem Variant-Slice. Cashflow läuft pro Variante separat.
 */
export function kpisFuerVariant(
  variant: PlanVariantData,
  stammState: PlanState,
  heutigesJahr: number,
  endJahr: number
): VariantKpis {
  const merged: CashflowInput = {
    fallart: stammState.fallart,
    person1: stammState.person1,
    person2: stammState.person2,
    kinder: stammState.kinder,
    adresse: stammState.adresse,
    ahv: variant.ahv,
    bvg: variant.bvg,
    saeuleDrei: variant.saeuleDrei,
    vermoegen: variant.vermoegen,
    immobilien: variant.immobilien,
    firma: variant.firma,
    ziele: variant.ziele,
    budget: variant.budget,
    einmaligeAusgaben: variant.einmaligeAusgaben,
    erbschaft: variant.erbschaft,
  } as CashflowInput;
  const reihe = cashflowReihe(merged, heutigesJahr, endJahr);

  const heuteZeile = reihe[0]!;
  const jahr85 = berechneJahr85(stammState.person1.geburtsdatum);
  const zeile85 = jahr85 ? reihe.find((z) => z.jahr === jahr85) ?? reihe[reihe.length - 1]! : reihe[reihe.length - 1]!;
  const pensionsjahrP1 = pensionsjahrAusVariant(variant, stammState.person1.geburtsdatum);
  const zeilePension = pensionsjahrP1
    ? reihe.find((z) => z.jahr === pensionsjahrP1) ?? heuteZeile
    : heuteZeile;

  const vermoegenPension = zeilePension.vermoegenNetto;
  const vermoegenMit85 = zeile85.vermoegenNetto;
  const pensionEinkommen =
    zeilePension.einnahmenAhv + zeilePension.einnahmenBvgRente;
  const lebenszeitSteuern = reihe.reduce(
    (s, z) => s + z.ausgabenSteuern,
    0
  );
  const einkommenHeute =
    heuteZeile.einnahmenErwerb +
    heuteZeile.einnahmenAhv +
    heuteZeile.einnahmenBvgRente +
    heuteZeile.einnahmenMieten;
  const effektivSatzProzent =
    einkommenHeute > 0
      ? (heuteZeile.ausgabenSteuern / einkommenHeute) * 100
      : 0;

  return {
    vermoegenHeute: heuteZeile.vermoegenNetto,
    vermoegenPension,
    vermoegenMit85,
    pensionEinkommen,
    lebenszeitSteuern,
    effektivSatzProzent,
  };
}

function jahresfeld(geburt: string, alter: number): number | null {
  if (!geburt) return null;
  const j = parseInt(geburt.slice(0, 4), 10);
  return Number.isFinite(j) ? j + alter : null;
}

function berechneJahr85(geburt: string): number | null {
  return jahresfeld(geburt, 85);
}

function pensionsjahrAusVariant(
  variant: PlanVariantData,
  geburt: string
): number | null {
  return jahresfeld(geburt, variant.ziele.bezugsalterP1);
}

// Suppress unused (für ggf. spätere Erweiterungen)
void steuerProJahr;

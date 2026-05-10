"use client";

/**
 * Stress-Tests Dashboard-Block.
 *
 * Zeigt 3 Szenarien parallel mit Δ-Auswirkung auf das Vermögen bei
 * Pension und mit 85. Berechnung läuft komplett im Browser via
 * runAllStressTests — keine API-Calls.
 *
 * Differenziator vs. VZ/Logismata/TaxWare: bei keinem prominent als
 * First-Class-Feature. "Was wenn?" ist genau die Frage, die im Termin
 * gestellt wird.
 */

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  TrendingDown,
  Activity,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { usePlanStore } from "@/lib/store";
import {
  runAllStressTests,
  STRESS_TESTS,
  type StressTestResultat,
} from "@/engine/stress-tests";
import { formatChf } from "@/lib/format";

const SCHWERE_BADGE: Record<StressTestResultat["schwere"], string> = {
  leicht: "cui-pill-pos",
  mittel: "cui-pill-warn",
  kritisch: "cui-pill-neg",
};

const SCHWERE_LABEL: Record<StressTestResultat["schwere"], string> = {
  leicht: "tragbar",
  mittel: "knapp",
  kritisch: "kritisch",
};

export function StressTests() {
  const fullState = usePlanStore();
  const [expanded, setExpanded] = useState(false);

  // Heuristik: Stress-Tests nur sinnvoll wenn Geburtsdatum + Vermögen erfasst
  const hatBasis =
    !!fullState.person1.geburtsdatum &&
    (fullState.vermoegen.items.some((it) => (it.saldoHeute ?? 0) > 0) ||
      (fullState.bvg.p1.altersguthabenHeute ?? 0) > 0);

  const results = useMemo(
    () => (hatBasis ? runAllStressTests(fullState) : []),
    [fullState, hatBasis]
  );

  if (!hatBasis) {
    return (
      <div
        className="rounded-[14px] border p-5"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="mb-2 flex items-center gap-2">
          <Activity
            className="h-4 w-4"
            style={{ color: "var(--ink-3)" }}
          />
          <h3
            className="text-[15px] font-semibold"
            style={{ color: "var(--ink-3)" }}
          >
            Stress-Tests
          </h3>
        </div>
        <p
          className="text-[12px]"
          style={{ color: "var(--ink-3)" }}
        >
          Erfasse Geburtsdatum und ein erstes Vermögen, dann zeigen wir
          dir, wie der Plan auf Aktien-Crash, Inflation und Pflegekosten
          reagiert.
        </p>
      </div>
    );
  }

  // Schwerste Schwere (kritisch > mittel > leicht) für Header-Badge
  const schwersteSchwere = results.reduce<StressTestResultat["schwere"]>(
    (acc, r) => {
      if (r.schwere === "kritisch") return "kritisch";
      if (r.schwere === "mittel" && acc !== "kritisch") return "mittel";
      return acc;
    },
    "leicht"
  );

  return (
    <div
      className="rounded-[14px] border"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between gap-3 p-5 text-left transition-colors hover:bg-[var(--surface-hover)]"
      >
        <div className="flex items-center gap-2">
          <Activity
            className="h-4 w-4"
            style={{ color: "var(--accent-ink)" }}
          />
          <h3
            className="text-[15px] font-semibold"
            style={{ color: "var(--ink)" }}
          >
            Stress-Tests
          </h3>
          <span className={`cui-pill ${SCHWERE_BADGE[schwersteSchwere]}`}>
            {SCHWERE_LABEL[schwersteSchwere]}
          </span>
          <span
            className="text-[11px]"
            style={{ color: "var(--ink-3)" }}
          >
            {results.length} Szenarien
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4" style={{ color: "var(--ink-3)" }} />
        ) : (
          <ChevronDown
            className="h-4 w-4"
            style={{ color: "var(--ink-3)" }}
          />
        )}
      </button>

      {/* Body */}
      {expanded && (
        <div
          className="border-t p-5"
          style={{ borderColor: "var(--border)" }}
        >
          <p
            className="mb-4 text-[12px] leading-relaxed"
            style={{ color: "var(--ink-3)" }}
          >
            Was wäre wenn? Drei realistische Schock-Szenarien und ihre
            Auswirkung auf das Vermögen bei Pension und mit Alter 85.
            Vergleich zum aktuellen Plan.
          </p>

          <div className="space-y-2">
            {results.map((r) => {
              const def = STRESS_TESTS.find((s) => s.id === r.id);
              return (
                <StressKarte
                  key={r.id}
                  resultat={r}
                  beschreibung={def?.beschreibung ?? ""}
                  annahme={def?.annahme ?? ""}
                />
              );
            })}
          </div>

          <p
            className="mt-4 text-[10.5px]"
            style={{ color: "var(--ink-3)" }}
          >
            Vereinfachte Approximation — exakte Modelle (Compound-Inflation,
            Markow-Renditen) kommen mit Etappe 2.5+.
          </p>
        </div>
      )}
    </div>
  );
}

function StressKarte({
  resultat,
  beschreibung,
  annahme,
}: {
  resultat: StressTestResultat;
  beschreibung: string;
  annahme: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-[10px] border p-3"
      style={{
        background: "var(--surface-2)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span
              className="text-[13.5px] font-semibold"
              style={{ color: "var(--ink)" }}
            >
              {resultat.titel}
            </span>
            <span
              className={`cui-pill ${SCHWERE_BADGE[resultat.schwere]}`}
            >
              {SCHWERE_LABEL[resultat.schwere]}
            </span>
          </div>
          <p
            className="mt-0.5 text-[11.5px]"
            style={{ color: "var(--ink-3)" }}
          >
            {beschreibung}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-[11px] transition-colors"
          style={{ color: "var(--ink-3)" }}
        >
          {open ? "weniger" : "mehr"}
        </button>
      </div>

      {/* Auswirkungs-Werte */}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <DeltaKpi
          label="Δ bei Pension"
          delta={resultat.deltaPension}
        />
        <DeltaKpi
          label="Δ mit Alter 85"
          delta={resultat.delta85}
        />
        <div>
          <div
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: "var(--ink-3)" }}
          >
            Vermögen mit 85
          </div>
          <div
            className="mt-0.5 font-mono text-[13px] tabular-nums"
            style={{
              color: resultat.mit85 < 0 ? "var(--neg)" : "var(--ink)",
            }}
          >
            {formatChf(resultat.mit85)}
          </div>
        </div>
      </div>

      {open && (
        <div
          className="mt-3 rounded-md p-2.5 text-[11.5px] leading-relaxed"
          style={{
            background: "var(--surface)",
            color: "var(--ink-2)",
            borderLeft: "2px solid var(--accent)",
          }}
        >
          <span
            className="block text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--ink-3)" }}
          >
            Annahme
          </span>
          {annahme}
          {resultat.mit85 < 0 && (
            <div
              className="mt-2 flex items-start gap-1.5 rounded-md p-2"
              style={{
                background: "var(--neg-soft)",
                color: "var(--neg)",
              }}
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Vermögen wäre vor Lebensende aufgebraucht — schwerwiegender
                Risikofall.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DeltaKpi({ label, delta }: { label: string; delta: number }) {
  const ist0 = Math.abs(delta) < 1000;
  return (
    <div>
      <div
        className="text-[10px] font-medium uppercase tracking-wider"
        style={{ color: "var(--ink-3)" }}
      >
        {label}
      </div>
      <div
        className="mt-0.5 inline-flex items-center gap-1 font-mono text-[13px] tabular-nums"
        style={{
          color: ist0
            ? "var(--ink-3)"
            : delta < 0
            ? "var(--neg)"
            : "var(--pos)",
        }}
      >
        {!ist0 && delta < 0 && <TrendingDown className="h-3 w-3" />}
        {ist0 ? "—" : `${delta > 0 ? "+" : ""}${formatChf(delta)}`}
      </div>
    </div>
  );
}

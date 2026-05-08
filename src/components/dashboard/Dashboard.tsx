"use client";

import { usePlanStore } from "@/lib/store";
import {
  ahvCouplePension,
  ahvJahresrenteEinzel,
  ORDENTLICHES_AHV_ALTER,
  MAX_VORBEZUG_JAHRE,
  MAX_AUFSCHUB_JAHRE,
} from "@/engine/ahv";
import { pensionsjahr } from "@/lib/pension";
import { formatChf } from "@/lib/format";

export function Dashboard() {
  const fallart = usePlanStore((s) => s.fallart);
  const ahvInput = usePlanStore((s) => s.ahv);
  const ziele = usePlanStore((s) => s.ziele);
  const person1 = usePlanStore((s) => s.person1);
  const person2 = usePlanStore((s) => s.person2);

  const ahv = computeAhv();

  function computeAhv(): {
    haushaltJahres: number | null;
    monatsrente: number | null;
    details: string[];
  } {
    const e1 = ahvInput.einkommenP1;
    if (e1 == null)
      return {
        haushaltJahres: null,
        monatsrente: null,
        details: ["Massgebendes Einkommen fehlt — Block 4"],
      };

    const fehljahreP1 =
      ahvInput.fehljahreStatusP1 === "ja" ? ahvInput.fehljahreAnzahlP1 : 0;

    // AHV-Bezugsalter wird auf [63, 70] geclamped — der Wunschalter aus Block 2
    // kann auch tiefer sein (z.B. 58 für reine BVG-Frühpensionierung), aber AHV
    // hat ein hartes Min/Max.
    const bezugsalterP1 = clampAhvAlter(ziele.bezugsalterP1);
    const bezugsjahrP1 = pensionsjahr(person1.geburtsdatum, bezugsalterP1) ?? new Date().getFullYear();

    if (fallart === "einzel") {
      const r = ahvJahresrenteEinzel({
        massgebendesEinkommen: e1,
        fehljahre: fehljahreP1,
        bezugsalter: bezugsalterP1,
        bezugsjahr: bezugsjahrP1,
      });
      return {
        haushaltJahres: r.jahresrente,
        monatsrente: r.monatsrente,
        details: buildHints({
          fallart,
          fehljahre: fehljahreP1,
          vorbezug: r.vorbezugJahre,
          aufschub: r.aufschubJahre,
          hat13te: r.hat13te,
          bezugsalterDesired: ziele.bezugsalterP1,
          ahvBezugsalter: bezugsalterP1,
        }),
      };
    }

    const e2 = ahvInput.einkommenP2;
    if (e2 == null)
      return {
        haushaltJahres: null,
        monatsrente: null,
        details: ["Massgebendes Einkommen Person 2 fehlt — Block 4"],
      };

    const fehljahreP2 =
      ahvInput.fehljahreStatusP2 === "ja" ? ahvInput.fehljahreAnzahlP2 : 0;
    const bezugsalterP2 = clampAhvAlter(ziele.bezugsalterP2);
    const bezugsjahrP2 = pensionsjahr(person2.geburtsdatum, bezugsalterP2);

    // Plafonierungs-Bezugsjahr: das spätere der beiden (erst dann sind beide AHV-pensioniert)
    const bezugsjahrPlafond = Math.max(
      bezugsjahrP1,
      bezugsjahrP2 ?? bezugsjahrP1
    );

    const out = ahvCouplePension({
      einkommenP1: e1,
      einkommenP2: e2,
      fehljahreP1,
      fehljahreP2,
      bezugsalterP1,
      bezugsalterP2,
      bezugsjahr: bezugsjahrPlafond,
    });

    const monatsrente = out.hat13te
      ? Math.round(out.haushaltsRente / 13)
      : Math.round(out.haushaltsRente / 12);

    return {
      haushaltJahres: out.haushaltsRente,
      monatsrente,
      details: [
        out.plafoniert ? "Ehepaar plafoniert auf 150% Maximum" : "Ehepaar mit Splitting",
        ...(out.hat13te ? ["inkl. 13. AHV-Rente (ab 2026)"] : []),
        ...(fehljahreP1 > 0 ? [`Person 1: ${fehljahreP1} Fehljahre`] : []),
        ...(fehljahreP2 > 0 ? [`Person 2: ${fehljahreP2} Fehljahre`] : []),
      ],
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
          label="AHV p.a. Haushalt"
          value={formatChf(ahv.haushaltJahres)}
          hints={ahv.details}
        />
        <KpiCard
          label="AHV pro Monat"
          value={formatChf(ahv.monatsrente)}
          hints={ahv.haushaltJahres ? ["reguläre Monatszahlung"] : []}
        />
        <KpiCard label="PK-Vorsorgekapital" value="—" hints={["Block 5 in Arbeit"]} />
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

function clampAhvAlter(wunschalter: number): number {
  const min = ORDENTLICHES_AHV_ALTER - MAX_VORBEZUG_JAHRE; // 63
  const max = ORDENTLICHES_AHV_ALTER + MAX_AUFSCHUB_JAHRE; // 70
  return Math.max(min, Math.min(max, wunschalter));
}

function buildHints(args: {
  fallart: "einzel" | "paar";
  fehljahre: number;
  vorbezug: number;
  aufschub: number;
  hat13te: boolean;
  bezugsalterDesired: number;
  ahvBezugsalter: number;
}): string[] {
  const hints: string[] = [];
  hints.push(args.fallart === "einzel" ? "Einzelperson" : "Ehepaar");
  if (args.vorbezug > 0)
    hints.push(`Vorbezug ${args.vorbezug} J. (-${(args.vorbezug * 6.8).toFixed(1)}%)`);
  if (args.aufschub > 0) hints.push(`Aufschub ${args.aufschub} J.`);
  if (args.hat13te) hints.push("inkl. 13. AHV (ab 2026)");
  if (args.fehljahre > 0) hints.push(`${args.fehljahre} Fehljahre`);
  if (args.bezugsalterDesired < args.ahvBezugsalter)
    hints.push(
      `Wunsch ${args.bezugsalterDesired} J. — AHV erst ab ${args.ahvBezugsalter} (max. Vorbezug)`
    );
  return hints;
}

function KpiCard({
  label,
  value,
  hints,
}: {
  label: string;
  value: string;
  hints?: string[];
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      {hints && hints.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-xs text-slate-400">
          {hints.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      )}
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

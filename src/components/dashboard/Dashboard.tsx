"use client";

import { usePlanStore } from "@/lib/store";
import { ahvCouplePension, ahvJahresrenteEinzel } from "@/engine/ahv";
import { bvgBezug } from "@/engine/bvg";
import { pensionsjahr } from "@/lib/pension";
import { formatChf } from "@/lib/format";

export function Dashboard() {
  const fallart = usePlanStore((s) => s.fallart);
  const ahvInput = usePlanStore((s) => s.ahv);
  const bvgInput = usePlanStore((s) => s.bvg);
  const ziele = usePlanStore((s) => s.ziele);
  const person1 = usePlanStore((s) => s.person1);
  const person2 = usePlanStore((s) => s.person2);

  const ahv = computeAhv();
  const bvg = computeBvg();

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
        details: ["Einkommen fehlt — Block 4"],
      };

    const fehljahreP1 = ahvInput.hatFehljahreP1 ? ahvInput.fehljahreAnzahlP1 : 0;
    const bezugsalterP1 = ahvInput.ahvBezugsalterP1;
    const bezugsjahrP1 =
      pensionsjahr(person1.geburtsdatum, bezugsalterP1) ?? new Date().getFullYear();

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
        details: buildAhvHints({
          fehljahre: fehljahreP1,
          vorbezug: r.vorbezugJahre,
          aufschub: r.aufschubJahre,
          hat13te: r.hat13te,
        }),
      };
    }

    const e2 = ahvInput.einkommenP2;
    if (e2 == null)
      return {
        haushaltJahres: null,
        monatsrente: null,
        details: ["Einkommen P2 fehlt — Block 4"],
      };

    const fehljahreP2 = ahvInput.hatFehljahreP2 ? ahvInput.fehljahreAnzahlP2 : 0;
    const bezugsalterP2 = ahvInput.ahvBezugsalterP2;
    const bezugsjahrP2 = pensionsjahr(person2.geburtsdatum, bezugsalterP2);

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
        out.plafoniert ? "Ehepaar plafoniert (150% Max)" : "Ehepaar mit Splitting",
        ...(out.hat13te ? ["inkl. 13. AHV (ab 2026)"] : []),
        ...(fehljahreP1 > 0 ? [`P1: ${fehljahreP1} Fehljahre`] : []),
        ...(fehljahreP2 > 0 ? [`P2: ${fehljahreP2} Fehljahre`] : []),
      ],
    };
  }

  function computeBvg(): {
    saldoBeiBezug: number | null;
    jahresrente: number | null;
    kapital: number | null;
    details: string[];
  } {
    const items: {
      altersguthaben: number;
      jahre: number;
      praef: typeof bvgInput.bezugspraeferenzP1;
      kapAnt: number;
    }[] = [];

    if (bvgInput.aktiverAnschlussP1 && bvgInput.altersguthabenP1 != null) {
      const j1 = jahreBisBezugP1();
      items.push({
        altersguthaben: bvgInput.altersguthabenP1,
        jahre: j1,
        praef: bvgInput.bezugspraeferenzP1,
        kapAnt: bvgInput.kapitalanteilP1,
      });
    }

    if (
      fallart === "paar" &&
      bvgInput.aktiverAnschlussP2 &&
      bvgInput.altersguthabenP2 != null
    ) {
      const j2 = jahreBisBezugP2();
      items.push({
        altersguthaben: bvgInput.altersguthabenP2,
        jahre: j2,
        praef: bvgInput.bezugspraeferenzP2,
        kapAnt: bvgInput.kapitalanteilP2,
      });
    }

    if (items.length === 0) {
      return {
        saldoBeiBezug: null,
        jahresrente: null,
        kapital: null,
        details: ["Altersguthaben fehlt — Block 5"],
      };
    }

    let saldo = 0;
    let rente = 0;
    let kapital = 0;
    const detSet = new Set<string>();
    for (const it of items) {
      const out = bvgBezug({
        altersguthabenHeute: it.altersguthaben,
        jahreBisBezug: it.jahre,
        bezugspraeferenz: it.praef,
        kapitalanteilProzent: it.kapAnt,
      });
      saldo += out.saldoBeiBezug;
      rente += out.jahresrente;
      kapital += out.kapitalauszahlung;
      detSet.add(praefLabel(it.praef, it.kapAnt));
    }

    return {
      saldoBeiBezug: saldo,
      jahresrente: rente,
      kapital,
      details: [
        ...Array.from(detSet),
        `Mindestzinssatz 1.25%, UWS 6.8% bei 65`,
      ],
    };
  }

  function jahreBisBezugP1(): number {
    const j = pensionsjahr(person1.geburtsdatum, ziele.bezugsalterP1);
    if (j == null) return 0;
    return Math.max(0, j - new Date().getFullYear());
  }

  function jahreBisBezugP2(): number {
    const j = pensionsjahr(person2.geburtsdatum, ziele.bezugsalterP2);
    if (j == null) return 0;
    return Math.max(0, j - new Date().getFullYear());
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
        <span className="text-xs text-slate-400">Etappe 1 — AHV + BVG live</span>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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
        <KpiCard
          label="PK-Saldo bei Bezug"
          value={formatChf(bvg.saldoBeiBezug)}
          hints={bvg.details.slice(-1)}
        />
        <KpiCard
          label="PK-Auszahlung"
          value={
            bvg.jahresrente == null
              ? "—"
              : `${formatChf(bvg.jahresrente)} p.a.`
          }
          hints={[
            ...(bvg.kapital ? [`+ Kapital: ${formatChf(bvg.kapital)}`] : []),
            ...bvg.details.filter((d) => !d.startsWith("Mindest")),
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartPlaceholder title="Einnahmen/Ausgaben" />
        <ChartPlaceholder title="Vermögensentwicklung" />
        <ChartPlaceholder title="Steuerentwicklung" />
        <ChartPlaceholder title="Massnahmen-Liste" />
      </div>
    </div>
  );
}

function buildAhvHints(args: {
  fehljahre: number;
  vorbezug: number;
  aufschub: number;
  hat13te: boolean;
}): string[] {
  const hints: string[] = ["Einzelperson"];
  if (args.vorbezug > 0)
    hints.push(`Vorbezug ${args.vorbezug} J. (-${(args.vorbezug * 6.8).toFixed(1)}%)`);
  if (args.aufschub > 0) hints.push(`Aufschub ${args.aufschub} J.`);
  if (args.hat13te) hints.push("inkl. 13. AHV");
  if (args.fehljahre > 0) hints.push(`${args.fehljahre} Fehljahre`);
  return hints;
}

function praefLabel(p: "rente" | "kapital" | "mischung", anteil: number): string {
  if (p === "rente") return "Rente 100%";
  if (p === "kapital") return "Kapital 100%";
  return `Mischung ${anteil}/${100 - anteil}`;
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

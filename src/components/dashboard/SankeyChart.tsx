"use client";

/**
 * Sankey-Chart — Geldfluss-Visualisierung für 1 Jahr.
 *
 * Custom SVG-Implementation ohne externe Library — die Sankey-Mathematik
 * für einen Single-Layer-Bipartite-Graph (Quellen → Total → Ziele) ist
 * deutlich einfacher als die generische d3-sankey-Layout-Lösung und
 * vermeidet eine zusätzliche Dependency.
 *
 * Datenfluss:
 *   Quellen (Lohn, AHV, BVG, Mieten, Erbschaft, optional Vermögensentnahme)
 *     → Zentralknoten "Cashflow"
 *     → Ziele (Haushalt, Wohnen, Steuern, Sozial+BVG, 3a, PK-Einkauf, AHV-NE,
 *              Hypozins, Schenkung, Alimente, Saldo→Vermögen)
 */

import { useMemo, useState } from "react";
import type { CashflowZeile } from "@/engine/cashflow";
import { formatChf } from "@/lib/format";
import { pensionsjahr, ORDENTLICHES_AHV_ALTER } from "@/lib/pension";
import { usePlanStore } from "@/lib/store";

interface Props {
  cashflow: CashflowZeile[];
  /** wenn null/undefined: Dropdown wird angezeigt; sonst fix */
  jahrFix?: number | null;
  /** Höhe des SVG (default 380px). Print = 100mm × 2 Sankeys = je 320px */
  hoehe?: number;
  /** kompakte Variante ohne Card-Hülle (für Print) */
  bare?: boolean;
}

interface Flow {
  source: string;
  target: string;
  value: number;
  /** Spalte: "in" = Quelle, "out" = Ziel */
  richtung: "in" | "out";
  /** optionale Klasse: "defizit" = Vermögensentnahme (gestrichelt) */
  klasse?: "defizit" | "saldo";
}

interface Node {
  id: string;
  label: string;
  value: number;
  /** "left" | "center" | "right" */
  spalte: "left" | "center" | "right";
  farbe: string;
  /** y-Position (oben) im SVG nach Layout */
  y0?: number;
  y1?: number;
}

// Farben — Cuira-Palette
const FARBE = {
  // Einnahme-Quellen (Cuira-Deep + Verwandte)
  erwerb: "#0a2540",
  ahv: "#0d9488",
  bvg: "#22c55e",
  mieten: "#84cc16",
  erbschaft: "#d97706",
  defizit: "#e11d48", // Vermögensentnahme — rose
  // Zentralknoten
  total: "#1e3a8a",
  // Ausgaben-Ziele (Slate-Tones)
  haushalt: "#94a3b8",
  steuern: "#f59e0b",
  sozial: "#c084fc",
  vorsorge3a: "#a78bfa",
  pkEinkauf: "#8b5cf6",
  ahvNe: "#7c3aed",
  hypozins: "#ec4899",
  schenkung: "#fb7185",
  alimente: "#fda4af",
  saldo: "#10b981", // Emerald — Sparen
};

const ZIEL_DEFINITIONEN: Array<{
  key: keyof CashflowZeile;
  label: string;
  farbe: string;
}> = [
  { key: "ausgabenHaushalt", label: "Lebenshaltung", farbe: FARBE.haushalt },
  { key: "ausgabenHypozins", label: "Hypozins", farbe: FARBE.hypozins },
  { key: "ausgabenSteuern", label: "Steuern", farbe: FARBE.steuern },
  { key: "ausgabenSozialBvg", label: "Sozial+BVG", farbe: FARBE.sozial },
  { key: "ausgabenVorsorge3a", label: "3a-Einzahlung", farbe: FARBE.vorsorge3a },
  { key: "ausgabenPkEinkauf", label: "PK-Einkauf", farbe: FARBE.pkEinkauf },
  { key: "ausgabenAhvNe", label: "AHV-NE", farbe: FARBE.ahvNe },
  { key: "ausgabenSchenkung", label: "Schenkung", farbe: FARBE.schenkung },
  { key: "ausgabenAlimente", label: "Alimente", farbe: FARBE.alimente },
  { key: "ausgabenEinmalig", label: "Einmalig", farbe: FARBE.haushalt },
];

const QUELLE_DEFINITIONEN: Array<{
  key: keyof CashflowZeile;
  label: string;
  farbe: string;
}> = [
  { key: "einnahmenErwerb", label: "Erwerb", farbe: FARBE.erwerb },
  { key: "einnahmenAhv", label: "AHV-Rente", farbe: FARBE.ahv },
  { key: "einnahmenBvgRente", label: "BVG-Rente", farbe: FARBE.bvg },
  { key: "einnahmenMieten", label: "Mieten", farbe: FARBE.mieten },
  { key: "einnahmenErbschaft", label: "Erbschaft", farbe: FARBE.erbschaft },
];

export function SankeyChart({
  cashflow,
  jahrFix = null,
  hoehe = 380,
  bare = false,
}: Props) {
  const person1Geb = usePlanStore((s) => s.person1.geburtsdatum);
  const ziele = usePlanStore((s) => s.ziele);

  const heutigesJahr = new Date().getFullYear();
  const pensionJahr = useMemo(
    () => pensionsjahr(person1Geb, ziele.bezugsalterP1),
    [person1Geb, ziele.bezugsalterP1]
  );
  const ordPensionJahr = useMemo(
    () => pensionsjahr(person1Geb, ORDENTLICHES_AHV_ALTER),
    [person1Geb]
  );

  // Jahre für Dropdown
  const jahrOptionen = useMemo(() => {
    const opts: Array<{ jahr: number; label: string }> = [];
    if (cashflow.find((z) => z.jahr === heutigesJahr)) {
      opts.push({ jahr: heutigesJahr, label: `Heute (${heutigesJahr})` });
    }
    if (pensionJahr && cashflow.find((z) => z.jahr === pensionJahr)) {
      opts.push({ jahr: pensionJahr, label: `Bei Pension (${pensionJahr})` });
    }
    if (
      ordPensionJahr &&
      ordPensionJahr !== pensionJahr &&
      cashflow.find((z) => z.jahr === ordPensionJahr)
    ) {
      opts.push({
        jahr: ordPensionJahr,
        label: `Ord. Pension (${ordPensionJahr})`,
      });
    }
    if (person1Geb) {
      const gebJahr = Number.parseInt(person1Geb.slice(0, 4), 10);
      if (Number.isFinite(gebJahr)) {
        const j75 = gebJahr + 75;
        const j85 = gebJahr + 85;
        if (cashflow.find((z) => z.jahr === j75))
          opts.push({ jahr: j75, label: `Alter 75 (${j75})` });
        if (cashflow.find((z) => z.jahr === j85))
          opts.push({ jahr: j85, label: `Alter 85 (${j85})` });
      }
    }
    return opts;
  }, [cashflow, heutigesJahr, pensionJahr, ordPensionJahr, person1Geb]);

  const defaultJahr = jahrFix ?? jahrOptionen[0]?.jahr ?? heutigesJahr;
  const [auswahlJahr, setAuswahlJahr] = useState<number>(defaultJahr);
  const aktivJahr = jahrFix ?? auswahlJahr;
  const zeile = useMemo(
    () => cashflow.find((z) => z.jahr === aktivJahr) ?? cashflow[0],
    [cashflow, aktivJahr]
  );

  if (!zeile) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
        Geldfluss-Diagramm — keine Cashflow-Daten verfügbar.
      </div>
    );
  }

  // ── Flows berechnen ────────────────────────────────────────────────
  const inFlows: Flow[] = QUELLE_DEFINITIONEN.flatMap((q) => {
    const v = Number(zeile[q.key] ?? 0);
    if (v <= 0) return [];
    return [{ source: q.label, target: "Cashflow", value: v, richtung: "in" as const }];
  });
  const einnahmenTotal = inFlows.reduce((s, f) => s + f.value, 0);

  // Out-Flows: alle positiven Ausgabe-Positionen + Saldo→Vermögen
  const outFlowsAusgaben: Flow[] = ZIEL_DEFINITIONEN.flatMap((z) => {
    const v = Number(zeile[z.key] ?? 0);
    if (v <= 0) return [];
    return [
      {
        source: "Cashflow",
        target: z.label,
        value: v,
        richtung: "out" as const,
      },
    ];
  });
  const ausgabenSum = outFlowsAusgaben.reduce((s, f) => s + f.value, 0);

  const saldo = einnahmenTotal - ausgabenSum;
  const outFlows: Flow[] = [...outFlowsAusgaben];
  if (saldo > 0) {
    outFlows.push({
      source: "Cashflow",
      target: "Saldo → Vermögen",
      value: saldo,
      richtung: "out",
      klasse: "saldo",
    });
  }

  // Defizit-Fall: Ausgaben > Einnahmen → Vermögensentnahme als zusätzliche Quelle
  let defizit = 0;
  if (saldo < 0) {
    defizit = Math.abs(saldo);
    inFlows.push({
      source: "Vermögensentnahme",
      target: "Cashflow",
      value: defizit,
      richtung: "in",
      klasse: "defizit",
    });
  }

  // Total = max(Einnahmen, Ausgaben) — beide Seiten müssen am Zentralknoten gleich gross sein
  const totalDurchsatz = Math.max(
    einnahmenTotal + defizit,
    ausgabenSum + (saldo > 0 ? saldo : 0)
  );

  if (totalDurchsatz <= 0 || (inFlows.length === 0 && outFlows.length === 0)) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
        Geldfluss-Diagramm — für Jahr {aktivJahr} keine relevanten Cashflows
        erfasst.
      </div>
    );
  }

  // ── Nodes ──────────────────────────────────────────────────────────
  const nodesIn: Node[] = inFlows.map((f) => {
    const istDefizit = f.klasse === "defizit";
    const farbe = istDefizit
      ? FARBE.defizit
      : QUELLE_DEFINITIONEN.find((q) => q.label === f.source)?.farbe ??
        FARBE.erwerb;
    return {
      id: f.source,
      label: f.source,
      value: f.value,
      spalte: "left",
      farbe,
    };
  });
  const nodeCenter: Node = {
    id: "Cashflow",
    label: "Cashflow",
    value: totalDurchsatz,
    spalte: "center",
    farbe: FARBE.total,
  };
  const nodesOut: Node[] = outFlows.map((f) => {
    const istSaldo = f.klasse === "saldo";
    const farbe = istSaldo
      ? FARBE.saldo
      : ZIEL_DEFINITIONEN.find((z) => z.label === f.target)?.farbe ??
        FARBE.haushalt;
    return {
      id: f.target,
      label: f.target,
      value: f.value,
      spalte: "right",
      farbe,
    };
  });

  // ── Layout-Konstanten ──────────────────────────────────────────────
  const SVG_BREITE = 720;
  const SVG_HOEHE = hoehe;
  const PADDING_TOP = 16;
  const PADDING_BOTTOM = 16;
  const NUTZHOEHE = SVG_HOEHE - PADDING_TOP - PADDING_BOTTOM;
  const NODE_ABSTAND = 6;
  const NODE_BREITE = 14;
  const SPALTE_LEFT_X = 110;
  const SPALTE_CENTER_X = SVG_BREITE / 2 - NODE_BREITE / 2;
  const SPALTE_RIGHT_X = SVG_BREITE - 110 - NODE_BREITE;

  // Skalierung: alle Werte in Pixel-Höhe umrechnen
  // Wir wollen, dass die Summe in jeder Spalte auf NUTZHOEHE − (n−1)×NODE_ABSTAND passt
  const inSum = nodesIn.reduce((s, n) => s + n.value, 0);
  const outSum = nodesOut.reduce((s, n) => s + n.value, 0);
  const maxSum = Math.max(inSum, outSum, totalDurchsatz, 1);
  const totalNodes = Math.max(nodesIn.length, nodesOut.length);
  const verfuegbareNutzhoehe =
    NUTZHOEHE - (totalNodes - 1) * NODE_ABSTAND;
  const px = (chf: number) => (chf / maxSum) * verfuegbareNutzhoehe;

  // ── Layout: Y-Positionen berechnen ─────────────────────────────────
  function layoutSpalte(nodes: Node[]) {
    const summe = nodes.reduce((s, n) => s + n.value, 0);
    const summeHoehe = px(summe);
    const lueckenHoehe = Math.max(0, nodes.length - 1) * NODE_ABSTAND;
    const totalHoehe = summeHoehe + lueckenHoehe;
    let y = PADDING_TOP + (NUTZHOEHE - totalHoehe) / 2;
    for (const n of nodes) {
      n.y0 = y;
      n.y1 = y + px(n.value);
      y = n.y1 + NODE_ABSTAND;
    }
  }
  layoutSpalte(nodesIn);
  layoutSpalte(nodesOut);
  // Zentralknoten: voll, zentriert
  const centerHoehe = px(totalDurchsatz);
  nodeCenter.y0 = PADDING_TOP + (NUTZHOEHE - centerHoehe) / 2;
  nodeCenter.y1 = nodeCenter.y0 + centerHoehe;

  // ── Flow-Bänder: für jedes inFlow / outFlow eine Bezier-Kurve ──────
  // Position am Zentralknoten = laufende Y-Position innerhalb des Knotens
  let yCenterInLauf = nodeCenter.y0;
  const inBaender = nodesIn.map((node, i) => {
    const f = inFlows[i];
    if (!f) return null;
    const h = px(node.value);
    const x0 = SPALTE_LEFT_X + NODE_BREITE;
    const x1 = SPALTE_CENTER_X;
    const yLeftTop = node.y0 ?? 0;
    const yLeftBot = (node.y0 ?? 0) + h;
    const yRightTop = yCenterInLauf;
    const yRightBot = yCenterInLauf + h;
    yCenterInLauf += h;
    const dx = (x1 - x0) / 2;
    const d = `M ${x0} ${yLeftTop}
       C ${x0 + dx} ${yLeftTop}, ${x1 - dx} ${yRightTop}, ${x1} ${yRightTop}
       L ${x1} ${yRightBot}
       C ${x1 - dx} ${yRightBot}, ${x0 + dx} ${yLeftBot}, ${x0} ${yLeftBot}
       Z`;
    return {
      d,
      farbe: node.farbe,
      label: node.label,
      value: node.value,
      klasse: f.klasse,
    };
  });

  let yCenterOutLauf = nodeCenter.y0;
  const outBaender = nodesOut.map((node, i) => {
    const f = outFlows[i];
    if (!f) return null;
    const h = px(node.value);
    const x0 = SPALTE_CENTER_X + NODE_BREITE;
    const x1 = SPALTE_RIGHT_X;
    const yLeftTop = yCenterOutLauf;
    const yLeftBot = yCenterOutLauf + h;
    const yRightTop = node.y0 ?? 0;
    const yRightBot = (node.y0 ?? 0) + h;
    yCenterOutLauf += h;
    const dx = (x1 - x0) / 2;
    const d = `M ${x0} ${yLeftTop}
       C ${x0 + dx} ${yLeftTop}, ${x1 - dx} ${yRightTop}, ${x1} ${yRightTop}
       L ${x1} ${yRightBot}
       C ${x1 - dx} ${yRightBot}, ${x0 + dx} ${yLeftBot}, ${x0} ${yLeftBot}
       Z`;
    return {
      d,
      farbe: node.farbe,
      label: node.label,
      value: node.value,
      klasse: f.klasse,
    };
  });

  // ── Render ─────────────────────────────────────────────────────────
  const titelJahr = aktivJahr;
  const alterText =
    zeile.alterP1 != null
      ? zeile.alterP2 != null
        ? ` · Alter ${zeile.alterP1}/${zeile.alterP2}`
        : ` · Alter ${zeile.alterP1}`
      : "";

  const content = (
    <>
      {/* Header */}
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-700">
            Geldfluss-Diagramm
          </div>
          <div className="text-xs text-slate-400">
            Jahr {titelJahr}
            {alterText} — Einnahmen links, Ausgaben rechts.
            {defizit > 0 && (
              <span className="ml-1 font-medium text-rose-600">
                Defizit aus Vermögen: {formatChf(defizit)}
              </span>
            )}
          </div>
        </div>
        {jahrFix == null && jahrOptionen.length > 0 && (
          <select
            value={aktivJahr}
            onChange={(e) => setAuswahlJahr(Number(e.target.value))}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm"
          >
            {jahrOptionen.map((o) => (
              <option key={o.jahr} value={o.jahr}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </header>

      {/* SVG-Sankey */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${SVG_BREITE} ${SVG_HOEHE}`}
          className="block h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`Geldfluss-Diagramm für ${titelJahr}`}
        >
          {/* Flow-Bänder: in (Einnahmen) — gestrichelt wenn defizit */}
          {inBaender.map(
            (b, i) =>
              b && (
                <path
                  key={`in-${i}`}
                  d={b.d}
                  fill={b.farbe}
                  fillOpacity={b.klasse === "defizit" ? 0.25 : 0.35}
                  stroke={b.klasse === "defizit" ? b.farbe : "none"}
                  strokeWidth={b.klasse === "defizit" ? 0.5 : 0}
                  strokeDasharray={b.klasse === "defizit" ? "4 3" : undefined}
                >
                  <title>
                    {b.label} → Cashflow: {formatChf(b.value)}
                  </title>
                </path>
              )
          )}
          {/* Flow-Bänder: out (Ausgaben + Saldo) */}
          {outBaender.map(
            (b, i) =>
              b && (
                <path
                  key={`out-${i}`}
                  d={b.d}
                  fill={b.farbe}
                  fillOpacity={b.klasse === "saldo" ? 0.5 : 0.35}
                >
                  <title>
                    Cashflow → {b.label}: {formatChf(b.value)}
                  </title>
                </path>
              )
          )}

          {/* Quellen-Knoten */}
          {nodesIn.map((n) => (
            <g key={`node-in-${n.id}`}>
              <rect
                x={SPALTE_LEFT_X}
                y={n.y0 ?? 0}
                width={NODE_BREITE}
                height={(n.y1 ?? 0) - (n.y0 ?? 0)}
                fill={n.farbe}
                rx={2}
              />
              <text
                x={SPALTE_LEFT_X - 6}
                y={((n.y0 ?? 0) + (n.y1 ?? 0)) / 2}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={11}
                fontFamily="ui-sans-serif, system-ui, sans-serif"
                fill="#0f172a"
              >
                {n.label}
              </text>
              <text
                x={SPALTE_LEFT_X - 6}
                y={((n.y0 ?? 0) + (n.y1 ?? 0)) / 2 + 12}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={9}
                fontFamily="ui-monospace, monospace"
                fill="#64748b"
              >
                {formatChf(n.value)}
              </text>
            </g>
          ))}

          {/* Zentralknoten */}
          <g>
            <rect
              x={SPALTE_CENTER_X}
              y={nodeCenter.y0 ?? 0}
              width={NODE_BREITE}
              height={(nodeCenter.y1 ?? 0) - (nodeCenter.y0 ?? 0)}
              fill={nodeCenter.farbe}
              rx={2}
            />
            <text
              x={SPALTE_CENTER_X + NODE_BREITE / 2}
              y={(nodeCenter.y0 ?? 0) - 6}
              textAnchor="middle"
              fontSize={11}
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              fontWeight={600}
              fill="#0f172a"
            >
              Cashflow
            </text>
            <text
              x={SPALTE_CENTER_X + NODE_BREITE / 2}
              y={(nodeCenter.y1 ?? 0) + 14}
              textAnchor="middle"
              fontSize={9}
              fontFamily="ui-monospace, monospace"
              fill="#64748b"
            >
              {formatChf(nodeCenter.value)}
            </text>
          </g>

          {/* Ziel-Knoten */}
          {nodesOut.map((n) => (
            <g key={`node-out-${n.id}`}>
              <rect
                x={SPALTE_RIGHT_X}
                y={n.y0 ?? 0}
                width={NODE_BREITE}
                height={(n.y1 ?? 0) - (n.y0 ?? 0)}
                fill={n.farbe}
                rx={2}
              />
              <text
                x={SPALTE_RIGHT_X + NODE_BREITE + 6}
                y={((n.y0 ?? 0) + (n.y1 ?? 0)) / 2}
                textAnchor="start"
                dominantBaseline="middle"
                fontSize={11}
                fontFamily="ui-sans-serif, system-ui, sans-serif"
                fill="#0f172a"
              >
                {n.label}
              </text>
              <text
                x={SPALTE_RIGHT_X + NODE_BREITE + 6}
                y={((n.y0 ?? 0) + (n.y1 ?? 0)) / 2 + 12}
                textAnchor="start"
                dominantBaseline="middle"
                fontSize={9}
                fontFamily="ui-monospace, monospace"
                fill="#64748b"
              >
                {formatChf(n.value)}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Mini-Legende */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <span
            className="inline-block size-2 rounded-sm"
            style={{ background: FARBE.saldo }}
          />
          Saldo → Vermögen
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block size-2 rounded-sm"
            style={{ background: FARBE.defizit, opacity: 0.5 }}
          />
          Vermögensentnahme (Defizit)
        </span>
        <span className="text-slate-400">
          Bandbreite ∝ CHF · Hover für genauen Wert
        </span>
      </div>
    </>
  );

  if (bare) return <div>{content}</div>;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      {content}
    </div>
  );
}

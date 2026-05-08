"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { CashflowZeile } from "@/engine/cashflow";
import { JahrAlterTick, X_ACHSEN_HOEHE } from "./chart-shared";

interface Props {
  daten: CashflowZeile[];
  datenB?: CashflowZeile[] | null;
  pensionsjahr: number | null;
  wunschPensionsjahr: number | null;
  fallart: "einzel" | "paar";
}

const FARBE = {
  erwerb: "#10b981",
  ahv: "#34d399",
  bvg: "#6ee7b7",
  mieten: "#a7f3d0",
  haushalt: "#f43f5e",
  steuern: "#fb7185",
  einmalig: "#fda4af",
  saldo: "#0a2540",
};

export function EinnahmenAusgabenChart({
  daten,
  datenB,
  pensionsjahr,
  wunschPensionsjahr,
  fallart,
}: Props) {
  const formatChfKurz = (value: number) => {
    const abs = Math.abs(value);
    const sign = value < 0 ? "−" : "";
    if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${sign}${Math.round(abs / 1000)}k`;
    return `${sign}${abs}`;
  };

  // Diverging-Bars: Ausgaben werden für die Visualisierung negativ — Recharts
  // stackt sie dann nach unten. Originaldaten bleiben positiv und tauchen im
  // Tooltip absolut auf.
  const datenViz = daten.map((d, i) => ({
    ...d,
    ausgabenHaushaltViz: -d.ausgabenHaushalt,
    ausgabenSteuernViz: -d.ausgabenSteuern,
    ausgabenEinmaligViz: -d.ausgabenEinmalig,
    saldoB: datenB?.[i]?.saldo ?? null,
  }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <header className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="text-base font-semibold text-slate-700">
            Einnahmen / Ausgaben
          </div>
          <div className="text-xs text-slate-400">
            Einnahmen oberhalb der Null-Linie, Ausgaben unterhalb — Saldo als Linie
          </div>
        </div>
        <Legende />
      </header>

      <ResponsiveContainer width="100%" height={460}>
        <ComposedChart
          data={datenViz}
          margin={{ top: 36, right: 16, left: 12, bottom: 8 }}
          stackOffset="sign"
        >
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />

          <XAxis
            dataKey="jahr"
            tick={(props) => (
              <JahrAlterTick {...props} daten={daten} fallart={fallart} />
            )}
            height={X_ACHSEN_HOEHE}
            stroke="#64748b"
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={formatChfKurz}
            tick={{ fontSize: 10 }}
            stroke="#64748b"
            width={56}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(10, 37, 64, 0.05)" }}
          />

          {/* Null-Linie als visueller Anker zwischen Einnahmen und Ausgaben */}
          <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />

          {/* Einnahmen — gestapelt nach oben */}
          <Bar dataKey="einnahmenErwerb" stackId="cf" fill={FARBE.erwerb} name="Erwerb" />
          <Bar dataKey="einnahmenAhv" stackId="cf" fill={FARBE.ahv} name="AHV" />
          <Bar
            dataKey="einnahmenBvgRente"
            stackId="cf"
            fill={FARBE.bvg}
            name="BVG-Rente"
          />
          <Bar
            dataKey="einnahmenMieten"
            stackId="cf"
            fill={FARBE.mieten}
            name="Mieten"
          />

          {/* Ausgaben — gestapelt nach unten (negative Werte) */}
          <Bar
            dataKey="ausgabenHaushaltViz"
            stackId="cf"
            fill={FARBE.haushalt}
            name="Haushalt"
          />
          <Bar
            dataKey="ausgabenSteuernViz"
            stackId="cf"
            fill={FARBE.steuern}
            name="Steuern"
          />
          <Bar
            dataKey="ausgabenEinmaligViz"
            stackId="cf"
            fill={FARBE.einmalig}
            name="Einmalige"
          />

          {/* Saldo-Linie A über den Bars */}
          <Line
            type="monotone"
            dataKey="saldo"
            stroke={FARBE.saldo}
            strokeWidth={2.5}
            dot={false}
            name="Saldo"
          />

          {/* Saldo-Linie B (Variante B) als gestrichelt — nur wenn vorhanden */}
          {datenB && (
            <Line
              type="monotone"
              dataKey="saldoB"
              stroke="#7c3aed"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              name="Saldo B"
            />
          )}

          {pensionsjahr != null && (
            <ReferenceLine
              x={pensionsjahr}
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="4 2"
              label={{
                value: "ord. Pension 65",
                position: "top",
                fill: "#92400e",
                fontSize: 10,
              }}
            />
          )}
          {wunschPensionsjahr != null && wunschPensionsjahr !== pensionsjahr && (
            <ReferenceLine
              x={wunschPensionsjahr}
              stroke="#7c3aed"
              strokeWidth={2}
              strokeDasharray="4 2"
              label={{
                value: "Wunsch-Pension",
                position: "top",
                fill: "#5b21b6",
                fontSize: 10,
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function Legende() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
      <LegendItem color={FARBE.erwerb} label="Einnahmen" />
      <LegendItem color={FARBE.haushalt} label="Ausgaben" />
      <LegendItem color={FARBE.saldo} label="Saldo" line />
    </div>
  );
}

function LegendItem({
  color,
  label,
  line,
}: {
  color: string;
  label: string;
  line?: boolean;
}) {
  return (
    <span className="flex items-center gap-1">
      {line ? (
        <span className="inline-block h-0.5 w-3" style={{ background: color }} />
      ) : (
        <span
          className="inline-block size-2 rounded-sm"
          style={{ background: color }}
        />
      )}
      {label}
    </span>
  );
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: CashflowZeile }[];
  label?: number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const z = payload[0]?.payload;
  if (!z) return null;

  const fmt = (n: number) =>
    new Intl.NumberFormat("de-CH", {
      maximumFractionDigits: 0,
      signDisplay: "auto",
    }).format(n);

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 shadow-md">
      <div className="mb-1 text-xs font-semibold text-slate-700">Jahr {label}</div>
      <div className="space-y-0.5 text-xs tabular-nums">
        <div className="flex justify-between gap-4 text-emerald-700">
          <span>Einnahmen</span>
          <span>{fmt(z.einnahmenTotal)}</span>
        </div>
        <div className="flex justify-between gap-4 text-rose-700">
          <span>Ausgaben</span>
          <span>{fmt(-z.ausgabenTotal)}</span>
        </div>
        <div className="mt-1 border-t border-slate-100 pt-1" />
        <div
          className={`flex justify-between gap-4 font-semibold ${
            z.saldo >= 0 ? "text-emerald-700" : "text-rose-700"
          }`}
        >
          <span>Saldo</span>
          <span>{fmt(z.saldo)}</span>
        </div>
      </div>
    </div>
  );
}

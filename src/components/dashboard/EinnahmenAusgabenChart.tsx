"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { CashflowZeile } from "@/engine/cashflow";
import { JahrAlterTick, X_ACHSEN_HOEHE } from "./chart-shared";

interface Props {
  daten: CashflowZeile[];
  pensionsjahr: number | null;
  wunschPensionsjahr: number | null;
  fallart: "einzel" | "paar";
}

export function EinnahmenAusgabenChart({
  daten,
  pensionsjahr,
  wunschPensionsjahr,
  fallart,
}: Props) {
  const formatChfKurz = (value: number) => {
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `${Math.round(value / 1000)}k`;
    return `${value}`;
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <header className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="text-base font-semibold text-slate-700">
            Einnahmen / Ausgaben
          </div>
          <div className="text-xs text-slate-400">
            Erwerb + Renten + Mieten gegen Haushalt + Steuern + einmalige
          </div>
        </div>
        <Legende />
      </header>

      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart
          data={daten}
          margin={{ top: 8, right: 12, left: 12, bottom: 8 }}
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
            width={50}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(10, 37, 64, 0.05)" }}
          />
          <Legend wrapperStyle={{ display: "none" }} />

          {/* Einnahmen (positiv, gestapelt) */}
          <Bar dataKey="einnahmenErwerb" stackId="ein" fill="#10b981" name="Erwerb" />
          <Bar dataKey="einnahmenAhv" stackId="ein" fill="#34d399" name="AHV" />
          <Bar
            dataKey="einnahmenBvgRente"
            stackId="ein"
            fill="#6ee7b7"
            name="BVG-Rente"
          />
          <Bar dataKey="einnahmenMieten" stackId="ein" fill="#a7f3d0" name="Mieten" />

          {/* Ausgaben (negativ als positive Werte invertiert via separate keys) */}
          <Bar
            dataKey="ausgabenHaushalt"
            stackId="aus"
            fill="#f43f5e"
            name="Haushalt"
          />
          <Bar dataKey="ausgabenSteuern" stackId="aus" fill="#fb7185" name="Steuern" />
          <Bar
            dataKey="ausgabenEinmalig"
            stackId="aus"
            fill="#fda4af"
            name="Einmalige"
          />

          {/* Saldo-Linie */}
          <Line
            type="monotone"
            dataKey="saldo"
            stroke="#0a2540"
            strokeWidth={2}
            dot={false}
            name="Saldo"
          />

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
      <LegendItem color="#10b981" label="Einnahmen" />
      <LegendItem color="#f43f5e" label="Ausgaben" />
      <LegendItem color="#0a2540" label="Saldo" line />
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
  payload?: { name: string; value: number; color: string }[];
  label?: number;
}) {
  if (!active || !payload || payload.length === 0) return null;

  // Aggregiere Einnahmen / Ausgaben / Saldo
  let einnahmen = 0;
  let ausgaben = 0;
  let saldo = 0;
  for (const p of payload) {
    if (
      p.name === "Erwerb" ||
      p.name === "AHV" ||
      p.name === "BVG-Rente" ||
      p.name === "Mieten"
    )
      einnahmen += p.value;
    else if (p.name === "Haushalt" || p.name === "Steuern" || p.name === "Einmalige")
      ausgaben += p.value;
    else if (p.name === "Saldo") saldo = p.value;
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 }).format(n);

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 shadow-md">
      <div className="mb-1 text-xs font-semibold text-slate-700">Jahr {label}</div>
      <div className="space-y-0.5 text-xs tabular-nums">
        <div className="flex justify-between gap-4 text-emerald-700">
          <span>Einnahmen</span>
          <span>{fmt(einnahmen)}</span>
        </div>
        <div className="flex justify-between gap-4 text-rose-700">
          <span>Ausgaben</span>
          <span>{fmt(ausgaben)}</span>
        </div>
        <div className="mt-1 border-t border-slate-100 pt-1" />
        <div
          className={`flex justify-between gap-4 font-semibold ${
            saldo >= 0 ? "text-slate-700" : "text-rose-700"
          }`}
        >
          <span>Saldo</span>
          <span>{fmt(saldo)}</span>
        </div>
      </div>
    </div>
  );
}

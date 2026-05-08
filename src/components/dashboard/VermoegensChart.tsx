"use client";

import {
  ComposedChart,
  Area,
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
  pensionsjahr: number | null;
  wunschPensionsjahr: number | null;
  fallart: "einzel" | "paar";
}

export function VermoegensChart({
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
            Vermögensentwicklung
          </div>
          <div className="text-xs text-slate-400">
            Aktiva minus Schulden, Jahr für Jahr
          </div>
        </div>
        <Legende />
      </header>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart
          data={daten}
          margin={{ top: 8, right: 12, left: 12, bottom: 8 }}
        >
          <defs>
            <linearGradient id="aktivaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0a2540" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#0a2540" stopOpacity={0.02} />
            </linearGradient>
          </defs>
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
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />

          <Area
            type="monotone"
            dataKey="vermoegenAktiva"
            stroke="#0a2540"
            strokeWidth={1}
            fill="url(#aktivaGradient)"
            name="Aktiva"
          />
          <Line
            type="monotone"
            dataKey="vermoegenSchulden"
            stroke="#f43f5e"
            strokeWidth={1.5}
            dot={false}
            name="Schulden"
          />
          <Line
            type="monotone"
            dataKey="vermoegenNetto"
            stroke="#0a2540"
            strokeWidth={2.5}
            dot={false}
            name="Netto"
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
      <LegendItem color="#0a2540" label="Aktiva" filled />
      <LegendItem color="#f43f5e" label="Schulden" />
      <LegendItem color="#0a2540" label="Netto" thick />
    </div>
  );
}

function LegendItem({
  color,
  label,
  filled,
  thick,
}: {
  color: string;
  label: string;
  filled?: boolean;
  thick?: boolean;
}) {
  return (
    <span className="flex items-center gap-1">
      {filled ? (
        <span
          className="inline-block size-2 rounded-sm"
          style={{ background: color, opacity: 0.3 }}
        />
      ) : (
        <span
          className="inline-block w-3"
          style={{
            background: color,
            height: thick ? "2px" : "1px",
          }}
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
  payload?: { name: string; value: number }[];
  label?: number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const aktiva = payload.find((p) => p.name === "Aktiva")?.value ?? 0;
  const schulden = payload.find((p) => p.name === "Schulden")?.value ?? 0;
  const netto = payload.find((p) => p.name === "Netto")?.value ?? 0;

  const fmt = (n: number) =>
    new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 }).format(n);

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 shadow-md">
      <div className="mb-1 text-xs font-semibold text-slate-700">Jahr {label}</div>
      <div className="space-y-0.5 text-xs tabular-nums">
        <div className="flex justify-between gap-4 text-slate-600">
          <span>Aktiva</span>
          <span>{fmt(aktiva)}</span>
        </div>
        <div className="flex justify-between gap-4 text-rose-700">
          <span>− Schulden</span>
          <span>{fmt(schulden)}</span>
        </div>
        <div className="mt-1 border-t border-slate-100 pt-1" />
        <div className="flex justify-between gap-4 font-semibold text-slate-800">
          <span>Netto</span>
          <span>{fmt(netto)}</span>
        </div>
      </div>
    </div>
  );
}

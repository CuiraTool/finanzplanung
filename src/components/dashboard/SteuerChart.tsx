"use client";

import {
  ComposedChart,
  Bar,
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

export function SteuerChart({
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
          <div className="text-base font-semibold text-slate-700">Steuerentwicklung</div>
          <div className="text-xs text-slate-400">
            Einkommens- + Vermögens- + Kapitalauszahlungssteuer pro Jahr
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
          <Tooltip content={<CustomTooltip />} />

          <Bar
            dataKey="ausgabenSteuernEinkommen"
            stackId="steuer"
            fill="#1e3a5f"
            name="Einkommen"
          />
          <Bar
            dataKey="ausgabenSteuernVermoegen"
            stackId="steuer"
            fill="#475569"
            name="Vermögen"
          />
          <Bar
            dataKey="ausgabenSteuernKapital"
            stackId="steuer"
            fill="#f59e0b"
            name="Kapitalauszahlung"
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
      <LegendItem color="#1e3a5f" label="Einkommen" />
      <LegendItem color="#475569" label="Vermögen" />
      <LegendItem color="#f59e0b" label="Kapital" />
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span
        className="inline-block size-2 rounded-sm"
        style={{ background: color }}
      />
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
  const eink = payload.find((p) => p.name === "Einkommen")?.value ?? 0;
  const verm = payload.find((p) => p.name === "Vermögen")?.value ?? 0;
  const kap = payload.find((p) => p.name === "Kapitalauszahlung")?.value ?? 0;
  const total = eink + verm + kap;

  const fmt = (n: number) =>
    new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 }).format(n);

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 shadow-md">
      <div className="mb-1 text-xs font-semibold text-slate-700">Jahr {label}</div>
      <div className="space-y-0.5 text-xs tabular-nums">
        <div className="flex justify-between gap-4 text-slate-700">
          <span>Einkommen</span>
          <span>{fmt(eink)}</span>
        </div>
        <div className="flex justify-between gap-4 text-slate-700">
          <span>Vermögen</span>
          <span>{fmt(verm)}</span>
        </div>
        <div className="flex justify-between gap-4 text-amber-700">
          <span>Kapitalauszahlung</span>
          <span>{fmt(kap)}</span>
        </div>
        <div className="mt-1 border-t border-slate-100 pt-1" />
        <div className="flex justify-between gap-4 font-semibold text-slate-800">
          <span>Total</span>
          <span>{fmt(total)}</span>
        </div>
      </div>
    </div>
  );
}

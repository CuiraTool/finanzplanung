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

const FARBE = {
  liquiditaet: "#93c5fd", // hellblau
  wertschriften: "#34d399", // emerald
  vorsorge: "#a78bfa", // violett
  immobilien: "#fbbf24", // amber
  firma: "#fb7185", // rose
  schulden: "#dc2626", // rot
  netto: "#0a2540", // Cuira-Dunkelblau
};

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
            Aktiva nach Komponente, Schulden separat, Netto-Linie
          </div>
        </div>
        <Legende />
      </header>

      <ResponsiveContainer width="100%" height={460}>
        <ComposedChart
          data={daten}
          margin={{ top: 36, right: 16, left: 12, bottom: 8 }}
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
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Stacked Aktiva-Komponenten (von unten nach oben) */}
          <Area
            type="monotone"
            dataKey="vermoegenLiquiditaet"
            stackId="aktiva"
            stroke={FARBE.liquiditaet}
            strokeWidth={1}
            fill={FARBE.liquiditaet}
            fillOpacity={0.7}
            name="Liquidität"
          />
          <Area
            type="monotone"
            dataKey="vermoegenWertschriften"
            stackId="aktiva"
            stroke={FARBE.wertschriften}
            strokeWidth={1}
            fill={FARBE.wertschriften}
            fillOpacity={0.7}
            name="Wertschriften"
          />
          <Area
            type="monotone"
            dataKey="vermoegenVorsorge"
            stackId="aktiva"
            stroke={FARBE.vorsorge}
            strokeWidth={1}
            fill={FARBE.vorsorge}
            fillOpacity={0.7}
            name="Vorsorge"
          />
          <Area
            type="monotone"
            dataKey="vermoegenImmobilien"
            stackId="aktiva"
            stroke={FARBE.immobilien}
            strokeWidth={1}
            fill={FARBE.immobilien}
            fillOpacity={0.7}
            name="Immobilien"
          />
          <Area
            type="monotone"
            dataKey="vermoegenFirma"
            stackId="aktiva"
            stroke={FARBE.firma}
            strokeWidth={1}
            fill={FARBE.firma}
            fillOpacity={0.7}
            name="Firma"
          />

          {/* Schulden als Linie (unten) */}
          <Line
            type="monotone"
            dataKey="vermoegenSchulden"
            stroke={FARBE.schulden}
            strokeWidth={1.5}
            strokeDasharray="3 3"
            dot={false}
            name="Schulden"
          />

          {/* Netto als dicke Linie */}
          <Line
            type="monotone"
            dataKey="vermoegenNetto"
            stroke={FARBE.netto}
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
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-slate-500 sm:grid-cols-4 lg:grid-cols-7">
      <LegendDot color={FARBE.liquiditaet} label="Liquidität" />
      <LegendDot color={FARBE.wertschriften} label="Wertschriften" />
      <LegendDot color={FARBE.vorsorge} label="Vorsorge" />
      <LegendDot color={FARBE.immobilien} label="Immobilien" />
      <LegendDot color={FARBE.firma} label="Firma" />
      <LegendDot color={FARBE.schulden} label="Schulden" line dashed />
      <LegendDot color={FARBE.netto} label="Netto" line thick />
    </div>
  );
}

function LegendDot({
  color,
  label,
  line,
  thick,
  dashed,
}: {
  color: string;
  label: string;
  line?: boolean;
  thick?: boolean;
  dashed?: boolean;
}) {
  return (
    <span className="flex items-center gap-1">
      {line ? (
        <span
          className="inline-block w-3"
          style={{
            background: dashed
              ? `repeating-linear-gradient(90deg, ${color} 0 2px, transparent 2px 4px)`
              : color,
            height: thick ? "2px" : "1px",
          }}
        />
      ) : (
        <span
          className="inline-block size-2 rounded-sm"
          style={{ background: color, opacity: 0.7 }}
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

  const get = (name: string) =>
    payload.find((p) => p.name === name)?.value ?? 0;
  const liquiditaet = get("Liquidität");
  const wertschriften = get("Wertschriften");
  const vorsorge = get("Vorsorge");
  const immobilien = get("Immobilien");
  const firma = get("Firma");
  const schulden = get("Schulden");
  const netto = get("Netto");
  const aktiva = liquiditaet + wertschriften + vorsorge + immobilien + firma;

  const fmt = (n: number) =>
    new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 }).format(n);

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 shadow-md">
      <div className="mb-1 text-xs font-semibold text-slate-700">Jahr {label}</div>
      <div className="space-y-0.5 text-xs tabular-nums">
        <Row color={FARBE.liquiditaet} label="Liquidität" value={fmt(liquiditaet)} />
        <Row
          color={FARBE.wertschriften}
          label="Wertschriften"
          value={fmt(wertschriften)}
        />
        <Row color={FARBE.vorsorge} label="Vorsorge" value={fmt(vorsorge)} />
        <Row color={FARBE.immobilien} label="Immobilien" value={fmt(immobilien)} />
        {firma > 0 && (
          <Row color={FARBE.firma} label="Firma" value={fmt(firma)} />
        )}
        <div className="mt-1 border-t border-slate-100 pt-1" />
        <div className="flex justify-between gap-4 text-slate-600">
          <span>Aktiva total</span>
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

function Row({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-slate-600">
        <span
          className="inline-block size-2 rounded-sm"
          style={{ background: color, opacity: 0.7 }}
        />
        {label}
      </span>
      <span>{value}</span>
    </div>
  );
}

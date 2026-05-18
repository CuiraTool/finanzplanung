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
  /**
   * Wenn true: nur Einnahmen-Total grau oben + Ausgaben-Total grau unten +
   * Saldo-Linie. Keine Bucket-Aufteilung (für Kurz-PDF).
   */
  simple?: boolean;
}

const FARBE = {
  // Einnahmen — klar unterscheidbare Farben statt 4 Grüntöne
  erwerb: "#0a2540", // Cuira-Deep (Hauptfarbe Erwerb)
  ahv: "#0d9488", // Teal-600
  bvg: "#22c55e", // Green-500
  mieten: "#84cc16", // Lime-500
  // Ausgaben — bleiben wie bisher
  haushalt: "#f43f5e",
  steuern: "#f59e0b",
  sozial: "#c084fc", // Sozial+BVG-Beiträge (Erwerbsphase)
  vorsorge3a: "#a78bfa", // 3a-Einzahlung (Sparphase)
  hypozins: "#ec4899", // Hypothek-Zinsen (Pink/Magenta — klar von Haushalt unterschieden)
  einmalig: "#fda4af",
  saldo: "#1e3a8a", // Saldo-Linie etwas heller als erwerb (sonst kaum sichtbar)
};

export function EinnahmenAusgabenChart({
  daten,
  datenB,
  pensionsjahr,
  wunschPensionsjahr,
  fallart,
  simple = false,
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
    ausgabenSozialBvgViz: -d.ausgabenSozialBvg,
    ausgabenVorsorge3aViz: -d.ausgabenVorsorge3a,
    ausgabenHypozinsViz: -(d.ausgabenHypozins ?? 0),
    ausgabenEinmaligViz: -d.ausgabenEinmalig,
    einnahmenTotalViz: d.einnahmenTotal,
    ausgabenTotalViz: -d.ausgabenTotal,
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
            {simple
              ? "Einnahmen total grau oben, Ausgaben total grau unten, Saldo als Linie"
              : "Einnahmen oberhalb der Null-Linie, Ausgaben unterhalb — Saldo als Linie"}
          </div>
        </div>
        {!simple && <Legende />}
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

          {simple ? (
            /* Kurz-PDF: nur Total-Bars in Grau, keine Buckets */
            <>
              <Bar
                dataKey="einnahmenTotalViz"
                fill="#cbd5e1"
                stroke="#94a3b8"
                strokeWidth={1}
                name="Einnahmen total"
              />
              <Bar
                dataKey="ausgabenTotalViz"
                fill="#94a3b8"
                stroke="#64748b"
                strokeWidth={1}
                name="Ausgaben total"
              />
            </>
          ) : (
            <>
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
                dataKey="ausgabenSozialBvgViz"
                stackId="cf"
                fill={FARBE.sozial}
                name="Sozial+BVG"
              />
              <Bar
                dataKey="ausgabenVorsorge3aViz"
                stackId="cf"
                fill={FARBE.vorsorge3a}
                name="Säule 3a"
              />
              <Bar
                dataKey="ausgabenHaushaltViz"
                stackId="cf"
                fill={FARBE.haushalt}
                name="Haushalt"
              />
              <Bar
                dataKey="ausgabenHypozinsViz"
                stackId="cf"
                fill={FARBE.hypozins}
                name="Hypozins"
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
            </>
          )}

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
    <div className="flex flex-col items-end gap-1 text-[10px] text-slate-500">
      <div className="flex flex-wrap justify-end gap-x-3 gap-y-0.5">
        <span className="font-medium text-slate-600">Einnahmen:</span>
        <LegendItem color={FARBE.erwerb} label="Erwerb" />
        <LegendItem color={FARBE.ahv} label="AHV" />
        <LegendItem color={FARBE.bvg} label="BVG-Rente" />
        <LegendItem color={FARBE.mieten} label="Mieten" />
      </div>
      <div className="flex flex-wrap justify-end gap-x-3 gap-y-0.5">
        <span className="font-medium text-slate-600">Ausgaben:</span>
        <LegendItem color={FARBE.haushalt} label="Haushalt" />
        <LegendItem color={FARBE.hypozins} label="Hypozins" />
        <LegendItem color={FARBE.steuern} label="Steuern" />
        <LegendItem color={FARBE.sozial} label="Sozial+BVG" />
        <LegendItem color={FARBE.vorsorge3a} label="Säule 3a" />
        <LegendItem color={FARBE.einmalig} label="Einmalig" />
      </div>
      <LegendItem color={FARBE.saldo} label="Saldo (Sparquote)" line />
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
        {/* Einnahmen — Total + Aufschlüsselung */}
        <div className="flex justify-between gap-4 font-medium text-emerald-700">
          <span>Einnahmen</span>
          <span>{fmt(z.einnahmenTotal)}</span>
        </div>
        {z.einnahmenErwerb > 0 && (
          <div className="flex justify-between gap-4 pl-3 text-emerald-600/80">
            <span>davon Erwerb</span>
            <span>{fmt(z.einnahmenErwerb)}</span>
          </div>
        )}
        {z.einnahmenAhv > 0 && (
          <div className="flex justify-between gap-4 pl-3 text-emerald-600/80">
            <span>davon AHV</span>
            <span>{fmt(z.einnahmenAhv)}</span>
          </div>
        )}
        {z.einnahmenBvgRente > 0 && (
          <div className="flex justify-between gap-4 pl-3 text-emerald-600/80">
            <span>davon BVG-Rente</span>
            <span>{fmt(z.einnahmenBvgRente)}</span>
          </div>
        )}
        {z.einnahmenMieten > 0 && (
          <div className="flex justify-between gap-4 pl-3 text-emerald-600/80">
            <span>davon Mieten</span>
            <span>{fmt(z.einnahmenMieten)}</span>
          </div>
        )}

        {/* Ausgaben — Total + Aufschlüsselung */}
        <div className="mt-1 flex justify-between gap-4 font-medium text-rose-700">
          <span>Ausgaben</span>
          <span>{fmt(-z.ausgabenTotal)}</span>
        </div>
        {z.ausgabenHaushalt > 0 && (
          <div className="flex justify-between gap-4 pl-3 text-rose-500/80">
            <span>davon Haushalt</span>
            <span>{fmt(-z.ausgabenHaushalt)}</span>
          </div>
        )}
        {(z.ausgabenHypozins ?? 0) > 0 && (
          <div className="flex justify-between gap-4 pl-3 text-pink-600/80">
            <span>davon Hypozins</span>
            <span>{fmt(-(z.ausgabenHypozins ?? 0))}</span>
          </div>
        )}
        {z.ausgabenSteuern > 0 && (
          <div className="flex justify-between gap-4 pl-3 text-rose-500/80">
            <span>davon Steuern</span>
            <span>{fmt(-z.ausgabenSteuern)}</span>
          </div>
        )}
        {z.ausgabenSozialBvg > 0 && (
          <div className="flex justify-between gap-4 pl-3 text-purple-600/80">
            <span>davon Sozial+BVG</span>
            <span>{fmt(-z.ausgabenSozialBvg)}</span>
          </div>
        )}
        {z.ausgabenVorsorge3a > 0 && (
          <div className="flex justify-between gap-4 pl-3 text-purple-600/80">
            <span>davon Säule 3a</span>
            <span>{fmt(-z.ausgabenVorsorge3a)}</span>
          </div>
        )}
        {z.ausgabenEinmalig > 0 && (
          <div className="flex justify-between gap-4 pl-3 text-rose-500/80">
            <span>davon Einmalig</span>
            <span>{fmt(-z.ausgabenEinmalig)}</span>
          </div>
        )}

        {/* Saldo */}
        <div className="mt-1 border-t border-slate-100 pt-1" />
        <div
          className={`flex justify-between gap-4 font-semibold ${
            z.saldo >= 0 ? "text-emerald-700" : "text-rose-700"
          }`}
        >
          <span>Saldo (Sparquote)</span>
          <span>{fmt(z.saldo)}</span>
        </div>
      </div>
    </div>
  );
}

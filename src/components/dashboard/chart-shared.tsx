"use client";

import type { CashflowZeile } from "@/engine/cashflow";

/**
 * Custom XAxis-Tick: rendert Jahr und Alter untereinander.
 * Recharts' tickFormatter unterstützt kein \n in SVG-Text — daher zwei
 * separate <text>-Elemente.
 */
export function JahrAlterTick({
  x,
  y,
  payload,
  daten,
  fallart,
}: {
  x?: number;
  y?: number;
  payload?: { value: number };
  daten: CashflowZeile[];
  fallart: "einzel" | "paar";
}) {
  if (x == null || y == null || payload == null) return null;
  const zeile = daten.find((z) => z.jahr === payload.value);
  const alterText =
    zeile && zeile.alterP1 != null
      ? fallart === "paar" && zeile.alterP2 != null
        ? `${zeile.alterP1}/${zeile.alterP2} J.`
        : `${zeile.alterP1} J.`
      : null;

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={12}
        textAnchor="middle"
        fill="#64748b"
        fontSize={10}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {payload.value}
      </text>
      {alterText && (
        <text
          x={0}
          y={0}
          dy={26}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={9}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          {alterText}
        </text>
      )}
    </g>
  );
}

/**
 * Höhe der X-Achse, damit zwei Zeilen Platz haben (default 30 reicht für eine).
 */
export const X_ACHSEN_HOEHE = 44;

"use client";

import type { Massnahme, MassnahmenKategorie } from "@/engine/massnahmen";

const KATEGORIE_BADGE: Record<MassnahmenKategorie, { label: string; color: string }> = {
  vorsorge: { label: "Vorsorge", color: "bg-blue-50 text-blue-700" },
  steuern: { label: "Steuer", color: "bg-amber-50 text-amber-700" },
  nachlass: { label: "Nachlass", color: "bg-violet-50 text-violet-700" },
  anlage: { label: "Anlage", color: "bg-emerald-50 text-emerald-700" },
  wohnen: { label: "Wohnen", color: "bg-rose-50 text-rose-700" },
  verwaltung: { label: "Verwaltung", color: "bg-slate-100 text-slate-700" },
};

const MONATE = [
  "Jan",
  "Feb",
  "Mär",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dez",
];

interface Props {
  massnahmen: Massnahme[];
  vornameP1: string;
  vornameP2?: string;
  fallart: "einzel" | "paar";
}

export function MassnahmenListe({
  massnahmen,
  vornameP1,
  vornameP2,
  fallart,
}: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <header className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="text-base font-semibold text-slate-700">Massnahmen</div>
          <div className="text-xs text-slate-400">
            Automatisch aus den Eingaben abgeleitet — chronologisch
          </div>
        </div>
        <div className="text-xs text-slate-500 tabular-nums">
          {massnahmen.length} {massnahmen.length === 1 ? "Eintrag" : "Einträge"}
        </div>
      </header>

      {massnahmen.length === 0 ? (
        <div className="grid h-48 place-items-center text-sm text-slate-400">
          Sobald die wichtigsten Eingaben da sind (Geburtsdatum, Pensionsalter,
          Vorsorgekapital), erscheinen hier die Schritte.
        </div>
      ) : (
        <ul className="max-h-[480px] divide-y divide-slate-100 overflow-y-auto">
          {massnahmen.map((m) => (
            <MassnahmeRow
              key={m.id}
              m={m}
              vornameP1={vornameP1}
              vornameP2={vornameP2}
              fallart={fallart}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function MassnahmeRow({
  m,
  vornameP1,
  vornameP2,
  fallart,
}: {
  m: Massnahme;
  vornameP1: string;
  vornameP2?: string;
  fallart: "einzel" | "paar";
}) {
  const badge = KATEGORIE_BADGE[m.kategorie];
  const monatLabel = m.monat ? `${MONATE[m.monat - 1]} ${m.jahr}` : `${m.jahr}`;
  const werLabel = werLabelFor(m.wer, vornameP1, vornameP2, fallart);

  return (
    <li className="grid grid-cols-[110px_90px_1fr] items-start gap-3 py-2">
      <div className="text-xs tabular-nums text-slate-500">{monatLabel}</div>
      <div className="text-xs text-slate-500">{werLabel}</div>
      <div className="space-y-1">
        <div className="flex items-start gap-2">
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${badge.color}`}
          >
            {badge.label}
          </span>
          <span className="text-sm text-slate-700">{m.titel}</span>
        </div>
        {m.detail && <div className="text-xs text-slate-400">{m.detail}</div>}
      </div>
    </li>
  );
}

function werLabelFor(
  wer: Massnahme["wer"],
  vornameP1: string,
  vornameP2: string | undefined,
  fallart: "einzel" | "paar"
): string {
  if (wer === "beide") return fallart === "paar" ? "Beide" : "—";
  if (wer === "p1") return vornameP1.trim() || (fallart === "paar" ? "Person 1" : "—");
  if (wer === "p2") return (vornameP2 ?? "").trim() || "Person 2";
  return "";
}

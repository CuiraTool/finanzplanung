"use client";

import type { Massnahme, MassnahmenKategorie } from "@/engine/massnahmen";

const KATEGORIE_BADGE: Record<MassnahmenKategorie, { label: string; color: string }> = {
  vorsorge: { label: "Vorsorge", color: "bg-blue-50 text-blue-700" },
  steuern: { label: "Steuer", color: "bg-amber-50 text-amber-700" },
  nachlass: { label: "Nachlass", color: "bg-violet-50 text-violet-700" },
  anlage: { label: "Anlage", color: "bg-emerald-50 text-emerald-700" },
  wohnen: { label: "Wohnen", color: "bg-rose-50 text-rose-700" },
  verwaltung: { label: "Verwaltung", color: "bg-slate-100 text-slate-700" },
  optimierung: { label: "✨ Optimierung", color: "bg-[var(--color-cuira-deep)]/10 text-[var(--color-cuira-deep)]" },
};

function formatChfKurz(n: number): string {
  return new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 }).format(n);
}

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
  const optimierungen = massnahmen.filter((m) => m.kategorie === "optimierung");
  const reminder = massnahmen.filter((m) => m.kategorie !== "optimierung");
  const totalErsparnis = optimierungen.reduce(
    (s, m) => s + (m.geschaetzteErsparnis ?? 0),
    0
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <header className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="text-base font-semibold text-slate-700">Massnahmen</div>
          <div className="text-xs text-slate-400">
            Automatisch aus den Eingaben abgeleitet — Optimierungen oben,
            Termine unten
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
        <>
          {/* Sticky Banner für Total-Ersparnis */}
          {totalErsparnis > 0 && (
            <div className="mb-3 rounded-md border border-[var(--color-cuira-deep)]/30 bg-[var(--color-cuira-deep)]/5 px-3 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-cuira-deep)]">
                  💰 Optimierungs-Potenzial
                </span>
                <span className="text-base font-semibold tabular-nums text-[var(--color-cuira-deep)]">
                  bis ~CHF {formatChfKurz(totalErsparnis)} / Jahr
                </span>
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                Summe der Ersparnis-Schätzungen aus den Optimierungen unten —
                kumulativ, nicht alle gleichzeitig anwendbar.
              </div>
            </div>
          )}

          {/* Optimierungs-Sektion (mit Highlight) */}
          {optimierungen.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                ✨ Optimierungen
              </div>
              <ul className="space-y-2">
                {optimierungen.map((m) => (
                  <OptimierungCard
                    key={m.id}
                    m={m}
                    vornameP1={vornameP1}
                    vornameP2={vornameP2}
                    fallart={fallart}
                  />
                ))}
              </ul>
            </div>
          )}

          {/* Reminder-Sektion (chronologisch) */}
          {reminder.length > 0 && (
            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                📅 Termine & Reminder
              </div>
              <ul className="max-h-[480px] divide-y divide-slate-100 overflow-y-auto">
                {reminder.map((m) => (
                  <MassnahmeRow
                    key={m.id}
                    m={m}
                    vornameP1={vornameP1}
                    vornameP2={vornameP2}
                    fallart={fallart}
                  />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function OptimierungCard({
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
  const werLabel = werLabelFor(m.wer, vornameP1, vornameP2, fallart);
  const ersparnis = m.geschaetzteErsparnis ?? 0;
  return (
    <li className="rounded-md border border-[var(--color-cuira-deep)]/20 bg-gradient-to-br from-[var(--color-cuira-deep)]/5 to-transparent p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
            {m.titel}
          </div>
          {m.detail && (
            <div className="mt-1 text-xs text-slate-600">{m.detail}</div>
          )}
        </div>
        {ersparnis > 0 && (
          <div className="shrink-0 text-right">
            <div className="text-base font-semibold tabular-nums text-[var(--color-cuira-deep)]">
              +{formatChfKurz(ersparnis)}
            </div>
            <div className="text-[10px] text-slate-500">CHF/Jahr</div>
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
        <span>{werLabel}</span>
        {m.prioritaet && (
          <>
            <span>·</span>
            <span>
              Priorität{" "}
              {m.prioritaet === 1
                ? "hoch"
                : m.prioritaet === 2
                  ? "mittel"
                  : "tief"}
            </span>
          </>
        )}
      </div>
    </li>
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

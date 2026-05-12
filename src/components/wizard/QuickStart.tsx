"use client";

/**
 * Quick-Start-Modus — der „30-Sekunden-Wow"-Splash vor dem Wizard.
 *
 * Wird gezeigt wenn der Plan komplett leer ist (kein Geburtsdatum erfasst).
 * 5 Pflichtfelder, sofortige Lite-Hochrechnung mit Vermögensverlauf-Chart.
 * Berater sieht in unter 1 Min ob die Pension reicht — in 30 Sek hat er
 * was zu zeigen.
 *
 * Beim "Im Detail erfassen →" Klick werden die 5 Werte in den PlanStore
 * geschrieben und der normale Wizard übernimmt.
 *
 * Differenziator vs. VZ/Logismata/TaxWare: keiner hat einen vergleichbar
 * schnellen "ersten Eindruck"-Moment im Termin. Logismata und TaxWare
 * verlangen 30+ Min Datenerfassung, bevor irgendwas auf dem Chart steht.
 */

import { useState, useMemo } from "react";
import { Sparkles, ArrowRight, MapPin, Calendar } from "lucide-react";
import { usePlanStore, KANTONE } from "@/lib/store";
import { formatChf } from "@/lib/format";

interface QuickStartState {
  geburtsjahr: number;
  kanton: string;
  einkommenJahr: number;
  pkSaldo: number;
  wunschPensionMonat: number;
  pensionsalter: number;
}

const HEUTE = new Date().getFullYear();

const DEFAULTS: QuickStartState = {
  geburtsjahr: HEUTE - 40,
  kanton: "ZH",
  einkommenJahr: 0,
  pkSaldo: 0,
  wunschPensionMonat: 0,
  pensionsalter: 65,
};

interface Props {
  /** Wird aufgerufen wenn der User auf "Im Detail erfassen" klickt. */
  onContinue: () => void;
}

export function QuickStart({ onContinue }: Props) {
  const [s, setS] = useState<QuickStartState>(DEFAULTS);
  const setFallart = usePlanStore((state) => state.setFallart);
  const setPerson1 = usePlanStore((state) => state.setPerson1);
  const setAdresse = usePlanStore((state) => state.setAdresse);
  const setSteuerAnker = usePlanStore((state) => state.setSteuerAnker);
  const setWunsch = usePlanStore((state) => state.setWunschverbrauchPension);
  const setAhv = usePlanStore((state) => state.setAhv);
  const setBvgP1 = usePlanStore((state) => state.setBvgP1);
  const setZiele = usePlanStore((state) => state.setZiele);

  const update = (patch: Partial<QuickStartState>) =>
    setS((cur) => ({ ...cur, ...patch }));

  const result = useMemo(() => liteRechnung(s), [s]);

  const istVollstaendig =
    s.geburtsjahr > 1900 &&
    s.geburtsjahr < HEUTE &&
    !!s.kanton &&
    s.einkommenJahr > 0 &&
    s.wunschPensionMonat > 0;

  const handleContinue = () => {
    // 5 Eckwerte in den PlanStore schreiben — die Engine rechnet ab da
    // mit dem normalen Cashflow-Code.
    setFallart("einzel");
    setPerson1({ geburtsdatum: `${s.geburtsjahr}-01-01` });
    setAdresse({ kanton: s.kanton });
    setSteuerAnker(null, s.einkommenJahr);
    setAhv({ einkommenP1: s.einkommenJahr });
    setBvgP1({
      altersguthabenHeute: s.pkSaldo > 0 ? s.pkSaldo : null,
      altersguthabenBeiBezug:
        s.pkSaldo > 0
          ? Math.round(
              s.pkSaldo *
                Math.pow(1.0125, Math.max(0, s.pensionsalter - alterAus(s.geburtsjahr)))
            )
          : null,
    });
    setZiele({ bezugsalterP1: s.pensionsalter });
    setWunsch(s.wunschPensionMonat);
    onContinue();
  };

  const alter = HEUTE - s.geburtsjahr;
  const jahreBisPension = Math.max(0, s.pensionsalter - alter);

  return (
    <div className="mx-auto max-w-[760px] py-8 px-6">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium" style={{ borderColor: "var(--border)", color: "var(--ink-3)" }}>
          <Sparkles className="h-3 w-3" style={{ color: "var(--accent-ink)" }} />
          Quick-Start · Erste Hochrechnung in 30 Sekunden
        </div>
        <h1
          className="mb-2 text-[32px] font-semibold leading-tight tracking-tight"
          style={{ color: "var(--ink)" }}
        >
          Reicht die Pension?
        </h1>
        <p
          className="mx-auto max-w-md text-[14px] leading-relaxed"
          style={{ color: "var(--ink-3)" }}
        >
          Fünf Eckwerte genügen für eine erste Schätzung. Danach kann im
          Wizard alles im Detail erfasst werden.
        </p>
      </div>

      {/* Form */}
      <div
        className="grid grid-cols-1 gap-4 rounded-[14px] border p-5 sm:grid-cols-2"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <Feld label="Geburtsjahr" icon={<Calendar className="h-3.5 w-3.5" />}>
          <input
            type="number"
            min={1930}
            max={HEUTE}
            value={s.geburtsjahr || ""}
            onChange={(e) =>
              update({ geburtsjahr: parseInt(e.target.value || "0", 10) })
            }
            className="cui-input tabular-nums"
            placeholder="z.B. 1985"
          />
          {alter > 0 && alter < 120 && (
            <Hint>{alter} Jahre alt</Hint>
          )}
        </Feld>

        <Feld label="Kanton" icon={<MapPin className="h-3.5 w-3.5" />}>
          <select
            value={s.kanton}
            onChange={(e) => update({ kanton: e.target.value })}
            className="cui-input"
          >
            {KANTONE.map((k) => (
              <option key={k.code} value={k.code}>
                {k.code} · {k.name}
              </option>
            ))}
          </select>
        </Feld>

        <Feld label="Brutto-Jahres-Einkommen (CHF)">
          <input
            type="number"
            inputMode="numeric"
            value={s.einkommenJahr || ""}
            onChange={(e) =>
              update({ einkommenJahr: parseInt(e.target.value || "0", 10) })
            }
            className="cui-input tabular-nums"
            placeholder="z.B. 100'000"
          />
        </Feld>

        <Feld label="PK-Saldo heute (CHF)" hint="optional">
          <input
            type="number"
            inputMode="numeric"
            value={s.pkSaldo || ""}
            onChange={(e) =>
              update({ pkSaldo: parseInt(e.target.value || "0", 10) })
            }
            className="cui-input tabular-nums"
            placeholder="z.B. 350'000"
          />
        </Feld>

        <Feld label="Wunsch-Pensionsalter">
          <input
            type="number"
            min={58}
            max={70}
            value={s.pensionsalter}
            onChange={(e) =>
              update({ pensionsalter: parseInt(e.target.value || "65", 10) })
            }
            className="cui-input tabular-nums"
          />
          {jahreBisPension > 0 && jahreBisPension < 50 && (
            <Hint>{jahreBisPension} Jahre bis Pension</Hint>
          )}
        </Feld>

        <Feld label="Wunsch-Ausgaben Pension (CHF/Monat)">
          <input
            type="number"
            inputMode="numeric"
            value={s.wunschPensionMonat || ""}
            onChange={(e) =>
              update({
                wunschPensionMonat: parseInt(e.target.value || "0", 10),
              })
            }
            className="cui-input tabular-nums"
            placeholder="z.B. 5'000"
          />
        </Feld>
      </div>

      {/* Live-Verdict */}
      {istVollstaendig && (
        <div
          className="mt-5 rounded-[14px] border p-5"
          style={{
            background: result.verdict === "good"
              ? "var(--pos-soft)"
              : result.verdict === "warn"
              ? "var(--warn-soft)"
              : "var(--neg-soft)",
            borderColor:
              result.verdict === "good"
                ? "var(--pos)"
                : result.verdict === "warn"
                ? "var(--warn)"
                : "var(--neg)",
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[24px] font-bold"
              style={{
                background: "rgba(255,255,255,0.7)",
                color:
                  result.verdict === "good"
                    ? "oklch(0.4 0.15 158)"
                    : result.verdict === "warn"
                    ? "oklch(0.5 0.15 60)"
                    : "var(--neg)",
              }}
            >
              {result.verdict === "good" ? "✓" : result.verdict === "warn" ? "!" : "✕"}
            </div>
            <div className="flex-1">
              <div
                className="text-[16px] font-semibold leading-tight"
                style={{
                  color:
                    result.verdict === "good"
                      ? "oklch(0.4 0.15 158)"
                      : result.verdict === "warn"
                      ? "oklch(0.5 0.15 60)"
                      : "var(--neg)",
                }}
              >
                {result.titel}
              </div>
              <p
                className="mt-1 text-[13px] leading-relaxed"
                style={{ color: "var(--ink-2)" }}
              >
                {result.text}
              </p>
            </div>
          </div>

          {/* Mini-Chart */}
          <div
            className="mt-4 rounded-md p-3"
            style={{ background: "rgba(255,255,255,0.5)" }}
          >
            <MiniChart
              series={result.series}
              pensionsjahr={s.geburtsjahr + s.pensionsalter}
              depleteJahr={result.depleteYear}
            />
          </div>

          {/* KPIs */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Kpi
              label="Heute"
              value={formatChf(result.startVermoegen)}
              sub={`${HEUTE}`}
            />
            <Kpi
              label="bei Pension"
              value={formatChf(result.atPension)}
              sub={`${s.geburtsjahr + s.pensionsalter}`}
            />
            <Kpi
              label="mit Alter 85"
              value={formatChf(result.at85)}
              sub={`${s.geburtsjahr + 85}`}
            />
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="mt-6 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={handleContinue}
          disabled={!istVollstaendig}
          className="cui-btn cui-btn-primary px-6 py-3 text-[14px] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Im Detail erfassen
          <ArrowRight className="h-4 w-4" />
        </button>
        <p
          className="text-[11px]"
          style={{ color: "var(--ink-3)" }}
        >
          Die 5 Werte werden übernommen, dann kannst du im Wizard alle
          Details ergänzen (Kinder, Säule 3a, Immobilien, Firma …).
        </p>
      </div>
    </div>
  );
}

function Feld({
  label,
  icon,
  hint,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div
        className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium"
        style={{ color: "var(--ink-2)" }}
      >
        {icon}
        <span>{label}</span>
        {hint && (
          <span
            className="ml-auto text-[10px] font-normal"
            style={{ color: "var(--ink-3)" }}
          >
            {hint}
          </span>
        )}
      </div>
      {children}
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mt-1 text-[10.5px]"
      style={{ color: "var(--ink-3)" }}
    >
      {children}
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div>
      <div
        className="text-[10px] font-medium uppercase tracking-wider"
        style={{ color: "var(--ink-3)" }}
      >
        {label}
      </div>
      <div
        className="mt-0.5 font-mono text-[14px] font-semibold tabular-nums"
        style={{ color: "var(--ink)" }}
      >
        {value}
      </div>
      <div
        className="font-mono text-[10px] tabular-nums"
        style={{ color: "var(--ink-3)" }}
      >
        {sub}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Lite-Engine — schnelle Browser-Projektion für die Quick-Start-Hochrechnung
   ═══════════════════════════════════════════════════════════════════════ */

interface SeriePoint {
  jahr: number;
  vermoegen: number;
}

interface LiteResult {
  series: SeriePoint[];
  startVermoegen: number;
  atPension: number;
  at85: number;
  depleteYear: number | null;
  verdict: "good" | "warn" | "neg";
  titel: string;
  text: string;
}

function alterAus(geburtsjahr: number): number {
  return HEUTE - geburtsjahr;
}

/**
 * Vereinfachte 60-Jahres-Projektion für Quick-Start-Schätzung.
 * Bewusst grob — die Pro-Engine läuft im Wizard mit voller Präzision.
 */
function liteRechnung(s: QuickStartState): LiteResult {
  const series: SeriePoint[] = [];
  const pensionsjahr = s.geburtsjahr + s.pensionsalter;
  const endJahr = s.geburtsjahr + 95;
  let vermoegen = s.pkSaldo + 50_000; // Annahme: 50k weiteres Vermögen
  let depleteYear: number | null = null;

  // Annahmen
  const sparquoteVorPension = 0.15; // 15% des Brutto-Einkommens spart der User real
  const renditeVor = 0.025; // 2.5% Rendite auf Vermögen vor Pension
  const renditeNach = 0.015; // 1.5% Rendite nach Pension (vorsichtiger)
  const ahvJahresrente = 30_240; // Single max — vereinfacht

  for (let y = HEUTE; y <= endJahr; y++) {
    const istPension = y >= pensionsjahr;
    if (istPension) {
      // Einnahmen Pension: AHV + PK-Rente (UWS 6% auf PK-Saldo bei Pension)
      const pkBeiBezug =
        s.pkSaldo > 0
          ? Math.round(
              s.pkSaldo *
                Math.pow(1.0125, Math.max(0, s.pensionsalter - alterAus(s.geburtsjahr)))
            )
          : 0;
      const pkRente = pkBeiBezug * 0.06;
      const einkommen = ahvJahresrente + pkRente;
      const ausgaben = s.wunschPensionMonat * 12;
      const steuer = (einkommen - ausgaben * 0.3) * 0.12; // grobe Schätzung
      const saldo = einkommen - ausgaben - Math.max(0, steuer);
      vermoegen = (vermoegen + saldo) * (1 + renditeNach);
    } else {
      // Sparphase
      const ersparnis = s.einkommenJahr * sparquoteVorPension;
      vermoegen = (vermoegen + ersparnis) * (1 + renditeVor);
    }

    series.push({ jahr: y, vermoegen: Math.round(vermoegen) });

    if (vermoegen < 0 && depleteYear == null) {
      depleteYear = y;
    }
  }

  const startVermoegen = series[0]?.vermoegen ?? 0;
  const pensionPoint = series.find((p) => p.jahr === pensionsjahr);
  const point85 = series.find((p) => p.jahr === s.geburtsjahr + 85);
  const atPension = pensionPoint?.vermoegen ?? 0;
  const at85 = point85?.vermoegen ?? 0;

  // Verdict
  let verdict: LiteResult["verdict"] = "good";
  let titel = "Pension reicht komfortabel";
  let text = `Bei dem aktuellen Profil reicht das Vermögen voraussichtlich bis Alter 95+. Im Wizard können Steuerersparnisse und Optimierungen identifiziert werden.`;

  if (depleteYear != null) {
    const ageAtDeplete = depleteYear - s.geburtsjahr;
    if (ageAtDeplete < 80) {
      verdict = "neg";
      titel = `Eng — Geld reicht bis Alter ${ageAtDeplete}`;
      text = `Mit den aktuellen Werten reicht das Vermögen nur bis Alter ${ageAtDeplete}. Im Wizard sehen wir, was die grössten Hebel sind.`;
    } else if (ageAtDeplete < 90) {
      verdict = "warn";
      titel = `Knapp — Geld reicht bis Alter ${ageAtDeplete}`;
      text = `Bei dem Profil reicht das Vermögen bis Alter ${ageAtDeplete}. Mit kleinen Anpassungen (3a, PK-Einkauf, Pensionierungsalter) lässt sich das verbessern.`;
    }
  }

  return {
    series,
    startVermoegen,
    atPension,
    at85,
    depleteYear,
    verdict,
    titel,
    text,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   Mini-Chart (SVG, kein Recharts — bleibt schlank im Quick-Start)
   ═══════════════════════════════════════════════════════════════════════ */

function MiniChart({
  series,
  pensionsjahr,
  depleteJahr,
}: {
  series: SeriePoint[];
  pensionsjahr: number;
  depleteJahr: number | null;
}) {
  if (series.length === 0) return null;
  const w = 660;
  const h = 120;
  const padL = 30;
  const padR = 12;
  const padT = 8;
  const padB = 22;

  const minX = series[0]!.jahr;
  const maxX = series[series.length - 1]!.jahr;
  const ys = series.map((s) => s.vermoegen);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 100_000);

  const sx = (x: number) =>
    padL + ((x - minX) / (maxX - minX)) * (w - padL - padR);
  const sy = (y: number) =>
    padT + (1 - (y - minY) / Math.max(1, maxY - minY)) * (h - padT - padB);

  const path = series
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${sx(p.jahr).toFixed(1)} ${sy(p.vermoegen).toFixed(1)}`
    )
    .join(" ");
  const area = `${path} L ${sx(maxX)} ${sy(0)} L ${sx(minX)} ${sy(0)} Z`;
  const retX = sx(pensionsjahr);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: 120, display: "block" }}
    >
      <defs>
        <linearGradient id="qs-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--cuira-deep)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--cuira-deep)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Null-Linie */}
      <line
        x1={padL}
        x2={w - padR}
        y1={sy(0)}
        y2={sy(0)}
        stroke="var(--border)"
        strokeDasharray="2 3"
      />
      {/* Area + Linie */}
      <path d={area} fill="url(#qs-grad)" />
      <path d={path} fill="none" stroke="var(--cuira-deep)" strokeWidth="2" />
      {/* Pensionsjahr */}
      <line
        x1={retX}
        x2={retX}
        y1={padT}
        y2={h - padB}
        stroke="var(--accent)"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      <text
        x={retX + 4}
        y={padT + 10}
        fontSize="9"
        fill="var(--accent-ink)"
        fontFamily="var(--font-mono)"
      >
        Pension {pensionsjahr}
      </text>
      {/* Aufgebraucht */}
      {depleteJahr && (
        <>
          <line
            x1={sx(depleteJahr)}
            x2={sx(depleteJahr)}
            y1={padT}
            y2={h - padB}
            stroke="var(--neg)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <text
            x={sx(depleteJahr) + 4}
            y={padT + 10}
            fontSize="9"
            fill="var(--neg)"
            fontFamily="var(--font-mono)"
          >
            Aufgebraucht {depleteJahr}
          </text>
        </>
      )}
      {/* X-Achse */}
      <text
        x={padL}
        y={h - 4}
        fontSize="9"
        fill="var(--ink-3)"
        fontFamily="var(--font-mono)"
      >
        {minX}
      </text>
      <text
        x={w - padR}
        y={h - 4}
        fontSize="9"
        fill="var(--ink-3)"
        textAnchor="end"
        fontFamily="var(--font-mono)"
      >
        {maxX}
      </text>
    </svg>
  );
}

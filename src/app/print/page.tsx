"use client";

/**
 * Druckversion der Pensionsplanungs-Auswertung.
 *
 * Native Browser-PDF-Generation: User klickt "Drucken" oder Cmd+P → Browser
 * generiert PDF (alle Browser unterstützen "Save as PDF" als Drucker).
 *
 * Vorteile gegenüber Server-PDF-Generation (Puppeteer):
 *  - Kein Backend nötig
 *  - Keine zusätzliche Library (~5 MB Puppeteer)
 *  - Funktioniert offline
 *  - User kontrolliert Format (A4/Letter, Portrait/Landscape)
 *
 * Nachteil: Charts werden so gerendert wie auf Bildschirm. Wenn der User
 * die Seite skaliert oder das Browser-Fenster klein ist, könnte das Layout
 * nicht optimal sein. Daher: bei Aufruf via ?autoprint=1 wartet die Seite
 * 1.5 Sekunden auf vollständiges Chart-Rendering, dann window.print().
 */

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePlanStore } from "@/lib/store";
import { vermoegensbilanz } from "@/engine/vermoegensbilanz";
import { cashflowReihe } from "@/engine/cashflow";
import { pensionsjahr, ORDENTLICHES_AHV_ALTER } from "@/lib/pension";
import { formatChf } from "@/lib/format";
import { massnahmenAusState } from "@/engine/massnahmen";
import { tragbarkeitHaushalt } from "@/engine/tragbarkeit";
import { pensionseinkommenJahr } from "@/engine/pensionseinkommen";
import { VermoegensChart } from "@/components/dashboard/VermoegensChart";
import { EinnahmenAusgabenChart } from "@/components/dashboard/EinnahmenAusgabenChart";

const PROJEKTIONS_END_ALTER = 85;

export default function PrintPage() {
  // useSearchParams würde Suspense brauchen; window.location ist client-only
  // und reicht hier völlig.
  const [autoprint, setAutoprint] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = new URLSearchParams(window.location.search);
    setAutoprint(u.get("autoprint") === "1");
  }, []);
  const fullState = usePlanStore();

  const heutigesJahr = new Date().getFullYear();
  const heuteFormatiert = new Date().toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const bilanz = useMemo(() => vermoegensbilanz(fullState), [fullState]);

  const endJahr = useMemo(() => {
    const j1 = chartEndJahr(fullState.person1.geburtsdatum, PROJEKTIONS_END_ALTER);
    if (fullState.fallart === "einzel") return j1 ?? heutigesJahr + 30;
    const j2 = chartEndJahr(fullState.person2.geburtsdatum, PROJEKTIONS_END_ALTER);
    return Math.max(j1 ?? 0, j2 ?? 0) || heutigesJahr + 30;
  }, [fullState, heutigesJahr]);

  const cashflow = useMemo(
    () => cashflowReihe(fullState, heutigesJahr, endJahr),
    [fullState, heutigesJahr, endJahr]
  );

  const ordPensionsjahr = useMemo(
    () => pensionsjahr(fullState.person1.geburtsdatum, ORDENTLICHES_AHV_ALTER),
    [fullState.person1.geburtsdatum]
  );

  const massnahmen = useMemo(() => massnahmenAusState(fullState), [fullState]);
  const optimierungen = massnahmen.filter((m) => m.kategorie === "optimierung");
  const reminder = massnahmen.filter((m) => m.kategorie !== "optimierung");

  const tragbarkeitHeute = useMemo(() => {
    if (fullState.immobilien.items.length === 0) return null;
    return tragbarkeitHaushalt(
      fullState.immobilien.items,
      fullState.budget.einkommenHeute ?? 0
    );
  }, [fullState.immobilien.items, fullState.budget.einkommenHeute]);

  const tragbarkeitPension = useMemo(() => {
    if (fullState.immobilien.items.length === 0) return null;
    const pensEink = pensionseinkommenJahr(fullState);
    return {
      ...tragbarkeitHaushalt(fullState.immobilien.items, pensEink.total),
      einkommenJahr: pensEink.total,
    };
  }, [fullState]);

  // Auto-print bei ?autoprint=1: warten bis Charts gerendert sind
  useEffect(() => {
    if (!autoprint) return;
    const t = setTimeout(() => window.print(), 1500);
    return () => clearTimeout(t);
  }, [autoprint]);

  const kundeName = `${fullState.person1.vorname} ${fullState.person1.nachname}`.trim();
  const kundeName2 =
    fullState.fallart === "paar"
      ? `${fullState.person2.vorname} ${fullState.person2.nachname}`.trim()
      : "";

  return (
    <main className="bg-white print:bg-white">
      {/* Toolbar nur am Bildschirm sichtbar */}
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 text-sm shadow-sm print:hidden">
        <div className="text-slate-600">
          📄 Druckversion — Cmd/Ctrl+P oder Knopf rechts
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            ← Zurück
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md bg-[var(--color-cuira-deep)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            🖨 Drucken / als PDF speichern
          </button>
        </div>
      </div>

      <article className="mx-auto max-w-[210mm] px-8 py-10 text-slate-800 print:px-0 print:py-0">
        {/* ── Cover ───────────────────────────────────────────── */}
        <header className="mb-12 flex items-start justify-between border-b border-slate-300 pb-6">
          <div>
            <Image
              src="/cuira-logo.png"
              alt="Cuira Partners"
              width={140}
              height={56}
              className="mb-4 h-12 w-auto"
              style={{ filter: "invert(1) brightness(0.2)" }}
            />
            <div className="text-sm text-slate-500">Cuira Partners GmbH</div>
            <div className="text-sm text-slate-500">Pensionsplanung</div>
          </div>
          <div className="text-right text-xs text-slate-500">
            <div>Stand: {heuteFormatiert}</div>
          </div>
        </header>

        <h1 className="mb-1 text-3xl font-semibold text-[var(--color-cuira-deep)]">
          Auslegeordnung Pensionsplanung
        </h1>
        <h2 className="mb-8 text-xl text-slate-700">
          {kundeName || "—"}
          {kundeName2 && <span> &amp; {kundeName2}</span>}
        </h2>

        {/* ── KPIs ────────────────────────────────────────────── */}
        <Section titel="Vermögen — drei Stichtage">
          <div className="grid grid-cols-3 gap-3">
            <KpiBox
              label="Heute"
              value={formatChf(bilanz.heute)}
              subtext={`per ${heutigesJahr}`}
            />
            <KpiBox
              label="Bei Pensionierung"
              value={formatChf(bilanz.beiPensionierung)}
              subtext={
                bilanz.pensionierungsjahr ? `Jahr ${bilanz.pensionierungsjahr}` : "—"
              }
              highlight
            />
            <KpiBox
              label="20 Jahre nach Pension"
              value={formatChf(bilanz.zwanzig20JahreSpaeter)}
              subtext={
                bilanz.zwanzigJahreReferenzjahr
                  ? `Jahr ${bilanz.zwanzigJahreReferenzjahr}`
                  : "—"
              }
            />
          </div>
        </Section>

        {/* ── Eckdaten ────────────────────────────────────────── */}
        <Section titel="Eckdaten">
          <table className="w-full text-sm">
            <tbody>
              <Row k="Fallart" v={fallartLabel(fullState.fallart)} />
              <Row k="Zivilstand" v={zivilstandLabel(fullState.zivilstand)} />
              <Row
                k="Wohnort"
                v={
                  fullState.adresse.gemeindeName ||
                  fullState.adresse.ort ||
                  fullState.adresse.kanton ||
                  "—"
                }
              />
              <Row
                k="Pensionsalter Person 1"
                v={`${fullState.ziele.bezugsalterP1} Jahre`}
              />
              {fullState.fallart === "paar" && (
                <Row
                  k="Pensionsalter Person 2"
                  v={`${fullState.ziele.bezugsalterP2} Jahre`}
                />
              )}
              <Row
                k="Wunschverbrauch in Pension (netto/Mt)"
                v={
                  fullState.budget.wunschverbrauchPension
                    ? formatChf(fullState.budget.wunschverbrauchPension)
                    : "—"
                }
              />
              <Row
                k="Brutto-Haushaltseinkommen heute"
                v={
                  fullState.budget.einkommenHeute
                    ? formatChf(fullState.budget.einkommenHeute)
                    : "—"
                }
              />
            </tbody>
          </table>
        </Section>

        {/* ── Charts: Page-Break davor ───────────────────────── */}
        <div className="page-break-before pt-4">
          <Section titel="Vermögensentwicklung">
            <div className="h-[300px]">
              {cashflow.length > 0 && (
                <VermoegensChart
                  daten={cashflow}
                  datenB={null}
                  pensionsjahr={ordPensionsjahr}
                  wunschPensionsjahr={null}
                  fallart={fullState.fallart}
                />
              )}
            </div>
          </Section>

          <Section titel="Cashflow Jahr für Jahr">
            <div className="h-[300px]">
              {cashflow.length > 0 && (
                <EinnahmenAusgabenChart
                  daten={cashflow}
                  datenB={null}
                  pensionsjahr={ordPensionsjahr}
                  wunschPensionsjahr={null}
                  fallart={fullState.fallart}
                />
              )}
            </div>
          </Section>
        </div>

        {/* ── Tragbarkeit ────────────────────────────────────── */}
        {(tragbarkeitHeute || tragbarkeitPension) && (
          <div className="page-break-before pt-4">
            <Section titel="Tragbarkeit Eigenheim">
              <div className="grid grid-cols-2 gap-3">
                {tragbarkeitHeute && (
                  <TragbarkeitBox
                    titel="heute"
                    verhaeltnis={tragbarkeitHeute.verhaeltnis}
                    kosten={tragbarkeitHeute.kostenJahr}
                    status={tragbarkeitHeute.status}
                  />
                )}
                {tragbarkeitPension && (
                  <TragbarkeitBox
                    titel="bei Pension"
                    verhaeltnis={tragbarkeitPension.verhaeltnis}
                    kosten={tragbarkeitPension.kostenJahr}
                    status={tragbarkeitPension.status}
                  />
                )}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Schweizer Bankenstandard: Wohnkosten ÷ Bruttoeinkommen ≤ 33 %.
                Kalkulatorischer Zinssatz 5 %, Nebenkosten 1 % vom Verkehrswert.
              </p>
            </Section>
          </div>
        )}

        {/* ── Optimierungs-Massnahmen ────────────────────────── */}
        {optimierungen.length > 0 && (
          <div className="page-break-before pt-4">
            <Section titel="Optimierungs-Empfehlungen">
              <ul className="space-y-2">
                {optimierungen.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-md border border-[var(--color-cuira-deep)]/30 bg-[var(--color-cuira-deep)]/5 p-3 text-sm"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <strong className="text-slate-800">{m.titel}</strong>
                      {m.geschaetzteErsparnis ? (
                        <span className="shrink-0 text-base font-semibold text-[var(--color-cuira-deep)]">
                          +{formatChf(m.geschaetzteErsparnis)} / Jahr
                        </span>
                      ) : null}
                    </div>
                    {m.detail && (
                      <p className="mt-1 text-xs text-slate-600">{m.detail}</p>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        )}

        {/* ── Termine ─────────────────────────────────────────── */}
        {reminder.length > 0 && (
          <Section titel="Termine & Reminder">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                  <th className="py-2 text-left">Jahr</th>
                  <th className="py-2 text-left">Wer</th>
                  <th className="py-2 text-left">Massnahme</th>
                </tr>
              </thead>
              <tbody>
                {reminder.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-slate-100 text-sm last:border-b-0"
                  >
                    <td className="py-1.5 tabular-nums text-slate-600">
                      {m.jahr}
                    </td>
                    <td className="py-1.5 text-slate-600">
                      {werLabel(m.wer, fullState)}
                    </td>
                    <td className="py-1.5 text-slate-800">
                      <div>{m.titel}</div>
                      {m.detail && (
                        <div className="text-xs text-slate-500">{m.detail}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* ── Footer / Disclaimer ─────────────────────────────── */}
        <footer className="mt-12 border-t border-slate-300 pt-6 text-xs text-slate-500">
          <p className="mb-2">
            <strong>Disclaimer:</strong> Diese Auslegeordnung basiert auf den
            von Ihnen eingegebenen Daten und Standard-Annahmen (Inflation
            1.5 % p.a., kalk. Hypozins 5 %, ESTV-Tarife 2025/26, BSV-Skala 44).
            Sie ersetzt keine individuelle Steuer- oder Vorsorgeberatung.
            Werte sind Schätzungen, abhängig von zukünftigen Gesetzes-,
            Markt- und Lebenslagen.
          </p>
          <p>
            Cuira Partners GmbH · CH-Schweiz · Stand: {heuteFormatiert}
          </p>
        </footer>
      </article>

      {/* Print-spezifische Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            background: white !important;
          }
          .page-break-before {
            page-break-before: always;
          }
        }
      `}</style>
    </main>
  );
}

function Section({
  titel,
  children,
}: {
  titel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8 break-inside-avoid">
      <h3 className="mb-3 border-b border-slate-200 pb-1 text-sm font-semibold uppercase tracking-wider text-[var(--color-cuira-deep)]">
        {titel}
      </h3>
      {children}
    </section>
  );
}

function KpiBox({
  label,
  value,
  subtext,
  highlight,
}: {
  label: string;
  value: string;
  subtext?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-md border p-3 ${
        highlight
          ? "border-[var(--color-cuira-deep)] bg-[var(--color-cuira-deep)]/5"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="text-xs text-slate-500">{label}</div>
      <div
        className={`mt-1 text-xl font-semibold tabular-nums ${
          highlight ? "text-[var(--color-cuira-deep)]" : "text-slate-800"
        }`}
      >
        {value}
      </div>
      {subtext && (
        <div className="mt-0.5 text-[10px] text-slate-400">{subtext}</div>
      )}
    </div>
  );
}

function TragbarkeitBox({
  titel,
  verhaeltnis,
  kosten,
  status,
}: {
  titel: string;
  verhaeltnis: number;
  kosten: number;
  status: string;
}) {
  const farbe =
    status === "tragbar"
      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
      : status === "grenzwertig"
        ? "bg-amber-50 border-amber-200 text-amber-700"
        : "bg-rose-50 border-rose-200 text-rose-700";
  return (
    <div className={`rounded-md border p-3 ${farbe}`}>
      <div className="text-xs uppercase tracking-wider">{titel}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">
        {(verhaeltnis * 100).toFixed(1)} %
      </div>
      <div className="text-xs text-slate-600">
        Wohnkosten {formatChf(kosten)} / Jahr · {status.replace("_", " ")}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <tr className="border-b border-slate-100">
      <td className="py-1.5 text-slate-500">{k}</td>
      <td className="py-1.5 text-right font-medium text-slate-800">{v}</td>
    </tr>
  );
}

function fallartLabel(f: "einzel" | "paar"): string {
  return f === "paar" ? "Paar" : "Einzelperson";
}

function zivilstandLabel(z: string): string {
  return (
    {
      ledig: "Ledig",
      verheiratet: "Verheiratet",
      konkubinat: "Eingetragene Partnerschaft / Konkubinat",
      verwitwet: "Verwitwet",
      geschieden: "Geschieden",
      getrennt: "Getrennt",
    }[z] ?? z
  );
}

function werLabel(
  wer: string,
  state: ReturnType<typeof usePlanStore.getState>
): string {
  if (wer === "beide") return state.fallart === "paar" ? "Beide" : "—";
  if (wer === "p1") return state.person1.vorname || "Person 1";
  if (wer === "p2") return state.person2.vorname || "Person 2";
  return "";
}

function chartEndJahr(geburtsdatum: string, alter: number): number | null {
  if (!geburtsdatum) return null;
  const j = parseInt(geburtsdatum.slice(0, 4), 10);
  if (!Number.isFinite(j)) return null;
  return j + alter;
}

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
import { runAllStressTests, STRESS_TESTS } from "@/engine/stress-tests";

interface KiMassnahmePrint {
  titel: string;
  begruendung: string;
  wirkungChf: number;
  wirkungBeschrieb: string;
  prioritaet: "hoch" | "mittel" | "niedrig";
  kategorie:
    | "steuern"
    | "rente"
    | "vermoegen"
    | "vorsorge"
    | "immobilien"
    | "nachlass";
  umsetzbarBis: string | null;
}
import { VermoegensChart } from "@/components/dashboard/VermoegensChart";
import { EinnahmenAusgabenChart } from "@/components/dashboard/EinnahmenAusgabenChart";
import { SteuerChart } from "@/components/dashboard/SteuerChart";

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

  // KI-Massnahmen aus LocalStorage laden (vom Dashboard generiert)
  const [kiMassnahmen, setKiMassnahmen] = useState<
    null | { massnahmen: KiMassnahmePrint[]; generatedAt: string }
  >(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("cuira-ki-massnahmen-v1");
      if (!raw) return;
      const p = JSON.parse(raw) as {
        snapshotHash: string;
        massnahmen: KiMassnahmePrint[];
        generatedAt: string;
      };
      setKiMassnahmen({
        massnahmen: p.massnahmen ?? [],
        generatedAt: p.generatedAt,
      });
    } catch {
      // ignore
    }
  }, []);

  // Stress-Tests (nur wenn genug Daten erfasst)
  const hatStressBasis =
    !!fullState.person1.geburtsdatum &&
    (fullState.vermoegen.items.some((it) => (it.saldoHeute ?? 0) > 0) ||
      (fullState.bvg.p1.altersguthabenHeute ?? 0) > 0);
  const stressTests = useMemo(
    () => (hatStressBasis ? runAllStressTests(fullState) : []),
    [fullState, hatStressBasis]
  );

  // Verdict aus dem letzten Cashflow-Eintrag (Vermögen am Lebensende)
  const verdict = useMemo(() => {
    if (cashflow.length === 0)
      return { type: "unbekannt" as const, titel: "—", text: "" };
    const letzte = cashflow[cashflow.length - 1];
    if (!letzte) return { type: "unbekannt" as const, titel: "—", text: "" };
    const aufgebrauchtJahr = cashflow.find(
      (z) => z.vermoegenNetto < 0
    )?.jahr;
    if (aufgebrauchtJahr) {
      const geburtsjahrZ = parseInt(
        fullState.person1.geburtsdatum.slice(0, 4),
        10
      );
      const alter = Number.isFinite(geburtsjahrZ)
        ? aufgebrauchtJahr - geburtsjahrZ
        : null;
      if (alter && alter < 80) {
        return {
          type: "neg" as const,
          titel: `Eng — Vermögen reicht bis Alter ${alter}`,
          text: `Bei den aktuellen Annahmen reicht das Vermögen voraussichtlich bis ins Jahr ${aufgebrauchtJahr}. Wir empfehlen Anpassungen am Pensionierungsalter, an der Bezugsform oder bei den Vorsorge-Einzahlungen.`,
        };
      }
      return {
        type: "warn" as const,
        titel: `Knapp — Vermögen reicht bis Alter ${alter ?? "—"}`,
        text: `Mit kleinen Anpassungen (3a-Lücke schliessen, PK-Einkauf, leicht später pensionieren) lässt sich das Bild verbessern.`,
      };
    }
    return {
      type: "good" as const,
      titel: "Pension reicht komfortabel",
      text: `Das Vermögen reicht voraussichtlich bis ins Jahr ${letzte.jahr}. Optimierungen siehe Massnahmen-Sektion.`,
    };
  }, [cashflow, fullState.person1.geburtsdatum]);

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
        {/* ── Cover-Seite (eigene Seite) ──────────────────────── */}
        <div className="cover-page flex h-[260mm] flex-col justify-between print:h-[260mm]">
          <header className="border-b-2 pb-6" style={{ borderColor: "#0a2540" }}>
            <Image
              src="/cuira-logo.png"
              alt="Cuira Partners"
              width={180}
              height={72}
              className="mb-2 h-14 w-auto"
              style={{ filter: "invert(1) brightness(0.2)" }}
            />
            <div className="text-sm" style={{ color: "#4b566b" }}>
              Cuira Partners GmbH — Pensionsplanung
            </div>
          </header>

          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div
              className="text-[10px] font-medium uppercase tracking-[0.18em]"
              style={{ color: "#8390a3" }}
            >
              Auslegeordnung Pensionsplanung
            </div>
            <h1
              className="text-[44px] font-semibold leading-tight tracking-tight"
              style={{ color: "#0a2540" }}
            >
              {kundeName || "Mandant"}
              {kundeName2 && (
                <>
                  <br />
                  <span className="text-[28px] font-normal" style={{ color: "#4b566b" }}>
                    &amp; {kundeName2}
                  </span>
                </>
              )}
            </h1>
            <div
              className="mt-2 text-base"
              style={{ color: "#4b566b" }}
            >
              {fullState.adresse.gemeindeName ||
                fullState.adresse.ort ||
                fullState.adresse.kanton ||
                "—"}
              {" · "}
              Stand {heuteFormatiert}
            </div>

            {/* Verdict-Box */}
            {verdict.type !== "unbekannt" && (
              <div
                className="mt-8 max-w-md rounded-md border-l-4 p-4 text-left"
                style={{
                  borderColor:
                    verdict.type === "good"
                      ? "#16a34a"
                      : verdict.type === "warn"
                        ? "#ca8a04"
                        : "#dc2626",
                  background:
                    verdict.type === "good"
                      ? "#f0fdf4"
                      : verdict.type === "warn"
                        ? "#fefce8"
                        : "#fef2f2",
                }}
              >
                <div
                  className="text-base font-semibold"
                  style={{
                    color:
                      verdict.type === "good"
                        ? "#15803d"
                        : verdict.type === "warn"
                          ? "#854d0e"
                          : "#991b1b",
                  }}
                >
                  {verdict.titel}
                </div>
                <p
                  className="mt-1 text-sm leading-relaxed"
                  style={{ color: "#4b566b" }}
                >
                  {verdict.text}
                </p>
              </div>
            )}
          </div>

          <footer className="border-t pt-4 text-xs" style={{ borderColor: "#e7eaee", color: "#8390a3" }}>
            <div className="flex justify-between">
              <span>Cuira Partners GmbH — Pensionsplanung</span>
              <span>Vertraulich — nur für den Mandanten</span>
            </div>
          </footer>
        </div>

        {/* ── Seite 2 Start: Header + KPIs + Eckdaten zusammen ── */}
        <div className="page-break-before pt-6">
          <header
            className="mb-5 flex items-start justify-between border-b pb-3"
            style={{ borderColor: "#e7eaee" }}
          >
            <div>
              <Image
                src="/cuira-logo.png"
                alt="Cuira Partners"
                width={100}
                height={40}
                className="h-7 w-auto"
                style={{ filter: "invert(1) brightness(0.2)" }}
              />
            </div>
            <div
              className="text-right text-[10px]"
              style={{ color: "#8390a3" }}
            >
              <div>
                {kundeName}
                {kundeName2 && ` & ${kundeName2}`}
              </div>
              <div>Stand: {heuteFormatiert}</div>
            </div>
          </header>

          {/* KPIs */}
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
                k="Religion"
                v={religionLabel(fullState.budget.religion)}
              />
            </tbody>
          </table>
        </Section>
        </div>

        {/* ── Vermögensentwicklung-Chart (eigene Seite) ───────── */}
        <div className="page-break-before pt-4 chart-section">
          <Section titel="Vermögensentwicklung">
            <div className="chart-wrap">
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
        </div>

        {/* ── Cashflow-Chart (eigene Seite) ───────────────────── */}
        <div className="page-break-before pt-4 chart-section">
          <Section titel="Cashflow Jahr für Jahr">
            <div className="chart-wrap">
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

        {/* ── Steuerentwicklung-Chart (eigene Seite) ──────────── */}
        {cashflow.length > 0 && (
          <div className="page-break-before pt-4 chart-section">
            <Section titel="Steuerentwicklung">
              <div className="chart-wrap chart-wrap--tall">
                <SteuerChart
                  daten={cashflow}
                  pensionsjahr={ordPensionsjahr}
                  wunschPensionsjahr={null}
                  fallart={fullState.fallart}
                />
              </div>
            </Section>
          </div>
        )}

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

        {/* ── Stress-Tests ──────────────────────────────────── */}
        {stressTests.length > 0 && (
          <div className="page-break-before pt-4">
            <Section titel="Stress-Tests — Was wäre wenn?">
              <p className="mb-3 text-xs" style={{ color: "#4b566b" }}>
                Drei realistische Schock-Szenarien und ihre Auswirkung auf das
                Vermögen bei Pension und mit Alter 85 — Vergleich zum aktuellen
                Plan.
              </p>
              <div className="space-y-2">
                {stressTests.map((r) => {
                  const def = STRESS_TESTS.find((s) => s.id === r.id);
                  return (
                    <div
                      key={r.id}
                      className="rounded-md border p-3"
                      style={{
                        borderColor: "#e7eaee",
                        background:
                          r.schwere === "kritisch"
                            ? "#fef2f2"
                            : r.schwere === "mittel"
                              ? "#fefce8"
                              : "#f0fdf4",
                      }}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <strong className="text-sm" style={{ color: "#0a2540" }}>
                          {r.titel}
                        </strong>
                        <span
                          className="text-[10px] font-semibold uppercase tracking-wider"
                          style={{
                            color:
                              r.schwere === "kritisch"
                                ? "#991b1b"
                                : r.schwere === "mittel"
                                  ? "#854d0e"
                                  : "#15803d",
                          }}
                        >
                          {r.schwere === "leicht"
                            ? "tragbar"
                            : r.schwere === "mittel"
                              ? "knapp"
                              : "kritisch"}
                        </span>
                      </div>
                      <p
                        className="mt-1 text-[11px]"
                        style={{ color: "#4b566b" }}
                      >
                        {def?.annahme}
                      </p>
                      <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <div
                            className="text-[9px] uppercase tracking-wider"
                            style={{ color: "#8390a3" }}
                          >
                            Δ bei Pension
                          </div>
                          <div
                            className="font-mono font-semibold tabular-nums"
                            style={{
                              color: r.deltaPension < 0 ? "#dc2626" : "#16a34a",
                            }}
                          >
                            {r.deltaPension > 0 ? "+" : ""}
                            {formatChf(r.deltaPension)}
                          </div>
                        </div>
                        <div>
                          <div
                            className="text-[9px] uppercase tracking-wider"
                            style={{ color: "#8390a3" }}
                          >
                            Δ mit 85
                          </div>
                          <div
                            className="font-mono font-semibold tabular-nums"
                            style={{
                              color: r.delta85 < 0 ? "#dc2626" : "#16a34a",
                            }}
                          >
                            {r.delta85 > 0 ? "+" : ""}
                            {formatChf(r.delta85)}
                          </div>
                        </div>
                        <div>
                          <div
                            className="text-[9px] uppercase tracking-wider"
                            style={{ color: "#8390a3" }}
                          >
                            Vermögen mit 85
                          </div>
                          <div
                            className="font-mono tabular-nums"
                            style={{
                              color: r.mit85 < 0 ? "#dc2626" : "#0a2540",
                            }}
                          >
                            {formatChf(r.mit85)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          </div>
        )}

        {/* ── KI-Empfehlungen (wenn im Dashboard generiert) ──── */}
        {kiMassnahmen && kiMassnahmen.massnahmen.length > 0 && (
          <div className="page-break-before pt-4">
            <Section titel="KI-Empfehlungen">
              <p className="mb-3 text-xs" style={{ color: "#4b566b" }}>
                Personalisierte Optimierungs-Vorschläge — generiert am{" "}
                {new Date(kiMassnahmen.generatedAt).toLocaleDateString(
                  "de-CH",
                  { day: "2-digit", month: "long", year: "numeric" }
                )}{" "}
                von Claude (Anthropic) anhand des aktuellen Plans.
              </p>
              <ul className="space-y-2">
                {kiMassnahmen.massnahmen.map((m, i) => (
                  <li
                    key={i}
                    className="rounded-md border p-3"
                    style={{
                      borderColor: "#e7eaee",
                      background: "#fafbfc",
                    }}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <strong className="text-sm" style={{ color: "#0a2540" }}>
                        {m.titel}
                      </strong>
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wider"
                        style={{
                          color:
                            m.prioritaet === "hoch"
                              ? "#854d0e"
                              : m.prioritaet === "mittel"
                              ? "#1e40af"
                              : "#475569",
                        }}
                      >
                        {m.prioritaet} · {m.kategorie}
                      </span>
                    </div>
                    <p
                      className="mt-1 text-xs leading-relaxed"
                      style={{ color: "#4b566b" }}
                    >
                      {m.begruendung}
                    </p>
                    {m.wirkungChf !== 0 && (
                      <div
                        className="mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs"
                        style={{
                          background: "#f0fdf4",
                          color: "#15803d",
                        }}
                      >
                        <strong>
                          {m.wirkungChf > 0 ? "+" : ""}
                          {formatChf(m.wirkungChf)}
                        </strong>
                        <span>{m.wirkungBeschrieb}</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <p
                className="mt-3 text-[10px] italic"
                style={{ color: "#8390a3" }}
              >
                KI-generiert · keine Rechts- oder Steuerberatung im Sinne von
                Art. 2 RAG. Im Cuira-Termin verfeinert.
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

        {/* ── Berater-Block ───────────────────────────────────── */}
        <div className="page-break-before pt-4">
          <Section titel="Ihr Cuira-Berater">
            <div
              className="rounded-md border p-4"
              style={{
                borderColor: "#0a2540",
                background: "#0a2540",
                color: "white",
              }}
            >
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div
                    className="text-[10px] uppercase tracking-[0.12em]"
                    style={{ color: "#a9b3c1" }}
                  >
                    Berater
                  </div>
                  <div className="mt-1 text-base font-semibold">
                    Kathir Muthukumar
                  </div>
                  <div
                    className="text-[11px]"
                    style={{ color: "#a9b3c1" }}
                  >
                    Senior Pensionsplaner
                  </div>
                </div>
                <div>
                  <div
                    className="text-[10px] uppercase tracking-[0.12em]"
                    style={{ color: "#a9b3c1" }}
                  >
                    Kontakt
                  </div>
                  <div className="mt-1 text-sm">
                    kathir@cuirapartners.ch
                  </div>
                  <div
                    className="text-[11px]"
                    style={{ color: "#a9b3c1" }}
                  >
                    cuirapartners.ch
                  </div>
                </div>
              </div>
              <div
                className="mt-3 border-t pt-3 text-[11px]"
                style={{ borderColor: "#14315a", color: "#a9b3c1" }}
              >
                Diese Auslegeordnung wurde am {heuteFormatiert} erstellt.
                Für die Umsetzung der Empfehlungen, Detail-Berechnungen mit
                Ihrer Pensionskasse und steueroptimale Strukturierung wenden
                Sie sich an Ihren Cuira-Berater.
              </div>
            </div>
          </Section>
        </div>

        {/* ── Footer / Disclaimer ─────────────────────────────── */}
        <footer
          className="mt-12 border-t pt-6 text-xs"
          style={{ borderColor: "#e7eaee", color: "#8390a3" }}
        >
          <p className="mb-2">
            <strong>Disclaimer:</strong> Diese Auslegeordnung basiert auf den
            von Ihnen eingegebenen Daten und Standard-Annahmen (Inflation
            1.5 % p.a., kalk. Hypozins 5 %, ESTV-Tarife 2025/26, BSV-Skala 44).
            Sie ersetzt keine individuelle Steuer- oder Vorsorgeberatung
            i.S.v. Art. 2 RAG. Werte sind Schätzungen, abhängig von zukünftigen
            Gesetzes-, Markt- und Lebenslagen.
          </p>
          <p>
            Cuira Partners GmbH · CH-Schweiz · Stand: {heuteFormatiert}
          </p>
        </footer>
      </article>

      {/* Print-spezifische Styles */}
      <style jsx global>{`
        /* Chart-Wrapper auch am Bildschirm — sonst würde der Chart bei
           langem Inhalt aus dem Container fliessen. */
        .chart-wrap {
          width: 100%;
          height: 380px;
          overflow: hidden;
        }
        /* Steuer-Chart braucht mehr Höhe wegen Legende + Bar-Stack */
        .chart-wrap--tall {
          height: 560px;
        }

        @media print {
          @page {
            size: A4;
            margin: 15mm 15mm 18mm 15mm;
            /* Page-Numbers im Footer rechts */
            @bottom-right {
              content: counter(page) " / " counter(pages);
              font-family: ui-monospace, monospace;
              font-size: 9pt;
              color: #8390a3;
            }
            @bottom-left {
              content: "Cuira Partners GmbH — Pensionsplanung";
              font-size: 8.5pt;
              color: #8390a3;
            }
          }
          /* Cover-Page ohne Footer-Page-Number */
          @page :first {
            margin: 15mm;
            @bottom-right {
              content: "";
            }
            @bottom-left {
              content: "";
            }
          }
          body {
            background: white !important;
            font-size: 10pt;
            line-height: 1.4;
          }
          .page-break-before {
            page-break-before: always;
            break-before: page;
          }
          .cover-page {
            page-break-after: always;
            break-after: page;
            min-height: 240mm;
          }
          /* Chart-Wrapper im Print: feste Höhe, nicht über Seiten brechen */
          .chart-wrap {
            height: 240px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .chart-wrap--tall {
            height: 420px;
          }
          .chart-section {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          /* Charts farbtreu drucken */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Tabellen + Listen nicht über Seitenränder brechen */
          tr,
          li {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          h1,
          h2,
          h3 {
            page-break-after: avoid;
            break-after: avoid;
          }
          /* Recharts auf Bildschirm-Layout zwingen — sonst kollabiert das SVG */
          .recharts-responsive-container,
          .recharts-wrapper,
          .recharts-surface {
            max-height: 100% !important;
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

function religionLabel(r: string): string {
  return (
    {
      katholisch: "Katholisch",
      reformiert: "Reformiert",
      christkatholisch: "Christkatholisch",
      israelitisch: "Israelitisch",
      andere: "Andere",
      keine: "Keine",
    }[r] ?? "—"
  );
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

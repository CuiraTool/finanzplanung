"use client";

/**
 * V3 — Endkunden-Modus.
 *
 * Self-Service-Pensionsplanung für Privatpersonen (B2C-Disruptor gegen
 * VZ Vermögenszentrum bei CHF 300 statt 3'000+).
 *
 * Phasen:
 *  1. Intro — Willkommen + Trust-Signals (Daten bleiben lokal, etc.)
 *  2. Frage-Flow — gleicher Cuira-Frage-Flow wie /erfassung, ohne Berater-Meta
 *  3. Ergebnis — Light-Dashboard mit KPIs + Charts, Inflation-Toggle
 *  4. Pitch — "Lassen Sie sich die Details von einem Cuira-Berater erklären"
 *     mit Calendly-CTA (Stripe-Bezahlung folgt später)
 *
 * Branding: "powered by Cuira" prominent. Trust-Signale: keine Email/PII
 * an Server, alles im Browser. Kein Doc-Upload, kein Import, keine Pro-Tools.
 */

import { useState, useMemo } from "react";
import Image from "next/image";
import { usePlanStore } from "@/lib/store";
import { FlowRenderer } from "@/flow/FlowRenderer";
import { vermoegensbilanz } from "@/engine/vermoegensbilanz";
import { cashflowReihe } from "@/engine/cashflow";
import { pensionsjahr, ORDENTLICHES_AHV_ALTER } from "@/lib/pension";
import { formatChf } from "@/lib/format";
import { useInflation, deflationiereReihe } from "@/lib/inflation";
import { InflationToggle } from "@/components/dashboard/InflationToggle";
import { EinnahmenAusgabenChart } from "@/components/dashboard/EinnahmenAusgabenChart";
import { VermoegensChart } from "@/components/dashboard/VermoegensChart";

const CALENDLY_URL = "https://calendly.com/kathir-cuira/meeting";
const PROJEKTIONS_END_ALTER = 85;

type Phase = "intro" | "flow" | "ergebnis";

export default function KundenPage() {
  const [phase, setPhase] = useState<Phase>("intro");

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <KundenHeader />
      <div className="flex-1">
        {phase === "intro" && <IntroScreen onStart={() => setPhase("flow")} />}
        {phase === "flow" && (
          <div className="bg-white">
            <FlowRenderer mode="v2" onComplete={() => setPhase("ergebnis")} />
          </div>
        )}
        {phase === "ergebnis" && (
          <ErgebnisScreen onBack={() => setPhase("flow")} />
        )}
      </div>
      <footer className="border-t border-slate-200 bg-white px-6 py-3 text-center text-[10px] text-slate-400">
        © Cuira Partners GmbH · {new Date().getFullYear()} · Ihre Daten bleiben
        lokal in Ihrem Browser — wir speichern nichts auf unseren Servern.
      </footer>
    </main>
  );
}

function KundenHeader() {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-[var(--color-cuira-deep)] px-6 py-3 text-white">
      <div className="flex items-center gap-3">
        <Image
          src="/cuira-logo.png"
          alt="Cuira Partners"
          width={120}
          height={48}
          priority
          className="h-8 w-auto"
        />
        <span className="hidden text-[10px] uppercase tracking-[0.2em] text-slate-300 md:block">
          Pensionsplanung
        </span>
      </div>
      <span className="text-[10px] text-slate-300">powered by Cuira</span>
    </header>
  );
}

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 sm:py-24">
      <h1 className="mb-4 text-3xl font-semibold text-slate-900 sm:text-4xl">
        Ihre Pensionsplanung in 15 Minuten
      </h1>
      <p className="mb-8 text-lg text-slate-600">
        In ein paar geführten Fragen erfassen wir alle relevanten Eckdaten.
        Daraus erstellen wir Ihre persönliche Auslegeordnung mit echten
        Schweizer Steuern und Renten — auf den Franken genau für Ihren Kanton
        und Ihre Gemeinde.
      </p>

      <ul className="mb-10 space-y-3">
        <Feature
          icon="🔒"
          title="100 % vertraulich"
          text="Ihre Daten bleiben lokal in Ihrem Browser. Wir senden nichts an unsere Server."
        />
        <Feature
          icon="🎯"
          title="Echte Schweizer Steuern"
          text="ESTV-Tarife für alle 26 Kantone und ~2'500 Gemeinden — kein Pauschalsatz."
        />
        <Feature
          icon="📊"
          title="Live-Auswertung"
          text="Vermögensentwicklung bis zum Pensionsalter, Cashflow Jahr für Jahr, Tragbarkeit."
        />
        <Feature
          icon="🤝"
          title="Optional: Cuira-Beratung"
          text="Wenn Sie tiefer gehen möchten, übergeben wir die Auslegeordnung einem Cuira-Berater (CHF 300 statt 3'000 wie bei VZ)."
        />
      </ul>

      <button
        type="button"
        onClick={onStart}
        className="w-full rounded-md bg-[var(--color-cuira-deep)] px-6 py-4 text-base font-medium text-white shadow-sm transition-opacity hover:opacity-90 sm:w-auto"
      >
        Los geht's →
      </button>
      <p className="mt-3 text-xs text-slate-400">
        Kostenlos · keine Registrierung · keine E-Mail nötig
      </p>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <li className="flex gap-4 rounded-md border border-slate-200 bg-white p-4">
      <span className="text-2xl leading-none">{icon}</span>
      <div>
        <div className="text-sm font-semibold text-slate-800">{title}</div>
        <div className="text-sm text-slate-600">{text}</div>
      </div>
    </li>
  );
}

function ErgebnisScreen({ onBack }: { onBack: () => void }) {
  const fullState = usePlanStore();
  const heutigesJahr = new Date().getFullYear();
  const { enabled: inflationEnabled, rateProzent: inflationRate } =
    useInflation();

  const bilanz = useMemo(() => vermoegensbilanz(fullState), [fullState]);

  const endJahr = useMemo(() => {
    const j1 = chartEndJahr(fullState.person1.geburtsdatum, PROJEKTIONS_END_ALTER);
    if (fullState.fallart === "einzel") return j1 ?? heutigesJahr + 30;
    const j2 = chartEndJahr(fullState.person2.geburtsdatum, PROJEKTIONS_END_ALTER);
    return Math.max(j1 ?? 0, j2 ?? 0) || heutigesJahr + 30;
  }, [fullState, heutigesJahr]);

  const cashflowRaw = useMemo(
    () => cashflowReihe(fullState, heutigesJahr, endJahr),
    [fullState, heutigesJahr, endJahr]
  );
  const cashflow = useMemo(
    () =>
      deflationiereReihe(cashflowRaw, heutigesJahr, inflationRate, inflationEnabled),
    [cashflowRaw, heutigesJahr, inflationRate, inflationEnabled]
  );

  const ordPensionsjahr = useMemo(
    () => pensionsjahr(fullState.person1.geburtsdatum, ORDENTLICHES_AHV_ALTER),
    [fullState.person1.geburtsdatum]
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Ihre Auslegeordnung
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Live-Auswertung Ihrer Eingaben — aktualisiert sich, wenn Sie zurück
            zum Fragebogen gehen und etwas ändern.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <InflationToggle />
          <button
            type="button"
            onClick={() => window.open("/print", "_blank")}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            📄 PDF
          </button>
          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            ← Antworten anpassen
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard
          label="Nettovermögen heute"
          value={formatChf(bilanz.heute)}
        />
        <KpiCard
          label="bei Pensionierung"
          value={formatChf(bilanz.beiPensionierung)}
          hint={
            bilanz.pensionierungsjahr
              ? `Jahr ${bilanz.pensionierungsjahr}`
              : undefined
          }
        />
        <KpiCard
          label="20 Jahre nach Pension"
          value={formatChf(bilanz.zwanzig20JahreSpaeter)}
          hint={
            bilanz.zwanzigJahreReferenzjahr
              ? `Jahr ${bilanz.zwanzigJahreReferenzjahr}`
              : undefined
          }
        />
      </div>

      {/* Charts */}
      <div className="space-y-4">
        {cashflow.length > 0 && (
          <>
            <VermoegensChart
              daten={cashflow}
              datenB={null}
              pensionsjahr={ordPensionsjahr}
              wunschPensionsjahr={null}
              fallart={fullState.fallart}
            />
            <EinnahmenAusgabenChart
              daten={cashflow}
              datenB={null}
              pensionsjahr={ordPensionsjahr}
              wunschPensionsjahr={null}
              fallart={fullState.fallart}
            />
          </>
        )}
      </div>

      {/* Pricing-Pitch */}
      <div className="mt-10 rounded-xl border-2 border-[var(--color-cuira-deep)] bg-gradient-to-br from-[var(--color-cuira-deep)]/5 to-transparent p-6 sm:p-8">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[var(--color-cuira-deep)] px-3 py-1 text-xs font-medium uppercase tracking-wider text-white">
          ✨ Cuira-Beratung
        </div>
        <h2 className="mb-3 text-2xl font-semibold text-slate-900">
          Möchten Sie die Auslegeordnung mit einem Experten vertiefen?
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-slate-600">
          Ein Cuira-Pensionsplanungsexperte analysiert Ihre Auslegeordnung,
          identifiziert Optimierungs-Potenziale (Steuern, PK-Bezug, 3a, Hypothek)
          und erstellt mit Ihnen einen umsetzbaren Plan. Inklusive Folge-Fragen
          per E-Mail bis 30 Tage nach dem Termin.
        </p>

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Vergleich label="Cuira Pensionsplanung" preis="CHF 300" highlight />
          <Vergleich label="VZ Vermögenszentrum" preis="ab CHF 3'000" />
          <Vergleich label="Privatbank-Beratung" preis="ab CHF 5'000" />
        </div>

        <a
          href={CALENDLY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-[var(--color-cuira-deep)] px-6 py-3 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
        >
          📅 Termin mit Cuira buchen
        </a>
        <p className="mt-3 text-xs text-slate-500">
          30 Min. Erstgespräch · Online via Zoom · 100 % unverbindlich
        </p>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-[var(--color-cuira-deep)]">
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

function Vergleich({
  label,
  preis,
  highlight,
}: {
  label: string;
  preis: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-md border p-3 text-center ${
        highlight
          ? "border-[var(--color-cuira-deep)] bg-white shadow-sm"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div
        className={`text-xs ${highlight ? "font-medium text-[var(--color-cuira-deep)]" : "text-slate-500"}`}
      >
        {label}
      </div>
      <div
        className={`mt-1 text-base font-semibold tabular-nums ${highlight ? "text-[var(--color-cuira-deep)]" : "text-slate-700"}`}
      >
        {preis}
      </div>
    </div>
  );
}

function chartEndJahr(geburtsdatum: string, alter: number): number | null {
  if (!geburtsdatum) return null;
  const j = parseInt(geburtsdatum.slice(0, 4), 10);
  if (!Number.isFinite(j)) return null;
  return j + alter;
}

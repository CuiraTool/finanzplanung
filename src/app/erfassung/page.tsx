"use client";

/**
 * V2 — Berater-Erfassungsmodus.
 *
 * Standalone-Route ohne Dashboard und ohne Wizard. Berater geht mit Kunde
 * durch den Frage-Flow. Am Ende: Calendly-Buchung für den Kunden + Email
 * an Cuira mit JSON-Anhang (oder JSON-Download als Fallback).
 *
 * Branding: "powered by Cuira" am Footer, Cuira-Logo im Header.
 */

import { useState } from "react";
import Image from "next/image";
import { usePlanStore } from "@/lib/store";
import { FlowRenderer } from "@/flow/FlowRenderer";
import { BeraterMetaForm } from "@/flow/BeraterMetaForm";
import {
  buildSubmission,
  downloadJson,
  readMeta,
  submitErfassung,
  writeMeta,
} from "@/flow/submission";
import type { BeraterMeta } from "@/flow/types";

const CALENDLY_URL = "https://calendly.com/kathir-cuira/meeting";

type Phase = "intro" | "meta" | "flow" | "review" | "submit" | "fertig";

export default function ErfassungPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [meta, setMeta] = useState<BeraterMeta>(() => readMeta());
  const [submitState, setSubmitState] = useState<{
    loading: boolean;
    emailGesendet: boolean | null;
    error: string | null;
  }>({ loading: false, emailGesendet: null, error: null });

  const planSnapshot = usePlanStore.getState();

  const handleMetaSave = (m: BeraterMeta) => {
    setMeta(m);
    writeMeta(m);
    setPhase("flow");
  };

  const handleFlowComplete = () => setPhase("review");

  const handleSubmit = async () => {
    setSubmitState({ loading: true, emailGesendet: null, error: null });
    const sub = buildSubmission(usePlanStore.getState(), meta);
    const res = await submitErfassung(sub);
    setSubmitState({
      loading: false,
      emailGesendet: res.emailGesendet,
      error: res.error ?? null,
    });
    setPhase("fertig");
  };

  const handleDownloadJson = () => {
    const sub = buildSubmission(usePlanStore.getState(), meta);
    const filename = `cuira-erfassung-${meta.kundeP1Name || "kunde"}-${meta.datum}.json`
      .toLowerCase()
      .replace(/[^a-z0-9.-]+/g, "-");
    downloadJson(sub, filename);
  };

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
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
            Erfassung
          </span>
        </div>
        <span className="text-[10px] text-slate-300">powered by Cuira</span>
      </header>

      <div className="flex-1">
        {phase === "intro" && <IntroScreen onStart={() => setPhase("meta")} />}
        {phase === "meta" && (
          <BeraterMetaForm meta={meta} onSubmit={handleMetaSave} />
        )}
        {phase === "flow" && <FlowRenderer mode="v2" onComplete={handleFlowComplete} />}
        {phase === "review" && (
          <ReviewScreen
            meta={meta}
            plan={planSnapshot}
            onSubmit={handleSubmit}
            onBack={() => setPhase("flow")}
          />
        )}
        {phase === "fertig" && (
          <FertigScreen
            emailGesendet={submitState.emailGesendet}
            error={submitState.error}
            calendlyUrl={CALENDLY_URL}
            onDownload={handleDownloadJson}
          />
        )}
        {submitState.loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="rounded-md bg-white px-6 py-4 text-sm shadow-lg">
              Wird übermittelt …
            </div>
          </div>
        )}
      </div>

      <footer className="border-t border-slate-200 bg-white px-6 py-3 text-center text-[10px] text-slate-400">
        © Cuira Partners GmbH · {new Date().getFullYear()} · Alle Angaben werden
        vertraulich behandelt.
      </footer>
    </main>
  );
}

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="mb-3 text-3xl font-semibold text-slate-900">
        Pensionsplanung — Datenerfassung
      </h1>
      <p className="mb-6 text-slate-600">
        Mit diesem geführten Fragebogen erfassen wir gemeinsam alle relevanten
        Eckdaten für eine fundierte Pensionsplanung. Die Daten werden vertraulich
        behandelt und ausschliesslich für die Auslegeordnung verwendet.
      </p>
      <ul className="mb-8 space-y-2 text-sm text-slate-600">
        <li className="flex gap-2">
          <span className="text-[var(--color-cuira-deep)]">●</span>
          ca. 10–15 Minuten
        </li>
        <li className="flex gap-2">
          <span className="text-[var(--color-cuira-deep)]">●</span>
          Familie, Pensionierung, Vermögen, Vorsorge, Anlagen, Erbschaft, Prioritäten
        </li>
        <li className="flex gap-2">
          <span className="text-[var(--color-cuira-deep)]">●</span>
          Antworten werden lokal gespeichert — Sie können den Flow unterbrechen
          und später fortsetzen
        </li>
      </ul>
      <button
        type="button"
        onClick={onStart}
        className="rounded-md bg-[var(--color-cuira-deep)] px-6 py-3 text-sm font-medium text-white hover:opacity-90"
      >
        Los geht's →
      </button>
    </div>
  );
}

function ReviewScreen({
  meta,
  plan,
  onSubmit,
  onBack,
}: {
  meta: BeraterMeta;
  plan: ReturnType<typeof usePlanStore.getState>;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-3 text-2xl font-semibold text-slate-900">
        Letzte Kontrolle
      </h1>
      <p className="mb-6 text-slate-600">
        Sie haben den Fragebogen durchlaufen. Vor dem Übermitteln können Sie
        nochmals zurück und Antworten anpassen.
      </p>

      <div className="mb-6 rounded-md border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-medium text-slate-700">
          Berater & Auftrag
        </h2>
        <dl className="space-y-1 text-sm">
          <Row k="Berater" v={`${meta.beraterName} (${meta.beraterEmail})`} />
          <Row k="Partnerfirma" v={meta.partnerfirma || "—"} />
          <Row k="Datum" v={meta.datum} />
          <Row k="Auftrag" v={meta.auftrag || "—"} />
          <Row
            k="Kunde"
            v={`${meta.kundeP1Name}${meta.kundeP2Name ? " + " + meta.kundeP2Name : ""}`}
          />
        </dl>
      </div>

      <div className="mb-6 rounded-md border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-medium text-slate-700">
          Übersicht der Antworten
        </h2>
        <dl className="space-y-1 text-sm">
          <Row k="Fallart" v={plan.fallart} />
          <Row k="Zivilstand" v={plan.zivilstand} />
          <Row k="Kanton" v={plan.adresse.kanton || "—"} />
          <Row k="Pension P1 mit" v={`${plan.ziele.bezugsalterP1} J.`} />
          {plan.fallart === "paar" && (
            <Row k="Pension P2 mit" v={`${plan.ziele.bezugsalterP2} J.`} />
          )}
          <Row
            k="Wunschverbrauch"
            v={
              plan.budget.wunschverbrauchPension
                ? `CHF ${plan.budget.wunschverbrauchPension.toLocaleString("de-CH")} / Monat`
                : "—"
            }
          />
          <Row
            k="Brutto-Einkommen"
            v={
              plan.budget.einkommenHeute
                ? `CHF ${plan.budget.einkommenHeute.toLocaleString("de-CH")} / Jahr`
                : "—"
            }
          />
          <Row
            k="Prioritäten"
            v={
              plan.prioritaeten.ausgewaehlt.length > 0
                ? plan.prioritaeten.ausgewaehlt.join(", ")
                : "—"
            }
          />
        </dl>
      </div>

      <div className="flex justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          ← Zurück zum Fragebogen
        </button>
        <button
          type="button"
          onClick={onSubmit}
          className="rounded-md bg-[var(--color-cuira-deep)] px-5 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Übermitteln →
        </button>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 py-0.5">
      <dt className="text-slate-500">{k}</dt>
      <dd className="text-right font-medium text-slate-800">{v}</dd>
    </div>
  );
}

function FertigScreen({
  emailGesendet,
  error,
  calendlyUrl,
  onDownload,
}: {
  emailGesendet: boolean | null;
  error: string | null;
  calendlyUrl: string;
  onDownload: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-center">
      <div className="mb-4 text-4xl">✓</div>
      <h1 className="mb-3 text-2xl font-semibold text-slate-900">
        Vielen Dank — die Daten sind erfasst!
      </h1>
      <p className="mb-8 text-slate-600">
        {emailGesendet === true
          ? "Cuira wurde automatisch benachrichtigt und meldet sich in Kürze."
          : "Bitte laden Sie das JSON herunter und senden Sie es an Kathir."}
      </p>

      {error && (
        <div className="mx-auto mb-6 max-w-md rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-left text-xs text-amber-800">
          <strong>Hinweis:</strong> {error}
        </div>
      )}

      <div className="mb-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <a
          href={calendlyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-[var(--color-cuira-deep)] px-6 py-3 text-sm font-medium text-white hover:opacity-90"
        >
          📅 Termin mit Cuira buchen
        </a>
        <button
          type="button"
          onClick={onDownload}
          className="rounded-md border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ⬇ JSON herunterladen
        </button>
      </div>

      <p className="text-xs text-slate-500">
        Die Daten bleiben lokal in Ihrem Browser gespeichert. Sie können den
        Tab schliessen.
      </p>
    </div>
  );
}

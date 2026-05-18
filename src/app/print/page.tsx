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
import { generiereNarrativ } from "@/engine/narrativ";
import { useBeraterProfil } from "@/lib/berater-profil";
import { usePdfMassnahmen } from "@/lib/pdf-massnahmen-selection";
import {
  usePdfCustomization,
  applyOrder,
} from "@/lib/pdf-customization";
import { SectionCustomizer } from "@/components/print/SectionCustomizer";

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
import { SteuerDetailCard } from "@/components/dashboard/SteuerDetailCard";
import { SankeyChart } from "@/components/dashboard/SankeyChart";
import { DreiSaeulenKpi } from "@/components/dashboard/DreiSaeulenKpi";
import { HinterlassenenCard } from "@/components/dashboard/HinterlassenenCard";
import { MassnahmenTabelle } from "@/components/dashboard/MassnahmenListe";
import { DetailLiquiditaetTable } from "@/components/dashboard/DetailLiquiditaetTable";
import {
  extractVariantFromState,
  kpisFuerVariant,
} from "@/components/dashboard/VarianteDeltaPanel";
import {
  sammleDiffs,
  gruppiereNachBlock,
} from "@/components/dashboard/VarianteDiffModal";
import { checkePlan } from "@/lib/plausibility";
import type { PlanSlot } from "@/lib/store";

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
  const { profil: beraterProfil } = useBeraterProfil();

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

  const allMassnahmen = useMemo(() => massnahmenAusState(fullState), [fullState]);
  const { selectedIds: pdfMassnSelIds, maxTop: pdfMaxTop } = usePdfMassnahmen();
  const { sections: pdfCustom } = usePdfCustomization();
  // PDF zeigt nur User-Selektion (leer = alle). maxTop für Exec-Summary.
  // Plus: SectionCustomizer-Hide-Liste + Reihenfolge + Inhalts-Edits.
  const massnahmenSelected = useMemo(() => {
    if (pdfMassnSelIds.length === 0) return allMassnahmen;
    return allMassnahmen.filter((m) => pdfMassnSelIds.includes(m.id));
  }, [allMassnahmen, pdfMassnSelIds]);
  const massnahmen = useMemo(() => {
    const cfg = pdfCustom.massnahmen;
    let list = massnahmenSelected;
    if (cfg.hiddenIds.length > 0) {
      list = list.filter((m) => !cfg.hiddenIds.includes(m.id));
    }
    if (cfg.orderIds.length > 0) {
      list = applyOrder(list, cfg.orderIds);
    }
    return list.map((m) => {
      const edit = cfg.edits[m.id];
      if (!edit) return m;
      return {
        ...m,
        titel: edit.titel ?? m.titel,
        detail: edit.text ?? m.detail,
      };
    });
  }, [massnahmenSelected, pdfCustom.massnahmen]);
  const optimierungen = useMemo(() => {
    const cfg = pdfCustom.optimierungen;
    let list = massnahmen.filter((m) => m.kategorie === "optimierung");
    if (cfg.hiddenIds.length > 0) {
      list = list.filter((m) => !cfg.hiddenIds.includes(m.id));
    }
    if (cfg.orderIds.length > 0) list = applyOrder(list, cfg.orderIds);
    return list.map((m) => {
      const edit = cfg.edits[m.id];
      if (!edit) return m;
      return {
        ...m,
        titel: edit.titel ?? m.titel,
        detail: edit.text ?? m.detail,
      };
    });
  }, [massnahmen, pdfCustom.optimierungen]);
  const reminder = massnahmen.filter((m) => m.kategorie !== "optimierung");

  // Detail-Liquidität: Default-On (E2-5 / Y-3-Audit), kann via Dashboard
  // ausgeschaltet werden. Bei explizitem "0" deaktivieren.
  const [showDetailLiq, setShowDetailLiq] = useState(true);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = window.localStorage.getItem("cuira-show-detail-liq");
    setShowDetailLiq(v !== "0"); // default = on, nur explizit "0" off
  }, []);

  // PDF-Profile: Kurz / Vollständig (Standard entfernt — User-Wunsch)
  type PdfProfile = "kurz" | "voll";
  const [pdfProfile, setPdfProfile] = useState<PdfProfile>("kurz");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("cuira-pdf-profile");
    // Migration: "standard" → "kurz" (häufigste Praxis-Wahl)
    if (stored === "kurz" || stored === "standard") setPdfProfile("kurz");
    else if (stored === "voll") setPdfProfile("voll");
  }, []);
  const setPdfProfileAndStore = (p: PdfProfile) => {
    setPdfProfile(p);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("cuira-pdf-profile", p);
    }
  };

  // Section-Sichtbarkeit pro Profil.
  // Kurz = pragmatischer Berater-Output: Cover + Bilanz + Säulen + Cashflow
  //        + Vermögen + Tragbarkeit + Massnahmen + Optimierungen + KI + Berater.
  //        Stresstests, Detail-Liq und Jahres-Tabellen ausgeblendet.
  // Voll  = alle Sektionen inkl. Stress + Detail-Liq + Jahres-Tabellen.
  const showInProfile = (key:
    | "bilanz" | "drei-saeulen" | "hinterlassen" | "vermoegens-chart"
    | "cashflow-chart" | "detail-liq" | "sankey" | "steuer-chart"
    | "tragbarkeit" | "stress" | "ki" | "optimierungen" | "reminder"
    | "berater" | "plausi" | "varianten-diff" | "narrativ" | "jahres-tabellen"): boolean => {
    if (pdfProfile === "voll") return true;
    // kurz: ausgeblendet sind Stress, Detail-Liq, Jahres-Tabellen
    if (key === "detail-liq" || key === "stress" || key === "jahres-tabellen") return false;
    return true;
  };

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

  // KI-Massnahmen mit synthetischen IDs für Customizer
  const kiItemsRaw = useMemo(() => {
    if (!kiMassnahmen) return [];
    return kiMassnahmen.massnahmen.map((m, i) => ({
      ...m,
      id: `ki-${i}`,
    }));
  }, [kiMassnahmen]);
  const kiItems = useMemo(() => {
    const cfg = pdfCustom.ki;
    let list = kiItemsRaw;
    if (cfg.hiddenIds.length > 0) {
      list = list.filter((m) => !cfg.hiddenIds.includes(m.id));
    }
    if (cfg.orderIds.length > 0) list = applyOrder(list, cfg.orderIds);
    return list.map((m) => {
      const edit = cfg.edits[m.id];
      if (!edit) return m;
      return {
        ...m,
        titel: edit.titel ?? m.titel,
        begruendung: edit.text ?? m.begruendung,
      };
    });
  }, [kiItemsRaw, pdfCustom.ki]);

  // Stress-Tests (nur wenn genug Daten erfasst)
  const hatStressBasis =
    !!fullState.person1.geburtsdatum &&
    (fullState.vermoegen.items.some((it) => (it.saldoHeute ?? 0) > 0) ||
      (fullState.bvg.p1.altersguthabenHeute ?? 0) > 0);
  const stressTestsRaw = useMemo(
    () => (hatStressBasis ? runAllStressTests(fullState) : []),
    [fullState, hatStressBasis]
  );
  const stressTests = useMemo(() => {
    const cfg = pdfCustom.stress;
    let list = stressTestsRaw;
    if (cfg.hiddenIds.length > 0) {
      list = list.filter((s) => !cfg.hiddenIds.includes(s.id));
    }
    if (cfg.orderIds.length > 0) list = applyOrder(list, cfg.orderIds);
    return list.map((s) => {
      const edit = cfg.edits[s.id];
      if (!edit) return s;
      return {
        ...s,
        titel: edit.titel ?? s.titel,
      };
    });
  }, [stressTestsRaw, pdfCustom.stress]);

  /** Lookup beschreibung for stress test ID (für Customizer-UI). */
  const stressDescription = (id: string): string =>
    STRESS_TESTS.find((s) => s.id === id)?.beschreibung ?? "";

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

  // ── Δ-Vergleich Plan A/B/C — nur wenn ≥1 Vergleichs-Slot existiert ──
  const vergleichsSlots = useMemo<PlanSlot[]>(() => {
    const out: PlanSlot[] = [];
    if (fullState.aktiverPlan !== "a") out.push("a");
    if (fullState.aktiverPlan !== "b" && fullState.plaene.b) out.push("b");
    if (fullState.aktiverPlan !== "c" && fullState.plaene.c) out.push("c");
    return out;
  }, [fullState.aktiverPlan, fullState.plaene.b, fullState.plaene.c]);

  const aktiveVariant = useMemo(
    () => extractVariantFromState(fullState),
    [fullState]
  );
  const aktivKpisDelta = useMemo(
    () => kpisFuerVariant(aktiveVariant, fullState, heutigesJahr, endJahr),
    [aktiveVariant, fullState, heutigesJahr, endJahr]
  );

  // ── Plausibilitäts-Hinweise ──
  const plausiHinweise = useMemo(() => checkePlan(fullState), [fullState]);

  const kundeName = `${fullState.person1.vorname} ${fullState.person1.nachname}`.trim();
  const kundeName2 =
    fullState.fallart === "paar"
      ? `${fullState.person2.vorname} ${fullState.person2.nachname}`.trim()
      : "";

  return (
    <main className="bg-white print:bg-white">
      {/* Toolbar nur am Bildschirm sichtbar */}
      <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3 text-sm shadow-sm print:hidden">
        <div className="text-slate-600">
          📄 Druckversion — Cmd/Ctrl+P · Im Druck-Dialog "Kopf- und Fusszeilen" deaktivieren für sauberes PDF
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-0.5 text-xs">
            <span className="px-2 text-slate-500">Profil:</span>
            {(["kurz", "voll"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPdfProfileAndStore(p)}
                className={`rounded px-2.5 py-1 transition ${
                  pdfProfile === p
                    ? "bg-[var(--color-cuira-deep)] text-white"
                    : "text-slate-600 hover:bg-white"
                }`}
                title={
                  p === "kurz"
                    ? "Berater-Output ohne Stress-Tests, Detail-Liquidität und Jahres-Tabellen (≈10 Seiten)"
                    : "Alle Sektionen inkl. Stress-Tests + Detail-Liq + Jahres-Tabellen (≈22 Seiten)"
                }
              >
                {p === "kurz" ? "Kurz" : "Vollständig"}
              </button>
            ))}
          </div>
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

      {/* ── Section-Customizer-Leiste (nur am Bildschirm) ── */}
      <div className="border-b border-slate-100 bg-slate-50 px-6 py-2 print:hidden">
        <div className="mb-1 text-[11px] font-medium text-slate-500">
          Sektionen anpassen — Sichtbarkeit, Reihenfolge, Titel + Text
        </div>
        <div className="flex flex-wrap gap-2">
          <SectionCustomizer
            section="massnahmen"
            sectionLabel="Massnahmen"
            items={massnahmenSelected.map((m) => ({
              id: m.id,
              titel: m.titel,
              text: m.detail ?? "",
            }))}
          />
          <SectionCustomizer
            section="optimierungen"
            sectionLabel="Optimierungen"
            items={massnahmen
              .filter((m) => m.kategorie === "optimierung")
              .map((m) => ({
                id: m.id,
                titel: m.titel,
                text: m.detail ?? "",
              }))}
          />
          <SectionCustomizer
            section="stress"
            sectionLabel="Stress-Tests"
            items={stressTestsRaw.map((s) => ({
              id: s.id,
              titel: s.titel,
              text: stressDescription(s.id),
            }))}
          />
          <SectionCustomizer
            section="ki"
            sectionLabel="KI-Empfehlungen"
            items={kiItemsRaw.map((m) => ({
              id: m.id,
              titel: m.titel,
              text: m.begruendung,
            }))}
          />
        </div>
      </div>

      <article className="mx-auto max-w-[210mm] px-8 py-10 text-slate-800 print:px-0 print:py-0">
        {/* ── Cover-Seite (eigene Seite) ──────────────────────── */}
        <div className="cover-page flex h-[260mm] flex-col justify-between print:h-[260mm]">
          <header className="border-b-2 pb-6" style={{ borderColor: "#0a2540" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/cuira-logo.png"
              alt="Cuira Partners"
              className="mb-2"
              style={{
                height: "56px",
                width: "auto",
                printColorAdjust: "exact",
                WebkitPrintColorAdjust: "exact",
              } as React.CSSProperties}
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
              className="text-[40px] font-semibold leading-tight tracking-tight"
              style={{ color: "#0a2540" }}
            >
              {kundeName || "Mandant"}
              {kundeName2 && (
                <>
                  <br />
                  <span className="text-[40px] font-semibold" style={{ color: "#0a2540" }}>
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

            {/* Verdict-Box (Tiago-Fix: ausgeblendet — Mandant entscheidet selbst über "gut/knapp/kritisch"). */}
          </div>

          <footer className="border-t pt-4 text-xs" style={{ borderColor: "#e7eaee", color: "#8390a3" }}>
            <div className="flex justify-between">
              <span>Cuira Partners GmbH — Pensionsplanung</span>
              <span>Vertraulich — nur für den Mandanten</span>
            </div>
          </footer>
        </div>

        {/* ── Executive Summary (Kurz-Profil: nach Cover) ──────── */}
        {cashflow.length > 0 && (
          <div className="page-break-before pt-6">
            <Section titel="Executive Summary">
              <ExecutiveSummary
                verdict={verdict}
                cashflow={cashflow}
                massnahmen={optimierungen.slice(0, pdfMaxTop)}
                fullState={fullState}
                ordPensionsjahr={ordPensionsjahr}
              />
            </Section>
          </div>
        )}

        {/* ── Narrativ "Was passiert in Ihrer Planung?" (soft break) ── */}
        {showInProfile("narrativ") && cashflow.length > 0 && (
          <div className="page-break-soft pt-4">
            <Section titel="Was passiert in Ihrer Planung?">
              <p className="mb-3 text-xs" style={{ color: "#4b566b" }}>
                Klartext-Beschreibung der finanziellen Entwicklung — Schritt
                für Schritt.
              </p>
              <NarrativListe
                items={generiereNarrativ(fullState, cashflow, ordPensionsjahr)}
              />
            </Section>
          </div>
        )}

        {/* ── Plan-Varianten Δ-Vergleich (eigene Seite, nur wenn ≥1 Vergleich) ── */}
        {showInProfile("varianten-diff") && vergleichsSlots.length > 0 && (
          <div className="page-break-before pt-6">
            <header
              className="mb-5 flex items-start justify-between border-b pb-3"
              style={{ borderColor: "#e7eaee" }}
            >
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/cuira-logo.png"
                  alt="Cuira Partners"
                  style={{
                    height: "28px",
                    width: "auto",
                    printColorAdjust: "exact",
                    WebkitPrintColorAdjust: "exact",
                  } as React.CSSProperties}
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
            <Section titel={`Plan-Varianten — Vergleich (aktiv: Plan ${fullState.aktiverPlan.toUpperCase()})`}>
              <p className="mb-3 text-xs" style={{ color: "#4b566b" }}>
                Gegenüberstellung des aktiven Plans mit den hinterlegten
                Vergleichsvarianten. Δ zeigt den Unterschied zugunsten (grün)
                oder zuungunsten (gelb) des aktiven Plans.
              </p>
              {vergleichsSlots.map((slot) => {
                const variant = fullState.plaene[slot];
                if (!variant) return null;
                const vKpis = kpisFuerVariant(
                  variant,
                  fullState,
                  heutigesJahr,
                  endJahr
                );
                const diffs = sammleDiffs(aktiveVariant, variant);
                const diffsGruppiert = gruppiereNachBlock(diffs);
                return (
                  <VarianteVergleichBlock
                    key={slot}
                    aktivSlot={fullState.aktiverPlan}
                    vergleichSlot={slot}
                    aktivKpis={aktivKpisDelta}
                    vergleichKpis={vKpis}
                    diffsGruppiert={diffsGruppiert}
                  />
                );
              })}
            </Section>
          </div>
        )}

        {/* ── Seite 2 Start: Header + KPIs + Eckdaten zusammen ── */}
        <div className="page-break-before pt-6">
          <header
            className="mb-5 flex items-start justify-between border-b pb-3"
            style={{ borderColor: "#e7eaee" }}
          >
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/cuira-logo.png"
                alt="Cuira Partners"
                style={{
                  height: "28px",
                  width: "auto",
                  printColorAdjust: "exact",
                  WebkitPrintColorAdjust: "exact",
                } as React.CSSProperties}
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

        {/* ── Aktiva/Passiva-Bilanz (Tiago-Fix: kompakter — soft break) ──── */}
        {showInProfile("bilanz") && cashflow.length > 0 && (
          <div className="page-break-soft pt-4 print-bilanz">
            <Section titel="Vermögensbilanz heute">
              <p className="mb-3 text-xs" style={{ color: "#4b566b" }}>
                Aufschlüsselung der Aktiva nach Vermögensklasse und Schulden —
                hilft Klumpen-Risiken (z.B. Eigenheim &gt; 50 %) und Liquiditäts-
                Engpässe sofort zu erkennen.
              </p>
              <BilanzDonut zeile={cashflow[0]!} />
            </Section>
          </div>
        )}

        {/* ── 3-Säulen-Übersicht (soft break) ─────────── */}
        {showInProfile("drei-saeulen") && (
          <div className="page-break-soft pt-4 print-drei-saeulen">
            <Section titel="3-Säulen-Übersicht bei Pensionierung">
              <DreiSaeulenKpi />
            </Section>
          </div>
        )}

        {/* ── Hinterlassenen-Leistungen (soft break, nur bei Paar) ── */}
        {showInProfile("hinterlassen") && fullState.fallart === "paar" && (
          <div className="page-break-soft pt-4 print-hinterlassenen">
            <Section titel="Hinterlassenen-Leistungen">
              <p className="mb-3 text-xs" style={{ color: "#4b566b" }}>
                Was bekommt der überlebende Partner bei Tod der anderen Person —
                AHV + BVG + Waisenrenten.
              </p>
              <HinterlassenenCard />
            </Section>
          </div>
        )}

        {/* ── Vermögensentwicklung-Chart (eigene Seite) ───────── */}
        {showInProfile("vermoegens-chart") && (
          <div className="page-break-before pt-4 chart-section">
            <Section titel="Vermögensentwicklung">
              <div className="chart-wrap chart-wrap--tall">
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
        )}

        {/* ── Cashflow-Chart (eigene Seite) ───────────────────── */}
        {showInProfile("cashflow-chart") && (
          <div className="page-break-before pt-4 chart-section">
            <Section titel="Cashflow Jahr für Jahr">
              <div className="chart-wrap chart-wrap--tall">
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
        )}

        {/* ── Detail-Liquidität pro Jahr — User-Toggle + Profil ── */}
        {showInProfile("detail-liq") && showDetailLiq && cashflow.length > 0 && (
          <div className="page-break-before pt-4 print-detail-liq">
            <Section titel="Detail-Liquidität pro Jahr">
              <p className="mb-2 text-xs" style={{ color: "#4b566b" }}>
                Vollständige Jahres-Aufstellung — Einnahmen-Splits (Erwerb netto,
                AHV, BVG-Rente, Mieten) gegenüber Ausgaben-Splits (Lebenshaltung,
                Wohnen+Zinsen, Steuern, Kapitalsteuern, 3a/Vorsorge), Saldo und
                Vermögens-Komponenten zum Jahresende.
              </p>
              <DetailLiquiditaetTable daten={cashflow} printMode />
            </Section>
          </div>
        )}

        {/* ── Geldfluss-Diagramme (heute + Pension) ────────── */}
        {showInProfile("sankey") && cashflow.length > 0 && (
          <div className="page-break-before pt-4">
            <Section titel="Geldfluss-Diagramme">
              <p className="mb-3 text-xs" style={{ color: "#4b566b" }}>
                Sankey-Visualisierung der Einnahme-Quellen, Ausgabe-Ziele
                und Sparquote — Bandbreite proportional zum CHF-Betrag.
              </p>
              <div className="chart-sankey">
                <SankeyChart
                  cashflow={cashflow}
                  jahrFix={heutigesJahr}
                  hoehe={320}
                  bare
                />
              </div>
              {ordPensionsjahr &&
                ordPensionsjahr !== heutigesJahr &&
                cashflow.find((z) => z.jahr === ordPensionsjahr) && (
                  <div className="chart-sankey mt-6">
                    <SankeyChart
                      cashflow={cashflow}
                      jahrFix={ordPensionsjahr}
                      hoehe={320}
                      bare
                    />
                  </div>
                )}
            </Section>
          </div>
        )}

        {/* ── Jahres-Tabellen (Vermögen + Steuern) (E2-5) ────── */}
        {showInProfile("jahres-tabellen") && cashflow.length > 0 && (
          <div className="page-break-before pt-4">
            <Section titel="Vermögensentwicklung pro Jahr">
              <p className="mb-2 text-xs" style={{ color: "#4b566b" }}>
                Aufschlüsselung nach Vermögensklasse — kompakte Übersicht der
                gesamten Projektion.
              </p>
              <VermoegensJahresTabelle cashflow={cashflow} />
            </Section>
            <div className="mt-6">
              <Section titel="Steuern pro Jahr">
                <p className="mb-2 text-xs" style={{ color: "#4b566b" }}>
                  Einkommen + Vermögen + Kapital-Auszahlungs-Steuer pro Jahr.
                </p>
                <SteuerJahresTabelle cashflow={cashflow} />
              </Section>
            </div>
          </div>
        )}

        {/* ── Steuerentwicklung-Chart + Detail-Card (eigene Seite) ──── */}
        {showInProfile("steuer-chart") && cashflow.length > 0 && (
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
              <div className="mt-4 print-steuer-detail">
                <SteuerDetailCard cashflow={cashflow} />
              </div>
            </Section>
          </div>
        )}

        {/* ── Reform-Hinweis bei Eigenheim ───────────────────── */}
        {fullState.immobilien.items.some(
          (i) => i.typ === "selbstbewohnt"
        ) && (
          <div
            className="mt-4 rounded-md border px-3 py-2 text-xs leading-relaxed"
            style={{
              borderColor: "#fcd34d",
              background: "#fffbeb",
              color: "#78350f",
            }}
          >
            <strong>Reform 2030 — Eigenmietwert &amp; Schuldzinsabzug.</strong>{" "}
            In den Steuerjahren bis und mit <strong>2029</strong> wirken in
            dieser Auslegeordnung der Eigenmietwert (Default 1.13 % vom Verkehrs-
            wert) als Plus zum steuerbaren Einkommen sowie die Hypothek-Schuld-
            zinsen als Abzug. Ab Steuerjahr <strong>2030</strong> entfällt beides
            automatisch — die Volksabstimmung vom Sept. 2025 hat die Reform
            angenommen.
          </div>
        )}

        {/* ── Tragbarkeit (soft break) ────────────── */}
        {showInProfile("tragbarkeit") && (tragbarkeitHeute || tragbarkeitPension) && (
          <div className="page-break-soft pt-4">
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
        {showInProfile("stress") && stressTests.length > 0 && (
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
        {showInProfile("ki") && kiMassnahmen && kiItems.length > 0 && (
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
                {kiItems.map((m, i) => (
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

        {/* ── Optimierungs-Massnahmen (soft break) ─────────── */}
        {showInProfile("optimierungen") && optimierungen.length > 0 && (
          <div className="page-break-soft pt-4">
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

        {/* ── Termine — SSM-Style 3-Spalten Tabelle ─────────────── */}
        {showInProfile("reminder") && reminder.length > 0 && (
          <Section titel="Termine & Reminder">
            <p className="mb-2 text-xs" style={{ color: "#4b566b" }}>
              Chronologische Liste — Wann / Wer / Was. Konkrete Zeitpunkte für
              Einzahlungen, Bezüge, AHV-Anmeldung und Hypothek-Verlängerungen.
            </p>
            <MassnahmenTabelle
              massnahmen={reminder}
              vornameP1={fullState.person1.vorname}
              vornameP2={
                fullState.fallart === "paar"
                  ? fullState.person2.vorname
                  : undefined
              }
              fallart={fullState.fallart}
              printMode
            />
          </Section>
        )}

        {/* ── Berater-Block ───────────────────────────────────── */}
        {showInProfile("berater") && (
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
              <div className="flex items-start gap-4">
                {/* Foto oder Initialen-Avatar */}
                <div
                  className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2"
                  style={{
                    borderColor: "#14315a",
                    background: "#14315a",
                  }}
                  aria-hidden
                >
                  {beraterProfil.fotoBase64 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={beraterProfil.fotoBase64}
                      alt={`Foto ${beraterProfil.name}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-semibold text-white">
                      {beraterProfil.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="grid flex-1 grid-cols-2 gap-4 text-sm">
                  <div>
                    <div
                      className="text-[10px] uppercase tracking-[0.12em]"
                      style={{ color: "#a9b3c1" }}
                    >
                      Berater
                    </div>
                    <div className="mt-1 text-base font-semibold">
                      {beraterProfil.name}
                    </div>
                    <div className="text-[11px]" style={{ color: "#a9b3c1" }}>
                      {beraterProfil.rolle}
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-[10px] uppercase tracking-[0.12em]"
                      style={{ color: "#a9b3c1" }}
                    >
                      Kontakt
                    </div>
                    <div className="mt-1 text-sm">{beraterProfil.email}</div>
                    {beraterProfil.telefon && (
                      <div className="text-[11px]" style={{ color: "#a9b3c1" }}>
                        {beraterProfil.telefon}
                      </div>
                    )}
                    {beraterProfil.office && (
                      <div className="text-[11px]" style={{ color: "#a9b3c1" }}>
                        {beraterProfil.office}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {beraterProfil.kalenderUrl && (
                <div
                  className="mt-3 border-t pt-3 text-[11px]"
                  style={{ borderColor: "#14315a", color: "#a9b3c1" }}
                >
                  Termin buchen:{" "}
                  <a
                    href={beraterProfil.kalenderUrl}
                    className="underline"
                    style={{ color: "white" }}
                  >
                    {beraterProfil.kalenderUrl}
                  </a>
                </div>
              )}

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
        )}

        {/* ── Plausibilitäts-Hinweise (wenn vorhanden) ──────────── */}
        {showInProfile("plausi") && plausiHinweise.length > 0 && (
          <div className="mt-8 print-plausi">
            <div
              className="rounded-md border p-3"
              style={{
                borderColor: "#fcd34d",
                background: "#fffbeb",
              }}
            >
              <div className="mb-2 flex items-baseline justify-between">
                <strong className="text-sm" style={{ color: "#854d0e" }}>
                  Plausibilitäts-Hinweise
                </strong>
                <span className="text-[10px]" style={{ color: "#854d0e" }}>
                  {plausiHinweise.length} Hinweise · vor Versand prüfen
                </span>
              </div>
              <ul className="space-y-1">
                {plausiHinweise.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-start gap-2 text-[11px]"
                    style={{
                      color:
                        h.schwere === "fehler"
                          ? "#991b1b"
                          : h.schwere === "warnung"
                            ? "#854d0e"
                            : "#475569",
                    }}
                  >
                    <span
                      className="mt-0.5 shrink-0 rounded-sm px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider"
                      style={{
                        background:
                          h.schwere === "fehler"
                            ? "#fee2e2"
                            : h.schwere === "warnung"
                              ? "#fef3c7"
                              : "#e2e8f0",
                        color:
                          h.schwere === "fehler"
                            ? "#991b1b"
                            : h.schwere === "warnung"
                              ? "#854d0e"
                              : "#475569",
                      }}
                    >
                      {h.schwere}
                    </span>
                    <span className="flex-1">
                      <span
                        className="font-medium"
                        style={{ color: "#475569" }}
                      >
                        Block {h.block}:
                      </span>{" "}
                      {h.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ── Footer / Disclaimer ─────────────────────────────── */}
        <footer
          className="mt-12 border-t pt-6 text-xs leading-relaxed"
          style={{ borderColor: "#e7eaee", color: "#8390a3" }}
        >
          <p className="mb-2">
            <strong>Grundlage und Datenquellen.</strong> Diese Auslegeordnung
            basiert auf den durch den Mandanten erfassten Angaben sowie auf
            öffentlich zugänglichen Daten der Eidgenössischen Steuerverwaltung
            (ESTV-Tarife 2025/26), des Bundesamtes für Sozialversicherungen
            (BSV-Skala 44, Stand AHV21) und der kantonalen Steuerverwaltungen.
            Standard-Annahmen: Inflation 1.5 % p.a., kalkulatorischer Hypozins
            5 %, Verkehrswertsteigerung 1.5 % p.a. (anpassbar).
          </p>
          <p className="mb-2">
            <strong>Eigenmietwert &amp; Schuldzinsabzug.</strong> Die Engine
            modelliert Eigenmietwert (Default 1.13 % vom Verkehrswert) und den
            Schuldzinsabzug bei selbstbewohnten Liegenschaften nur bis und mit
            Steuerjahr 2029. Ab Steuerjahr 2030 entfällt beides aufgrund der
            Reform 2030 (Volksabstimmung Sept 2025 angenommen) — die Auslegeordnung
            spiegelt diese Rechtslage automatisch wider.
          </p>
          <p className="mb-2">
            <strong>Keine Beratung im engeren Sinn.</strong> Diese
            Planungsgrundlage ist eine indikative Auslegeordnung und ersetzt
            keine individuelle, persönlich erteilte Steuer-, Vorsorge-,
            Rechts- oder Anlageberatung. Sie stellt insbesondere keine
            Anlageberatung oder Vermögensverwaltung im Sinne des
            Finanzdienstleistungsgesetzes (FIDLEG) dar. Veränderungen der
            Gesetzgebung, der Markt- oder Lebenssituation können die
            Resultate beeinflussen. Für die konkrete Umsetzung — insbesondere
            PK-Einkäufe, Bezugsstrategien, Liegenschaftstransaktionen und
            Steueroptimierungen — ist eine individuelle Beratung durch den
            Cuira-Berater zwingend.
          </p>
          <p className="mb-2">
            <strong>Haftungsausschluss (Art. 100 / 101 OR).</strong> Soweit
            gesetzlich zulässig wird jede Haftung der Cuira Partners GmbH und
            ihrer Mitarbeitenden, beauftragten Hilfspersonen (Art. 101 OR)
            sowie allfälliger Lizenz- und Kooperationspartner für Schäden aus
            leichter Fahrlässigkeit ausgeschlossen. Für rechtswidrige Absicht
            oder grobe Fahrlässigkeit bleibt die Haftung gemäss Art. 100
            Abs. 1 OR (zwingende Norm) unverändert bestehen. Bei beruflicher
            Tätigkeit kann die Haftung für leichte Fahrlässigkeit nach Art.
            100 Abs. 2 OR durch das Gericht im Einzelfall beurteilt werden.
            Die Cuira Partners GmbH übernimmt insbesondere keine Gewähr für
            die Vollständigkeit und Richtigkeit der vom Mandanten gelieferten
            Daten sowie für Entscheide, die der Mandant gestützt auf diese
            Auslegeordnung ohne individuelle Beratung trifft.
          </p>
          <p className="mb-2">
            <strong>Datenschutz.</strong> Die im Tool erfassten Daten werden
            gemäss dem revidierten Bundesgesetz über den Datenschutz (DSG,
            Stand 1.9.2023) verarbeitet. Server-Standort: Schweiz oder
            EU (Frankfurt). Keine Weitergabe an Dritte ohne ausdrückliche
            Einwilligung. Aufbewahrungsfrist: Personendaten nach Art. 6 Abs. 4
            revDSG (Verhältnismässigkeit) i.V.m. Art. 127 OR (Allgemeine
            Verjährungsfrist 10 Jahre) — danach Löschung oder Anonymisierung.
          </p>
          <p>
            Cuira Partners GmbH · Splügenstrasse 11, 8002 Zürich · CH-Schweiz · Stand: {heuteFormatiert}
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
          overflow: visible;
        }
        /* Alle Charts mit "tall" — Bar-Stacks + Legende + Achsen brauchen
           mind. 560px sonst werden Bars zu kurz, Beschriftungen schneiden ab. */
        .chart-wrap--tall {
          height: 560px;
        }
        /* Recharts-Container füllt chart-wrap komplett aus */
        .chart-wrap .recharts-responsive-container {
          height: 100% !important;
          width: 100% !important;
        }

        @media print {
          @page {
            size: A4;
            margin: 15mm 15mm 18mm 15mm;
            /* Tiago-Fix: Browser-Headers (Datum/Zeit/URL) leeren */
            @top-left { content: ""; }
            @top-center { content: ""; }
            @top-right { content: ""; }
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
            @bottom-center { content: ""; }
          }
          /* Cover-Page ohne Footer-Page-Number */
          @page :first {
            margin: 15mm;
            @top-left { content: ""; }
            @top-center { content: ""; }
            @top-right { content: ""; }
            @bottom-right { content: ""; }
            @bottom-left { content: ""; }
            @bottom-center { content: ""; }
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
          /* Tiago-Fix: "soft" break — Sections kombinieren bis Seite voll.
             Browser entscheidet automatisch wann Umbruch. */
          .page-break-soft {
            page-break-before: auto;
            break-before: auto;
            break-inside: avoid;
            margin-top: 18mm;
          }
          .page-break-soft:first-of-type {
            margin-top: 0;
          }
          .cover-page {
            page-break-after: always;
            break-after: page;
            min-height: 240mm;
          }
          /* Chart-Wrapper im Print: feste Höhe, nicht über Seiten brechen.
             Vermögens-/Cashflow-Chart brauchen Platz für Bar-Stack + Legende,
             daher tall = 480px (passt zusammen mit Section-Titel auf eine
             A4-Seite minus Margin = ca. 235mm Nutzhöhe). */
          .chart-wrap {
            height: 380px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .chart-wrap--tall {
            height: 480px;
          }
          /* SteuerDetailCard im Print: nicht in 2 Seiten brechen */
          .print-steuer-detail {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          /* 3-Säulen-Block: Header + 3-Spalten-Grid auf einer Seite halten */
          .print-drei-saeulen {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .print-drei-saeulen .lg\\:grid-cols-3 {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          /* Hinterlassenen-Block: zwei Karten auf einer Seite halten */
          .print-hinterlassenen {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .print-hinterlassenen .lg\\:grid-cols-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          /* Varianten-Vergleichsblock: pro Slot nicht über Seite brechen */
          .print-variante-vergleich {
            page-break-inside: avoid;
            break-inside: avoid;
            margin-bottom: 12px;
          }
          .print-variante-vergleich .grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
          /* Plausibilitäts-Box: nicht über Seitenrand brechen */
          .print-plausi {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          /* Detail-Liquidität: Querformat damit die breite Tabelle passt.
             @page benannt → Section bekommt eigene Querformat-Seite. */
          @page detail-liq {
            size: A4 landscape;
            margin: 12mm;
          }
          .print-detail-liq {
            page: detail-liq;
          }
          .print-detail-liq table {
            font-size: 7.5pt;
            width: 100%;
          }
          .print-detail-liq td,
          .print-detail-liq th {
            padding: 2px 4px;
          }
          .chart-section {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          /* Sankey-Block: zwei Diagramme auf einer Seite. SVG = viewBox-skaliert,
             daher ist die feste Höhe = 100mm pro Sankey. */
          .chart-sankey {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .chart-sankey svg {
            max-height: 100mm;
            width: 100% !important;
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
          /* Recharts MUSS volle chart-wrap-Höhe einnehmen — Recharts setzt
             intern auf das passed-in height-Prop (460px), aber für PDF wollen
             wir dass das SVG die Wrap-Höhe füllt. */
          .chart-wrap .recharts-responsive-container,
          .chart-wrap .recharts-wrapper,
          .chart-wrap .recharts-surface {
            height: 100% !important;
            max-height: 100% !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .chart-wrap svg {
            height: 100% !important;
            width: 100% !important;
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
        : status === "unbekannt"
          ? "bg-slate-50 border-slate-200 text-slate-500"
          : "bg-rose-50 border-rose-200 text-rose-700";
  const unbekannt = status === "unbekannt" || verhaeltnis < 0;
  return (
    <div className={`rounded-md border p-3 ${farbe}`}>
      <div className="text-xs uppercase tracking-wider">{titel}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">
        {unbekannt ? "—" : `${(verhaeltnis * 100).toFixed(1)} %`}
      </div>
      <div className="text-xs text-slate-600">
        {unbekannt
          ? "kein Pensionseinkommen erfasst — Tragbarkeit nicht berechenbar"
          : `Wohnkosten ${formatChf(kosten)} / Jahr · ${status.replace("_", " ")}`}
      </div>
    </div>
  );
}

/**
 * Executive Summary — 1 Seite, ideal als Mandanten-Zusammenfassung.
 * Verdict + 3 KPIs + Top-3-Massnahmen + Eckdaten in einer Box.
 */
function ExecutiveSummary({
  verdict,
  cashflow,
  massnahmen,
  fullState,
  ordPensionsjahr,
}: {
  verdict: { type: string; titel: string; text: string };
  cashflow: import("@/engine/cashflow").CashflowZeile[];
  massnahmen: import("@/engine/massnahmen").Massnahme[];
  fullState: import("@/lib/store").PlanState;
  ordPensionsjahr: number | null;
}) {
  const heute = cashflow[0];
  const bezugJahr = ordPensionsjahr ?? cashflow[0]?.jahr ?? 0;
  const beiPension = cashflow.find((z) => z.jahr === bezugJahr) ?? cashflow[Math.floor(cashflow.length / 2)];
  const letzte = cashflow[cashflow.length - 1];
  if (!heute || !beiPension || !letzte) return null;

  return (
    <div className="space-y-5">
      {/* Verdict-Block ausgeblendet (Tiago-Fix) */}

      {/* 3 KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <KpiBox label="Heute" value={formatChf(heute.vermoegenNetto)} subtext={`im Jahr ${heute.jahr}`} />
        <KpiBox
          label="Bei Pensionierung"
          value={formatChf(beiPension.vermoegenNetto)}
          subtext={`im Jahr ${beiPension.jahr}`}
        />
        <KpiBox label="Mit 85 Jahren" value={formatChf(letzte.vermoegenNetto)} subtext={`im Jahr ${letzte.jahr}`} />
      </div>

      {/* Top-3-Massnahmen */}
      {massnahmen.length > 0 && (
        <div>
          <div className="mb-2 text-sm font-semibold" style={{ color: "#0a2540" }}>
            Top-{massnahmen.length} Massnahmen für die nächsten 12 Monate
          </div>
          <ol className="space-y-2 text-sm" style={{ color: "#0a2540" }}>
            {massnahmen.map((m, i) => (
              <li key={m.id} className="rounded-md border border-slate-200 bg-white px-3 py-2">
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-cuira-deep)] text-[10px] font-semibold text-white">
                  {i + 1}
                </span>
                <span className="font-medium">{m.titel}</span>
                {m.geschaetzteErsparnis != null && m.geschaetzteErsparnis > 0 && (
                  <span className="ml-2 text-xs text-emerald-700">
                    · ~{formatChf(m.geschaetzteErsparnis)} / J Steuerersparnis
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Eckdaten Kompakt */}
      <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-xs" style={{ color: "#4b566b" }}>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <strong className="text-slate-700">Stand:</strong> {new Date().toLocaleDateString("de-CH")}
          </div>
          <div>
            <strong className="text-slate-700">Wohnsitz:</strong> {fullState.adresse.kanton}
            {fullState.adresse.gemeindeName ? `, ${fullState.adresse.gemeindeName}` : ""}
          </div>
          <div>
            <strong className="text-slate-700">Fall:</strong> {fallartLabel(fullState.fallart)}
          </div>
          <div>
            <strong className="text-slate-700">Pensionierung:</strong> {ordPensionsjahr ?? "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Klartext-Narrativ-Liste (E2-5).
 */
function NarrativListe({
  items,
}: {
  items: import("@/engine/narrativ").NarrativItem[];
}) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex items-start gap-3 rounded-md border px-3 py-2 text-sm"
          style={{
            borderColor:
              item.typ === "ok"
                ? "#bbf7d0"
                : item.typ === "warn"
                  ? "#fcd34d"
                  : "#d1d5db",
            background:
              item.typ === "ok"
                ? "#f0fdf4"
                : item.typ === "warn"
                  ? "#fefce8"
                  : "#f8fafc",
            color: "#1e293b",
          }}
        >
          <span
            className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
            style={{
              background:
                item.typ === "ok"
                  ? "#10b981"
                  : item.typ === "warn"
                    ? "#f59e0b"
                    : "#94a3b8",
              color: "white",
            }}
          >
            {item.typ === "ok" ? "✓" : item.typ === "warn" ? "!" : "i"}
          </span>
          <span className="leading-relaxed">{item.text}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Jahres-Tabelle: Vermögensentwicklung pro Jahr (E2-5 / Y-3).
 * Spalten: Jahr · Liquid · Wertschriften · Vorsorge · Immo · Schulden · Netto
 */
function VermoegensJahresTabelle({
  cashflow,
}: {
  cashflow: import("@/engine/cashflow").CashflowZeile[];
}) {
  return (
    <table className="w-full text-[10px]">
      <thead>
        <tr className="border-b-2 border-slate-300 bg-slate-50">
          <th className="px-2 py-1.5 text-left">Jahr</th>
          <th className="px-2 py-1.5 text-right">Liquid</th>
          <th className="px-2 py-1.5 text-right">Wertschr.</th>
          <th className="px-2 py-1.5 text-right">Vorsorge</th>
          <th className="px-2 py-1.5 text-right">Immo</th>
          <th className="px-2 py-1.5 text-right">Schulden</th>
          <th className="px-2 py-1.5 text-right font-semibold">Netto</th>
        </tr>
      </thead>
      <tbody>
        {cashflow.map((z) => (
          <tr key={z.jahr} className="border-b border-slate-100">
            <td className="px-2 py-1 tabular-nums">{z.jahr}</td>
            <td className="px-2 py-1 text-right tabular-nums">
              {formatChf(z.vermoegenLiquiditaet)}
            </td>
            <td className="px-2 py-1 text-right tabular-nums">
              {formatChf(z.vermoegenWertschriften)}
            </td>
            <td className="px-2 py-1 text-right tabular-nums">
              {formatChf(z.vermoegenVorsorge)}
            </td>
            <td className="px-2 py-1 text-right tabular-nums">
              {formatChf(z.vermoegenImmobilien)}
            </td>
            <td className="px-2 py-1 text-right tabular-nums text-rose-700">
              {z.vermoegenSchulden > 0 ? `−${formatChf(z.vermoegenSchulden)}` : "—"}
            </td>
            <td className="px-2 py-1 text-right font-semibold tabular-nums">
              {formatChf(z.vermoegenNetto)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Jahres-Tabelle: Steuern pro Jahr (E2-5 / Y-3).
 */
function SteuerJahresTabelle({
  cashflow,
}: {
  cashflow: import("@/engine/cashflow").CashflowZeile[];
}) {
  return (
    <table className="w-full text-[10px]">
      <thead>
        <tr className="border-b-2 border-slate-300 bg-slate-50">
          <th className="px-2 py-1.5 text-left">Jahr</th>
          <th className="px-2 py-1.5 text-right">Einkommen</th>
          <th className="px-2 py-1.5 text-right">Vermögen</th>
          <th className="px-2 py-1.5 text-right">Kapital</th>
          <th className="px-2 py-1.5 text-right font-semibold">Total</th>
        </tr>
      </thead>
      <tbody>
        {cashflow.map((z) => (
          <tr key={z.jahr} className="border-b border-slate-100">
            <td className="px-2 py-1 tabular-nums">{z.jahr}</td>
            <td className="px-2 py-1 text-right tabular-nums">
              {formatChf(z.ausgabenSteuernEinkommen)}
            </td>
            <td className="px-2 py-1 text-right tabular-nums">
              {formatChf(z.ausgabenSteuernVermoegen)}
            </td>
            <td className="px-2 py-1 text-right tabular-nums">
              {z.ausgabenSteuernKapital > 0
                ? formatChf(z.ausgabenSteuernKapital)
                : "—"}
            </td>
            <td className="px-2 py-1 text-right font-semibold tabular-nums">
              {formatChf(z.ausgabenSteuern)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
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

/**
 * Aktiva-Passiva-Bilanz-Donut (Y-3 Audit Pflicht-Lücke #1).
 *
 * Aktiva-Donut: Liquidität / Wertschriften / Vorsorge / Immobilien / Firma.
 * Plus eine Tabelle mit allen Komponenten + Schulden + Netto.
 */
function BilanzDonut({ zeile }: { zeile: import("@/engine/cashflow").CashflowZeile }) {
  const segments = [
    { label: "Liquidität", value: zeile.vermoegenLiquiditaet, color: "#3b82f6" },
    { label: "Wertschriften", value: zeile.vermoegenWertschriften, color: "#8b5cf6" },
    { label: "Vorsorge (PK/3a/FZ)", value: zeile.vermoegenVorsorge, color: "#10b981" },
    { label: "Immobilien", value: zeile.vermoegenImmobilien, color: "#f59e0b" },
    { label: "Firma", value: zeile.vermoegenFirma, color: "#6b7280" },
  ].filter((s) => s.value > 0);

  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) {
    return <p className="text-xs text-slate-500">Keine Aktiva erfasst.</p>;
  }

  // Donut SVG mit cumulative angle
  const cx = 90;
  const cy = 90;
  const rOuter = 80;
  const rInner = 50;
  let startAngle = -Math.PI / 2; // Start oben
  const paths = segments.map((seg, i) => {
    const angle = (seg.value / total) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const x1 = cx + rOuter * Math.cos(startAngle);
    const y1 = cy + rOuter * Math.sin(startAngle);
    const x2 = cx + rOuter * Math.cos(endAngle);
    const y2 = cy + rOuter * Math.sin(endAngle);
    const x3 = cx + rInner * Math.cos(endAngle);
    const y3 = cy + rInner * Math.sin(endAngle);
    const x4 = cx + rInner * Math.cos(startAngle);
    const y4 = cy + rInner * Math.sin(startAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const d = `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4} Z`;
    startAngle = endAngle;
    return <path key={i} d={d} fill={seg.color} stroke="white" strokeWidth={1} />;
  });

  return (
    <div className="grid grid-cols-[200px_1fr] gap-6">
      <div>
        <svg
          viewBox="0 0 180 180"
          width="180"
          height="180"
          role="img"
          aria-label={`Vermögensbilanz: Aktiva total ${formatChf(total)} CHF`}
        >
          {paths}
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            fontSize="11"
            fill="#4b566b"
          >
            Aktiva
          </text>
          <text
            x={cx}
            y={cy + 10}
            textAnchor="middle"
            fontSize="14"
            fontWeight="600"
            fill="#0a2540"
          >
            {formatChf(total)}
          </text>
        </svg>
      </div>
      <div>
        <table className="w-full text-xs">
          <tbody>
            {segments.map((s) => (
              <tr key={s.label} className="border-b border-slate-100">
                <td className="py-1.5">
                  <span
                    className="mr-2 inline-block size-2 rounded-full align-middle"
                    style={{ background: s.color }}
                  />
                  {s.label}
                </td>
                <td className="py-1.5 text-right tabular-nums text-slate-700">
                  {formatChf(s.value)}
                </td>
                <td className="py-1.5 pl-2 text-right tabular-nums text-slate-400">
                  {((s.value / total) * 100).toFixed(0)} %
                </td>
              </tr>
            ))}
            <tr className="border-b-2 border-slate-300">
              <td className="py-1.5 font-semibold">Aktiva Total</td>
              <td className="py-1.5 text-right font-semibold tabular-nums">
                {formatChf(total)}
              </td>
              <td className="py-1.5" />
            </tr>
            <tr>
              <td className="py-1.5 text-rose-700">− Schulden (Hypo + Darlehen)</td>
              <td className="py-1.5 text-right tabular-nums text-rose-700">
                −{formatChf(zeile.vermoegenSchulden)}
              </td>
              <td className="py-1.5" />
            </tr>
            <tr className="border-t border-slate-300">
              <td className="py-2 text-sm font-semibold text-slate-800">
                Nettovermögen
              </td>
              <td className="py-2 text-right text-sm font-semibold tabular-nums text-slate-800">
                {formatChf(zeile.vermoegenNetto)}
              </td>
              <td className="py-2" />
            </tr>
          </tbody>
        </table>
        {zeile.vermoegenImmobilien > 0 &&
          zeile.vermoegenImmobilien / total > 0.5 && (
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              ⚖ Klumpen-Risiko: über 50 % des Vermögens sind in Immobilien
              gebunden. Bei Bedarf Liquiditätspuffer prüfen.
            </p>
          )}
      </div>
    </div>
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

/**
 * Renderer für einen Plan-Vergleichs-Block (Δ-KPIs + Diff-Tabelle).
 * Wird pro Vergleichs-Slot einmal aufgerufen.
 */
function VarianteVergleichBlock({
  aktivSlot,
  vergleichSlot,
  aktivKpis,
  vergleichKpis,
  diffsGruppiert,
}: {
  aktivSlot: PlanSlot;
  vergleichSlot: PlanSlot;
  aktivKpis: {
    vermoegenHeute: number;
    vermoegenPension: number;
    vermoegenMit85: number;
    pensionEinkommen: number;
    lebenszeitSteuern: number;
    effektivSatzProzent: number;
  };
  vergleichKpis: {
    vermoegenHeute: number;
    vermoegenPension: number;
    vermoegenMit85: number;
    pensionEinkommen: number;
    lebenszeitSteuern: number;
    effektivSatzProzent: number;
  };
  diffsGruppiert: Record<
    string,
    Array<{ block: string; feld: string; aktiv: string; vergleich: string }>
  >;
}) {
  const farben = {
    a: { dot: "#3b82f6", text: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
    b: { dot: "#8b5cf6", text: "#6d28d9", bg: "#f5f3ff", border: "#ddd6fe" },
    c: { dot: "#f59e0b", text: "#b45309", bg: "#fffbeb", border: "#fde68a" },
  };
  const vF = farben[vergleichSlot];
  const aF = farben[aktivSlot];

  const kpis: Array<{
    label: string;
    aktiv: number;
    vergleich: number;
    richtung: "hoch-gut" | "tief-gut";
    formatProzent?: boolean;
  }> = [
    {
      label: "Vermögen heute",
      aktiv: aktivKpis.vermoegenHeute,
      vergleich: vergleichKpis.vermoegenHeute,
      richtung: "hoch-gut",
    },
    {
      label: "Vermögen bei Pension",
      aktiv: aktivKpis.vermoegenPension,
      vergleich: vergleichKpis.vermoegenPension,
      richtung: "hoch-gut",
    },
    {
      label: "Vermögen bei 85",
      aktiv: aktivKpis.vermoegenMit85,
      vergleich: vergleichKpis.vermoegenMit85,
      richtung: "hoch-gut",
    },
    {
      label: "Pension-Einkommen p.a.",
      aktiv: aktivKpis.pensionEinkommen,
      vergleich: vergleichKpis.pensionEinkommen,
      richtung: "hoch-gut",
    },
    {
      label: "Lebenszeit-Steuern",
      aktiv: aktivKpis.lebenszeitSteuern,
      vergleich: vergleichKpis.lebenszeitSteuern,
      richtung: "tief-gut",
    },
    {
      label: "Effektivsteuersatz heute",
      aktiv: aktivKpis.effektivSatzProzent,
      vergleich: vergleichKpis.effektivSatzProzent,
      richtung: "tief-gut",
      formatProzent: true,
    },
  ];

  const diffEntries = Object.entries(diffsGruppiert);

  return (
    <div
      className="print-variante-vergleich rounded-md border p-3"
      style={{ borderColor: vF.border, background: vF.bg }}
    >
      <div className="mb-2 flex items-baseline justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span
            className="inline-block size-2 rounded-full"
            style={{ background: aF.dot }}
          />
          <span className="font-semibold" style={{ color: aF.text }}>
            Plan {aktivSlot.toUpperCase()} (aktiv)
          </span>
          <span className="text-xs text-slate-400">vs.</span>
          <span
            className="inline-block size-2 rounded-full"
            style={{ background: vF.dot }}
          />
          <span className="font-semibold" style={{ color: vF.text }}>
            Plan {vergleichSlot.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {kpis.map((k) => {
          const delta = k.aktiv - k.vergleich;
          const istBesser =
            delta === 0
              ? null
              : k.richtung === "hoch-gut"
                ? delta > 0
                : delta < 0;
          const pfeil = delta === 0 ? "—" : delta > 0 ? "↑" : "↓";
          const farbeText =
            istBesser === null
              ? "#64748b"
              : istBesser
                ? "#047857"
                : "#b45309";
          const farbeBg =
            istBesser === null
              ? "#ffffff"
              : istBesser
                ? "#ecfdf5"
                : "#fef3c7";
          const fmt = (n: number) =>
            k.formatProzent ? `${n.toFixed(1)} %` : formatChf(Math.round(n));
          return (
            <div
              key={k.label}
              className="rounded-md border px-2 py-1.5"
              style={{ borderColor: "#e2e8f0", background: farbeBg }}
            >
              <div
                className="text-[9px] uppercase tracking-wider"
                style={{ color: "#64748b" }}
              >
                {k.label}
              </div>
              <div className="mt-0.5 flex items-baseline justify-between gap-1">
                <span
                  className="text-[11px] font-semibold tabular-nums"
                  style={{ color: "#0f172a" }}
                >
                  {fmt(k.aktiv)}
                </span>
                <span
                  className="text-[10px] font-medium tabular-nums"
                  style={{ color: farbeText }}
                >
                  {pfeil} {delta !== 0 ? fmt(Math.abs(delta)) : "0"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {diffEntries.length > 0 && (
        <div className="mt-3">
          <div
            className="mb-1 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "#475569" }}
          >
            Unterschiede im Detail
          </div>
          <div className="overflow-hidden rounded-md border" style={{ borderColor: "#e2e8f0" }}>
            <table className="w-full text-[10px]">
              <thead style={{ background: "#f8fafc" }}>
                <tr style={{ color: "#64748b" }}>
                  <th className="px-2 py-1 text-left font-medium">Block / Feld</th>
                  <th className="px-2 py-1 text-left font-medium">
                    Plan {aktivSlot.toUpperCase()}
                  </th>
                  <th className="px-2 py-1 text-left font-medium">
                    Plan {vergleichSlot.toUpperCase()}
                  </th>
                </tr>
              </thead>
              <tbody>
                {diffEntries.flatMap(([block, zeilen]) =>
                  zeilen.map((z, i) => (
                    <tr
                      key={`${block}-${i}`}
                      style={{ borderTop: "1px solid #f1f5f9" }}
                    >
                      <td className="px-2 py-1" style={{ color: "#475569" }}>
                        <span className="text-[9px] uppercase tracking-wider opacity-70">
                          {block.replace(/^[\p{Emoji}\s]+/u, "")}
                        </span>
                        <br />
                        <span className="font-medium" style={{ color: "#0f172a" }}>
                          {z.feld}
                        </span>
                      </td>
                      <td
                        className="px-2 py-1 font-medium tabular-nums"
                        style={{ color: "#0f172a" }}
                      >
                        {z.aktiv}
                      </td>
                      <td
                        className="px-2 py-1 tabular-nums"
                        style={{ color: "#334155" }}
                      >
                        {z.vergleich}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function chartEndJahr(geburtsdatum: string, alter: number): number | null {
  if (!geburtsdatum) return null;
  const j = parseInt(geburtsdatum.slice(0, 4), 10);
  if (!Number.isFinite(j)) return null;
  return j + alter;
}

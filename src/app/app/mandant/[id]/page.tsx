"use client";

/**
 * Mandant-Detail (Phase 6 Demo, Etappe 4 Backlog).
 *
 * Pro Mandant: Übersicht / Pläne / Termine / Dokumente / Aktivität / Notizen.
 * Daten kommen aus MOCK_MANDANTEN — Auth + DB folgen mit Etappe 4 (Supabase).
 */

import { useState, use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  Activity,
  StickyNote,
  LayoutGrid,
  TrendingUp,
  TrendingDown,
  Plus,
  Download,
  ExternalLink,
  Pencil,
} from "lucide-react";
import { CockpitSidebar } from "@/components/cockpit/CockpitSidebar";
import {
  findMandant,
  relativDatum,
  MOCK_BERATER,
  type MockMandant,
  type MandantStatus,
} from "@/lib/mock-mandanten";
import { formatChf } from "@/lib/format";

type Tab =
  | "uebersicht"
  | "plaene"
  | "termine"
  | "dokumente"
  | "aktivitaet"
  | "notizen";

export default function MandantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const m = findMandant(id);
  if (!m) return notFound();

  const [tab, setTab] = useState<Tab>("uebersicht");

  return (
    <div
      className="flex h-screen"
      style={{ background: "var(--bg)", color: "var(--ink)" }}
    >
      <CockpitSidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1400px] p-6 md:p-8">
          {/* Breadcrumb */}
          <Link
            href="/app"
            className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] transition-colors hover:underline"
            style={{ color: "var(--ink-3)" }}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Zurück zum Cockpit
          </Link>

          {/* Header-Zeile */}
          <MandantHeader m={m} />

          {/* Tabs */}
          <div
            className="mt-6 mb-5 flex gap-1 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            {(
              [
                { id: "uebersicht", label: "Übersicht", icon: LayoutGrid },
                { id: "plaene", label: "Pläne", icon: FileText },
                { id: "termine", label: "Termine", icon: Calendar },
                { id: "dokumente", label: "Dokumente", icon: FileText },
                { id: "aktivitaet", label: "Aktivität", icon: Activity },
                { id: "notizen", label: "Notizen", icon: StickyNote },
              ] as const
            ).map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className="-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors"
                  style={{
                    borderColor: active ? "var(--accent)" : "transparent",
                    color: active ? "var(--accent-ink)" : "var(--ink-3)",
                  }}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Tab-Inhalt */}
          {tab === "uebersicht" && <TabUebersicht m={m} />}
          {tab === "plaene" && <TabPlaene m={m} />}
          {tab === "termine" && <TabTermine m={m} />}
          {tab === "dokumente" && <TabDokumente m={m} />}
          {tab === "aktivitaet" && <TabAktivitaet m={m} />}
          {tab === "notizen" && <TabNotizen m={m} />}
        </div>
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Header (Mandant-Profil + Status + Schnellaktionen)
   ═══════════════════════════════════════════════════════════════════════ */

function MandantHeader({ m }: { m: MockMandant }) {
  const initialen = `${m.vorname[0]}${m.nachname[0]}`.toUpperCase();
  return (
    <div
      className="rounded-[14px] border p-5"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex flex-wrap items-start gap-5">
        {/* Avatar */}
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-[20px] font-semibold text-white"
          style={{ background: "var(--cuira-deep)" }}
        >
          {initialen}
        </div>

        {/* Identifikation */}
        <div className="flex-1 min-w-[240px]">
          <div className="flex items-center gap-2">
            <h1
              className="text-[22px] font-semibold tracking-tight"
              style={{ color: "var(--ink)" }}
            >
              {m.vorname} {m.nachname}
            </h1>
            <StatusPill status={m.status} />
          </div>
          <div
            className="mt-1 text-[13px]"
            style={{ color: "var(--ink-2)" }}
          >
            {m.alter} Jahre · {m.zivilstand}
            {m.kinder > 0 &&
              ` · ${m.kinder} Kind${m.kinder > 1 ? "er" : ""}`}{" "}
            · Wohnsitz {m.kanton}
          </div>
          <div
            className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px]"
            style={{ color: "var(--ink-3)" }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {m.vorname.toLowerCase()}.{m.nachname.toLowerCase()}@example.ch
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              +41 79 000 00 00
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {m.kanton}, Schweiz
            </span>
          </div>
        </div>

        {/* Aktionen */}
        <div className="flex flex-wrap gap-2">
          <Link
            href="/?mandant=demo"
            target="_blank"
            className="cui-btn cui-btn-primary"
          >
            <ExternalLink className="h-4 w-4" />
            Plan öffnen
          </Link>
          <button
            type="button"
            className="cui-btn cui-btn-ghost"
            onClick={() => alert("Termin buchen — kommt mit Etappe 4")}
          >
            <Calendar className="h-4 w-4" />
            Termin
          </button>
          <button
            type="button"
            className="cui-btn cui-btn-ghost"
            onClick={() => alert("Bearbeiten — kommt mit Etappe 4")}
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* KPI-Streifen */}
      <div
        className="mt-5 grid grid-cols-2 gap-4 border-t pt-4 md:grid-cols-4"
        style={{ borderColor: "var(--border)" }}
      >
        <KpiInline
          label="Plan-Vollständigkeit"
          value={`${m.planVollstaendigkeit}%`}
          progress={m.planVollstaendigkeit}
        />
        <KpiInline
          label="Vermögen heute"
          value={formatChf(m.vermoegenHeute)}
        />
        <KpiInline
          label="Vermögen Pension"
          value={formatChf(m.vermoegenPension)}
        />
        <KpiInline
          label="Δ Pension"
          value={`${m.delta >= 0 ? "+" : ""}${formatChf(m.delta)}`}
          deltaPositive={m.delta >= 0}
        />
      </div>
    </div>
  );
}

function KpiInline({
  label,
  value,
  progress,
  deltaPositive,
}: {
  label: string;
  value: string;
  progress?: number;
  deltaPositive?: boolean;
}) {
  return (
    <div>
      <div
        className="text-[10.5px] font-medium uppercase tracking-wider"
        style={{ color: "var(--ink-3)" }}
      >
        {label}
      </div>
      <div
        className="mt-1 font-mono text-[18px] font-semibold tabular-nums"
        style={{
          color:
            deltaPositive === true
              ? "var(--pos)"
              : deltaPositive === false
              ? "var(--neg)"
              : "var(--ink)",
        }}
      >
        {value}
      </div>
      {progress !== undefined && (
        <div className="cui-progress-track mt-2">
          <div
            className="cui-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Tab — Übersicht
   ═══════════════════════════════════════════════════════════════════════ */

function TabUebersicht({ m }: { m: MockMandant }) {
  const naechsterTermin = m.naechsterTermin
    ? new Date(m.naechsterTermin)
    : null;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      {/* Linke Spalte (2/3) */}
      <div className="space-y-5 lg:col-span-2">
        {/* Pläne-Vorschau */}
        <Card title="Aktuelle Pläne" right={<MiniLink label="Alle anzeigen" />}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <PlanThumb
              titel="Plan A — Standard-Pension 65"
              version="v3"
              datum="vor 2 Tagen"
              vermoegen={m.vermoegenPension}
              delta={m.delta}
              aktiv
            />
            <PlanThumb
              titel="Plan B — Frühpension 62"
              version="v1"
              datum="vor 9 Tagen"
              vermoegen={m.vermoegenPension * 0.85}
              delta={m.delta * 0.7}
            />
          </div>
        </Card>

        {/* Massnahmen */}
        <Card
          title="Empfohlene Massnahmen"
          right={<MiniLink label="Plan öffnen" />}
        >
          <div className="space-y-2">
            <MassnahmeRow
              titel="3a-Lücke schliessen"
              text="Maximalbetrag CHF 7'258 pro Jahr ausschöpfen"
              ersparnis={1850}
              prio="hoch"
            />
            <MassnahmeRow
              titel="PK-Einkauf 2026"
              text="Steueroptimaler Einkauf bis CHF 45'000 möglich"
              ersparnis={9200}
              prio="hoch"
            />
            <MassnahmeRow
              titel="Hypothek-Tranche refinanzieren"
              text="Saron statt Festhypothek 5J. — Zinsersparnis ~CHF 4'200/J."
              ersparnis={4200}
              prio="mittel"
            />
          </div>
        </Card>

        {/* Aktivität-Stream (kurz) */}
        <Card
          title="Letzte Aktivität"
          right={<MiniLink label="Alle anzeigen" />}
        >
          <ActivityList kurz />
        </Card>
      </div>

      {/* Rechte Spalte (1/3) */}
      <div className="space-y-5">
        {/* Nächster Termin */}
        <Card title="Nächster Termin">
          {naechsterTermin ? (
            <div>
              <div
                className="font-mono text-[13px] tabular-nums"
                style={{ color: "var(--ink)" }}
              >
                {naechsterTermin.toLocaleDateString("de-CH", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <div
                className="text-[12px]"
                style={{ color: "var(--ink-2)" }}
              >
                {naechsterTermin.toLocaleTimeString("de-CH", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {" Uhr · "}
                {relativDatum(m.naechsterTermin)}
              </div>
              <div
                className="mt-3 rounded-md border p-2.5 text-[12px]"
                style={{
                  background: "var(--surface-2)",
                  borderColor: "var(--border)",
                  color: "var(--ink-2)",
                }}
              >
                Folge-Beratung — Plan A finalisieren, PK-Einkauf besprechen.
              </div>
              <button
                type="button"
                className="cui-btn cui-btn-ghost mt-3 w-full"
              >
                <Calendar className="h-4 w-4" />
                Termin verschieben
              </button>
            </div>
          ) : (
            <div className="text-[12.5px]" style={{ color: "var(--ink-3)" }}>
              Kein Termin geplant.
              <button
                type="button"
                className="cui-btn cui-btn-primary mt-3 w-full"
              >
                <Plus className="h-4 w-4" />
                Termin buchen
              </button>
            </div>
          )}
        </Card>

        {/* Quelle / Affiliate */}
        <Card title="Akquise-Quelle">
          <div
            className="text-[12.5px]"
            style={{ color: "var(--ink-2)" }}
          >
            <div className="flex justify-between">
              <span style={{ color: "var(--ink-3)" }}>Quelle</span>
              <span className="font-medium">
                {m.quelle === "direkt"
                  ? "Direkt-Mandat"
                  : m.quelle === "affiliate"
                  ? "Affiliate-Vermittlung"
                  : "Kunde-Funnel (B2C)"}
              </span>
            </div>
            <div className="mt-1.5 flex justify-between">
              <span style={{ color: "var(--ink-3)" }}>Berater</span>
              <span className="font-medium">{MOCK_BERATER.name}</span>
            </div>
            <div className="mt-1.5 flex justify-between">
              <span style={{ color: "var(--ink-3)" }}>Aufgenommen</span>
              <span className="font-medium tabular-nums">
                {relativDatum(m.letzteAktivitaet)}
              </span>
            </div>
          </div>
        </Card>

        {/* Status-Switcher */}
        <Card title="Status">
          <div className="space-y-1.5">
            {(
              [
                "aktiv",
                "wartend",
                "abgeschlossen",
                "archiviert",
              ] as MandantStatus[]
            ).map((s) => (
              <button
                key={s}
                type="button"
                className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-[12.5px] transition-colors hover:bg-[var(--surface-hover)]"
                style={{
                  borderColor:
                    m.status === s ? "var(--accent)" : "var(--border)",
                  background:
                    m.status === s ? "var(--accent-soft)" : "transparent",
                  color:
                    m.status === s ? "var(--accent-ink)" : "var(--ink-2)",
                }}
                onClick={() =>
                  alert(
                    `Status-Wechsel auf "${s}" — kommt mit Etappe 4 (DB-Persist)`
                  )
                }
              >
                <span className="font-medium capitalize">{s}</span>
                {m.status === s && (
                  <span className="text-[10px] uppercase tracking-wider">
                    aktuell
                  </span>
                )}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Tab — Pläne (Versionierung)
   ═══════════════════════════════════════════════════════════════════════ */

function TabPlaene({ m }: { m: MockMandant }) {
  const versionen = [
    {
      id: "v3",
      titel: "Plan A — Standard-Pension 65",
      version: "v3",
      datum: "vor 2 Tagen",
      vermoegen: m.vermoegenPension,
      delta: m.delta,
      notiz: "PK-Bezug Mischlösung 50/50 hinzugefügt",
      aktiv: true,
    },
    {
      id: "v2",
      titel: "Plan A — Standard-Pension 65",
      version: "v2",
      datum: "vor 12 Tagen",
      vermoegen: m.vermoegenPension * 0.97,
      delta: m.delta * 0.95,
      notiz: "Wunsch-Verbrauch erhöht auf CHF 9'500/Mt",
    },
    {
      id: "v1",
      titel: "Plan A — Standard-Pension 65",
      version: "v1",
      datum: "vor 28 Tagen",
      vermoegen: m.vermoegenPension * 0.92,
      delta: m.delta * 0.85,
      notiz: "Erst-Plan nach Eingangsgespräch",
    },
    {
      id: "B-v1",
      titel: "Plan B — Frühpension 62",
      version: "v1",
      datum: "vor 9 Tagen",
      vermoegen: m.vermoegenPension * 0.85,
      delta: m.delta * 0.7,
      notiz: "Alternativ-Szenario, AHV-Vorbezug 2 J.",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[12.5px]" style={{ color: "var(--ink-3)" }}>
          {versionen.length} Versionen über alle Pläne
        </p>
        <button type="button" className="cui-btn cui-btn-primary">
          <Plus className="h-4 w-4" />
          Neuer Plan
        </button>
      </div>

      <div
        className="rounded-[14px] border"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        {versionen.map((v, i) => (
          <div
            key={v.id}
            className={`flex items-center gap-4 px-4 py-3.5 ${
              i < versionen.length - 1 ? "border-b" : ""
            }`}
            style={{ borderColor: "var(--border)" }}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold"
              style={{
                background: v.aktiv ? "var(--accent-soft)" : "var(--surface-2)",
                color: v.aktiv ? "var(--accent-ink)" : "var(--ink-3)",
              }}
            >
              {v.version}
            </div>
            <div className="flex-1">
              <div
                className="flex items-center gap-2 text-[13px] font-medium"
                style={{ color: "var(--ink)" }}
              >
                {v.titel}
                {v.aktiv && (
                  <span className="cui-pill cui-pill-accent">aktiv</span>
                )}
              </div>
              <div className="text-[11.5px]" style={{ color: "var(--ink-3)" }}>
                {v.datum} · {v.notiz}
              </div>
            </div>
            <div className="text-right">
              <div
                className="font-mono text-[13px] tabular-nums"
                style={{ color: "var(--ink)" }}
              >
                {formatChf(v.vermoegen)}
              </div>
              <div
                className="font-mono text-[11px] tabular-nums"
                style={{ color: v.delta >= 0 ? "var(--pos)" : "var(--neg)" }}
              >
                {v.delta >= 0 ? "+" : ""}
                {formatChf(v.delta)}
              </div>
            </div>
            <button
              type="button"
              className="cui-btn cui-btn-ghost"
              onClick={() => alert("Plan öffnen — kommt mit Etappe 4")}
            >
              <ExternalLink className="h-4 w-4" />
              Öffnen
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Tab — Termine
   ═══════════════════════════════════════════════════════════════════════ */

function TabTermine({ m }: { m: MockMandant }) {
  const termine = [
    {
      id: 1,
      titel: "Folge-Beratung",
      datum: m.naechsterTermin,
      dauer: "60 Min",
      ort: "Online (Teams)",
      status: "geplant",
    },
    {
      id: 2,
      titel: "Erst-Beratung",
      datum: new Date(Date.now() - 21 * 86400000).toISOString(),
      dauer: "90 Min",
      ort: "Büro Zürich",
      status: "abgeschlossen",
    },
    {
      id: 3,
      titel: "Online-Erfassung",
      datum: new Date(Date.now() - 35 * 86400000).toISOString(),
      dauer: "30 Min",
      ort: "Online (Erfassungs-Tool)",
      status: "abgeschlossen",
    },
  ].filter((t) => t.datum !== null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[12.5px]" style={{ color: "var(--ink-3)" }}>
          {termine.length} Termine — {termine.filter((t) => t.status === "geplant").length} geplant
        </p>
        <button type="button" className="cui-btn cui-btn-primary">
          <Plus className="h-4 w-4" />
          Termin buchen
        </button>
      </div>

      <div
        className="rounded-[14px] border"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        {termine.map((t, i) => {
          const d = new Date(t.datum!);
          return (
            <div
              key={t.id}
              className={`flex items-center gap-4 px-4 py-3.5 ${
                i < termine.length - 1 ? "border-b" : ""
              }`}
              style={{ borderColor: "var(--border)" }}
            >
              <div
                className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md"
                style={{
                  background:
                    t.status === "geplant"
                      ? "var(--accent-soft)"
                      : "var(--surface-2)",
                  color:
                    t.status === "geplant"
                      ? "var(--accent-ink)"
                      : "var(--ink-3)",
                }}
              >
                <div className="text-[9px] uppercase tracking-wider">
                  {d.toLocaleDateString("de-CH", { month: "short" })}
                </div>
                <div className="font-mono text-[14px] font-semibold tabular-nums">
                  {d.getDate()}
                </div>
              </div>
              <div className="flex-1">
                <div
                  className="text-[13px] font-medium"
                  style={{ color: "var(--ink)" }}
                >
                  {t.titel}
                </div>
                <div
                  className="text-[11.5px]"
                  style={{ color: "var(--ink-3)" }}
                >
                  {d.toLocaleDateString("de-CH", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                  {" · "}
                  {d.toLocaleTimeString("de-CH", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {" · "}
                  {t.dauer} · {t.ort}
                </div>
              </div>
              <span
                className={`cui-pill ${
                  t.status === "geplant"
                    ? "cui-pill-accent"
                    : "cui-pill-muted"
                }`}
              >
                {t.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Tab — Dokumente
   ═══════════════════════════════════════════════════════════════════════ */

function TabDokumente({ m: _m }: { m: MockMandant }) {
  const dokumente = [
    {
      id: 1,
      titel: "Pensionsplan_v3.pdf",
      typ: "Plan-Export",
      groesse: "1.2 MB",
      datum: "vor 2 Tagen",
    },
    {
      id: 2,
      titel: "PK-Ausweis_2026.pdf",
      typ: "Vorsorgeausweis",
      groesse: "240 KB",
      datum: "vor 4 Wochen",
    },
    {
      id: 3,
      titel: "Steuererklärung_2025.pdf",
      typ: "Steuern",
      groesse: "3.1 MB",
      datum: "vor 6 Wochen",
    },
    {
      id: 4,
      titel: "AHV-Auszug_IK.pdf",
      typ: "AHV",
      groesse: "180 KB",
      datum: "vor 8 Wochen",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[12.5px]" style={{ color: "var(--ink-3)" }}>
          {dokumente.length} Dokumente — verschlüsselt gespeichert (CH/EU)
        </p>
        <button type="button" className="cui-btn cui-btn-primary">
          <Plus className="h-4 w-4" />
          Hochladen
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {dokumente.map((d) => (
          <div
            key={d.id}
            className="flex items-center gap-3 rounded-[10px] border p-3 transition-colors hover:bg-[var(--surface-hover)]"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
              style={{
                background: "var(--surface-2)",
                color: "var(--ink-3)",
              }}
            >
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div
                className="truncate text-[12.5px] font-medium"
                style={{ color: "var(--ink)" }}
              >
                {d.titel}
              </div>
              <div
                className="text-[11px]"
                style={{ color: "var(--ink-3)" }}
              >
                {d.typ} · {d.groesse} · {d.datum}
              </div>
            </div>
            <button
              type="button"
              className="cui-btn cui-btn-ghost"
              title="Herunterladen"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Tab — Aktivität
   ═══════════════════════════════════════════════════════════════════════ */

function TabAktivitaet({ m: _m }: { m: MockMandant }) {
  return (
    <div
      className="rounded-[14px] border p-5"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <ActivityList />
    </div>
  );
}

function ActivityList({ kurz = false }: { kurz?: boolean }) {
  const eintraege = [
    {
      icon: FileText,
      text: "Plan A v3 gespeichert — PK-Bezug Mischlösung 50/50",
      datum: "vor 2 Tagen",
    },
    {
      icon: Calendar,
      text: "Folge-Termin gebucht für 11. Mai 2026, 14:00",
      datum: "vor 3 Tagen",
    },
    {
      icon: Pencil,
      text: "Wunsch-Verbrauch in Block 3 angepasst (CHF 9'500/Mt)",
      datum: "vor 5 Tagen",
    },
    {
      icon: FileText,
      text: "PK-Ausweis 2026 hochgeladen",
      datum: "vor 4 Wochen",
    },
    {
      icon: Activity,
      text: "Erst-Beratung durchgeführt (Lukas Fischer)",
      datum: "vor 5 Wochen",
    },
    {
      icon: Plus,
      text: "Mandant aufgenommen via Direkt-Akquise",
      datum: "vor 6 Wochen",
    },
  ];
  const liste = kurz ? eintraege.slice(0, 4) : eintraege;
  return (
    <div className="space-y-3">
      {liste.map((e, i) => {
        const Icon = e.icon;
        return (
          <div key={i} className="flex items-start gap-3">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
              style={{
                background: "var(--surface-2)",
                color: "var(--ink-3)",
              }}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 leading-tight">
              <div className="text-[12.5px]" style={{ color: "var(--ink)" }}>
                {e.text}
              </div>
              <div className="text-[11px]" style={{ color: "var(--ink-3)" }}>
                {e.datum}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Tab — Notizen
   ═══════════════════════════════════════════════════════════════════════ */

function TabNotizen({ m: _m }: { m: MockMandant }) {
  const [text, setText] = useState(
    "Kunde hat Interesse an PK-Einkauf 2026 (CHF 30k). Frau möchte ggf. " +
      "Frühpension 60 prüfen — Plan B als Alternativ-Szenario erstellt.\n\n" +
      "Wichtig: Hypothek Tranche 2 läuft Q3 2027 ab — Refinanzierung mit Saron " +
      "rechtzeitig prüfen, ggf. Festhypothek-Mischung."
  );
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[12.5px]" style={{ color: "var(--ink-3)" }}>
          Berater-interne Notizen — nicht für Mandant sichtbar
        </p>
        <button
          type="button"
          className="cui-btn cui-btn-primary"
          onClick={() =>
            alert("Speichern — kommt mit Etappe 4 (Supabase-Persist)")
          }
        >
          Speichern
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={14}
        className="w-full resize-none rounded-[14px] border p-4 text-[13px] leading-relaxed focus:outline-none"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          color: "var(--ink)",
          fontFamily: "var(--font-sans)",
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Hilfs-Komponenten
   ═══════════════════════════════════════════════════════════════════════ */

function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[14px] border p-5"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2
          className="text-[13px] font-semibold"
          style={{ color: "var(--ink)" }}
        >
          {title}
        </h2>
        {right}
      </div>
      {children}
    </div>
  );
}

function MiniLink({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="text-[11.5px] font-medium transition-colors hover:underline"
      style={{ color: "var(--accent-ink)" }}
    >
      {label} →
    </button>
  );
}

function PlanThumb({
  titel,
  version,
  datum,
  vermoegen,
  delta,
  aktiv,
}: {
  titel: string;
  version: string;
  datum: string;
  vermoegen: number;
  delta: number;
  aktiv?: boolean;
}) {
  return (
    <div
      className="cursor-pointer rounded-[10px] border p-3 transition-colors hover:bg-[var(--surface-hover)]"
      style={{
        background: aktiv ? "var(--accent-soft)" : "var(--surface-2)",
        borderColor: aktiv ? "var(--accent)" : "var(--border)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className="text-[12.5px] font-semibold"
          style={{ color: "var(--ink)" }}
        >
          {titel}
        </div>
        <span
          className={`cui-pill ${
            aktiv ? "cui-pill-accent" : "cui-pill-muted"
          }`}
        >
          {version}
        </span>
      </div>
      <div className="text-[11px]" style={{ color: "var(--ink-3)" }}>
        {datum}
      </div>
      <div
        className="mt-2 font-mono text-[15px] font-semibold tabular-nums"
        style={{ color: "var(--ink)" }}
      >
        {formatChf(vermoegen)}
      </div>
      <div
        className="font-mono text-[11px] tabular-nums"
        style={{ color: delta >= 0 ? "var(--pos)" : "var(--neg)" }}
      >
        {delta >= 0 ? (
          <TrendingUp className="mr-0.5 inline h-3 w-3" />
        ) : (
          <TrendingDown className="mr-0.5 inline h-3 w-3" />
        )}
        {delta >= 0 ? "+" : ""}
        {formatChf(delta)} bei Pension
      </div>
    </div>
  );
}

function MassnahmeRow({
  titel,
  text,
  ersparnis,
  prio,
}: {
  titel: string;
  text: string;
  ersparnis: number;
  prio: "hoch" | "mittel" | "niedrig";
}) {
  return (
    <div
      className="flex items-start gap-3 rounded-md border p-3"
      style={{
        background: "var(--surface-2)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex-1 leading-tight">
        <div className="flex items-center gap-2">
          <span
            className="text-[12.5px] font-medium"
            style={{ color: "var(--ink)" }}
          >
            {titel}
          </span>
          <span
            className={`cui-pill ${
              prio === "hoch"
                ? "cui-pill-warn"
                : prio === "mittel"
                ? "cui-pill-accent"
                : "cui-pill-muted"
            }`}
          >
            {prio}
          </span>
        </div>
        <div
          className="mt-0.5 text-[11.5px]"
          style={{ color: "var(--ink-3)" }}
        >
          {text}
        </div>
      </div>
      <div className="text-right">
        <div
          className="font-mono text-[12.5px] font-semibold tabular-nums"
          style={{ color: "var(--pos)" }}
        >
          +{formatChf(ersparnis)}
        </div>
        <div className="text-[10px]" style={{ color: "var(--ink-3)" }}>
          / Jahr
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: MandantStatus }) {
  const cfg = {
    aktiv: { label: "Aktiv", cls: "cui-pill-accent" },
    wartend: { label: "Wartend", cls: "cui-pill-warn" },
    abgeschlossen: { label: "Abgeschlossen", cls: "cui-pill-pos" },
    archiviert: { label: "Archiviert", cls: "cui-pill-muted" },
  }[status];
  return <span className={`cui-pill ${cfg.cls}`}>{cfg.label}</span>;
}

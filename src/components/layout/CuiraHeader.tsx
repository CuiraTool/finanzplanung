"use client";

import Image from "next/image";
import {
  ChevronDown,
  ExternalLink,
  FileText,
  Users,
  Heart,
  Download,
} from "lucide-react";
import { ViewModeToggle } from "./ViewModeToggle";
import { usePlanStore } from "@/lib/store";
import type { ViewMode } from "@/lib/view-mode";

/**
 * Cuira-Header (Phase 6 Pro-Modus Migration nach Cuira-Design-Handoff).
 *
 * Light-Topbar nach handoff_cuira_app/Cuira Pensionsplanung.html — alles
 * in einer 56px-Höhe:
 *   1. Logo-Chip (gefüllt)
 *   2. Tag-Label "Pensionsplanung · Pro"
 *   3. Mandant-Pill (Avatar + Name + Kanton) — dynamisch aus PlanStore
 *   4. Plan A/B Scenario-Tabs — synchron zu szenarioB.aktiv
 *   5. Autosave-Indikator
 *   6. PDF-Export-Button (→ /print)
 *   7. Mode-Switcher (Erfassung / Kunde / Cockpit)
 *   8. View-Mode-Toggle (Split/Wizard/Dashboard)
 *   9. Berater-Avatar (KM)
 */
interface Props {
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
}

export function CuiraHeader({ viewMode, onViewModeChange }: Props) {
  const fallart = usePlanStore((s) => s.fallart);
  const person1 = usePlanStore((s) => s.person1);
  const person2 = usePlanStore((s) => s.person2);
  const adresse = usePlanStore((s) => s.adresse);
  const szenarioBAktiv = usePlanStore((s) => s.szenarioB.aktiv);
  const setSzenarioBAktiv = usePlanStore((s) => s.setSzenarioBAktiv);
  const setAktiverBlock = usePlanStore((s) => s.setAktiverBlock);

  const isPaar = fallart === "paar";
  const initials = isPaar
    ? `${(person1.vorname || "?")[0]}${(person2.vorname || "?")[0]}`
    : `${(person1.vorname || "?")[0]}${(person1.nachname || "?")[0]}`;

  const mandantName = isPaar
    ? `Familie ${person1.nachname || "—"}`
    : person1.vorname || person1.nachname
    ? `${person1.vorname} ${person1.nachname}`.trim()
    : "Neuer Mandant";

  return (
    <header
      className="flex h-14 items-center gap-3 border-b px-4"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      {/* Logo-Chip */}
      <div
        className="inline-flex items-center gap-2 rounded-[10px] px-2.5 py-1.5 text-[13px] font-semibold tracking-wide text-white"
        style={{ background: "var(--cuira-deep)" }}
      >
        <Image
          src="/cuira-logo.png"
          alt="Cuira"
          width={88}
          height={22}
          priority
          className="h-5 w-auto"
        />
      </div>

      {/* Tag-Label */}
      <span
        className="hidden border-l pl-3 text-[10px] font-medium uppercase tracking-[0.12em] md:block"
        style={{
          borderColor: "var(--border)",
          color: "var(--ink-3)",
        }}
      >
        Pensionsplanung · Pro
      </span>

      {/* Mandant-Pill */}
      <button type="button" className="cui-topbar-mandant hidden md:inline-flex">
        <span className="cui-topbar-mandant-avatar">
          {initials.toUpperCase()}
        </span>
        <span className="cui-topbar-mandant-name">{mandantName}</span>
        {adresse.kanton && (
          <span className="cui-topbar-mandant-kanton">
            · {adresse.kanton}
          </span>
        )}
      </button>

      {/* Plan A/B-Scenario-Tabs */}
      <div className="cui-scenario-bar hidden md:inline-flex">
        <button
          type="button"
          className={`cui-scenario-tab ${!szenarioBAktiv ? "is-active" : ""}`}
          onClick={() => setSzenarioBAktiv(false)}
          title="Plan A — Hauptszenario"
        >
          <span className="cui-scenario-dot a"></span>
          Plan A
        </button>
        {szenarioBAktiv ? (
          <button
            type="button"
            className="cui-scenario-tab is-active"
            onClick={() => setAktiverBlock(11)}
            title="Plan B — Vergleichsszenario (Block 11)"
          >
            <span className="cui-scenario-dot b"></span>
            Plan B
            <span
              className="cui-scenario-x"
              onClick={(e) => {
                e.stopPropagation();
                setSzenarioBAktiv(false);
              }}
              title="Plan B deaktivieren"
            >
              ×
            </span>
          </button>
        ) : (
          <button
            type="button"
            className="cui-scenario-tab"
            onClick={() => {
              setSzenarioBAktiv(true);
              setAktiverBlock(11);
            }}
            title="Plan B aktivieren"
          >
            <span className="cui-scenario-dot b"></span>
            + Plan B
          </button>
        )}
      </div>

      <div className="flex-1" />

      {/* Autosave */}
      <span
        className="hidden items-center gap-2 text-[11px] sm:inline-flex"
        style={{ color: "var(--ink-3)" }}
      >
        <span className="cui-autosave-dot" />
        <span>Auto-Save</span>
      </span>

      {/* PDF-Export */}
      <a
        href="/print"
        target="_blank"
        rel="noopener noreferrer"
        className="cui-topbar-icon-btn"
        title="PDF-Export der Auswertung"
      >
        <Download className="h-4 w-4" />
      </a>

      {/* Mode-Switcher */}
      <ModeLinks />

      {/* View-Mode-Toggle */}
      <ViewModeToggle mode={viewMode} onChange={onViewModeChange} />

      {/* Berater-Avatar */}
      <div
        className="cui-topbar-avatar"
        title="Berater · Kathir Muthukumar"
      >
        KM
      </div>
    </header>
  );
}

/**
 * Mode-Switcher — Hover-Dropdown zu /erfassung, /kunde, /print.
 */
function ModeLinks() {
  return (
    <div className="group relative">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-md border bg-white px-2 py-1 text-[11px] font-medium transition-colors hover:bg-slate-50"
        style={{
          borderColor: "var(--border)",
          color: "var(--ink-2)",
        }}
        title="Andere Modi öffnen"
      >
        <ExternalLink className="h-3 w-3" />
        Modi
        <ChevronDown className="h-3 w-3" />
      </button>
      <div
        className="invisible absolute right-0 top-full z-50 mt-1 w-60 rounded-lg border bg-white p-1.5 opacity-0 shadow-[var(--shadow-pop)] transition-opacity group-hover:visible group-hover:opacity-100"
        style={{ borderColor: "var(--border)" }}
      >
        <a
          href="/erfassung"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-2.5 rounded-md p-2 text-left transition-colors hover:bg-slate-50"
        >
          <Users className="mt-0.5 h-4 w-4" style={{ color: "var(--accent)" }} />
          <div>
            <div
              className="text-[12.5px] font-medium"
              style={{ color: "var(--ink)" }}
            >
              Affiliate-Erfassung
            </div>
            <div className="text-[10.5px]" style={{ color: "var(--ink-3)" }}>
              /erfassung — V2 für Vertriebspartner
            </div>
          </div>
        </a>
        <a
          href="/kunde"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-2.5 rounded-md p-2 text-left transition-colors hover:bg-slate-50"
        >
          <Heart className="mt-0.5 h-4 w-4" style={{ color: "var(--accent)" }} />
          <div>
            <div
              className="text-[12.5px] font-medium"
              style={{ color: "var(--ink)" }}
            >
              Endkunden-Funnel
            </div>
            <div className="text-[10.5px]" style={{ color: "var(--ink-3)" }}>
              /kunde — V3 B2C-Self-Service
            </div>
          </div>
        </a>
        <a
          href="/app"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-2.5 rounded-md p-2 text-left transition-colors hover:bg-slate-50"
        >
          <FileText
            className="mt-0.5 h-4 w-4"
            style={{ color: "var(--accent)" }}
          />
          <div>
            <div
              className="text-[12.5px] font-medium"
              style={{ color: "var(--ink)" }}
            >
              Mandanten-Cockpit
            </div>
            <div className="text-[10.5px]" style={{ color: "var(--ink-3)" }}>
              /app — Berater-Dashboard
            </div>
          </div>
        </a>
      </div>
    </div>
  );
}

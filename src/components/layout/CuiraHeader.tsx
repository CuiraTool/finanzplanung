"use client";

import Image from "next/image";
import { ChevronDown, ExternalLink, FileText, Users, Heart } from "lucide-react";
import { ViewModeToggle } from "./ViewModeToggle";
import type { ViewMode } from "@/lib/view-mode";

/**
 * Cuira-Header (Phase 5.x Design-Handoff Look).
 *
 * Light-Topbar mit Cuira-Logo als gefüllter Chip links, Tag-Label
 * "Pensionsplanung", versteckter Modi-Switcher, View-Mode-Toggle rechts,
 * dezenter Autosave-Indikator.
 *
 * Mode-Switcher (Pro / Erfassung / Kunde) ist nur hier sichtbar — V2/V3
 * haben eigene minimalistische Header (siehe /erfassung + /kunde).
 */
interface Props {
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
}

export function CuiraHeader({ viewMode, onViewModeChange }: Props) {
  return (
    <header
      className="flex h-14 items-center gap-4 border-b px-5"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      {/* Logo-Chip */}
      <div
        className="inline-flex items-center gap-2.5 rounded-[10px] px-3 py-1.5 text-[13px] font-semibold tracking-wide text-white"
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
        Pensionsplanung
      </span>

      {/* Pro-Modus-Indikator + Modi-Switcher */}
      <div className="hidden items-center gap-2 md:flex">
        <span
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
          style={{
            background: "var(--accent-soft)",
            color: "var(--accent-ink)",
          }}
        >
          Pro
        </span>
        <ModeLinks />
      </div>

      <div className="flex-1" />

      {/* Autosave-Indikator */}
      <div
        className="hidden items-center gap-2 text-[11px] sm:flex"
        style={{ color: "var(--ink-3)" }}
      >
        <span className="cui-autosave-dot" />
        <span>Auto-Speicherung</span>
      </div>

      <ViewModeToggle mode={viewMode} onChange={onViewModeChange} />
    </header>
  );
}

/**
 * Versteckter Mode-Switcher mit Tooltip-Menü beim Hover.
 */
function ModeLinks() {
  return (
    <div className="group relative">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-md border bg-white px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-slate-50"
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
        className="invisible absolute left-0 top-full z-50 mt-1 w-60 rounded-lg border bg-white p-1.5 opacity-0 shadow-[var(--shadow-pop)] transition-opacity group-hover:visible group-hover:opacity-100"
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
              Berater-Erfassung
            </div>
            <div className="text-[10.5px]" style={{ color: "var(--ink-3)" }}>
              /erfassung — V2 für Affiliate-Berater
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
              Endkunden-Modus
            </div>
            <div className="text-[10.5px]" style={{ color: "var(--ink-3)" }}>
              /kunde — V3 B2C-Self-Service
            </div>
          </div>
        </a>
        <a
          href="/print"
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
              Druckversion
            </div>
            <div className="text-[10.5px]" style={{ color: "var(--ink-3)" }}>
              /print — PDF-Export der Auswertung
            </div>
          </div>
        </a>
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import { ViewModeToggle } from "./ViewModeToggle";
import type { ViewMode } from "@/lib/view-mode";

/**
 * Cuira-Header — offizielles Wordmark-Logo (weisse Version) auf
 * Cuira-Dunkelblau-Hintergrund, plus Tool-Bezeichnung und View-Mode-Toggle.
 *
 * Plus: Modus-Switcher (Pro / Erfassung / Kunde) — nur im Pro-Header
 * sichtbar, da nur Kathir + Cuira-Berater zwischen den Modi wechseln.
 * V2 (/erfassung) und V3 (/kunde) zeigen den Switcher NICHT (Cross-Links
 * würden Endkunden verwirren).
 *
 * Logo-Quelle: cuirapartners.ch (Cuira-Schriftzug-weiss-DEF.png), lokal
 * unter public/cuira-logo.png hinterlegt.
 */
interface Props {
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
}

export function CuiraHeader({ viewMode, onViewModeChange }: Props) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-[var(--color-cuira-deep)] px-6 py-3 text-white">
      <div className="flex items-center gap-4">
        <Image
          src="/cuira-logo.png"
          alt="Cuira Partners"
          width={140}
          height={60}
          priority
          className="h-10 w-auto"
        />
        <div className="hidden border-l border-white/20 pl-4 leading-tight md:block">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-300">
            Pensionsplanung
          </div>
          <div className="text-[9px] uppercase tracking-wider text-emerald-300/80">
            Pro-Modus
          </div>
        </div>
        <ModeLinks />
      </div>
      <ViewModeToggle mode={viewMode} onChange={onViewModeChange} />
    </header>
  );
}

/**
 * Versteckter Mode-Switcher — als kleines Tooltip-Menü beim Hover über
 * "↗ andere Modi". Nur Kathir / Cuira-Berater bekommen das zu sehen
 * (auf der Hauptseite /). V2 + V3 haben das nicht.
 */
function ModeLinks() {
  return (
    <div className="group relative hidden md:block">
      <button
        type="button"
        className="rounded border border-white/20 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-200 transition-colors hover:bg-white/10"
        title="Andere Modi öffnen"
      >
        ↗ Modi
      </button>
      <div className="invisible absolute left-0 top-full z-50 mt-1 w-56 rounded-md border border-slate-200 bg-white p-2 text-slate-900 opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100">
        <a
          href="/erfassung"
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded px-2 py-1.5 text-xs hover:bg-slate-50"
        >
          <div className="font-medium">📋 Berater-Erfassung</div>
          <div className="text-[10px] text-slate-500">
            /erfassung — V2 für Affiliate-Berater
          </div>
        </a>
        <a
          href="/kunde"
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded px-2 py-1.5 text-xs hover:bg-slate-50"
        >
          <div className="font-medium">🤝 Endkunden-Modus</div>
          <div className="text-[10px] text-slate-500">
            /kunde — V3 für B2C-Self-Service
          </div>
        </a>
        <a
          href="/print"
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded px-2 py-1.5 text-xs hover:bg-slate-50"
        >
          <div className="font-medium">📄 Druckversion</div>
          <div className="text-[10px] text-slate-500">
            /print — PDF-Export der Auswertung
          </div>
        </a>
      </div>
    </div>
  );
}

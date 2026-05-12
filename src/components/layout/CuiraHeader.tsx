"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ChevronDown,
  ExternalLink,
  FileText,
  Users,
  Heart,
  Download,
  RotateCcw,
  GitBranch,
  UserCog,
} from "lucide-react";
import { ViewModeToggle } from "./ViewModeToggle";
import { PlanVersionenModal } from "./PlanVersionen";
import { BeraterProfilEditor } from "./BeraterProfilEditor";
import { useBeraterProfil } from "@/lib/berater-profil";
import { usePlanStore } from "@/lib/store";
import { usePlanVersionenStore } from "@/lib/plan-versionen";
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
  const { profil: beraterProfil } = useBeraterProfil();
  const [versionenOpen, setVersionenOpen] = useState(false);
  const [beraterOpen, setBeraterOpen] = useState(false);
  const [planCDialogOpen, setPlanCDialogOpen] = useState(false);
  const [planSwitchToast, setPlanSwitchToast] = useState<string | null>(null);
  const [undoDeletePlan, setUndoDeletePlan] = useState<
    null | { slot: "b" | "c"; data: import("@/lib/store").PlanVariantData; until: number }
  >(null);
  const versionenCount = usePlanVersionenStore((s) => s.versionen.length);
  const fallart = usePlanStore((s) => s.fallart);
  const person1 = usePlanStore((s) => s.person1);
  const person2 = usePlanStore((s) => s.person2);
  const adresse = usePlanStore((s) => s.adresse);
  const aktiverPlan = usePlanStore((s) => s.aktiverPlan);
  const plaene = usePlanStore((s) => s.plaene);
  const erstellePlan = usePlanStore((s) => s.erstellePlan);
  const wechsleZuPlanRaw = usePlanStore((s) => s.wechsleZuPlan);
  const loeschePlanRaw = usePlanStore((s) => s.loeschePlan);
  const setPlanVariant = usePlanStore((s) => s.setPlanVariant);

  const wechsleZuPlan = (slot: "a" | "b" | "c") => {
    const von = aktiverPlan;
    wechsleZuPlanRaw(slot);
    if (slot !== von) {
      setPlanSwitchToast(`Plan ${von.toUpperCase()} gespeichert. Jetzt in Plan ${slot.toUpperCase()}.`);
      setTimeout(() => setPlanSwitchToast(null), 2500);
    }
  };

  const loeschePlanMitUndo = (slot: "b" | "c") => {
    const data = plaene[slot];
    if (!data) return;
    loeschePlanRaw(slot);
    setUndoDeletePlan({ slot, data, until: Date.now() + 8000 });
    setTimeout(() => {
      setUndoDeletePlan((prev) =>
        prev && prev.until <= Date.now() ? null : prev
      );
    }, 8200);
  };

  const undoDelete = () => {
    if (!undoDeletePlan) return;
    setPlanVariant(undoDeletePlan.slot, undoDeletePlan.data);
    setUndoDeletePlan(null);
  };
  const setAktiverBlock = usePlanStore((s) => s.setAktiverBlock);
  const reset = usePlanStore((s) => s.reset);

  const handleReset = () => {
    if (
      typeof window !== "undefined" &&
      window.confirm(
        "Plan komplett zurücksetzen?\n\nAlle Eingaben werden gelöscht — der Plan startet leer wie für einen neuen Mandanten. Die im Browser gespeicherten Daten werden überschrieben.\n\nFortfahren?"
      )
    ) {
      reset();
    }
  };

  const isPaar = fallart === "paar";

  // Mandant-Namen-Logik:
  //  • Einzel: "Anna Keller" (oder "Anna" wenn nur Vorname)
  //  • Paar mit gemeinsamem Nachname: "Familie Keller"
  //  • Paar mit unterschiedlichen Nachnamen: "Anna + Marc"
  //  • Paar nur Vornamen: "Anna + Marc"
  //  • Wenn keine Namen erfasst: "Neuer Mandant"
  const p1Voll = `${person1.vorname} ${person1.nachname}`.trim();
  const p2Voll = `${person2.vorname} ${person2.nachname}`.trim();
  const hatPersonenNamen = !!(p1Voll || (isPaar && p2Voll));

  let mandantName: string;
  if (!hatPersonenNamen) {
    mandantName = "Neuer Mandant";
  } else if (!isPaar) {
    mandantName = p1Voll || person1.vorname || "Neuer Mandant";
  } else if (
    person1.nachname &&
    person2.nachname &&
    person1.nachname === person2.nachname
  ) {
    mandantName = `Familie ${person1.nachname}`;
  } else if (person1.vorname && person2.vorname) {
    mandantName = `${person1.vorname} + ${person2.vorname}`;
  } else {
    mandantName = p1Voll || p2Voll || "Neuer Mandant";
  }

  // Initialen-Avatar — fallback "?" wenn nichts erfasst
  const ini = (s: string) => (s ? s[0]!.toUpperCase() : "?");
  const initials = isPaar
    ? `${ini(person1.vorname || person1.nachname)}${ini(person2.vorname || person2.nachname)}`
    : person1.vorname || person1.nachname
    ? `${ini(person1.vorname)}${ini(person1.nachname)}`.replace(/\?+/g, "?")
    : "??";

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
          {initials}
        </span>
        <span className="cui-topbar-mandant-name">{mandantName}</span>
        {adresse.kanton && (
          <span className="cui-topbar-mandant-kanton">
            · {adresse.kanton}
          </span>
        )}
      </button>

      {/* Plan A/B/C — Vollvarianten (V35) */}
      <div className="cui-scenario-bar hidden md:inline-flex">
        <button
          type="button"
          className={`cui-scenario-tab ${aktiverPlan === "a" ? "is-active" : ""}`}
          onClick={() => wechsleZuPlan("a")}
          title="Plan A — Basis"
        >
          <span className="cui-scenario-dot a"></span>
          Plan A
        </button>

        {plaene.b ? (
          <button
            type="button"
            className={`cui-scenario-tab ${aktiverPlan === "b" ? "is-active" : ""}`}
            onClick={() => wechsleZuPlan("b")}
            title="Plan B — Variante"
          >
            <span className="cui-scenario-dot b"></span>
            Plan B
            <span
              className="cui-scenario-x"
              onClick={(e) => {
                e.stopPropagation();
                loeschePlanMitUndo("b");
              }}
              title="Plan B löschen"
            >
              ×
            </span>
          </button>
        ) : (
          <button
            type="button"
            className="cui-scenario-tab"
            onClick={() => erstellePlan("b", "a")}
            title="Plan B erstellen — klont aktuellen Plan A"
          >
            <span className="cui-scenario-dot b"></span>
            + Plan B
          </button>
        )}

        {plaene.c ? (
          <button
            type="button"
            className={`cui-scenario-tab ${aktiverPlan === "c" ? "is-active" : ""}`}
            onClick={() => wechsleZuPlan("c")}
            title="Plan C — Variante"
          >
            <span className="cui-scenario-dot c"></span>
            Plan C
            <span
              className="cui-scenario-x"
              onClick={(e) => {
                e.stopPropagation();
                loeschePlanMitUndo("c");
              }}
              title="Plan C löschen"
            >
              ×
            </span>
          </button>
        ) : plaene.b ? (
          <button
            type="button"
            className="cui-scenario-tab"
            onClick={() => setPlanCDialogOpen(true)}
            title="Plan C erstellen — Basis A oder B wählbar"
          >
            <span className="cui-scenario-dot c"></span>
            + Plan C
          </button>
        ) : null}
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

      {/* Versionen */}
      <button
        type="button"
        onClick={() => setVersionenOpen(true)}
        className="cui-topbar-icon-btn relative"
        title={`Plan-Versionen (${versionenCount})`}
      >
        <GitBranch className="h-4 w-4" />
        {versionenCount > 0 && (
          <span
            className="absolute -right-1 -top-1 inline-flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-1 text-[9px] font-medium text-white"
            style={{ background: "var(--accent)" }}
          >
            {versionenCount}
          </span>
        )}
      </button>

      {/* Berater-Profil bearbeiten */}
      <button
        type="button"
        onClick={() => setBeraterOpen(true)}
        className="cui-topbar-icon-btn"
        title="Berater-Profil bearbeiten (Foto, Telefon, Office)"
        aria-label="Berater-Profil bearbeiten"
      >
        <UserCog className="h-4 w-4" />
      </button>

      {/* Reset-Plan */}
      <button
        type="button"
        onClick={handleReset}
        className="cui-topbar-icon-btn"
        title="Plan zurücksetzen — alle Eingaben löschen (für neuen Mandant)"
        aria-label="Plan zurücksetzen"
      >
        <RotateCcw className="h-4 w-4" />
      </button>

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
        title={`Berater · ${beraterProfil.name}`}
      >
        {beraterProfil.name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((w) => w[0]?.toUpperCase() ?? "")
          .join("") || "?"}
      </div>

      <PlanVersionenModal
        open={versionenOpen}
        onClose={() => setVersionenOpen(false)}
      />
      <BeraterProfilEditor
        open={beraterOpen}
        onClose={() => setBeraterOpen(false)}
      />

      {/* Plan-C-Basis-Modal (E2-9 PL3): ersetzt window.confirm */}
      {planCDialogOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setPlanCDialogOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="planc-modal-title"
            className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="planc-modal-title" className="mb-3 text-base font-semibold text-slate-800">
              Plan C erstellen — Basis wählen
            </h2>
            <p className="mb-4 text-xs text-slate-600">
              Plan C wird als Klon des gewählten Basis-Plans erstellt. Sie
              können danach Werte einzeln anpassen.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  erstellePlan("c", "a");
                  setPlanCDialogOpen(false);
                }}
                className="rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800 hover:bg-blue-100"
              >
                Basis: Plan A
              </button>
              <button
                type="button"
                onClick={() => {
                  erstellePlan("c", "b");
                  setPlanCDialogOpen(false);
                }}
                className="rounded-md border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-800 hover:bg-violet-100"
              >
                Basis: Plan B
              </button>
            </div>
            <button
              type="button"
              onClick={() => setPlanCDialogOpen(false)}
              className="mt-3 w-full rounded-md px-3 py-1.5 text-xs text-slate-500 hover:underline"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Plan-Switch-Toast */}
      {planSwitchToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-1/2 z-[120] -translate-x-1/2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg"
        >
          ✓ {planSwitchToast}
        </div>
      )}

      {/* Plan-Löschen-Undo-Snackbar (E2-9 PL4): 8s rückgängig-Option */}
      {undoDeletePlan && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-[120] flex items-center gap-3 rounded-md bg-slate-800 px-4 py-2 text-sm text-white shadow-lg"
        >
          <span>
            Plan {undoDeletePlan.slot.toUpperCase()} gelöscht
          </span>
          <button
            type="button"
            onClick={undoDelete}
            className="rounded-md bg-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/20"
          >
            Rückgängig
          </button>
          <button
            type="button"
            onClick={() => setUndoDeletePlan(null)}
            className="text-white/60 hover:text-white"
            aria-label="Schliessen"
          >
            ✕
          </button>
        </div>
      )}
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
        className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors hover:bg-[var(--surface-hover)]"
        style={{
          background: "var(--surface)",
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
        className="invisible absolute right-0 top-full z-50 mt-1 w-60 rounded-lg border p-1.5 opacity-0 shadow-[var(--shadow-pop)] transition-opacity group-hover:visible group-hover:opacity-100"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <a
          href="/erfassung"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-2.5 rounded-md p-2 text-left transition-colors hover:bg-[var(--surface-hover)]"
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
          className="flex items-start gap-2.5 rounded-md p-2 text-left transition-colors hover:bg-[var(--surface-hover)]"
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
          className="flex items-start gap-2.5 rounded-md p-2 text-left transition-colors hover:bg-[var(--surface-hover)]"
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

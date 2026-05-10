"use client";

import type { ViewMode } from "@/lib/view-mode";

interface Props {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
}

/**
 * Drei-Knopf-Toggle im Header für die Hauptansicht-Modi.
 * Cuira-Tokens auf der light Topbar — segmented control style (analog
 * .cui-seg in globals.css, hier inline für Topbar-Höhe).
 */
export function ViewModeToggle({ mode, onChange }: Props) {
  return (
    <div
      className="flex items-center gap-0.5 rounded-md border p-0.5"
      style={{
        background: "var(--surface-2)",
        borderColor: "var(--border)",
      }}
    >
      <ModeButton
        active={mode === "wizard"}
        onClick={() => onChange("wizard")}
        title="Nur Wizard — Eingabe ohne Dashboard-Ablenkung"
        label="Wizard"
        icon={<IconWizard />}
      />
      <ModeButton
        active={mode === "split"}
        onClick={() => onChange("split")}
        title="Split — Eingabe + Dashboard nebeneinander"
        label="Split"
        icon={<IconSplit />}
      />
      <ModeButton
        active={mode === "dashboard"}
        onClick={() => onChange("dashboard")}
        title="Nur Dashboard — Präsentation/Review"
        label="Dashboard"
        icon={<IconDashboard />}
      />
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  title,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className="flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors"
      style={{
        background: active ? "var(--surface)" : "transparent",
        color: active ? "var(--cuira-deep)" : "var(--ink-2)",
        boxShadow: active ? "var(--shadow-card)" : undefined,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.color = "var(--ink)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.color = "var(--ink-2)";
      }}
    >
      <span className="size-3.5">{icon}</span>
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

function IconWizard() {
  // Linkes Panel breit, rechtes schmal (Eingabe-fokus)
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
      <line x1="11" y1="2.5" x2="11" y2="13.5" />
    </svg>
  );
}

function IconSplit() {
  // Beide Panels gleich breit
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
      <line x1="8" y1="2.5" x2="8" y2="13.5" />
    </svg>
  );
}

function IconDashboard() {
  // Linkes Panel schmal, rechtes breit (Dashboard-fokus)
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
      <line x1="5" y1="2.5" x2="5" y2="13.5" />
    </svg>
  );
}

"use client";

import type { ViewMode } from "@/lib/view-mode";

interface Props {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
}

/**
 * Drei-Knopf-Toggle im Header für die Hauptansicht-Modi.
 * Icons aus Unicode (kein extra Lucide-Dependency).
 */
export function ViewModeToggle({ mode, onChange }: Props) {
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-white/15 bg-white/5 p-0.5">
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
      className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs transition ${
        active
          ? "bg-white text-[var(--color-cuira-deep)]"
          : "text-white/80 hover:bg-white/10"
      }`}
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

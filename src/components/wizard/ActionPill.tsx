"use client";

/**
 * Konsistenter "Action-Pill"-Button für die Wizard-Header-Aktionen
 * (Dokumente hochladen / Geführter Flow / Daten importieren).
 *
 * Cuira-Brand-Style: outlined in Cuira-Deep mit subtiler Hover-Füllung.
 * Aktiver Zustand = invertiert (gefüllt).
 */
interface Props {
  icon: string; // Emoji oder Unicode-Symbol
  label: string;
  onClick: () => void;
  /** True wenn das zugehörige Panel offen ist — dann "gedrückt"-Look. */
  active?: boolean;
  /** Optional: kleine Caret/Pfeil rechts. */
  caret?: "right" | "down" | null;
  title?: string;
}

export function ActionPill({
  icon,
  label,
  onClick,
  active = false,
  caret = null,
  title,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`flex w-full items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors sm:w-auto ${
        active
          ? "border-[var(--color-cuira-deep)] bg-[var(--color-cuira-deep)] text-white shadow-sm"
          : "border-[var(--color-cuira-deep)]/30 bg-white text-[var(--color-cuira-deep)] hover:border-[var(--color-cuira-deep)] hover:bg-[var(--color-cuira-deep)]/5"
      }`}
    >
      <span aria-hidden className="text-sm leading-none">
        {icon}
      </span>
      <span className="flex-1 text-left">{label}</span>
      {caret === "right" && <span aria-hidden>→</span>}
      {caret === "down" && (
        <span
          aria-hidden
          className={`transition-transform ${active ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      )}
    </button>
  );
}

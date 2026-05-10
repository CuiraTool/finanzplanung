/**
 * Form-Field-Wrapper mit Label und optionalem Hint.
 *
 * Phase 5.x: nutzt Cuira-Design-Tokens (--ink-2 für Label, --ink-3 für Hint).
 * Phase 6 (KI): optional `info` für KI-Erklärung-Tooltip neben dem Label.
 *
 * Layout (geändert): Label oben, Input direkt darunter, Hint NACH dem
 * Input. So bleiben Felder in einem Grid auf gleicher Höhe, auch wenn
 * nur eines einen Hint hat (vorher schob der Hint das Input nach unten).
 */
export function Field({
  label,
  hint,
  info,
  children,
}: {
  label: string;
  hint?: string;
  /** Optional: ReactNode neben dem Label (z.B. KiHinweis-Komponente). */
  info?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div
        className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium"
        style={{ color: "var(--ink-2)" }}
      >
        <span>{label}</span>
        {info}
      </div>
      {children}
      {hint && (
        <div
          className="mt-1 text-[11px]"
          style={{ color: "var(--ink-3)" }}
        >
          {hint}
        </div>
      )}
    </label>
  );
}

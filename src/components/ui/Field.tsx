/**
 * Form-Field-Wrapper mit Label und optionalem Hint.
 *
 * Phase 5.x: nutzt Cuira-Design-Tokens (--ink-2 für Label, --ink-3 für Hint).
 */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div
        className="mb-1.5 text-[12px] font-medium"
        style={{ color: "var(--ink-2)" }}
      >
        {label}
      </div>
      {hint && (
        <div
          className="mb-1.5 text-[11px]"
          style={{ color: "var(--ink-3)" }}
        >
          {hint}
        </div>
      )}
      {children}
    </label>
  );
}

/**
 * Fieldset mit Legend und optionalem Hint — vereinheitlicht alle Wizard-Blocks.
 *
 * Phase 5.x: nutzt Cuira-Design-Tokens (--surface, --border, --ink, --ink-3).
 */
export function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset
      className="space-y-3 rounded-[14px] border p-4"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <legend
        className="px-1 text-[14px] font-semibold"
        style={{ color: "var(--ink)" }}
      >
        {title}
        {hint && (
          <span
            className="ml-2 text-[11.5px] font-normal"
            style={{ color: "var(--ink-3)" }}
          >
            {hint}
          </span>
        )}
      </legend>
      {children}
    </fieldset>
  );
}

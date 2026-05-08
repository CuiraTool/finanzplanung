/**
 * Fieldset mit Legend und optionalem Hint — vereinheitlicht alle Wizard-Blocks.
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
    <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <legend className="px-1 text-sm font-semibold text-slate-700">
        {title}
        {hint && <span className="ml-2 text-xs font-normal text-slate-400">{hint}</span>}
      </legend>
      {children}
    </fieldset>
  );
}

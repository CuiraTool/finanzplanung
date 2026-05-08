/**
 * Kleine KPI-Pille für Aktiva/Schulden/Netto — vorher in Block 7 + Block 8 dupliziert.
 */
export function KpiPill({
  label,
  value,
  positive,
  bold,
}: {
  label: string;
  value: string;
  positive?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-center">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div
        className={`tabular-nums ${bold ? "text-base font-semibold" : "text-sm"} ${
          positive ? "text-emerald-700" : "text-slate-700"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

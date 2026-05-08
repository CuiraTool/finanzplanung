/**
 * Standardisiertes Ja/Nein-Toggle — vorher in Block 4, 5, 9 jeweils dupliziert.
 */
export function YesNoButtons({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex gap-2">
      {[
        { v: true, l: "Ja" },
        { v: false, l: "Nein" },
      ].map((o) => (
        <button
          key={o.l}
          type="button"
          onClick={() => onChange(o.v)}
          className={`flex-1 rounded-md border px-3 py-2 text-sm transition ${
            value === o.v
              ? "border-blue-600 bg-blue-50 text-blue-700"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
          }`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

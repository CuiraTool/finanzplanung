/**
 * Schweizer Zahlen-Formatierung.
 * CHF-Beträge mit Apostroph-Tausendertrennung (CH-Konvention),
 * z.B. 33072 → "33'072".
 */
export function formatChf(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "CHF",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatChfPlain(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("de-CH", {
    maximumFractionDigits: 0,
  }).format(value);
}

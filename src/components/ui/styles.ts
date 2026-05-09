/**
 * Geteilte Tailwind-Klassen-Strings für Form-Elemente.
 *
 * Phase 5.x: nutzt die Cuira-Design-Tokens aus globals.css
 * (--surface, --border, --ink, --accent, --row-h, --radius).
 *
 * Wirkt automatisch in allen Wizard-Blöcken (Block1Personen,
 * Block2Wuensche, Block3Budget, ...) ohne dass dort etwas geändert
 * werden muss.
 */

export const inputClass =
  "w-full h-[var(--row-h)] rounded-[10px] border bg-[var(--surface)] px-3 text-[14px] text-[var(--ink)] outline-none transition-[border-color,box-shadow,background] " +
  "border-[var(--border)] hover:border-[var(--border-strong)] " +
  "focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_15%,transparent)]";

export const selectClass = `${inputClass} appearance-none pr-8 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 12 12%22><path fill=%22%238390a3%22 d=%22M6 8L2 4h8z%22/></svg>')] bg-[length:12px] bg-[right_10px_center] bg-no-repeat`;

export const labelClass =
  "block text-[12px] font-medium text-[var(--ink-2)] mb-1.5";

export const hintClass =
  "text-[11.5px] text-[var(--ink-3)] mt-1 leading-snug";

/**
 * Geteilte Tailwind-Klassen-Strings für Form-Elemente — vorher in jedem
 * Block-File dupliziert. Bei Style-Änderungen reicht jetzt eine Stelle.
 */

export const inputClass =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

export const selectClass = `${inputClass} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 12 12%22><path fill=%22%2364748b%22 d=%22M6 8L2 4h8z%22/></svg>')] bg-[length:12px] bg-[right_10px_center] bg-no-repeat pr-8`;

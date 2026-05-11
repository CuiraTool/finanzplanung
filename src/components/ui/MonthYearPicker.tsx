"use client";

import { selectClass } from "./styles";

const MONATE = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

const HEUTE_JAHR = new Date().getFullYear();
const JAHR_MIN = HEUTE_JAHR - 5;
const JAHR_MAX = HEUTE_JAHR + 60;

interface Props {
  value: string; // "YYYY-MM" oder leer
  onChange: (v: string) => void;
  allowEmpty?: boolean; // Bis-Feld: leer erlaubt
  emptyLabel?: string;
}

/**
 * Cross-browser-konsistenter Monat/Jahr-Picker.
 * Speichert "YYYY-MM" — kompatibel mit dem alten input[type=month].
 *
 * Bei `allowEmpty` (typisch für Bis-Datum): zusätzliche "—"-Option;
 * wenn der User sie wählt, wird ein leerer String emitted.
 */
export function MonthYearPicker({
  value,
  onChange,
  allowEmpty,
  emptyLabel = "—",
}: Props) {
  const [yearStr, monthStr] = value.split("-");
  const year = yearStr ? Number(yearStr) : null;
  const month = monthStr ? Number(monthStr) : null;

  const setMonth = (newMonth: number | null) => {
    if (newMonth == null) {
      onChange("");
      return;
    }
    const y = year ?? HEUTE_JAHR;
    onChange(`${y}-${String(newMonth).padStart(2, "0")}`);
  };
  const setYear = (newYear: number | null) => {
    if (newYear == null) {
      onChange("");
      return;
    }
    const m = month ?? 1;
    onChange(`${newYear}-${String(m).padStart(2, "0")}`);
  };

  return (
    <div className="grid grid-cols-[1fr_78px] gap-1">
      <select
        value={month ?? ""}
        onChange={(e) =>
          setMonth(e.target.value === "" ? null : Number(e.target.value))
        }
        className={selectClass}
      >
        {allowEmpty && <option value="">{emptyLabel}</option>}
        {!allowEmpty && month == null && <option value="">— Monat —</option>}
        {MONATE.map((label, idx) => (
          <option key={idx} value={idx + 1}>
            {label}
          </option>
        ))}
      </select>
      <select
        value={year ?? ""}
        onChange={(e) =>
          setYear(e.target.value === "" ? null : Number(e.target.value))
        }
        className={`${selectClass} tabular-nums`}
      >
        {allowEmpty && <option value="">{emptyLabel}</option>}
        {!allowEmpty && year == null && <option value="">— Jahr —</option>}
        {jahresliste().map((j) => (
          <option key={j} value={j}>
            {j}
          </option>
        ))}
      </select>
    </div>
  );
}

function jahresliste(): number[] {
  const out: number[] = [];
  for (let j = JAHR_MIN; j <= JAHR_MAX; j++) out.push(j);
  return out;
}

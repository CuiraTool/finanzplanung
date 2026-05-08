"use client";

import { inputClass } from "./styles";

/**
 * Number-Input mit korrektem null-Handling für CHF-Beträge.
 *
 * Adressiert die wiederholte Pattern in 25+ Stellen:
 *   value={x ?? ""}, onChange parses: e.target.value === "" ? null : Number(...)
 *
 * Beim Leeren des Felds wird null gespeichert (nicht 0), beim Eingeben
 * ein Number. Verhindert NaN/0-Drift bei leerem Input.
 */
export function MoneyInput({
  value,
  onChange,
  placeholder,
  className = "",
  ariaLabel,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      value={value ?? ""}
      onChange={(e) =>
        onChange(e.target.value === "" ? null : Number(e.target.value))
      }
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={`${inputClass} tabular-nums ${className}`}
    />
  );
}

/**
 * Number-Input für ganzzahlige Jahre (z.B. Auszahlungsjahr, Verkaufsjahr).
 * Nutzt aktuelles Jahr als Default-Min, damit retrograde Eingaben unwahrscheinlicher werden.
 */
export function YearInput({
  value,
  onChange,
  min = 2024,
  max = 2080,
  className = "",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  className?: string;
}) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e) => {
        const v = e.target.value === "" ? value : Number(e.target.value);
        if (Number.isFinite(v)) onChange(v);
      }}
      className={`${inputClass} tabular-nums ${className}`}
    />
  );
}

/**
 * Number-Input für Prozent-Werte (Rendite, Zinssatz, Kapitalanteil).
 */
export function PercentInput({
  value,
  onChange,
  min = 0,
  max = 20,
  step = 0.1,
  className = "",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      min={min}
      max={max}
      value={value}
      onChange={(e) => {
        const v = e.target.value === "" ? value : Number(e.target.value);
        if (Number.isFinite(v)) onChange(v);
      }}
      className={`${inputClass} tabular-nums ${className}`}
    />
  );
}

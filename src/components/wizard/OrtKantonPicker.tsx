"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import locations2025 from "@/engine/steuer-data/2025/locations.json";
import type { LocationData } from "@/engine/steuer-engine/types";

const ALL_LOCATIONS = locations2025 as LocationData[];

const inputClass =
  "w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200";

interface Props {
  /** Aktueller Ort/Gemeindename. */
  value: string;
  /** BfsID falls schon ausgewählt — damit wir wissen, ob Wert von Picker oder Freitext kommt. */
  bfsId: number | null;
  onChange: (patch: {
    ort: string;
    kanton: string;
    gemeindeBfsId: number | null;
    gemeindeName: string;
  }) => void;
  placeholder?: string;
}

/**
 * Kombinierter Ort/Gemeinde-Picker mit Autocomplete.
 *
 * User tippt im Ort-Feld an → bekommt eine Liste passender Schweizer
 * Gemeinden. Beim Auswählen wird automatisch:
 *   - ort = BfsName
 *   - kanton = Canton-Code (z.B. "ZH")
 *   - gemeindeBfsId = BfsID (für genauen Steuerfuss)
 *   - gemeindeName = BfsName
 *
 * Datenquelle: locations.json (alle ~2'500 Schweizer Gemeinden).
 */
export function OrtKantonPicker({
  value,
  bfsId,
  onChange,
  placeholder = "z.B. Zürich, Männedorf, Zug …",
}: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync von außen
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Click-Outside schließt Dropdown
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const treffer = useMemo<LocationData[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    // Match auf BfsName (case-insensitive); zuerst Prefix-Treffer, dann
    // sonstige Substring-Treffer; pro Gemeinde nur einen Eintrag (BfsID
    // sollte unique sein, ist es aber nicht 100% — ein paar Doubletten in
    // den ESTV-Daten, daher dedup auf BfsID).
    const seen = new Set<number>();
    const prefix: LocationData[] = [];
    const sub: LocationData[] = [];
    for (const l of ALL_LOCATIONS) {
      const name = l.BfsName.toLowerCase();
      if (seen.has(l.BfsID)) continue;
      if (name.startsWith(q)) {
        seen.add(l.BfsID);
        prefix.push(l);
      } else if (name.includes(q)) {
        seen.add(l.BfsID);
        sub.push(l);
      }
      if (prefix.length + sub.length >= 30) break;
    }
    return [...prefix, ...sub].slice(0, 12);
  }, [query]);

  const handleSelect = (l: LocationData) => {
    onChange({
      ort: l.BfsName,
      kanton: l.Canton,
      gemeindeBfsId: l.BfsID,
      gemeindeName: l.BfsName,
    });
    setQuery(l.BfsName);
    setOpen(false);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, treffer.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const t = treffer[highlighted];
      if (t) handleSelect(t);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          const v = e.target.value;
          setQuery(v);
          setOpen(true);
          setHighlighted(0);
          // Wenn User tippt, BfsID temporär löschen — wird beim Auswählen wieder gesetzt
          if (bfsId != null) {
            onChange({
              ort: v,
              kanton: "",
              gemeindeBfsId: null,
              gemeindeName: "",
            });
          } else {
            // freitext-Fallback: setze nur ort, lass kanton wie es ist
            onChange({
              ort: v,
              kanton: "",
              gemeindeBfsId: null,
              gemeindeName: "",
            });
          }
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        className={inputClass}
        autoComplete="off"
      />
      {bfsId != null && (
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-emerald-600">
          ✓
        </span>
      )}
      {open && treffer.length > 0 && (
        <ul className="absolute left-0 right-0 z-30 mt-1 max-h-72 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {treffer.map((l, idx) => (
            <li key={`${l.BfsID}-${idx}`}>
              <button
                type="button"
                onMouseEnter={() => setHighlighted(idx)}
                onMouseDown={(e) => {
                  // mousedown statt click damit blur nicht vorher feuert
                  e.preventDefault();
                  handleSelect(l);
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm ${
                  highlighted === idx
                    ? "bg-[var(--color-cuira-deep)]/5"
                    : "hover:bg-slate-50"
                }`}
              >
                <span className="text-slate-800">{l.BfsName}</span>
                <span className="text-xs text-slate-500">{l.Canton}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && query.trim().length >= 2 && treffer.length === 0 && (
        <div className="absolute left-0 right-0 z-30 mt-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-lg">
          Keine Gemeinde gefunden — du kannst den Ort als Freitext belassen
          und den Kanton manuell wählen.
        </div>
      )}
    </div>
  );
}

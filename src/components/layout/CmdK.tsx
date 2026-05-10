"use client";

/**
 * ⌘K Command-Palette für den Pro-Modus (Phase 6 Migration).
 *
 * Schneller Sprung zu einem der 11 Wizard-Blöcke. Open via ⌘K (oder
 * Strg+K), Type → Filter, ↑↓ → Auswahl, Enter → Spring zu Block.
 *
 * Bewusst minimal gehalten — der Handoff hat zusätzlich Quick-Actions
 * ("Plan B erstellen", "Live-Plan Vollbild"), die liefern wir hier
 * nicht, weil sie sich gegenseitig mit der Topbar-Funktion überschneiden.
 */

import { useEffect, useRef, useState, useMemo } from "react";
import { Search } from "lucide-react";

const BLOCK_INDEX = [
  {
    id: 1,
    title: "Personen",
    keywords: ["personen", "name", "geburtsdatum", "kinder", "adresse", "kanton"],
  },
  {
    id: 2,
    title: "Ziele & Wünsche",
    keywords: [
      "ziele",
      "pensionierung",
      "pensionsalter",
      "frühpension",
      "wunsch",
    ],
  },
  {
    id: 3,
    title: "Budget",
    keywords: ["budget", "einkommen", "ausgaben", "lohn", "verbrauch"],
  },
  {
    id: 4,
    title: "1. Säule (AHV)",
    keywords: ["ahv", "1. säule", "rente", "skala 44", "vorbezug", "aufschub"],
  },
  {
    id: 5,
    title: "2. Säule (Pensionskasse)",
    keywords: [
      "pk",
      "pensionskasse",
      "bvg",
      "2. säule",
      "altersguthaben",
      "freizügigkeit",
      "einkauf",
      "umwandlungssatz",
    ],
  },
  {
    id: 6,
    title: "3. Säule (3a / 3b)",
    keywords: [
      "3a",
      "3b",
      "säule 3",
      "vorsorge konto",
      "versicherung",
      "rückkaufswert",
    ],
  },
  {
    id: 7,
    title: "Vermögen",
    keywords: [
      "vermögen",
      "konto",
      "depot",
      "darlehen",
      "wertschriften",
      "liquidität",
    ],
  },
  {
    id: 8,
    title: "Immobilien",
    keywords: [
      "immobilien",
      "eigenheim",
      "hypothek",
      "miete",
      "rendite",
      "verkehrswert",
    ],
  },
  {
    id: 9,
    title: "Firma / Selbständigkeit",
    keywords: [
      "firma",
      "selbständigkeit",
      "unternehmen",
      "verkaufserlös",
      "nachfolge",
    ],
  },
  {
    id: 10,
    title: "Nachlass",
    keywords: [
      "nachlass",
      "testament",
      "ehevertrag",
      "vorsorgeauftrag",
      "patientenverfügung",
      "erbschaft",
      "schenkung",
    ],
  },
  {
    id: 11,
    title: "Variante B (Vergleich)",
    keywords: ["variante b", "plan b", "szenario", "vergleich", "alternativ"],
  },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  onJump: (blockId: number) => void;
}

export function CmdK({ open, onClose, onJump }: Props) {
  const [q, setQ] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!q.trim()) return BLOCK_INDEX.slice();
    const ql = q.toLowerCase();
    return BLOCK_INDEX.filter(
      (b) =>
        b.title.toLowerCase().includes(ql) ||
        b.keywords.some((k) => k.includes(ql))
    );
  }, [q]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQ("");
      setActiveIdx(0);
      // Focus input after animation
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Reset active index when filter changes
  useEffect(() => {
    setActiveIdx(0);
  }, [q]);

  // Keyboard handlers
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const target = filtered[activeIdx];
        if (target) onJump(target.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, activeIdx, onJump, onClose]);

  if (!open) return null;

  return (
    <div className="cui-cmdk-backdrop" onClick={onClose}>
      <div
        className="cui-cmdk-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cui-cmdk-search">
          <Search
            className="h-4 w-4"
            style={{ color: "var(--ink-3)" }}
          />
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Springe zu Block oder Frage…"
          />
        </div>
        <div className="cui-cmdk-list">
          {filtered.length === 0 ? (
            <div className="cui-cmdk-empty">
              Kein Block gefunden — versuche andere Keywords.
            </div>
          ) : (
            filtered.map((b, i) => (
              <button
                key={b.id}
                type="button"
                className={`cui-cmdk-item ${
                  i === activeIdx ? "is-active" : ""
                }`}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => onJump(b.id)}
              >
                <span className="cui-cmdk-item-num">
                  {String(b.id).padStart(2, "0")}
                </span>
                <span>{b.title}</span>
                <span className="cui-cmdk-item-meta">Block {b.id}</span>
              </button>
            ))
          )}
        </div>
        <div className="cui-cmdk-foot">
          <span>↑↓ navigieren · Enter springen · Esc schliessen</span>
          <span style={{ fontFamily: "var(--font-mono)" }}>
            {filtered.length} Treffer
          </span>
        </div>
      </div>
    </div>
  );
}

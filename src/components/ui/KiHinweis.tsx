"use client";

/**
 * KI-Hinweis-Tooltip — kleines "?"-Icon neben Wizard-Feldern.
 *
 * Click öffnet Popover mit KI-generierter Erklärung des Begriffs.
 * Ergebnis wird im Module-Cache gehalten, damit der gleiche Begriff bei
 * mehrmaligem Öffnen nur einmal die API trifft.
 *
 * Differenziator vs. VZ/Logismata/TaxWare: kein etabliertes Tool hat eine
 * In-Context-KI-Erklärung. Berater zeigt's dem Kunden im Termin direkt.
 *
 * Beispiel:
 *   <KiHinweis begriff="Umwandlungssatz" kontext="2. Säule BVG" />
 *   <KiHinweis begriff="Plafonierung" />
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { HelpCircle, X, Sparkles } from "lucide-react";

interface ExplainResponse {
  erklaerung: string;
  beispiel: string | null;
  hinweis: string | null;
}

// Module-level cache — gleiche Begriffe innerhalb der Session nicht doppelt fetchen
const cache = new Map<string, ExplainResponse>();

interface Props {
  /** Begriff der erklärt werden soll, z.B. "Umwandlungssatz". */
  begriff: string;
  /** Optional: zusätzlicher Kontext, z.B. "im BVG-Kontext, Schweizer Pensionsplanung". */
  kontext?: string;
  /** Optional: Größe des Trigger-Icons (Default 14px). */
  size?: number;
}

export function KiHinweis({ begriff, kontext, size = 14 }: Props) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ExplainResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const cacheKey = `${begriff}::${kontext ?? ""}`;

  const fetchExplanation = useCallback(async () => {
    const cached = cache.get(cacheKey);
    if (cached) {
      setData(cached);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ begriff, kontext }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Unbekannter Fehler");
        return;
      }
      cache.set(cacheKey, json);
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [begriff, kontext, cacheKey]);

  // Auf Click: laden + öffnen
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!open && !data && !loading) {
      void fetchExplanation();
    }
    setOpen((o) => !o);
  };

  // Click ausserhalb → schliessen
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current?.contains(e.target as Node) ||
        triggerRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  // ESC schliesst
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleClick}
        title={`KI-Erklärung: ${begriff}`}
        aria-label={`Erklärung zu ${begriff} öffnen`}
        className="inline-flex items-center justify-center rounded-full transition-colors"
        style={{
          width: size + 4,
          height: size + 4,
          color: open ? "var(--accent-ink)" : "var(--ink-3)",
          background: open ? "var(--accent-soft)" : "transparent",
        }}
      >
        <HelpCircle style={{ width: size, height: size }} />
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute z-50 rounded-[10px] border shadow-[var(--shadow-pop)]"
          style={{
            top: "calc(100% + 6px)",
            left: 0,
            background: "var(--surface)",
            borderColor: "var(--border)",
            width: 320,
            maxWidth: "calc(100vw - 32px)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between gap-2 border-b px-3 py-2"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-1.5">
              <Sparkles
                className="h-3.5 w-3.5"
                style={{ color: "var(--accent-ink)" }}
              />
              <span
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--accent-ink)" }}
              >
                KI-Erklärung
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
              className="rounded p-0.5 transition-colors hover:bg-[var(--surface-hover)]"
              aria-label="Schliessen"
            >
              <X className="h-3.5 w-3.5" style={{ color: "var(--ink-3)" }} />
            </button>
          </div>

          {/* Body */}
          <div className="p-3">
            <div
              className="mb-2 text-[13px] font-semibold"
              style={{ color: "var(--ink)" }}
            >
              {begriff}
            </div>

            {loading && <Skeleton />}

            {error && (
              <div
                className="text-[12px]"
                style={{ color: "var(--neg)" }}
              >
                Konnte nicht laden: {error}
                <button
                  type="button"
                  onClick={() => void fetchExplanation()}
                  className="mt-2 block text-[11px] underline"
                  style={{ color: "var(--accent-ink)" }}
                >
                  erneut versuchen
                </button>
              </div>
            )}

            {data && !loading && (
              <div className="space-y-2">
                <p
                  className="text-[12.5px] leading-relaxed"
                  style={{ color: "var(--ink-2)" }}
                >
                  {data.erklaerung}
                </p>
                {data.beispiel && (
                  <div
                    className="rounded-md px-2.5 py-1.5 text-[11.5px] leading-relaxed"
                    style={{
                      background: "var(--surface-2)",
                      color: "var(--ink-2)",
                      borderLeft: "2px solid var(--accent)",
                    }}
                  >
                    <span
                      className="block text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: "var(--ink-3)" }}
                    >
                      Beispiel
                    </span>
                    {data.beispiel}
                  </div>
                )}
                {data.hinweis && (
                  <div
                    className="rounded-md px-2.5 py-1.5 text-[11.5px] leading-relaxed"
                    style={{
                      background: "var(--warn-soft)",
                      color: "oklch(0.4 0.13 80)",
                    }}
                  >
                    <span
                      className="block text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: "oklch(0.5 0.13 80)" }}
                    >
                      Hinweis
                    </span>
                    {data.hinweis}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="border-t px-3 py-1.5 text-[10px]"
            style={{
              borderColor: "var(--border)",
              color: "var(--ink-3)",
            }}
          >
            Generiert von Claude · keine Rechts- oder Steuerberatung
          </div>
        </div>
      )}
    </span>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2">
      <div
        className="h-3 w-full animate-pulse rounded"
        style={{ background: "var(--surface-2)" }}
      />
      <div
        className="h-3 w-5/6 animate-pulse rounded"
        style={{ background: "var(--surface-2)" }}
      />
      <div
        className="h-3 w-2/3 animate-pulse rounded"
        style={{ background: "var(--surface-2)" }}
      />
    </div>
  );
}

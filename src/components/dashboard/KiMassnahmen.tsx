"use client";

/**
 * KI-generierte Massnahmen — Dashboard-Block.
 *
 * Sitzt im Dashboard zwischen den Charts und der regelbasierten
 * Massnahmen-Liste. Schickt einen Plan-Snapshot an /api/massnahmen-ki
 * und zeigt 3-5 personalisierte Empfehlungen.
 *
 * Differenziator: kein Wettbewerber (VZ, Logismata, TaxWare) hat eine
 * vergleichbare LLM-Massnahmen-Generierung. TaxWare hat KI angekündigt
 * — wir haben den Vorsprung.
 *
 * Bewusste Architektur:
 * - User triggert manuell (Button) — keine Auto-Auswertung bei jedem
 *   Tastendruck (würde API-Cost explodieren). Auch besser für UX:
 *   "klick mich" ist klarer als "läuft im Hintergrund".
 * - Result wird im Module-Cache gehalten, damit gleicher Snapshot nicht
 *   doppelt rechnet (Hash via JSON-Stringify).
 */

import { useState, useMemo } from "react";
import { Sparkles, RefreshCw, AlertTriangle } from "lucide-react";
import { usePlanStore } from "@/lib/store";
import { vermoegensbilanz } from "@/engine/vermoegensbilanz";
import { massnahmenAusState } from "@/engine/massnahmen";
import { buildPlanSnapshot } from "@/lib/plan-snapshot";
import { formatChf } from "@/lib/format";

interface KiMassnahme {
  titel: string;
  begruendung: string;
  wirkungChf: number;
  wirkungBeschrieb: string;
  prioritaet: "hoch" | "mittel" | "niedrig";
  kategorie:
    | "steuern"
    | "rente"
    | "vermoegen"
    | "vorsorge"
    | "immobilien"
    | "nachlass";
  umsetzbarBis: string | null;
}

// Module-level Cache (gleicher Snapshot-Hash → kein API-Re-Hit)
const cache = new Map<string, KiMassnahme[]>();

// LocalStorage-Persistenz: damit die KI-Empfehlungen ins Print/PDF
// mitgenommen werden können (z.B. der Berater drückt PDF nach
// Generierung und will die Empfehlungen im Output sehen).
const LS_KEY = "cuira-ki-massnahmen-v1";

interface PersistedKi {
  snapshotHash: string;
  massnahmen: KiMassnahme[];
  generatedAt: string;
}

function loadPersisted(): PersistedKi | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedKi;
  } catch {
    return null;
  }
}

function savePersisted(p: PersistedKi): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(p));
  } catch {
    // ignore (z.B. Quota überschritten)
  }
}

const KAT_LABELS: Record<KiMassnahme["kategorie"], string> = {
  steuern: "Steuern",
  rente: "Rente",
  vermoegen: "Vermögen",
  vorsorge: "Vorsorge",
  immobilien: "Immobilien",
  nachlass: "Nachlass",
};

const PRIO_BADGE: Record<KiMassnahme["prioritaet"], string> = {
  hoch: "cui-pill-warn",
  mittel: "cui-pill-accent",
  niedrig: "cui-pill-muted",
};

export function KiMassnahmen() {
  const fullState = usePlanStore();
  const [data, setData] = useState<KiMassnahme[] | null>(() => {
    // Bei Mount: prüfe ob persistierte Massnahmen vorhanden sind
    const persisted = loadPersisted();
    return persisted?.massnahmen ?? null;
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastSnapshotHash, setLastSnapshotHash] = useState<string | null>(
    () => loadPersisted()?.snapshotHash ?? null
  );

  // Snapshot vom aktuellen State bauen
  const snapshot = useMemo(() => {
    const bilanz = vermoegensbilanz(fullState);
    const bestehende = massnahmenAusState(fullState);
    return buildPlanSnapshot({
      state: fullState,
      bilanz,
      bestehendeMassnahmen: bestehende,
    });
  }, [fullState]);

  const snapshotHash = useMemo(() => JSON.stringify(snapshot), [snapshot]);
  const isStale = lastSnapshotHash !== null && lastSnapshotHash !== snapshotHash;

  const fetchKi = async () => {
    const cached = cache.get(snapshotHash);
    if (cached) {
      setData(cached);
      setLastSnapshotHash(snapshotHash);
      savePersisted({
        snapshotHash,
        massnahmen: cached,
        generatedAt: new Date().toISOString(),
      });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/massnahmen-ki", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Unbekannter Fehler");
        return;
      }
      const massnahmen = (json.massnahmen ?? []) as KiMassnahme[];
      cache.set(snapshotHash, massnahmen);
      setData(massnahmen);
      setLastSnapshotHash(snapshotHash);
      savePersisted({
        snapshotHash,
        massnahmen,
        generatedAt: new Date().toISOString(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  // Heuristik: nur sinnvoll wenn Kanton + (Einkommen ODER Vermögen) erfasst
  const istAussagekraeftig =
    !!snapshot.kanton &&
    snapshot.kanton !== "?" &&
    ((snapshot.einkommenJahr ?? 0) > 0 || (snapshot.vermoegenHeute ?? 0) > 0);

  return (
    <div
      className="rounded-[14px] border p-5"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Sparkles
              className="h-4 w-4"
              style={{ color: "var(--accent-ink)" }}
            />
            <h3
              className="text-[15px] font-semibold"
              style={{ color: "var(--ink)" }}
            >
              KI-Empfehlungen
            </h3>
            <span
              className="inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wider"
              style={{
                background: "var(--accent-soft)",
                borderColor: "var(--accent)",
                color: "var(--accent-ink)",
              }}
            >
              Beta
            </span>
          </div>
          <p
            className="text-[12px] leading-relaxed"
            style={{ color: "var(--ink-3)" }}
          >
            Personalisierte Optimierungs-Vorschläge — generiert von Claude
            anhand des aktuellen Plans. Ergänzung zu den regelbasierten
            Massnahmen unten.
          </p>
        </div>
        {data && (
          <button
            type="button"
            onClick={() => void fetchKi()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11.5px] transition-colors hover:bg-[var(--surface-hover)]"
            style={{
              borderColor: "var(--border)",
              color: "var(--ink-2)",
            }}
            title="Empfehlungen neu generieren"
          >
            <RefreshCw
              className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}
            />
            {loading ? "Analyse läuft …" : "Neu"}
          </button>
        )}
      </div>

      {/* Empty state */}
      {!data && !loading && (
        <div
          className="rounded-md border border-dashed px-4 py-8 text-center"
          style={{
            borderColor: "var(--border-strong)",
            background: "var(--surface-2)",
          }}
        >
          {!istAussagekraeftig ? (
            <p
              className="text-[12.5px]"
              style={{ color: "var(--ink-3)" }}
            >
              Erfasse mindestens Kanton und ein Einkommen oder Vermögen,
              dann kann die KI sinnvolle Empfehlungen geben.
            </p>
          ) : (
            <>
              <p
                className="mb-3 text-[13px]"
                style={{ color: "var(--ink-2)" }}
              >
                Lass die KI 3–5 personalisierte Optimierungen aus dem
                aktuellen Plan ableiten.
              </p>
              <button
                type="button"
                onClick={() => void fetchKi()}
                className="cui-btn cui-btn-primary"
              >
                <Sparkles className="h-4 w-4" />
                Empfehlungen generieren
              </button>
              <p
                className="mt-2 text-[10.5px]"
                style={{ color: "var(--ink-3)" }}
              >
                Kompakter Plan-Snapshot wird an Claude (Anthropic) gesendet
                — keine Personennamen, nur Eckwerte und Kanton.
              </p>
            </>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-md p-3"
              style={{ background: "var(--surface-2)" }}
            >
              <div
                className="h-4 w-2/3 animate-pulse rounded"
                style={{ background: "var(--border)" }}
              />
              <div
                className="mt-2 h-3 w-full animate-pulse rounded"
                style={{ background: "var(--border)" }}
              />
              <div
                className="mt-1 h-3 w-4/5 animate-pulse rounded"
                style={{ background: "var(--border)" }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div
          className="flex items-start gap-2 rounded-md p-3 text-[12px]"
          style={{
            background: "var(--neg-soft)",
            color: "var(--neg)",
          }}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <strong>KI-Analyse fehlgeschlagen.</strong> {error}
            <button
              type="button"
              onClick={() => void fetchKi()}
              className="ml-2 underline"
            >
              erneut versuchen
            </button>
          </div>
        </div>
      )}

      {/* Stale-Hinweis (Plan hat sich seit letzter Analyse geändert) */}
      {data && isStale && !loading && (
        <div
          className="mb-3 flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-[11.5px]"
          style={{
            background: "var(--warn-soft)",
            borderColor: "var(--warn)",
            color: "oklch(0.4 0.13 80)",
          }}
        >
          <span>
            Plan hat sich geändert seit der letzten Analyse — Empfehlungen
            sind ggf. nicht mehr aktuell.
          </span>
          <button
            type="button"
            onClick={() => void fetchKi()}
            className="font-medium underline"
          >
            Neu generieren
          </button>
        </div>
      )}

      {/* Massnahmen-Liste */}
      {data && data.length > 0 && (
        <div className="space-y-2.5">
          {data.map((m, i) => (
            <KiMassnahmeCard key={i} m={m} />
          ))}
        </div>
      )}

      {data && data.length === 0 && !loading && (
        <div
          className="rounded-md border border-dashed px-4 py-6 text-center text-[12.5px]"
          style={{
            borderColor: "var(--border)",
            color: "var(--ink-3)",
          }}
        >
          Keine zusätzlichen Empfehlungen — der Plan sieht solide aus.
        </div>
      )}

      {/* Footer */}
      {data && (
        <p
          className="mt-4 text-[10.5px]"
          style={{ color: "var(--ink-3)" }}
        >
          Generiert von Claude · keine Rechts- oder Steuerberatung im Sinne
          von Art. 2 RAG. Im Cuira-Termin verfeinert.
        </p>
      )}
    </div>
  );
}

function KiMassnahmeCard({ m }: { m: KiMassnahme }) {
  return (
    <div
      className="rounded-[10px] border p-3 transition-colors hover:border-[var(--border-strong)]"
      style={{
        background: "var(--surface-2)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span
              className="text-[13.5px] font-semibold"
              style={{ color: "var(--ink)" }}
            >
              {m.titel}
            </span>
            <span className={`cui-pill ${PRIO_BADGE[m.prioritaet]}`}>
              {m.prioritaet}
            </span>
            <span
              className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider"
              style={{
                background: "var(--surface-hover)",
                color: "var(--ink-3)",
              }}
            >
              {KAT_LABELS[m.kategorie]}
            </span>
          </div>
          <p
            className="text-[12px] leading-relaxed"
            style={{ color: "var(--ink-2)" }}
          >
            {m.begruendung}
          </p>
          {m.umsetzbarBis && (
            <p
              className="mt-1 text-[11px]"
              style={{ color: "var(--ink-3)" }}
            >
              Umsetzbar bis: {m.umsetzbarBis}
            </p>
          )}
        </div>
        <div className="text-right">
          <div
            className="font-mono text-[14px] font-semibold tabular-nums"
            style={{ color: "var(--pos)" }}
          >
            {m.wirkungChf > 0 ? "+" : ""}
            {formatChf(m.wirkungChf)}
          </div>
          <div className="text-[10.5px]" style={{ color: "var(--ink-3)" }}>
            {m.wirkungBeschrieb}
          </div>
        </div>
      </div>
    </div>
  );
}

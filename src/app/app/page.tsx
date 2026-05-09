"use client";

/**
 * Berater-Cockpit (Phase 6 Demo, Etappe 4 Backlog).
 *
 * Default-Landing nach Berater-Login. Mock-Daten — Auth + DB folgen mit
 * Etappe 4 (Supabase). Komponenten-Struktur ist production-ready, nur die
 * Datenquelle wird ausgetauscht.
 */

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  TrendingUp,
  TrendingDown,
  ChevronRight,
} from "lucide-react";
import { CockpitSidebar } from "@/components/cockpit/CockpitSidebar";
import {
  MOCK_MANDANTEN,
  MOCK_COCKPIT_KPIS,
  MOCK_BERATER,
  relativDatum,
  type MockMandant,
  type MandantStatus,
} from "@/lib/mock-mandanten";
import { formatChf } from "@/lib/format";

export default function CockpitPage() {
  const [statusFilter, setStatusFilter] = useState<MandantStatus | "alle">(
    "aktiv"
  );
  const [search, setSearch] = useState("");

  const heute = new Date();
  const begruessung = useMemo(() => {
    const h = heute.getHours();
    if (h < 11) return "Guten Morgen";
    if (h < 18) return "Guten Tag";
    return "Guten Abend";
  }, [heute]);

  const sieben_tage = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(heute);
      d.setDate(d.getDate() + i);
      const istHeute = i === 0;
      const wt = d.toLocaleDateString("de-CH", { weekday: "short" });
      const tag = d.getDate();
      const termineHeute = MOCK_MANDANTEN.filter((m) => {
        if (!m.naechsterTermin) return false;
        const t = new Date(m.naechsterTermin);
        return t.toDateString() === d.toDateString();
      }).length;
      return { wt, tag, istHeute, termine: termineHeute };
    });
  }, [heute]);

  const filtered = useMemo(() => {
    return MOCK_MANDANTEN.filter((m) => {
      if (statusFilter !== "alle" && m.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          m.vorname.toLowerCase().includes(q) ||
          m.nachname.toLowerCase().includes(q) ||
          m.kanton.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [statusFilter, search]);

  return (
    <div
      className="flex h-screen"
      style={{ background: "var(--bg)", color: "var(--ink)" }}
    >
      <CockpitSidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1400px] p-6 md:p-8">
          {/* Begrüßung + 7-Tage-Strip */}
          <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1
                className="text-[26px] font-semibold tracking-tight"
                style={{ color: "var(--ink)" }}
              >
                {begruessung}, {MOCK_BERATER.name.split(" ")[0]}
              </h1>
              <p
                className="mt-1 text-[14px]"
                style={{ color: "var(--ink-2)" }}
              >
                {heute.toLocaleDateString("de-CH", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                })}
              </p>
            </div>
            <div className="flex gap-1.5">
              {sieben_tage.map((d, i) => (
                <div
                  key={i}
                  className="relative flex h-14 w-12 flex-col items-center justify-center rounded-[10px] border text-center transition-colors"
                  style={{
                    background: d.istHeute
                      ? "var(--accent)"
                      : "var(--surface)",
                    borderColor: d.istHeute
                      ? "var(--accent)"
                      : "var(--border)",
                    color: d.istHeute ? "white" : "var(--ink-2)",
                  }}
                >
                  <div className="text-[9px] uppercase tracking-wider">
                    {d.wt}
                  </div>
                  <div className="font-mono text-[15px] font-medium tabular-nums">
                    {d.tag}
                  </div>
                  {d.termine > 0 && (
                    <div
                      className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full"
                      style={{
                        background: d.istHeute
                          ? "white"
                          : "var(--accent)",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* KPIs */}
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {MOCK_COCKPIT_KPIS.map((k, i) => (
              <div key={i} className="cui-kpi">
                <div className="cui-kpi-label">{k.label}</div>
                <div
                  className="cui-kpi-value"
                  style={{ fontSize: "22px", marginTop: "4px" }}
                >
                  {k.value}
                </div>
                <div
                  className="mt-1 inline-flex items-center gap-1 text-[11px]"
                  style={{ color: k.positiv ? "var(--pos)" : "var(--neg)" }}
                >
                  {k.positiv ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {k.delta}
                </div>
              </div>
            ))}
          </div>

          {/* Filter + Suche + Aktion */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="cui-seg" style={{ width: "auto" }}>
              {(["aktiv", "wartend", "abgeschlossen", "alle"] as const).map(
                (s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={`cui-seg-btn ${
                      statusFilter === s ? "is-active" : ""
                    }`}
                  >
                    {s === "alle"
                      ? "Alle"
                      : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                )
              )}
            </div>
            <div className="relative flex-1 min-w-[200px]">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: "var(--ink-3)" }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Mandant suchen…"
                className="cui-input pl-9"
              />
            </div>
            <button
              type="button"
              className="cui-btn cui-btn-primary"
              onClick={() => alert("Neuer Mandant — kommt mit Etappe 4")}
            >
              <Plus className="h-4 w-4" />
              Neuer Mandant
            </button>
          </div>

          {/* Tabelle */}
          <div
            className="overflow-hidden rounded-[14px] border"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <table className="w-full text-[13px]">
              <thead>
                <tr
                  className="border-b text-left"
                  style={{
                    background: "var(--surface-2)",
                    borderColor: "var(--border)",
                    color: "var(--ink-3)",
                  }}
                >
                  <th className="px-4 py-2.5 text-[10.5px] font-medium uppercase tracking-wider">
                    Mandant
                  </th>
                  <th className="px-4 py-2.5 text-[10.5px] font-medium uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-[10.5px] font-medium uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-4 py-2.5 text-right text-[10.5px] font-medium uppercase tracking-wider">
                    Vermögen
                  </th>
                  <th className="px-4 py-2.5 text-right text-[10.5px] font-medium uppercase tracking-wider">
                    Δ Pension
                  </th>
                  <th className="px-4 py-2.5 text-[10.5px] font-medium uppercase tracking-wider">
                    Nächster Termin
                  </th>
                  <th className="px-4 py-2.5 text-[10.5px] font-medium uppercase tracking-wider">
                    Letzte Aktivität
                  </th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <MandantRow key={m.id} m={m} />
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-12 text-center text-[13px]"
                      style={{ color: "var(--ink-3)" }}
                    >
                      Keine Mandanten gefunden.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p
            className="mt-6 text-center text-[11px]"
            style={{ color: "var(--ink-3)" }}
          >
            Demo-Cockpit mit Mock-Daten · Echtes Auth + Persist kommt mit
            Etappe 4 (Supabase Frankfurt)
          </p>
        </div>
      </main>
    </div>
  );
}

function MandantRow({ m }: { m: MockMandant }) {
  const initialen = `${m.vorname[0]}${m.nachname[0]}`.toUpperCase();
  return (
    <tr
      className="cursor-pointer border-b transition-colors hover:bg-[var(--surface-hover)]"
      style={{ borderColor: "var(--border)" }}
      onClick={() => (window.location.href = `/app/mandant/${m.id}`)}
    >
      <td className="px-4 py-3">
        <Link
          href={`/app/mandant/${m.id}`}
          className="flex items-center gap-2.5"
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-white"
            style={{ background: "var(--cuira-deep)" }}
          >
            {initialen}
          </div>
          <div className="leading-tight">
            <div className="font-medium" style={{ color: "var(--ink)" }}>
              {m.vorname} {m.nachname}
            </div>
            <div
              className="text-[11px]"
              style={{ color: "var(--ink-3)" }}
            >
              {m.alter} · {m.zivilstand}
              {m.kinder > 0 && ` · ${m.kinder} Kind${m.kinder > 1 ? "er" : ""}`}{" "}
              · {m.kanton}
            </div>
          </div>
        </Link>
      </td>
      <td className="px-4 py-3">
        <StatusPill status={m.status} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="cui-progress-track w-[64px]">
            <div
              className="cui-progress-fill"
              style={{ width: `${m.planVollstaendigkeit}%` }}
            />
          </div>
          <span
            className="font-mono text-[11px] tabular-nums"
            style={{ color: "var(--ink-3)" }}
          >
            {m.planVollstaendigkeit}%
          </span>
        </div>
      </td>
      <td
        className="px-4 py-3 text-right font-mono tabular-nums"
        style={{ color: "var(--ink)" }}
      >
        {formatChf(m.vermoegenHeute)}
      </td>
      <td className="px-4 py-3 text-right">
        <span
          className="font-mono text-[12.5px] tabular-nums"
          style={{
            color: m.delta >= 0 ? "var(--pos)" : "var(--neg)",
          }}
        >
          {m.delta >= 0 ? "+" : ""}
          {formatChf(m.delta)}
        </span>
      </td>
      <td className="px-4 py-3" style={{ color: "var(--ink-2)" }}>
        {relativDatum(m.naechsterTermin)}
      </td>
      <td className="px-4 py-3" style={{ color: "var(--ink-3)" }}>
        <div className="text-[11.5px]">{relativDatum(m.letzteAktivitaet)}</div>
        <div
          className="line-clamp-1 text-[11px]"
          style={{ color: "var(--ink-4)" }}
        >
          {m.letzteAktivitaetText}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <ChevronRight
          className="h-4 w-4"
          style={{ color: "var(--ink-3)" }}
        />
      </td>
    </tr>
  );
}

function StatusPill({ status }: { status: MandantStatus }) {
  const cfg = {
    aktiv: { label: "Aktiv", cls: "cui-pill-accent" },
    wartend: { label: "Wartend", cls: "cui-pill-warn" },
    abgeschlossen: { label: "Abgeschlossen", cls: "cui-pill-pos" },
    archiviert: { label: "Archiviert", cls: "cui-pill-muted" },
  }[status];
  return <span className={`cui-pill ${cfg.cls}`}>{cfg.label}</span>;
}

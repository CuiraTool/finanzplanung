"use client";

import { useEffect } from "react";
import type { PlanSlot, PlanVariantData } from "@/lib/store";
import { formatChf } from "@/lib/format";

interface DiffZeile {
  block: string;
  feld: string;
  aktiv: string;
  vergleich: string;
}

/**
 * Modal mit Block-Level-Diff zwischen zwei Plan-Varianten.
 *
 * Vergleicht ausgewählte Felder pro Block (Ziele, Budget, AHV, BVG,
 * Immobilien etc.) und listet nur die Unterschiede. Gleiche Werte werden
 * nicht angezeigt, um die Liste lesbar zu halten.
 */
export function VarianteDiffModal({
  aktivVariant,
  vergleichVariant,
  aktivSlot,
  vergleichSlot,
  onClose,
}: {
  aktivVariant: PlanVariantData;
  vergleichVariant: PlanVariantData;
  aktivSlot: PlanSlot;
  vergleichSlot: PlanSlot;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const diffs = sammleDiffs(aktivVariant, vergleichVariant);
  const diffsByBlock = gruppiereNachBlock(diffs);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="diff-modal-title"
        className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-baseline justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 id="diff-modal-title" className="text-lg font-semibold text-slate-800">
              Plan {aktivSlot.toUpperCase()} vs. Plan {vergleichSlot.toUpperCase()}
            </h2>
            <p className="text-xs text-slate-500">
              Block-Level-Unterschiede — gleiche Werte ausgeblendet
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
          >
            ✕
          </button>
        </header>

        {diffs.length === 0 ? (
          <p className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-4 text-sm text-emerald-800">
            ✓ Keine Unterschiede — beide Pläne sind identisch.
          </p>
        ) : (
          <div className="space-y-4">
            {Object.entries(diffsByBlock).map(([block, zeilen]) => (
              <section key={block}>
                <h3 className="mb-2 text-sm font-semibold text-slate-700">
                  {block}
                </h3>
                <div className="overflow-hidden rounded-md border border-slate-100">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-slate-500">
                        <th className="px-3 py-2 font-medium">Feld</th>
                        <th className="px-3 py-2 font-medium">
                          Plan {aktivSlot.toUpperCase()}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          Plan {vergleichSlot.toUpperCase()}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {zeilen.map((z, i) => (
                        <tr
                          key={i}
                          className="border-t border-slate-100 even:bg-slate-50/40"
                        >
                          <td className="px-3 py-2 text-slate-600">{z.feld}</td>
                          <td className="px-3 py-2 font-medium tabular-nums text-slate-800">
                            {z.aktiv}
                          </td>
                          <td className="px-3 py-2 font-medium tabular-nums text-slate-700">
                            {z.vergleich}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}

        <footer className="mt-4 flex justify-end border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Schliessen
          </button>
        </footer>
      </div>
    </div>
  );
}

export function gruppiereNachBlock(diffs: DiffZeile[]): Record<string, DiffZeile[]> {
  const out: Record<string, DiffZeile[]> = {};
  for (const d of diffs) {
    if (!out[d.block]) out[d.block] = [];
    out[d.block]!.push(d);
  }
  return out;
}

export type { DiffZeile };

export function sammleDiffs(
  a: PlanVariantData,
  b: PlanVariantData
): DiffZeile[] {
  const out: DiffZeile[] = [];

  // Block 2 — Ziele
  if (a.ziele.bezugsalterP1 !== b.ziele.bezugsalterP1) {
    out.push({
      block: "📅 Block 2 — Ziele",
      feld: "Bezugsalter P1",
      aktiv: `${a.ziele.bezugsalterP1}`,
      vergleich: `${b.ziele.bezugsalterP1}`,
    });
  }
  if (a.ziele.bezugsalterP2 !== b.ziele.bezugsalterP2) {
    out.push({
      block: "📅 Block 2 — Ziele",
      feld: "Bezugsalter P2",
      aktiv: `${a.ziele.bezugsalterP2}`,
      vergleich: `${b.ziele.bezugsalterP2}`,
    });
  }

  // Block 3 — Budget
  if (a.budget.wunschverbrauchPension !== b.budget.wunschverbrauchPension) {
    out.push({
      block: "💰 Block 3 — Budget",
      feld: "Wunschverbrauch Pension (CHF/Mt)",
      aktiv: fmtN(a.budget.wunschverbrauchPension),
      vergleich: fmtN(b.budget.wunschverbrauchPension),
    });
  }
  if (a.budget.ausgabenTotal !== b.budget.ausgabenTotal) {
    out.push({
      block: "💰 Block 3 — Budget",
      feld: "Ausgaben Total (CHF/Mt)",
      aktiv: fmtN(a.budget.ausgabenTotal),
      vergleich: fmtN(b.budget.ausgabenTotal),
    });
  }
  if (a.budget.steuernHeute !== b.budget.steuernHeute) {
    out.push({
      block: "💰 Block 3 — Budget",
      feld: "Steuern heute (Anker)",
      aktiv: fmtN(a.budget.steuernHeute),
      vergleich: fmtN(b.budget.steuernHeute),
    });
  }
  if (a.budget.religion !== b.budget.religion) {
    out.push({
      block: "💰 Block 3 — Budget",
      feld: "Religion",
      aktiv: a.budget.religion,
      vergleich: b.budget.religion,
    });
  }
  const aEinnahmen = a.budget.einkommen.reduce(
    (s, e) => s + (e.betragMonatlich ?? 0),
    0
  );
  const bEinnahmen = b.budget.einkommen.reduce(
    (s, e) => s + (e.betragMonatlich ?? 0),
    0
  );
  if (aEinnahmen !== bEinnahmen) {
    out.push({
      block: "💰 Block 3 — Budget",
      feld: "Σ Netto-Einnahmen (CHF/Mt)",
      aktiv: fmtN(aEinnahmen),
      vergleich: fmtN(bEinnahmen),
    });
  }

  // Block 4 — AHV
  if (a.ahv.ahvBezugsalterP1 !== b.ahv.ahvBezugsalterP1) {
    out.push({
      block: "🏛 Block 4 — AHV",
      feld: "AHV-Bezugsalter P1",
      aktiv: `${a.ahv.ahvBezugsalterP1}`,
      vergleich: `${b.ahv.ahvBezugsalterP1}`,
    });
  }
  if (a.ahv.ahvBezugsalterP2 !== b.ahv.ahvBezugsalterP2) {
    out.push({
      block: "🏛 Block 4 — AHV",
      feld: "AHV-Bezugsalter P2",
      aktiv: `${a.ahv.ahvBezugsalterP2}`,
      vergleich: `${b.ahv.ahvBezugsalterP2}`,
    });
  }
  if (a.ahv.einkommenP1 !== b.ahv.einkommenP1) {
    out.push({
      block: "🏛 Block 4 — AHV",
      feld: "Massgeb. Einkommen P1",
      aktiv: fmtN(a.ahv.einkommenP1),
      vergleich: fmtN(b.ahv.einkommenP1),
    });
  }

  // Block 5 — BVG
  if (a.bvg.p1.bezugspraeferenz !== b.bvg.p1.bezugspraeferenz) {
    out.push({
      block: "🏦 Block 5 — BVG",
      feld: "Bezugspräferenz P1",
      aktiv: a.bvg.p1.bezugspraeferenz,
      vergleich: b.bvg.p1.bezugspraeferenz,
    });
  }
  if (a.bvg.p1.kapitalanteil !== b.bvg.p1.kapitalanteil) {
    out.push({
      block: "🏦 Block 5 — BVG",
      feld: "Kapitalanteil P1 (%)",
      aktiv: `${a.bvg.p1.kapitalanteil}`,
      vergleich: `${b.bvg.p1.kapitalanteil}`,
    });
  }
  if (a.bvg.p1.umwandlungssatzProzent !== b.bvg.p1.umwandlungssatzProzent) {
    out.push({
      block: "🏦 Block 5 — BVG",
      feld: "Umwandlungssatz P1 (%)",
      aktiv: `${a.bvg.p1.umwandlungssatzProzent}`,
      vergleich: `${b.bvg.p1.umwandlungssatzProzent}`,
    });
  }
  if (a.bvg.p1.einkaeufe.length !== b.bvg.p1.einkaeufe.length) {
    out.push({
      block: "🏦 Block 5 — BVG",
      feld: "Anzahl PK-Einkäufe P1",
      aktiv: `${a.bvg.p1.einkaeufe.length}`,
      vergleich: `${b.bvg.p1.einkaeufe.length}`,
    });
  }

  // Block 6 — Säule 3
  if (a.saeuleDrei.p1.length !== b.saeuleDrei.p1.length) {
    out.push({
      block: "💎 Block 6 — Säule 3",
      feld: "Anzahl 3.-Säule-Items P1",
      aktiv: `${a.saeuleDrei.p1.length}`,
      vergleich: `${b.saeuleDrei.p1.length}`,
    });
  }

  // Block 7 — Vermögen
  const aVerm = a.vermoegen.items.reduce(
    (s, it) =>
      s + (it.typ === "darlehen" ? -(it.saldoHeute ?? 0) : it.saldoHeute ?? 0),
    0
  );
  const bVerm = b.vermoegen.items.reduce(
    (s, it) =>
      s + (it.typ === "darlehen" ? -(it.saldoHeute ?? 0) : it.saldoHeute ?? 0),
    0
  );
  if (aVerm !== bVerm) {
    out.push({
      block: "💵 Block 7 — Vermögen",
      feld: "Σ Netto-Vermögen (Konten/Depots/Darlehen)",
      aktiv: fmtN(aVerm),
      vergleich: fmtN(bVerm),
    });
  }

  // Block 8 — Immobilien
  for (const im of a.immobilien.items) {
    const gegenstueck = b.immobilien.items.find((x) => x.id === im.id);
    if (!gegenstueck) {
      out.push({
        block: "🏠 Block 8 — Immobilien",
        feld: `${im.beschreibung || "Immobilie"} — nur in Plan ${"A/B".charAt(0)}`,
        aktiv: "vorhanden",
        vergleich: "—",
      });
      continue;
    }
    if (im.plan !== gegenstueck.plan) {
      out.push({
        block: "🏠 Block 8 — Immobilien",
        feld: `${im.beschreibung || im.id} — Plan`,
        aktiv: im.plan,
        vergleich: gegenstueck.plan,
      });
    }
    if (im.verkaufsjahr !== gegenstueck.verkaufsjahr && im.plan === "verkaufen") {
      out.push({
        block: "🏠 Block 8 — Immobilien",
        feld: `${im.beschreibung || im.id} — Verkaufsjahr`,
        aktiv: `${im.verkaufsjahr}`,
        vergleich: `${gegenstueck.verkaufsjahr}`,
      });
    }
  }

  // Block 9 — Firma
  if (a.firma.plan !== b.firma.plan) {
    out.push({
      block: "🏢 Block 9 — Firma",
      feld: "Plan",
      aktiv: a.firma.plan,
      vergleich: b.firma.plan,
    });
  }
  if (a.firma.moeglicherVerkaufserloes !== b.firma.moeglicherVerkaufserloes) {
    out.push({
      block: "🏢 Block 9 — Firma",
      feld: "Möglicher Verkaufserlös",
      aktiv: fmtN(a.firma.moeglicherVerkaufserloes),
      vergleich: fmtN(b.firma.moeglicherVerkaufserloes),
    });
  }

  return out;
}

function fmtN(n: number | null | undefined): string {
  if (n == null) return "—";
  return formatChf(n);
}

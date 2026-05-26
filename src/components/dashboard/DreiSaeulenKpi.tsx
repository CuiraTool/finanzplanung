"use client";

import { usePlanStore } from "@/lib/store";
import { pensionseinkommenJahr } from "@/engine/pensionseinkommen";
import {
  bvgGesamtkapitalBeiBezug,
  bvgBezug,
} from "@/engine/bvg";
import { saeuleDreiAuszahlung } from "@/engine/saeule3";
import { formatChf } from "@/lib/format";

/**
 * 3-Säulen-KPI-Block. Zeigt Total Pension-Einkommen (jährliche Renten +
 * einmalige Kapitalauszahlungen) aufgeteilt nach Schweizer Säulen-Schema:
 *  - 1. Säule: AHV (lebenslange Rente)
 *  - 2. Säule: BVG (Rente + Kapital, je nach Bezugspräferenz)
 *  - 3. Säule: 3a-Konten/-Versicherungen + Freizügigkeit (einmalig)
 *
 * Standard-Anzeige in jedem Schweizer Beratungs-Tool (Taxware, Logismata,
 * Lumetra) — bisher in Cuira verteilt über mehrere Charts.
 */
export function DreiSaeulenKpi() {
  const state = usePlanStore();
  const fallart = state.fallart;

  const pensEink = pensionseinkommenJahr(state);

  // BVG-Kapital separat (Renten sind in pensEink.bvg, Kapital nicht)
  const bvgKapitalP1 = bvgKapitalPerson(
    state.bvg.p1,
    state.person1.geburtsdatum,
    state.ziele.bezugsalterP1
  );
  const bvgKapitalP2 =
    fallart === "paar"
      ? bvgKapitalPerson(
          state.bvg.p2,
          state.person2.geburtsdatum,
          state.ziele.bezugsalterP2
        )
      : 0;
  const bvgKapitalTotal = bvgKapitalP1 + bvgKapitalP2;

  // Säule 3a + Freizügigkeit Auszahlungen (alle Items beider Personen)
  const saeule3aTotal =
    saeuleDreiSumme(state.saeuleDrei.p1) +
    (fallart === "paar" ? saeuleDreiSumme(state.saeuleDrei.p2) : 0);
  const fzTotal =
    fzSumme(state.bvg.p1.freizuegigkeit) +
    (fallart === "paar" ? fzSumme(state.bvg.p2.freizuegigkeit) : 0);

  const totalKapital = bvgKapitalTotal + saeule3aTotal + fzTotal;
  const totalRenteJahr = pensEink.ahv + pensEink.bvg;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <div>
          <div className="text-base font-semibold text-slate-700">
            3-Säulen-Übersicht bei Pensionierung
          </div>
          <div className="text-xs text-slate-400">
            AHV + BVG + 3a + Freizügigkeit — Renten p.a. und einmalige Kapital
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">
            Rente p.a.
          </div>
          <div className="text-2xl font-semibold tabular-nums text-emerald-700">
            {formatChf(totalRenteJahr)}
          </div>
          <div className="text-[10px] text-slate-500">
            + einmalig {formatChf(totalKapital)}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Saeule
          nummer="1"
          titel="AHV"
          renteJahr={pensEink.ahv}
          kapital={0}
          farbe="blue"
          unter="Lebenslange Staatsrente (Plafond bei Paar)"
        />
        <Saeule
          nummer="2"
          titel="BVG / Pensionskasse"
          renteJahr={pensEink.bvg}
          kapital={bvgKapitalTotal}
          farbe="emerald"
          unter={bezugsLabelBvg(state, fallart)}
        />
        <Saeule
          nummer="3"
          titel="3a + Freizügigkeit"
          renteJahr={0}
          kapital={saeule3aTotal + fzTotal}
          farbe="amber"
          unter={`3a ${formatChf(saeule3aTotal)} · FZ ${formatChf(fzTotal)}`}
        />
      </div>

      {pensEink.mieten > 0 && (
        <div className="mt-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
          <span className="text-slate-500">+ Mieteinnahmen Renditeliegenschaft:</span>{" "}
          <span className="font-semibold tabular-nums text-slate-700">
            {formatChf(pensEink.mieten)} p.a.
          </span>
        </div>
      )}
    </div>
  );
}

function Saeule({
  nummer,
  titel,
  renteJahr,
  kapital,
  farbe,
  unter,
}: {
  nummer: string;
  titel: string;
  renteJahr: number;
  kapital: number;
  farbe: "blue" | "emerald" | "amber";
  unter: string;
}) {
  const farben = {
    blue: { border: "border-blue-100", bg: "bg-blue-50/40", text: "text-blue-700" },
    emerald: { border: "border-emerald-100", bg: "bg-emerald-50/40", text: "text-emerald-700" },
    amber: { border: "border-amber-100", bg: "bg-amber-50/40", text: "text-amber-700" },
  }[farbe];

  return (
    <div className={`rounded-md border p-3 ${farben.border} ${farben.bg}`}>
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Säule {nummer}
          </div>
          <div className="text-sm font-semibold text-slate-700">{titel}</div>
        </div>
      </div>
      <dl className="mt-3 space-y-1 text-xs">
        {renteJahr > 0 && (
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Rente p.a.</dt>
            <dd className={`font-semibold tabular-nums ${farben.text}`}>
              {formatChf(renteJahr)}
            </dd>
          </div>
        )}
        {kapital > 0 && (
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Kapital einmalig</dt>
            <dd className={`font-semibold tabular-nums ${farben.text}`}>
              {formatChf(kapital)}
            </dd>
          </div>
        )}
        {renteJahr === 0 && kapital === 0 && (
          <div className="text-[11px] text-slate-400">
            keine Leistungen erfasst
          </div>
        )}
      </dl>
      <div className="mt-2 border-t border-slate-100 pt-1.5 text-[10px] text-slate-400">
        {unter}
      </div>
    </div>
  );
}

function bvgKapitalPerson(
  p: import("@/lib/store").BvgPersonInput,
  geburtsdatum: string,
  bezugsalter: number
): number {
  if (!p.aktiverAnschluss || p.altersguthabenBeiBezug == null) return 0;
  if (p.bezugspraeferenz === "rente") return 0;
  const gj = parseInt(geburtsdatum.slice(0, 4), 10);
  if (!Number.isFinite(gj)) return 0;
  const bezugsjahr = gj + bezugsalter;
  const saldo = bvgGesamtkapitalBeiBezug({
    altersguthabenBeiBezug: p.altersguthabenBeiBezug,
    bezugsjahr,
    einkaeufe: p.einkaeufe
      .filter((e) => e.betrag != null)
      .map((e) => ({ jahr: e.jahr, betrag: e.betrag as number })),
  });
  const out = bvgBezug({
    saldoBeiBezug: saldo,
    bezugspraeferenz: p.bezugspraeferenz,
    kapitalanteilProzent: p.kapitalanteil,
    umwandlungssatz: p.umwandlungssatzProzent / 100,
  });
  return out.kapitalauszahlung;
}

function saeuleDreiSumme(items: import("@/lib/store").SaeuleDreiEntry[]): number {
  // Fix 2026-05-26: nutze saeuleDreiAuszahlung() — projiziert mit Rendite +
  // jährlichen Einzahlungen auf das Auszahlungsjahr. Vorher nur aktuellerWert
  // (heutiger Stand) → ignorierte simulierte Einzahlungen.
  const heute = new Date().getFullYear();
  return items.reduce((s, it) => {
    const auszahlung = saeuleDreiAuszahlung(
      it as Parameters<typeof saeuleDreiAuszahlung>[0],
      heute
    );
    return s + (auszahlung?.betrag ?? 0);
  }, 0);
}

function fzSumme(
  items: import("@/lib/store").FreizuegigkeitEntry[]
): number {
  return items.reduce((s, it) => s + (it.saldoHeute ?? 0), 0);
}

function bezugsLabelBvg(
  state: import("@/lib/store").PlanState,
  fallart: "einzel" | "paar"
): string {
  const teile: string[] = [];
  if (state.bvg.p1.aktiverAnschluss) {
    teile.push(`P1 ${bezugLabel(state.bvg.p1)}`);
  }
  if (fallart === "paar" && state.bvg.p2.aktiverAnschluss) {
    teile.push(`P2 ${bezugLabel(state.bvg.p2)}`);
  }
  return teile.join(" · ") || "kein aktiver PK-Anschluss";
}

function bezugLabel(p: import("@/lib/store").BvgPersonInput): string {
  if (p.bezugspraeferenz === "rente") return "100 % Rente";
  if (p.bezugspraeferenz === "kapital") return "100 % Kapital";
  return `${p.kapitalanteil} % Kapital / ${100 - p.kapitalanteil} % Rente`;
}

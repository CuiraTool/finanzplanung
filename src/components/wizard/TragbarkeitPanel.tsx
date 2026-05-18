"use client";

import { useState } from "react";
import { usePlanStore } from "@/lib/store";
import {
  tragbarkeitImmobilie,
  tragbarkeitHaushalt,
  statusFarbe,
  statusLabel,
  KALK_ZINS_DEFAULT,
  type TragbarkeitResult,
} from "@/engine/tragbarkeit";
import { pensionseinkommenJahr } from "@/engine/pensionseinkommen";
import { formatChf } from "@/lib/format";

/**
 * Tragbarkeits-Panel für Block 8 Immobilien.
 *
 * Zeigt zwei Spalten nebeneinander:
 *  - "Heute" — mit aktuellem Brutto-Haushaltseinkommen
 *  - "Bei Pension" — mit voraussichtlichem AHV+BVG+Mieten-Einkommen,
 *    Pensionsalter wählbar
 *
 * Pro Immobilie + Total Haushalt aggregiert.
 */
export function TragbarkeitPanel() {
  const fullState = usePlanStore();
  const items = fullState.immobilien.items;
  const eigenwohnte = items.filter((i) => i.typ === "selbstbewohnt");

  // Pensionsalter-Toggle (Default: gemittelt aus ziele.bezugsalterP1/P2 oder 65)
  const [pensionsalter, setPensionsalter] = useState<number>(() => {
    const z = fullState.ziele;
    if (fullState.fallart === "paar") {
      const avg = Math.round((z.bezugsalterP1 + z.bezugsalterP2) / 2);
      return avg || 65;
    }
    return z.bezugsalterP1 || 65;
  });

  if (eigenwohnte.length === 0) {
    return null; // Tragbarkeit nur relevant bei Eigenheim
  }

  // Brutto-Approximation aus den Netto-Einnahmen (Block 3) aller Personen
  // mal 12 mal 1.15 (≈ Netto → Brutto-Hochrechnung für Bankenstandard).
  // Fallback: Anker-Bruttoeinkommen aus Steuer-Veranlagung wenn explizit gesetzt.
  const nettoMonatlichSumme = fullState.budget.einkommen.reduce(
    (sum, e) => sum + (e.betragMonatlich ?? 0),
    0
  );
  const bruttoApproxAusNetto = Math.round(nettoMonatlichSumme * 12 * 1.15);
  const einkommenHeute =
    fullState.budget.einkommenHeute && fullState.budget.einkommenHeute > 0
      ? fullState.budget.einkommenHeute
      : bruttoApproxAusNetto;
  const pensEinkommen = pensionseinkommenJahr(fullState, pensionsalter);

  // Pro Immobilie: heute + bei Pension
  const proImmobilie = eigenwohnte.map((im) => ({
    im,
    heute: tragbarkeitImmobilie(im, einkommenHeute),
    pension: tragbarkeitImmobilie(im, pensEinkommen.total),
  }));

  // Aggregat Haushalt
  const haushaltHeute = tragbarkeitHaushalt(items, einkommenHeute);
  const haushaltPension = tragbarkeitHaushalt(items, pensEinkommen.total);

  return (
    <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <legend className="px-1 text-sm font-semibold text-slate-700">
        Tragbarkeit
        <span className="ml-2 text-xs font-normal text-slate-400">
          kalk. Zins {(KALK_ZINS_DEFAULT * 100).toFixed(0)}% · Nebenkosten 1%
          · Amortisation 2. Hypo über 15 J.
        </span>
      </legend>

      {/* Header mit Pensionsalter-Wähler */}
      <div className="flex flex-wrap items-end justify-between gap-3 pb-1">
        <div className="text-xs text-slate-500">
          Standard-Schweizer-Bankenformel: Wohnkosten ÷ Bruttoeinkommen ≤ 33 %
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <span>Tragbarkeit bei Alter</span>
          <input
            type="number"
            min={58}
            max={70}
            value={pensionsalter}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) setPensionsalter(n);
            }}
            className="w-16 rounded-md border border-slate-300 bg-white px-2 py-1 text-center tabular-nums focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-200"
          />
        </label>
      </div>

      {/* Pro Immobilie */}
      {proImmobilie.length > 1 && (
        <div className="space-y-2">
          {proImmobilie.map((p, idx) => (
            <ImmoZeile
              key={p.im.id}
              titel={p.im.beschreibung || `Immobilie ${idx + 1}`}
              heute={p.heute}
              pension={p.pension}
              einkommenHeute={einkommenHeute}
              einkommenPension={pensEinkommen.total}
            />
          ))}
        </div>
      )}

      {/* Total Haushalt */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <TragbarkeitsKarte
          label="Tragbarkeit heute"
          subLabel={
            einkommenHeute > 0
              ? `Brutto-Einkommen ${formatChf(einkommenHeute)} ≈ Netto × 1.15`
              : "Brutto-Einkommen —"
          }
          result={haushaltHeute}
          einkommenJahr={einkommenHeute}
          einkommenLabel="Brutto-Haushaltseinkommen (≈ Netto × 1.15)"
        />
        <TragbarkeitsKarte
          label={`Tragbarkeit bei Alter ${pensionsalter}`}
          subLabel={`AHV ${formatChf(pensEinkommen.ahv)} · BVG ${formatChf(pensEinkommen.bvg)}${
            pensEinkommen.mieten > 0
              ? ` · Mieten ${formatChf(pensEinkommen.mieten)}`
              : ""
          }`}
          result={haushaltPension}
          einkommenJahr={pensEinkommen.total}
          einkommenLabel="Voraussichtl. Pensionseinkommen"
        />
      </div>

      {haushaltPension.status !== haushaltHeute.status &&
        haushaltPension.status === "nicht_tragbar" && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            ⚠️ <strong>Tragbarkeitsproblem bei Pensionierung:</strong> mit dem
            voraussichtlichen Renteneinkommen wird das Eigenheim nach
            Schweizer Bankenstandard nicht mehr tragbar. Mögliche Massnahmen:
            Hypothek vor Pension auf 65 % amortisieren, Eigenheim verkleinern,
            oder Verkauf erwägen.
          </div>
        )}

      {haushaltHeute.status === "nicht_tragbar" && einkommenHeute > 0 && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          ⚠️ Bereits heute über der Bankenschwelle (33 %). Bei einer Hypothek-
          Verlängerung oder einem Bankenwechsel kann das zum Problem werden.
        </div>
      )}

      {einkommenHeute === 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          💡 Tipp: Netto-Einnahmen in <strong>Block 3 (Budget)</strong>
          {" "}eintragen — die Tragbarkeit-Berechnung rechnet automatisch auf
          Brutto hoch (Netto × 1.15).
        </div>
      )}

      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
        <span className="font-medium">Engine-Vereinfachung:</span> ordentliche
        Tilgung in Prozent pro Jahr ist nicht modelliert. Tilgungen jahrgenau
        pro Hypothek-Tranche unter „Tilgungsplan" eintragen — Engine reduziert
        den Stand entsprechend.
      </div>
    </fieldset>
  );
}

function ImmoZeile({
  titel,
  heute,
  pension,
  einkommenHeute,
  einkommenPension,
}: {
  titel: string;
  heute: TragbarkeitResult;
  pension: TragbarkeitResult;
  einkommenHeute: number;
  einkommenPension: number;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-medium text-slate-700">{titel}</span>
        <span className="text-slate-500">
          Belehnung {(heute.belehnung * 100).toFixed(0)} %
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <KleineKarte
          label="heute"
          result={heute}
          einkommenJahr={einkommenHeute}
        />
        <KleineKarte
          label="bei Pension"
          result={pension}
          einkommenJahr={einkommenPension}
        />
      </div>
    </div>
  );
}

function TragbarkeitsKarte({
  label,
  subLabel,
  result,
  einkommenJahr,
  einkommenLabel,
}: {
  label: string;
  subLabel: string;
  result: TragbarkeitResult;
  einkommenJahr: number;
  einkommenLabel: string;
}) {
  const farbe = statusFarbe(result.status);
  const verhaeltnisProzent =
    result.verhaeltnis < 0 || result.verhaeltnis === Infinity
      ? "—"
      : `${(result.verhaeltnis * 100).toFixed(1)} %`;

  return (
    <div className={`rounded-md border ${farbe.border} ${farbe.bg} p-3`}>
      <div className="mb-1 flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-700">{label}</div>
        <span
          className={`flex items-center gap-1.5 text-xs font-medium ${farbe.text}`}
        >
          <span className={`size-2 rounded-full ${farbe.dot}`} />
          {statusLabel(result.status)}
        </span>
      </div>
      <div className="text-[10px] text-slate-500">{subLabel}</div>

      <div className="mt-3 flex items-baseline gap-2">
        <div className={`text-2xl font-semibold tabular-nums ${farbe.text}`}>
          {verhaeltnisProzent}
        </div>
        <div className="text-xs text-slate-500">vom Einkommen</div>
      </div>

      <dl className="mt-3 space-y-0.5 text-xs">
        <Row k="Hypozins (kalk. 5 %)" v={formatChf(result.zinsKosten)} />
        {result.amortisation2Hypo > 0 && (
          <Row
            k="Amortisation 2. Hypo"
            v={formatChf(result.amortisation2Hypo)}
          />
        )}
        <Row k="Nebenkosten" v={formatChf(result.nebenkosten)} />
        <div className="my-1 border-t border-slate-200" />
        <Row
          k="Total kalk. Wohnkosten"
          v={formatChf(result.kostenJahr)}
          fett
        />
        <Row k={einkommenLabel} v={formatChf(einkommenJahr)} />
      </dl>
    </div>
  );
}

function KleineKarte({
  label,
  result,
  einkommenJahr,
}: {
  label: string;
  result: TragbarkeitResult;
  einkommenJahr: number;
}) {
  const farbe = statusFarbe(result.status);
  const verhaeltnisProzent =
    result.verhaeltnis < 0 || result.verhaeltnis === Infinity
      ? "—"
      : `${(result.verhaeltnis * 100).toFixed(0)} %`;
  return (
    <div
      className={`rounded border ${farbe.border} ${farbe.bg} px-2 py-1 text-[10px]`}
    >
      <div className="flex items-center justify-between">
        <span className="text-slate-600">{label}</span>
        <span className={`font-semibold ${farbe.text}`}>
          {verhaeltnisProzent}
        </span>
      </div>
      <div className="mt-0.5 text-slate-500">
        {formatChf(result.kostenJahr)} ÷ {formatChf(einkommenJahr)}
      </div>
    </div>
  );
}

function Row({
  k,
  v,
  fett,
}: {
  k: string;
  v: string;
  fett?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2">
      <dt className={fett ? "font-medium text-slate-700" : "text-slate-500"}>
        {k}
      </dt>
      <dd
        className={`tabular-nums ${
          fett ? "font-semibold text-slate-800" : "text-slate-700"
        }`}
      >
        {v}
      </dd>
    </div>
  );
}

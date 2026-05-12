"use client";

import { usePlanStore } from "@/lib/store";
import { pensionseinkommenJahr } from "@/engine/pensionseinkommen";
import {
  berechneHinterlassenen,
  type HinterlassenenOutput,
} from "@/engine/hinterlassenen";
import { formatChf } from "@/lib/format";

/**
 * Hinterlassenen-Übersicht: was bekommt der überlebende Partner,
 * wenn die andere Person heute stirbt.
 *
 * Differenziator vs. Wettbewerber:
 *  - Taxware/Logismata zeigen Hinterlassenen-Daten nur im PDF-Anhang
 *  - Cuira: prominent im Dashboard, beide Todesfall-Szenarien parallel
 *  - Nutzt die Engine berechneHinterlassenen mit BSV-/BVG-Faktoren
 *
 * Anzeige nur bei Paar — bei Einzelperson nicht relevant (Erben statt
 * Witwen-Rente).
 */
export function HinterlassenenCard() {
  const fallart = usePlanStore((s) => s.fallart);
  const state = usePlanStore();

  if (fallart !== "paar") return null;

  const heute = new Date().getFullYear();
  const gj1 = parseGeburtsjahr(state.person1.geburtsdatum);
  const gj2 = parseGeburtsjahr(state.person2.geburtsdatum);
  const alterP1 = gj1 != null ? heute - gj1 : 50;
  const alterP2 = gj2 != null ? heute - gj2 : 50;

  // Ehe-Jahre: aus erweitert.zivilstandSeitJahr, fallback 10 Jahre
  const ehejahre =
    state.erweitert?.zivilstandSeitJahr != null
      ? Math.max(0, heute - state.erweitert.zivilstandSeitJahr)
      : 10;

  // Hypothetische Renten als Basis (was P1/P2 bei Pension bekämen)
  const pensP1 = pensionseinkommenJahrPerson(state, 1);
  const pensP2 = pensionseinkommenJahrPerson(state, 2);

  const anzahlKinder = state.kinder.length;

  const istKonkubinat = state.zivilstand === "konkubinat";

  // Tod P1: P2 als Überlebende — Reglement-Sätze aus P1's BVG
  const todP1 = berechneHinterlassenen({
    ahvAltersrenteVerstorbener: pensP1.ahv,
    bvgAltersrenteVerstorbener: pensP1.bvg,
    alterUeberlebender: alterP2,
    ehejahre: istKonkubinat ? 0 : ehejahre,
    halbwaisen: anzahlKinder,
    eigeneAhvAltersrente: pensP2.ahv > 0 ? pensP2.ahv : undefined,
    bvgWitwenrenteProzent: state.bvg.p1.witwenrenteProzent,
    bvgHalbwaisenrenteProzent: state.bvg.p1.halbwaisenrenteProzent,
    bvgVollwaisenrenteProzent: state.bvg.p1.vollwaisenrenteProzent,
    konkubinatBerechtigt: state.bvg.p1.konkubinatBerechtigt,
    istKonkubinat,
  });

  // Tod P2: P1 als Überlebende — Reglement-Sätze aus P2's BVG
  const todP2 = berechneHinterlassenen({
    ahvAltersrenteVerstorbener: pensP2.ahv,
    bvgAltersrenteVerstorbener: pensP2.bvg,
    alterUeberlebender: alterP1,
    ehejahre: istKonkubinat ? 0 : ehejahre,
    halbwaisen: anzahlKinder,
    eigeneAhvAltersrente: pensP1.ahv > 0 ? pensP1.ahv : undefined,
    bvgWitwenrenteProzent: state.bvg.p2.witwenrenteProzent,
    bvgHalbwaisenrenteProzent: state.bvg.p2.halbwaisenrenteProzent,
    bvgVollwaisenrenteProzent: state.bvg.p2.vollwaisenrenteProzent,
    konkubinatBerechtigt: state.bvg.p2.konkubinatBerechtigt,
    istKonkubinat,
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <div>
          <div className="text-base font-semibold text-slate-700">
            Hinterlassenen-Leistungen
          </div>
          <div className="text-xs text-slate-400">
            Was bekommt der überlebende Partner bei Tod — AHV + BVG +
            Waisenrenten ({anzahlKinder} Kind{anzahlKinder === 1 ? "" : "er"})
          </div>
        </div>
      </header>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <TodKarte
          titel={`Tod ${state.person1.vorname || "Person 1"}`}
          sub={`→ ${state.person2.vorname || "Person 2"} überlebt (${alterP2} J)`}
          r={todP1}
        />
        <TodKarte
          titel={`Tod ${state.person2.vorname || "Person 2"}`}
          sub={`→ ${state.person1.vorname || "Person 1"} überlebt (${alterP1} J)`}
          r={todP2}
        />
      </div>
      <div className="mt-3 text-[10px] text-slate-400">
        Basis: hypothetische AHV-/BVG-Altersrenten beider Personen (Stand
        Pensionsalter). Witwen-Sätze: AHV 80 %, BVG 60 %. Waisen: AHV 40 %,
        BVG 20 %. Bei eigener Altersrente: Art. 24b AHVG — nur die höhere
        Rente wird ausbezahlt.
      </div>
    </div>
  );
}

function TodKarte({
  titel,
  sub,
  r,
}: {
  titel: string;
  sub: string;
  r: HinterlassenenOutput;
}) {
  return (
    <div
      className={`rounded-md border p-3 ${
        r.ahvAnspruchsberechtigt
          ? "border-slate-200 bg-slate-50/40"
          : "border-amber-200 bg-amber-50/40"
      }`}
    >
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-700">{titel}</div>
          <div className="text-[10px] text-slate-500">{sub}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">
            Total p.a.
          </div>
          <div className="text-xl font-semibold tabular-nums text-emerald-700">
            {formatChf(r.total)}
          </div>
        </div>
      </div>
      <dl className="mt-3 space-y-0.5 text-xs">
        <Zeile k="AHV-Witwenrente" v={r.ahvWitwenrente} />
        {r.ahvWaisenrenten > 0 && (
          <Zeile k="AHV-Waisenrenten" v={r.ahvWaisenrenten} />
        )}
        <Zeile k="BVG-Witwenrente" v={r.bvgWitwenrente} />
        {r.bvgWaisenrenten > 0 && (
          <Zeile k="BVG-Waisenrenten" v={r.bvgWaisenrenten} />
        )}
      </dl>
      {r.hinweise.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {r.hinweise.map((h, i) => (
            <li key={i} className="text-[10px] text-amber-800">
              ⚠ {h}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Zeile({ k, v }: { k: string; v: number }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-slate-500">{k}</dt>
      <dd className="font-medium tabular-nums text-slate-700">
        {formatChf(v)}
      </dd>
    </div>
  );
}

function parseGeburtsjahr(s: string): number | null {
  if (!s) return null;
  const j = parseInt(s.slice(0, 4), 10);
  return Number.isFinite(j) && j > 1900 && j < 2100 ? j : null;
}

/**
 * Pension-Einkommen pro Person (vereinfacht): nutzt globale Engine, teilt
 * Haushalts-AHV bei Paar hälftig (Vereinfachung — echt: pro Person eigene
 * Splitting-Berechnung). BVG hingegen ist pro Person eindeutig.
 */
function pensionseinkommenJahrPerson(
  state: ReturnType<typeof usePlanStore.getState>,
  personIdx: 1 | 2
): { ahv: number; bvg: number } {
  // Aus pensionseinkommenJahr Helper holen wir das BVG nicht person-genau —
  // wir greifen direkt auf den State zu.
  const teil = pensionseinkommenJahr(state);
  // AHV: bei Paar hälftig (Plafond bei Maximalwert)
  const ahvProPerson =
    state.fallart === "paar" ? Math.round(teil.ahv / 2) : teil.ahv;

  // BVG: pro Person aus altersguthabenBeiBezug × uws (vereinfacht)
  const p = personIdx === 1 ? state.bvg.p1 : state.bvg.p2;
  const bvgRente = p.aktiverAnschluss
    ? Math.round(
        ((p.altersguthabenBeiBezug ?? 0) * (p.umwandlungssatzProzent ?? 0)) /
          100
      )
    : 0;

  return { ahv: ahvProPerson, bvg: bvgRente };
}

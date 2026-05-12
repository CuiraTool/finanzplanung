/**
 * Narrativ-Generator (E2-5 / Y-3-Audit-Pflicht-Lücke #3).
 *
 * Erzeugt Klartext-Sätze zur Pensionsplanung — SSM hat einen ähnlichen
 * "Beschreibung der Szenarien"-Abschnitt. Hilft Mandanten, die Zahlen
 * in eine Story zu übersetzen.
 *
 * Output: Array von Text-Items mit optionalem Hinweis-Typ (info/warn/ok).
 */

import type { CashflowZeile } from "./cashflow";
import type { PlanState } from "@/lib/store";
import { formatChf } from "@/lib/format";

export interface NarrativItem {
  text: string;
  typ: "info" | "warn" | "ok";
}

export function generiereNarrativ(
  state: PlanState,
  cashflow: CashflowZeile[],
  pensionsjahr: number | null
): NarrativItem[] {
  const out: NarrativItem[] = [];
  if (cashflow.length === 0 || !pensionsjahr) return out;

  const heute = cashflow[0]!;
  const beiPension = cashflow.find((z) => z.jahr === pensionsjahr);
  const letzte = cashflow[cashflow.length - 1]!;
  const geburtsjahr = parseInt(state.person1.geburtsdatum.slice(0, 4), 10);
  const aktuellesAlter = Number.isFinite(geburtsjahr)
    ? heute.jahr - geburtsjahr
    : null;
  const pensionsalter = Number.isFinite(geburtsjahr)
    ? pensionsjahr - geburtsjahr
    : null;

  // Phase 1: Wo stehen Sie heute?
  out.push({
    text: `Heute ${aktuellesAlter ? `mit ${aktuellesAlter} Jahren` : ""} verfügen Sie über ein Nettovermögen von ${formatChf(heute.vermoegenNetto)}.`,
    typ: "info",
  });

  // Phase 2: Pensionierung
  if (beiPension && pensionsalter) {
    const erwerbsJahre = pensionsjahr - heute.jahr;
    out.push({
      text: `In ${erwerbsJahre} Jahren — mit ${pensionsalter} — planen Sie die Pensionierung. Bis dahin wachsen Vorsorgevermögen + Ersparnisse voraussichtlich auf ${formatChf(beiPension.vermoegenNetto)}.`,
      typ: "info",
    });
  }

  // Phase 3: Pensionseinkommen
  if (beiPension) {
    const renteJahr = beiPension.einnahmenAhv + beiPension.einnahmenBvgRente;
    const ausgaben = beiPension.ausgabenTotal;
    if (renteJahr > 0) {
      out.push({
        text: `In der Pension erhalten Sie laufende Renten von rund ${formatChf(renteJahr)} pro Jahr (AHV + BVG-Rente). Geplante Ausgaben: ${formatChf(ausgaben)}.`,
        typ: "info",
      });
      if (renteJahr < ausgaben) {
        const luecke = ausgaben - renteJahr;
        out.push({
          text: `Die jährliche Renten-Lücke von ${formatChf(luecke)} wird aus dem Vermögen entnommen — typisch für CH-Pensionierung.`,
          typ: "warn",
        });
      } else {
        out.push({
          text: `Die Renten decken die Ausgaben — Sie sparen sogar im Ruhestand.`,
          typ: "ok",
        });
      }
    }
  }

  // Phase 4: Wo endet es?
  const aufgebrauchtJahr = cashflow.find((z) => z.vermoegenNetto < 0)?.jahr;
  if (aufgebrauchtJahr && geburtsjahr) {
    const alter = aufgebrauchtJahr - geburtsjahr;
    out.push({
      text: `Bei aktuellem Plan wäre das Vermögen mit Alter ${alter} (Jahr ${aufgebrauchtJahr}) aufgebraucht — kritisch.`,
      typ: "warn",
    });
  } else if (letzte.vermoegenNetto > 0) {
    const alterEnde = geburtsjahr ? letzte.jahr - geburtsjahr : "85+";
    out.push({
      text: `Auch mit Alter ${alterEnde} verbleiben voraussichtlich ${formatChf(letzte.vermoegenNetto)} — die Planung trägt komfortabel.`,
      typ: "ok",
    });
  }

  // Phase 5: Vermögens-Maximum
  const maxJahr = cashflow.reduce((max, z) =>
    z.vermoegenNetto > max.vermoegenNetto ? z : max
  );
  if (maxJahr.vermoegenNetto > heute.vermoegenNetto * 1.1 && geburtsjahr) {
    const alterMax = maxJahr.jahr - geburtsjahr;
    out.push({
      text: `Höhepunkt des Vermögens: mit Alter ${alterMax} (Jahr ${maxJahr.jahr}) — etwa ${formatChf(maxJahr.vermoegenNetto)}. Danach Entnahme-Phase.`,
      typ: "info",
    });
  }

  // Phase 6: Immobilien-Hinweis
  if (state.immobilien.items.some((i) => i.typ === "selbstbewohnt")) {
    out.push({
      text: `Sie besitzen ein Eigenheim — denken Sie an Tragbarkeit (≤ 33 % der Pensionseinkommen), Hypothek-Strategie bei Pension und allfälligen Verkauf bei Pflegebedarf.`,
      typ: "info",
    });
  }

  // Phase 7: Plan-Vergleich
  if (state.plaene.b || state.plaene.c) {
    out.push({
      text: `Sie haben mehrere Pläne (A/B/C) angelegt — der Vergleich auf Seite "Plan-Varianten" zeigt finanzielle Unterschiede transparent.`,
      typ: "info",
    });
  }

  return out;
}

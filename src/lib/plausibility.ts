/**
 * Plausibilitäts-Checks für den Plan-State.
 *
 * Berater-Fehlersicherung: typische Tipp-Fehler oder vergessene Felder
 * werden mit konkretem Hinweis markiert, bevor das PDF rausgeht.
 *
 * Schweregrade:
 *  - "fehler":  Plan ist mit dem Wert nicht rechenbar / sicher falsch
 *  - "warnung": ungewöhnlich, sollte geprüft werden
 *  - "info":    Hinweis ohne Blocker (z.B. optional)
 */

import type { PlanState } from "./store";

export type PlausibilitySchwere = "fehler" | "warnung" | "info";

export interface PlausibilityHinweis {
  id: string;
  block: string; // welcher Wizard-Block (für Sprung-Link)
  schwere: PlausibilitySchwere;
  text: string;
}

export function checkePlan(state: PlanState): PlausibilityHinweis[] {
  const out: PlausibilityHinweis[] = [];
  const heute = new Date().getFullYear();

  // ─── Block 1: Personen ──────────────────────────────────────────
  const gj1 = parseGeburtsjahr(state.person1.geburtsdatum);
  if (state.person1.geburtsdatum && (gj1 == null || gj1 > heute)) {
    out.push({
      id: "p1-geburtsdatum",
      block: "1 Personen",
      schwere: "fehler",
      text: "Geburtsdatum Person 1 liegt in der Zukunft oder ist ungültig.",
    });
  } else if (gj1 != null && heute - gj1 > 100) {
    out.push({
      id: "p1-alter",
      block: "1 Personen",
      schwere: "warnung",
      text: `Person 1 ist ${heute - gj1} J. alt — Geburtsdatum prüfen.`,
    });
  }
  if (state.fallart === "paar") {
    const gj2 = parseGeburtsjahr(state.person2.geburtsdatum);
    if (state.person2.geburtsdatum && (gj2 == null || gj2 > heute)) {
      out.push({
        id: "p2-geburtsdatum",
        block: "1 Personen",
        schwere: "fehler",
        text: "Geburtsdatum Person 2 liegt in der Zukunft oder ist ungültig.",
      });
    }
    if (!state.person2.vorname.trim()) {
      out.push({
        id: "p2-vorname",
        block: "1 Personen",
        schwere: "warnung",
        text: "Fallart Paar — Vorname Person 2 fehlt.",
      });
    }
  }
  if (state.adresse.plz && state.adresse.plz.length !== 4) {
    out.push({
      id: "plz-format",
      block: "1 Personen",
      schwere: "fehler",
      text: `PLZ "${state.adresse.plz}" ist nicht 4-stellig.`,
    });
  }
  if (state.adresse.plz && !state.adresse.kanton) {
    out.push({
      id: "plz-ohne-kanton",
      block: "1 Personen",
      schwere: "warnung",
      text: "PLZ erfasst aber kein Kanton — PLZ-Lookup hat nicht gegriffen (unbekannte PLZ?).",
    });
  }

  // ─── Block 2: Ziele ─────────────────────────────────────────────
  const alterP1 = gj1 != null ? heute - gj1 : null;
  if (alterP1 != null && state.ziele.bezugsalterP1 < alterP1) {
    out.push({
      id: "bezugsalter-vergangen-p1",
      block: "2 Ziele",
      schwere: "warnung",
      text: `Pensionsalter ${state.ziele.bezugsalterP1} liegt unter aktuellem Alter (${alterP1}) — Person 1 ist bereits pensioniert?`,
    });
  }

  // ─── Block 3: Budget ─────────────────────────────────────────────
  const einkommenTotal = state.budget.einkommen.reduce(
    (s, e) => s + (e.betragMonatlich ?? 0) * 12,
    0
  );
  const ausgabenTotal =
    state.budget.ausgabenModus === "total"
      ? (state.budget.ausgabenTotal ?? 0) * 12
      : Object.values(state.budget.ausgabenKategorien).reduce(
          (s, v) => s + (v ?? 0) * 12,
          0
        );
  if (einkommenTotal > 0 && ausgabenTotal > einkommenTotal * 1.2) {
    out.push({
      id: "ausgaben-ueber-einkommen",
      block: "3 Budget",
      schwere: "warnung",
      text: `Ausgaben (${formatChf(ausgabenTotal)}) übersteigen Einkommen (${formatChf(einkommenTotal)}) deutlich — Plausibilität prüfen.`,
    });
  }
  if (einkommenTotal > 0 && einkommenTotal < 24_000) {
    out.push({
      id: "einkommen-unter-existenz",
      block: "3 Budget",
      schwere: "warnung",
      text: `Netto-Einkommen ${formatChf(einkommenTotal)}/J unter Existenzminimum (CHF 2'000/Monat) — fehlt eine Position?`,
    });
  }

  // ─── Block 4: AHV — Geschieden ohne IK-Override ─────────────────
  if (
    state.zivilstand === "geschieden" &&
    state.ahv.ahvRenteJahrEffektivP1 == null &&
    state.ahv.einkommenP1 != null &&
    state.ahv.einkommenP1 > 0
  ) {
    out.push({
      id: "ahv-geschieden-ohne-override",
      block: "4 AHV",
      schwere: "warnung",
      text: "Person 1 geschieden — AHV-Rente bei Geschiedenen weicht oft von der Standard-Berechnung ab (Splitting + Beitragslücken im IK). Echten Wert aus IK-Auszug eintragen empfohlen (Feld 'Voraussichtliche AHV-Jahresrente direkt').",
    });
  }

  // ─── Block 4: AHV ───────────────────────────────────────────────
  // Wenn vor Pensionierung und AHV-Einkommen null → 3a-Max + AHV-Rente
  // werden ungenau. Hinweis.
  if (
    alterP1 != null &&
    alterP1 < state.ahv.ahvBezugsalterP1 &&
    (state.ahv.einkommenP1 == null || state.ahv.einkommenP1 === 0) &&
    einkommenTotal > 0
  ) {
    out.push({
      id: "ahv-einkommen-fehlt-p1",
      block: "4 AHV",
      schwere: "info",
      text: "AHV-Einkommen P1 nicht erfasst — Tool nutzt Netto×1.15 als Fallback (3a-Max, PK-Einkauf-Berechnung).",
    });
  }

  // ─── Block 5: BVG ───────────────────────────────────────────────
  if (
    state.bvg.p1.aktiverAnschluss &&
    state.bvg.p1.altersguthabenBeiBezug == null
  ) {
    out.push({
      id: "bvg-saldo-bezug-fehlt-p1",
      block: "5 BVG",
      schwere: "warnung",
      text: "Person 1: PK-Anschluss aktiv aber Altersguthaben bei Bezug fehlt — BVG-Rente nicht berechenbar.",
    });
  }
  if (
    state.bvg.p1.aktiverAnschluss &&
    state.bvg.p1.altersguthabenHeute != null &&
    state.bvg.p1.altersguthabenBeiBezug != null &&
    state.bvg.p1.altersguthabenBeiBezug < state.bvg.p1.altersguthabenHeute
  ) {
    out.push({
      id: "bvg-saldo-schrumpft-p1",
      block: "5 BVG",
      schwere: "warnung",
      text: `Person 1: Altersguthaben bei Bezug (${formatChf(state.bvg.p1.altersguthabenBeiBezug)}) ist tiefer als heute (${formatChf(state.bvg.p1.altersguthabenHeute)}) — Tipp-Fehler? PK-Saldi wachsen normalerweise.`,
    });
  }
  if (
    state.bvg.p1.aktiverAnschluss &&
    (state.bvg.p1.umwandlungssatzProzent <= 0 ||
      state.bvg.p1.umwandlungssatzProzent > 8)
  ) {
    out.push({
      id: "bvg-uws-unrealistisch-p1",
      block: "5 BVG",
      schwere: "warnung",
      text: `Person 1: Umwandlungssatz ${state.bvg.p1.umwandlungssatzProzent}% ungewöhnlich — Schweizer Standard 5.0–6.8 %.`,
    });
  }

  // ─── Block 8: Immobilien ────────────────────────────────────────
  for (const [idx, im] of state.immobilien.items.entries()) {
    const hypoSumme = im.hypotheken.reduce((s, h) => s + (h.hoehe ?? 0), 0);
    if (im.verkehrswert != null && hypoSumme > im.verkehrswert) {
      out.push({
        id: `immo-${idx}-ueberbelehnung`,
        block: "8 Immobilien",
        schwere: "fehler",
        text: `Immobilie ${idx + 1}: Hypothek (${formatChf(hypoSumme)}) übersteigt Verkehrswert (${formatChf(im.verkehrswert)}) — Überbelehnung, Bank würde nicht finanzieren.`,
      });
    }
    if (
      im.verkehrswert != null &&
      hypoSumme > im.verkehrswert * 0.8
    ) {
      out.push({
        id: `immo-${idx}-hohe-belehnung`,
        block: "8 Immobilien",
        schwere: "warnung",
        text: `Immobilie ${idx + 1}: Belehnung ${Math.round((hypoSumme / im.verkehrswert) * 100)}% über 80 % — Bank verlangt Amortisation auf 65 % innert 15 J.`,
      });
    }
    if (im.typ === "rendite" && !im.jaehrlicheMieteinnahmen) {
      out.push({
        id: `immo-${idx}-mieten-fehlt`,
        block: "8 Immobilien",
        schwere: "warnung",
        text: `Immobilie ${idx + 1}: Typ Renditeliegenschaft aber keine Mieteinnahmen erfasst.`,
      });
    }
    for (const h of im.hypotheken) {
      if (h.ablaufjahr && h.ablaufjahr < heute) {
        out.push({
          id: `immo-${idx}-hypo-${h.id}-abgelaufen`,
          block: "8 Immobilien",
          schwere: "info",
          text: `Immobilie ${idx + 1}: Hypothek-Tranche Ablaufjahr ${h.ablaufjahr} liegt in der Vergangenheit — wahrscheinlich verlängert, Ablaufjahr aktualisieren.`,
        });
      }
    }
  }

  return out;
}

function parseGeburtsjahr(s: string): number | null {
  if (!s) return null;
  const j = parseInt(s.slice(0, 4), 10);
  return Number.isFinite(j) && j > 1900 && j < 2100 ? j : null;
}

function formatChf(n: number): string {
  return new Intl.NumberFormat("de-CH", {
    maximumFractionDigits: 0,
  }).format(n);
}

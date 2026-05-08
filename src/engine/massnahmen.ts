/**
 * Massnahmen-Engine — automatische To-Do-Generierung.
 *
 * Konsumiert den Plan-State und liefert eine sortierte Liste konkreter
 * Schritte (analog Taxware-PDF S.13/14). Regel-basiert, ohne LLM —
 * deterministisch und nachvollziehbar.
 *
 * Etappe 2 V1: 10 grundlegende Regeln. Etappe 2.5 erweitert um Steuer-
 * Optimierungs-Vorschläge (Staffelbezug, Einkauf-Timing, Wohnort-Wechsel).
 */

import type { PlanState } from "@/lib/store";
import { pensionsjahr } from "@/lib/pension";

export type MassnahmenWer = "p1" | "p2" | "beide";
export type MassnahmenKategorie =
  | "vorsorge"
  | "steuern"
  | "nachlass"
  | "anlage"
  | "wohnen"
  | "verwaltung";

export interface Massnahme {
  id: string;
  jahr: number;
  monat?: number;
  wer: MassnahmenWer;
  kategorie: MassnahmenKategorie;
  titel: string;
  detail?: string;
}

const MAX_3A_BEITRAG_2025 = 7258;

export function massnahmenAusState(state: PlanState): Massnahme[] {
  const heute = new Date().getFullYear();
  const out: Massnahme[] = [];

  const pj1 = pensionsjahr(state.person1.geburtsdatum, state.ziele.bezugsalterP1);
  const pj2 =
    state.fallart === "paar"
      ? pensionsjahr(state.person2.geburtsdatum, state.ziele.bezugsalterP2)
      : null;

  const personen: { idx: "p1" | "p2"; vorname: string; pj: number | null }[] =
    state.fallart === "paar"
      ? [
          { idx: "p1", vorname: state.person1.vorname, pj: pj1 },
          { idx: "p2", vorname: state.person2.vorname, pj: pj2 },
        ]
      : [{ idx: "p1", vorname: state.person1.vorname, pj: pj1 }];

  // 1. 3a-Maximum jährlich
  for (const p of personen) {
    if (p.pj == null) continue;
    const beitrag = MAX_3A_BEITRAG_2025;
    for (let j = heute; j < p.pj; j++) {
      out.push({
        id: `3a-max-${p.idx}-${j}`,
        jahr: j,
        monat: 1,
        wer: p.idx,
        kategorie: "vorsorge",
        titel: `Säule 3a Maximalbeitrag ${formatChfKurz(beitrag)}`,
        detail: `Voller steuerlicher Abzug — bis ${p.vorname || "Pension"}`,
      });
      if (j >= heute + 3) break; // nur die nächsten 3 Jahre als Reminder
    }
  }

  // 2. PK-Einkauf wenn freie Kapazität (heuristisch: bei moderatem Einkommen
  // und ≥ 5 Jahre vor Pension empfohlen)
  for (const p of personen) {
    if (p.pj == null) continue;
    const personState =
      p.idx === "p1" ? state.bvg.p1 : state.bvg.p2;
    if (!personState.aktiverAnschluss) continue;
    const jahreBisPension = p.pj - heute;
    if (jahreBisPension < 4) continue; // 3-J-Sperrfrist
    if (personState.einkaeufe.length === 0 && personState.altersguthabenBeiBezug) {
      out.push({
        id: `pk-einkauf-${p.idx}`,
        jahr: heute,
        wer: p.idx,
        kategorie: "vorsorge",
        titel: "PK-Einkauf prüfen",
        detail: `Block 5 erlaubt Einkauf-Simulation — ${p.vorname || "Person"}, voller Steuerabzug`,
      });
    }
  }

  // 3. AHV-Anmeldung 6 Monate vor Bezug
  for (const p of personen) {
    if (p.pj == null) continue;
    const ahvBezugsalter =
      p.idx === "p1" ? state.ahv.ahvBezugsalterP1 : state.ahv.ahvBezugsalterP2;
    const geburt = p.idx === "p1" ? state.person1.geburtsdatum : state.person2.geburtsdatum;
    const ahvJ = pensionsjahr(geburt, ahvBezugsalter);
    if (ahvJ == null) continue;
    out.push({
      id: `ahv-anm-${p.idx}`,
      jahr: ahvJ,
      monat: Math.max(1, geburtsmonat(geburt) - 6),
      wer: p.idx,
      kategorie: "verwaltung",
      titel: "AHV-Rente anmelden",
      detail: `Spätestens 3–6 Monate vor Bezug — ${p.vorname || "Person"}`,
    });
  }

  // 4. PK-Bezug anmelden
  for (const p of personen) {
    if (p.pj == null) continue;
    const personState = p.idx === "p1" ? state.bvg.p1 : state.bvg.p2;
    if (!personState.aktiverAnschluss) continue;
    out.push({
      id: `pk-anm-${p.idx}`,
      jahr: p.pj,
      monat: 1,
      wer: p.idx,
      kategorie: "vorsorge",
      titel: `Pensionskasse: ${bezugsLabel(personState.bezugspraeferenz, personState.kapitalanteil)} anmelden`,
      detail: "Schriftlich beim PK-Anbieter, in der Regel ≥ 3 Monate vor Bezug",
    });
  }

  // 5. 3a-Bezug staffeln (jeweils im Auszahlungsjahr je Eintrag)
  for (const p of personen) {
    const items = p.idx === "p1" ? state.saeuleDrei.p1 : state.saeuleDrei.p2;
    for (const it of items) {
      const jahr = it.type === "konto" ? it.auszahlungsjahr : it.ablaufjahr;
      const betrag =
        it.type === "konto"
          ? it.aktuellerWert
          : it.ablaufswert ?? it.rueckkaufswert;
      if (betrag == null) continue;
      out.push({
        id: `3a-bezug-${p.idx}-${it.id}`,
        jahr,
        wer: p.idx,
        kategorie: "vorsorge",
        titel: `${it.type === "konto" ? "3a-Konto" : "3a-Versicherung"} beziehen — ${formatChfKurz(betrag)}`,
        detail: it.beschreibung || "Staffelbezug zur Steueroptimierung",
      });
    }
  }

  // 6. Freizügigkeit-Auszahlung
  for (const p of personen) {
    const items = p.idx === "p1" ? state.bvg.p1.freizuegigkeit : state.bvg.p2.freizuegigkeit;
    for (const fz of items) {
      if (fz.saldoHeute == null) continue;
      out.push({
        id: `fz-bezug-${p.idx}-${fz.id}`,
        jahr: fz.auszahlungsjahr,
        wer: p.idx,
        kategorie: "vorsorge",
        titel: `Freizügigkeit beziehen — ${formatChfKurz(fz.saldoHeute)}`,
        detail: fz.beschreibung || "Auszahlung beantragen",
      });
    }
  }

  // 7. Immobilien-Verkauf
  for (const im of state.immobilien.items) {
    if (im.plan !== "verkaufen") continue;
    out.push({
      id: `immo-verkauf-${im.id}`,
      jahr: im.verkaufsjahr,
      wer: "beide",
      kategorie: "wohnen",
      titel: `Immobilie verkaufen: ${im.beschreibung || "(ohne Bezeichnung)"}`,
      detail: "Käufer suchen, Notarvertrag, Grundbucheintrag — Vorlauf 6–12 Monate",
    });
  }

  // 8. Hypothek-Verlängerung bei Ablauf
  for (const im of state.immobilien.items) {
    for (const h of im.hypotheken) {
      if (h.hoehe == null || h.hoehe === 0) continue;
      if (h.ablaufjahr <= heute) continue;
      out.push({
        id: `hypo-verl-${h.id}`,
        jahr: h.ablaufjahr,
        wer: "beide",
        kategorie: "wohnen",
        titel: `Hypothek-Tranche verlängern: ${formatChfKurz(h.hoehe)}`,
        detail: `${im.beschreibung || "Liegenschaft"} — Konditionen 6 Monate vorher prüfen`,
      });
    }
  }

  // 9. Firma-Verkauf
  if (
    state.firma.vorhanden &&
    state.firma.plan === "verkaufen" &&
    state.firma.firmenname
  ) {
    out.push({
      id: `firma-verkauf`,
      jahr: state.firma.verkaufsjahr,
      wer: "beide",
      kategorie: "verwaltung",
      titel: `Firma verkaufen: ${state.firma.firmenname}`,
      detail: "Nachfolge organisieren, Bewertung, Verkaufsprozess — Vorlauf 1–3 Jahre",
    });
  }

  // 10. Nachlass-Dokumente, die noch fehlen
  const nachlassMissing: { key: keyof typeof state.nachlass; label: string }[] = [
    { key: "vorsorgeauftrag", label: "Vorsorgeauftrag" },
    { key: "patientenverfuegung", label: "Patientenverfügung" },
    { key: "testament", label: "Testament" },
    { key: "ehevertrag", label: "Ehe-/Konkubinatsvertrag" },
  ];
  for (const m of nachlassMissing) {
    if (state.nachlass[m.key]) continue;
    if (m.key === "ehevertrag" && state.fallart === "einzel") continue;
    out.push({
      id: `nachlass-${m.key}`,
      jahr: heute,
      wer: "beide",
      kategorie: "nachlass",
      titel: `${m.label} erstellen`,
      detail: "Block 10 — bei Bedarf mit Notar/Anwalt",
    });
  }

  // Sortieren nach Jahr (sek. Monat, dann Titel)
  out.sort((a, b) => {
    if (a.jahr !== b.jahr) return a.jahr - b.jahr;
    const ma = a.monat ?? 1;
    const mb = b.monat ?? 1;
    if (ma !== mb) return ma - mb;
    return a.titel.localeCompare(b.titel);
  });

  return out;
}

function formatChfKurz(n: number): string {
  return new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 }).format(n);
}

function bezugsLabel(praef: string, anteil: number): string {
  if (praef === "rente") return "100% Rente";
  if (praef === "kapital") return "100% Kapital";
  return `${anteil}% Kapital / ${100 - anteil}% Rente`;
}

function geburtsmonat(geburtsdatum: string): number {
  if (!geburtsdatum) return 1;
  const m = Number.parseInt(geburtsdatum.slice(5, 7), 10);
  return Number.isFinite(m) && m >= 1 && m <= 12 ? m : 1;
}

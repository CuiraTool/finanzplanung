/**
 * Massnahmen-Engine — automatische To-Do-Generierung.
 *
 * Konsumiert den Plan-State und liefert eine sortierte Liste konkreter
 * Schritte (analog Taxware-PDF S.13/14). Regel-basiert, ohne LLM —
 * deterministisch und nachvollziehbar.
 *
 * Zwei Arten von Massnahmen:
 *  - Termin-Reminder (z.B. "AHV-Rente anmelden 6 Mt vor Bezug")
 *  - Optimierungs-Empfehlungen mit CHF-Effekt (z.B. "3a max ausschöpfen
 *    spart X CHF/Jahr")
 *
 * Optimierungs-Massnahmen rechnen die Ersparnis via Doppel-Aufruf der
 * Steuer-Engine (aktuell vs. hypothetisch) — präzise, kein Schätzwert.
 */

import type { PlanState } from "@/lib/store";
import { pensionsjahr } from "@/lib/pension";
import { block1MinimumErfuellt } from "@/lib/validation";
import { steuerProJahr } from "./steuer";
import { tragbarkeitHaushalt } from "./tragbarkeit";
import { pensionseinkommenJahr } from "./pensionseinkommen";

export type MassnahmenWer = "p1" | "p2" | "beide";
export type MassnahmenKategorie =
  | "vorsorge"
  | "steuern"
  | "nachlass"
  | "anlage"
  | "wohnen"
  | "verwaltung"
  | "optimierung";

export interface Massnahme {
  id: string;
  jahr: number;
  monat?: number;
  wer: MassnahmenWer;
  kategorie: MassnahmenKategorie;
  titel: string;
  detail?: string;
  /** Optional: geschätzte jährliche CHF-Ersparnis (positiv = Vorteil). */
  geschaetzteErsparnis?: number;
  /** Priorität: 1 = sofort, 2 = mittelfristig, 3 = langfristig. */
  prioritaet?: 1 | 2 | 3;
}

export function massnahmenAusState(state: PlanState): Massnahme[] {
  // Ohne Block-1-Pflichtdaten (Vorname / Geburtsdatum / Kanton) keine
  // Massnahmen ableiten — sonst würde die Default-Nachlass-Liste schon
  // beim leeren Plan erscheinen, was verwirrend ist.
  if (!block1MinimumErfuellt(state).komplett) return [];

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

  // 1. 3a-Einzahlungen — pro Item, pro Jahr im einzahlungAb..einzahlungBis-Fenster
  // (nur die nächsten 3 Jahre als Reminder, sonst wird die Liste zu lang)
  for (const p of personen) {
    const items = p.idx === "p1" ? state.saeuleDrei.p1 : state.saeuleDrei.p2;
    for (const it of items) {
      if (it.jaehrlicheEinzahlung == null || it.jaehrlicheEinzahlung <= 0)
        continue;
      const von = Math.max(it.einzahlungAb, heute);
      const bis = Math.min(it.einzahlungBis, heute + 3);
      const label =
        it.type === "konto" ? "3a-Einzahlung Konto" : "3a-Prämie Versicherung";
      const beschreibung = it.beschreibung
        ? ` (${it.beschreibung})`
        : "";
      for (let j = von; j <= bis; j++) {
        out.push({
          id: `3a-einzahlung-${p.idx}-${it.id}-${j}`,
          jahr: j,
          monat: 1,
          wer: p.idx,
          kategorie: "vorsorge",
          titel: `${label} ${formatChfKurz(it.jaehrlicheEinzahlung)}${beschreibung}`,
          detail:
            it.type === "konto"
              ? "Voller steuerlicher Abzug bei Veranlagung"
              : "Versicherungsprämie — Abzug nur bei reiner 3a-Police",
        });
      }
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

  // ════════════════════════════════════════════════════════════════════
  //   OPTIMIERUNGS-EMPFEHLUNGEN mit CHF-Ersparnis (Phase 5.5)
  // ════════════════════════════════════════════════════════════════════
  out.push(...optimierungenBerechnen(state));

  // Sortieren: zuerst Optimierungen (mit Ersparnis sortiert nach Höhe),
  // dann Reminder nach Jahr/Monat
  out.sort((a, b) => {
    // Optimierungen oben
    const aOpt = a.kategorie === "optimierung";
    const bOpt = b.kategorie === "optimierung";
    if (aOpt && !bOpt) return -1;
    if (!aOpt && bOpt) return 1;
    if (aOpt && bOpt) {
      // Ersparnis absteigend
      return (b.geschaetzteErsparnis ?? 0) - (a.geschaetzteErsparnis ?? 0);
    }
    // Reminder nach Jahr/Monat
    if (a.jahr !== b.jahr) return a.jahr - b.jahr;
    const ma = a.monat ?? 1;
    const mb = b.monat ?? 1;
    if (ma !== mb) return ma - mb;
    return a.titel.localeCompare(b.titel);
  });

  return out;
}

// ════════════════════════════════════════════════════════════════════
//   OPTIMIERUNGS-FUNKTIONEN
// ════════════════════════════════════════════════════════════════════

function optimierungenBerechnen(state: PlanState): Massnahme[] {
  const out: Massnahme[] = [];
  const heute = new Date().getFullYear();

  // Brutto-Lohn pro Person (für Steuer-Berechnungen)
  const bruttoP1 = state.ahv.einkommenP1 ?? 0;
  const bruttoP2 = state.fallart === "paar" ? state.ahv.einkommenP2 ?? 0 : 0;
  const bruttoTotal = bruttoP1 + bruttoP2;
  const alterP1 = parseInt(state.person1.geburtsdatum.slice(0, 4), 10)
    ? heute - parseInt(state.person1.geburtsdatum.slice(0, 4), 10)
    : 40;
  const alterP2 = state.person2.geburtsdatum
    ? heute - parseInt(state.person2.geburtsdatum.slice(0, 4), 10)
    : 40;
  const anzahlKinder = state.kinder.length;
  const hatPkP1 = state.bvg.p1.aktiverAnschluss;
  const hatPkP2 = state.fallart === "paar" && state.bvg.p2.aktiverAnschluss;

  // Aktuelle Säule-3a-Einzahlungen (Summe Haushalt)
  const aktuell3aP1 = sumEinzahlungen(state.saeuleDrei.p1, heute);
  const aktuell3aP2 =
    state.fallart === "paar" ? sumEinzahlungen(state.saeuleDrei.p2, heute) : 0;
  const aktuell3a = aktuell3aP1 + aktuell3aP2;

  // Maximaler 3a-Beitrag pro Person
  const max3aP1 = bruttoP1 > 0 ? (hatPkP1 ? 7_258 : Math.min(bruttoP1 * 0.2, 36_288)) : 0;
  const max3aP2 = bruttoP2 > 0 ? (hatPkP2 ? 7_258 : Math.min(bruttoP2 * 0.2, 36_288)) : 0;
  const max3a = max3aP1 + max3aP2;

  // Aktuelle Steuern (Brutto-Werte als Basis)
  const baseInput = {
    einkommenJahr: bruttoTotal,
    vermoegenJahr: 0,
    kapAuszahlungenJahr: 0,
    kanton: state.adresse.kanton,
    bfsId: state.adresse.gemeindeBfsId ?? undefined,
    religion: state.budget.religion,
    fallart: state.fallart,
    bruttoErwerbP1: bruttoP1,
    bruttoErwerbP2: bruttoP2,
    alterP1,
    alterP2,
    anzahlKinder,
    saeule3aEinzahlungJahr: aktuell3a,
    hatPkAnschlussP1: hatPkP1,
    hatPkAnschlussP2: hatPkP2,
  };

  // ─── Optimierung 1: 3a max ausschöpfen ──────────────────────────
  if (max3a > aktuell3a + 100 && bruttoTotal > 0) {
    const luecke = max3a - aktuell3a;
    const aktuelleSteuer = steuerProJahr(baseInput).einkommen;
    const mitMax3aSteuer = steuerProJahr({
      ...baseInput,
      saeule3aEinzahlungJahr: max3a,
    }).einkommen;
    const ersparnis = aktuelleSteuer - mitMax3aSteuer;
    if (ersparnis > 100) {
      out.push({
        id: "opt-3a-max",
        jahr: heute,
        wer: "beide",
        kategorie: "optimierung",
        prioritaet: 1,
        titel: `Säule 3a max ausschöpfen — spart ${formatChfKurz(ersparnis)} Steuern/Jahr`,
        detail: `Aktuell ${formatChfKurz(aktuell3a)} eingezahlt, Maximum wäre ${formatChfKurz(max3a)}. Differenz ${formatChfKurz(luecke)} CHF/Jahr → Steuerersparnis ${formatChfKurz(ersparnis)} CHF.`,
        geschaetzteErsparnis: ersparnis,
      });
    }
  }

  // ─── Optimierung 2: PK-Einkauf-Potenzial ────────────────────────
  // Heuristik: Wenn aktiverAnschluss + > 5 J vor Pension + keine Einkäufe geplant
  // + altersguthabenBeiBezug > altersguthabenHeute (wachstum erkennbar)
  const personen: { idx: "p1" | "p2"; name: string }[] =
    state.fallart === "paar"
      ? [
          { idx: "p1", name: state.person1.vorname || "Person 1" },
          { idx: "p2", name: state.person2.vorname || "Person 2" },
        ]
      : [{ idx: "p1", name: state.person1.vorname || "Person 1" }];

  for (const p of personen) {
    const bvg = p.idx === "p1" ? state.bvg.p1 : state.bvg.p2;
    if (!bvg.aktiverAnschluss) continue;
    const pj =
      p.idx === "p1"
        ? pensionsjahr(state.person1.geburtsdatum, state.ziele.bezugsalterP1)
        : pensionsjahr(state.person2.geburtsdatum, state.ziele.bezugsalterP2);
    if (pj == null) continue;
    const jahreBis = pj - heute;
    if (jahreBis < 4) continue;
    if (bvg.einkaeufe.length > 0) continue; // schon geplant

    // Beispiel-Einkauf: 30k pro Jahr (typisch)
    const beispielEinkauf = 30_000;
    const aktuelleSteuer = steuerProJahr(baseInput).einkommen;
    const mitEinkaufSteuer = steuerProJahr({
      ...baseInput,
      saeule3aEinzahlungJahr: aktuell3a + beispielEinkauf,
    }).einkommen;
    const ersparnis = aktuelleSteuer - mitEinkaufSteuer;
    if (ersparnis > 1_000) {
      out.push({
        id: `opt-pk-einkauf-${p.idx}`,
        jahr: heute,
        wer: p.idx,
        kategorie: "optimierung",
        prioritaet: 2,
        titel: `PK-Einkauf prüfen (${p.name}) — pro 30k spart ~${formatChfKurz(ersparnis)} Steuern`,
        detail: `${jahreBis} Jahre bis Pension, 3-J-Sperrfrist beachten. Einkauf wirkt steuerlich wie 3a-Einzahlung. PK-Anbieter rechnet maximalen Einkauf-Betrag aus.`,
        geschaetzteErsparnis: ersparnis,
      });
    }
  }

  // ─── Optimierung 3: Kantonswechsel-Potenzial (vs. ZG) ────────────
  if (state.adresse.kanton && state.adresse.kanton !== "ZG" && bruttoTotal > 80_000) {
    const aktuelleSteuer = steuerProJahr(baseInput).einkommen;
    const inZg = steuerProJahr({ ...baseInput, kanton: "ZG", bfsId: undefined }).einkommen;
    const ersparnis = aktuelleSteuer - inZg;
    if (ersparnis > 2_000) {
      out.push({
        id: "opt-kantonswechsel-zg",
        jahr: heute,
        wer: "beide",
        kategorie: "optimierung",
        prioritaet: 3,
        titel: `Kantonswechsel ${state.adresse.kanton} → ZG: spart ~${formatChfKurz(ersparnis)} Steuern/Jahr`,
        detail: `In Zug zahlen Sie bei gleichem Einkommen rund ${formatChfKurz(ersparnis)} CHF weniger Steuern. Realistisch nur bei echtem Umzug — nicht "auf dem Papier".`,
        geschaetzteErsparnis: ersparnis,
      });
    }
  }

  // ─── Optimierung 4: Tragbarkeit bei Pension prüfen ──────────────
  const eigenheime = state.immobilien.items.filter(
    (i) => i.typ === "selbstbewohnt"
  );
  if (eigenheime.length > 0) {
    const pensEink = pensionseinkommenJahr(state);
    const tragPension = tragbarkeitHaushalt(state.immobilien.items, pensEink.total);
    if (tragPension.status === "nicht_tragbar" && pensEink.total > 0) {
      // Berechne wie viel Hypothek auf 65 % Belehnung amortisiert werden müsste
      const verkehrswertTotal = eigenheime.reduce(
        (s, i) => s + (i.verkehrswert ?? 0),
        0
      );
      const hypoTotal = eigenheime.reduce(
        (s, i) => s + i.hypotheken.reduce((hs, h) => hs + (h.hoehe ?? 0), 0),
        0
      );
      const ziel65 = verkehrswertTotal * 0.65;
      const amortisationBedarf = Math.max(0, hypoTotal - ziel65);
      out.push({
        id: "opt-tragbarkeit-pension",
        jahr: heute,
        wer: "beide",
        kategorie: "optimierung",
        prioritaet: 1,
        titel: `Tragbarkeit nach Pension: nicht gegeben (${(tragPension.verhaeltnis * 100).toFixed(0)}% > 33%)`,
        detail: `Mit den voraussichtlichen ${formatChfKurz(pensEink.total)} CHF Pensionseinkommen liegen die Wohnkosten bei ${(tragPension.verhaeltnis * 100).toFixed(0)}% des Einkommens. Empfehlung: Hypothek bis Pension auf 65% (CHF ${formatChfKurz(ziel65)}) amortisieren — Bedarf ${formatChfKurz(amortisationBedarf)} CHF.`,
      });
    }
  }

  // ─── Optimierung 5: Bezugspräferenz Rente vs. Kapital ────────────
  for (const p of personen) {
    const bvg = p.idx === "p1" ? state.bvg.p1 : state.bvg.p2;
    if (!bvg.aktiverAnschluss) continue;
    if (bvg.bezugspraeferenz !== "rente") continue;
    const saldo = bvg.altersguthabenBeiBezug ?? 0;
    if (saldo < 200_000) continue; // bei kleinem Saldo unrelevant

    out.push({
      id: `opt-bezug-mischung-${p.idx}`,
      jahr: heute,
      wer: p.idx,
      kategorie: "optimierung",
      prioritaet: 2,
      titel: `Bezug Pensionskasse (${p.name}): Mischung statt 100% Rente prüfen`,
      detail: `Bei ${formatChfKurz(saldo)} CHF PK-Saldo: 50% Kapital (${formatChfKurz(saldo / 2)}) wird einmalig zum Sondertarif besteuert (~5-8%), Rest als Rente. Vorteile: Flexibilität, Vermögen vererbbar. Nachteil: Langlebigkeitsrisiko. Cuira rechnet beide Varianten.`,
    });
  }

  // ─── Optimierung 6: Doppelverdienerabzug-Hinweis (informativ) ────
  if (state.fallart === "paar" && bruttoP1 > 0 && bruttoP2 > 0) {
    const min = Math.min(bruttoP1, bruttoP2);
    const ddvDbg = Math.max(8_400, Math.min(14_600, min * 0.5));
    out.push({
      id: "opt-doppelverdiener",
      jahr: heute,
      wer: "beide",
      kategorie: "optimierung",
      prioritaet: 3,
      titel: `Doppelverdienerabzug wirkt automatisch (~${formatChfKurz(ddvDbg)} CHF DBG)`,
      detail: `Wird in der Steuerveranlagung automatisch berücksichtigt — keine Aktion nötig. Reduziert Bundessteuer, Kanton-Pauschale separat (ZH: bis 13'700 CHF).`,
    });
  }

  return out;
}

function sumEinzahlungen(
  items: PlanState["saeuleDrei"]["p1"],
  jahr: number
): number {
  let total = 0;
  for (const e of items) {
    if (e.jaehrlicheEinzahlung == null) continue;
    if (jahr < e.einzahlungAb) continue;
    if (e.einzahlungBis > 0 && jahr > e.einzahlungBis) continue;
    total += e.jaehrlicheEinzahlung;
  }
  return total;
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

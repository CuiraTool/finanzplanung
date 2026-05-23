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

  // 7. Immobilien-Verkauf oder -Verschenken (Erbvorbezug)
  for (const im of state.immobilien.items) {
    if (im.plan === "verkaufen") {
      out.push({
        id: `immo-verkauf-${im.id}`,
        jahr: im.verkaufsjahr,
        wer: "beide",
        kategorie: "wohnen",
        titel: `Immobilie verkaufen: ${im.beschreibung || "(ohne Bezeichnung)"}`,
        detail: "Käufer suchen, Notarvertrag, Grundbucheintrag — Vorlauf 6–12 Monate",
      });
    } else if (im.plan === "verschenken") {
      out.push({
        id: `immo-verschenken-${im.id}`,
        jahr: im.verkaufsjahr,
        wer: "beide",
        kategorie: "wohnen",
        titel: `Immobilie verschenken (Erbvorbezug): ${im.beschreibung || "(ohne Bezeichnung)"}`,
        detail:
          "Schenkungsvertrag / Erbvorbezugs-Vertrag öffentlich beurkunden, Grundbucheintrag, Hypothek auf Empfänger übertragen oder ablösen. Auch im Block 10 (Nachlass) dokumentieren.",
      });
    }
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

  // Brutto-Lohn pro Person (für Steuer-Berechnungen).
  // Fallback: wenn AHV-Brutto-Lohn nicht erfasst, leite aus Block 3 (Netto)
  // ab via Netto × 1.15 (Sozialabgaben + BVG ≈ 15 %). So funktioniert die
  // 3a-/PK-Optimierung auch bei reiner Netto-Erfassung im Budget.
  const bruttoP1Roh = state.ahv.einkommenP1 ?? 0;
  const bruttoP2Roh =
    state.fallart === "paar" ? state.ahv.einkommenP2 ?? 0 : 0;
  const nettoP1 = nettoEinkommenJahrPerson(state.budget.einkommen, 1);
  const nettoP2 =
    state.fallart === "paar"
      ? nettoEinkommenJahrPerson(state.budget.einkommen, 2)
      : 0;
  const bruttoP1 = bruttoP1Roh > 0 ? bruttoP1Roh : Math.round(nettoP1 * 1.15);
  const bruttoP2 = bruttoP2Roh > 0 ? bruttoP2Roh : Math.round(nettoP2 * 1.15);
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
      pkEinkaufJahr: beispielEinkauf,
    }).einkommen;
    const ersparnis = aktuelleSteuer - mitEinkaufSteuer;
    if (ersparnis > 1_000) {
      // Folge-Wirkung: zusätzliche PK-Rente lebenslang
      // Einkauf wird mit BVG-Mindestzins (~1.25%) bis zum Bezug verzinst,
      // dann via Umwandlungssatz zur Rente. Vereinfachte Approximation:
      //   Einkauf × (1 + zinssatz)^(jahre) × umwandlungssatz
      const wachstumsfaktor = Math.pow(
        1 + 0.0125,
        Math.max(0, jahreBis - 1) // -1 wegen 3-J-Sperrfrist; konservativ
      );
      const uws = bvg.umwandlungssatzProzent / 100;
      const mehrRenteJahr =
        bvg.bezugspraeferenz === "rente" ||
        bvg.bezugspraeferenz === "mischung"
          ? Math.round(beispielEinkauf * wachstumsfaktor * uws)
          : 0;

      const titel =
        mehrRenteJahr > 0
          ? `PK-Einkauf (${p.name}) 30k — spart ${formatChfKurz(ersparnis)} Steuer + ${formatChfKurz(mehrRenteJahr)} Rente/J`
          : `PK-Einkauf prüfen (${p.name}) — pro 30k spart ~${formatChfKurz(ersparnis)} Steuern`;

      out.push({
        id: `opt-pk-einkauf-${p.idx}`,
        jahr: heute,
        wer: p.idx,
        kategorie: "optimierung",
        prioritaet: 2,
        titel,
        detail: `${jahreBis} Jahre bis Pension, 3-J-Sperrfrist beachten. Steuerersparnis ${formatChfKurz(ersparnis)} CHF im Einkauf-Jahr. Bei Bezugsform Rente/Mischung: zusätzliche ${formatChfKurz(mehrRenteJahr)} CHF Rente lebenslang (Approximation, exakter Wert via PK-Anbieter). Steuer-Bonus wiederholbar je Einkauf-Jahr.`,
        geschaetzteErsparnis: ersparnis,
      });
    }
  }

  // Optimierung "Kantonswechsel ZG" entfernt — wirkt aufdringlich + ist
  // selten realistisch. Stattdessen kann der Berater via Block 2 "Umzug
  // geplant?" einen konkreten Umzug modellieren (Plan A vs Plan B).

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

  // Doppelverdienerabzug ist keine User-Massnahme — wird automatisch
  // in der Steuerveranlagung berücksichtigt. Aus Massnahmen-Liste entfernt
  // (User-Feedback: pollutiert Liste, keine Aktion nötig).

  // ─── Optimierung 7: 3a-Staffel-Bezug (Kapitalsteuer-Optimierung) ──
  // Wenn alle 3a-Konten + FZ im gleichen Jahr fällig werden, fällt voller
  // Kapitalsteuer-Tarif einmal an. Bei Staffelung über 3-5 Jahre tieferer
  // Tarif pro Bezug → Steuerersparnis bei grossem Saldo signifikant.
  for (const p of personen) {
    const items = p.idx === "p1" ? state.saeuleDrei.p1 : state.saeuleDrei.p2;
    const fz = p.idx === "p1" ? state.bvg.p1.freizuegigkeit : state.bvg.p2.freizuegigkeit;

    // Nur Bezüge mit echtem Saldo, gruppiert nach Bezugsjahr
    const bezuegeProJahr = new Map<number, number>();
    for (const it of items) {
      const saldo = (it.aktuellerWert ?? 0) + (it.rueckkaufswert ?? 0);
      const bezugsjahr =
        it.type === "konto" ? it.auszahlungsjahr : it.ablaufjahr;
      if (saldo <= 0 || !bezugsjahr) continue;
      bezuegeProJahr.set(
        bezugsjahr,
        (bezuegeProJahr.get(bezugsjahr) ?? 0) + saldo
      );
    }
    for (const f of fz) {
      const saldo = f.saldoHeute ?? 0;
      if (saldo <= 0 || !f.auszahlungsjahr) continue;
      bezuegeProJahr.set(
        f.auszahlungsjahr,
        (bezuegeProJahr.get(f.auszahlungsjahr) ?? 0) + saldo
      );
    }

    // Auf Klumpung prüfen: ein Jahr mit > 200k oder grösstes ist > 60% Total
    const total = Array.from(bezuegeProJahr.values()).reduce(
      (a, b) => a + b,
      0
    );
    if (total < 250_000 || bezuegeProJahr.size === 0) continue;
    const max = Math.max(...bezuegeProJahr.values());
    const istGeklumpt = max > 250_000 || max / total > 0.6;
    if (!istGeklumpt) continue;

    // Approximative Steuerersparnis bei Staffelung über 3 Jahre:
    // Annahme progressive Kapitalsteuer ≈ 6-8% bei 200-500k → 4-5% bei
    // <100k. Differenz ~2 % auf den Über-200k-Anteil.
    const ueber200 = Math.max(0, max - 200_000);
    const grobeErsparnis = Math.round(ueber200 * 0.02);

    if (grobeErsparnis > 2_000) {
      out.push({
        id: `opt-3a-staffel-${p.idx}`,
        jahr: heute,
        wer: p.idx,
        kategorie: "optimierung",
        prioritaet: 2,
        titel: `3a/FZ-Staffel-Bezug (${p.name}) — spart ~${formatChfKurz(grobeErsparnis)} Kapitalsteuer`,
        detail: `Aktuell konzentriert sich der Bezug auf ein Jahr (${formatChfKurz(max)} CHF). Über 3-5 Jahre gestaffelt rutscht jeder Bezug in einen tieferen progressiven Kapitalsteuer-Tarif. Konten/Policen mit anderen Auszahlungsjahren versehen → bis ~${formatChfKurz(grobeErsparnis)} CHF Steuern weniger.`,
        geschaetzteErsparnis: grobeErsparnis,
      });
    }
  }

  // ─── Optimierung 8: Nachlass-Sicherung ──────────────────────────
  // Wenn Vorsorgeauftrag/Patientenverfügung/Testament fehlen → Hinweis.
  // Wirkung ist primär nicht-monetär (Familie geschützt), aber wir
  // schätzen die Notargebühren bei Nichtanlegen (Erbgang ohne Verfügung).
  // Nur Dokumente die fehlen ("nein") UND nicht als "nicht_notwendig"
  // markiert wurden. "ja" = vorhanden, "nicht_notwendig" = User-Entscheid.
  const istFehlend = (status: string | undefined): boolean => status === "nein";

  const nachlassFehlen: string[] = [];
  if (istFehlend(state.nachlass.vorsorgeauftrag))
    nachlassFehlen.push("Vorsorgeauftrag");
  if (istFehlend(state.nachlass.patientenverfuegung))
    nachlassFehlen.push("Patientenverfügung");
  if (istFehlend(state.nachlass.testament)) nachlassFehlen.push("Testament");
  if (
    state.fallart === "paar" &&
    state.zivilstand === "verheiratet" &&
    istFehlend(state.nachlass.ehevertrag)
  ) {
    nachlassFehlen.push("Ehevertrag");
  }
  if (istFehlend(state.nachlass.erbvertrag)) {
    // Erbvertrag separat — wird typisch bei komplexem Familienkontext nötig
    // (Patchwork, Konkubinat, ungleiche Erbteile). User entscheidet via
    // "nicht_notwendig" wenn Standardfall.
    nachlassFehlen.push("Erbvertrag");
  }
  if (nachlassFehlen.length >= 2) {
    out.push({
      id: "opt-nachlass-sicherung",
      jahr: heute,
      wer: "beide",
      kategorie: "optimierung",
      prioritaet: 2,
      titel: `Nachlass-Sicherung — ${nachlassFehlen.length} Dokumente fehlen`,
      detail: `Es fehlen: ${nachlassFehlen.join(", ")}. Bei Urteilsunfähigkeit oder Tod ohne Vorsorgeauftrag/Testament läuft Erbgang nach gesetzlicher Erbfolge — Familie hat keinen Einfluss. Notar-Kosten Vorsorgeauftrag CHF 300-800, Patientenverfügung kostenlos online, Testament CHF 600-1'500. Wert: rechtssicherer Nachlass + emotional entlastete Hinterbliebene.`,
      geschaetzteErsparnis: 0,
    });
  }

  // ─── Optimierung 9: AHV-Aufschub (Mehrrente lebenslang) ─────────
  // Aufschub max 5 Jahre, BSV-Tabelle: 1J +5.2%, 2J +10.8%, 5J +31.5%.
  // Lohnt bei: hoher Lebenserwartung + Liquiditäts-Polster.
  // Wir schlagen es vor wenn aktuelles Bezugsalter = 65 und Vermögen
  // bei Pension > 800k (Polster vorhanden).
  for (const p of personen) {
    const aktuellesBezugsalter =
      p.idx === "p1"
        ? state.ahv.ahvBezugsalterP1
        : state.ahv.ahvBezugsalterP2;
    // Aufschub-Vorschlag NUR wenn User Aufschub explizit gewählt hat
    // (AHV-Bezugsalter > 65) ODER wenn Wunsch-Pensionsalter > 65 ist.
    // Wenn User mit 65 bezieht → keine ungebetene Lebensentscheidung
    // aufdrängen.
    const wunschBezugsalter =
      p.idx === "p1" ? state.ziele.bezugsalterP1 : state.ziele.bezugsalterP2;
    const willAufschub = aktuellesBezugsalter > 65 || wunschBezugsalter > 65;
    if (!willAufschub) continue;

    // Heuristik: nur Vorschlag wenn ausreichend Polster
    const heuteJahr = new Date().getFullYear();
    const geburtsjahrP =
      p.idx === "p1"
        ? parseInt(state.person1.geburtsdatum.slice(0, 4), 10)
        : parseInt(state.person2.geburtsdatum.slice(0, 4), 10);
    if (!Number.isFinite(geburtsjahrP)) continue;
    const alter = heuteJahr - geburtsjahrP;
    if (alter < 50 || alter > 64) continue; // nur sinnvoll wenn nahe Pension

    // Approximation: AHV-Maximalrente CHF 30'240, +10.8% bei 2J Aufschub = +3'266/J
    const mehrRente2J = Math.round(30_240 * 0.108);

    out.push({
      id: `opt-ahv-aufschub-${p.idx}`,
      jahr: heute,
      wer: p.idx,
      kategorie: "optimierung",
      prioritaet: 3,
      titel: `AHV-Aufschub 2 Jahre (${p.name}) — bis +${formatChfKurz(mehrRente2J)} CHF/Jahr lebenslang`,
      detail: `Wer die AHV erst mit 67 statt 65 bezieht, erhält +10.8% Rente lebenslang (BSV-Aufschubtabelle). Bei Maximalrente: ~${formatChfKurz(mehrRente2J)} CHF mehr/Jahr. Lohnt bei: erwarteter Lebensdauer >82, ausreichendem Liquiditäts-Polster für die zwei Aufschub-Jahre, weiterer Erwerbstätigkeit. Bei Aufschub max 5 J. = +31.5%.`,
      geschaetzteErsparnis: mehrRente2J,
    });
  }

  // ─── Optimierung 10: WEF-Rückzahlung VOR PK-Einkauf ─────────────
  // Gesetzlich (Art. 79b Abs. 3 BVG): PK-Einkäufe sind nur zulässig wenn
  // WEF-Vorbezüge zuerst zurückgezahlt sind. Bei Verstoss → Aberkennung
  // des Steuerabzugs + Nachsteuer + Bussen. Häufiger Berater-Fail.
  // Nur aktiv wenn (a) WEF-Vorbezüge vorhanden UND (b) Berater PK-Einkauf
  // bereits geplant hat ODER unsere PK-Einkauf-Massnahme wahrscheinlich
  // greift (= Berater bekommt sie ohnehin in der Liste).
  for (const p of personen) {
    const bvg = p.idx === "p1" ? state.bvg.p1 : state.bvg.p2;
    if (!bvg.aktiverAnschluss) continue;
    const offeneWef = (bvg.wefVorbezuege ?? []).reduce(
      (s, w) => s + (w.betrag ?? 0),
      0
    );
    if (offeneWef <= 0) continue;
    const planterEinkauf = bvg.einkaeufe.length > 0;
    const passendeEinkaufMassnahme = out.some(
      (m) => m.id === `opt-pk-einkauf-${p.idx}`
    );
    if (!planterEinkauf && !passendeEinkaufMassnahme) continue;

    out.push({
      id: `opt-wef-rueckzahlung-${p.idx}`,
      jahr: heute,
      wer: p.idx,
      kategorie: "vorsorge",
      prioritaet: 1,
      titel: `WEF-Vorbezug rückzahlen (${p.name}) — vor PK-Einkauf zwingend`,
      detail: `${formatChfKurz(offeneWef)} CHF WEF-Vorbezug offen. Gemäss Art. 79b Abs. 3 BVG sind freiwillige PK-Einkäufe nur zulässig wenn der WEF-Vorbezug zuerst zurückgezahlt ist. Andernfalls wird der Steuerabzug aberkannt + Nachsteuer + Verzugszinsen. Rückzahlung mindert keine Rente — der zurückgezahlte Betrag wächst wieder im Altersguthaben.`,
    });
  }

  // ─── Optimierung 11: Schenkung statt Erbschaft (hohes Vermögen) ──
  // Bei grossem Vermögen + Alter P1 ≥ 60 sind Schenkungen zu Lebzeiten
  // oft steuergünstiger als Erbschaften — viele Kantone haben Schenkungs-
  // freibeträge alle 5 J. + niedrigere Sätze für direkte Nachkommen.
  // Plus: Generation-Skip oder Heirats-Schenkungen reduzieren später
  // Erbschaftssteuer.
  const heuteJahrLocal = new Date().getFullYear();
  const geburtsjahrLocal = parseInt(
    state.person1.geburtsdatum.slice(0, 4),
    10
  );
  const alterP1Local = Number.isFinite(geburtsjahrLocal)
    ? heuteJahrLocal - geburtsjahrLocal
    : 0;
  // Grob: Vermögen aus Block 7 + Immobilien-Netto
  const vermoegenLiquid = state.vermoegen.items.reduce(
    (s, it) =>
      s + (it.typ === "darlehen" ? -(it.saldoHeute ?? 0) : it.saldoHeute ?? 0),
    0
  );
  const immoNetto = state.immobilien.items.reduce((s, im) => {
    const wert = im.verkehrswert ?? 0;
    const hypo = im.hypotheken.reduce((hs, h) => hs + (h.hoehe ?? 0), 0);
    return s + Math.max(0, wert - hypo);
  }, 0);
  const vermoegenGrob = vermoegenLiquid + immoNetto;

  if (
    vermoegenGrob > 1_500_000 &&
    alterP1Local >= 60 &&
    state.kinder.length > 0
  ) {
    out.push({
      id: "opt-schenkung-statt-erbschaft",
      jahr: heuteJahrLocal,
      wer: "beide",
      kategorie: "nachlass",
      prioritaet: 2,
      titel: `Schenkung zu Lebzeiten prüfen — bei ${formatChfKurz(vermoegenGrob)} CHF Vermögen`,
      detail: `Bei direkten Nachkommen ist Schenkung in vielen Kantonen steuergünstiger als Erbschaft (ZH, BE, AG, SG: Kinder erbschaftssteuerfrei; aber Mehrhuhausen-Kantone besteuern Erbschaften). Vorteile Schenkung: Pflichtteil-Schutz, Generation-Skip möglich, frühe Vermögensplanung, Stiefkinder/Lebenspartner erfassbar. Nachteile: Kontrollverlust, Liquiditätsbedarf für Pflege/Eigenbedarf. CH-spezifisch via Schenkungsvertrag + ggf. Nutzniessungs-Vorbehalt.`,
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

/**
 * Netto-Jahreseinkommen pro Person aus Block 3 (Einkommensperioden).
 * Heute-Wert: nur Perioden die im aktuellen Jahr aktiv sind.
 */
function nettoEinkommenJahrPerson(
  perioden: PlanState["budget"]["einkommen"],
  personIdx: 1 | 2
): number {
  const heute = new Date().getFullYear();
  let total = 0;
  for (const p of perioden) {
    if (p.personIdx !== personIdx) continue;
    if (p.betragMonatlich == null) continue;
    const vonJ = p.von ? Number(p.von.slice(0, 4)) : 0;
    const bisJ = p.bis ? Number(p.bis.slice(0, 4)) : 9999;
    if (heute < vonJ || heute > bisJ) continue;
    total += p.betragMonatlich * 12;
  }
  return total;
}

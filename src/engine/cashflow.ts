/**
 * Cashflow-Engine V2 — Jahres-Iteration für Charts.
 *
 * Liefert pro Jahr eine Zeile mit Einnahmen / Ausgaben / Saldo / Vermögen
 * für den Zeitraum [vonJahr, bisJahr]. Konsumiert die einzelnen Engine-Module
 * (AHV, BVG, 3a, FZ, Immobilien, Firma) sowie die Steuer-Engine.
 *
 * Vereinfachungen Etappe 2 V1:
 *   - Erwerbseinkommen aus Einkommens-Perioden, monatlich → jährlich
 *   - AHV/BVG-Rente ab dem jeweiligen Bezugsjahr, konstant
 *   - Mieteinnahmen bis Verkaufsjahr (exklusiv), brutto
 *   - Kapitalauszahlungen (PK, 3a, FZ, Immobilienverkauf, Firma) im
 *     jeweiligen Auszahlungsjahr — fliessen einmalig ins Vermögen
 *   - Wunschverbrauch ab Pensionierung, vorher aktuelle Ausgaben
 *   - Steuern via steuerProJahr (Anker oder Default-Satz)
 *   - Vermögen wird Jahr für Jahr fortgeschrieben (Saldo + Kap.-Auszahlungen
 *     − Steuern aufs Kap.). Block 7 verzinst sich mit eigener Rendite.
 *
 * Bewusst nicht modelliert:
 *   - Inflation, Eigenmietwert, Schuldzinsabzug, GGSt, Kinderabzüge
 *   - Hypothek-Amortisation, Wertsteigerung Immobilien
 *   - Sterbetafel, partielle Pension (Pensumsreduktion)
 */

import type {
  PlanState,
  BvgPersonInput,
  Einkommensperiode,
  Immobilie,
  VermoegenItem,
} from "@/lib/store";
import {
  ahvJahresrenteEinzel,
  ahvCouplePension,
  ORDENTLICHES_AHV_ALTER,
  MAX_VORBEZUG_JAHRE,
  MAX_AUFSCHUB_JAHRE,
} from "./ahv";
import { bvgBezug, bvgGesamtkapitalBeiBezug, freizuegigkeitAuszahlung } from "./bvg";
import { saeuleDreiAuszahlung } from "./saeule3";
import { steuerProJahr } from "./steuer";
import { immobilienVerkaufsAuszahlungNetto } from "./immobilien";
import { pensionsjahr } from "@/lib/pension";

export type CashflowInput = Pick<
  PlanState,
  | "fallart"
  | "person1"
  | "person2"
  | "kinder"
  | "ahv"
  | "bvg"
  | "saeuleDrei"
  | "vermoegen"
  | "immobilien"
  | "firma"
  | "ziele"
  | "budget"
  | "adresse"
  | "einmaligeAusgaben"
> & {
  /** Optional — wird für Erbschaft/Schenkung-Engine verwendet wenn vorhanden. */
  erbschaft?: PlanState["erbschaft"];
};

/**
 * Wendet Szenario-B-Overrides auf einen CashflowInput an. Felder im Overlay
 * überschreiben die entsprechenden State-Felder; alles andere bleibt gleich.
 */
export function applyOverrides(
  base: CashflowInput,
  overrides: import("@/lib/store").SzenarioBOverrides
): CashflowInput {
  // Einkommens-Multiplikator auf alle Perioden anwenden
  const mult = overrides.einkommensMultiplikator;
  const einkommen = mult != null && mult !== 1
    ? base.budget.einkommen.map((e) => ({
        ...e,
        betragMonatlich:
          e.betragMonatlich != null
            ? Math.round(e.betragMonatlich * mult)
            : null,
      }))
    : base.budget.einkommen;

  // Immobilien-Plan-Overrides
  const immoOv = overrides.immobilienOverrides ?? {};
  const immobilien = {
    items: base.immobilien.items.map((im) => {
      const ov = immoOv[im.id];
      if (!ov) return im;
      return {
        ...im,
        plan: ov.plan ?? im.plan,
        verkaufsjahr: ov.verkaufsjahr ?? im.verkaufsjahr,
      };
    }),
  };

  return {
    ...base,
    ziele: {
      ...base.ziele,
      bezugsalterP1: overrides.bezugsalterP1 ?? base.ziele.bezugsalterP1,
      bezugsalterP2: overrides.bezugsalterP2 ?? base.ziele.bezugsalterP2,
    },
    ahv: {
      ...base.ahv,
      ahvBezugsalterP1:
        overrides.ahvBezugsalterP1 ?? base.ahv.ahvBezugsalterP1,
      ahvBezugsalterP2:
        overrides.ahvBezugsalterP2 ?? base.ahv.ahvBezugsalterP2,
    },
    bvg: {
      p1: {
        ...base.bvg.p1,
        bezugspraeferenz:
          overrides.bvgBezugspraeferenzP1 ?? base.bvg.p1.bezugspraeferenz,
      },
      p2: {
        ...base.bvg.p2,
        bezugspraeferenz:
          overrides.bvgBezugspraeferenzP2 ?? base.bvg.p2.bezugspraeferenz,
      },
    },
    budget: {
      ...base.budget,
      einkommen,
      wunschverbrauchPension:
        overrides.wunschverbrauchPension !== undefined
          ? overrides.wunschverbrauchPension
          : base.budget.wunschverbrauchPension,
      ausgabenTotal:
        overrides.ausgabenTotal !== undefined
          ? overrides.ausgabenTotal
          : base.budget.ausgabenTotal,
    },
    immobilien,
  };
}

export interface CashflowZeile {
  jahr: number;
  alterP1: number | null;
  alterP2: number | null;
  einnahmenErwerb: number;
  einnahmenAhv: number;
  einnahmenBvgRente: number;
  einnahmenMieten: number;
  einnahmenErbschaft: number; // einmalige Erbschaft (im Jahr; nur wenn Toggle aktiv)
  einnahmenTotal: number;
  ausgabenHaushalt: number;
  ausgabenSteuern: number;
  ausgabenSteuernEinkommen: number;
  ausgabenSteuernEinkommenBund: number; // davon Bund (DBG)
  ausgabenSteuernEinkommenKanton: number; // davon Kanton+Gemeinde+Kirche
  ausgabenSteuernVermoegen: number;
  ausgabenSteuernKapital: number;
  ausgabenSteuernKapitalBund: number; // davon Bund (1/5 DBG)
  ausgabenSteuernKapitalKanton: number; // davon Kanton-Sondertarif
  ausgabenSozialBvg: number; // AHV/IV/EO + ALV + NBU + BVG-AN-Beitrag (Erwerbsphase)
  ausgabenVorsorge3a: number; // jährliche Einzahlungen Säule 3a/3b
  ausgabenHypozins: number; // jährliche Hypothek-Zinsen (Σ über alle laufenden Tranchen)
  ausgabenSchenkung: number; // einmalige Schenkung / Erbvorbezug (im Jahr; nur wenn Toggle aktiv)
  ausgabenEinmalig: number;
  ausgabenTotal: number;
  kapAuszahlungen: number;
  saldo: number;
  // Granular Vermögens-Komponenten (Snapshot zum Jahresende):
  vermoegenLiquiditaet: number; // Block 7 Konten + Hauptkonto-Saldo
  vermoegenWertschriften: number; // Block 7 Depots
  vermoegenVorsorge: number; // PK + 3a + FZ vor Auszahlung
  vermoegenImmobilien: number; // Verkehrswerte aller noch gehaltenen Liegenschaften
  vermoegenFirma: number; // Verkaufserlös wenn behalten, 0 nach Verkauf
  vermoegenSchulden: number; // Hypotheken (auf gehaltenen Liegenschaften) + Darlehen
  vermoegenAktiva: number; // Liquid + Wertschriften + Vorsorge + Immobilien + Firma
  vermoegenNetto: number; // Aktiva − Schulden
}

export function cashflowReihe(
  state: CashflowInput,
  vonJahr: number,
  bisJahr: number
): CashflowZeile[] {
  const result: CashflowZeile[] = [];

  // Vorab-Berechnungen
  const ahvBezugsjahrP1 = pensionsjahr(
    state.person1.geburtsdatum,
    clampAhvAlter(state.ahv.ahvBezugsalterP1)
  );
  const ahvBezugsjahrP2 =
    state.fallart === "paar"
      ? pensionsjahr(state.person2.geburtsdatum, clampAhvAlter(state.ahv.ahvBezugsalterP2))
      : null;
  const pkBezugsjahrP1 = pensionsjahr(state.person1.geburtsdatum, state.ziele.bezugsalterP1);
  const pkBezugsjahrP2 =
    state.fallart === "paar"
      ? pensionsjahr(state.person2.geburtsdatum, state.ziele.bezugsalterP2)
      : null;

  const ahvRenteHaushalt = computeAhvRente(state, ahvBezugsjahrP1, ahvBezugsjahrP2);
  const bvgRenteHaushalt = computeBvgRenteHaushalt(state);
  const bvgKapitalAuszahlungen = computeBvgKapitalAuszahlungen(state);

  // Per-Item Tracker für Block 7 — jedes Item hat seine eigene Rendite und
  // wird Jahr für Jahr fortgeschrieben. Hauptkonto bekommt zusätzlich den
  // Cashflow-Saldo + Kapitalauszahlungen.
  type Block7Tracker = { item: VermoegenItem; saldo: number };
  const block7: Block7Tracker[] = state.vermoegen.items.map((it) => ({
    item: it,
    saldo: it.saldoHeute ?? 0,
  }));
  const hauptkontoIdx = block7.findIndex((b) => b.item.istHauptkonto);

  for (let jahr = vonJahr; jahr <= bisJahr; jahr++) {
    const alterP1 = berechneAlter(state.person1.geburtsdatum, jahr);
    const alterP2 =
      state.fallart === "paar" ? berechneAlter(state.person2.geburtsdatum, jahr) : null;

    // ─── Einnahmen ────────────────────────────────────────────────
    const einnahmenErwerb = erwerbseinkommenJahr(state.budget.einkommen, jahr);
    // Aufgesplittet pro Person (für Steuer-Abzüge — Sozial+BVG+Berufsauslagen
    // sind pro Person zu rechnen)
    const erwerbP1Roh = erwerbseinkommenJahrPerson(state.budget.einkommen, jahr, 1);
    const erwerbP2Roh = erwerbseinkommenJahrPerson(state.budget.einkommen, jahr, 2);
    // Plausibilisierung: wenn Block 3 keine Perioden hat, fallback auf
    // ahv.einkommenP1/P2 (gilt für alle Jahre vor Pensionierung)
    const istVorPensionP1 =
      pkBezugsjahrP1 == null || jahr < pkBezugsjahrP1;
    const istVorPensionP2 =
      pkBezugsjahrP2 == null || jahr < pkBezugsjahrP2;
    const bruttoErwerbP1 =
      erwerbP1Roh > 0
        ? erwerbP1Roh
        : istVorPensionP1
          ? state.ahv.einkommenP1 ?? 0
          : 0;
    const bruttoErwerbP2 =
      state.fallart === "paar"
        ? erwerbP2Roh > 0
          ? erwerbP2Roh
          : istVorPensionP2
            ? state.ahv.einkommenP2 ?? 0
            : 0
        : 0;
    // Total 3a-Einzahlung im Jahr (alle Konten + Versicherungen, beide Personen,
    // wenn jahr in einzahlungAb..einzahlungBis liegt)
    const saeule3aEinzahlungJahr =
      saeuleDreiEinzahlungJahr(state.saeuleDrei.p1, jahr) +
      (state.fallart === "paar"
        ? saeuleDreiEinzahlungJahr(state.saeuleDrei.p2, jahr)
        : 0);

    // AHV-Einnahmen je nach Pensionierungsstatus:
    //  • beide pensioniert → Ehepaarrente (Splitting + Plafond)
    //  • nur einer pensioniert → seine eigene Einzelrente (kein Plafond,
    //    kein Splitting — beides erst ab gemeinsamer Pensionierung)
    let einnahmenAhv = 0;
    const p1AhvBezieht =
      ahvBezugsjahrP1 != null && jahr >= ahvBezugsjahrP1;
    const p2AhvBezieht =
      state.fallart === "paar" &&
      ahvBezugsjahrP2 != null &&
      jahr >= ahvBezugsjahrP2;
    if (state.fallart === "paar") {
      if (p1AhvBezieht && p2AhvBezieht) {
        einnahmenAhv = ahvRenteHaushalt.haushalt;
      } else if (p1AhvBezieht) {
        einnahmenAhv = ahvRenteHaushalt.p1Einzel;
      } else if (p2AhvBezieht) {
        einnahmenAhv = ahvRenteHaushalt.p2Einzel;
      }
    } else if (p1AhvBezieht) {
      einnahmenAhv = ahvRenteHaushalt.haushalt;
    }

    let einnahmenBvgRente = 0;
    if (pkBezugsjahrP1 != null && jahr >= pkBezugsjahrP1) {
      einnahmenBvgRente += bvgRenteHaushalt.p1;
    }
    if (
      state.fallart === "paar" &&
      pkBezugsjahrP2 != null &&
      jahr >= pkBezugsjahrP2
    ) {
      einnahmenBvgRente += bvgRenteHaushalt.p2;
    }

    const einnahmenMieten = mieteinnahmenJahr(state.immobilien.items, jahr);

    // Erbschaft als einmaliger Eingang im erwartetJahr (nur wenn Toggle aktiv)
    const einnahmenErbschaft = erbschaftEinnahmeJahr(state, jahr);

    const einnahmenTotal =
      einnahmenErwerb +
      einnahmenAhv +
      einnahmenBvgRente +
      einnahmenMieten +
      einnahmenErbschaft;

    // ─── Kapitalauszahlungen (einmalig im Jahr) ──────────────────
    const kapZeile = kapitalauszahlungenJahr(
      state,
      jahr,
      bvgKapitalAuszahlungen
    );
    const kapAuszahlungen = kapZeile;
    // WEF-Vorbezug: wird mit Kapitalauszahlungs-Sondertarif besteuert,
    // fliesst aber typisch direkt ins Eigenheim (nicht aufs Hauptkonto).
    // Daher zur Steuer-Bemessung dazu, aber NICHT zum Cashflow-Total.
    const wefBetragJahr = wefVorbezugJahr(state, jahr);
    const kapAuszahlungenFuerSteuer = kapAuszahlungen + wefBetragJahr;

    // ─── Ausgaben ────────────────────────────────────────────────
    const istPensioniert =
      pkBezugsjahrP1 != null && jahr >= pkBezugsjahrP1;
    const ausgabenHaushalt = haushaltsausgabenJahr(state.budget, istPensioniert);
    const ausgabenEinmalig = einmaligeAusgabenJahr(state.einmaligeAusgaben, jahr);
    const ausgabenHypozins = hypothekenZinsenJahr(state, jahr);
    const ausgabenSchenkung = schenkungAusgabeJahr(state, jahr);

    // Vermögen vor Steuern (Stand Jahresanfang) — vereinfacht: Block-7-Saldi
    // VOR der Cashflow-Buchung in diesem Jahr, plus Immobilien minus Hypotheken.
    const block7AktivaJahresanfang = block7
      .filter((b) => b.item.typ !== "darlehen")
      .reduce((s, b) => s + b.saldo, 0);
    const block7DarlehenJahresanfang = block7
      .filter((b) => b.item.typ === "darlehen")
      .reduce((s, b) => s + b.saldo, 0);
    const immoJahresanfang = immobilienWertAmJahresende(state, jahr - 1);
    const hypoJahresanfang = hypothekenAmJahresende(state, jahr - 1);
    const vermoegenJahresanfang =
      block7AktivaJahresanfang +
      immoJahresanfang -
      block7DarlehenJahresanfang -
      hypoJahresanfang;

    const steuern = steuerProJahr({
      einkommenJahr: einnahmenErwerb + einnahmenMieten + einnahmenAhv + einnahmenBvgRente,
      vermoegenJahr: vermoegenJahresanfang,
      kapAuszahlungenJahr: kapAuszahlungenFuerSteuer,
      kanton: state.adresse.kanton,
      bfsId: state.adresse.gemeindeBfsId ?? undefined,
      religion: state.budget.religion,
      fallart: state.fallart,
      jahr: jahr <= 2025 ? 2025 : 2026,
      // Detail-Felder für präzise Abzüge (Phase 5)
      bruttoErwerbP1,
      bruttoErwerbP2,
      alterP1: alterP1 ?? 40,
      alterP2: alterP2 ?? 40,
      anzahlKinder: anzahlKinderAbzugsfaehig(state.kinder, jahr),
      saeule3aEinzahlungJahr,
      hatPkAnschlussP1:
        state.bvg.p1.aktiverAnschluss && istVorPensionP1,
      hatPkAnschlussP2:
        state.fallart === "paar" &&
        state.bvg.p2.aktiverAnschluss &&
        istVorPensionP2,
      ankerSteuernHeute: state.budget.steuernHeute,
      ankerEinkommenHeute: state.budget.einkommenHeute,
      // User-Wunsch: Erwerbseinkommen wird als Netto interpretiert
      // (Sozial+BVG bereits abgezogen). Engine zieht keine zusätzlichen
      // Sozial-Abzüge mehr ab — nur Berufsauslagen + Versicherung +
      // Kinder + 3a + DDV. Konsistent mit dem im Block 5 separat
      // erfassten BVG-Beitrag.
      einkommenIstNetto: true,
    });
    const ausgabenSteuern = steuern.total;
    const ausgabenSteuernEinkommen = steuern.einkommen;
    const ausgabenSteuernEinkommenBund = steuern.einkommenBund;
    const ausgabenSteuernEinkommenKanton = steuern.einkommenKanton;
    const ausgabenSteuernVermoegen = steuern.vermoegen;
    const ausgabenSteuernKapital = steuern.kapital;
    const ausgabenSteuernKapitalBund = steuern.kapitalBund;
    const ausgabenSteuernKapitalKanton = steuern.kapitalKanton;

    // Sozialabgaben + BVG-AN-Beitrag aus den Abzügen extrahieren
    // (nur in Erwerbsphase relevant — bei Pensionierung sind die 0)
    const ab = steuern.abzuegeDbg;
    const ausgabenSozialBvg = ab
      ? ab.sozialversicherungP1 +
        ab.sozialversicherungP2 +
        ab.bvgBeitragP1 +
        ab.bvgBeitragP2
      : 0;
    // 3a-Einzahlung als separate Vorsorge-Ausgabe (geht NICHT auf das
    // Hauptkonto, sondern wächst den 3a-Saldo)
    const ausgabenVorsorge3a = saeule3aEinzahlungJahr;

    const ausgabenTotal =
      ausgabenHaushalt +
      ausgabenSteuern +
      ausgabenEinmalig +
      ausgabenSozialBvg +
      ausgabenVorsorge3a +
      ausgabenHypozins +
      ausgabenSchenkung;

    // ─── Saldo ───────────────────────────────────────────────────
    const saldo = einnahmenTotal - ausgabenTotal;

    // ─── Vermögens-Update: pro Bucket fortschreiben ─────────────
    // 1. Block 7: jedes Item mit eigener Rendite verzinsen
    for (const b of block7) {
      b.saldo *= 1 + b.item.renditeProzent / 100;
    }
    // 2. Hauptkonto bekommt Cashflow-Saldo + Kapitalauszahlungen aus Vorsorge/
    //    Immo-Verkauf/Firma-Verkauf
    if (hauptkontoIdx >= 0) {
      const hk = block7[hauptkontoIdx]!;
      hk.saldo += saldo + kapAuszahlungen;
    }

    // 3. Snapshot: Liquidität / Wertschriften / Schulden aus Block 7
    let vermoegenLiquiditaet = 0;
    let vermoegenWertschriften = 0;
    let darlehenStand = 0;
    for (const b of block7) {
      if (b.item.typ === "konto") vermoegenLiquiditaet += b.saldo;
      else if (b.item.typ === "depot") vermoegenWertschriften += b.saldo;
      else if (b.item.typ === "darlehen") darlehenStand += b.saldo;
    }

    // 4. Vorsorge-Bucket: PK + 3a + FZ — alle, die noch nicht ausbezahlt sind
    const vermoegenVorsorge = vorsorgeVermoegenAmJahresende(
      state,
      jahr,
      pkBezugsjahrP1,
      pkBezugsjahrP2,
      bvgKapitalAuszahlungen
    );

    // 5. Immobilien-Bucket: noch gehaltene Liegenschaften (vor Verkaufsjahr)
    const vermoegenImmobilien = immobilienWertAmJahresende(state, jahr);

    // 6. Firma-Bucket: möglicher Verkaufserlös solange noch nicht verkauft
    const vermoegenFirma = firmaWertAmJahresende(state.firma, jahr);

    // 7. Schulden: Hypotheken auf noch gehaltenen Liegenschaften + Darlehen
    const hypothekenStand = hypothekenAmJahresende(state, jahr);
    const vermoegenSchulden = hypothekenStand + darlehenStand;

    const vermoegenAktiva =
      vermoegenLiquiditaet +
      vermoegenWertschriften +
      vermoegenVorsorge +
      vermoegenImmobilien +
      vermoegenFirma;
    const vermoegenNetto = vermoegenAktiva - vermoegenSchulden;

    result.push({
      jahr,
      alterP1,
      alterP2,
      einnahmenErwerb: Math.round(einnahmenErwerb),
      einnahmenAhv: Math.round(einnahmenAhv),
      einnahmenBvgRente: Math.round(einnahmenBvgRente),
      einnahmenMieten: Math.round(einnahmenMieten),
      einnahmenErbschaft: Math.round(einnahmenErbschaft),
      einnahmenTotal: Math.round(einnahmenTotal),
      ausgabenHaushalt: Math.round(ausgabenHaushalt),
      ausgabenSteuern: Math.round(ausgabenSteuern),
      ausgabenSteuernEinkommen: Math.round(ausgabenSteuernEinkommen),
      ausgabenSteuernEinkommenBund: Math.round(ausgabenSteuernEinkommenBund),
      ausgabenSteuernEinkommenKanton: Math.round(ausgabenSteuernEinkommenKanton),
      ausgabenSteuernVermoegen: Math.round(ausgabenSteuernVermoegen),
      ausgabenSteuernKapital: Math.round(ausgabenSteuernKapital),
      ausgabenSteuernKapitalBund: Math.round(ausgabenSteuernKapitalBund),
      ausgabenSteuernKapitalKanton: Math.round(ausgabenSteuernKapitalKanton),
      ausgabenSozialBvg: Math.round(ausgabenSozialBvg),
      ausgabenVorsorge3a: Math.round(ausgabenVorsorge3a),
      ausgabenHypozins: Math.round(ausgabenHypozins),
      ausgabenSchenkung: Math.round(ausgabenSchenkung),
      ausgabenEinmalig: Math.round(ausgabenEinmalig),
      ausgabenTotal: Math.round(ausgabenTotal),
      kapAuszahlungen: Math.round(kapAuszahlungen),
      saldo: Math.round(saldo),
      vermoegenLiquiditaet: Math.round(vermoegenLiquiditaet),
      vermoegenWertschriften: Math.round(vermoegenWertschriften),
      vermoegenVorsorge: Math.round(vermoegenVorsorge),
      vermoegenImmobilien: Math.round(vermoegenImmobilien),
      vermoegenFirma: Math.round(vermoegenFirma),
      vermoegenSchulden: Math.round(vermoegenSchulden),
      vermoegenAktiva: Math.round(vermoegenAktiva),
      vermoegenNetto: Math.round(vermoegenNetto),
    });
  }

  return result;
}

// ─── Helpers ─────────────────────────────────────────────────────

function clampAhvAlter(alter: number): number {
  return Math.max(
    ORDENTLICHES_AHV_ALTER - MAX_VORBEZUG_JAHRE,
    Math.min(ORDENTLICHES_AHV_ALTER + MAX_AUFSCHUB_JAHRE, alter)
  );
}

function berechneAlter(geburtsdatum: string, jahr: number): number | null {
  if (!geburtsdatum) return null;
  const geburtsjahr = Number.parseInt(geburtsdatum.slice(0, 4), 10);
  if (!Number.isFinite(geburtsjahr)) return null;
  return jahr - geburtsjahr;
}

function erwerbseinkommenJahr(perioden: Einkommensperiode[], jahr: number): number {
  let total = 0;
  for (const p of perioden) {
    if (p.betragMonatlich == null) continue;
    const von = parseYearMonth(p.von);
    const bis = parseYearMonth(p.bis);
    // Anzahl aktive Monate in `jahr`
    const aktivMonate = aktiveMonateImJahr(jahr, von, bis);
    total += p.betragMonatlich * aktivMonate;
  }
  return total;
}

/** Erwerbseinkommen für eine spezifische Person (filter über personIdx). */
function erwerbseinkommenJahrPerson(
  perioden: Einkommensperiode[],
  jahr: number,
  personIdx: 1 | 2
): number {
  let total = 0;
  for (const p of perioden) {
    if (p.personIdx !== personIdx) continue;
    if (p.betragMonatlich == null) continue;
    const von = parseYearMonth(p.von);
    const bis = parseYearMonth(p.bis);
    const aktivMonate = aktiveMonateImJahr(jahr, von, bis);
    total += p.betragMonatlich * aktivMonate;
  }
  return total;
}

/** Total 3a-Einzahlungen einer Person im Jahr (alle Konten/Versicherungen). */
function saeuleDreiEinzahlungJahr(
  entries: { jaehrlicheEinzahlung: number | null; einzahlungAb: number; einzahlungBis: number }[],
  jahr: number
): number {
  let total = 0;
  for (const e of entries) {
    if (e.jaehrlicheEinzahlung == null) continue;
    if (jahr < e.einzahlungAb) continue;
    if (e.einzahlungBis > 0 && jahr > e.einzahlungBis) continue;
    total += e.jaehrlicheEinzahlung;
  }
  return total;
}

function parseYearMonth(s: string): { jahr: number; monat: number } | null {
  if (!s) return null;
  const [j, m] = s.split("-").map(Number);
  if (!j || !m) return null;
  return { jahr: j, monat: m };
}

function aktiveMonateImJahr(
  jahr: number,
  von: { jahr: number; monat: number } | null,
  bis: { jahr: number; monat: number } | null
): number {
  // Default: ganzes Jahr
  let startMonat = 1;
  let endMonat = 12;

  if (von) {
    if (jahr < von.jahr) return 0;
    if (jahr === von.jahr) startMonat = von.monat;
  }

  if (bis) {
    if (jahr > bis.jahr) return 0;
    if (jahr === bis.jahr) endMonat = bis.monat;
  }

  return Math.max(0, endMonat - startMonat + 1);
}

function computeAhvRente(
  state: CashflowInput,
  bezugsjahrP1: number | null,
  bezugsjahrP2: number | null
): { haushalt: number; p1Einzel: number; p2Einzel: number } {
  const e1 = state.ahv.einkommenP1;
  if (e1 == null) return { haushalt: 0, p1Einzel: 0, p2Einzel: 0 };
  const fehljahreP1 = state.ahv.hatFehljahreP1 ? state.ahv.fehljahreAnzahlP1 : 0;
  const bezugsalterP1 = clampAhvAlter(state.ahv.ahvBezugsalterP1);

  const p1Einzel = ahvJahresrenteEinzel({
    massgebendesEinkommen: e1,
    fehljahre: fehljahreP1,
    bezugsalter: bezugsalterP1,
    bezugsjahr: bezugsjahrP1 ?? new Date().getFullYear(),
  }).jahresrente;

  if (state.fallart === "einzel") {
    return { haushalt: p1Einzel, p1Einzel, p2Einzel: 0 };
  }

  const e2 = state.ahv.einkommenP2;
  if (e2 == null) return { haushalt: 0, p1Einzel, p2Einzel: 0 };
  const fehljahreP2 = state.ahv.hatFehljahreP2 ? state.ahv.fehljahreAnzahlP2 : 0;
  const bezugsalterP2 = clampAhvAlter(state.ahv.ahvBezugsalterP2);

  // Einzelrente P2 ohne Splitting — gilt, wenn P2 vor P1 oder allein bezieht.
  const p2Einzel = ahvJahresrenteEinzel({
    massgebendesEinkommen: e2,
    fehljahre: fehljahreP2,
    bezugsalter: bezugsalterP2,
    bezugsjahr: bezugsjahrP2 ?? new Date().getFullYear(),
  }).jahresrente;

  // Ehepaar-Rente (mit Splitting + Plafond) — gilt, wenn beide pensioniert.
  const refJahr = Math.max(
    bezugsjahrP1 ?? new Date().getFullYear(),
    bezugsjahrP2 ?? new Date().getFullYear()
  );
  const out = ahvCouplePension({
    einkommenP1: e1,
    einkommenP2: e2,
    fehljahreP1,
    fehljahreP2,
    bezugsalterP1,
    bezugsalterP2,
    bezugsjahr: refJahr,
  });
  return { haushalt: out.haushaltsRente, p1Einzel, p2Einzel };
}

function computeBvgRenteHaushalt(state: CashflowInput): { p1: number; p2: number } {
  return {
    p1: bvgRentePerson(state.bvg.p1, state.person1.geburtsdatum, state.ziele.bezugsalterP1),
    p2:
      state.fallart === "paar"
        ? bvgRentePerson(state.bvg.p2, state.person2.geburtsdatum, state.ziele.bezugsalterP2)
        : 0,
  };
}

function bvgRentePerson(
  p: BvgPersonInput,
  geburt: string,
  bezugsalter: number
): number {
  if (!p.aktiverAnschluss || p.altersguthabenBeiBezug == null) return 0;
  if (p.bezugspraeferenz === "kapital") return 0;
  const bj = pensionsjahr(geburt, bezugsalter) ?? new Date().getFullYear();
  const ekGueltig = p.einkaeufe
    .filter((e) => e.betrag != null)
    .map((e) => ({ jahr: e.jahr, betrag: e.betrag as number }));
  // WEF-Vorbezüge bis Bezugsjahr mindern das Altersguthaben für die
  // Renten-Berechnung (Vereinfachung: ohne Verzinsungs-Verlust-Approximation,
  // weil das beim altersguthabenBeiBezug-Wert vom PK-Ausweis schon
  // implizit drin sein kann).
  const wefBisBezug = wefSummeBis(p, bj);
  const ausgangssaldo = Math.max(0, p.altersguthabenBeiBezug - wefBisBezug);
  const saldo = bvgGesamtkapitalBeiBezug({
    altersguthabenBeiBezug: ausgangssaldo,
    bezugsjahr: bj,
    einkaeufe: ekGueltig,
  });
  const out = bvgBezug({
    saldoBeiBezug: saldo,
    bezugspraeferenz: p.bezugspraeferenz,
    kapitalanteilProzent: p.kapitalanteil,
    umwandlungssatz: p.umwandlungssatzProzent / 100,
  });
  return out.jahresrente;
}

function computeBvgKapitalAuszahlungen(
  state: CashflowInput
): { p1: { jahr: number | null; betrag: number }; p2: { jahr: number | null; betrag: number } } {
  return {
    p1: bvgKapitalPerson(state.bvg.p1, state.person1.geburtsdatum, state.ziele.bezugsalterP1),
    p2:
      state.fallart === "paar"
        ? bvgKapitalPerson(
            state.bvg.p2,
            state.person2.geburtsdatum,
            state.ziele.bezugsalterP2
          )
        : { jahr: null, betrag: 0 },
  };
}

function bvgKapitalPerson(
  p: BvgPersonInput,
  geburt: string,
  bezugsalter: number
): { jahr: number | null; betrag: number } {
  if (!p.aktiverAnschluss || p.altersguthabenBeiBezug == null)
    return { jahr: null, betrag: 0 };
  if (p.bezugspraeferenz === "rente") return { jahr: null, betrag: 0 };
  const bj = pensionsjahr(geburt, bezugsalter) ?? new Date().getFullYear();
  const ekGueltig = p.einkaeufe
    .filter((e) => e.betrag != null)
    .map((e) => ({ jahr: e.jahr, betrag: e.betrag as number }));
  // WEF-Vorbezüge mindern Bezugskapital (siehe bvgRentePerson)
  const wefBisBezug = wefSummeBis(p, bj);
  const ausgangssaldo = Math.max(0, p.altersguthabenBeiBezug - wefBisBezug);
  const saldo = bvgGesamtkapitalBeiBezug({
    altersguthabenBeiBezug: ausgangssaldo,
    bezugsjahr: bj,
    einkaeufe: ekGueltig,
  });
  const out = bvgBezug({
    saldoBeiBezug: saldo,
    bezugspraeferenz: p.bezugspraeferenz,
    kapitalanteilProzent: p.kapitalanteil,
    umwandlungssatz: p.umwandlungssatzProzent / 100,
  });
  return { jahr: bj, betrag: out.kapitalauszahlung };
}

function mieteinnahmenJahr(items: Immobilie[], jahr: number): number {
  let total = 0;
  for (const im of items) {
    if (im.typ !== "rendite") continue;
    if (im.jaehrlicheMieteinnahmen == null) continue;
    if (im.plan === "verkaufen" && jahr >= im.verkaufsjahr) continue;
    total += im.jaehrlicheMieteinnahmen;
  }
  return total;
}

function kapitalauszahlungenJahr(
  state: CashflowInput,
  jahr: number,
  bvgKap: ReturnType<typeof computeBvgKapitalAuszahlungen>
): number {
  let total = 0;

  // PK-Kapitalauszahlung
  if (bvgKap.p1.jahr === jahr) total += bvgKap.p1.betrag;
  if (bvgKap.p2.jahr === jahr) total += bvgKap.p2.betrag;

  // 3a-Auszahlungen
  for (const items of [state.saeuleDrei.p1, state.saeuleDrei.p2]) {
    for (const it of items) {
      const a = saeuleDreiAuszahlung(it);
      if (a && a.jahr === jahr) total += a.betrag;
    }
  }

  // FZ-Auszahlungen
  for (const fz of [...state.bvg.p1.freizuegigkeit, ...state.bvg.p2.freizuegigkeit]) {
    if (fz.saldoHeute == null) continue;
    if (fz.auszahlungsjahr !== jahr) continue;
    const a = freizuegigkeitAuszahlung({
      saldoHeute: fz.saldoHeute,
      auszahlungsjahr: fz.auszahlungsjahr,
      renditeProzent: fz.renditeProzent,
    });
    total += a.betrag;
  }

  // Immobilien-Verkauf — netto nach Grundstückgewinnsteuer
  // GGSt wird auf den Reingewinn (Verkehrswert − Anlagekosten) berechnet
  // und vom Brutto-Erlös (Verkehrswert − Hypothek) abgezogen. Der
  // Kanton kommt aus state.adresse — bei unbekannten Kantonen fällt
  // die Engine auf "andere"-Tarif (≈ ZH-Median) zurück.
  // Verkehrswert wird auf das Verkaufsjahr hochgerechnet (default 1.5 %/J).
  const heuteJahr = new Date().getFullYear();
  for (const im of state.immobilien.items) {
    if (im.plan !== "verkaufen") continue;
    if (im.verkaufsjahr !== jahr) continue;
    if (im.verkehrswert == null) continue;
    const hypo = im.hypotheken.reduce((s, h) => s + (h.hoehe ?? 0), 0);
    const verkehrswertImVerkaufsjahr = immobilieWert(im, jahr, heuteJahr);
    const auszahlung = immobilienVerkaufsAuszahlungNetto(
      {
        verkehrswert: verkehrswertImVerkaufsjahr,
        hypothekenSumme: hypo,
        plan: im.plan,
        verkaufsjahr: im.verkaufsjahr,
        kaufjahr: im.kaufjahr,
        anlagekosten: im.anlagekosten,
      },
      state.adresse.kanton ?? ""
    );
    if (auszahlung) total += auszahlung.netto;
  }

  // Firma-Verkauf
  if (
    state.firma.vorhanden &&
    state.firma.plan === "verkaufen" &&
    state.firma.verkaufsjahr === jahr &&
    state.firma.moeglicherVerkaufserloes != null
  ) {
    total += state.firma.moeglicherVerkaufserloes;
  }

  return total;
}

function haushaltsausgabenJahr(budget: CashflowInput["budget"], istPensioniert: boolean): number {
  if (istPensioniert && budget.wunschverbrauchPension != null) {
    return budget.wunschverbrauchPension * 12;
  }
  if (budget.ausgabenModus === "total" && budget.ausgabenTotal != null) {
    return budget.ausgabenTotal * 12;
  }
  if (budget.ausgabenModus === "detailliert") {
    const sum = Object.values(budget.ausgabenKategorien).reduce(
      (s, v) => s + (v ?? 0),
      0
    );
    return sum * 12;
  }
  return 0;
}

function einmaligeAusgabenJahr(
  ausgaben: CashflowInput["einmaligeAusgaben"],
  jahr: number
): number {
  let total = 0;
  for (const a of ausgaben) {
    if (a.jahr === jahr && a.betrag != null) total += a.betrag;
  }
  return total;
}

// ─── Bucket-Helper für die Vermögens-Granularisierung ──────────────

/**
 * Vorsorge-Bucket = nicht ausbezahlte PK + 3a + FZ.
 * - PK: vor Bezugsjahr → altersguthabenHeute (oder nichts wenn nicht angegeben);
 *       nach Bezug → 0 bei reinem Kapital, sonst geht Rente in Cashflow ein
 *       (Saldo aus Vorsorge "rausgeflossen"). Vereinfacht: ab Bezugsjahr 0.
 * - 3a-Konto: vor auszahlungsjahr → aktuellerWert × Rendite^(jahr - jetzt);
 *             ab Auszahlungsjahr → 0 (ist auf Hauptkonto via kapAuszahlungen).
 * - 3a-Versicherung: vor ablaufjahr → rueckkaufswert (oder ablaufswert wenn vorh.);
 *                    ab ablaufjahr → 0.
 * - FZ: vor Auszahlungsjahr → saldoHeute × Rendite^(jahr - jetzt);
 *       ab Auszahlungsjahr → 0.
 */
/**
 * Summe der WEF-Vorbezüge bis (und einschliesslich) eines Jahres.
 * Nach einem WEF-Vorbezug ist das PK-Altersguthaben um diesen Betrag
 * (plus Verzinsung-Verlust) niedriger.
 */
function wefSummeBis(p: BvgPersonInput, jahr: number): number {
  return (p.wefVorbezuege ?? []).reduce(
    (s, e) => s + (e.betrag ?? 0) * (e.jahr <= jahr ? 1 : 0),
    0
  );
}

/**
 * Summe aller WEF-Vorbezüge im konkreten Jahr (P1 + P2). Wird zur
 * Kapitalauszahlungs-Steuer-Bemessung addiert, fliesst aber NICHT zum
 * Hauptkonto (Geld geht direkt ins Eigenheim — siehe wefSummeFuerImmoBis).
 */
function wefVorbezugJahr(state: CashflowInput, jahr: number): number {
  const sumP1 = (state.bvg.p1.wefVorbezuege ?? [])
    .filter((e) => e.jahr === jahr && e.betrag != null)
    .reduce((s, e) => s + (e.betrag ?? 0), 0);
  const sumP2 =
    state.fallart === "paar"
      ? (state.bvg.p2.wefVorbezuege ?? [])
          .filter((e) => e.jahr === jahr && e.betrag != null)
          .reduce((s, e) => s + (e.betrag ?? 0), 0)
      : 0;
  return sumP1 + sumP2;
}

/**
 * Default-Immobilie für WEF-Bezüge ohne explizite Zuordnung: erste
 * selbstbewohnte Immobilie, die im betreffenden Jahr noch gehalten wird.
 */
function defaultWefImmoId(state: CashflowInput, jahr: number): string | null {
  const im = state.immobilien.items.find(
    (x) =>
      x.typ === "selbstbewohnt" &&
      !(x.plan === "verkaufen" && jahr >= x.verkaufsjahr)
  );
  return im?.id ?? null;
}

/**
 * Summe aller WEF-Bezüge (P1 + P2), die einer bestimmten Immobilie
 * zugeordnet sind und bis zum Jahr (inkl.) stattgefunden haben.
 * Einträge ohne explizite immoId fallen auf die Default-Immobilie zurück.
 */
function wefSummeFuerImmoBis(
  state: CashflowInput,
  immoId: string,
  jahr: number
): number {
  const fallback = defaultWefImmoId(state, jahr);
  const allEntries = [
    ...(state.bvg.p1.wefVorbezuege ?? []),
    ...(state.fallart === "paar" ? (state.bvg.p2.wefVorbezuege ?? []) : []),
  ];
  return allEntries
    .filter((e) => e.betrag != null && e.jahr <= jahr)
    .filter((e) => (e.immoId ?? fallback) === immoId)
    .reduce((s, e) => s + (e.betrag ?? 0), 0);
}

/**
 * PK-Saldo in der Sparphase — linearer Hochlauf vom Altersguthaben heute
 * zum voraussichtlichen Altersguthaben bei Bezug, abzüglich WEF-Vorbezüge
 * die bis zum betreffenden Jahr stattgefunden haben.
 *
 * Logik:
 *   - kein aktiver Anschluss → 0
 *   - kein altersguthabenHeute → fallback auf altersguthabenBeiBezug (statisch)
 *   - kein altersguthabenBeiBezug → fallback auf altersguthabenHeute (statisch)
 *   - kein Bezugsjahr → statisch altersguthabenHeute
 *   - jahr ≥ Bezugsjahr → 0 (PK ist ausbezahlt)
 *   - sonst → linear interpoliert zwischen jetzt und Bezugsjahr
 *
 * Beispiel: heute CHF 580'000, bei Bezug 2032 CHF 720'000, aktuell 2026.
 *   2026 → 580'000
 *   2029 → 580'000 + (720'000-580'000) × 3/6 = 650'000
 *   2032 → 0 (ausbezahlt; Kapital auf Hauptkonto via kapAuszahlungenJahr)
 */
function pkSaldoSparphase(
  p: BvgPersonInput,
  jahr: number,
  bezugsjahr: number | null,
  jetzt: number
): number {
  if (!p.aktiverAnschluss) return 0;

  const heute = p.altersguthabenHeute;
  const beiBezug = p.altersguthabenBeiBezug;

  // Beide null → keine Daten
  if (heute == null && beiBezug == null) return 0;

  // Nach Bezug → 0 (Kapital ist auf Hauptkonto via kapAuszahlungenJahr)
  if (bezugsjahr != null && jahr >= bezugsjahr) return 0;

  // WEF-Vorbezüge die bis zu diesem Jahr stattfinden, mindern das Saldo
  const wefSumme = wefSummeBis(p, jahr);

  // Kein Bezugsjahr ODER kein altersguthabenBeiBezug → statisch heute (− WEF)
  if (bezugsjahr == null || beiBezug == null) {
    return Math.max(0, (heute ?? beiBezug ?? 0) - wefSumme);
  }

  // Kein altersguthabenHeute → fallback auf statisch beiBezug (− WEF)
  if (heute == null) return Math.max(0, beiBezug - wefSumme);

  // Linearer Hochlauf zwischen jetzt und bezugsjahr (− WEF)
  if (bezugsjahr <= jetzt) return Math.max(0, beiBezug - wefSumme);
  if (jahr <= jetzt) return Math.max(0, heute - wefSumme);

  const t = (jahr - jetzt) / (bezugsjahr - jetzt);
  const saldoOhneWef = Math.round(heute + (beiBezug - heute) * t);
  return Math.max(0, saldoOhneWef - wefSumme);
}

function vorsorgeVermoegenAmJahresende(
  state: CashflowInput,
  jahr: number,
  pkBezugsjahrP1: number | null,
  pkBezugsjahrP2: number | null,
  bvgKap: ReturnType<typeof computeBvgKapitalAuszahlungen>
): number {
  let total = 0;
  const jetzt = new Date().getFullYear();

  // PK-Sparphase: linearer Hochlauf vom Altersguthaben heute zum
  // voraussichtlichen Altersguthaben bei Bezug. Vor Bezug → interpolierter
  // Wert; nach Bezug → 0 (Kapital auf Hauptkonto, Rente fliesst als Cashflow).
  //
  // Vereinfachung: linearer Hochlauf statt echter Sparphasen-Mathematik
  // (Beiträge × Verzinsung = leichter S-förmiger Verlauf). Bei normalen
  // Karrieren ist der Fehler ±2-3% zur exakten Kurve.
  total += pkSaldoSparphase(
    state.bvg.p1,
    jahr,
    pkBezugsjahrP1,
    jetzt
  );
  if (state.fallart === "paar") {
    total += pkSaldoSparphase(
      state.bvg.p2,
      jahr,
      pkBezugsjahrP2,
      jetzt
    );
  }

  // 3a — pro Item bis Auszahlungs-/Ablaufjahr.
  // Konto: Saldo wächst Jahr für Jahr durch Einzahlung + Verzinsung.
  // Versicherung: statischer Wert (Rückkaufs-/Ablaufwert) — die Prämien
  // sind im Vertrag gesperrt, der ausgewiesene Wert wächst nicht linear
  // mit der Einzahlung (Versicherungsmathematik).
  for (const items of [state.saeuleDrei.p1, state.saeuleDrei.p2]) {
    for (const it of items) {
      if (it.type === "konto") {
        if (it.aktuellerWert == null) continue;
        if (jahr >= it.auszahlungsjahr) continue;
        const r = it.renditeProzent / 100;
        let saldo = it.aktuellerWert;
        // Pro Jahr von jetzt+1 bis jahr: ggf. Einzahlung addieren, dann verzinsen
        for (let y = jetzt + 1; y <= jahr; y++) {
          if (
            it.jaehrlicheEinzahlung != null &&
            y >= it.einzahlungAb &&
            (it.einzahlungBis === 0 || y <= it.einzahlungBis)
          ) {
            saldo += it.jaehrlicheEinzahlung;
          }
          saldo *= 1 + r;
        }
        total += saldo;
      } else {
        const wert = it.ablaufswert ?? it.rueckkaufswert;
        if (wert == null) continue;
        if (jahr < it.ablaufjahr) total += wert;
      }
    }
  }

  // FZ — pro Item bis Auszahlungsjahr, mit Rendite verzinst
  for (const fz of [
    ...state.bvg.p1.freizuegigkeit,
    ...state.bvg.p2.freizuegigkeit,
  ]) {
    if (fz.saldoHeute == null) continue;
    if (jahr < fz.auszahlungsjahr) {
      const j = Math.max(0, jahr - jetzt);
      total += fz.saldoHeute * Math.pow(1 + fz.renditeProzent / 100, j);
    }
  }

  return total;
}

/**
 * Immobilien-Verkehrswert mit Wertsteigerung.
 *
 * Approximation: jährlich um wertsteigerungProzent (default 1.5 % —
 * historischer CH-Mittelwert für Wohneigentum) compound. Heute ist
 * der eingegebene `verkehrswert` der Anker.
 */
function immobilieWert(
  im: Immobilie,
  jahr: number,
  heute: number
): number {
  if (im.verkehrswert == null) return 0;
  const p = (im.wertsteigerungProzent ?? 1.5) / 100;
  const dauer = Math.max(0, jahr - heute);
  return Math.round(im.verkehrswert * Math.pow(1 + p, dauer));
}

/**
 * Berechnet pro Immobilie die durch WEF-Bezüge angepasste Bilanz:
 *  • Hypothek wird primär durch WEF getilgt (max bis 0).
 *  • WEF-Überschuss (wenn Hypo bereits getilgt) erhöht den Verkehrswert
 *    — modelliert den initialen Eigenkapital-Einsatz beim Kauf.
 * So bleibt das Nettovermögen über den WEF-Bezug konstant (PK-Saldo
 * sinkt, Eigenheim-Position steigt um den gleichen Betrag).
 */
function immobilienBilanzAmJahresende(
  state: CashflowInput,
  jahr: number
): { aktiva: number; schulden: number } {
  const heute = new Date().getFullYear();
  let aktiva = 0;
  let schulden = 0;
  for (const im of state.immobilien.items) {
    if (im.verkehrswert == null) continue;
    if (im.plan === "verkaufen" && jahr >= im.verkaufsjahr) continue;

    const baseWert = immobilieWert(im, jahr, heute);
    const baseHypo = im.hypotheken.reduce((s, h) => s + (h.hoehe ?? 0), 0);
    const wefSumme = wefSummeFuerImmoBis(state, im.id, jahr);

    const hypoNetto = Math.max(0, baseHypo - wefSumme);
    const wefRest = Math.max(0, wefSumme - baseHypo);

    aktiva += baseWert + wefRest;
    schulden += hypoNetto;
  }
  return { aktiva, schulden };
}

function immobilienWertAmJahresende(
  state: CashflowInput,
  jahr: number
): number {
  return immobilienBilanzAmJahresende(state, jahr).aktiva;
}

function hypothekenAmJahresende(
  state: CashflowInput,
  jahr: number
): number {
  return immobilienBilanzAmJahresende(state, jahr).schulden;
}

/**
 * Hypothek-Zinsen-Total im Jahr (Σ über alle laufenden Tranchen).
 *
 * Pro Hypothek-Tranche: hoehe × zinssatzProzent / 100. Zählt nur, wenn
 * die Liegenschaft im Jahr noch nicht verkauft ist. Eigenmietwert +
 * Schuldzinsabzug bewusst nicht modelliert (Reform 2028 schafft beides ab).
 */
function hypothekenZinsenJahr(state: CashflowInput, jahr: number): number {
  let total = 0;
  for (const im of state.immobilien.items) {
    if (im.plan === "verkaufen" && jahr >= im.verkaufsjahr) continue;
    for (const h of im.hypotheken) {
      if (h.hoehe == null) continue;
      total += (h.hoehe * (h.zinssatzProzent ?? 0)) / 100;
    }
  }
  return Math.round(total);
}

function firmaWertAmJahresende(
  firma: CashflowInput["firma"],
  jahr: number
): number {
  if (!firma.vorhanden) return 0;
  if (firma.moeglicherVerkaufserloes == null) return 0;
  if (firma.plan === "verkaufen" && jahr >= firma.verkaufsjahr) return 0;
  return firma.moeglicherVerkaufserloes;
}

/**
 * Anzahl Kinder, die im Steuerjahr noch abzugsfähig sind.
 *
 * Schweizer Recht: Kinderabzug gilt für minderjährige Kinder UND für
 * volljährige Kinder in Erstausbildung (typisch bis ~25). Wir nutzen:
 *   - Kind < 18 im Jahr → abzugsfähig
 *   - Kind ≥ 18 UND ausbildungBisJahr >= jahr → abzugsfähig
 *   - sonst nicht abzugsfähig
 */
function anzahlKinderAbzugsfaehig(
  kinder: CashflowInput["kinder"],
  jahr: number
): number {
  let count = 0;
  for (const k of kinder) {
    const geburtsjahr = parseInt((k.geburtsdatum || "").slice(0, 4), 10);
    if (!Number.isFinite(geburtsjahr)) continue;
    const alter = jahr - geburtsjahr;
    if (alter < 18) {
      count++;
    } else if (k.ausbildungBisJahr != null && k.ausbildungBisJahr >= jahr) {
      count++;
    }
  }
  return count;
}

/**
 * Erbschaft als Einmal-Eingang im erwarteten Jahr.
 * Wirkt nur, wenn:
 *  - User hat 'Ja absehbar' oder 'Möglich' gewählt
 *  - Toggle 'erwartetBeruecksichtigen' ist aktiv
 *  - Betrag und Jahr sind gefüllt
 *  - Das aktuelle Jahr === erwartetes Jahr
 */
function erbschaftEinnahmeJahr(state: CashflowInput, jahr: number): number {
  const e = state.erbschaft;
  if (!e) return 0;
  if (!e.erwartetBeruecksichtigen) return 0;
  if (e.erwartet === "nein" || e.erwartet === "keine_angabe") return 0;
  if (e.erwartetJahr !== jahr) return 0;
  return Math.max(0, e.erwartetBetrag ?? 0);
}

/**
 * Schenkung / Erbvorbezug als Einmal-Ausgang im angegebenen Jahr.
 * Wirkt nur, wenn:
 *  - User hat 'getätigt' oder 'geplant' gewählt
 *  - Toggle 'schenkungenBeruecksichtigen' ist aktiv
 *  - Betrag und Jahr sind gefüllt
 *  - Das aktuelle Jahr === Schenkungs-Jahr
 */
function schenkungAusgabeJahr(state: CashflowInput, jahr: number): number {
  const e = state.erbschaft;
  if (!e) return 0;
  if (!e.schenkungenBeruecksichtigen) return 0;
  if (e.schenkungenStatus === "nein" || e.schenkungenStatus == null) return 0;
  if (e.schenkungenJahr !== jahr) return 0;
  return Math.max(0, e.schenkungenBetrag ?? 0);
}

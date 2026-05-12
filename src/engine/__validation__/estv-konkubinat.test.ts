/**
 * ESTV-Validation für Konkubinat: 2× Einzel-Tarif statt Verheirateten-Tarif.
 *
 * Methode: für jedes Konkubinats-Profil rufen wir Cuira-Engine UND
 * "ESTV-Äquivalent" (2 separate ledige Berechnungen) auf, summieren ESTV-
 * Output, vergleichen mit Cuira. Differenz muss klein sein.
 *
 * ESTV-Aufrufe erfolgen über die kantonsteuer-Lookup-Engine (lokale Daten,
 * keine API). Stellt sicher dass Konkubinats-Pfad in Cuira exakt 2× LEDIG
 * abbildet.
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe } from "../cashflow";
import type { CashflowInput } from "../cashflow";
import { steuerProJahr } from "../steuer";

function buildKonkubinatProfile(
  einkP1: number,
  einkP2: number,
  kanton: string
): CashflowInput {
  return {
    fallart: "paar",
    zivilstand: "konkubinat",
    person1: {
      vorname: "A",
      nachname: "T",
      geburtsdatum: "1965-07-01",
      geschlecht: "m",
      telefon: "",
      email: "",
    },
    person2: {
      vorname: "B",
      nachname: "T",
      geburtsdatum: "1965-07-01",
      geschlecht: "w",
      telefon: "",
      email: "",
    },
    kinder: [],
    ahv: {
      einkommenP1: einkP1,
      einkommenP2: einkP2,
      hatIkAuszugP1: false,
      hatIkAuszugP2: false,
      hatFehljahreP1: false,
      hatFehljahreP2: false,
      fehljahreAnzahlP1: 0,
      fehljahreAnzahlP2: 0,
      ahvBezugsalterP1: 65,
      ahvBezugsalterP2: 65,
      ahvRenteJahrEffektivP1: null,
      ahvRenteJahrEffektivP2: null,
    },
    bvg: {
      p1: {
        aktiverAnschluss: einkP1 > 0,
        altersguthabenHeute: null,
        altersguthabenBeiBezug: null,
        umwandlungssatzProzent: 6,
        bezugspraeferenz: "rente",
        kapitalanteil: 0,
        freizuegigkeit: [],
        einkaeufe: [],
        wefVorbezuege: [],
      },
      p2: {
        aktiverAnschluss: einkP2 > 0,
        altersguthabenHeute: null,
        altersguthabenBeiBezug: null,
        umwandlungssatzProzent: 6,
        bezugspraeferenz: "rente",
        kapitalanteil: 0,
        freizuegigkeit: [],
        einkaeufe: [],
        wefVorbezuege: [],
      },
    },
    saeuleDrei: { p1: [], p2: [] },
    vermoegen: {
      items: [
        {
          id: "v1",
          typ: "konto",
          beschreibung: "Konto",
          saldoHeute: 100_000,
          renditeProzent: 0,
          istHauptkonto: true,
        },
      ],
    },
    immobilien: { items: [] },
    firma: {
      vorhanden: false,
      firmenname: "",
      moeglicherVerkaufserloes: null,
      plan: "behalten",
      verkaufsjahr: 2050,
    },
    ziele: { bezugsalterP1: 65, bezugsalterP2: 65 },
    budget: {
      einkommen: [
        ...(einkP1 > 0
          ? [
              {
                id: "e1",
                beschreibung: "L1",
                personIdx: 1 as const,
                betragMonatlich: Math.round(einkP1 / 12),
                von: "2026-01",
                bis: "2030-06",
              },
            ]
          : []),
        ...(einkP2 > 0
          ? [
              {
                id: "e2",
                beschreibung: "L2",
                personIdx: 2 as const,
                betragMonatlich: Math.round(einkP2 / 12),
                von: "2026-01",
                bis: "2030-06",
              },
            ]
          : []),
      ],
      ausgabenModus: "total",
      ausgabenTotal: 4_000,
      ausgabenKategorien: {
        lebenshaltung: null,
        wohnen: null,
        mobilitaet: null,
        versicherungen: null,
        ferienHobby: null,
        sonstiges: null,
      },
      wunschverbrauchPension: 3_000,
      steuernHeute: null,
      einkommenHeute: null,
      religion: "keine",
      alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
    },
    adresse: {
      strasse: "",
      plz: "",
      ort: "",
      kanton: kanton,
      gemeindeBfsId: null,
      gemeindeName: "",
    },
    einmaligeAusgaben: [],
  };
}

describe("ESTV-Konkubinat-Validation: Cuira ≈ 2× steuerProJahr(einzel)", () => {
  const TEST_CASES = [
    { einkP1: 80_000, einkP2: 60_000, kanton: "ZH", label: "ZH 80k/60k" },
    { einkP1: 100_000, einkP2: 100_000, kanton: "ZH", label: "ZH 100k/100k" },
    { einkP1: 150_000, einkP2: 50_000, kanton: "BE", label: "BE 150k/50k" },
    { einkP1: 90_000, einkP2: 90_000, kanton: "ZG", label: "ZG 90k/90k" },
    { einkP1: 120_000, einkP2: 0, kanton: "VD", label: "VD 120k/0" },
  ];

  for (const tc of TEST_CASES) {
    it(`${tc.label} — Cuira-Konkubinat ≈ 2× separate Einzel-Steuern`, () => {
      const profil = buildKonkubinatProfile(tc.einkP1, tc.einkP2, tc.kanton);
      const cuiraReihe = cashflowReihe(profil, 2026, 2026);
      const cuiraSteuer = cuiraReihe[0]!.ausgabenSteuern;

      // Referenz: 2× steuerProJahr(einzel) mit jeweiligem Einkommen.
      // Vermögen 50/50 wie Cuira's Konkubinats-Splitting.
      const passivShared = 0; // keine Mieten/Alimente in Test-Profil
      const s1 = steuerProJahr({
        einkommenJahr: tc.einkP1 + passivShared / 2,
        vermoegenJahr: 50_000, // 100k / 2
        kapAuszahlungenJahr: 0,
        kanton: tc.kanton,
        bfsId: undefined,
        religion: "keine",
        fallart: "einzel",
        jahr: 2026,
        bruttoErwerbP1: tc.einkP1,
        bruttoErwerbP2: 0,
        alterP1: 61,
        alterP2: 40,
        anzahlKinder: 0,
        saeule3aEinzahlungJahr: 0,
        pkEinkaufJahr: 0,
        hatPkAnschlussP1: tc.einkP1 > 0,
        hatPkAnschlussP2: false,
        einkommenIstNetto: true,
      });
      const s2 = steuerProJahr({
        einkommenJahr: tc.einkP2 + passivShared / 2,
        vermoegenJahr: 50_000,
        kapAuszahlungenJahr: 0,
        kanton: tc.kanton,
        bfsId: undefined,
        religion: "keine",
        fallart: "einzel",
        jahr: 2026,
        bruttoErwerbP1: tc.einkP2,
        bruttoErwerbP2: 0,
        alterP1: 61,
        alterP2: 40,
        anzahlKinder: 0,
        saeule3aEinzahlungJahr: 0,
        pkEinkaufJahr: 0,
        hatPkAnschlussP1: tc.einkP2 > 0,
        hatPkAnschlussP2: false,
        einkommenIstNetto: true,
      });
      const erwartetSteuer = s1.total + s2.total;

      const drift = ((cuiraSteuer - erwartetSteuer) / erwartetSteuer) * 100;
      // eslint-disable-next-line no-console
      console.log(
        `[ESTV-Konkubinat ${tc.label}] Cuira=${cuiraSteuer}, ESTV-Sum=${erwartetSteuer}, Drift=${drift.toFixed(1)}%`
      );
      // ≤ 2% Drift (Rundungs-Differenzen toleriert)
      expect(Math.abs(drift)).toBeLessThan(2);
    });
  }
});

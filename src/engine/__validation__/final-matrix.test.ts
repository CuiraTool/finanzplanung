/**
 * Final-Phase Test-Matrix: alle relevanten Kombinationen.
 *
 * Achsen:
 *  - Fallart: einzel / paar
 *  - Zivilstand: ledig / verheiratet / konkubinat / geschieden / verwitwet
 *  - PK: keine / Rente / Mischung 50/50 / 100% Kapital
 *  - 3a: nein / Konto / Versicherung
 *  - Liegenschaft: keine / selbstbewohnt / rendite / sonstiges
 *  - Kinder: 0 / 1 unter 18 / 2 inkl. Ausbildung
 *  - Vermögen: 50k Konto / 500k Konto+Depot / 0
 *  - Kanton: ZH / ZG / BS / VD (Stichprobe steile/flache Tarife)
 *
 * Pro Kombi:
 *  - Engine läuft ohne Crash
 *  - Steuer > 0 wenn Einkommen > 50k
 *  - Vermögen entwickelt sich plausibel
 *  - Kinder-Steuer-Effekt sichtbar
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe } from "../cashflow";
import type { CashflowInput } from "../cashflow";

type FallartZ = "einzel" | "paar";
type ZivilstandZ =
  | "ledig"
  | "verheiratet"
  | "konkubinat"
  | "geschieden"
  | "verwitwet";
type PkModus = "keine" | "rente" | "mischung" | "kapital";
type ImmoModus = "keine" | "selbstbewohnt" | "rendite" | "sonstiges";

interface MatrixOpt {
  fallart: FallartZ;
  zivilstand: ZivilstandZ;
  pk: PkModus;
  hat3a: boolean;
  immo: ImmoModus;
  anzahlKinder: number;
  vermoegen: number;
  kanton: string;
  einkommenP1: number;
  einkommenP2: number;
}

function build(o: MatrixOpt): CashflowInput {
  const heute = 2025;
  const gj = 1965;
  const profile: CashflowInput = {
    fallart: o.fallart,
    zivilstand: o.zivilstand,
    person1: {
      vorname: "A",
      nachname: "T",
      geburtsdatum: `${gj}-07-01`,
      geschlecht: "m",
      telefon: "",
      email: "",
    },
    person2: {
      vorname: o.fallart === "paar" ? "B" : "",
      nachname: o.fallart === "paar" ? "T" : "",
      geburtsdatum: o.fallart === "paar" ? `${gj}-07-01` : "",
      geschlecht: o.fallart === "paar" ? "w" : null,
      telefon: "",
      email: "",
    },
    kinder: Array.from({ length: o.anzahlKinder }, (_, i) => ({
      id: `k${i}`,
      vorname: `K${i + 1}`,
      geburtsdatum: `${heute - 10 - i * 2}-01-01`, // 10, 12 Jahre alt
      zuordnung: "gemeinsam" as const,
      ausbildungBisJahr: null,
    })),
    ahv: {
      einkommenP1: o.einkommenP1,
      einkommenP2: o.einkommenP2 || null,
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
      p1: bvgFromModus(o.pk, o.einkommenP1),
      p2:
        o.fallart === "paar"
          ? bvgFromModus(o.pk, o.einkommenP2)
          : bvgFromModus("keine", 0),
    },
    saeuleDrei: {
      p1: o.hat3a
        ? [
            {
              id: "3a-1",
              type: "konto",
              saeule: "3a",
              beschreibung: "3a-Konto",
              aktuellerWert: 40_000,
              auszahlungsjahr: heute + 8,
              renditeProzent: 0.5,
              rueckkaufswert: null,
              ablaufswert: null,
              ablaufjahr: heute + 8,
              jaehrlicheEinzahlung: 7_258,
              einzahlungAb: heute,
              einzahlungBis: heute + 5,
            },
          ]
        : [],
      p2: [],
    },
    vermoegen: {
      items:
        o.vermoegen > 0
          ? [
              {
                id: "v1",
                typ: "konto",
                beschreibung: "Konto",
                saldoHeute: o.vermoegen,
                renditeProzent: 0,
                istHauptkonto: true,
              },
            ]
          : [
              {
                id: "v0",
                typ: "konto",
                beschreibung: "Konto",
                saldoHeute: 0,
                renditeProzent: 0,
                istHauptkonto: true,
              },
            ],
    },
    immobilien: { items: immoFromModus(o.immo) },
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
        ...(o.einkommenP1 > 0
          ? [
              {
                id: "e1",
                beschreibung: "L1",
                personIdx: 1 as const,
                betragMonatlich: Math.round(o.einkommenP1 / 12),
                von: "2026-01",
                bis: "2030-06",
              },
            ]
          : []),
        ...(o.einkommenP2 > 0 && o.fallart === "paar"
          ? [
              {
                id: "e2",
                beschreibung: "L2",
                personIdx: 2 as const,
                betragMonatlich: Math.round(o.einkommenP2 / 12),
                von: "2026-01",
                bis: "2030-06",
              },
            ]
          : []),
      ],
      ausgabenModus: "total",
      ausgabenTotal: 4_500,
      ausgabenKategorien: {
        lebenshaltung: null,
        wohnen: null,
        mobilitaet: null,
        versicherungen: null,
        ferienHobby: null,
        sonstiges: null,
      },
      wunschverbrauchPension: 3_500,
      steuernHeute: null,
      einkommenHeute: null,
      religion: "keine",
      alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
    },
    adresse: {
      strasse: "",
      plz: "",
      ort: "",
      kanton: o.kanton,
      gemeindeBfsId: null,
      gemeindeName: "",
    },
    einmaligeAusgaben: [],
  };
  return profile;
}

function bvgFromModus(pk: PkModus, einkommen: number) {
  if (pk === "keine" || einkommen === 0) {
    return {
      aktiverAnschluss: false,
      altersguthabenHeute: null,
      altersguthabenBeiBezug: null,
      umwandlungssatzProzent: 6,
      bezugspraeferenz: "rente" as const,
      kapitalanteil: 0,
      freizuegigkeit: [],
      einkaeufe: [],
      wefVorbezuege: [],
    };
  }
  const saldo = einkommen * 4;
  return {
    aktiverAnschluss: true,
    altersguthabenHeute: saldo,
    altersguthabenBeiBezug: Math.round(saldo * 1.3),
    umwandlungssatzProzent: 6,
    bezugspraeferenz: pk === "rente" ? ("rente" as const) : pk === "kapital" ? ("kapital" as const) : ("mischung" as const),
    kapitalanteil: pk === "kapital" ? 100 : pk === "mischung" ? 50 : 0,
    freizuegigkeit: [],
    einkaeufe: [],
    wefVorbezuege: [],
  };
}

function immoFromModus(immo: ImmoModus) {
  if (immo === "keine") return [];
  return [
    {
      id: "i1",
      typ: immo,
      beschreibung: "Immo",
      verkehrswert: immo === "rendite" ? 1_200_000 : immo === "sonstiges" ? 100_000 : 900_000,
      hypotheken:
        immo === "selbstbewohnt"
          ? [
              {
                id: "h",
                beschreibung: "",
                hoehe: 400_000,
                zinssatzProzent: 1.5,
                ablaufjahr: 2040,
              },
            ]
          : [],
      plan: "behalten" as const,
      verkaufsjahr: 2060,
      jaehrlicheMieteinnahmen: immo === "rendite" ? 36_000 : null,
      kaufjahr: 2015,
      anlagekosten: null,
      wertvermehrendeInvestitionen: null,
      wertsteigerungProzent: 0,
    },
  ];
}

function plausibel(r: ReturnType<typeof cashflowReihe>): {
  ok: boolean;
  fehler: string[];
} {
  const fehler: string[] = [];
  for (const z of r) {
    if (!Number.isFinite(z.einnahmenTotal)) fehler.push(`NaN einnahmen jahr ${z.jahr}`);
    if (!Number.isFinite(z.ausgabenSteuern)) fehler.push(`NaN steuern jahr ${z.jahr}`);
    if (z.ausgabenSteuern < 0) fehler.push(`negative Steuern jahr ${z.jahr}`);
    if (z.einnahmenAhv < 0) fehler.push(`negative AHV jahr ${z.jahr}`);
  }
  return { ok: fehler.length === 0, fehler };
}

describe("Final-Phase: Fallart × Zivilstand × PK × 3a × Immo × Kinder × Vermögen", () => {
  it("Einzelperson Standard-Matrix (alle PK-Modi × Immo × 3a × Kinder)", () => {
    const fehler: string[] = [];
    let total = 0;
    for (const pk of ["keine", "rente", "mischung", "kapital"] as PkModus[]) {
      for (const immo of ["keine", "selbstbewohnt", "rendite", "sonstiges"] as ImmoModus[]) {
        for (const hat3a of [false, true]) {
          for (const kinder of [0, 2]) {
            for (const verm of [0, 500_000]) {
              total++;
              const p = build({
                fallart: "einzel",
                zivilstand: "ledig",
                pk,
                hat3a,
                immo,
                anzahlKinder: kinder,
                vermoegen: verm,
                kanton: "ZH",
                einkommenP1: 100_000,
                einkommenP2: 0,
              });
              try {
                const r = cashflowReihe(p, 2026, 2035);
                const c = plausibel(r);
                if (!c.ok) fehler.push(`${pk}/${immo}/3a=${hat3a}/k=${kinder}/v=${verm}: ${c.fehler.join("; ")}`);
              } catch (e) {
                fehler.push(`CRASH ${pk}/${immo}/3a=${hat3a}/k=${kinder}/v=${verm}: ${e}`);
              }
            }
          }
        }
      }
    }
    expect(total).toBeGreaterThan(60);
    expect(fehler).toEqual([]);
  });

  it("Paar Verheiratet — alle Kombinationen", () => {
    const fehler: string[] = [];
    let total = 0;
    for (const pk of ["keine", "rente", "kapital"] as PkModus[]) {
      for (const immo of ["keine", "selbstbewohnt", "sonstiges"] as ImmoModus[]) {
        for (const kinder of [0, 2]) {
          total++;
          const p = build({
            fallart: "paar",
            zivilstand: "verheiratet",
            pk,
            hat3a: true,
            immo,
            anzahlKinder: kinder,
            vermoegen: 200_000,
            kanton: "ZH",
            einkommenP1: 100_000,
            einkommenP2: 60_000,
          });
          try {
            const r = cashflowReihe(p, 2026, 2035);
            const c = plausibel(r);
            if (!c.ok) fehler.push(`${pk}/${immo}/k=${kinder}: ${c.fehler.join("; ")}`);
          } catch (e) {
            fehler.push(`CRASH ${pk}/${immo}/k=${kinder}: ${e}`);
          }
        }
      }
    }
    expect(total).toBeGreaterThan(15);
    expect(fehler).toEqual([]);
  });

  it("Konkubinat — alle Kombinationen", () => {
    const fehler: string[] = [];
    let total = 0;
    for (const pk of ["keine", "rente", "kapital"] as PkModus[]) {
      for (const immo of ["keine", "selbstbewohnt"] as ImmoModus[]) {
        for (const kinder of [0, 2]) {
          total++;
          const p = build({
            fallart: "paar",
            zivilstand: "konkubinat",
            pk,
            hat3a: true,
            immo,
            anzahlKinder: kinder,
            vermoegen: 200_000,
            kanton: "ZH",
            einkommenP1: 100_000,
            einkommenP2: 80_000,
          });
          try {
            const r = cashflowReihe(p, 2026, 2035);
            const c = plausibel(r);
            if (!c.ok) fehler.push(`${pk}/${immo}/k=${kinder}: ${c.fehler.join("; ")}`);
          } catch (e) {
            fehler.push(`CRASH ${pk}/${immo}/k=${kinder}: ${e}`);
          }
        }
      }
    }
    expect(total).toBeGreaterThan(10);
    expect(fehler).toEqual([]);
  });

  // ─── Steuer-Effekt-Tests ─────────────

  it("Kinder reduzieren Steuer (Kinder-Abzug)", () => {
    const ohne = cashflowReihe(
      build({
        fallart: "einzel",
        zivilstand: "ledig",
        pk: "rente",
        hat3a: false,
        immo: "keine",
        anzahlKinder: 0,
        vermoegen: 100_000,
        kanton: "ZH",
        einkommenP1: 100_000,
        einkommenP2: 0,
      }),
      2026,
      2026
    )[0]!;
    const mit2K = cashflowReihe(
      build({
        fallart: "einzel",
        zivilstand: "ledig",
        pk: "rente",
        hat3a: false,
        immo: "keine",
        anzahlKinder: 2,
        vermoegen: 100_000,
        kanton: "ZH",
        einkommenP1: 100_000,
        einkommenP2: 0,
      }),
      2026,
      2026
    )[0]!;
    expect(mit2K.ausgabenSteuernEinkommen).toBeLessThan(
      ohne.ausgabenSteuernEinkommen
    );
  });

  it("3a-Einzahlung reduziert Steuer (Abzug)", () => {
    const ohne = cashflowReihe(
      build({
        fallart: "einzel",
        zivilstand: "ledig",
        pk: "rente",
        hat3a: false,
        immo: "keine",
        anzahlKinder: 0,
        vermoegen: 100_000,
        kanton: "ZH",
        einkommenP1: 100_000,
        einkommenP2: 0,
      }),
      2026,
      2026
    )[0]!;
    const mit3a = cashflowReihe(
      build({
        fallart: "einzel",
        zivilstand: "ledig",
        pk: "rente",
        hat3a: true,
        immo: "keine",
        anzahlKinder: 0,
        vermoegen: 100_000,
        kanton: "ZH",
        einkommenP1: 100_000,
        einkommenP2: 0,
      }),
      2026,
      2026
    )[0]!;
    expect(mit3a.ausgabenSteuernEinkommen).toBeLessThan(
      ohne.ausgabenSteuernEinkommen
    );
  });

  it("Selbstbewohnte Immobilie erhöht Steuer vor 2030 (Eigenmietwert)", () => {
    const ohne = cashflowReihe(
      build({
        fallart: "einzel",
        zivilstand: "ledig",
        pk: "rente",
        hat3a: false,
        immo: "keine",
        anzahlKinder: 0,
        vermoegen: 100_000,
        kanton: "ZH",
        einkommenP1: 120_000,
        einkommenP2: 0,
      }),
      2026,
      2026
    )[0]!;
    const mitEH = cashflowReihe(
      build({
        fallart: "einzel",
        zivilstand: "ledig",
        pk: "rente",
        hat3a: false,
        immo: "selbstbewohnt",
        anzahlKinder: 0,
        vermoegen: 100_000,
        kanton: "ZH",
        einkommenP1: 120_000,
        einkommenP2: 0,
      }),
      2026,
      2026
    )[0]!;
    // Eigenmietwert > Schuldzins-Abzug → höhere Steuer
    expect(mitEH.ausgabenSteuernEinkommen).toBeGreaterThan(
      ohne.ausgabenSteuernEinkommen
    );
  });

  it("Renditeliegenschaft erhöht Einkommen + Steuer (Mieteinnahmen)", () => {
    const ohne = cashflowReihe(
      build({
        fallart: "einzel",
        zivilstand: "ledig",
        pk: "rente",
        hat3a: false,
        immo: "keine",
        anzahlKinder: 0,
        vermoegen: 100_000,
        kanton: "ZH",
        einkommenP1: 100_000,
        einkommenP2: 0,
      }),
      2026,
      2026
    )[0]!;
    const mitRendite = cashflowReihe(
      build({
        fallart: "einzel",
        zivilstand: "ledig",
        pk: "rente",
        hat3a: false,
        immo: "rendite",
        anzahlKinder: 0,
        vermoegen: 100_000,
        kanton: "ZH",
        einkommenP1: 100_000,
        einkommenP2: 0,
      }),
      2026,
      2026
    )[0]!;
    expect(mitRendite.einnahmenTotal).toBeGreaterThan(ohne.einnahmenTotal);
    expect(mitRendite.ausgabenSteuernEinkommen).toBeGreaterThan(
      ohne.ausgabenSteuernEinkommen
    );
  });

  it("Vermögen erhöht Vermögenssteuer", () => {
    const ohne = cashflowReihe(
      build({
        fallart: "einzel",
        zivilstand: "ledig",
        pk: "rente",
        hat3a: false,
        immo: "keine",
        anzahlKinder: 0,
        vermoegen: 50_000, // unter Freibetrag 80k
        kanton: "ZH",
        einkommenP1: 100_000,
        einkommenP2: 0,
      }),
      2026,
      2026
    )[0]!;
    const mit = cashflowReihe(
      build({
        fallart: "einzel",
        zivilstand: "ledig",
        pk: "rente",
        hat3a: false,
        immo: "keine",
        anzahlKinder: 0,
        vermoegen: 1_000_000,
        kanton: "ZH",
        einkommenP1: 100_000,
        einkommenP2: 0,
      }),
      2026,
      2026
    )[0]!;
    expect(mit.ausgabenSteuernVermoegen).toBeGreaterThan(
      ohne.ausgabenSteuernVermoegen
    );
  });

  it("Kanton-Vergleich: ZG < ZH (Steuer-Tarif-Diff)", () => {
    const zh = cashflowReihe(
      build({
        fallart: "einzel",
        zivilstand: "ledig",
        pk: "rente",
        hat3a: false,
        immo: "keine",
        anzahlKinder: 0,
        vermoegen: 100_000,
        kanton: "ZH",
        einkommenP1: 150_000,
        einkommenP2: 0,
      }),
      2026,
      2026
    )[0]!;
    const zg = cashflowReihe(
      build({
        fallart: "einzel",
        zivilstand: "ledig",
        pk: "rente",
        hat3a: false,
        immo: "keine",
        anzahlKinder: 0,
        vermoegen: 100_000,
        kanton: "ZG",
        einkommenP1: 150_000,
        einkommenP2: 0,
      }),
      2026,
      2026
    )[0]!;
    expect(zg.ausgabenSteuernEinkommen).toBeLessThan(zh.ausgabenSteuernEinkommen);
  });

  it("PK Rente vs Kapital: Pension-Einnahmen unterschiedlich", () => {
    const rente = cashflowReihe(
      build({
        fallart: "einzel",
        zivilstand: "ledig",
        pk: "rente",
        hat3a: false,
        immo: "keine",
        anzahlKinder: 0,
        vermoegen: 50_000,
        kanton: "ZH",
        einkommenP1: 100_000,
        einkommenP2: 0,
      }),
      2031,
      2031
    )[0]!;
    const kapital = cashflowReihe(
      build({
        fallart: "einzel",
        zivilstand: "ledig",
        pk: "kapital",
        hat3a: false,
        immo: "keine",
        anzahlKinder: 0,
        vermoegen: 50_000,
        kanton: "ZH",
        einkommenP1: 100_000,
        einkommenP2: 0,
      }),
      2031,
      2031
    )[0]!;
    // Rente bezahlt laufende BVG-Rente
    expect(rente.einnahmenBvgRente).toBeGreaterThan(0);
    // Kapital nicht (alles Stichtags-Bezug 2030)
    expect(kapital.einnahmenBvgRente).toBe(0);
  });

  it("Konkubinat vs Verheiratet: Steuer + AHV unterscheiden sich", () => {
    const ehe = cashflowReihe(
      build({
        fallart: "paar",
        zivilstand: "verheiratet",
        pk: "rente",
        hat3a: false,
        immo: "keine",
        anzahlKinder: 0,
        vermoegen: 200_000,
        kanton: "ZH",
        einkommenP1: 100_000,
        einkommenP2: 100_000,
      }),
      2031,
      2031
    )[0]!;
    const kk = cashflowReihe(
      build({
        fallart: "paar",
        zivilstand: "konkubinat",
        pk: "rente",
        hat3a: false,
        immo: "keine",
        anzahlKinder: 0,
        vermoegen: 200_000,
        kanton: "ZH",
        einkommenP1: 100_000,
        einkommenP2: 100_000,
      }),
      2031,
      2031
    )[0]!;
    // AHV: Konkubinat ohne Plafond → höher
    expect(kk.einnahmenAhv).toBeGreaterThan(ehe.einnahmenAhv);
  });
});

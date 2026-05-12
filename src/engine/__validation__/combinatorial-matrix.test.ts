/**
 * Combinatorial-Matrix-Tests: alle Zivilstand × Kanton × Alter × Profil-
 * Kombinationen automatisch durchspielen. Sicherheitsnetz gegen strukturelle
 * Engine-Bugs (z.B. Konkubinat-Pfad fehlt).
 *
 * Methode: für jede Kombi → Engine läuft ohne Crash + plausible Werte.
 * KEIN exakter Wert geprüft (das machen die Eckwert-Tests).
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe } from "../cashflow";
import type { CashflowInput } from "../cashflow";

const ZIVILSTAENDE = [
  { fallart: "einzel" as const, zivilstand: "ledig" as const },
  { fallart: "einzel" as const, zivilstand: "geschieden" as const },
  { fallart: "einzel" as const, zivilstand: "verwitwet" as const },
  { fallart: "paar" as const, zivilstand: "verheiratet" as const },
  { fallart: "paar" as const, zivilstand: "konkubinat" as const },
];

const KANTONE_SAMPLE = ["ZH", "BE", "ZG", "BS", "VD", "SG", "GE", "TI"];

const EINKOMMEN_LEVEL = [
  { p1: 40_000, p2: 0, label: "niedrig-single" },
  { p1: 80_000, p2: 60_000, label: "mittel-doppel" },
  { p1: 150_000, p2: 0, label: "hoch-single" },
  { p1: 200_000, p2: 200_000, label: "sehr-hoch-doppel" },
];

const VERMOEGEN_LEVEL = [0, 100_000, 500_000, 2_000_000];

function buildProfile(args: {
  zivilstand: typeof ZIVILSTAENDE[number];
  kanton: string;
  einkommen: typeof EINKOMMEN_LEVEL[number];
  vermoegen: number;
  alterP1: number;
}): CashflowInput {
  const geburtsjahr = 2025 - args.alterP1;
  return {
    fallart: args.zivilstand.fallart,
    zivilstand: args.zivilstand.zivilstand,
    person1: {
      vorname: "A",
      nachname: "T",
      geburtsdatum: `${geburtsjahr}-07-01`,
      geschlecht: "m",
      telefon: "",
      email: "",
    },
    person2: {
      vorname: args.zivilstand.fallart === "paar" ? "B" : "",
      nachname: args.zivilstand.fallart === "paar" ? "T" : "",
      geburtsdatum:
        args.zivilstand.fallart === "paar" ? `${geburtsjahr}-07-01` : "",
      geschlecht: args.zivilstand.fallart === "paar" ? "w" : null,
      telefon: "",
      email: "",
    },
    kinder: [],
    ahv: {
      einkommenP1: args.einkommen.p1,
      einkommenP2: args.einkommen.p2 || null,
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
        aktiverAnschluss: args.einkommen.p1 > 0 && args.alterP1 < 65,
        altersguthabenHeute: args.einkommen.p1 * 3,
        altersguthabenBeiBezug: args.einkommen.p1 * 5,
        umwandlungssatzProzent: 6.0,
        bezugspraeferenz: "rente",
        kapitalanteil: 0,
        freizuegigkeit: [],
        einkaeufe: [],
        wefVorbezuege: [],
      },
      p2: {
        aktiverAnschluss:
          args.zivilstand.fallart === "paar" &&
          args.einkommen.p2 > 0 &&
          args.alterP1 < 65,
        altersguthabenHeute: args.einkommen.p2 * 3 || null,
        altersguthabenBeiBezug: args.einkommen.p2 * 5 || null,
        umwandlungssatzProzent: 6.0,
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
          saldoHeute: args.vermoegen,
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
        ...(args.einkommen.p1 > 0
          ? [
              {
                id: "e1",
                beschreibung: "L1",
                personIdx: 1 as const,
                betragMonatlich: Math.round(args.einkommen.p1 / 12),
                von: "2026-01",
                bis: `${2026 + Math.max(0, 65 - args.alterP1)}-06`,
              },
            ]
          : []),
        ...(args.einkommen.p2 > 0
          ? [
              {
                id: "e2",
                beschreibung: "L2",
                personIdx: 2 as const,
                betragMonatlich: Math.round(args.einkommen.p2 / 12),
                von: "2026-01",
                bis: `${2026 + Math.max(0, 65 - args.alterP1)}-06`,
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
      kanton: args.kanton,
      gemeindeBfsId: null,
      gemeindeName: "",
    },
    einmaligeAusgaben: [],
  };
}

describe("Combinatorial-Matrix — Engine läuft fehlerfrei auf alle Kombis", () => {
  it("Zivilstand × Kanton × Einkommen × Vermögen (320 Kombis)", () => {
    let total = 0;
    let crashes = 0;
    const ungueltig: string[] = [];
    for (const z of ZIVILSTAENDE) {
      for (const k of KANTONE_SAMPLE) {
        // Einkommen-Variation nur für paar-mode wenn p2>0
        for (const e of EINKOMMEN_LEVEL) {
          if (z.fallart === "einzel" && e.p2 > 0) continue;
          for (const v of VERMOEGEN_LEVEL) {
            total++;
            const p = buildProfile({
              zivilstand: z,
              kanton: k,
              einkommen: e,
              vermoegen: v,
              alterP1: 55,
            });
            try {
              const r = cashflowReihe(p, 2026, 2030);
              // Plausi-Check: keine Crashes + Saldos endlich
              for (const z2 of r) {
                if (!Number.isFinite(z2.einnahmenTotal)) {
                  ungueltig.push(`NaN einnahmen @ ${z.zivilstand}/${k}/${e.label}/v=${v}`);
                }
                if (!Number.isFinite(z2.ausgabenSteuern)) {
                  ungueltig.push(`NaN steuern @ ${z.zivilstand}/${k}/${e.label}/v=${v}`);
                }
                if (z2.ausgabenSteuern < 0) {
                  ungueltig.push(`negative Steuern @ ${z.zivilstand}/${k}/${e.label}/v=${v}`);
                }
              }
            } catch (err) {
              crashes++;
              ungueltig.push(
                `CRASH @ ${z.zivilstand}/${k}/${e.label}/v=${v}: ${err}`
              );
            }
          }
        }
      }
    }
    // Mindestens 100 Kombis getestet
    expect(total).toBeGreaterThan(100);
    expect(crashes).toBe(0);
    expect(ungueltig).toEqual([]);
  });

  it("Alter-Variation × Zivilstand (35/55/65/80)", () => {
    const ungueltig: string[] = [];
    for (const z of ZIVILSTAENDE) {
      for (const alter of [35, 55, 65, 80]) {
        const p = buildProfile({
          zivilstand: z,
          kanton: "ZH",
          einkommen: EINKOMMEN_LEVEL[1]!,
          vermoegen: 200_000,
          alterP1: alter,
        });
        try {
          const r = cashflowReihe(p, 2026, 2050);
          for (const z2 of r) {
            if (!Number.isFinite(z2.vermoegenNetto)) {
              ungueltig.push(`NaN @ ${z.zivilstand}/Alter ${alter}`);
            }
          }
        } catch (e) {
          ungueltig.push(`CRASH @ ${z.zivilstand}/Alter ${alter}: ${e}`);
        }
      }
    }
    expect(ungueltig).toEqual([]);
  });

  it("Bezugsalter-Variation 63/64/65/67/70 funktioniert", () => {
    const ungueltig: string[] = [];
    for (const alter of [63, 64, 65, 67, 70]) {
      const p = buildProfile({
        zivilstand: ZIVILSTAENDE[0]!,
        kanton: "ZH",
        einkommen: EINKOMMEN_LEVEL[1]!,
        vermoegen: 100_000,
        alterP1: 55,
      });
      p.ahv.ahvBezugsalterP1 = alter;
      p.ziele.bezugsalterP1 = alter;
      try {
        const r = cashflowReihe(p, 2030, 2040);
        if (r.length === 0) ungueltig.push(`leere Reihe @ alter ${alter}`);
      } catch (e) {
        ungueltig.push(`CRASH @ alter ${alter}: ${e}`);
      }
    }
    expect(ungueltig).toEqual([]);
  });

  it("Religion-Variation × Kanton (Kirchensteuer)", () => {
    const ungueltig: string[] = [];
    const RELIGIONEN = ["keine", "reformiert", "katholisch", "andere"] as const;
    for (const r of RELIGIONEN) {
      for (const k of ["ZH", "BE", "SG"]) {
        const p = buildProfile({
          zivilstand: ZIVILSTAENDE[0]!,
          kanton: k,
          einkommen: EINKOMMEN_LEVEL[1]!,
          vermoegen: 100_000,
          alterP1: 55,
        });
        p.budget = { ...p.budget, religion: r };
        try {
          const reihe = cashflowReihe(p, 2026, 2026);
          if (!Number.isFinite(reihe[0]!.ausgabenSteuern)) {
            ungueltig.push(`NaN @ ${k}/${r}`);
          }
        } catch (e) {
          ungueltig.push(`CRASH @ ${k}/${r}: ${e}`);
        }
      }
    }
    expect(ungueltig).toEqual([]);
  });
});

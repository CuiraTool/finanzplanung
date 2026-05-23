/* eslint-disable */
/**
 * Validierungs-Vergleich Taxware ↔ Cuira-Engine — Fall 1: Stanojevic.
 * Quelle: "Def. FinancialPlanning2.pdf" — Szenario "Ausgangslage".
 *
 * Annahmen / Mapping-Entscheide (dokumentiert):
 *  - "Heute" auf 2025 gepinnt (Taxware-Planerstellung 21.08.2025).
 *  - AHV fixiert auf Taxware-Annahme: Ehepaar 43'326 inkl. 13. AHV.
 *    Override-Feld erwartet 12-Monats-Basis → 43'326 × 12/13 = 39'993.
 *    Aufteilung: Milivoje einzel 26'377 → 24'347 / Dusica 16'949 → 15'646.
 *  - Liegenschafts-Übergabe an Sohn 2030 ohne Geldfluss → modelliert als
 *    plan="verschenken" 2030 (Erbvorbezug). Engine zieht Verkehrswert UND
 *    Hypothek aus der Bilanz, KEIN Geldfluss, KEINE GGSt. Sauberer als der
 *    frühere Workaround (Verkauf + Schenkung des Erlöses).
 *  - Hauptkonto-Rendite 0 % (Taxware verzinst die Liquidität nicht).
 */
import type { CashflowInput } from "../src/engine/cashflow";

// ── "Heute" auf 2025 pinnen ────────────────────────────────────────
const FIXED_NOW = new Date("2025-08-21T12:00:00Z").getTime();
const _RealDate = Date;
class _FakeDate extends _RealDate {
  constructor(...args: any[]) {
    if (args.length === 0) super(FIXED_NOW);
    // @ts-ignore
    else super(...args);
  }
  static now() {
    return FIXED_NOW;
  }
}
(globalThis as any).Date = _FakeDate;

async function main() {
  const { cashflowReihe } = await import("../src/engine/cashflow");

  const state: CashflowInput = {
    fallart: "paar",
    zivilstand: "verheiratet",
    person1: {
      vorname: "Milivoje",
      nachname: "Stanojevic",
      geburtsdatum: "1963-05-25",
      geschlecht: "m",
      telefon: "",
      email: "",
    },
    person2: {
      vorname: "Dusica",
      nachname: "Stanojevic",
      geburtsdatum: "1968-06-08",
      geschlecht: "w",
      telefon: "",
      email: "",
    },
    kinder: [],
    adresse: {
      strasse: "Hundwilerstrasse 31",
      plz: "9104",
      ort: "Waldstatt",
      kanton: "AR",
      gemeindeBfsId: null,
      gemeindeName: "Waldstatt",
    },
    ziele: { bezugsalterP1: 65, bezugsalterP2: 65 },
    ahv: {
      einkommenP1: 62000,
      einkommenP2: 33600,
      hatIkAuszugP1: false,
      hatIkAuszugP2: false,
      hatFehljahreP1: false,
      hatFehljahreP2: false,
      fehljahreAnzahlP1: 0,
      fehljahreAnzahlP2: 0,
      ahvBezugsalterP1: 65,
      ahvBezugsalterP2: 65,
      // Taxware-Annahme fixiert (12-Monats-Basis, Engine rechnet 13/12 drauf)
      ahvRenteJahrEffektivP1: 24347,
      ahvRenteJahrEffektivP2: 15646,
    },
    bvg: {
      p1: {
        aktiverAnschluss: true,
        altersguthabenHeute: 114147,
        altersguthabenBeiBezug: 151692,
        umwandlungssatzProzent: 5.5,
        bezugspraeferenz: "kapital",
        kapitalanteil: 100,
        freizuegigkeit: [],
        einkaeufe: [],
        wefVorbezuege: [],
      },
      p2: {
        aktiverAnschluss: false,
        altersguthabenHeute: 0,
        altersguthabenBeiBezug: 0,
        umwandlungssatzProzent: 5.5,
        bezugspraeferenz: "kapital",
        kapitalanteil: 100,
        freizuegigkeit: [
          {
            id: "fz-dusica",
            beschreibung: "Freizügigkeitskonto",
            saldoHeute: 82185,
            auszahlungsjahr: 2029,
            renditeProzent: 0.13,
          },
        ],
        einkaeufe: [],
        wefVorbezuege: [],
      },
    },
    saeuleDrei: {
      p1: [
        {
          id: "3a-mili",
          type: "konto",
          saeule: "3a",
          beschreibung: "3a-Konto Raiffeisen",
          aktuellerWert: 33671,
          auszahlungsjahr: 2028,
          renditeProzent: 0,
          rueckkaufswert: null,
          ablaufswert: null,
          ablaufjahr: 2028,
          jaehrlicheEinzahlung: 7258,
          einzahlungAb: 2025,
          einzahlungBis: 2028,
        },
      ],
      p2: [
        {
          id: "3a-dusica-konto",
          type: "konto",
          saeule: "3a",
          beschreibung: "3a-Konto Raiffeisen",
          aktuellerWert: 15000,
          auszahlungsjahr: 2031,
          renditeProzent: 0,
          rueckkaufswert: null,
          ablaufswert: null,
          ablaufjahr: 2031,
          jaehrlicheEinzahlung: 1800,
          einzahlungAb: 2025,
          einzahlungBis: 2031,
        },
        {
          id: "3a-dusica-police",
          type: "versicherung",
          saeule: "3a",
          beschreibung: "3a-Police Allianz",
          aktuellerWert: null,
          auszahlungsjahr: 2032,
          renditeProzent: 0,
          rueckkaufswert: 22416,
          ablaufswert: 31334,
          ablaufjahr: 2032,
          jaehrlicheEinzahlung: 1800,
          einzahlungAb: 2025,
          einzahlungBis: 2031,
        },
      ],
    },
    vermoegen: {
      items: [
        {
          id: "hk",
          typ: "konto",
          beschreibung: "Privatkonto / Liquidität",
          saldoHeute: 49200,
          renditeProzent: 0,
          istHauptkonto: true,
        },
      ],
    },
    immobilien: {
      items: [
        {
          id: "immo-waldstatt",
          beschreibung: "Eigenheim Waldstatt",
          typ: "selbstbewohnt",
          verkehrswert: 1000000,
          hypotheken: [
            {
              id: "hyp-1",
              beschreibung: "Hypothek",
              hoehe: 628000,
              zinssatzProzent: 1.17,
              ablaufjahr: 2050,
            },
          ],
          plan: "verschenken",
          verkaufsjahr: 2030, // = Übergabejahr an Sohn (Erbvorbezug)
          jaehrlicheMieteinnahmen: null,
          kaufjahr: 2005,
          anlagekosten: null, // bei "verschenken" irrelevant (kein GGSt-Aufschub-Mechanismus)
          wertsteigerungProzent: 0, // Taxware hält Verkehrswert flach
          eigenmietwertProzent: 1.13,
        },
      ],
    },
    firma: {
      vorhanden: false,
      firmenname: "",
      moeglicherVerkaufserloes: null,
      plan: "behalten",
      verkaufsjahr: 2035,
    },
    budget: {
      einkommen: [
        {
          id: "lohn-mili",
          beschreibung: "Erwerbseinkommen Milivoje",
          personIdx: 1,
          betragMonatlich: 62000 / 12,
          von: "2025-01",
          bis: "2028-05",
        },
        {
          id: "lohn-dusica",
          beschreibung: "Erwerbseinkommen / RAV Dusica",
          personIdx: 2,
          betragMonatlich: 33600 / 12,
          von: "2025-01",
          bis: "2026-06",
        },
      ],
      ausgabenModus: "total",
      ausgabenTotal: 48540 / 12, // Lebenshaltung+Wohnkosten Eigentum+Mobilität+Versicherung
      ausgabenKategorien: {
        lebenshaltung: null,
        wohnen: null,
        mobilitaet: null,
        versicherungen: null,
        ferienHobby: null,
        sonstiges: null,
      },
      wunschverbrauchPension: 48540 / 12,
      steuernHeute: 12000,
      einkommenHeute: 95600,
      religion: "andere",
      alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
      // Inflation hier bewusst aus: Taxware drosselt Haushalt 2030 strukturell
      // (Wohnkosten Eigentum 5'000 fallen weg bei Liegenschafts-Übergabe an
      // Sohn) und unsere Engine modelliert das nicht — ohne Inflation
      // kompensieren die zwei Effekte einander zufällig.
      inflationProzent: null,
    },
    einmaligeAusgaben: [],
    laufendeAusgaben: [],
    erbschaft: {
      erwartet: "nein",
      groessenordnung: null,
      erwartetBetrag: null,
      erwartetJahr: null,
      erwartetBeruecksichtigen: false,
      erwartetVerwandtschaft: "nachkomme",
      // Liegenschafts-Übergabe an Sohn ist via immo.plan="verschenken"
      // intrinsisch modelliert — keine separate Cash-Schenkung mehr nötig.
      schenkungenStatus: "nein",
      schenkungenBetrag: null,
      schenkungenJahr: null,
      schenkungenBeruecksichtigen: false,
      schenkungenDetails: "Liegenschaft an Sohn (via plan='verschenken')",
      gueterstand: "errungenschaft",
    },
  };

  const reihe = cashflowReihe(state, 2025, 2050);

  // ── Taxware-Referenz (Szenario Ausgangslage) ─────────────────────
  const taxware: Record<
    number,
    { saldo: number; vermNetto: number; stTotal: number; stEink: number; stVerm: number; stKap: number }
  > = {
    2028: { saldo: -45902, vermNetto: 727855, stTotal: 18906, stEink: 4882, stVerm: 0, stKap: 14024 },
    2033: { saldo: -13217, vermNetto: 230887, stTotal: 497, stEink: 168, stVerm: 329, stKap: 0 },
    2038: { saldo: -8544, vermNetto: 193891, stTotal: 2317, stEink: 2135, stVerm: 182, stKap: 0 },
    2043: { saldo: -10908, vermNetto: 144120, stTotal: 2153, stEink: 2135, stVerm: 18, stKap: 0 },
  };

  const f = (n: number) => n.toLocaleString("de-CH").padStart(11);

  console.log("\n=== VOLLE REIHE 2025–2050 (Cuira-Engine) ===");
  console.log(
    ["Jahr", "AlP1", "einnT", "ausgT", "saldo", "stTot", "stEink", "stVerm", "stKap", "kapAusz", "vermNetto"]
      .map((s) => s.padStart(11))
      .join("")
  );
  for (const z of reihe) {
    console.log(
      [
        z.jahr,
        z.alterP1 ?? "",
        z.einnahmenTotal,
        z.ausgabenTotal,
        z.saldo,
        z.ausgabenSteuern,
        z.ausgabenSteuernEinkommen,
        z.ausgabenSteuernVermoegen,
        z.ausgabenSteuernKapital,
        z.kapAuszahlungen,
        z.vermoegenNetto,
      ]
        .map((v) => String(v).padStart(11))
        .join("")
    );
  }

  console.log("\n=== CHECKPOINT-VERGLEICH (Person 1 Alter 65/70/75/80) ===");
  for (const jahr of [2028, 2033, 2038, 2043]) {
    const z = reihe.find((r) => r.jahr === jahr)!;
    const t = taxware[jahr]!;
    const cuiraStLaufend = z.ausgabenSteuernEinkommen + z.ausgabenSteuernVermoegen;
    const taxStLaufend = t.stEink + t.stVerm;
    const d = (cuira: number, tax: number) => {
      const diff = cuira - tax;
      const pct = tax !== 0 ? ((diff / Math.abs(tax)) * 100).toFixed(1) + "%" : "–";
      return `${f(cuira)} | ${f(tax)} | Δ ${f(diff)} (${pct})`;
    };
    console.log(`\n── ${jahr} (Alter P1 ${z.alterP1}) ──            CUIRA |     TAXWARE | Δ`);
    console.log(`  Saldo Einn./Ausg. : ${d(z.saldo, t.saldo)}`);
    console.log(`  Vermögen netto    : ${d(z.vermoegenNetto, t.vermNetto)}`);
    console.log(`  Steuern total     : ${d(z.ausgabenSteuern, t.stTotal)}`);
    console.log(`    davon Einkommen : ${d(z.ausgabenSteuernEinkommen, t.stEink)}`);
    console.log(`    davon Vermögen  : ${d(z.ausgabenSteuernVermoegen, t.stVerm)}`);
    console.log(`    davon Kapital   : ${d(z.ausgabenSteuernKapital, t.stKap)}`);
    console.log(`    laufend (E+V)   : ${d(cuiraStLaufend, taxStLaufend)}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

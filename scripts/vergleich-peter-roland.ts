/* eslint-disable */
/**
 * Validierungs-Vergleich Taxware ↔ Cuira-Engine — Fall 2: Peter Roland.
 * Quelle: "Def.FinancialPlanning 66% Bezug.pdf" — Szenario "Ausgangslage".
 *
 * Spezifika dieses Falls (vs Stanojevic):
 *  - Mieter (kein Eigenheim → kein Eigenmietwert/Schuldzins/GGSt)
 *  - Roland Mischbezug: CHF 200'000 Kapital + Rest Rentenbezug PK SGPK
 *    (kapitalanteil ≈ 20 %, Restsaldo wird Rente 50'142 p.a.)
 *  - Elisabeth 100 % Kapitalbezug PK SGPK CHF 221'690
 *  - Roland bereits 65 im Plan-Startjahr (Pensionierung Ende Juli 2025)
 *  - Wohnmobil-Kauf CHF 150'000 in 2026 (einmalige Ausgabe)
 *  - Steuerkanton SG, Steuergemeinde Untereggen
 *  - 0 Kinder, Religion "Andere", Inflation 1 %/J
 *
 * Annahmen / Mapping-Entscheide:
 *  - "Heute" auf 2025 gepinnt (Taxware-Erstellung 09.12.2024).
 *  - AHV auf Taxware-Annahme 49'296 (Ehepaar inkl. 13. AHV) gepinnt.
 *    Engine plafondiert leicht tiefer (45'360 × 13/12 = 49'140) — Δ 156/J.
 *  - PK Roland modelliert via altersguthabenBeiBezug 1'000'000 + kapital-
 *    anteil 20 + uws 6.27 % (back-rechnet auf Taxware-Rente 50'142).
 *  - Inflation aktiv (1 %) — kein struktureller Haushalts-Drop (Mieter).
 */
import type { CashflowInput } from "../src/engine/cashflow";

// ── "Heute" auf 2025 pinnen ────────────────────────────────────────
const FIXED_NOW = new Date("2025-01-15T12:00:00Z").getTime();
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
      vorname: "Roland",
      nachname: "Peter",
      geburtsdatum: "1960-02-07",
      geschlecht: "m",
      telefon: "",
      email: "",
    },
    person2: {
      vorname: "Elisabeth",
      nachname: "Peter",
      geburtsdatum: "1961-03-21",
      geschlecht: "w",
      telefon: "",
      email: "",
    },
    kinder: [],
    adresse: {
      strasse: "Iltenriet 5",
      plz: "9033",
      ort: "Untereggen",
      kanton: "SG",
      gemeindeBfsId: null,
      gemeindeName: "Untereggen",
    },
    ziele: { bezugsalterP1: 65, bezugsalterP2: 64 },
    ahv: {
      einkommenP1: 77583,
      einkommenP2: 39083,
      hatIkAuszugP1: false,
      hatIkAuszugP2: false,
      hatFehljahreP1: false,
      hatFehljahreP2: false,
      fehljahreAnzahlP1: 0,
      fehljahreAnzahlP2: 0,
      ahvBezugsalterP1: 65,
      ahvBezugsalterP2: 64,
      // Taxware: max Ehepaarrente 49'296 incl. 13. AHV
      // 12-Monats-Basis: 49'296 × 12/13 = 45'504. Plafond 45'360 — knapp drüber.
      // Split 60/40 nach Einkommens-Verhältnis.
      ahvRenteJahrEffektivP1: 27915,
      ahvRenteJahrEffektivP2: 17589,
    },
    bvg: {
      p1: {
        aktiverAnschluss: true,
        altersguthabenHeute: 1158683,
        altersguthabenBeiBezug: 1000000,
        umwandlungssatzProzent: 6.27,
        bezugspraeferenz: "mischung",
        kapitalanteil: 20, // 200'000 von 1'000'000 = 20%
        freizuegigkeit: [],
        einkaeufe: [],
        wefVorbezuege: [],
      },
      p2: {
        aktiverAnschluss: true,
        altersguthabenHeute: 216134,
        altersguthabenBeiBezug: 221690,
        umwandlungssatzProzent: 5.5,
        bezugspraeferenz: "kapital",
        kapitalanteil: 100,
        freizuegigkeit: [],
        einkaeufe: [],
        wefVorbezuege: [],
      },
    },
    saeuleDrei: { p1: [], p2: [] },
    vermoegen: {
      items: [
        {
          id: "hk",
          typ: "konto",
          beschreibung: "Privatkonto / Liquidität",
          saldoHeute: 0, // Taxware page 6 zeigt Konti+Anlagen 0 heute
          renditeProzent: 0,
          istHauptkonto: true,
        },
      ],
    },
    immobilien: { items: [] }, // Mieter
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
          id: "lohn-roland",
          beschreibung: "Erwerbseinkommen Roland",
          personIdx: 1,
          betragMonatlich: 77583 / 12,
          von: "2025-01",
          bis: "2025-07", // Pensionierung Ende Juli (Schuljahr)
        },
        {
          id: "lohn-elisabeth",
          beschreibung: "Erwerbseinkommen Elisabeth",
          personIdx: 2,
          betragMonatlich: 39083 / 12,
          von: "2025-01",
          bis: "2025-07",
        },
      ],
      ausgabenModus: "total",
      // Lebenshaltung 33'600 + Wohnkosten Miete 26'880 + Mobilität 9'000 +
      // Versicherungen 12'420 + Diverse 3'240 = 85'140/J
      ausgabenTotal: 85140 / 12,
      ausgabenKategorien: {
        lebenshaltung: null,
        wohnen: null,
        mobilitaet: null,
        versicherungen: null,
        ferienHobby: null,
        sonstiges: null,
      },
      wunschverbrauchPension: 85140 / 12,
      steuernHeute: 62346,
      einkommenHeute: 192900,
      religion: "andere",
      alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
      inflationProzent: 1.0, // Taxware inflationiert 1%/J
    },
    einmaligeAusgaben: [
      {
        id: "wohnmobil",
        jahr: 2026,
        betrag: 150000,
        beschreibung: "Kauf Wohnmobil",
      },
    ],
    laufendeAusgaben: [],
    erbschaft: {
      erwartet: "nein",
      groessenordnung: null,
      erwartetBetrag: null,
      erwartetJahr: null,
      erwartetBeruecksichtigen: false,
      erwartetVerwandtschaft: "nachkomme",
      schenkungenStatus: "nein",
      schenkungenBetrag: null,
      schenkungenJahr: null,
      schenkungenBeruecksichtigen: false,
      schenkungenDetails: "",
      gueterstand: "errungenschaft",
    },
  };

  const reihe = cashflowReihe(state, 2025, 2050);

  // ── Taxware-Referenz (Szenario Ausgangslage) ─────────────────────
  const taxware: Record<
    number,
    { saldo: number; vermNetto: number; stTotal: number; stEink: number; stVerm: number; stKap: number }
  > = {
    2025: { saldo: 45414, vermNetto: 195104, stTotal: 62346, stEink: 35314, stVerm: 0, stKap: 27032 },
    2030: { saldo: -1700, vermNetto: 221521, stTotal: 11656, stEink: 11378, stVerm: 278, stKap: 0 },
    2035: { saldo: -6196, vermNetto: 199590, stTotal: 11588, stEink: 11378, stVerm: 210, stKap: 0 },
    2040: { saldo: -10841, vermNetto: 154732, stTotal: 11435, stEink: 11378, stVerm: 57, stKap: 0 },
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
  for (const jahr of [2025, 2030, 2035, 2040]) {
    const z = reihe.find((r) => r.jahr === jahr)!;
    const t = taxware[jahr]!;
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
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

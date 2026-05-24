/* eslint-disable */
/**
 * Validierungs-Vergleich Taxware ↔ Cuira-Engine — Fall: Bakiu Shemsi + Selime.
 * Quelle: "Def.FinancialPlanning - Angepasst.pdf" (Mission 13, 24.11.2025).
 * Verglichen wird das Szenario "Ausgangslage" (NICHT die Finanzplanung).
 *
 * Spezifika dieses Falls:
 *  - Eigentümer (selbstbewohnt, Trimmis GR), Verkehrswert 1'000'000,
 *    Steuerwert 763'000, Hypothek 668'000 (Zins 1.64% bis 2029 → 2.0% ab 2030)
 *  - Beide nicht aktiv versichert (nur Freizügigkeit-Konti)
 *    - Shemsi FZ Swiss Life — Auszahlung 2029 mit CHF 179'814
 *    - Selime FZ Swiss Life — Auszahlung 2027 mit CHF 9'633
 *    - Selime 3a UBS — Auszahlung 2028 mit CHF 89'208 (4 J. Einz. 7'258)
 *  - Steuerkanton GR, Steuergemeinde Trimmis
 *  - 0 Kinder, Konfession "Andere" → keine Kirchensteuer
 *  - Inflation 0.75 %/J, Rendite Wertschriften 1.5 %/J
 *  - Erbvorbezug nur im Finanzplanungs-Szenario, hier Ausgangslage ohne
 *
 * Vereinfachungen / Mapping-Entscheide:
 *  - "Heute" auf 2025 gepinnt (Taxware-Erstellung 24.11.2025).
 *  - AHV-Werte aus PDF direkt als Override gesetzt — Taxware liefert
 *    nicht-Maximum-Renten (vermutlich aufgrund effektiver IK-Auszüge):
 *      Shemsi 22'680 (12 Mt), Selime 11'791 (12 Mt). Engine multipliziert
 *      ab 2026 mit 13/12 (= 24'570 / 12'773).
 *  - Shemsi BVG-Saldo 171'087 als Freizügigkeit modelliert (kein
 *    aktiver Anschluss). PK-Bezug 100 % Kapital, Auszahlung 2029.
 *  - Selime 3a UBS — Saldo heute ≈ 59'500 (Rückrechnung aus 89'208
 *    End 2028 mit Einz. 7'258 × 4 + 1.5% Rendite).
 *  - Eigenheim-Plan "behalten", Eigenmietwert via Engine-Default
 *    (ab Reform 2030 auto ausgeschaltet).
 *  - Hypothek ein einziger Eintrag, Zinssatz 1.64% bis 2029,
 *    Refinanzierungs-Zinssatz 2.0% ab 2030 (ablaufjahr = 2030).
 */

import type { CashflowInput } from "../src/engine/cashflow";

// ── "Heute" auf 2025 pinnen ────────────────────────────────────────
const FIXED_NOW = new Date("2025-11-24T12:00:00Z").getTime();
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
      vorname: "Shemsi",
      nachname: "Bakiu",
      geburtsdatum: "1960-05-25",
      geschlecht: "m",
      telefon: "",
      email: "",
    },
    person2: {
      vorname: "Selime",
      nachname: "Bakiu",
      geburtsdatum: "1963-08-20",
      geschlecht: "w",
      telefon: "",
      email: "",
    },
    kinder: [],
    adresse: {
      strasse: "Cholplatzweg 22a",
      plz: "7203",
      ort: "Trimmis",
      kanton: "GR",
      gemeindeBfsId: null,
      gemeindeName: "Trimmis",
    },
    // Ziele: Pensionierung Shemsi mit 70, Selime mit 64.75
    ziele: { bezugsalterP1: 70, bezugsalterP2: 65 },
    ahv: {
      einkommenP1: 299000,
      einkommenP2: 36700,
      hatIkAuszugP1: false,
      hatIkAuszugP2: false,
      hatFehljahreP1: false,
      hatFehljahreP2: false,
      fehljahreAnzahlP1: 0,
      fehljahreAnzahlP2: 0,
      // KEIN Aufschub — beide beziehen AHV ab ordentlichem Ref-Alter
      ahvBezugsalterP1: 65, // Shemsi ordentlich (Mai 2025)
      ahvBezugsalterP2: 65, // Selime ordentlich (Mai 2028, AHV21 Ref-Alter 64.75 ≈ 65)
      // Taxware-Override: PDF zeigt 37'343 Ehepaar-Total ab 2029 (inkl. 13. AHV).
      // Aufteilung Shemsi/Selime aus S.14:
      //   2026: 24'570 (nur Shemsi voll, mit 13. AHV) → 22'680 ohne 13.
      //   2029: 37'343 (beide voll, mit 13. AHV) → 34'471 ohne 13.
      //   Selime = 34'471 - 22'680 = 11'791 ohne 13.
      ahvRenteJahrEffektivP1: 22680,
      ahvRenteJahrEffektivP2: 11791,
    },
    bvg: {
      p1: {
        aktiverAnschluss: false,
        altersguthabenHeute: null,
        altersguthabenBeiBezug: null,
        umwandlungssatzProzent: 0,
        bezugspraeferenz: "kapital",
        kapitalanteil: 100,
        freizuegigkeit: [
          {
            id: "fz-shemsi",
            beschreibung: "FZ Swiss Life",
            saldoHeute: 171087,
            auszahlungsjahr: 2029,
            renditeProzent: 1.5,
          },
        ],
        einkaeufe: [],
        wefVorbezuege: [],
      },
      p2: {
        aktiverAnschluss: false,
        altersguthabenHeute: null,
        altersguthabenBeiBezug: null,
        umwandlungssatzProzent: 0,
        bezugspraeferenz: "kapital",
        kapitalanteil: 100,
        freizuegigkeit: [
          {
            id: "fz-selime",
            beschreibung: "FZ Swiss Life",
            saldoHeute: 9350,
            auszahlungsjahr: 2027,
            renditeProzent: 1.5,
          },
        ],
        einkaeufe: [],
        wefVorbezuege: [],
      },
    },
    saeuleDrei: {
      p1: [
        {
          id: "3a-shemsi",
          type: "konto",
          saeule: "3a",
          beschreibung: "3a Shemsi",
          aktuellerWert: 67434,
          auszahlungsjahr: 2030, // Pensionierung Shemsi
          renditeProzent: 1.5,
          rueckkaufswert: null,
          ablaufswert: null,
          ablaufjahr: 2030,
          jaehrlicheEinzahlung: 7258,
          einzahlungAb: 2025,
          einzahlungBis: 2027, // S.14 zeigt 3a-Beiträge nur 2025-2027
        },
      ],
      p2: [
        {
          id: "3a-selime",
          type: "konto",
          saeule: "3a",
          beschreibung: "3a UBS Selime",
          // Rückrechnung: 89'208 End 2028 mit Einz. 7'258 × 4 (2025-2028) bei 1.5% Rendite
          // → Saldo heute ≈ 59'500
          aktuellerWert: 59500,
          auszahlungsjahr: 2028,
          renditeProzent: 1.5,
          rueckkaufswert: null,
          ablaufswert: null,
          ablaufjahr: 2028,
          jaehrlicheEinzahlung: 7258,
          einzahlungAb: 2025,
          einzahlungBis: 2028,
        },
      ],
    },
    vermoegen: {
      items: [
        {
          id: "hk",
          typ: "konto",
          beschreibung: "Liquidität",
          saldoHeute: 432000,
          renditeProzent: 0,
          istHauptkonto: true,
        },
        {
          id: "depot",
          typ: "depot",
          beschreibung: "Übrige Anlagen",
          saldoHeute: 100000,
          renditeProzent: 1.5,
          istHauptkonto: false,
        },
      ],
    },
    immobilien: {
      items: [
        {
          id: "eh-trimmis",
          beschreibung: "Eigenheim Trimmis",
          typ: "selbstbewohnt",
          verkehrswert: 1000000,
          hypotheken: [
            {
              id: "hypo-1",
              beschreibung: "Hypothek Trimmis",
              hoehe: 668000,
              zinssatzProzent: 1.64, // 10'955 / 668'000 ≈ 1.64%
              ablaufjahr: 2030,
              refinanzierungZinssatzProzent: 2.0, // ab 2030 Vorsichts-Refinanzierung
              tilgungsplan: [],
            },
          ],
          plan: "behalten",
          verkaufsjahr: 2099,
          jaehrlicheMieteinnahmen: null,
          kaufjahr: null,
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
          id: "lohn-shemsi",
          beschreibung: "Erwerbseinkommen Shemsi",
          personIdx: 1,
          betragMonatlich: 299000 / 12,
          von: "2025-01",
          bis: "2030-05", // Pensionierung Ende Mai 2030
        },
        {
          id: "lohn-selime",
          beschreibung: "Erwerbseinkommen Selime",
          personIdx: 2,
          betragMonatlich: 36700 / 12,
          von: "2025-01",
          bis: "2028-05", // Pensionierung Ende Mai 2028
        },
      ],
      ausgabenModus: "total",
      // Lebenshaltung 76'000 + Wohnen 10'000 + Mobilität 8'000 + Versich. 17'000 +
      // Diverse 62'000 (Versch.) + Freizeit/Ferien 6'000 + Rückstellungen 6'000 +
      // Krankenkasse 12'000 (bereits in Versich.?) + Divers 50'000
      // Aus S.14 Liquidität: Lebenshaltung 76'000 + Wohnen+Zins 20'955 (10'000+10'955)
      //   + Freizeit 6'000 + Diverse 106'000 + 3a 7'258 = 216'213 ohne Steuern
      // → 216'213 / 12 = 18'017.75/Mt
      ausgabenTotal: 216213 / 12,
      ausgabenKategorien: {
        lebenshaltung: null,
        wohnen: null,
        mobilitaet: null,
        versicherungen: null,
        ferienHobby: null,
        sonstiges: null,
      },
      // Pension: PDF zeigt Total ~113k incl. Steuern in 2032 (vollpens.)
      //  − Steuern ~800 = 112'200 nominal
      //  In Werten 2025 (rückinflationiert): 112'200 / 1.0075^7 = 106'500
      //  Aber Wohnen+Zins (23'897 in 2032 mit Reform-Effekt) und Inflation
      //  werden separat addiert. Setze wunschverbrauchPension auf
      //  Lebenshaltung + Freizeit + Wohnen (nominal heute) = 76'000 + 6'000 + 10'000 = 92'000
      wunschverbrauchPension: 92000 / 12,
      steuernHeute: 83000,
      einkommenHeute: 335700, // Total Erwerbseinkommen heute
      religion: "andere",
      alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
      inflationProzent: 0.75,
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
      schenkungenStatus: "nein",
      schenkungenBetrag: null,
      schenkungenJahr: null,
      schenkungenBeruecksichtigen: false,
      schenkungenDetails: "",
      gueterstand: "errungenschaft",
    },
  };

  const reihe = cashflowReihe(state, 2025, 2050);

  // ── Taxware-Referenz Bakiu Ausgangslage (Person 1 Alter 65/70/75/80) ──
  const taxware: Record<
    number,
    { saldo: number; vermNetto: number; stTotal: number; stEink: number; stVerm: number; stKap: number }
  > = {
    2025: { saldo: 49717, vermNetto: 1172150, stTotal: 83000, stEink: 83000, stVerm: 0, stKap: 0 },
    2030: { saldo: -147989, vermNetto: 1216415, stTotal: 91017, stEink: 87995, stVerm: 3022, stKap: 0 },
    2035: { saldo: -77386, vermNetto: 813430, stTotal: 2231, stEink: 791, stVerm: 1440, stKap: 0 },
    2040: { saldo: -79970, vermNetto: 428111, stTotal: 1041, stEink: 804, stVerm: 237, stKap: 0 },
  };

  const f = (n: number) => n.toLocaleString("de-CH").padStart(12);

  console.log("\n=== VOLLE REIHE 2025–2050 (Cuira-Engine, Bakiu) ===");
  console.log(
    ["Jahr", "AlP1", "einnT", "ausgT", "saldo", "stTot", "stEink", "stVerm", "stKap", "kapAusz", "vermNetto"]
      .map((s) => s.padStart(12))
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
        .map((v) => String(v).padStart(12))
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
    console.log(`  Einnahmen total   : ${f(z.einnahmenTotal)} (Erwerb ${z.einnahmenErwerb}, AHV ${z.einnahmenAhv}, BVG ${z.einnahmenBvgRente})`);
    console.log(`  Ausgaben total    : ${f(z.ausgabenTotal)} (Haushalt ${z.ausgabenHaushalt}, Hypozins ${z.ausgabenHypozins})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

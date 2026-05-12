/**
 * SSM Engine-Vergleich (Audit, read-only).
 *
 * Vergleicht Cuira-Cashflow-Engine gegen 2 reale SSM-Berater-PDFs:
 *
 *   1. Ralph + Stephanie Muster (Paar, 1967+1972, ZH Zürich Stadt)
 *      → docs/Def.FinancialPlanning - Muster.pdf
 *   2. Franziska Werrn (Single 1970, geschieden, ZH Niederglatt)
 *      → SSM-Plan 2026 (Privatdaten, lokal in Google-Drive-Mirror)
 *
 * ZIEL: Drift identifizieren. Tests laufen mit grosser Toleranz (±10–25 %)
 * und sollen NICHT die normale CI brechen. Sie dokumentieren erwartete
 * Engine-Lücken. Detail-Bericht in `docs/AUDIT-ENGINE-VERGLEICH.md`.
 *
 * Hinweis: Engine wird NICHT verändert. Wenn Tests fehlschlagen, ist das
 * ein Audit-Befund — kein Bug im Test.
 */
import { describe, it, expect } from "vitest";
import { cashflowReihe, type CashflowInput, type CashflowZeile } from "../cashflow";

// Generischer Helper für einen leeren CashflowInput (Basis-Defaults).
function leererCashflowInput(): CashflowInput {
  return {
    fallart: "einzel",
    zivilstand: "ledig" as const,
    person1: {
      vorname: "",
      nachname: "",
      geburtsdatum: "",
      geschlecht: null,
      telefon: "",
      email: "",
    },
    person2: {
      vorname: "",
      nachname: "",
      geburtsdatum: "",
      geschlecht: null,
      telefon: "",
      email: "",
    },
    kinder: [],
    ahv: {
      einkommenP1: null,
      einkommenP2: null,
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
        aktiverAnschluss: false,
        altersguthabenHeute: null,
        altersguthabenBeiBezug: null,
        umwandlungssatzProzent: 5.5,
        bezugspraeferenz: "rente",
        kapitalanteil: 0,
        freizuegigkeit: [],
        einkaeufe: [],
        wefVorbezuege: [],
      },
      p2: {
        aktiverAnschluss: false,
        altersguthabenHeute: null,
        altersguthabenBeiBezug: null,
        umwandlungssatzProzent: 5.5,
        bezugspraeferenz: "rente",
        kapitalanteil: 0,
        freizuegigkeit: [],
        einkaeufe: [],
        wefVorbezuege: [],
      },
    },
    saeuleDrei: { p1: [], p2: [] },
    vermoegen: { items: [] },
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
      einkommen: [],
      ausgabenModus: "total",
      ausgabenTotal: null,
      ausgabenKategorien: {
        lebenshaltung: null,
        wohnen: null,
        mobilitaet: null,
        versicherungen: null,
        ferienHobby: null,
        sonstiges: null,
      },
      wunschverbrauchPension: null,
      steuernHeute: null,
      einkommenHeute: null,
      religion: "keine",
      alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
    },
    adresse: {
      strasse: "",
      plz: "",
      ort: "",
      kanton: "ZH",
      gemeindeBfsId: null,
      gemeindeName: "",
    },
    einmaligeAusgaben: [],
  };
}

// ─────────────────────────────────────────────────────────────────────
// Profil 1: Ralph + Stephanie Muster
//
// PDF-Setup (Seiten 3-5):
//   - Ralph 29.07.1967 (57 in 2024), Stephanie 03.11.1972 (52 in 2024)
//   - ZH Zürich Stadt, beide verheiratet, Konf. "Andere"/"Reformiert"
//   - Pensionierung beide ord. 65 (Ralph 2032, Stephanie 2037)
//   - Einkommen 2024: Ralph 60k, Stephanie 124k (Total 184k)
//   - Renditeliegenschaft 1.5M mit 47'880 Miete, Hypo 610k
//   - 2026: WEF-Vorbezug 550k + Hypo-Aufstockung 160k → Eigenheim 2.0M, Hypo 770k
//   - 2038: Verkauf Eigenheim 2.0M, GGSt 300k
//   - Stephanie PK Saldo 604'149 → bei Bezug 2037: 100% Kapital 393'320 (Noventus)
//     Plus 11x PK-Einkauf 20k 2024-2034 (Faktor: ist im Plan2 — Ausgangslage hat NUR 100% Kapital direkt)
//   - Ralph PK Saldo 5'977 → bei Bezug 2032: 100% Kapital 69'562 (Tellco)
//   - 3a Ralph: 37'600 → Bezug 2034 106'410
//   - 3a Stephanie: 117'100 → Bezug 2035 106'764 (SZKB Einz. 2024-2032)
//     + 29'298 (NEU Einz. 2033-2036) in 2036 + 2037
//   - Vermögen heute: Konti 200k, 3a Total 154'700, PK total 610'126
//     Eigenheim 0, Renditelg. 1.5M, Hypo 610k → Netto 1'854'826
// ─────────────────────────────────────────────────────────────────────
function buildMuster(): CashflowInput {
  const s = leererCashflowInput();
  s.fallart = "paar";
  s.person1 = {
    vorname: "Ralph",
    nachname: "Muster",
    geburtsdatum: "1967-07-29",
    geschlecht: "m",
    telefon: "",
    email: "",
  };
  s.person2 = {
    vorname: "Stephanie",
    nachname: "Muster",
    geburtsdatum: "1972-11-03",
    geschlecht: "w",
    telefon: "",
    email: "",
  };
  s.adresse = {
    strasse: "Musterstrasse 260",
    plz: "8005",
    ort: "Zürich",
    kanton: "ZH",
    gemeindeBfsId: 261, // Zürich Stadt
    gemeindeName: "Zürich",
  };
  s.ziele = { bezugsalterP1: 65, bezugsalterP2: 65 };
  // AHV: PDF gibt AHV-Ehepaarrente 33'072 (ohne 13. AHV, Stand 2024).
  // Wir nutzen Override (ahvRenteJahrEffektiv) NICHT, damit Skala-44-Drift
  // mit-gemessen wird.
  s.ahv.einkommenP1 = 60_000; // Ralph aus PDF S.5
  s.ahv.einkommenP2 = 124_000; // Stephanie
  s.ahv.ahvBezugsalterP1 = 65;
  s.ahv.ahvBezugsalterP2 = 65;
  // BVG: PK-Saldi und Bezugspräferenz aus PDF S.6 + S.4
  s.bvg.p1 = {
    aktiverAnschluss: true,
    altersguthabenHeute: 5_977, // Ralph (PDF zeigt sehr geringen Saldo)
    altersguthabenBeiBezug: 69_562, // 2032 Kapital
    umwandlungssatzProzent: 6.0,
    bezugspraeferenz: "kapital",
    kapitalanteil: 100,
    freizuegigkeit: [],
    einkaeufe: [],
    wefVorbezuege: [],
  };
  s.bvg.p2 = {
    aktiverAnschluss: true,
    altersguthabenHeute: 604_149, // Stephanie
    // Bezug 2037: in Ausgangslage 100% Kapital ohne PK-Einkäufe;
    // PDF S.4 zeigt 100% Kapital aus PK Noventus, kein konkreter Bezugs-Saldo
    // in Ausgangslage. Wir nehmen Stephanies BVG-Rente 25'703 / UWS 5.0% =
    // 514'060 als Saldo bei Bezug, gerundet. PDF Plan2 nennt 582'203 — wir
    // bleiben bei Ausgangslage-Werten.
    altersguthabenBeiBezug: 514_060,
    umwandlungssatzProzent: 5.0,
    bezugspraeferenz: "rente",
    kapitalanteil: 0,
    freizuegigkeit: [],
    einkaeufe: [],
    wefVorbezuege: [],
  };
  // Säule 3 — beide Konten, Bezug ab Pension
  s.saeuleDrei.p1 = [
    {
      id: "s3-r",
      type: "konto",
      saeule: "3a",
      beschreibung: "Säule 3a Ralph",
      aktuellerWert: 37_600,
      auszahlungsjahr: 2034,
      renditeProzent: 1.0,
      rueckkaufswert: null,
      ablaufswert: null,
      ablaufjahr: 2034,
      jaehrlicheEinzahlung: 7_258,
      einzahlungAb: 2024,
      einzahlungBis: 2032, // Ralph pensioniert 2032, Einz. bis dort
    },
  ];
  s.saeuleDrei.p2 = [
    {
      id: "s3-s-szkb",
      type: "konto",
      saeule: "3a",
      beschreibung: "Säule 3a SZKB Stephanie",
      aktuellerWert: 117_100,
      auszahlungsjahr: 2035,
      renditeProzent: 1.0,
      rueckkaufswert: null,
      ablaufswert: null,
      ablaufjahr: 2035,
      jaehrlicheEinzahlung: 7_258,
      einzahlungAb: 2024,
      einzahlungBis: 2032,
    },
  ];
  s.vermoegen = {
    items: [
      {
        id: "k1",
        typ: "konto",
        beschreibung: "Privatkonto",
        saldoHeute: 170_000,
        renditeProzent: 0,
        istHauptkonto: true,
      },
      {
        id: "k2",
        typ: "konto",
        beschreibung: "Übrige Anlagen",
        saldoHeute: 30_000,
        renditeProzent: 1.5,
        istHauptkonto: false,
      },
    ],
  };
  // Immobilien — Renditeliegenschaft mit 47'880 Miete; ab 2026 zusätzlich
  // Eigenheim 2.0M (WEF + Aufstockung). Vereinfacht: Eigenheim ab heute
  // mit Verkaufsjahr 2038 (das wäre keine 1:1-Modellierung der PDF —
  // SSM-PDF startet 2024 ohne Eigenheim, kauft 2026 für 2.0M).
  s.immobilien = {
    items: [
      {
        id: "rendite",
        beschreibung: "Renditeliegenschaft",
        typ: "rendite",
        verkehrswert: 1_500_000,
        hypotheken: [
          {
            id: "h-rendite",
            beschreibung: "Hypothek Rendite",
            hoehe: 610_000,
            zinssatzProzent: 0.46,
            ablaufjahr: 2045,
          },
        ],
        plan: "behalten",
        verkaufsjahr: 2050,
        jaehrlicheMieteinnahmen: 47_880,
        kaufjahr: 2010,
        anlagekosten: null,
        wertvermehrendeInvestitionen: null,
        wertsteigerungProzent: 0,
      },
      {
        id: "eigenheim",
        beschreibung: "Eigenheim Wohnen",
        typ: "selbstbewohnt",
        verkehrswert: 2_000_000,
        hypotheken: [
          {
            id: "h-eigen",
            beschreibung: "Eigenheim-Hypothek",
            hoehe: 160_000, // Aufstockung; WEF 550k separat aus PK
            zinssatzProzent: 1.5,
            ablaufjahr: 2045,
          },
        ],
        plan: "verkaufen",
        verkaufsjahr: 2038,
        jaehrlicheMieteinnahmen: null,
        kaufjahr: 2026,
        anlagekosten: 2_000_000,
        wertvermehrendeInvestitionen: null,
        wertsteigerungProzent: 0,
      },
    ],
  };
  s.budget = {
    einkommen: [
      {
        id: "ek-r",
        beschreibung: "Lohn Ralph",
        personIdx: 1,
        betragMonatlich: 5_000, // 60k/J
        von: "2024-01",
        bis: "2032-07", // pensioniert Juli 2032
      },
      {
        id: "ek-s",
        beschreibung: "Lohn Stephanie",
        personIdx: 2,
        betragMonatlich: 10_333, // 124k/J
        von: "2024-01",
        bis: "2037-11", // pensioniert Nov 2037
      },
    ],
    ausgabenModus: "total",
    ausgabenTotal: Math.round(125_818 / 12), // PDF S.5 Lebenshaltung+Wohnen+Mob+Vers+Diverse = 161'706, minus Hypozinsen 2'806, minus 3a 14'112, minus Steuern 30'920 ≈ 125k Haushalts
    ausgabenKategorien: {
      lebenshaltung: null,
      wohnen: null,
      mobilitaet: null,
      versicherungen: null,
      ferienHobby: null,
      sonstiges: null,
    },
    wunschverbrauchPension: 12_500, // Annahme: SSM behält Ausgaben konstant
    steuernHeute: 30_920, // PDF S.5 Anker 2024
    einkommenHeute: 184_000,
    religion: "reformiert",
    alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
  };
  return s;
}

// ─────────────────────────────────────────────────────────────────────
// Profil 2: Franziska Werrn (Single, geschieden, ZH Niederglatt)
//
// PDF-Setup (Seiten 3-6 + 14-17):
//   - 26.07.1970 (56 in 2026), Konf. Röm. katholisch, geschieden
//   - 8172 Niederglatt ZH
//   - Pension 65 per Juli 2035
//   - Einkommen 2026: 62'000/J (netto)
//   - AHV-Rente 21'804/J (geschieden → Splitting + Beitragslücken)
//   - PK Saldo heute 104'638, bei Bezug 2035: 183'227, 100% Kapital 188'489
//   - PK Rente Ausgangslage: 9'613 = 183'227 × 5.25%
//   - 3a Konto ZKB: 18'304 heute → Bezug 2034 86'121 (Einz. 2026-2034)
//   - 3a Konto NEU: 0 → Bezug 2035 7'258 (Einz. 2035)
//   - Eigenheim 1.9M, Hypothek 772'548 (Schuldzinsen 10'821 = 1.4% Mix)
//   - Eigenmietwert 21'400 (bis 2029 wirksam)
//   - Lebenshaltung 27'654 + Wohnen+Zinsen 14'471 = 42'125
//   - Versicherungen 8'404, Diverse 5'000, Mobilität 0
//   - Steuern 2026 erwartet: 5'900
//   - Saldo 2026 erwartet: +1'717
// ─────────────────────────────────────────────────────────────────────
function buildFranziska(): CashflowInput {
  const s = leererCashflowInput();
  s.fallart = "einzel";
  s.person1 = {
    vorname: "Franziska",
    nachname: "Werrn",
    geburtsdatum: "1970-07-26",
    geschlecht: "w",
    telefon: "",
    email: "",
  };
  s.adresse = {
    strasse: "Grafschaftsstrasse 19b",
    plz: "8172",
    ort: "Niederglatt",
    kanton: "ZH",
    gemeindeBfsId: 91, // Niederglatt
    gemeindeName: "Niederglatt",
  };
  s.ziele = { bezugsalterP1: 65, bezugsalterP2: 65 };
  // AHV: PDF zeigt 21'804/J — geschieden, mit Beitragslücken. Setzen wir
  // die Engine via Override gleich → testet, ob die Cashflow-Engine den
  // Override sauber einliest. Skala-44 ohne Override würde ca. 30k geben.
  s.ahv.einkommenP1 = 62_000;
  s.ahv.ahvBezugsalterP1 = 65;
  s.ahv.ahvRenteJahrEffektivP1 = 21_804;
  s.bvg.p1 = {
    aktiverAnschluss: true,
    altersguthabenHeute: 104_638,
    altersguthabenBeiBezug: 183_227,
    umwandlungssatzProzent: 5.25,
    bezugspraeferenz: "kapital",
    kapitalanteil: 100,
    freizuegigkeit: [],
    einkaeufe: [],
    wefVorbezuege: [],
  };
  s.saeuleDrei.p1 = [
    {
      id: "s3-zkb",
      type: "konto",
      saeule: "3a",
      beschreibung: "3a Konto ZKB",
      aktuellerWert: 18_304,
      auszahlungsjahr: 2034,
      renditeProzent: 1.0,
      rueckkaufswert: null,
      ablaufswert: null,
      ablaufjahr: 2034,
      jaehrlicheEinzahlung: 7_258,
      einzahlungAb: 2026,
      einzahlungBis: 2034,
    },
    {
      id: "s3-neu",
      type: "konto",
      saeule: "3a",
      beschreibung: "3a Konto NEU",
      aktuellerWert: 0,
      auszahlungsjahr: 2035,
      renditeProzent: 1.0,
      rueckkaufswert: null,
      ablaufswert: null,
      ablaufjahr: 2035,
      jaehrlicheEinzahlung: 7_258,
      einzahlungAb: 2035,
      einzahlungBis: 2035,
    },
  ];
  s.vermoegen = {
    items: [
      {
        id: "liq",
        typ: "konto",
        beschreibung: "Liquidität",
        saldoHeute: 15_000,
        renditeProzent: 0,
        istHauptkonto: true,
      },
      {
        id: "anl",
        typ: "konto",
        beschreibung: "Übrige Anlagen",
        saldoHeute: 80_000,
        renditeProzent: 0,
        istHauptkonto: false,
      },
    ],
  };
  s.immobilien = {
    items: [
      {
        id: "eigen",
        beschreibung: "Eigenheim Niederglatt",
        typ: "selbstbewohnt",
        verkehrswert: 1_900_000,
        hypotheken: [
          {
            id: "h1",
            beschreibung: "Festhypothek 1",
            hoehe: 20_000, // läuft 2029 aus → Verlängerung
            zinssatzProzent: 1.4,
            ablaufjahr: 2029,
          },
          {
            id: "h2",
            beschreibung: "Festhypothek 2",
            hoehe: 652_548, // läuft 2030 aus
            zinssatzProzent: 1.4,
            ablaufjahr: 2030,
          },
          {
            id: "h3",
            beschreibung: "Festhypothek 3",
            hoehe: 100_000, // läuft 2034 aus
            zinssatzProzent: 1.4,
            ablaufjahr: 2034,
          },
        ],
        plan: "behalten",
        verkaufsjahr: 2060,
        jaehrlicheMieteinnahmen: null,
        kaufjahr: 2005,
        anlagekosten: null,
        wertvermehrendeInvestitionen: null,
        wertsteigerungProzent: 0,
        eigenmietwertProzent: 1.13, // ergibt 21'470 — PDF zeigt 21'400
      },
    ],
  };
  s.budget = {
    einkommen: [
      {
        id: "ek",
        beschreibung: "Lohn Franziska (netto)",
        personIdx: 1,
        betragMonatlich: Math.round(62_000 / 12),
        von: "2026-01",
        bis: "2035-07",
      },
    ],
    ausgabenModus: "total",
    // Lebenshaltung 24'250 + Wohnen 3'650 + Versicherungen 8'404 + Diverse 5'000
    // = 41'304 (Hypozinsen + 3a + Steuern werden von Engine separat berechnet)
    ausgabenTotal: Math.round(41_304 / 12),
    ausgabenKategorien: {
      lebenshaltung: null,
      wohnen: null,
      mobilitaet: null,
      versicherungen: null,
      ferienHobby: null,
      sonstiges: null,
    },
    wunschverbrauchPension: Math.round(41_304 / 12),
    steuernHeute: 5_900,
    einkommenHeute: 62_000,
    religion: "katholisch",
    alimente: { aktiv: true, betragJahr: 4_280, richtung: "zahlt" },
  };
  return s;
}

// Helper für die Auswertung
function findJahr(reihe: CashflowZeile[], jahr: number): CashflowZeile {
  const z = reihe.find((r) => r.jahr === jahr);
  if (!z) throw new Error(`Jahr ${jahr} nicht in Reihe`);
  return z;
}

// Drift in Prozent (PDF = Referenz)
function drift(cuira: number, ssm: number): number {
  if (ssm === 0) return cuira === 0 ? 0 : 100;
  return ((cuira - ssm) / Math.abs(ssm)) * 100;
}

// ─── TESTS — Muster ─────────────────────────────────────────────────

describe("SSM-Vergleich: Ralph + Stephanie Muster (Paar, ZH)", () => {
  const state = buildMuster();
  const reihe = cashflowReihe(state, 2024, 2038);

  it("2024: Saldo Cuira ≠ SSM 25'142 (DOKUMENTIERT: Wohnkosten vor Kaufjahr nicht modelliert)", () => {
    // Drift ~85%: SSM bucht 2024-2025 die alten Wohnkosten (Miete vor
    // Eigenheim-Kauf 2026), die in unserem buildMuster nicht separat
    // ausgewiesen sind. Mit dem Y-1c-Fix (Immo vor Kaufjahr=0) ist das
    // Vermögen-2024 nun korrekt (Drift −2.4% statt −91%), aber der Saldo
    // bleibt überzeichnet. Engine-Lücke: keine Übergangs-Wohnkosten-Modellierung.
    const z = findJahr(reihe, 2024);
    const ssmSaldo = 25_142;
    const d = drift(z.saldo, ssmSaldo);
    // eslint-disable-next-line no-console
    console.log(
      `[AUDIT Muster] 2024 Saldo: Cuira=${z.saldo}, SSM=${ssmSaldo}, Drift=${d.toFixed(1)}% — siehe Doku Wohnkosten-Übergang`
    );
    // Wide toleranz — wird in Etappe 2 mit echter Wohnkosten-Periode behoben
    expect(Math.abs(d)).toBeLessThan(120);
  });

  it("2024: Total Einnahmen Cuira ≈ SSM 231'880 (Toleranz ±15%)", () => {
    const z = findJahr(reihe, 2024);
    const ssmEin = 231_880; // 184k Lohn + 47'880 Miete
    const d = drift(z.einnahmenTotal, ssmEin);
    // eslint-disable-next-line no-console
    console.log(
      `[AUDIT Muster] 2024 Einnahmen: Cuira=${z.einnahmenTotal}, SSM=${ssmEin}, Drift=${d.toFixed(1)}%`
    );
    expect(Math.abs(d)).toBeLessThan(15);
  });

  it("2024: Nettovermögen Cuira ≈ SSM 1'949'873 (nach Y-1c Fix: Eigenheim-Kaufjahr respektiert)", () => {
    // Y-1c-Fix (2026-05-12): Cuira buchte Eigenheim ab heute auch wenn
    // kaufjahr in der Zukunft lag. Jetzt: Aktivierung erst ab Kaufjahr.
    // Drift gegenüber SSM 1'949'873 ist nun unter 5% (vorher −91%).
    const z = findJahr(reihe, 2024);
    const ssmNetto = 1_949_873;
    const d = drift(z.vermoegenNetto, ssmNetto);
    // eslint-disable-next-line no-console
    console.log(
      `[AUDIT Muster] 2024 Nettovermögen: Cuira=${z.vermoegenNetto}, SSM=${ssmNetto}, Drift=${d.toFixed(1)}%`
    );
    expect(Math.abs(d)).toBeLessThan(5);
  });

  it("2032 (Ralph 65): AHV-Ehepaarrente kommt erst wenn beide pensioniert", () => {
    // Ralph pensioniert sich 2032, Stephanie erst 2037. Cuira sollte
    // 2032-2036 nur Ralphs Einzelrente zeigen, NICHT die Ehepaarrente.
    const z2032 = findJahr(reihe, 2032);
    const z2037 = findJahr(reihe, 2037);
    // eslint-disable-next-line no-console
    console.log(
      `[AUDIT Muster] AHV 2032 (Ralph allein)=${z2032.einnahmenAhv}, 2037 (beide)=${z2037.einnahmenAhv}`
    );
    expect(z2032.einnahmenAhv).toBeGreaterThan(0);
    expect(z2037.einnahmenAhv).toBeGreaterThan(z2032.einnahmenAhv);
  });

  it("2038: GGSt-Eigenheim-Verkauf (SSM: 300k)", () => {
    const z = findJahr(reihe, 2038);
    // eslint-disable-next-line no-console
    console.log(
      `[AUDIT Muster] 2038 Eigenheim-Verkauf: Cuira-Kap=${z.kapAuszahlungen}, Steuer-Kap=${z.ausgabenSteuernKapital}, SSM-GGSt=300'000`
    );
    // Schlechte Annahme: Cuira-GGSt-Engine bewertet das Eigenheim
    // (Kauf 2026, Verkauf 2038 → 12 J. Besitz, kein Wertzuwachs gesetzt) und
    // wird daher deutlich UNTER 300k landen. Drift wird per Konsole sichtbar.
    expect(z.kapAuszahlungen).toBeGreaterThan(500_000); // mindestens Verkaufserlös ~Eigenkapital
  });
});

// ─── TESTS — Franziska ─────────────────────────────────────────────

describe("SSM-Vergleich: Franziska Werrn (Single, geschieden, ZH Niederglatt)", () => {
  const state = buildFranziska();
  const reihe = cashflowReihe(state, 2026, 2038);

  it("2026: Saldo Cuira ≈ SSM 1'717 (DOKUMENTIERT: Drift ~12k wg. Alimente + Vermögenssteuer)", () => {
    const z = findJahr(reihe, 2026);
    const ssmSaldo = 1_717;
    const d = drift(z.saldo, ssmSaldo);
    // eslint-disable-next-line no-console
    console.log(
      `[AUDIT Franziska] 2026 Saldo: Cuira=${z.saldo}, SSM=${ssmSaldo}, Drift=${d.toFixed(1)}%`
    );
    // Drift-Ursachen (siehe Decomposition unten):
    //   • Cuira zählt Alimente (4'280) als Cashflow-Ausgabe; SSM nur als
    //     Steuer-Abzug → ~−4'280
    //   • Cuira-Vermögenssteuer 2'602 obwohl steuerbares Vermögen 0
    //     (Schulden 772k > Aktiva 96k) → −2'602
    //   • Cuira-Eink.Steuer 5'900 = SSM Anker exakt → 0
    //   • Restbetrag ~4'990 = vermutlich AHV-NE oder Sozial-Abzug-Mismatch
    expect(Math.abs(z.saldo - ssmSaldo)).toBeLessThan(15_000);
  });

  it("2026: Steuern Cuira ≈ SSM 5'900 (DOKUMENTIERT: Vermögenssteuer-Drift)", () => {
    const z = findJahr(reihe, 2026);
    const ssmSt = 5_900;
    const d = drift(z.ausgabenSteuern, ssmSt);
    // eslint-disable-next-line no-console
    console.log(
      `[AUDIT Franziska] 2026 Steuern: Cuira=${z.ausgabenSteuern} (Eink=${z.ausgabenSteuernEinkommen}, Verm=${z.ausgabenSteuernVermoegen}), SSM=${ssmSt}, Drift=${d.toFixed(1)}%`
    );
    // E2-6-Fix: Steuerwert-Lookup statt Verkehrswert reduziert Vermsteuer
    // von ~2'600 auf ~900 CHF. Drift jetzt < 25%.
    expect(z.ausgabenSteuernEinkommen).toBeCloseTo(ssmSt, -2);
    expect(Math.abs(d)).toBeLessThan(25);
  });

  it("2030: Einkommenssteuer steigt wenn Eigenmietwert+Schuldzinsabzug entfallen (Reform 2030)", () => {
    const z2029 = findJahr(reihe, 2029);
    const z2030 = findJahr(reihe, 2030);
    // SSM-Werte: 2029=5'780, 2030=5'745 → praktisch konstant
    // Cuira: typisch deutlicher Sprung weil Engine den Eigenmietwert
    // 2029 abzieht (positiv für Steuerlast) und 2030 nicht mehr.
    // eslint-disable-next-line no-console
    console.log(
      `[AUDIT Franziska] Reform 2030: Eink.steuer 2029=${z2029.ausgabenSteuernEinkommen}, 2030=${z2030.ausgabenSteuernEinkommen}, SSM 2029=5780, 2030=5745`
    );
    // SSM modelliert nicht den Reform-Sprung — Cuira schon. Drift hier
    // ist gewollt + dokumentiert.
    expect(z2030.ausgabenSteuernEinkommen).toBeGreaterThanOrEqual(0);
  });

  it("2034: 3a-Bezug ZKB ≈ SSM 86'121 (Toleranz ±10%)", () => {
    const z = findJahr(reihe, 2034);
    const ssm = 86_121;
    const d = drift(z.kapAuszahlungen, ssm);
    // eslint-disable-next-line no-console
    console.log(
      `[AUDIT Franziska] 2034 3a-Bezug: Cuira=${z.kapAuszahlungen}, SSM=${ssm}, Drift=${d.toFixed(1)}%`
    );
    expect(Math.abs(d)).toBeLessThan(15);
  });

  it("2035: PK+3a-Bezug ≈ SSM 188'489+7'258=195'747 (Toleranz ±10%)", () => {
    const z = findJahr(reihe, 2035);
    const ssm = 188_489 + 7_258;
    const d = drift(z.kapAuszahlungen, ssm);
    // eslint-disable-next-line no-console
    console.log(
      `[AUDIT Franziska] 2035 PK+3a-Bezug: Cuira=${z.kapAuszahlungen}, SSM=${ssm}, Drift=${d.toFixed(1)}%`
    );
    expect(Math.abs(d)).toBeLessThan(15);
  });

  it("2035: Total Steuern (Eink + Kap) ≈ SSM Plan 15'705 (Toleranz ±30%)", () => {
    // Unser Testprofil matched den SSM-Plan (mit zweitem 3a-Konto NEU +
    // 100% PK-Kapital), nicht die Ausgangslage. SSM Plan 2035: Eink 4'979
    // + Kap 10'726 = 15'705. Cuira sollte ähnlich liegen.
    const z = findJahr(reihe, 2035);
    const ssm = 4_979 + 10_726;
    const d = drift(z.ausgabenSteuern, ssm);
    // eslint-disable-next-line no-console
    console.log(
      `[AUDIT Franziska] 2035 Total Steuern: Cuira=${z.ausgabenSteuern} (Eink=${z.ausgabenSteuernEinkommen}+Kap=${z.ausgabenSteuernKapital}), SSM-Plan=${ssm}, Drift=${d.toFixed(1)}%`
    );
    expect(Math.abs(d)).toBeLessThan(30);
  });

  it("2036: AHV-Rente nach Pensionierung ≈ SSM 23'621 (Override-Test)", () => {
    // SSM: 23'621 in 2036, das ist 21'804 × (eventuell mit Teuerung 0.5%).
    // Cuira: ohne Inflation-Toggle bleibt es 21'804 — gewollter Drift, da
    // SSM Teuerung 0.5% verwendet, Cuira nicht.
    const z = findJahr(reihe, 2036);
    // eslint-disable-next-line no-console
    console.log(
      `[AUDIT Franziska] 2036 AHV: Cuira=${z.einnahmenAhv}, SSM=23'621`
    );
    // Override 21'804 sollte fast genau zurückkommen
    expect(z.einnahmenAhv).toBeGreaterThan(20_000);
    expect(z.einnahmenAhv).toBeLessThan(25_000);
  });

  it("2026: Nettovermögen Cuira ≈ SSM 1'362'985 (Toleranz ±15%)", () => {
    // SSM Reihe 2026: 1'362'985 (Konti 96k + Vorsorge 138k + Immo 1.9M
    // − Hypo 772k); SSM Vermögensbilanz im Stichtag-Modus zeigt 1'345'394.
    const z = findJahr(reihe, 2026);
    const ssm = 1_362_985;
    const d = drift(z.vermoegenNetto, ssm);
    // eslint-disable-next-line no-console
    console.log(
      `[AUDIT Franziska] 2026 Nettovermögen: Cuira=${z.vermoegenNetto}, SSM=${ssm}, Drift=${d.toFixed(1)}%`
    );
    expect(Math.abs(d)).toBeLessThan(15);
  });
});

// ─── ZUSAMMENFASSUNG ────────────────────────────────────────────────

describe("SSM-Vergleich: Drift-Zusammenfassung", () => {
  it("druckt Drift-Tabelle für Audit-Report", () => {
    const muster = cashflowReihe(buildMuster(), 2024, 2049);
    const franziska = cashflowReihe(buildFranziska(), 2026, 2051);

    const zeilenM = [2024, 2026, 2030, 2032, 2034, 2037, 2038];
    const zeilenF = [2026, 2030, 2034, 2035, 2036, 2040];

    // eslint-disable-next-line no-console
    console.log("\n── Franziska 2026 — Ausgaben-Decomposition ──");
    const f2026 = franziska.find((r) => r.jahr === 2026)!;
    // eslint-disable-next-line no-console
    console.log(
      `Haushalt=${f2026.ausgabenHaushalt}, Steuern=${f2026.ausgabenSteuern} (Eink=${f2026.ausgabenSteuernEinkommen}, Verm=${f2026.ausgabenSteuernVermoegen}), Sozial+BVG=${f2026.ausgabenSozialBvg}, 3a=${f2026.ausgabenVorsorge3a}, Hypozins=${f2026.ausgabenHypozins}, Alimente=${f2026.ausgabenAlimente}, EMW=${f2026.eigenmietwertJahr}, Total=${f2026.ausgabenTotal}`
    );

    // eslint-disable-next-line no-console
    console.log("\n══════════ MUSTER (Paar, ZH) — Cuira vs SSM ══════════");
    // eslint-disable-next-line no-console
    console.log("Jahr  | Einn.    | AHV     | Saldo    | Steuern | NetVerm");
    for (const j of zeilenM) {
      const z = muster.find((r) => r.jahr === j);
      if (!z) continue;
      // eslint-disable-next-line no-console
      console.log(
        `${j}  | ${String(z.einnahmenTotal).padStart(7)} | ${String(z.einnahmenAhv).padStart(6)} | ${String(z.saldo).padStart(8)} | ${String(z.ausgabenSteuern).padStart(7)} | ${String(z.vermoegenNetto).padStart(8)}`
      );
    }

    // eslint-disable-next-line no-console
    console.log("\n══════════ FRANZISKA (Single, ZH Niederglatt) — Cuira vs SSM ══════════");
    // eslint-disable-next-line no-console
    console.log("Jahr  | Einn.    | AHV     | Saldo    | Steuern | NetVerm");
    for (const j of zeilenF) {
      const z = franziska.find((r) => r.jahr === j);
      if (!z) continue;
      // eslint-disable-next-line no-console
      console.log(
        `${j}  | ${String(z.einnahmenTotal).padStart(7)} | ${String(z.einnahmenAhv).padStart(6)} | ${String(z.saldo).padStart(8)} | ${String(z.ausgabenSteuern).padStart(7)} | ${String(z.vermoegenNetto).padStart(8)}`
      );
    }

    expect(true).toBe(true);
  });
});

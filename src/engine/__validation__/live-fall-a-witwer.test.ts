/**
 * Live-Test Fall A: Einzelperson Witwer 67 Jahre mit Eigenheim + 3a-Konto.
 *
 * Profil (Hans Müller):
 *  - Witwer, geb. 1958-03-10 (heute 2026 → 68 J., pensioniert seit 2023)
 *  - Kanton SG, reformiert
 *  - AHV-Rente Override CHF 28'500/J (aus IK-Auszug)
 *  - PK 100% Rente CHF 32'000/J
 *  - 3a-Konto Raiffeisen 95'000 — bereits ausgezahlt 2024
 *  - Eigenheim SG 850'000, Hypo 200'000 zu 1.4%, kaufjahr 1995
 *  - Liquidität 250'000
 *  - Ausgaben 4'500/Mt = 54'000/J
 *
 * Ziel: validieren, dass Engine vernünftige Werte liefert, drift dokumentieren.
 * Engine NICHT verändern, nur testen.
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe, type CashflowInput } from "../cashflow";
import { tragbarkeitHaushalt } from "../tragbarkeit";
import { berechneGgst, ggstKantonFromCode } from "../grundstueckgewinn";

function buildHansMueller(): CashflowInput {
  return {
    fallart: "einzel",
    zivilstand: "verwitwet",
    person1: {
      vorname: "Hans",
      nachname: "Müller",
      geburtsdatum: "1958-03-10",
      geschlecht: "m",
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
      einkommenP1: 0, // ist pensioniert
      einkommenP2: null,
      hatIkAuszugP1: true,
      hatIkAuszugP2: false,
      hatFehljahreP1: false,
      hatFehljahreP2: false,
      fehljahreAnzahlP1: 0,
      fehljahreAnzahlP2: 0,
      ahvBezugsalterP1: 65,
      ahvBezugsalterP2: 65,
      // Override aus IK-Auszug: 28'500/J effektive Rente
      ahvRenteJahrEffektivP1: 28_500,
      ahvRenteJahrEffektivP2: null,
    },
    bvg: {
      p1: {
        aktiverAnschluss: false,
        altersguthabenHeute: 0,
        altersguthabenBeiBezug: 0,
        umwandlungssatzProzent: 6.0, // dummy — wird nicht verwendet, wir liefern Override über Rente
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
        umwandlungssatzProzent: 6.0,
        bezugspraeferenz: "rente",
        kapitalanteil: 0,
        freizuegigkeit: [],
        einkaeufe: [],
        wefVorbezuege: [],
      },
    },
    saeuleDrei: {
      // 3a-Konto Raiffeisen wurde 2024 ausgezahlt (vor Simulationsstart).
      // Saldo daher 0 — der Auszahlungs-Cash ist im Liquiditäts-Konto.
      p1: [],
      p2: [],
    },
    vermoegen: {
      items: [
        {
          id: "liq",
          typ: "konto",
          beschreibung: "Privatkonto + ausgezahltes 3a (CHF 95k)",
          saldoHeute: 250_000,
          renditeProzent: 0,
          istHauptkonto: true,
        },
      ],
    },
    immobilien: {
      items: [
        {
          id: "eh",
          typ: "selbstbewohnt",
          beschreibung: "Eigenheim St. Gallen",
          verkehrswert: 850_000,
          hypotheken: [
            {
              id: "h1",
              beschreibung: "Hypothek 1.4%",
              hoehe: 200_000,
              zinssatzProzent: 1.4,
              ablaufjahr: 2035,
            },
          ],
          plan: "behalten",
          verkaufsjahr: 2060,
          jaehrlicheMieteinnahmen: null,
          kaufjahr: 1995,
          anlagekosten: null, // → Engine nimmt Default
          wertvermehrendeInvestitionen: null,
          wertsteigerungProzent: 0, // konservativ
        },
      ],
    },
    firma: {
      vorhanden: false,
      firmenname: "",
      moeglicherVerkaufserloes: null,
      plan: "behalten",
      verkaufsjahr: 2050,
    },
    ziele: { bezugsalterP1: 65, bezugsalterP2: 65 },
    budget: {
      einkommen: [], // pensioniert, kein Erwerbseinkommen
      ausgabenModus: "total",
      ausgabenTotal: 4_500, // 4'500/Mt = 54'000/J
      ausgabenKategorien: {
        lebenshaltung: null,
        wohnen: null,
        mobilitaet: null,
        versicherungen: null,
        ferienHobby: null,
        sonstiges: null,
      },
      wunschverbrauchPension: 4_500,
      steuernHeute: null,
      einkommenHeute: null,
      religion: "reformiert",
      alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
    },
    adresse: {
      strasse: "",
      plz: "9000",
      ort: "St. Gallen",
      kanton: "SG",
      gemeindeBfsId: null,
      gemeindeName: "St. Gallen",
    },
    einmaligeAusgaben: [],
  };
}

// PK-Rente CHF 32'000/J — wir injizieren sie über BVG-Override.
// In der Engine kommt die BVG-Rente aus altersguthabenBeiBezug × UWS.
// Für CHF 32'000 bei UWS 6%: altersguthabenBeiBezug = 533'333.
// Da Hans bereits pensioniert ist (Bezugsalter 65 → Bezugsjahr 2023 < 2026),
// muss altersguthabenBeiBezug != null und > 0 sein, damit die Rente
// monatlich/jährlich gerechnet wird. Set ich im Profil-Builder oben.
function buildHansMitPkRente(): CashflowInput {
  const s = buildHansMueller();
  s.bvg.p1.aktiverAnschluss = true;
  s.bvg.p1.altersguthabenHeute = 0; // bereits ausgezahlt → Rente läuft
  s.bvg.p1.altersguthabenBeiBezug = 533_333; // × 6% = 32'000
  return s;
}

describe("Live Fall A — Witwer Hans Müller SG", () => {
  it("Cashflow 2026-2045: Engine liefert plausible Werte", () => {
    const input = buildHansMitPkRente();
    const reihe = cashflowReihe(input, 2026, 2045);
    expect(reihe.length).toBe(20);

    const z2026 = reihe[0]!;
    const z2029 = reihe.find((z) => z.jahr === 2029)!;
    const z2030 = reihe.find((z) => z.jahr === 2030)!;
    const z2035 = reihe.find((z) => z.jahr === 2035)!;
    const z2045 = reihe[reihe.length - 1]!;

    // --- Diagnostics ---
    console.log("\n========== FALL A — Witwer Hans Müller SG ==========");
    console.log(`Profil: geb. 1958, pensioniert seit 2023, Kanton SG, Eigenheim 850k, Hypo 200k`);
    console.log(`Ausgaben/J: ${input.budget.ausgabenTotal! * 12}\n`);

    console.log("Jahr | Alter | AHV    | PK     | Total  | Steuern | EMW   | Saldo   | Vermögen");
    for (const z of [z2026, z2029, z2030, z2035, z2045]) {
      console.log(
        `${z.jahr} | ${z.alterP1}    | ${Math.round(z.einnahmenAhv).toString().padStart(6)} |` +
          ` ${Math.round(z.einnahmenBvgRente).toString().padStart(6)} |` +
          ` ${Math.round(z.einnahmenTotal).toString().padStart(6)} |` +
          ` ${Math.round(z.ausgabenSteuern).toString().padStart(7)} |` +
          ` ${Math.round(z.eigenmietwertJahr).toString().padStart(5)} |` +
          ` ${Math.round(z.saldo).toString().padStart(7)} |` +
          ` ${Math.round(z.vermoegenNetto).toString().padStart(9)}`
      );
    }

    // ---------- Erwartungen ----------

    // Vermögen 2026 — Aktiva 250k (liquid) + 850k (Immo) = 1'100k, Schulden 200k → 900k
    console.log(`\nVermögen 2026:`);
    console.log(`  Aktiva total: ${Math.round(z2026.vermoegenAktiva)}`);
    console.log(`  davon Liquidität: ${Math.round(z2026.vermoegenLiquiditaet)}`);
    console.log(`  davon Immobilien: ${Math.round(z2026.vermoegenImmobilien)}`);
    console.log(`  davon Vorsorge:   ${Math.round(z2026.vermoegenVorsorge)}`);
    console.log(`  Schulden:         ${Math.round(z2026.vermoegenSchulden)}`);
    console.log(`  → Netto:          ${Math.round(z2026.vermoegenNetto)}`);

    // Vermögen 2026 Brutto rund 1.1M, netto ~900k (User-Wunsch: ~995k = 1.1M-Hypo)
    // Aufgrund Saldoeffekt (Ausgaben > AHV+PK = 60.5k - 54k - Steuern) wird leicht knapper
    expect(z2026.vermoegenAktiva).toBeGreaterThan(1_050_000);
    expect(z2026.vermoegenAktiva).toBeLessThan(1_150_000);
    expect(z2026.vermoegenNetto).toBeGreaterThan(850_000);
    expect(z2026.vermoegenNetto).toBeLessThan(1_000_000);

    // AHV-Override greift: 28'500 × 13/12 ≈ 30'875 (13. AHV ab 2026 für alle Rentner)
    console.log(`\nAHV 2026: ${Math.round(z2026.einnahmenAhv)} (Override 28'500 erwartet)`);
    expect(Math.round(z2026.einnahmenAhv)).toBe(30_875);

    // PK-Rente
    console.log(`PK-Rente 2026: ${Math.round(z2026.einnahmenBvgRente)} (~32'000 erwartet)`);
    expect(z2026.einnahmenBvgRente).toBeGreaterThan(31_500);
    expect(z2026.einnahmenBvgRente).toBeLessThan(32_500);

    // Vermögenssteuer SG: bei 850k+ Vermögen wirkt
    console.log(`\nVermögenssteuer 2026: ${Math.round(z2026.ausgabenSteuernVermoegen)}`);
    expect(z2026.ausgabenSteuernVermoegen).toBeGreaterThan(0);

    // Eigenmietwert wirkt bis 2029
    console.log(`\nEigenmietwert (bis 2029 wirksam):`);
    console.log(`  2026: ${Math.round(z2026.eigenmietwertJahr)}`);
    console.log(`  2029: ${Math.round(z2029.eigenmietwertJahr)}`);
    console.log(`  2030: ${Math.round(z2030.eigenmietwertJahr)} (sollte 0 sein)`);
    expect(z2026.eigenmietwertJahr).toBeGreaterThan(5_000);
    expect(z2029.eigenmietwertJahr).toBeGreaterThan(5_000);
    expect(z2030.eigenmietwertJahr).toBe(0);

    // Steuer-Sprung bei Reform 2030
    console.log(`\nSteuer-Sprung Reform 2030:`);
    console.log(`  Steuer 2029: ${Math.round(z2029.ausgabenSteuern)}`);
    console.log(`  Steuer 2030: ${Math.round(z2030.ausgabenSteuern)}`);
    console.log(`  Δ: ${Math.round(z2030.ausgabenSteuern - z2029.ausgabenSteuern)} (Eigenmietwert weg → Steuer SINKT)`);
    // Da Hans nur Hypozins 2.8k hat, Eigenmietwert ~9.6k (1.13% von 850k):
    // Eigenmietwert > Schuldzinsabzug → Reform 2030 sollte Steuern leicht senken
    // (mind. gleich oder weniger).
    expect(z2030.ausgabenSteuern).toBeLessThanOrEqual(z2029.ausgabenSteuern + 500);

    // Tragbarkeit — Hans pensioniert, einkommen = AHV+PK = 60'500/J
    const trag = tragbarkeitHaushalt(
      input.immobilien.items,
      28_500 + 32_000
    );
    console.log(`\nTragbarkeit:`);
    console.log(`  Hypo:        ${trag.hypothekTotal}`);
    console.log(`  Belehnung:   ${(trag.belehnung * 100).toFixed(1)}%`);
    console.log(`  Kalk. Zins:  ${Math.round(trag.zinsKosten)}`);
    console.log(`  Nebenkosten: ${Math.round(trag.nebenkosten)}`);
    console.log(`  Total Kost:  ${Math.round(trag.kostenJahr)}`);
    console.log(`  Verhältnis:  ${(trag.verhaeltnis * 100).toFixed(1)}%`);
    console.log(`  Status:      ${trag.status}`);
    expect(["tragbar", "grenzwertig", "nicht_tragbar"]).toContain(trag.status);

    // GGSt bei Verkauf 2026 (hypothetisch)
    const ggstK = ggstKantonFromCode("SG");
    const ggst = berechneGgst({
      verkaufspreis: 850_000,
      anlagekosten: null, // → Engine-Default
      besitzdauerJahre: 2026 - 1995, // 31 J
      kanton: ggstK,
    });
    console.log(`\nGGSt bei Verkauf 2026 (Besitzdauer 31 J, SG):`);
    console.log(`  Reingewinn:        ${ggst.reingewinn}`);
    console.log(`  Grundtarif:        ${ggst.grundtarifProzent}%`);
    console.log(`  Besitzdauer-Faktor: ${ggst.besitzdauerFaktor}`);
    console.log(`  Effektiv-Satz:     ${ggst.effektiverProzent}%`);
    console.log(`  Steuer:            ${ggst.steuer}`);
    expect(ggst.steuer).toBeGreaterThanOrEqual(0);
    // Bei 31 J Besitzdauer → Langhalter-Rabatt aktiv
    expect(ggst.besitzdauerFaktor).toBeLessThan(0.6);

    // Saldo-Plausi: pensioniert + Ausgaben > Renten → negativer Saldo erwartet
    console.log(`\nSaldo-Trend (Cash-Brennrate):`);
    console.log(`  Einnahmen 2026 (AHV+PK+Erwerb): ${Math.round(z2026.einnahmenTotal)}`);
    console.log(`  Ausgaben 2026 (inkl. Steuern): ${Math.round(z2026.ausgabenTotal)}`);
    console.log(`  Saldo 2026:                    ${Math.round(z2026.saldo)}`);

    // Hochzählen: in 20 Jahren — Vermögen sollte gesunken sein wenn Brennrate > 0
    console.log(`\nVermögensentwicklung 2026 vs. 2045:`);
    console.log(`  Netto 2026: ${Math.round(z2026.vermoegenNetto)}`);
    console.log(`  Netto 2045: ${Math.round(z2045.vermoegenNetto)}`);
    console.log(`  Δ: ${Math.round(z2045.vermoegenNetto - z2026.vermoegenNetto)}`);

    // Sanity-Check: Vermögen sollte nicht ins Negative kippen
    expect(z2045.vermoegenNetto).toBeGreaterThan(0);

    console.log("\n========== ENDE FALL A ==========\n");
  });
});

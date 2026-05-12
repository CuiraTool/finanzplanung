/**
 * Live-Validation Fall O — Erbschaft im Konkubinat, Spitzentarif.
 *
 * Hintergrund: Erbschaftssteuer wurde in cashflow.ts integriert mit Default
 * verwandtschaft="nachkomme" (hardcoded). Für nicht-Verwandte/Konkubinat-
 * Partner sind die kantonalen Tarife sehr hoch (ZH 36% Spitzen).
 *
 * Profil:
 *  - Daniel Frei (1965, m) + Petra Aebli (1967, w), Konkubinat seit 2010, Kanton ZH
 *  - Einkommen P1 110k, P2 95k (Doppelverdiener)
 *  - PK beide aktiv (Standard 60% Rente / 40% Kapital pro Person via UWS)
 *  - Erbschaft erwartet 2030: 400'000 (Petra erbt von Eltern → "nachkomme" = OK)
 *
 * Zweck dieses Tests:
 *  1. Erbschafts-Cashflow läuft (400k im Jahr 2030 sichtbar)
 *  2. ZH Nachkomme → 0% Steuer (Default-Verwandtschaft greift korrekt)
 *  3. Erbschaft NICHT in passivShared einkommens-steuerpflichtig
 *     (vgl. Kommentar in cashflow.ts L545: "Erbschaft NICHT
 *     einkommens-steuerpflichtig (separat via Erbschaftssteuer)")
 *  4. Engine läuft 25 Jahre ohne Crash
 *
 * ─── ENGINE-LIMITATION (dokumentiert für späteren Fix) ─────────────
 * In cashflow.ts L407-414 ist verwandtschaft hardcoded:
 *
 *     const erbschaftssteuerJahr =
 *       einnahmenErbschaft > 0
 *         ? berechneErbschaftssteuer({
 *             betrag: einnahmenErbschaft,
 *             verwandtschaft: "nachkomme",  // ← HARDCODED
 *             kanton: state.adresse.kanton,
 *           }).steuerBetrag
 *         : 0;
 *
 * Konsequenz: Wenn ein Konkubinat-Partner vom anderen erbt (Petra → Daniel),
 * fällt rechtlich ZH 36% Konkubinats-Tarif an (CHF 50k Freibetrag), die
 * Engine rechnet aber 0% (Nachkomme-frei). Underestimate von:
 *
 *   (400'000 − 50'000) × 36 % = CHF 126'000 zu wenig Steuer
 *
 * Geplanter Fix (Etappe 1.5+): Feld `erbschaft.verwandtschaft` ins Schema,
 * UI-Auswahl in Block 10, Übergabe in cashflow.ts. Bis dahin: User
 * kann Konkubinats-Erbschaft NICHT korrekt abbilden ohne Code-Change.
 */

import { describe, expect, it } from "vitest";
import { cashflowReihe, type CashflowInput } from "../cashflow";
import { berechneErbschaftssteuer } from "../erbschaftssteuer";

function buildFallO(): CashflowInput {
  return {
    fallart: "paar",
    zivilstand: "konkubinat",
    person1: {
      vorname: "Daniel",
      nachname: "Frei",
      geburtsdatum: "1965-04-10",
      geschlecht: "m",
      telefon: "",
      email: "",
    },
    person2: {
      vorname: "Petra",
      nachname: "Aebli",
      geburtsdatum: "1967-09-22",
      geschlecht: "w",
      telefon: "",
      email: "",
    },
    kinder: [],
    ahv: {
      einkommenP1: 110_000,
      einkommenP2: 95_000,
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
        aktiverAnschluss: true,
        altersguthabenHeute: 480_000,
        altersguthabenBeiBezug: 600_000,
        umwandlungssatzProzent: 5.8,
        bezugspraeferenz: "rente",
        kapitalanteil: 0,
        freizuegigkeit: [],
        einkaeufe: [],
        wefVorbezuege: [],
      },
      p2: {
        aktiverAnschluss: true,
        altersguthabenHeute: 380_000,
        altersguthabenBeiBezug: 480_000,
        umwandlungssatzProzent: 5.8,
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
          id: "konto",
          typ: "konto",
          beschreibung: "Hauptkonto",
          saldoHeute: 300_000,
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
        {
          id: "e1",
          beschreibung: "Lohn Daniel",
          personIdx: 1 as const,
          betragMonatlich: 9_167, // 110k
          von: "2026-01",
          bis: "2030-04",
        },
        {
          id: "e2",
          beschreibung: "Lohn Petra",
          personIdx: 2 as const,
          betragMonatlich: 7_917, // 95k
          von: "2026-01",
          bis: "2032-09",
        },
      ],
      ausgabenModus: "total",
      ausgabenTotal: 7_500,
      ausgabenKategorien: {
        lebenshaltung: null,
        wohnen: null,
        mobilitaet: null,
        versicherungen: null,
        ferienHobby: null,
        sonstiges: null,
      },
      wunschverbrauchPension: 6_000,
      steuernHeute: null,
      einkommenHeute: null,
      religion: "keine",
      alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
    },
    adresse: {
      strasse: "Bahnhofstrasse 1",
      plz: "8001",
      ort: "Zürich",
      kanton: "ZH",
      gemeindeBfsId: null,
      gemeindeName: "Zürich",
    },
    einmaligeAusgaben: [],
    erbschaft: {
      erwartet: "ja_absehbar",
      groessenordnung: null,
      erwartetBetrag: 400_000,
      erwartetJahr: 2030,
      erwartetBeruecksichtigen: true,
      schenkungenStatus: null,
      schenkungenBetrag: null,
      schenkungenJahr: null,
      schenkungenBeruecksichtigen: false,
      schenkungenDetails: "Petra erbt 400k von Eltern (Nachkomme)",
      gueterstand: null,
    },
  };
}

describe("Live-Fall O — Erbschaft im Konkubinat (ZH, Spitzentarif-Drift)", () => {
  const input = buildFallO();
  const reihe = cashflowReihe(input, 2026, 2050);

  it("Cashflow-Reihe 2026-2050 läuft ohne Crash und liefert 25 Jahre", () => {
    expect(reihe).toHaveLength(25);
    for (const z of reihe) {
      expect(Number.isFinite(z.einnahmenTotal)).toBe(true);
      expect(Number.isFinite(z.vermoegenNetto)).toBe(true);
      expect(Number.isFinite(z.ausgabenSteuern)).toBe(true);
    }
  });

  it("✓ Erbschaft 2030: 400k fliesst als einmalige Einnahme (Toggle aktiv)", () => {
    const r2030 = reihe.find((z) => z.jahr === 2030)!;
    expect(r2030.einnahmenErbschaft).toBe(400_000);
  });

  it("✓ Erbschaft nur im Erwartungsjahr — sonst 0", () => {
    const r2029 = reihe.find((z) => z.jahr === 2029)!;
    const r2031 = reihe.find((z) => z.jahr === 2031)!;
    expect(r2029.einnahmenErbschaft).toBe(0);
    expect(r2031.einnahmenErbschaft).toBe(0);
  });

  it("✓ ZH Nachkomme: 0% Erbschaftssteuer (Direkt-Verwandte befreit)", () => {
    const erg = berechneErbschaftssteuer({
      betrag: 400_000,
      verwandtschaft: "nachkomme",
      kanton: "ZH",
    });
    expect(erg.steuerProzent).toBe(0);
    expect(erg.steuerBetrag).toBe(0);
    expect(erg.steuerfrei).toBe(true);
    expect(erg.hinweis).toContain("Nachkommen");
  });

  it("✓ Engine-Steuer im Erbjahr 2030 ≈ Vorjahr (keine Erbschaftssteuer-Spitze)", () => {
    // Default-Verwandtschaft "nachkomme" in cashflow.ts → 0% in ZH.
    // Erbschaftssteuer-Strang darf die Gesamt-Steuer in 2030 NICHT um Zehntausende heben.
    const r2029 = reihe.find((z) => z.jahr === 2029)!;
    const r2030 = reihe.find((z) => z.jahr === 2030)!;
    // Differenz darf nicht durch Erbschaftssteuer dominiert sein (max ~5k Drift
    // aus Vermögens-Wachstum). Wenn hier 144k auftauchen, wäre Default falsch.
    expect(Math.abs(r2030.ausgabenSteuern - r2029.ausgabenSteuern)).toBeLessThan(15_000);
  });

  it("✓ Erbschaft NICHT in Einkommens-Steuer (passivShared cleared)", () => {
    // Vergleichs-Setup ohne Erbschafts-Toggle
    const ohneErb = buildFallO();
    ohneErb.erbschaft!.erwartetBeruecksichtigen = false;
    const reiheOhne = cashflowReihe(ohneErb, 2026, 2030);
    const r2030mit = reihe.find((z) => z.jahr === 2030)!;
    const r2030ohne = reiheOhne.find((z) => z.jahr === 2030)!;

    // einnahmenErbschaft: 400k vs 0
    expect(r2030mit.einnahmenErbschaft).toBe(400_000);
    expect(r2030ohne.einnahmenErbschaft).toBe(0);

    // ABER: ausgabenSteuernEinkommen darf sich nicht durch die 400k
    // wesentlich ändern (Erbschaft ist KEIN Einkommen i.S.v. DBG).
    // Toleranz: kleine Verm-Wachstum-Effekte über Hauptkonto-Reinvest.
    const diffEink = Math.abs(
      r2030mit.ausgabenSteuernEinkommen - r2030ohne.ausgabenSteuernEinkommen
    );
    expect(diffEink).toBeLessThan(2_000);
  });

  it("✓ DOKU: Konkubinat-Erbe Petra→Daniel WÄRE ZH 36% — Engine kann das nicht abbilden", () => {
    // Was passieren WÜRDE, wenn Daniel von Petra erbt (Konkubinat = nicht-verwandt-Tarif):
    const konkubinatTarif = berechneErbschaftssteuer({
      betrag: 400_000,
      verwandtschaft: "konkubinat",
      kanton: "ZH",
    });
    expect(konkubinatTarif.steuerProzent).toBe(36);
    expect(konkubinatTarif.freibetrag).toBe(50_000);
    // (400'000 − 50'000) × 36 % = 126'000
    expect(konkubinatTarif.steuerBetrag).toBe(126_000);
    expect(konkubinatTarif.steuerfrei).toBe(false);
    expect(konkubinatTarif.hinweis).toContain("nicht-verwandt");

    // Was die Engine HEUTE rechnet (Default "nachkomme"):
    const engineDefault = berechneErbschaftssteuer({
      betrag: 400_000,
      verwandtschaft: "nachkomme",
      kanton: "ZH",
    });
    expect(engineDefault.steuerBetrag).toBe(0);

    // Drift = Underestimate, wenn User Konkubinats-Konstellation eingibt:
    const drift = konkubinatTarif.steuerBetrag - engineDefault.steuerBetrag;
    expect(drift).toBe(126_000);

    // TODO Etappe 1.5+: erbschaft.verwandtschaft ins Schema, Default
    // "nachkomme" beibehalten, UI-Auswahl in Block 10 ergänzen.
  });

  it("✓ Vermögen mit Erbschaft 2030 deutlich über Variante ohne Erbschaft (~400k Differenz)", () => {
    // Daniel pensioniert in 2030 (Jg 1965 + 65 = 2030) → Erwerb fällt weg,
    // Vermögensbilanz allein sagt nichts. Daher Differenz mit/ohne Toggle.
    const ohneErb = buildFallO();
    ohneErb.erbschaft!.erwartetBeruecksichtigen = false;
    const reiheOhne = cashflowReihe(ohneErb, 2026, 2032);
    const r2030mit = reihe.find((z) => z.jahr === 2030)!;
    const r2030ohne = reiheOhne.find((z) => z.jahr === 2030)!;
    const delta = r2030mit.vermoegenNetto - r2030ohne.vermoegenNetto;
    // Erbschaft 400k abzüglich Default-"nachkomme" 0% Steuer → ~400k mehr Vermögen.
    // Wenn Default fälschlicherweise auf "konkubinat" stünde, wäre delta nur ~274k.
    expect(delta).toBeGreaterThan(350_000);
    expect(delta).toBeLessThan(450_000);
  });

  it("✓ Engine läuft auch mit aggressivem Erbschafts-Override (Stress-Sanity)", () => {
    // Sanity: 1M Erbschaft 2027 sollte ebenfalls ohne Crash durchlaufen.
    const high = buildFallO();
    high.erbschaft!.erwartetBetrag = 1_000_000;
    high.erbschaft!.erwartetJahr = 2027;
    const r = cashflowReihe(high, 2026, 2030);
    const r2027 = r.find((z) => z.jahr === 2027)!;
    expect(r2027.einnahmenErbschaft).toBe(1_000_000);
    expect(Number.isFinite(r2027.vermoegenNetto)).toBe(true);
  });

  // ─── Diagnose-Output (nicht assertend) ─────────────────────────────
  it("DIAGNOSE: Cashflow-Snapshots 2029/2030/2031 (vor / im / nach Erb-Jahr)", () => {
    for (const j of [2029, 2030, 2031]) {
      const z = reihe.find((r) => r.jahr === j)!;
      // eslint-disable-next-line no-console
      console.log(
        `[FALL O ${j}] Erwerb=${z.einnahmenErwerb} Erb=${z.einnahmenErbschaft} ` +
          `StEink=${z.ausgabenSteuernEinkommen} StVerm=${z.ausgabenSteuernVermoegen} ` +
          `StTotal=${z.ausgabenSteuern} VermNetto=${z.vermoegenNetto}`
      );
    }
    expect(true).toBe(true);
  });
});

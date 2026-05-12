/**
 * Property-Based-Testing Profil-Generator (Sprint A).
 *
 * Erzeugt random aber realistic Schweizer Pensionsplanungs-Profile als
 * `CashflowInput`-kompatible Objekte. Wird in `properties.test.ts` von
 * fast-check konsumiert, um Engine-Invarianten gegen 200-500 random
 * Profile zu prüfen.
 *
 * Designprinzip: Random im REALISTIC-Range, nicht im Extremum-Range.
 * Beispiel: Einkommen 30k-500k netto/J, NICHT 0 bis 100M. Engine-Bugs
 * im Plausibilitätsbereich finden, nicht UI-Validation-Lücken.
 */
import fc from "fast-check";
import type {
  Adresse,
  AhvInput,
  Budget,
  BvgInput,
  BvgPersonInput,
  Einkommensperiode,
  EinmaligAusgabe,
  ErbschaftInput,
  Fallart,
  FirmaInput,
  Hypothek,
  Immobilie,
  ImmobilienInput,
  ImmobilienPlan,
  ImmobilienTyp,
  Kind,
  PersonInput,
  Religion,
  SaeuleDreiEntry,
  SaeuleDreiInput,
  SaeuleDreiSubTyp,
  SaeuleDreiTyp,
  VermoegenInput,
  VermoegenItem,
  VermoegenTyp,
  ZieleWuensche,
} from "@/lib/store";
import { ALLE_KANTONE } from "../steuer-engine";
import type { CashflowInput } from "../cashflow";

const HEUTE_JAHR = new Date().getFullYear();

const RELIGIONEN: Religion[] = [
  "katholisch",
  "reformiert",
  "christkatholisch",
  "israelitisch",
  "andere",
  "keine",
];

let idCounter = 0;
function nextId(prefix: string): string {
  return `${prefix}-${++idCounter}`;
}

// ─── Helpers für Einzelfelder ──────────────────────────────────────

/**
 * Geburtsdatum für Alter ∈ [25, 70] zum Stichtag heute. ISO YYYY-MM-DD.
 * Tag und Monat random, Jahr deterministisch aus alter.
 */
function geburtsdatumFromAlter(alter: number, monat: number, tag: number): string {
  const jahr = HEUTE_JAHR - alter;
  const m = String(monat).padStart(2, "0");
  const t = String(Math.min(28, Math.max(1, tag))).padStart(2, "0");
  return `${jahr}-${m}-${t}`;
}

// ─── fast-check Arbitraries ────────────────────────────────────────

const arbAlter = fc.integer({ min: 25, max: 70 });
const arbMonat = fc.integer({ min: 1, max: 12 });
const arbTag = fc.integer({ min: 1, max: 28 });

const arbReligion: fc.Arbitrary<Religion> = fc.constantFrom(...RELIGIONEN);
const arbFallart: fc.Arbitrary<Fallart> = fc.constantFrom("einzel", "paar");
const arbKanton: fc.Arbitrary<string> = fc.constantFrom(...ALLE_KANTONE);

const arbBezugspraeferenz = fc.constantFrom("rente", "kapital", "mischung") as fc.Arbitrary<
  "rente" | "kapital" | "mischung"
>;

const arbVermoegenTyp: fc.Arbitrary<VermoegenTyp> = fc.constantFrom(
  "konto",
  "depot",
  "darlehen"
);

const arbImmoTyp: fc.Arbitrary<ImmobilienTyp> = fc.constantFrom(
  "selbstbewohnt",
  "rendite"
);

const arbImmoPlan: fc.Arbitrary<ImmobilienPlan> = fc.constantFrom(
  "behalten",
  "verkaufen"
);

const arbSaeule3Typ: fc.Arbitrary<SaeuleDreiTyp> = fc.constantFrom(
  "konto",
  "versicherung"
);
const arbSaeule3Sub: fc.Arbitrary<SaeuleDreiSubTyp> = fc.constantFrom("3a", "3b");

// ─── Person ─────────────────────────────────────────────────────────

function arbPerson(alterMin = 25, alterMax = 70): fc.Arbitrary<PersonInput & { alter: number }> {
  return fc
    .record({
      alter: fc.integer({ min: alterMin, max: alterMax }),
      monat: arbMonat,
      tag: arbTag,
      geschlecht: fc.constantFrom("m", "w", "andere") as fc.Arbitrary<"m" | "w" | "andere">,
    })
    .map(({ alter, monat, tag, geschlecht }) => ({
      vorname: "Random",
      nachname: "Profil",
      geburtsdatum: geburtsdatumFromAlter(alter, monat, tag),
      geschlecht,
      telefon: "",
      email: "",
      alter,
    }));
}

// ─── Adresse ────────────────────────────────────────────────────────

const arbAdresse: fc.Arbitrary<Adresse> = arbKanton.map((kanton) => ({
  strasse: "Teststrasse 1",
  plz: "8000",
  ort: "Zürich",
  kanton,
  gemeindeBfsId: null,
  gemeindeName: "",
}));

// ─── Kinder ─────────────────────────────────────────────────────────

const arbKind = fc
  .record({
    alter: fc.integer({ min: 0, max: 22 }),
    monat: arbMonat,
    tag: arbTag,
    zuordnung: fc.constantFrom("gemeinsam", "p1", "p2") as fc.Arbitrary<
      "gemeinsam" | "p1" | "p2"
    >,
  })
  .map(({ alter, monat, tag, zuordnung }): Kind => ({
    id: nextId("k"),
    vorname: "Kind",
    geburtsdatum: geburtsdatumFromAlter(alter, monat, tag),
    zuordnung,
    ausbildungBisJahr: null,
  }));

const arbKinder = fc.array(arbKind, { minLength: 0, maxLength: 4 });

// ─── AHV ────────────────────────────────────────────────────────────

const arbAhv = (paar: boolean): fc.Arbitrary<AhvInput> =>
  fc
    .record({
      einkommenP1: fc.integer({ min: 30_000, max: 500_000 }),
      einkommenP2: fc.integer({ min: 30_000, max: 500_000 }),
      ahvBezugsalterP1: fc.integer({ min: 63, max: 70 }),
      ahvBezugsalterP2: fc.integer({ min: 63, max: 70 }),
    })
    .map(({ einkommenP1, einkommenP2, ahvBezugsalterP1, ahvBezugsalterP2 }) => ({
      einkommenP1,
      einkommenP2: paar ? einkommenP2 : null,
      hatIkAuszugP1: false,
      hatIkAuszugP2: false,
      hatFehljahreP1: false,
      hatFehljahreP2: false,
      fehljahreAnzahlP1: 0,
      fehljahreAnzahlP2: 0,
      ahvBezugsalterP1,
      ahvBezugsalterP2,
      ahvRenteJahrEffektivP1: null,
      ahvRenteJahrEffektivP2: null,
    }));

// ─── BVG ────────────────────────────────────────────────────────────

const arbBvgPerson: fc.Arbitrary<BvgPersonInput> = fc
  .record({
    aktiverAnschluss: fc.boolean(),
    altersguthabenHeute: fc.integer({ min: 0, max: 2_000_000 }),
    saldoBeiBezugFaktor: fc.float({ min: 1, max: 3, noNaN: true }),
    umwandlungssatzProzent: fc.float({ min: 4.5, max: 7.0, noNaN: true }),
    bezugspraeferenz: arbBezugspraeferenz,
    kapitalanteil: fc.integer({ min: 0, max: 100 }),
  })
  .map(
    ({
      aktiverAnschluss,
      altersguthabenHeute,
      saldoBeiBezugFaktor,
      umwandlungssatzProzent,
      bezugspraeferenz,
      kapitalanteil,
    }) => ({
      aktiverAnschluss,
      altersguthabenHeute,
      altersguthabenBeiBezug: Math.round(altersguthabenHeute * saldoBeiBezugFaktor),
      umwandlungssatzProzent: Math.round(umwandlungssatzProzent * 100) / 100,
      bezugspraeferenz,
      kapitalanteil,
      freizuegigkeit: [],
      einkaeufe: [],
      wefVorbezuege: [],
    })
  );

const arbBvg = (paar: boolean): fc.Arbitrary<BvgInput> =>
  fc.record({ p1: arbBvgPerson, p2: arbBvgPerson }).map(({ p1, p2 }) => ({
    p1,
    p2: paar
      ? p2
      : {
          aktiverAnschluss: false,
          altersguthabenHeute: null,
          altersguthabenBeiBezug: null,
          umwandlungssatzProzent: 6.8,
          bezugspraeferenz: "rente" as const,
          kapitalanteil: 0,
          freizuegigkeit: [],
          einkaeufe: [],
          wefVorbezuege: [],
        },
  }));

// ─── Säule 3 ────────────────────────────────────────────────────────

const arbSaeule3Entry: fc.Arbitrary<SaeuleDreiEntry> = fc
  .record({
    type: arbSaeule3Typ,
    saeule: arbSaeule3Sub,
    aktuellerWert: fc.integer({ min: 0, max: 200_000 }),
    auszahlungsjahr: fc.integer({ min: HEUTE_JAHR + 1, max: HEUTE_JAHR + 40 }),
    renditeProzent: fc.float({ min: 0, max: 5, noNaN: true }),
    rueckkaufswert: fc.integer({ min: 0, max: 100_000 }),
    ablaufswert: fc.integer({ min: 0, max: 200_000 }),
    ablaufjahr: fc.integer({ min: HEUTE_JAHR + 1, max: HEUTE_JAHR + 30 }),
    jaehrlicheEinzahlung: fc.integer({ min: 0, max: 7_258 }), // 3a-Max 2025
    einzahlungAb: fc.integer({ min: HEUTE_JAHR, max: HEUTE_JAHR + 10 }),
    einzahlungBis: fc.integer({ min: HEUTE_JAHR + 11, max: HEUTE_JAHR + 30 }),
  })
  .map((r) => {
    // Konto kann nur 3a sein laut Spec
    const saeule = r.type === "konto" ? "3a" : r.saeule;
    return {
      id: nextId("s3"),
      type: r.type,
      saeule,
      beschreibung: "Random 3" + saeule,
      aktuellerWert: r.aktuellerWert,
      auszahlungsjahr: r.auszahlungsjahr,
      renditeProzent: Math.round(r.renditeProzent * 100) / 100,
      rueckkaufswert: r.rueckkaufswert,
      ablaufswert: r.ablaufswert,
      ablaufjahr: r.ablaufjahr,
      jaehrlicheEinzahlung: r.jaehrlicheEinzahlung,
      einzahlungAb: r.einzahlungAb,
      einzahlungBis: r.einzahlungBis,
    } satisfies SaeuleDreiEntry;
  });

const arbSaeuleDrei = (paar: boolean): fc.Arbitrary<SaeuleDreiInput> =>
  fc
    .record({
      p1: fc.array(arbSaeule3Entry, { minLength: 0, maxLength: 3 }),
      p2: fc.array(arbSaeule3Entry, { minLength: 0, maxLength: 3 }),
    })
    .map(({ p1, p2 }) => ({ p1, p2: paar ? p2 : [] }));

// ─── Vermögen ───────────────────────────────────────────────────────

const arbVermoegenItem: fc.Arbitrary<Omit<VermoegenItem, "id" | "istHauptkonto">> = fc
  .record({
    typ: arbVermoegenTyp,
    saldoHeute: fc.integer({ min: 0, max: 2_000_000 }),
    renditeProzent: fc.float({ min: 0, max: 5, noNaN: true }),
  })
  .map(({ typ, saldoHeute, renditeProzent }) => ({
    typ,
    beschreibung: typ === "konto" ? "Privatkonto" : typ === "depot" ? "Depot" : "Darlehen",
    // Darlehen werden als Schuld erfasst — saldo positiv = ausstehender Saldo
    saldoHeute,
    renditeProzent: Math.round(renditeProzent * 100) / 100,
  }));

const arbVermoegen: fc.Arbitrary<VermoegenInput> = fc
  .array(arbVermoegenItem, { minLength: 1, maxLength: 5 })
  .map((items) => {
    // mindestens ein Konto als Hauptkonto — ersetze erstes Item mit konto wenn nötig
    const hatKonto = items.some((i) => i.typ === "konto");
    const norm = hatKonto
      ? items
      : items.map((i, idx) =>
          idx === 0 ? { ...i, typ: "konto" as VermoegenTyp, beschreibung: "Privatkonto" } : i
        );
    // erstes Konto wird Hauptkonto
    let hauptSet = false;
    const final: VermoegenItem[] = norm.map((it) => {
      let istHauptkonto = false;
      if (!hauptSet && it.typ === "konto") {
        istHauptkonto = true;
        hauptSet = true;
      }
      return { id: nextId("v"), istHauptkonto, ...it };
    });
    return { items: final };
  });

// ─── Immobilien ────────────────────────────────────────────────────

const arbHypothek: fc.Arbitrary<Hypothek> = fc
  .record({
    hoehe: fc.integer({ min: 100_000, max: 1_500_000 }),
    zinssatz: fc.float({ min: 0.5, max: 4, noNaN: true }),
    ablaufjahr: fc.integer({ min: HEUTE_JAHR + 1, max: HEUTE_JAHR + 25 }),
  })
  .map(({ hoehe, zinssatz, ablaufjahr }) => ({
    id: nextId("h"),
    beschreibung: "Hypothek",
    hoehe,
    zinssatzProzent: Math.round(zinssatz * 100) / 100,
    ablaufjahr,
  }));

const arbImmobilie: fc.Arbitrary<Immobilie> = fc
  .record({
    typ: arbImmoTyp,
    verkehrswert: fc.integer({ min: 500_000, max: 3_000_000 }),
    hypotheken: fc.array(arbHypothek, { minLength: 0, maxLength: 2 }),
    plan: arbImmoPlan,
    verkaufsjahr: fc.integer({ min: HEUTE_JAHR + 1, max: HEUTE_JAHR + 25 }),
    miete: fc.integer({ min: 0, max: 80_000 }),
    kaufjahr: fc.integer({ min: HEUTE_JAHR - 30, max: HEUTE_JAHR - 1 }),
  })
  .map(
    ({ typ, verkehrswert, hypotheken, plan, verkaufsjahr, miete, kaufjahr }) => ({
      id: nextId("im"),
      beschreibung: typ === "selbstbewohnt" ? "Eigenheim" : "Renditeobjekt",
      typ,
      verkehrswert,
      hypotheken,
      plan,
      verkaufsjahr,
      jaehrlicheMieteinnahmen: typ === "rendite" ? miete : null,
      kaufjahr,
    })
  );

const arbImmobilien: fc.Arbitrary<ImmobilienInput> = fc
  .array(arbImmobilie, { minLength: 0, maxLength: 3 })
  .map((items) => ({ items }));

// ─── Budget ────────────────────────────────────────────────────────

const arbEinkommensperiode = (paar: boolean): fc.Arbitrary<Einkommensperiode> =>
  fc
    .record({
      personIdx: paar
        ? (fc.constantFrom(1, 2) as fc.Arbitrary<1 | 2>)
        : (fc.constant(1) as fc.Arbitrary<1>),
      betragMonatlich: fc.integer({ min: 3_000, max: 40_000 }),
      vonJahr: fc.integer({ min: HEUTE_JAHR - 5, max: HEUTE_JAHR }),
      vonMonat: arbMonat,
      bisJahr: fc.integer({ min: HEUTE_JAHR + 1, max: HEUTE_JAHR + 30 }),
      bisMonat: arbMonat,
    })
    .map((r) => ({
      id: nextId("e"),
      beschreibung: "Lohn",
      personIdx: r.personIdx as 1 | 2,
      betragMonatlich: r.betragMonatlich,
      von: `${r.vonJahr}-${String(r.vonMonat).padStart(2, "0")}`,
      bis: `${r.bisJahr}-${String(r.bisMonat).padStart(2, "0")}`,
    }));

const arbBudget = (paar: boolean): fc.Arbitrary<Budget> =>
  fc
    .record({
      einkommen: fc.array(arbEinkommensperiode(paar), { minLength: 1, maxLength: 3 }),
      ausgabenTotal: fc.integer({ min: 3_000, max: 25_000 }),
      wunschverbrauchPension: fc.integer({ min: 2_500, max: 20_000 }),
      religion: arbReligion,
    })
    .map((r) => ({
      einkommen: r.einkommen,
      ausgabenModus: "total" as const,
      ausgabenTotal: r.ausgabenTotal,
      ausgabenKategorien: {
        lebenshaltung: null,
        wohnen: null,
        mobilitaet: null,
        versicherungen: null,
        ferienHobby: null,
        sonstiges: null,
      },
      wunschverbrauchPension: r.wunschverbrauchPension,
      steuernHeute: null,
      einkommenHeute: null,
      religion: r.religion,
      alimente: { aktiv: false, betragJahr: null, richtung: "zahlt" },
    }));

// ─── Firma ─────────────────────────────────────────────────────────

const arbFirma: fc.Arbitrary<FirmaInput> = fc
  .record({
    vorhanden: fc.boolean(),
    erloes: fc.integer({ min: 0, max: 2_000_000 }),
    plan: fc.constantFrom("behalten", "verkaufen") as fc.Arbitrary<"behalten" | "verkaufen">,
    verkaufsjahr: fc.integer({ min: HEUTE_JAHR + 1, max: HEUTE_JAHR + 20 }),
  })
  .map(({ vorhanden, erloes, plan, verkaufsjahr }) => ({
    vorhanden,
    firmenname: vorhanden ? "Firma AG" : "",
    moeglicherVerkaufserloes: vorhanden ? erloes : null,
    plan,
    verkaufsjahr,
  }));

// ─── Einmalige Ausgaben ────────────────────────────────────────────

const arbEinmaligAusgabe: fc.Arbitrary<EinmaligAusgabe> = fc
  .record({
    jahr: fc.integer({ min: HEUTE_JAHR, max: HEUTE_JAHR + 20 }),
    betrag: fc.integer({ min: 5_000, max: 200_000 }),
  })
  .map(({ jahr, betrag }) => ({
    id: nextId("ea"),
    jahr,
    betrag,
    beschreibung: "Random",
  }));

// ─── Erbschaft (für Engine-Pfad-Coverage) ──────────────────────────

const arbErbschaft: fc.Arbitrary<ErbschaftInput> = fc.constant({
  erwartet: null,
  groessenordnung: null,
  erwartetBetrag: null,
  erwartetJahr: null,
  erwartetBeruecksichtigen: false,
  schenkungenStatus: null,
  schenkungenBetrag: null,
  schenkungenJahr: null,
  schenkungenBeruecksichtigen: false,
  schenkungenDetails: "",
  gueterstand: null,
});

// ─── Voll-Profil ───────────────────────────────────────────────────

export type RandomProfile = CashflowInput;

/**
 * Haupt-Arbitrary für PlanState-kompatibles CashflowInput. Jedes random
 * Profil ist intern konsistent (geburtsdatum ↔ alter, einkommen ≥ 30k,
 * etc.) und durchläuft die Engine ohne triviale Validierungs-Fehler.
 */
export const arbRandomProfile: fc.Arbitrary<RandomProfile> = fc
  .record({
    fallart: arbFallart,
    p1: arbPerson(25, 70),
    p2: arbPerson(25, 70),
    kinder: arbKinder,
    adresse: arbAdresse,
    firma: arbFirma,
    einmaligeAusgaben: fc.array(arbEinmaligAusgabe, { minLength: 0, maxLength: 3 }),
    bezugsalterP1: fc.integer({ min: 58, max: 70 }),
    bezugsalterP2: fc.integer({ min: 58, max: 70 }),
  })
  .chain((base) => {
    const paar = base.fallart === "paar";
    return fc
      .record({
        ahv: arbAhv(paar),
        bvg: arbBvg(paar),
        saeuleDrei: arbSaeuleDrei(paar),
        vermoegen: arbVermoegen,
        immobilien: arbImmobilien,
        budget: arbBudget(paar),
        erbschaft: arbErbschaft,
      })
      .map((r) => {
        const ziele: ZieleWuensche = {
          bezugsalterP1: base.bezugsalterP1,
          bezugsalterP2: base.bezugsalterP2,
        };
        const profile: RandomProfile = {
          fallart: base.fallart,
          person1: {
            vorname: base.p1.vorname,
            nachname: base.p1.nachname,
            geburtsdatum: base.p1.geburtsdatum,
            geschlecht: base.p1.geschlecht,
            telefon: base.p1.telefon,
            email: base.p1.email,
          },
          person2: paar
            ? {
                vorname: base.p2.vorname,
                nachname: base.p2.nachname,
                geburtsdatum: base.p2.geburtsdatum,
                geschlecht: base.p2.geschlecht,
                telefon: base.p2.telefon,
                email: base.p2.email,
              }
            : {
                vorname: "",
                nachname: "",
                geburtsdatum: "",
                geschlecht: null,
                telefon: "",
                email: "",
              },
          kinder: base.kinder,
          ahv: r.ahv,
          bvg: r.bvg,
          saeuleDrei: r.saeuleDrei,
          vermoegen: r.vermoegen,
          immobilien: r.immobilien,
          firma: base.firma,
          ziele,
          budget: r.budget,
          adresse: base.adresse,
          einmaligeAusgaben: base.einmaligeAusgaben,
          erbschaft: r.erbschaft,
        };
        return profile;
      });
  });

/**
 * Deterministischer Generator für einen einzelnen Profil-Seed —
 * nützlich für Reproduktion eines konkreten failing Profils.
 */
export function generateRandomPlanState(seed: number): RandomProfile {
  // fast-check's sample mit fixem seed liefert reproduzierbare Werte.
  const samples = fc.sample(arbRandomProfile, { numRuns: 1, seed });
  return samples[0]!;
}

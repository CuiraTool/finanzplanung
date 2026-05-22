import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * KI-Auto-Massnahmen-Generator.
 *
 * Nimmt einen kompakten Plan-Snapshot entgegen und liefert 3-5
 * personalisierte Optimierungs-Empfehlungen für die Pensionsplanung.
 *
 * Strategie:
 * - System-Prompt mit Schweizer Pensions-Wissen + Cache (5 min TTL)
 * - User-Message ist kompakter Snapshot (nicht voller PlanState — der
 *   wäre 5000+ Zeilen JSON, zu viel)
 * - Output: JSON-Array von 3-5 Massnahmen mit Begründung + CHF-Schätzung
 *
 * Differenziator vs. Wettbewerber: kein etabliertes Tool (VZ, Logismata,
 * TaxWare) hat einen LLM-basierten Massnahmen-Generator. TaxWare hat
 * angekündigt — wir haben Time-Window 12-24 Monate.
 */

const SYSTEM_PROMPT = `Du bist ein Schweizer Pensionsplanungs-Berater bei Cuira Partners GmbH.

Du analysierst einen Mandanten-Plan und schlägst 3-5 personalisierte
Optimierungs-Massnahmen vor. Du kennst Schweizer Recht (AHV21, BVG,
3a/3b, Steuerrecht alle 26 Kantone, Eigenmietwert-Reform 2030,
13. AHV ab 2026).

REGELN:
1. Antworte AUSSCHLIESSLICH mit gültigem JSON-Array — kein Markdown,
   kein \`\`\`-Block, keine Erklärung davor/danach.
2. Schema pro Massnahme:
   {
     "titel": string,           // 3-7 Wörter, prägnant
     "begruendung": string,     // 1-2 Sätze, Schweizer Spezifika
     "wirkungChf": number,      // grobe CHF-Schätzung pro Jahr (ganzzahlig)
     "wirkungBeschrieb": string,// "/Jahr Steuerersparnis" / "einmalig" / "lebenslang Mehrrente"
     "prioritaet": "hoch" | "mittel" | "niedrig",
     "kategorie": "steuern" | "rente" | "vermoegen" | "vorsorge" | "immobilien" | "nachlass",
     "umsetzbarBis": string | null  // YYYY-MM-DD oder null wenn keine Frist
   }
3. Schlage **3 bis 5** Massnahmen vor — Qualität vor Quantität.
4. Konkret und CH-spezifisch sein. Nicht "Vorsorge prüfen" — sondern
   "PK-Einkauf 2026 von CHF 30'000 — spart CHF 9'200 Steuern, +CHF 1'500
   PK-Rente lebenslang".
5. Keine Empfehlung doppeln — vermeide z.B. "3a maximieren" wenn schon
   in den regelbasierten Massnahmen vorhanden.
6. Wenn der Plan bereits gut ist, dürfen weniger als 3 Massnahmen sein
   (mind. 1, max 5).
7. Bei Frühpension < 65: Vorbezug-Kürzung berücksichtigen.
8. Steuerersparnis nur grob — User wird im Termin verfeinert.
9. CHF-Beträge ohne Apostroph (50000, nicht "50'000").
10. KEINE ANLAGEBERATUNG (FIDLEG-Schranke). Erlaubt sind ausschliesslich
   Massnahmen zu: AHV-Bezug (Vorbezug/Aufschub), BVG-Einkauf, BVG-Bezugsform
   (Kapital/Rente/Mischung), Säule-3a-Einzahlung, Steueroptimierung,
   Wohnsitz-/Kantonswahl, Hypothekar-Strategie (direkte/indirekte
   Amortisation), Nachlass-/Erbschaftsplanung, Budget und Liquidität.
   VERBOTEN: Empfehlung konkreter Finanzinstrumente oder Anbieter (ETF,
   Fonds, Aktien, Obligationen, strukturierte Produkte, konkrete
   3a-Wertschriftenlösungen, Depotbanken), Asset-Allocation-Empfehlungen,
   Aussagen wie "investieren Sie in ...". Im Zweifel die Massnahme weglassen.

DOMAIN-KENNTNISSE:
- 3a-Maximum 7'258 CHF (Angestellte) / 36'288 (Selbständige). Optimal alle
  ausnutzen, Steuerersparnis ~25-35% des Beitrags je nach Kanton/Einkommen.
- PK-Einkauf: steuerlich abzugsfähig, aber 3-Jahres-Sperrfrist auf Kapital-
  bezug. Sinnvoll wenn Einkauf-Lücke gross + Karriereende >3 Jahre weg.
- AHV-Aufschub: max 5 Jahre, Zuschlag bis +31.5% lebenslang. Lohnt bei
  hoher Lebenserwartung + ausreichendem Liquiditätspolster.
- AHV-Vorbezug: max 2 Jahre, Kürzung 6.8%/Jahr lebenslang. Selten optimal.
- Hypothek: indirekte Amortisation via 3a oft besser als direkte. Saron
  meist tiefer als Festhypothek.
- Wohnsitz-Optimierung: Steuerunterschied ZH/ZG bis CHF 50k+/Jahr bei
  hohen Einkommen.
- Erbplanung: Vorsorgeauftrag + Patientenverfügung sind Standard, oft nicht
  vorhanden.
- WEF: PK-Vorbezug für Eigenheim, alle 5 J. möglich, mindert spätere PK-Rente.
- Schenkung: Erbvorbezug nutzt Freibetrag, kantonal verschieden.

TON: faktisch, präzise, schweizerisch. Keine Marketing-Sprache.`;

interface KiMassnahme {
  titel: string;
  begruendung: string;
  wirkungChf: number;
  wirkungBeschrieb: string;
  prioritaet: "hoch" | "mittel" | "niedrig";
  kategorie:
    | "steuern"
    | "rente"
    | "vermoegen"
    | "vorsorge"
    | "immobilien"
    | "nachlass";
  umsetzbarBis: string | null;
}

export interface PlanSnapshot {
  fallart: "einzel" | "paar";
  alter: { p1: number | null; p2: number | null };
  pensionsalter: { p1: number; p2: number };
  kanton: string;
  einkommenJahr: number | null;
  ausgabenMonat: number | null;
  wunschPensionMonat: number | null;
  steuernHeute: number | null;
  vermoegenHeute: number | null;
  vermoegenPension: number | null;
  vermoegen20JahreSpaeter: number | null;
  pk: {
    altersguthabenHeuteP1: number | null;
    altersguthabenBeiBezugP1: number | null;
    bezugspraeferenzP1: string;
    altersguthabenHeuteP2: number | null;
    altersguthabenBeiBezugP2: number | null;
    bezugspraeferenzP2: string;
    einkaeufeGeplant: number;
  };
  saeule3aSaldoTotal: number;
  saeule3aEinzahlungJahr: number | null;
  immobilien: { anzahl: number; verkehrswertTotal: number; hypothekTotal: number; planVerkaufen: number };
  firmaVorhanden: boolean;
  nachlass: {
    testament: boolean;
    vorsorgeauftrag: boolean;
    patientenverfuegung: boolean;
    ehevertrag: boolean;
  };
  bekannteMassnahmen: string[]; // bereits regelbasiert vorgeschlagen
}

/**
 * Anlageberatungs-Sperrbegriffe (FIDLEG-Schutz). Massnahmen, deren Text auf
 * eine konkrete Finanzinstrument-Empfehlung hindeutet, werden serverseitig
 * verworfen — zusätzliche Sicherung neben der Prompt-Regel, da das LLM nicht
 * deterministisch ist.
 */
const ANLAGE_SPERRBEGRIFFE = [
  "etf",
  "fonds",
  "aktien",
  "obligationen",
  "wertschrift",
  "indexfond",
  "investier",
  "anlageprodukt",
  "depotbank",
  "strukturierte produkt",
];

/** True, wenn eine Massnahme nach konkreter Anlageberatung klingt. */
function klingtNachAnlageberatung(m: KiMassnahme): boolean {
  const text = `${m.titel} ${m.begruendung}`.toLowerCase();
  return ANLAGE_SPERRBEGRIFFE.some((begriff) => text.includes(begriff));
}

/** Max. 15 KI-Massnahmen-Anfragen pro Minute und IP — Schutz vor Kostenmissbrauch. */
const checkRateLimit = createRateLimiter(60_000, 15);

export async function POST(req: NextRequest) {
  if (!checkRateLimit(req)) {
    return NextResponse.json(
      { error: "Zu viele Anfragen — bitte einen Moment warten." },
      { status: 429 }
    );
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY fehlt." },
      { status: 500 }
    );
  }

  let body: { snapshot?: PlanSnapshot };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiger JSON-Body." },
      { status: 400 }
    );
  }

  const snapshot = body.snapshot;
  if (!snapshot) {
    return NextResponse.json(
      { error: "Feld 'snapshot' fehlt." },
      { status: 400 }
    );
  }

  const userPrompt = `MANDANTEN-PLAN:

${JSON.stringify(snapshot, null, 2)}

Schlage 3-5 personalisierte Optimierungs-Massnahmen vor. Antworte
ausschliesslich mit dem JSON-Array.`;

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" }, // 5-min cache
        },
      ],
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = message.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "Kein Textblock in Claude-Antwort." },
        { status: 502 }
      );
    }

    const cleaned = textBlock.text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    let parsed: KiMassnahme[];
    try {
      parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) {
        throw new Error("Erwartetes Array, bekommen Object");
      }
    } catch (err) {
      return NextResponse.json(
        {
          error:
            "Antwort von Claude konnte nicht als JSON-Array geparst werden.",
          parseError: err instanceof Error ? err.message : String(err),
          raw: cleaned,
        },
        { status: 502 }
      );
    }

    // Sanity-Check + Sortierung nach Priorität+CHF
    const validKats = new Set([
      "steuern",
      "rente",
      "vermoegen",
      "vorsorge",
      "immobilien",
      "nachlass",
    ]);
    const validPrios = new Set(["hoch", "mittel", "niedrig"]);
    const sauber = parsed
      .filter(
        (m) =>
          m &&
          typeof m.titel === "string" &&
          typeof m.begruendung === "string" &&
          typeof m.wirkungChf === "number" &&
          validPrios.has(m.prioritaet) &&
          validKats.has(m.kategorie) &&
          // FIDLEG-Schutz: Massnahmen, die nach konkreter Anlageberatung
          // klingen, werden verworfen.
          !klingtNachAnlageberatung(m)
      )
      .sort((a, b) => {
        const prioRank = { hoch: 0, mittel: 1, niedrig: 2 };
        const dp = prioRank[a.prioritaet] - prioRank[b.prioritaet];
        if (dp !== 0) return dp;
        return b.wirkungChf - a.wirkungChf;
      })
      .slice(0, 5);

    return NextResponse.json({ massnahmen: sauber });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Fehler bei KI-Analyse: ${msg}` },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * KI-Erklärungen für Schweizer Pensions-Begriffe.
 *
 * Nutzt Claude Sonnet 4.5 mit **Prompt-Caching** auf dem System-Prompt
 * (10 KB Schweizer Pensions-Wissensbasis), sodass jede Folge-Anfrage nur
 * den User-Begriff in den Cache lädt. Erste Anfrage ~$0.003, danach ~$0.0001.
 *
 * Endpoints:
 *   POST /api/explain
 *   Body: { begriff: string, kontext?: string }
 *   Returns: { erklaerung: string, beispiel?: string, hinweis?: string }
 */

const SYSTEM_PROMPT = `Du bist ein Schweizer Pensionsplanungs-Experte und erklärst Begriffe
für Berater und Mandanten von Cuira Partners GmbH. Antworte präzise, aktuell
zur Schweizer Rechtslage 2025 (AHV21, BVG, neues 13. AHV ab 2026).

REGELN:
1. Antworte AUSSCHLIESSLICH mit gültigem JSON — kein Markdown, kein \`\`\`-Block.
2. Schema:
   {
     "erklaerung": string,         // 2-3 Sätze, präzise, deutsch
     "beispiel": string | null,    // 1 konkretes CHF-Beispiel oder null
     "hinweis": string | null      // optionaler Praxis-Tipp oder null
   }
3. Erklärungen 60-120 Wörter total. Keine Marketing-Sprache.
4. Wenn ein Begriff mehrdeutig ist, kläre den wahrscheinlichsten Kontext
   (Schweizer Pensionsplanung) und antworte für diesen.
5. Nutze CH-Konvention: CHF mit Apostroph (CHF 1'200), nicht "Fr." oder "$".
6. Bei Unsicherheit ehrlich sein im "hinweis"-Feld.

DOMAIN-KONTEXT:
- AHV (1. Säule): BSV-Skala 44, Min CHF 15'120, Max CHF 30'240, Plafond Ehepaar
  CHF 45'360, 13. AHV ab 2026 (Faktor 13/12), Vorbezug max 2 Jahre (6.8%/J),
  Aufschub max 5 Jahre.
- BVG (2. Säule): Mindestzinssatz 1.25%, Umwandlungssatz 6.8% (gesetzliches
  Minimum), Sperrfrist 3 Jahre nach Einkauf, Bezug Rente / Kapital / Mischung.
  Koordinationsabzug, koordinierter Lohn, BVG-Maximum (Plafond), Eintritts-
  schwelle CHF 22'680.
- 3a/3b: Maximaleinzahlung 7'258 CHF (Angestellte), 36'288 (Selbständige),
  Auszahlung 5 J. vor AHV-Alter möglich. Konto vs. Versicherung (Rückkauf).
- Steuern: Bund (DBG), Kanton, Gemeinde, Kirche. Kapitalauszahlungssteuer
  Sondertarif 1/5 DBG. Grundstückgewinnsteuer kantonal nach Besitzdauer.
- Frühpension: AHV-Vorbezug 6.8% pro Jahr Reduktion, BVG-Pensionskasse
  individuell pro Plan.
- WEF (Wohneigentumsförderung): PK-Vorbezug für Eigenheim, max alle 5 Jahre.
- Splitting: AHV-Beiträge bei Ehe je hälftig zugerechnet.
- AHV21: Frauen Jahrgang 1961-63 gestaffelte Erhöhung Rentenalter 64→65.
- Plafonierung: Ehepaarrente max 150% der Maximalrente einer Einzelperson.

TON: faktisch, lehrerhaft aber nicht herablassend, schweizerisch präzise.`;

interface ExplainResponse {
  erklaerung: string;
  beispiel: string | null;
  hinweis: string | null;
}

/** Max. 30 Erklär-Anfragen pro Minute und IP — Schutz vor Kostenmissbrauch. */
const checkRateLimit = createRateLimiter(60_000, 30);

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

  let body: { begriff?: string; kontext?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiger JSON-Body." },
      { status: 400 }
    );
  }

  const begriff = (body.begriff ?? "").trim();
  const kontext = (body.kontext ?? "").trim();

  if (!begriff) {
    return NextResponse.json(
      { error: "Feld 'begriff' fehlt oder ist leer." },
      { status: 400 }
    );
  }
  if (begriff.length > 200) {
    return NextResponse.json(
      { error: "Begriff zu lang (max 200 Zeichen)." },
      { status: 400 }
    );
  }

  const userPrompt = kontext
    ? `Begriff: "${begriff}"\nKontext: ${kontext}`
    : `Begriff: "${begriff}"`;

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 512,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" }, // 5-min cache für Folge-Anfragen
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

    let parsed: ExplainResponse;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        {
          error: "Antwort von Claude konnte nicht als JSON geparst werden.",
          raw: cleaned,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed, {
      // Browser-Cache 1h, CDN-Cache 24h für gleiche Begriffe
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Fehler beim Erklären: ${msg}` },
      { status: 500 }
    );
  }
}

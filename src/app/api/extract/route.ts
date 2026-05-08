import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { ExtractedDocument } from "@/lib/extract-schema";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const SYSTEM_PROMPT = `Du bist ein Schweizer Finanzplanungs-Assistent für die Cuira-Pensionsplanungs-App.

Der User lädt ein Schweizer Finanzdokument hoch (z.B. PK-Ausweis, Steuerveranlagung,
IK-Auszug, Versicherungspolice, Lohnausweis, Kontoauszug). Deine Aufgabe:

1. Erkenne den Doc-Typ.
2. Extrahiere alle relevanten Werte gemäss dem JSON-Schema.
3. Fehlende oder unsichere Werte → null. Nicht raten.
4. Beträge in CHF, ohne Tausender-Trennung, nur ganze Zahlen oder mit zwei
   Dezimalstellen wenn relevant. Beispiel: 450000 (nicht "CHF 450'000.–").
5. Datumsangaben als ISO YYYY-MM-DD.
6. Kanton als Zwei-Buchstaben-Code (ZH, ZG, BE, ...).
7. Bei mehreren Werten/Personen im Doc: nimm den Hauptwert oder die erste Person.

Antworte NUR mit dem JSON-Objekt — kein Markdown, keine Erklärung davor oder danach.

Schema (alle Felder müssen vorhanden sein, Werte können null sein):
{
  "docType": "pk-ausweis" | "steuerveranlagung" | "ik-auszug" | "versicherungspolice" | "lohnausweis" | "kontoauszug" | "unbekannt",
  "confidence": 0.0-1.0,
  "beschreibung": "kurze Beschreibung — z.B. 'PK-Ausweis Tellco, Stand 31.12.2025'",
  "stichtag": "YYYY-MM-DD" | null,
  "betrifftName": "Vorname Nachname" | null,
  "felder": {
    "vorname": null,
    "nachname": null,
    "geburtsdatum": null,
    "strasse": null,
    "plz": null,
    "ort": null,
    "kanton": null,
    "bruttojahreseinkommen": null,
    "massgebendesEinkommen": null,
    "jahressteuer": null,
    "steuerbaresEinkommen": null,
    "steuerbaresVermoegen": null,
    "pkAltersguthabenHeute": null,
    "pkAltersguthabenMit65": null,
    "pkUmwandlungssatzProzent": null,
    "pkAnbieter": null,
    "freizuegigkeitSaldo": null,
    "freizuegigkeitAnbieter": null,
    "saeule3aKontoSaldo": null,
    "saeule3aKontoAnbieter": null,
    "saeule3aVersicherungRueckkaufswert": null,
    "saeule3aVersicherungAblaufswert": null,
    "saeule3aVersicherungAblaufjahr": null,
    "saeule3aVersicherungAnbieter": null,
    "bankkontoSaldo": null,
    "depotSaldo": null,
    "immobilieVerkehrswert": null,
    "hypothekRestschuld": null,
    "hypothekZinssatzProzent": null,
    "hypothekAblaufjahr": null,
    "notizen": null
  }
}`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "ANTHROPIC_API_KEY fehlt — bitte in .env.local oder Netlify-Env setzen.",
      },
      { status: 500 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Kein File im Request gefunden." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `Datei zu gross (max ${MAX_FILE_BYTES / 1024 / 1024} MB).` },
        { status: 400 }
      );
    }

    const mime = file.type;
    if (!ALLOWED_MIME.has(mime)) {
      return NextResponse.json(
        {
          error: `Format nicht unterstützt: ${mime}. Erlaubt: PDF, JPG, PNG, WebP.`,
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const client = new Anthropic({ apiKey });

    const isPdf = mime === "application/pdf";
    const content = [
      isPdf
        ? {
            type: "document" as const,
            source: {
              type: "base64" as const,
              media_type: "application/pdf" as const,
              data: base64,
            },
          }
        : {
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: mime as
                | "image/jpeg"
                | "image/png"
                | "image/webp",
              data: base64,
            },
          },
      {
        type: "text" as const,
        text: "Extrahiere die Werte gemäss Schema. Antworte ausschliesslich mit dem JSON-Objekt.",
      },
    ];

    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content,
        },
      ],
    });

    const textBlock = message.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "Kein Textblock in Claude-Antwort." },
        { status: 502 }
      );
    }

    const raw = textBlock.text.trim();
    // Robustness: falls Claude doch Markdown-Fences nutzt, abstreifen
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    let parsed: ExtractedDocument;
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

    return NextResponse.json({ extracted: parsed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Fehler beim Extrahieren: ${msg}` },
      { status: 500 }
    );
  }
}

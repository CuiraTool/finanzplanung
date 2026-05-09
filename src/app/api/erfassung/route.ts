/**
 * V2-Erfassungs-Submission Endpoint.
 *
 * Empfängt das FlowAntworten-JSON vom Frage-Flow und versucht, eine Email an
 * Kathir mit den Daten zu schicken (via Resend, falls RESEND_API_KEY gesetzt).
 *
 * Falls kein API-Key vorhanden: graceful Fallback — die Antwort signalisiert
 * "emailGesendet: false", der Client kann dann den JSON-Download anbieten
 * sodass der Berater die Datei manuell senden kann.
 *
 * Warum nicht direkt Mailto: weil die Submission so Server-seitig persistiert
 * werden kann und der Empfänger keine SMTP-Konfiguration im Browser braucht.
 */

import { NextResponse } from "next/server";

const RECIPIENT_EMAIL = "kathir@cuirapartners.ch";
const SENDER_DEFAULT = "Cuira Erfassung <onboarding@resend.dev>";

interface BeraterMeta {
  datum: string;
  partnerfirma: string;
  beraterName: string;
  beraterEmail: string;
  auftrag: string;
  kundeP1Name: string;
  kundeP2Name: string;
}

interface SubmissionPayload {
  beraterMeta?: BeraterMeta;
  plan: Record<string, unknown>;
  erfasstAm: string;
}

export async function POST(req: Request) {
  let body: SubmissionPayload;
  try {
    body = (await req.json()) as SubmissionPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  // Resend nur aktiv wenn API-Key gesetzt — sonst graceful fallback
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      ok: true,
      emailGesendet: false,
      hint: "RESEND_API_KEY nicht gesetzt — bitte JSON-Download verwenden und manuell senden.",
    });
  }

  const sender = process.env.CUIRA_SENDER_EMAIL ?? SENDER_DEFAULT;
  const subject = buildSubject(body);
  const textBody = buildTextBody(body);
  const htmlBody = buildHtmlBody(body);
  const jsonAttachment = JSON.stringify(body, null, 2);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: sender,
        to: [RECIPIENT_EMAIL],
        subject,
        text: textBody,
        html: htmlBody,
        attachments: [
          {
            filename: filenameFor(body),
            content: Buffer.from(jsonAttachment).toString("base64"),
          },
        ],
        ...(body.beraterMeta?.beraterEmail
          ? { reply_to: body.beraterMeta.beraterEmail }
          : {}),
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        {
          ok: false,
          emailGesendet: false,
          error: `Resend HTTP ${res.status}: ${errText.slice(0, 200)}`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, emailGesendet: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, emailGesendet: false, error: msg },
      { status: 500 }
    );
  }
}

function buildSubject(p: SubmissionPayload): string {
  const kunde =
    p.beraterMeta?.kundeP1Name?.trim() ||
    (p.plan.person1 as { vorname?: string; nachname?: string } | undefined)
      ?.vorname ||
    "Kunde";
  const berater = p.beraterMeta?.beraterName?.trim() ?? "Cuira Erfassung";
  return `[Cuira-Erfassung] ${kunde} (von ${berater})`;
}

function filenameFor(p: SubmissionPayload): string {
  const kundeRaw =
    p.beraterMeta?.kundeP1Name?.trim() ||
    (p.plan.person1 as { vorname?: string; nachname?: string } | undefined)
      ?.vorname ||
    "kunde";
  const slug = kundeRaw
    .toLowerCase()
    .replace(/[äöü]/g, (c) => ({ ä: "ae", ö: "oe", ü: "ue" })[c] ?? c)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const datum = p.erfasstAm.slice(0, 10);
  return `cuira-erfassung-${slug}-${datum}.json`;
}

function buildTextBody(p: SubmissionPayload): string {
  const m = p.beraterMeta;
  return [
    `Neue V2-Erfassung von ${m?.beraterName ?? "Berater"} eingegangen.`,
    "",
    `Datum: ${m?.datum ?? p.erfasstAm.slice(0, 10)}`,
    `Partnerfirma: ${m?.partnerfirma ?? "—"}`,
    `Berater: ${m?.beraterName ?? "—"} (${m?.beraterEmail ?? "—"})`,
    `Auftrag: ${m?.auftrag ?? "—"}`,
    `Kunde: ${m?.kundeP1Name ?? "—"}${m?.kundeP2Name ? " + " + m.kundeP2Name : ""}`,
    "",
    "Im Anhang: vollständiges JSON zum Import ins Tool (cuira.netlify.app → Daten importieren).",
  ].join("\n");
}

function buildHtmlBody(p: SubmissionPayload): string {
  const m = p.beraterMeta;
  const row = (k: string, v: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#475569">${k}</td><td style="padding:4px 0;color:#0f172a;font-weight:500">${v}</td></tr>`;
  return `<!doctype html><html><body style="font-family:-apple-system,sans-serif;color:#0f172a;background:#f8fafc;padding:24px">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;padding:24px;border:1px solid #e2e8f0">
<h2 style="margin:0 0 12px;font-size:18px">Neue V2-Erfassung eingegangen</h2>
<p style="margin:0 0 16px;color:#475569;font-size:14px">JSON im Anhang — bitte ins Tool importieren via cuira.netlify.app → Daten importieren.</p>
<table style="width:100%;border-collapse:collapse;font-size:14px">
${row("Datum", m?.datum ?? p.erfasstAm.slice(0, 10))}
${row("Partnerfirma", m?.partnerfirma ?? "—")}
${row("Berater", `${m?.beraterName ?? "—"} (${m?.beraterEmail ?? "—"})`)}
${row("Auftrag", m?.auftrag ?? "—")}
${row("Kunde", `${m?.kundeP1Name ?? "—"}${m?.kundeP2Name ? " + " + m.kundeP2Name : ""}`)}
</table>
</div></body></html>`;
}

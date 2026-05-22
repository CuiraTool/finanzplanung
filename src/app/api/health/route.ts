import { NextResponse } from "next/server";

/**
 * Health-Check-Endpunkt für Uptime-Monitoring (UptimeRobot, Better Stack o.ä.).
 * Liefert 200 + Build-Info, ohne externe Abhängigkeiten (Anthropic, Resend)
 * anzufassen — prüft also nur, ob die App selbst erreichbar ist.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    // Netlify stellt den deployten Commit als COMMIT_REF bereit.
    commit: process.env.COMMIT_REF ?? "dev",
  });
}

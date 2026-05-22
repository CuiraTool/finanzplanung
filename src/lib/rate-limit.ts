/**
 * Simpler In-Memory-Rate-Limiter pro IP-Adresse.
 *
 * Schützt die KI-Endpunkte (jeder Aufruf kostet Anthropic-API-Gebühren) vor
 * Missbrauch durch automatisierte Anfragen. Der Zähler lebt im Speicher der
 * Function-Instanz und wird bei jedem Cold-Start zurückgesetzt — für
 * Netlify-Functions akzeptabel. Production-grade wäre Upstash Ratelimit oder
 * Cloudflare Turnstile vorgeschaltet.
 *
 * Nutzung:
 *   const check = createRateLimiter(60_000, 20); // 20 Anfragen / Minute / IP
 *   if (!check(req)) return NextResponse.json({ error }, { status: 429 });
 */
export function createRateLimiter(windowMs: number, limit: number) {
  const counts = new Map<string, { count: number; resetAt: number }>();
  return function check(req: Request): boolean {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "anon";
    const now = Date.now();
    const entry = counts.get(ip);
    if (!entry || entry.resetAt < now) {
      counts.set(ip, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (entry.count >= limit) return false;
    entry.count++;
    return true;
  };
}

"use client";

/**
 * /login/kunde — Endkunden-Login (Magic-Link).
 *
 * Nur E-Mail-Eingabe — wir senden einen sicheren Login-Link, kein
 * Passwort. Nach Klick auf Link → /portal (NOT YET DESIGNED, kommt
 * mit Etappe 4).
 *
 * Aktuell als Mock: "Login-Link senden" zeigt eine Bestätigungs-View.
 */

import { LoginScreen } from "@/components/login/LoginScreen";

export default function KundeLoginPage() {
  return <LoginScreen initialRole="kunde" lockedRole />;
}

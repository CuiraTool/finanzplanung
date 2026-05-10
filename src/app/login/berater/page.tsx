"use client";

/**
 * /login/berater — Berater-Login (Cuira-internes Team).
 *
 * Login mit E-Mail + Passwort, danach 6-stelliger 2FA-Code per E-Mail.
 * Nach erfolgreichem Login → /app (Mandanten-Cockpit).
 *
 * Ohne Tab-Switcher (lockedRole) — User landet hier direkt via
 * cuirapartners.ch/login/berater oder durch Bookmark.
 */

import { LoginScreen } from "@/components/login/LoginScreen";

export default function BeraterLoginPage() {
  return <LoginScreen initialRole="berater" lockedRole />;
}

"use client";

/**
 * /login/affiliate — Vertriebspartner-Login.
 *
 * E-Mail + Passwort, kein 2FA. Nach erfolgreichem Login →
 * /erfassung (Affiliate-Erfassungstool).
 *
 * Eigene URL für Whitelabel-Affiliates: cuirapartners.ch/login/affiliate
 * oder eine partner-spezifische Domain mit gleicher Logik dahinter.
 */

import { LoginScreen } from "@/components/login/LoginScreen";

export default function AffiliateLoginPage() {
  return <LoginScreen initialRole="affiliate" lockedRole />;
}

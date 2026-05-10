"use client";

/**
 * /login — Übersicht (Tab-Switcher zwischen 3 Rollen).
 *
 * In Production wird dieser Index meist redirect-en auf /login/berater,
 * weil URL-deeplinks häufiger genutzt werden. Hier ist er als Tab-
 * Switcher belassen, damit man die 3 Rollen auf einer URL durchklicken
 * kann (Demo-Modus für Sales-Termine).
 */

import { LoginScreen } from "@/components/login/LoginScreen";

export default function LoginPage() {
  return <LoginScreen />;
}

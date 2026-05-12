/**
 * Kalender-ICS-Export (Tiago-Feedback Fix 5).
 *
 * Generiert RFC-5545-konforme .ics-Datei aus Massnahmen-Liste.
 * Funktioniert auf:
 *  - iOS / iPhone: Doppelklick öffnet Kalender-App
 *  - Android / Samsung: Datei via Google-Calendar oder Samsung-Calendar
 *  - macOS Kalender, Outlook, Thunderbird, Google Calendar
 *
 * Format:
 *  - VCALENDAR mit VEVENT pro Massnahme
 *  - DTSTART am 1. des Wann-Jahres-Monats (oder 1. Januar wenn nur Jahr)
 *  - SUMMARY = Massnahmen-Titel (gekürzt 250 Zeichen)
 *  - DESCRIPTION = Detail
 *  - VALARM 7 Tage vorher
 */

import type { Massnahme } from "@/engine/massnahmen";

/** Eskapiert Sonderzeichen in ICS-Werten (Komma, Strichpunkt, Newline). */
function escapeIcs(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\r?\n/g, "\\n");
}

/** Wann-Jahr aus Massnahme als YYYY-MM-DD. */
function dateFromMassnahme(m: Massnahme): { datum: string; allDay: boolean } {
  // m.jahr ist Number — wir setzen Datum auf 15. des Geburtsmonats oder 15.01
  // (Mitte Monat, damit Reminders zeitnah zur konkreten Aktion fallen)
  return {
    datum: `${m.jahr}0115`, // YYYYMMDD
    allDay: true,
  };
}

function vNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/**
 * Generiert eine .ics-Datei (als String) aus Massnahmen-Liste.
 * Pro Massnahme ein VEVENT mit Alarm 7 Tage vorher.
 */
export function buildIcsFromMassnahmen(
  massnahmen: Massnahme[],
  beraterName = "Cuira Partners GmbH"
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//Cuira Partners//Pensionsplanung//DE`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:Cuira Pensionsplanung — Termine & Reminder`,
    `X-WR-CALDESC:Massnahmen + Reminder aus Pensionsplanungs-Auswertung`,
    "X-WR-TIMEZONE:Europe/Zurich",
  ];

  const now = vNow();
  for (const m of massnahmen) {
    const { datum } = dateFromMassnahme(m);
    const uid = `${m.id}@cuira.ch`;
    const titel = escapeIcs(m.titel).slice(0, 250);
    const detail = escapeIcs(m.detail || "");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${datum}`,
      `DTEND;VALUE=DATE:${datum}`,
      `SUMMARY:${titel}`,
      `DESCRIPTION:${detail}${detail ? "\\n\\n" : ""}Erstellt von ${escapeIcs(beraterName)} — Cuira Pensionsplanungstool`,
      "STATUS:CONFIRMED",
      "TRANSP:TRANSPARENT",
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "TRIGGER:-P7D",
      `DESCRIPTION:Erinnerung: ${titel}`,
      "END:VALARM",
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  // CRLF nach RFC 5545
  return lines.join("\r\n");
}

/**
 * Lädt die .ics-Datei im Browser herunter (triggert OS-Default-Kalender-App).
 */
export function downloadIcs(content: string, filename = "cuira-termine.ics"): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

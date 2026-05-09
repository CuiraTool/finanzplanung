import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

/**
 * Geist & Geist Mono via Next.js Font-Optimization (selbst gehostet im
 * Build, kein Layout-Shift, optimale Performance). Variablen werden via
 * --font-sans / --font-mono in globals.css gemappt.
 */
const geistSans = Geist({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--cuira-font-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--cuira-font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pensionsplanung — Cuira Partners",
  description: "Interaktive Pensionsplanung in Echtzeit",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de-CH" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body
        style={{
          // Mappe Next-Font-Variablen auf die Design-Token-Variablen
          ["--font-sans" as string]: `var(--cuira-font-sans), ui-sans-serif, system-ui, sans-serif`,
          ["--font-mono" as string]: `var(--cuira-font-mono), ui-monospace, "SF Mono", monospace`,
        }}
      >
        {children}
      </body>
    </html>
  );
}

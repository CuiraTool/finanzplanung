"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-Level Error-Boundary (Next.js App Router).
 *
 * Fängt Render- und Engine-Fehler ab, damit ein einzelner Throw nicht zur
 * weissen Seite führt. Der erfasste State liegt im LocalStorage des Browsers
 * — «Erneut versuchen» oder ein Reload verliert keine eingegebenen Daten.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Fehler in der Konsole sichtbar machen, bis echtes Monitoring steht.
    console.error("Render-Fehler:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#f6f7f9",
        fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "440px",
          width: "100%",
          background: "#ffffff",
          border: "1px solid #e7eaee",
          borderRadius: "14px",
          padding: "32px",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "20px",
            fontWeight: 600,
            color: "#0a2540",
            margin: "0 0 10px",
          }}
        >
          Es ist ein Fehler aufgetreten
        </h1>
        <p
          style={{
            fontSize: "14px",
            lineHeight: 1.6,
            color: "#5b6675",
            margin: "0 0 20px",
          }}
        >
          Bei der Berechnung ist etwas schiefgelaufen. Ihre erfassten Daten
          bleiben gespeichert — sie liegen lokal in diesem Browser.
        </p>
        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={reset}
            style={{
              background: "#0a2540",
              color: "#ffffff",
              border: "none",
              borderRadius: "9px",
              padding: "10px 18px",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Erneut versuchen
          </button>
          <Link
            href="/"
            style={{
              background: "#ffffff",
              color: "#0a2540",
              border: "1px solid #d4d9e0",
              borderRadius: "9px",
              padding: "10px 18px",
              fontSize: "14px",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Zur Startseite
          </Link>
        </div>
        {error.digest && (
          <p
            style={{
              fontSize: "11px",
              color: "#9aa4b2",
              margin: "18px 0 0",
            }}
          >
            Fehler-Referenz: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}

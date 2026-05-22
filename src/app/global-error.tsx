"use client";

/**
 * Globale Error-Boundary (Next.js App Router).
 *
 * Greift nur, wenn der Fehler im Root-Layout selbst auftritt — ersetzt dann
 * das gesamte Dokument und muss deshalb eigenes <html>/<body> rendern.
 * Kann nicht auf globals.css / Token-Variablen zugreifen → Inline-Styles.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="de-CH">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#f6f7f9",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
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
            Die Anwendung konnte nicht geladen werden. Ihre erfassten Daten
            bleiben lokal in diesem Browser gespeichert.
          </p>
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
            Neu laden
          </button>
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
      </body>
    </html>
  );
}

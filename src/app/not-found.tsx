import Link from "next/link";

/**
 * 404-Seite (Next.js App Router). Greift bei unbekannten Routen.
 */
export default function NotFound() {
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
        <p
          style={{
            fontSize: "13px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            color: "#9aa4b2",
            margin: "0 0 6px",
          }}
        >
          FEHLER 404
        </p>
        <h1
          style={{
            fontSize: "20px",
            fontWeight: 600,
            color: "#0a2540",
            margin: "0 0 10px",
          }}
        >
          Seite nicht gefunden
        </h1>
        <p
          style={{
            fontSize: "14px",
            lineHeight: 1.6,
            color: "#5b6675",
            margin: "0 0 20px",
          }}
        >
          Die aufgerufene Adresse existiert nicht oder wurde verschoben.
        </p>
        <Link
          href="/"
          style={{
            background: "#0a2540",
            color: "#ffffff",
            borderRadius: "9px",
            padding: "10px 18px",
            fontSize: "14px",
            fontWeight: 500,
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Zur Startseite
        </Link>
      </div>
    </div>
  );
}

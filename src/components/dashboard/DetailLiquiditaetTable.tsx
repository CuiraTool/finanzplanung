"use client";

/**
 * Detail-Liquidität pro Jahr — SSM-Style Tabelle.
 *
 * Zeigt für jedes Jahr aus der Cashflow-Reihe:
 *  - Einnahmen-Splits (Erwerb netto, AHV, BVG-Rente, Mieten)
 *  - Ausgaben-Splits (Lebenshaltung, Wohnen+Zinsen, Steuern, Kap.steuern, 3a)
 *  - Saldo
 *  - Vermögens-Komponenten (Liquidität, Anlagen, Vorsorge, Immobilien, Schulden, Netto)
 *
 * Default eingeklappt (Dropdown im Dashboard). Im PDF nur dann, wenn der User
 * den Toggle im Dashboard aktiviert hat — Persistenz via localStorage.
 */

import type { CashflowZeile } from "@/engine/cashflow";
import { formatChfPlain } from "@/lib/format";

interface Props {
  daten: CashflowZeile[];
  /**
   * Optional: nur Jahre bis zum Ende-Jahr zeigen (z.B. Pension + 20).
   * Default: alle Jahre aus `daten`.
   */
  bisJahr?: number;
  /**
   * Im PDF auf kompakt schalten (kleinere Schrift, keine ScrollBox).
   */
  printMode?: boolean;
}

function fmt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n === 0) return "—";
  return formatChfPlain(Math.round(n));
}

function fmtSaldo(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "—";
  const s = formatChfPlain(Math.round(Math.abs(n)));
  return n < 0 ? `−${s}` : s;
}

export function DetailLiquiditaetTable({ daten, bisJahr, printMode }: Props) {
  const zeilen = bisJahr ? daten.filter((z) => z.jahr <= bisJahr) : daten;

  if (zeilen.length === 0) {
    return (
      <div className="grid h-24 place-items-center text-xs text-slate-400">
        Keine Cashflow-Daten verfügbar.
      </div>
    );
  }

  const erwerbNetto = (z: CashflowZeile) =>
    z.einnahmenErwerb - z.ausgabenSozialBvg - z.ausgabenAhvNe;
  const wohnen = (z: CashflowZeile) => z.ausgabenHypozins;
  const steuernEink = (z: CashflowZeile) =>
    z.ausgabenSteuernEinkommen + z.ausgabenSteuernVermoegen;
  const diverses = (z: CashflowZeile) =>
    z.ausgabenEinmalig + z.ausgabenSchenkung + z.ausgabenAlimente;

  const wrapClass = printMode
    ? "w-full text-[8.5pt]"
    : "w-full text-[11px]";
  const scrollClass = printMode
    ? ""
    : "max-h-[480px] overflow-auto rounded-md border border-slate-200";

  return (
    <div className={scrollClass}>
      <table className={wrapClass} style={{ borderCollapse: "collapse" }}>
        <thead
          className="sticky top-0 z-10"
          style={{ background: "#f8fafc" }}
        >
          <tr style={{ color: "#64748b" }}>
            <Th>Jahr</Th>
            <Th>Alter</Th>
            <th
              colSpan={4}
              className="border-b border-slate-200 px-2 py-1 text-left text-[9px] font-semibold uppercase tracking-wider"
              style={{ background: "#eff6ff", color: "#1d4ed8" }}
            >
              Einnahmen
            </th>
            <th
              colSpan={5}
              className="border-b border-slate-200 px-2 py-1 text-left text-[9px] font-semibold uppercase tracking-wider"
              style={{ background: "#fef3c7", color: "#854d0e" }}
            >
              Ausgaben
            </th>
            <Th right>Saldo</Th>
            <th
              colSpan={6}
              className="border-b border-slate-200 px-2 py-1 text-left text-[9px] font-semibold uppercase tracking-wider"
              style={{ background: "#ecfdf5", color: "#047857" }}
            >
              Vermögen
            </th>
          </tr>
          <tr
            className="text-[9px] font-medium uppercase tracking-wider"
            style={{ color: "#64748b" }}
          >
            <Th />
            <Th />
            <Th right>Erw. netto</Th>
            <Th right>AHV</Th>
            <Th right>BVG-R</Th>
            <Th right>Mieten</Th>
            <Th right>Lebensh.</Th>
            <Th right>Wohnen+Zins</Th>
            <Th right>Steuern</Th>
            <Th right>Kap.St.</Th>
            <Th right>3a/Vorsorge</Th>
            <Th right>Saldo</Th>
            <Th right>Liquid.</Th>
            <Th right>Wertschr.</Th>
            <Th right>Vorsorge</Th>
            <Th right>Immo</Th>
            <Th right>Schulden</Th>
            <Th right>Netto</Th>
          </tr>
        </thead>
        <tbody>
          {zeilen.map((z, i) => {
            const alterLabel =
              z.alterP1 != null && z.alterP2 != null
                ? `${z.alterP1}/${z.alterP2}`
                : z.alterP1 != null
                  ? `${z.alterP1}`
                  : "—";
            const saldoNeg = z.saldo < 0;
            return (
              <tr
                key={z.jahr}
                style={{
                  borderTop: i === 0 ? undefined : "1px solid #f1f5f9",
                  background: i % 2 === 0 ? "#ffffff" : "#fafafa",
                }}
              >
                <Td bold>{z.jahr}</Td>
                <Td>{alterLabel}</Td>
                <Td right>{fmt(erwerbNetto(z))}</Td>
                <Td right>{fmt(z.einnahmenAhv)}</Td>
                <Td right>{fmt(z.einnahmenBvgRente)}</Td>
                <Td right>{fmt(z.einnahmenMieten)}</Td>
                <Td right>{fmt(z.ausgabenHaushalt)}</Td>
                <Td right>{fmt(wohnen(z))}</Td>
                <Td right>{fmt(steuernEink(z))}</Td>
                <Td right>{fmt(z.ausgabenSteuernKapital)}</Td>
                <Td right>{fmt(z.ausgabenVorsorge3a + z.ausgabenPkEinkauf)}</Td>
                <Td
                  right
                  bold
                  style={{ color: saldoNeg ? "#dc2626" : "#047857" }}
                >
                  {fmtSaldo(z.saldo)}
                </Td>
                <Td right>{fmt(z.vermoegenLiquiditaet)}</Td>
                <Td right>{fmt(z.vermoegenWertschriften)}</Td>
                <Td right>{fmt(z.vermoegenVorsorge)}</Td>
                <Td right>{fmt(z.vermoegenImmobilien)}</Td>
                <Td right>{z.vermoegenSchulden > 0 ? `−${fmt(z.vermoegenSchulden)}` : "—"}</Td>
                <Td right bold>
                  {fmt(z.vermoegenNetto)}
                </Td>
                {/* Diverses unsichtbar mit-aggregiert über Lebenshaltung-Spalte;
                    explizite Anzeige würde Tabelle sprengen. */}
                {diverses(z) > 0 && (
                  <span style={{ display: "none" }}>{diverses(z)}</span>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  right,
}: {
  children?: React.ReactNode;
  right?: boolean;
}) {
  return (
    <th
      className={`border-b border-slate-200 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider ${
        right ? "text-right" : "text-left"
      }`}
      style={{ background: "#f8fafc", color: "#64748b", whiteSpace: "nowrap" }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  right,
  bold,
  style,
}: {
  children?: React.ReactNode;
  right?: boolean;
  bold?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <td
      className={`px-2 py-1 tabular-nums ${right ? "text-right" : "text-left"} ${
        bold ? "font-semibold" : ""
      }`}
      style={{ whiteSpace: "nowrap", color: "#0f172a", ...style }}
    >
      {children}
    </td>
  );
}

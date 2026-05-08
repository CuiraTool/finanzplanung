/**
 * Berechnungslogik für die 5 Tarif-Typen der ESTV-Tabellen.
 *
 * Adaptiert aus github.com/devbrains-com/swisstaxcalculator (MIT License,
 * lib/taxes/tarif/index.ts), portiert auf normale Number-Arithmetik
 * (ohne dinero.js, das ist für indikative Steuerberechnung in CHF
 * ausreichend genau).
 */

import type { TableType, TarifData, TarifTableItem } from "./types";

/**
 * BUND-Format: amount = Untergrenze CHF, taxes = Steuer am Stufenanfang,
 * percent = Marginalsatz auf Überschuss.
 *
 * Steuer = taxes_letzteStufe + percent_letzteStufe × (income - amount_letzteStufe)
 */
function calcBund(income: number, tarif: TarifData): number {
  let lastRow: TarifTableItem | undefined;
  for (const row of tarif.table) {
    if (row.amount <= income) lastRow = row;
    else break;
  }
  if (!lastRow) return 0;
  return lastRow.taxes + (income - lastRow.amount) * (lastRow.percent / 100);
}

/**
 * ZUERICH-Format: amount = Stufenbreite, percent = Satz auf diese Breite.
 * Steuer wird kumulativ aufgebaut: solange income reicht, wird die ganze
 * Stufenbreite mit dem Satz multipliziert; der Rest mit dem nächsten Satz.
 *
 * Workaround: wenn ZH-Tabelle taxes>0 hat, ist sie eigentlich BUND-Format.
 * Das wird vom Caller abgefangen (siehe calculateTaxes).
 */
function calcZuerich(income: number, tarif: TarifData): number {
  let taxes = 0;
  let remaining = income;
  for (const row of tarif.table) {
    const used = Math.min(remaining, row.amount);
    taxes += used * (row.percent / 100);
    remaining -= used;
    if (remaining <= 0) return taxes;
  }
  return taxes;
}

/**
 * FREIBURG-Format: kontinuierliche Interpolation des Satzes zwischen zwei
 * Stufen. Der finale Satz wird zwischen lastRow.percent und nextRow.percent
 * proportional zur Position des income innerhalb des Bands interpoliert,
 * dann auf das gesamte income angewandt.
 */
function calcFreiburg(income: number, tarif: TarifData): number {
  let lastRow: TarifTableItem | undefined;
  for (const row of tarif.table) {
    if (row.amount >= income) {
      if (!lastRow || lastRow.amount === 0) return 0;
      const lastAmount = lastRow.amount;
      const lastPercent = lastRow.percent;
      const percentDiff = row.percent - lastPercent;
      const partCount = row.amount - lastAmount;
      const partPercentage = partCount > 0 ? percentDiff / partCount : 0;
      const partDiff = income - lastAmount;
      const finalPercentage = partDiff * partPercentage + lastPercent;
      return income * (finalPercentage / 100);
    }
    lastRow = row;
  }
  // income ≥ höchste Stufe → letzten Satz nehmen
  if (lastRow) return income * (lastRow.percent / 100);
  return 0;
}

/**
 * FLATTAX-Format: ein einziger Satz für alle Einkommen.
 * Verwendet bei Gewinnsteuer/Kapitalsteuer einiger Kantone.
 */
function calcFlattax(income: number, tarif: TarifData): number {
  const row = tarif.table[0];
  return row ? income * (row.percent / 100) : 0;
}

/**
 * FORMEL-Format: mathematische Formel pro Stufe (z.B. logarithmisch in BS).
 * Implementiert einen kleinen Expression-Parser für die Formeln aus den
 * ESTV-Daten (Variablen: $wert$, Operatoren: +-*\/(), Funktion: log).
 */
function calcFormel(income: number, tarif: TarifData): number {
  let lastRow: TarifTableItem | undefined;
  for (const row of tarif.table) {
    if (row.amount <= income) lastRow = row;
    else break;
  }
  if (!lastRow || !lastRow.formula || lastRow.formula.trim() === "") return 0;
  const result = evaluateFormula(lastRow.formula, income);
  return Number.isFinite(result) ? Math.max(0, result) : 0;
}

function evaluateFormula(formula: string, wert: number): number {
  const tokens = tokenize(formula, wert);
  const ctx = { pos: 0 };
  const result = parseExpr(tokens, ctx);
  return result;
}

function tokenize(formula: string, wert: number): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < formula.length) {
    const c = formula[i] ?? "";
    if (c === " " || c === "\t") {
      i++;
    } else if (c === "$") {
      const end = formula.indexOf("$", i + 1);
      if (end === -1) throw new Error(`Unterminated variable: ${formula}`);
      const name = formula.substring(i + 1, end);
      if (name !== "wert") throw new Error(`Unknown variable '${name}'`);
      tokens.push(String(wert));
      i = end + 1;
    } else if (formula.substring(i, i + 3) === "log") {
      tokens.push("log");
      i += 3;
    } else if ("+-*/()".includes(c)) {
      tokens.push(c);
      i++;
    } else if (/[\d.]/.test(c)) {
      let num = "";
      while (i < formula.length && /[\d.]/.test(formula[i] ?? "")) {
        num += formula[i];
        i++;
      }
      tokens.push(num);
    } else {
      throw new Error(`Unexpected char '${c}' in formula: ${formula}`);
    }
  }
  return tokens;
}

function parseExpr(tokens: string[], ctx: { pos: number }): number {
  let left = parseTerm(tokens, ctx);
  while (
    ctx.pos < tokens.length &&
    (tokens[ctx.pos] === "+" || tokens[ctx.pos] === "-")
  ) {
    const op = tokens[ctx.pos++]!;
    const right = parseTerm(tokens, ctx);
    left = op === "+" ? left + right : left - right;
  }
  return left;
}

function parseTerm(tokens: string[], ctx: { pos: number }): number {
  let left = parseUnary(tokens, ctx);
  while (
    ctx.pos < tokens.length &&
    (tokens[ctx.pos] === "*" || tokens[ctx.pos] === "/")
  ) {
    const op = tokens[ctx.pos++]!;
    const right = parseUnary(tokens, ctx);
    left = op === "*" ? left * right : left / right;
  }
  return left;
}

function parseUnary(tokens: string[], ctx: { pos: number }): number {
  if (tokens[ctx.pos] === "-") {
    ctx.pos++;
    return -parsePrimary(tokens, ctx);
  }
  return parsePrimary(tokens, ctx);
}

function parsePrimary(tokens: string[], ctx: { pos: number }): number {
  const token = tokens[ctx.pos];
  if (token === "log") {
    ctx.pos++;
    return Math.log(parsePrimary(tokens, ctx));
  }
  if (token === "(") {
    ctx.pos++;
    const value = parseExpr(tokens, ctx);
    if (tokens[ctx.pos] !== ")") throw new Error("Missing closing paren");
    ctx.pos++;
    return value;
  }
  const num = parseFloat(token!);
  if (isNaN(num)) throw new Error(`Expected number but got '${token}'`);
  ctx.pos++;
  return num;
}

/**
 * Hauptfunktion: berechnet die einfache Steuer (vor Steuerfuss-Multiplikator)
 * für einen gegebenen Tarif und ein steuerbares Einkommen / Vermögen.
 */
export function calculateTaxes(amount: number, tarif: TarifData): number {
  if (amount <= 0) return 0;

  // ZUERICH-Workaround: wenn taxes>0 in irgendeiner Zeile, dann ist es
  // eigentlich BUND-Format (siehe devbrains-Code).
  let effectiveType: TableType = tarif.tableType;
  if (
    tarif.tableType === "ZUERICH" &&
    tarif.table.some((t) => t.taxes > 0)
  ) {
    effectiveType = "BUND";
  }

  switch (effectiveType) {
    case "BUND":
      return calcBund(amount, tarif);
    case "ZUERICH":
      return calcZuerich(amount, tarif);
    case "FLATTAX":
      return calcFlattax(amount, tarif);
    case "FREIBURG":
      return calcFreiburg(amount, tarif);
    case "FORMEL":
      return calcFormel(amount, tarif);
    default:
      throw new Error(`Unknown tableType: ${tarif.tableType}`);
  }
}

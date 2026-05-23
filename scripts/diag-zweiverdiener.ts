/* eslint-disable */
/**
 * Diagnose: Non-monotone Einkommenssteuer Stanojevic 2026 vs 2027.
 *
 * Direkter Call von steuerProJahr mit den 2026-/2027-Inputs (rekonstruiert
 * aus cashflow.ts L719-751). Loggt alle Abzüge + steuerbares Einkommen.
 */

import { steuerProJahr, type SteuerInput } from "../src/engine/steuer";

const EIGENMIETWERT = 11_300;
const SCHULDZINSEN = 7_348;

const input2026: SteuerInput = {
  einkommenJahr: 62_000 + 16_800,
  vermoegenJahr: 0,
  kapAuszahlungenJahr: 0,
  kanton: "AR",
  religion: "andere",
  fallart: "paar",
  jahr: 2026,
  bruttoErwerbP1: 62_000,
  bruttoErwerbP2: 16_800,
  alterP1: 63,
  alterP2: 58,
  anzahlKinder: 0,
  saeule3aEinzahlungJahr: 7_258 + 1_800 + 1_800,
  pkEinkaufJahr: 0,
  hatPkAnschlussP1: true,
  hatPkAnschlussP2: true,
  einkommenIstNetto: true,
  eigenmietwertJahr: EIGENMIETWERT,
  schuldzinsenJahr: SCHULDZINSEN,
  ankerSteuernHeute: null,
  ankerEinkommenHeute: null,
};

const input2027: SteuerInput = {
  einkommenJahr: 62_000,
  vermoegenJahr: 0,
  kapAuszahlungenJahr: 0,
  kanton: "AR",
  religion: "andere",
  fallart: "paar",
  jahr: 2027,
  bruttoErwerbP1: 62_000,
  bruttoErwerbP2: 0,
  alterP1: 64,
  alterP2: 59,
  anzahlKinder: 0,
  saeule3aEinzahlungJahr: 7_258 + 1_800 + 1_800,
  pkEinkaufJahr: 0,
  hatPkAnschlussP1: true,
  hatPkAnschlussP2: false,
  einkommenIstNetto: true,
  eigenmietwertJahr: EIGENMIETWERT,
  schuldzinsenJahr: SCHULDZINSEN,
  ankerSteuernHeute: null,
  ankerEinkommenHeute: null,
};

function logCase(name: string, inp: SteuerInput) {
  const out = steuerProJahr(inp);
  const dbg = out.abzuegeDbg!;
  const kt = out.abzuegeKanton!;
  console.log(`\n=== ${name} ===`);
  console.log(`bruttoErwerbP1/P2:     ${inp.bruttoErwerbP1} / ${inp.bruttoErwerbP2}`);
  console.log(`Eigenmietwert:         ${inp.eigenmietwertJahr ?? 0}`);
  console.log(`Schuldzinsen:          ${inp.schuldzinsenJahr ?? 0}`);
  console.log(`-- DBG (Bund) --`);
  console.log(`  bruttoTotal          ${dbg.bruttoTotal}`);
  console.log(`  berufsauslagen P1/P2 ${dbg.berufsauslagenP1} / ${dbg.berufsauslagenP2}`);
  console.log(`  versicherung         ${dbg.versicherungspraemien}`);
  console.log(`  3a                   ${dbg.saeule3aAbzug}`);
  console.log(`  doppelverdiener      ${dbg.doppelverdienerabzug}`);
  console.log(`  TOTAL Abzüge         ${dbg.total}`);
  console.log(`-- Kanton (AR) --`);
  console.log(`  versicherung         ${kt.versicherungspraemien}`);
  console.log(`  doppelverdiener      ${kt.doppelverdienerabzug}`);
  console.log(`  TOTAL Abzüge         ${kt.total}`);
  console.log(`-- Resultat --`);
  console.log(`  steuerbarBund        ${out.steuerbaresEinkommenBund}`);
  console.log(`  steuerbarKanton      ${out.steuerbaresEinkommenKanton}`);
  console.log(`  einkommenBund        ${out.einkommenBund}`);
  console.log(`  einkommenKanton      ${out.einkommenKanton}`);
  console.log(`  einkommen TOTAL      ${out.einkommen}`);
  return out;
}

const r26 = logCase("2026 — Mili + Dusica (Halbjahr)", input2026);
const r27 = logCase("2027 — nur Mili", input2027);

console.log(`\n=== MONOTONIE-CHECK ===`);
console.log(`2026 Einkommenssteuer: ${r26.einkommen}`);
console.log(`2027 Einkommenssteuer: ${r27.einkommen}`);
console.log(`Diff 2026-2027:        ${r26.einkommen - r27.einkommen}`);
console.log(`Taxware 2026:          9'360`);
console.log(`Taxware 2027:          6'228`);
if (r26.einkommen < r27.einkommen) {
  console.log(`!!! BUG: 2026 < 2027 trotz höherem Einkommen !!!`);
}

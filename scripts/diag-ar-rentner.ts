/* eslint-disable */
/**
 * Diagnostik: AR-Rentner-Paar mit pure AHV-Ehepaarrente 43'326 in Waldstatt.
 * Zeigt das gesamte Abzugs-Detail + steuerbares Einkommen + Bund/Kanton-Split.
 *
 * Hintergrund: Stanojevic-Vergleich (Jahre 2034-2050) zeigt:
 *   Cuira  Einkommenssteuer 3'097 CHF / Jahr
 *   Taxware                 2'135 CHF / Jahr
 *   Δ +962 CHF (+45 %)
 *
 * Inputs (mirror der Stanojevic-Konfig nach 2034, beide pensioniert):
 *   - fallart: paar, zivilstand: verheiratet
 *   - Wohnsitz: Waldstatt (AR)
 *   - Religion: andere (0 % Kirche)
 *   - Alter P1 75-87, Alter P2 70-82 (irrelevant für Tarif, relevant für DBG-Rentner-Pauschale wenn vorhanden)
 *   - einkommenIstNetto: true (keine Sozial-/BVG-Abzüge)
 *   - bruttoErwerbP1/P2 = 0 (keine Erwerbstätigkeit)
 *   - AHV-Rente fliesst über einkommenJahr = 43'326 als nichtErwerb ein
 */
import { steuerProJahr } from "../src/engine/steuer";

// BfsID Waldstatt = 3007 (offizielle Schweizer BFS-Gemeinde-Nr.)
// Stanojevic-Script setzt gemeindeBfsId=null → cashflow.ts überspringt bfsId
// → Engine fällt auf Hauptort Herisau (3001) zurück (Steuerfuss 4.10 Gemeinde).
const BFS_WALDSTATT = 3007;

const result = steuerProJahr({
  einkommenJahr: 43_326,
  vermoegenJahr: 0,
  kapAuszahlungenJahr: 0,
  kanton: "AR",
  bfsId: BFS_WALDSTATT,
  religion: "andere",
  fallart: "paar",
  jahr: 2034,
  bruttoErwerbP1: 0,
  bruttoErwerbP2: 0,
  alterP1: 75,
  alterP2: 70,
  anzahlKinder: 0,
  saeule3aEinzahlungJahr: 0,
  hatPkAnschlussP1: false,
  hatPkAnschlussP2: false,
  einkommenIstNetto: true,
});

console.log("=== AR-Rentner-Diagnostik (Stanojevic 2034+) ===");
console.log(`Einkommen brutto  : 43'326 (pure AHV-Ehepaarrente)`);
console.log(`Kanton/Gemeinde   : AR / Waldstatt (BfsID ${BFS_WALDSTATT})`);
console.log(`Fallart           : paar (verheiratet)`);
console.log(`Religion          : andere (0 % Kirche)`);
console.log("");
console.log("== Abzüge DBG (Bund) ==");
console.log(JSON.stringify(result.abzuegeDbg, null, 2));
console.log("");
console.log("== Abzüge Kanton (AR) ==");
console.log(JSON.stringify(result.abzuegeKanton, null, 2));
console.log("");
console.log("== Steuerbares Einkommen ==");
console.log(`  Bund   : ${result.steuerbaresEinkommenBund}`);
console.log(`  Kanton : ${result.steuerbaresEinkommenKanton}`);
console.log("");
console.log("== Steuern ==");
console.log(`  Einkommen Bund       : ${result.einkommenBund} CHF`);
console.log(`  Einkommen Kt/Gem/Kir : ${result.einkommenKanton} CHF`);
console.log(`  Einkommen TOTAL      : ${result.einkommen} CHF`);
console.log("");
console.log(`Taxware-Referenz: 2'135 CHF (Δ +${result.einkommen - 2135})`);

// ── Zusätzliche Validierung: was passiert ohne einkommenIstNetto-Flag? ──
console.log("\n=== Variante: ohne einkommenIstNetto-Flag (alt) ===");
const v2 = steuerProJahr({
  einkommenJahr: 43_326,
  vermoegenJahr: 0,
  kapAuszahlungenJahr: 0,
  kanton: "AR",
  bfsId: BFS_WALDSTATT,
  religion: "andere",
  fallart: "paar",
  jahr: 2034,
});
console.log(`  Einkommen TOTAL: ${v2.einkommen} CHF`);
console.log(`  steuerbarBund: ${v2.steuerbaresEinkommenBund}`);
console.log(`  steuerbarKanton: ${v2.steuerbaresEinkommenKanton}`);

// ── Lookup BfsID Waldstatt ──
import { findFactor } from "../src/engine/steuer-engine/data";
console.log("\n=== Factor-Lookup Waldstatt ===");
const factor = findFactor(3, 2025, BFS_WALDSTATT); // AR cantonId=3
console.log(JSON.stringify(factor, null, 2));

// ── Tarif-Lookup AR Verheiratet ──
import { getTarifs } from "../src/engine/steuer-engine/data";
const ts = getTarifs(3, 2025);
console.log("\n=== AR Tarif-Übersicht 2025 ===");
for (const t of ts) {
  console.log(`  taxType: ${t.taxType}, group: ${t.group}, splitting: ${t.splitting}, tableType: ${t.tableType}, rows: ${t.table.length}`);
}

// ── Variante: WIE cashflow.ts es aufruft (mit bruttoErwerbP1/P2=0) ──
console.log("\n=== Variante 3: bruttoErwerbP1/P2 nicht gesetzt (undefined) ===");
const v3 = steuerProJahr({
  einkommenJahr: 43_326,
  vermoegenJahr: 0,
  kapAuszahlungenJahr: 0,
  kanton: "AR",
  bfsId: BFS_WALDSTATT,
  religion: "andere",
  fallart: "paar",
  jahr: 2034,
  // bruttoErwerbP1/P2 NOT set — same as cashflow.ts when both pensioniert
  alterP1: 75,
  alterP2: 70,
  anzahlKinder: 0,
  saeule3aEinzahlungJahr: 0,
  pkEinkaufJahr: 0,
  hatPkAnschlussP1: false,
  hatPkAnschlussP2: false,
  einkommenIstNetto: true,
});
console.log(`Einkommen TOTAL: ${v3.einkommen} CHF`);
console.log(`steuerbarBund: ${v3.steuerbaresEinkommenBund}`);
console.log(`steuerbarKanton: ${v3.steuerbaresEinkommenKanton}`);
console.log("abzuegeDbg:", v3.abzuegeDbg);
console.log("abzuegeKanton:", v3.abzuegeKanton);

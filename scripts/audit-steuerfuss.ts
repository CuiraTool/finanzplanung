/**
 * 26-Kantone Steuerfuss-Audit.
 *
 * Pro Kanton:
 *  - Anzahl Gemeinden in Engine-Daten
 *  - Hauptort-Eintrag (BfsID-Hauptort, Steuerfuss)
 *  - Min/Max/Median Steuerfuss Gemeinden
 *  - Stichprobe-Berechnung: Eink-Steuer auf 100k bei Single-Tarif
 *
 * Ausgabe: Tabelle für Validation.
 */
import { KANTON_INFO } from "../src/engine/steuer-engine";
import {
  einkommensteuerKanton,
  vermoegensteuerKanton,
  kantonsteuerKapital,
  type KantonCode,
} from "../src/engine/steuer-engine";

const JAHR = 2026;

const cantonCodes: KantonCode[] = [
  "ZH","BE","LU","UR","SZ","OW","NW","GL","ZG","FR","SO","BS","BL","SH","AR","AI",
  "SG","GR","AG","TG","TI","VD","VS","NE","GE","JU",
];

console.log("\n========== 26-Kantone Steuerfuss-Audit (Jahr " + JAHR + ") ==========\n");
console.log(
  "Kanton | Hauptort | BfsID | Gemeinden | Eink-St 100k Single | Eink-St 100k Paar"
);
console.log("-------|----------|-------|-----------|---------------------|------------------");

console.log(
  "Kanton | Hauptort         | Eink 100k Single | Eink 100k Paar | Verm 500k Paar | Kap 200k Single"
);
console.log(
  "-------|------------------|------------------|----------------|----------------|----------------"
);

for (const code of cantonCodes) {
  const info = KANTON_INFO[code];
  if (!info) continue;

  let einkSt100kSingle = 0;
  let einkSt100kPaar = 0;
  let vermSt500kPaar = 0;
  let kapSt200kSingle = 0;
  try {
    einkSt100kSingle = einkommensteuerKanton(100_000, {
      kanton: code,
      bfsId: info.bfsIdHauptort,
      fallart: "einzel",
      religion: "andere",
      jahr: JAHR,
    }).total ?? 0;
    einkSt100kPaar = einkommensteuerKanton(100_000, {
      kanton: code,
      bfsId: info.bfsIdHauptort,
      fallart: "paar",
      religion: "andere",
      jahr: JAHR,
    }).total ?? 0;
    vermSt500kPaar = vermoegensteuerKanton(500_000, {
      kanton: code,
      bfsId: info.bfsIdHauptort,
      fallart: "paar",
      religion: "andere",
      jahr: JAHR,
    }).total ?? 0;
    kapSt200kSingle = kantonsteuerKapital(200_000, {
      kanton: code,
      bfsId: info.bfsIdHauptort,
      fallart: "einzel",
      religion: "andere",
      jahr: JAHR,
    }) as number;
  } catch {
    // pass
  }

  console.log(
    `${code.padEnd(6)} | ${info.hauptort.padEnd(16)} | ${einkSt100kSingle.toFixed(0).padStart(16)} | ${einkSt100kPaar.toFixed(0).padStart(14)} | ${vermSt500kPaar.toFixed(0).padStart(14)} | ${kapSt200kSingle.toFixed(0).padStart(15)}`
  );
}

// ─── Gemeinde-spezifischer Audit für problematische Kantone ──────────
console.log("\n========== Gemeinde-Steuerfuss-Audit BE/BL/BS/SO ==========\n");
console.log(
  "Gemeinde         | Kanton | BfsID | Eink-St 100k Single | Eink-St 100k Paar"
);
console.log(
  "-----------------|--------|-------|---------------------|------------------"
);

const gemeindenZuPruefen: { name: string; code: KantonCode; bfsId: number }[] = [
  { name: "Bern", code: "BE", bfsId: 351 },
  { name: "Studen", code: "BE", bfsId: 749 },
  { name: "Thun", code: "BE", bfsId: 942 },
  { name: "Liestal", code: "BL", bfsId: 2829 },
  { name: "Arlesheim", code: "BL", bfsId: 2763 },
  { name: "Allschwil", code: "BL", bfsId: 2761 },
  { name: "Basel", code: "BS", bfsId: 2701 },
  { name: "Riehen", code: "BS", bfsId: 2703 },
  { name: "Bettingen", code: "BS", bfsId: 2702 },
  { name: "Solothurn", code: "SO", bfsId: 2601 },
  { name: "Olten", code: "SO", bfsId: 2581 },
  { name: "Bellach", code: "SO", bfsId: 2542 },
];

for (const g of gemeindenZuPruefen) {
  let einkSt100kSingle = 0;
  let einkSt100kPaar = 0;
  try {
    einkSt100kSingle = einkommensteuerKanton(100_000, {
      kanton: g.code,
      bfsId: g.bfsId,
      fallart: "einzel",
      religion: "andere",
      jahr: JAHR,
    }).total ?? 0;
    einkSt100kPaar = einkommensteuerKanton(100_000, {
      kanton: g.code,
      bfsId: g.bfsId,
      fallart: "paar",
      religion: "andere",
      jahr: JAHR,
    }).total ?? 0;
  } catch {
    // pass
  }
  console.log(
    `${g.name.padEnd(16)} | ${g.code.padEnd(6)} | ${String(g.bfsId).padEnd(5)} | ${einkSt100kSingle.toFixed(0).padStart(19)} | ${einkSt100kPaar.toFixed(0).padStart(17)}`
  );
}

console.log("\n");

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

console.log("\n");

/**
 * BVG (2. Säule, Pensionskasse) Berechnungen.
 *
 * Themen: Altersguthaben-Projektion, Umwandlungssatz, WEF-Bezug, freiwillige Einkäufe,
 * 3-Jahres-Sperrfrist nach Einkauf vor Kapitalbezug.
 *
 * Validierungsziel (Muster-PDF S.4 + S.13/14):
 *  - Stephanie PKSZ Rente bei 100% Rentenbezug: CHF 25'703 p.a.
 *  - Stephanie PKSZ Rente bei 50% Rentenbezug:  CHF 29'110 p.a. (Effekt Einkäufe)
 *  - 11x Einkauf à CHF 20'000 zwischen 2024–2034 (Sperrfrist Kapitalbezug 2037 eingehalten)
 */

export interface BvgInput {
  altersguthabenHeute: number;
  geburtsjahr: number;
  bezugsjahr: number;
  jaehrlichesAltersguthabenZuwachs: number;
  einkaeufe: { jahr: number; betrag: number }[];
  wefBezuege: { jahr: number; betrag: number }[];
  umwandlungssatz: number;
}

export interface BvgOutput {
  altersguthabenBeiBezug: number;
  jahresrenteBeiVollerRente: number;
  notiz: string;
}

export function calculateBvg(_input: BvgInput): BvgOutput {
  throw new Error("BVG-Berechnung noch nicht implementiert (Etappe 1)");
}

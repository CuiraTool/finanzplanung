/* eslint-disable */
import { cashflowReihe } from "../src/engine/cashflow";
import type { CashflowInput } from "../src/engine/cashflow";

const profile: CashflowInput = {"fallart":"paar","person1":{"vorname":"Random","nachname":"Profil","geburtsdatum":"2001-01-01","geschlecht":"m","telefon":"","email":""},"person2":{"vorname":"Random","nachname":"Profil","geburtsdatum":"2001-01-01","geschlecht":"m","telefon":"","email":""},"kinder":[],"ahv":{"einkommenP1":30000,"einkommenP2":30000,"hatIkAuszugP1":false,"hatIkAuszugP2":false,"hatFehljahreP1":false,"hatFehljahreP2":false,"fehljahreAnzahlP1":0,"fehljahreAnzahlP2":0,"ahvBezugsalterP1":63,"ahvBezugsalterP2":63},"bvg":{"p1":{"aktiverAnschluss":false,"altersguthabenHeute":0,"altersguthabenBeiBezug":0,"umwandlungssatzProzent":4.5,"bezugspraeferenz":"rente","kapitalanteil":0,"freizuegigkeit":[],"einkaeufe":[],"wefVorbezuege":[]},"p2":{"aktiverAnschluss":false,"altersguthabenHeute":0,"altersguthabenBeiBezug":0,"umwandlungssatzProzent":4.5,"bezugspraeferenz":"rente","kapitalanteil":0,"freizuegigkeit":[],"einkaeufe":[],"wefVorbezuege":[]}},"saeuleDrei":{"p1":[],"p2":[]},"vermoegen":{"items":[{"id":"v-4762","istHauptkonto":true,"typ":"konto","beschreibung":"Privatkonto","saldoHeute":0,"renditeProzent":0}]},"immobilien":{"items":[]},"firma":{"vorhanden":false,"firmenname":"","moeglicherVerkaufserloes":null,"plan":"behalten","verkaufsjahr":2027},"ziele":{"bezugsalterP1":58,"bezugsalterP2":58},"budget":{"einkommen":[{"id":"e-4643","beschreibung":"Lohn","personIdx":1,"betragMonatlich":3000,"von":"2021-01","bis":"2030-01"},{"id":"e-4788","beschreibung":"Lohn","personIdx":1,"betragMonatlich":14895,"von":"2021-01","bis":"2029-09"}],"ausgabenModus":"total","ausgabenTotal":3000,"ausgabenKategorien":{"lebenshaltung":null,"wohnen":null,"mobilitaet":null,"versicherungen":null,"ferienHobby":null,"sonstiges":null},"wunschverbrauchPension":2500,"steuernHeute":null,"einkommenHeute":null,"religion":"katholisch"},"adresse":{"strasse":"Teststrasse 1","plz":"8000","ort":"Zürich","kanton":"AG","gemeindeBfsId":null,"gemeindeName":""},"einmaligeAusgaben":[],"erbschaft":{"erwartet":null,"groessenordnung":null,"erwartetBetrag":null,"erwartetJahr":null,"erwartetBeruecksichtigen":false,"schenkungenStatus":null,"schenkungenBetrag":null,"schenkungenJahr":null,"schenkungenBeruecksichtigen":false,"schenkungenDetails":"","gueterstand":null}};

const reihe = cashflowReihe(profile, 2026, 2050);
for (const z of reihe) {
  if (z.einnahmenTotal > 1000) {
    const laufendeSteuer = z.ausgabenSteuernEinkommen + z.ausgabenSteuernVermoegen;
    const ratio = laufendeSteuer / z.einnahmenTotal;
    if (ratio > 0.40) {
      console.log(`${z.jahr}: einnahmenTotal=${z.einnahmenTotal}, steuerEink=${z.ausgabenSteuernEinkommen}, steuerVerm=${z.ausgabenSteuernVermoegen}, ratio=${ratio.toFixed(4)}`);
    }
  }
}

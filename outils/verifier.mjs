// =====================================================================
//  Lagon Arena — vérification du moteur (à lancer après avoir modifié les règles)
//      node outils/verifier.mjs
//  1. chaque mission du tutoriel doit ÉCHOUER avec son code et RÉUSSIR une fois corrigée ;
//  2. une même partie rejouée donne exactement le même résultat (déterminisme) ;
//  3. équilibrage : nombre moyen de nids des tortues d'entraînement selon la nouveauté.
// =====================================================================
import { simulate, MISSIONS, MISSIONS_AVANCEES, BOTS, TWISTS, CODE_DEPART } from "../js/engine.js";

const CORRECTIONS = {
  1: "def tour():\n    if algue_ici():\n        manger()\n    else:\n        aller_vers_algue()\n",
  2: "def tour():\n    if requin_proche():\n        fuir()\n    elif algue_ici():\n        manger()\n    else:\n        aller_vers_algue()\n",
  3: "def tour():\n    if sur_plage() and est_la_nuit():\n        pondre()\n    elif est_la_nuit():\n        aller_vers_plage()\n    elif algue_ici():\n        manger()\n    else:\n        aller_vers_algue()\n",
  4: "def tour():\n    if algue_ici() and not plastique_ici():\n        manger()\n    else:\n        aller_vers_algue()\n",
};
let ok = true;
console.log("1. Missions du tutoriel (graine 7)");
for (const M of MISSIONS) {
  const jouer = (code) => simulate({ joueurs: [{ id: "t", nom: "t", couleur: "#f00", code }], graine: 7, scenario: M.scenario });
  const a = jouer(M.code), b = jouer(CORRECTIONS[M.id]);
  const bon = !M.reussi(a) && M.reussi(b);
  ok &&= bon;
  console.log(`   ${bon ? "✔" : "✘"} Mission ${M.id} : code donné → ${M.reussi(a) ? "réussit (problème !)" : "échoue"} ; corrigé → ${M.reussi(b) ? "réussit" : "échoue (problème !)"}`);
}

console.log("1 bis. Missions du tutoriel avancé");
for (const M of MISSIONS_AVANCEES) {
  const jouer = (code) => simulate({ joueurs: [{ id: "t", nom: "t", couleur: "#f00", code }, ...M.autres], graine: 7, scenario: M.scenario });
  const a = jouer(M.code), b = jouer(M.solution);
  const bon = !M.reussi(a) && M.reussi(b);
  ok &&= bon;
  console.log(`   ${bon ? "✔" : "✘"} Mission ${M.id} : code donné → ${M.reussi(a) ? "réussit (problème !)" : "échoue"} ; solution → ${M.reussi(b) ? "réussit" : "échoue (problème !)"} (${M.bilan(b)})`);
}

console.log("2. Déterminisme");
const joueurs = BOTS.map((b, i) => ({ id: "j" + i, nom: b.nom, couleur: "#000", code: b.code }));
const r1 = JSON.stringify(simulate({ joueurs, graine: 123, twist: "tempete" }).resultats);
const r2 = JSON.stringify(simulate({ joueurs: [...joueurs].reverse(), graine: 123, twist: "tempete" }).resultats);
console.log(`   ${r1 === r2 ? "✔" : "✘"} même graine → même résultat, quel que soit l'ordre des joueurs`);
ok &&= r1 === r2;

console.log("3. Équilibrage : nids moyens sur 30 parties de 20 tortues (entre parenthèses : part des parties sans aucun nid)");
const codes = [...BOTS.map((b) => [b.nom, b.code]), ["Départ", CODE_DEPART]];
for (const tw of Object.keys(TWISTS)) {
  const tot = {}, zero = {};
  for (let g = 1; g <= 30; g++) {
    const js = [];
    for (let i = 0; i < 20; i++) { const [nom, code] = codes[i % codes.length]; js.push({ id: nom + i, nom, couleur: "#000", code }); }
    for (const t of simulate({ joueurs: js, graine: g * 977, twist: tw }).tortues) {
      (tot[t.nom] ||= []).push(t.nids); zero[t.nom] = (zero[t.nom] || 0) + (t.nids === 0);
    }
  }
  console.log(`   ${TWISTS[tw].icone} ${tw.padEnd(10)} ` + Object.entries(tot).map(([n, l]) => `${n} ${(l.reduce((a, b) => a + b, 0) / l.length).toFixed(1)} (${Math.round(100 * zero[n] / l.length)} % à 0)`).join(" · "));
}
console.log(ok ? "\nTout est bon ✔" : "\nAttention : au moins une vérification a échoué ✘");
process.exit(ok ? 0 : 1);

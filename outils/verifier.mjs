// =====================================================================
//  Lagon Arena — vérification du moteur (à lancer après avoir modifié les règles)
//      node outils/verifier.mjs
//  1. chaque mission du tutoriel doit ÉCHOUER avec son code et RÉUSSIR une fois corrigée ;
//  2. une même partie rejouée donne exactement le même résultat (déterminisme) ;
//  3. cartes aléatoires : jamais de blocage (zone fermée, cul-de-sac, départ mal placé…) ;
//  4. équilibrage : nombre moyen de nids des tortues d'entraînement selon la nouveauté.
// =====================================================================
import { simulate, MISSIONS, MISSIONS_AVANCEES, BOTS, TWISTS, CODE_DEPART, genererCarte, carteSansBlocage, CARTE_CLASSIQUE, W, H } from "../js/engine.js";

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
  const jouer = (code) => simulate({ joueurs: [{ id: "t", nom: "t", couleur: "#f00", code, equipe: M.equipe || 0 }, ...M.autres], graine: 7, scenario: M.scenario });
  const a = jouer(M.code), b = jouer(M.solution);
  const bon = !M.reussi(a) && M.reussi(b);
  ok &&= bon;
  console.log(`   ${bon ? "✔" : "✘"} Mission ${M.id} : code donné → ${M.reussi(a) ? "réussit (problème !)" : "échoue"} ; solution → ${M.reussi(b) ? "réussit" : "échoue (problème !)"} (${M.bilan(b)})`);
}

console.log("2. Déterminisme");
const joueurs = BOTS.map((b, i) => ({ id: "j" + i, nom: b.nom, couleur: "#000", code: b.code }));
const r1 = JSON.stringify(simulate({ joueurs, graine: 123, twist: "tempete" }).resultats);
const r2 = JSON.stringify(simulate({ joueurs: [...joueurs].reverse(), graine: 123, twist: "tempete" }).resultats);
console.log(`   ${r1 === r2 ? "✔" : "✘"} même graine → même résultat (et même carte aléatoire), quel que soit l'ordre des joueurs`);
ok &&= r1 === r2;
const v1a = JSON.stringify(simulate({ joueurs, graine: 123, twist: "calme", version: 1 }).resultats);
const v1b = JSON.stringify(simulate({ joueurs: [...joueurs].reverse(), graine: 123, twist: "calme", version: 1 }).resultats);
const carteV1 = simulate({ joueurs, graine: 123, version: 1 }).carte === CARTE_CLASSIQUE.lignes;
console.log(`   ${v1a === v1b && carteV1 ? "✔" : "✘"} version 1 (manches jouées avant les cartes aléatoires) : carte classique, résultat stable`);
ok &&= v1a === v1b && carteV1;
const leger = JSON.stringify(simulate({ joueurs, graine: 9, leger: true }).resultats) === JSON.stringify(simulate({ joueurs, graine: 9 }).resultats);
console.log(`   ${leger ? "✔" : "✘"} mode léger (estimation du bac à sable) = même résultat que la partie complète`);
ok &&= leger;

console.log("3. Cartes aléatoires : 3000 cartes (1 à 32 tortues) sans blocage, puis 400 parties jouées");
{
  let invalides = 0, replis = 0, mauvaisDeparts = 0;
  for (let g = 1; g <= 1000; g++) for (const n of [1, 12, 32]) {
    const C = genererCarte(g * 104729, n);
    if (C === CARTE_CLASSIQUE) { replis++; continue; }
    if (!carteSansBlocage(C)) invalides++;
    if (C.spawns.length !== n || C.spawns.some(([x, y]) => C.distPlage[y][x] === Infinity)) mauvaisDeparts++;
  }
  const b1 = invalides === 0 && mauvaisDeparts === 0 && replis === 0;
  console.log(`   ${b1 ? "✔" : "✘"} ${invalides} carte bloquante · ${mauvaisDeparts} départ mal placé · ${replis} repli sur la carte classique`);
  ok &&= b1;
  // parties : aucune tortue coincée, et une tortue qui fuit les requins atteint (presque) toujours une plage
  // (« presque » : avec 5 requins rapides, une tortue qui fuit sans jamais manger peut s'épuiser — c'est le jeu, pas un blocage)
  let coincees = 0, sansPlage = 0;
  const FUIT = "def tour():\n    if requin_proche() and not sur_plage():\n        fuir()\n    else:\n        aller_vers_plage()\n";
  const js = [...BOTS.map((b, i) => ({ id: "b" + i, nom: b.nom, couleur: "#000", code: b.code })), { id: "f", nom: "Fuit", couleur: "#000", code: FUIT }];
  const N = 400;
  for (let g = 1; g <= N; g++) {
    const sim = simulate({ joueurs: js, graine: g * 13, twist: Object.keys(TWISTS)[g % 6] });
    for (const t of sim.tortues) if (new Set(sim.traces[t.id].map((r) => r.x + "," + r.y)).size < 3) coincees++;
    if (!sim.traces.f.some((r) => r.capteurs && r.capteurs.sur_plage)) sansPlage++;
  }
  const b2 = coincees === 0 && sansPlage <= N / 100;
  console.log(`   ${b2 ? "✔" : "✘"} ${N} parties : ${coincees} tortue coincée · la tortue qui fuit atteint une plage dans ${(100 - 100 * sansPlage / N).toFixed(1)} % des parties (99 % au moins)`);
  ok &&= b2;
}

console.log("4. Équilibrage : nids moyens sur 30 parties de 20 tortues, cartes aléatoires (entre parenthèses : part des parties sans aucun nid)");
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

// =====================================================================
//  Lagon Arena — vérification du moteur (à lancer après avoir modifié les règles)
//      node outils/verifier.mjs
//  1. chaque mission du tutoriel doit ÉCHOUER avec son code et RÉUSSIR une fois corrigée ;
//  2. une même partie rejouée donne exactement le même résultat (déterminisme) ;
//  3. cartes aléatoires : jamais de blocage (zone fermée, cul-de-sac, départ mal placé…) ;
//  3 bis. lagons personnalisés : réglages appliqués, parties reproductibles, partie normale inchangée ;
//  3 ter. Panthéon : banc d'essai reproductible, copies refusées ; primitives toutes rangées par catégorie ;
//  3 quater. tests de la tortue : les 6 tortues types (pièges vus en classe) ont le bon verdict et la bonne
//         explication, aucune fausse alerte sur les bonnes tortues, le rapport ne conseille jamais d'ajouter pondre() déjà écrit ;
//  4. équilibrage : nombre moyen de nids des tortues d'entraînement selon la nouveauté.
// =====================================================================
import { simulate, MISSIONS, MISSIONS_AVANCEES, MISSIONS_PONTE, BOTS, BOT_PIRATE, TWISTS, CODE_DEPART, genererCarte, carteSansBlocage, CARTE_CLASSIQUE, W, H, rapport } from "../js/engine.js";
import { diagnostiquer } from "../js/moteur/diagnostic.js";
import { readFileSync } from "node:fs";

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

for (const M of MISSIONS_PONTE) {
  const jouer = (code) => simulate({ joueurs: [{ id: "t", nom: "t", couleur: "#f00", code }], graine: 7, scenario: M.scenario });
  const a = jouer(M.code), b = jouer(M.solution);
  const bon = !M.reussi(a) && M.reussi(b) && !diagnostiquer(M.code).tests.find((t) => t.id === M.test).ok;
  ok &&= bon;
  console.log(`   ${bon ? "✔" : "✘"} Mission ${M.id} : code donné → ${M.reussi(a) ? "réussit (problème !)" : "échoue"}, expliqué par le test « ${M.test} » ; solution → ${M.reussi(b) ? "réussit" : "échoue (problème !)"}`);
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

console.log("2 bis. Capteurs « choisir ses algues » (lagon construit à la main)");
{
  const sim = simulate({ joueurs: [{ id: "t", nom: "t", couleur: "#f00", code: "def tour():\n    se_cacher()\n" }], graine: 1,
    scenario: { energie: 8, requins: [[14, 6]], requinsFixes: true, plastiques: [], heureDepart: 8, ticks: 1, repousse: false,
      herbes: [[12, 6, 3], [6, 6, 5], [3, 3, 4]], spawns: { t: [10, 6] } } });
  const c = sim.traces.t[0].capteurs;
  const attendu = { requins_autour: 1, algues_autour: 2, requins_pres_algue: 1, distance_algue_sure: 4, algue_pres_plage: false, portions_algue: 3 };
  const faux = Object.entries(attendu).filter(([k, v]) => c[k] !== v).map(([k, v]) => `${k} = ${c[k]} au lieu de ${v}`);
  console.log(`   ${faux.length ? "✘ " + faux.join(", ") : "✔ requins_autour, algues_autour, requins_pres_algue, distance_algue_sure, algue_pres_plage, portions_algue"}`);
  ok &&= !faux.length;
}

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

console.log("3 bis. Lagons personnalisés (requins, plastique, nuit, corail, algues…)");
{
  const { normaliserLagon, reglesManche } = await import("../js/engine.js");
  const js = BOTS.map((b, i) => ({ id: "b" + i, nom: b.nom, couleur: "#000", code: b.code }));
  const n = (r) => r.resultats.map((x) => x.id + ":" + x.nids).join(",");
  const normale = n(simulate({ joueurs: js, graine: 31337, twist: "plastique" }));
  const b1 = normale === n(simulate({ joueurs: js, graine: 31337, twist: "plastique", lagon: {} })) && normale === n(simulate({ joueurs: js, graine: 31337, twist: "plastique", lagon: null }));
  console.log(`   ${b1 ? "✔" : "✘"} sans réglage, la partie est exactement la même qu'avant`); ok &&= b1;
  const L = { requins: 6, rapides: true, vision: 6, plastiques: 30, plastiqueHerbier: false, nuitDebut: 21, nuitFin: 4, coraux: 12, algues: 10 };
  const r = simulate({ joueurs: js, graine: 4242, twist: "calme", lagon: L }), f = r.frames[0];
  const carte = r.carte.join("");
  const b2 = f.requins.length === 6 && f.plastiques.length === 30 && (carte.match(/h/g) || []).length === 10 && JSON.stringify(reglesManche("calme", L).nuit) === "[21,4]"
    && n(r) === n(simulate({ joueurs: js, graine: 4242, twist: "calme", lagon: L }));
  console.log(`   ${b2 ? "✔" : "✘"} réglages appliqués (6 requins, 30 sacs, 10 touffes, nuit 21 h – 4 h) et partie reproductible`); ok &&= b2;
  const b3 = JSON.stringify(normaliserLagon({ requins: 99, vision: "3", rapides: "oui", algues: 1, inconnu: 4 })) === '{"requins":6,"vision":3,"algues":8}' && normaliserLagon({}) === null;
  console.log(`   ${b3 ? "✔" : "✘"} réglages hors bornes ramenés dans les bornes, réglages inconnus ignorés`); ok &&= b3;
  // debut_nuit(), fin_nuit(), vision_requin() suivent la manche (nouveauté et lagon personnalisé)
  const vus = (tw, lagon) => { const c = simulate({ joueurs: js, graine: 77, twist: tw, lagon }).traces.b0.find((x) => x.capteurs).capteurs; return [c.debut_nuit, c.fin_nuit, c.vision_requin].join("/"); };
  const b5 = vus("calme") === "19/6/4" && vus("nuits") === "20/5/4" && vus("affames") === "19/6/5" && vus("tempete") === "20/5/5" && vus("calme", { nuitDebut: 21, nuitFin: 4, vision: 2 }) === "21/4/2";
  console.log(`   ${b5 ? "✔" : "✘"} debut_nuit(), fin_nuit(), vision_requin() suivent la nouveauté et le lagon personnalisé`); ok &&= b5;
  let replis = 0, bloquees = 0;
  for (const opts of [{ coraux: 14, algues: 35 }, { coraux: 14, algues: 8 }, { coraux: 0, algues: 35 }]) for (let g = 0; g < 150; g++) {
    const C = genererCarte(5000 + g * 37, 24, opts); if (C === CARTE_CLASSIQUE) replis++; else if (!carteSansBlocage(C)) bloquees++;
  }
  const b4 = replis === 0 && bloquees === 0;
  console.log(`   ${b4 ? "✔" : "✘"} réglages extrêmes de corail et d'algues : 450 cartes, ${bloquees} bloquante, ${replis} repli sur la carte classique`); ok &&= b4;
}

console.log("3 ter. Panthéon et primitives");
{
  const { evaluerBanc, reperes, codeConnu, BANC } = await import("../js/pantheon.js");
  const { CAPTEURS, ACTIONS_INFO } = await import("../js/primitives.js");
  const a = await evaluerBanc(BOTS[4].code), b = await evaluerBanc(BOTS[4].code);
  const refs = await reperes();
  const b1 = a.moyenne === b.moyenne && a.nids.join() === b.nids.join() && a.nids.length === BANC.parties;
  console.log(`   ${b1 ? "✔" : "✘"} banc d'essai reproductible (${BANC.parties} parties) · repères : ${refs.map((r) => `${r.nom} ${r.moyenne}`).join(" · ")}`); ok &&= b1;
  const b2 = BOTS.every((x) => codeConnu(x.code + "\n# ma version\n")) && !codeConnu("def tour():\n    if sur_plage():\n        pondre()\n    else:\n        aller_vers_plage()\n");
  console.log(`   ${b2 ? "✔" : "✘"} copie d'une tortue d'entraînement refusée (même avec un commentaire), tortue inventée acceptée`); ok &&= b2;
  const sans = [...CAPTEURS, ...ACTIONS_INFO].filter((p) => !p.cat).map((p) => p.nom);
  console.log(`   ${sans.length ? "✘" : "✔"} toutes les primitives ont une catégorie${sans.length ? " (manque : " + sans.join(", ") + ")" : ""}`); ok &&= !sans.length;
}

console.log("3 quater. Tests de la tortue (verdict 🟢 🟠 🔴 et explications)");
{
  const T = (l) => "def tour():\n" + l.map((x) => "    " + x).join("\n") + "\n";
  // les pièges vus en classe : ce que doit dire le verdict (couleur + mots de l'explication)
  const TYPES = [
    ["A. deux if/else à la suite", T(["if algue_ici():", "    manger()", "else:", "    aller_vers_algue()", "if sur_plage() and est_la_nuit():", "    pondre()", "else:", "    aller_vers_plage()"]),
      "rouge", [/une seule action par tour/, /lignes 6 à 9/]],
    ["B. manger en premier", T(["if algue_ici():", "    manger()", "elif sur_plage() and est_la_nuit():", "    pondre()", "elif est_la_nuit():", "    aller_vers_plage()", "else:", "    aller_vers_algue()"]),
      "orange", [/ligne 2/, /premier vrai gagne/]],
    ["C. rentrer avant de pondre", T(["if est_la_nuit():", "    aller_vers_plage()", "elif sur_plage() and est_la_nuit():", "    pondre()", "elif algue_ici():", "    manger()", "else:", "    aller_vers_algue()"]),
      "rouge", [/ligne 4/, /ligne 2/, /premier vrai gagne/]],
    ["D. pondre sans la nuit", T(["if sur_plage():", "    pondre()", "elif algue_ici():", "    manger()", "else:", "    aller_vers_plage()"]),
      "orange", [/premier vrai gagne/]],
    ["E. des if séparés", T(["if est_la_nuit():", "    aller_vers_plage()", "if sur_plage():", "    pondre()", "if algue_ici():", "    manger()", "aller_vers_algue()"]),
      "rouge", [/trop tard/, /une seule chaîne/]],
    ["F. coup de pouce n° 1", T(["if sur_plage() and est_la_nuit():", "    pondre()", "elif est_la_nuit():", "    aller_vers_plage()", "elif algue_ici():", "    manger()", "else:", "    aller_vers_algue()"]),
      "vert", []],
    ["tortue de départ", CODE_DEPART, "rouge", [/pas de `pondre\(\)`/]],
  ];
  for (const [nom, code, couleur, mots] of TYPES) {
    const d = diagnostiquer(code), v = d.verdict;
    const bon = v.couleur === couleur && mots.every((m) => m.test(v.cause));
    ok &&= bon;
    console.log(`   ${bon ? "✔" : "✘"} ${nom} : ${v.icone} ${v.titre}${bon ? "" : ` (attendu : ${couleur}, ${mots.join(" ")}) · ${v.cause}`}`);
  }
  const dD = diagnostiquer(TYPES[3][1]).tests.find((t) => t.id === "repartir");
  const bD = !dD.ok && /refusé/.test(dD.raison) && /est_la_nuit/.test(dD.conseil);
  console.log(`   ${bD ? "✔" : "✘"} D : « le jour, sur la plage » explique que pondre() est refusé et propose est_la_nuit()`); ok &&= bD;

  // pas de fausse alerte : les bonnes tortues sont 🟢, sans remarque rouge ; Bulle (sans pondre) 🔴, Gourmande (mange la nuit) 🟠
  const { CODE_EXPERT, CODE_EQUIPE } = await import("../js/tuto-avance/strategies.js");
  const pouce = [...readFileSync(new URL("../js/pouce.js", import.meta.url), "utf8").matchAll(/code: `([^`]+)`/g)].map((m) => m[1].replace(/^\+/gm, ""));
  const bonnes = [...BOTS.slice(2), BOT_PIRATE].map((b) => [b.nom, b.code]).concat([["stratégie d'expert", CODE_EXPERT], ["stratégie d'équipe", CODE_EQUIPE], ["mission 3 corrigée", CORRECTIONS[3]]],
    MISSIONS_PONTE.map((M) => ["mission " + M.id + " corrigée", M.solution]), pouce.map((c, i) => [`coup de pouce ${i + 1}`, c]));
  const fausses = bonnes.filter(([, c]) => { const d = diagnostiquer(c); return d.verdict.couleur !== "vert" || d.remarques.some((r) => r.gravite === "rouge"); });
  const bulle = diagnostiquer(BOTS[0].code).verdict.couleur, gourmande = diagnostiquer(BOTS[1].code).verdict.couleur;
  const bF = !fausses.length && bulle === "rouge" && gourmande === "orange";
  console.log(`   ${bF ? "✔" : "✘"} aucune fausse alerte sur ${bonnes.length} bonnes tortues${fausses.length ? " (" + fausses.map(([n]) => n).join(", ") + ")" : ""} · Bulle ${bulle} · Gourmande ${gourmande}`); ok &&= bF;

  // le rapport de match ne conseille jamais d'ajouter pondre() quand il est écrit, et nomme une ligne
  const bots = BOTS.map((b, i) => ({ id: "bot" + i, nom: b.nom, couleur: "#888", code: b.code }));
  const mauvais = [];
  for (const [nom, code] of TYPES.slice(0, 5)) {
    const sim = simulate({ joueurs: [{ id: "moi", nom: "moi", couleur: "#fff", code }, ...bots], graine: 900001, twist: "calme" });
    const r = rapport(sim, "moi");
    const moi = sim.tortues.find((t) => t.id === "moi");   // (si elle a pondu puis perdu son nid, le conseil parle des requins : c'est juste)
    if (moi.nids === 0 && !moi.stats.pontes.length && (!/ligne/.test(r.conseils[0] || "") || /pas de `pondre\(\)`/.test(r.conseils.join(" ")))) mauvais.push(nom + " → " + r.conseils[0]);
  }
  console.log(`   ${mauvais.length ? "✘" : "✔"} rapport : la vraie cause, avec une ligne, jamais « ajoute pondre() » s'il est écrit${mauvais.length ? " : " + mauvais.join(" | ") : ""}`); ok &&= !mauvais.length;

  // assez rapide pour tourner à chaque frappe (le cache est contourné par un commentaire différent)
  const t0 = performance.now(); let n = 0;
  for (const [, code] of [...TYPES, ...bonnes]) { diagnostiquer(code + "\n# " + n++); }
  const ms = (performance.now() - t0) / n;
  console.log(`   ${ms < 50 ? "✔" : "✘"} ${ms.toFixed(1)} ms par analyse en moyenne (objectif : moins de 50 ms)`); ok &&= ms < 50;
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

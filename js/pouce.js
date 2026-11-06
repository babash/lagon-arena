// =====================================================================
//  Lagon Arena — « Coup de pouce » : l'amélioration suivante à faire,
//  d'après les TESTS de la tortue (une idée à la fois) : d'abord la faire pondre,
//  puis les requins, l'énergie, le plastique, et partir avant la nuit.
//  Chaque palier montre un programme complet, lignes nouvelles en vert.
// =====================================================================
import { colorer } from "./editor.js";
import { esc } from "./common.js";
import { diagnostiquer, enTexteRiche } from "./moteur/diagnostic.js";

const sansCommentaires = (code) => code.split("\n").map((l) => l.replace(/#.*$/, "")).join("\n");

// les lignes marquées « + » sont nouvelles ou modifiées par rapport au palier précédent
export const PALIERS = [
  {
    manque: (c) => !/pondre\s*\(/.test(c) || !/aller_vers_plage\s*\(/.test(c),
    test: "ponte",
    titre: "Ta tortue ne pond pas",
    pourquoi: "Sans <code>pondre()</code>, pas de point ! La nuit, elle doit aller sur la plage, puis pondre.",
    ou: "Ajoute les lignes vertes <b>en haut</b> (juste sous <code>def tour():</code>), puis change ton <code>if algue_ici()</code> en <code>elif algue_ici()</code>.",
    code: `def tour():
+    if sur_plage() and est_la_nuit():
+        pondre()
+    elif est_la_nuit():
+        aller_vers_plage()
+    elif algue_ici():
        manger()
    else:
        aller_vers_algue()`,
  },
  {
    manque: (c) => !/requin_proche\s*\(/.test(c),
    test: ["requin", "requin_algues"],
    titre: "Attention aux requins !",
    pourquoi: "Un requin qui t'attrape te renvoie au départ et te fait perdre <b>1 nid</b>. Le danger se teste <b>en premier</b>.",
    ou: "Ajoute les 2 lignes vertes <b>tout en haut</b>, et ton ancien premier <code>if</code> devient un <code>elif</code>.",
    code: `def tour():
+    if requin_proche():
+        fuir()
+    elif sur_plage() and est_la_nuit():
        pondre()
    elif est_la_nuit():
        aller_vers_plage()
    elif algue_ici():
        manger()
    else:
        aller_vers_algue()`,
  },
  {
    manque: (c) => !/energie\s*\(/.test(c),
    test: "fatiguee",
    titre: "Pas assez d'énergie pour pondre",
    pourquoi: "Pondre demande <b>6 ⚡</b>. Si ta tortue n'a pas assez d'énergie, elle attend pour rien sur la plage.",
    ou: "Ajoute <code>and energie() >= 6</code> aux deux lignes vertes : sans énergie, elle ira d'abord manger.",
    code: `def tour():
    if requin_proche():
        fuir()
+    elif sur_plage() and est_la_nuit() and energie() >= 6:
        pondre()
+    elif est_la_nuit() and energie() >= 6:
        aller_vers_plage()
    elif algue_ici():
        manger()
    else:
        aller_vers_algue()`,
  },
  {
    manque: (c) => !/plastique_ici\s*\(/.test(c),
    test: "plastique",
    titre: "Gare au plastique",
    pourquoi: "Un sac plastique ressemble à une algue : le manger fait perdre <b>3 ⚡</b>.",
    ou: "Change ta ligne qui mange : <code>and not plastique_ici()</code> veut dire « et <b>pas</b> de plastique ».",
    code: `def tour():
    if requin_proche():
        fuir()
    elif sur_plage() and est_la_nuit() and energie() >= 6:
        pondre()
    elif est_la_nuit() and energie() >= 6:
        aller_vers_plage()
+    elif algue_ici() and not plastique_ici():
        manger()
    else:
        aller_vers_algue()`,
  },
  {
    manque: (c) => !/heure\s*\(/.test(c),
    titre: "Partir avant la nuit",
    pourquoi: "La nuit ne dure pas longtemps : les meilleures tortues partent vers la plage <b>avant</b> la nuit, le ventre plein.",
    ou: "Ajoute les 2 lignes vertes <b>avant</b> la ligne qui mange.",
    code: `def tour():
    if requin_proche():
        fuir()
    elif sur_plage() and est_la_nuit() and energie() >= 6:
        pondre()
    elif est_la_nuit() and energie() >= 6:
        aller_vers_plage()
+    elif heure() >= 16 and energie() >= 9:
+        aller_vers_plage()
    elif algue_ici() and not plastique_ici():
        manger()
    else:
        aller_vers_algue()`,
  },
];

// pendant une manche en équipes : une idée d'entraide (après « pondre »)
export const PALIER_EQUIPE = {
  manque: (c) => !/donner\s*\(|aller_vers_equipiere\s*\(/.test(c),
  titre: "Aide ton équipe !",
  pourquoi: "En équipes, c'est le <b>total de l'équipe</b> qui compte. Une équipière sur la plage sans assez d'énergie ne peut pas pondre : donne-lui de l'énergie ! Et deux équipières <b>collées</b> sont protégées des requins.",
  ou: "Ajoute les 2 lignes vertes <b>tout en haut</b> (ton ancien premier <code>if</code> devient un <code>elif</code>).",
  code: `def tour():
+    if equipiere_fatiguee() and energie() >= 8:
+        donner()
    elif sur_plage() and est_la_nuit():
        pondre()
    elif est_la_nuit():
        aller_vers_plage()
    elif algue_ici():
        manger()
    else:
        aller_vers_algue()`,
};

// Un palier « manque » quand son test échoue (code lisible) ou, à défaut, quand le mot n'est pas écrit.
// Le premier palier (pondre) suit le verdict : 🔴 ou 🟠, on explique la vraie cause avant tout le reste.
export function coupDePouce(code, { equipe = false } = {}) {
  const c = sansCommentaires(code);
  const d = diagnostiquer(code);
  const liste = equipe ? [PALIERS[0], PALIER_EQUIPE, ...PALIERS.slice(1)] : PALIERS;
  const ids = (p) => [].concat(p.test);
  const rate = (p) => d.tests.some((t) => ids(p).includes(t.id) && !t.ok);
  const manque = (p) => {
    if (!d.ok) return p.manque(c);
    if (p === PALIERS[0]) return d.verdict.couleur !== "vert";
    if (p.test) return rate(p);
    return p.manque(c);
  };
  const i = liste.findIndex(manque);
  if (i < 0) return null;
  const p = { ...liste[i], numero: i + 1, total: liste.length };
  if (d.ok && i === 0) return { ...p, ...paliersPonte(d) };
  if (d.ok && p.test && !p.manque(c)) {
    // le mot est écrit, mais le test échoue : on dit pourquoi, avec les lignes de l'élève
    const t = d.tests.find((x) => ids(p).includes(x.id) && !x.ok);
    p.pourquoi = `${p.pourquoi}<br>${enTexteRiche(`${t.titre}, ${t.agit.replace(/^Ta tortue/, "ta tortue")} ${t.raison || ""}`)}`;
    if (t.conseil) p.ou = enTexteRiche(t.conseil);
  }
  return p;
}
// palier 1 sur mesure : la cause donnée par les tests, puis la bonne forme (une seule chaîne, dans l'ordre)
function paliersPonte(d) {
  const absente = d.cles[0].etat === "absente" || d.cles[1].etat === "absente";
  const structure = d.remarques.find((r) => r.type === "deux-blocs" || r.type === "if-separes");
  return {
    titre: d.verdict.couleur === "rouge" ? "Ta tortue ne pond pas" : "Ta tortue pond trop peu",
    pourquoi: enTexteRiche(d.verdict.cause),
    ou: absente
      ? PALIERS[0].ou
      : structure
        ? "Voici la bonne forme : <b>une seule chaîne</b> <code>if</code> / <code>elif</code> / <code>else</code>, dans l'ordre <b>pondre → rentrer la nuit → manger → chercher à manger</b>. Compare avec ton code."
        : "L'ordre des règles, c'est l'ordre des priorités : <b>pondre → rentrer la nuit → manger → chercher à manger</b>. Compare avec ton code.",
    code: absente ? PALIERS[0].code : PALIERS[0].code.replace(/^\+/gm, ""),
  };
}

export function coupDePouceHTML(code, opts = {}) {
  const p = coupDePouce(code, opts);
  if (!p) return `<div class="pouce"><h3>🌟 Ta tortue utilise déjà toutes les idées !</h3>
    <p>Pour aller plus loin : fais le <a href="tuto-avance.html" target="_blank"><b>🚀 tutoriel avancé</b></a> : 🥈 intermédiaire (distances, pousser une tortue sur un requin…), 🥇 expert (choisir ses algues), 👥 équipe. Puis active les <b>primitives avancées</b> sous l'éditeur.</p></div>`;
  const lignes = p.code.split("\n");
  const brut = lignes.map((l) => l.replace(/^\+/, ""));
  const col = colorer(brut.join("\n"));
  const html = col.map((l, i) => `<span class="l ${lignes[i].startsWith("+") ? "nouveau" : ""}"><span class="n">${lignes[i].startsWith("+") ? "+" : ""}</span>${l || " "}</span>`).join("");
  return `<div class="pouce">
    <div class="pouce-tete"><span class="pill sombre">Idée ${p.numero} / ${p.total}</span><h3>💡 ${esc(p.titre)}</h3></div>
    <p>${p.pourquoi}</p>
    <p>👉 ${p.ou}</p>
    <div class="codeview">${html}</div>
    <p class="petit muted">Écris-le toi-même (l'autocomplétion t'aide), puis teste ta tortue. Une fois l'idée ajoutée, le coup de pouce suivant apparaîtra.</p>
  </div>`;
}

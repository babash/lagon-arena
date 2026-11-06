// =====================================================================
//  Lagon Arena — moteur : les TESTS DE LA TORTUE (le « bilan de santé »)
//  On fait jouer UN tour du programme dans des situations clés et on compare
//  à ce qu'on attend. Quand c'est raté, on explique avec les lignes du code :
//  quelle ligne a agi, pourquoi, et pourquoi la bonne ligne n'a pas été atteinte
//  (« une seule action par tour », « le premier vrai gagne », condition fausse…).
//  On essaie aussi toutes les situations de débutant (≈ 5 000) pour savoir si
//  pondre(), aller_vers_plage(), manger() et aller_vers_algue() sont atteignables.
//  Module pur (aucun accès à la page) : sert à l'éditeur, au rapport, au coup de
//  pouce, au tutoriel et au vérificateur (node outils/verifier.mjs).
//  Les textes utilisent `code` et **gras** (voir enTexteRiche).
// =====================================================================
import { check, runTurn } from "../interp.js";
import { P, estNuit } from "./regles.js";

// ---------- les situations ----------
// valeurs par défaut de tous les capteurs (une tortue en pleine eau, à midi, sans danger)
export const SITUATION_BASE = {
  requin_proche: false, algue_ici: false, plastique_ici: false, sur_plage: false, est_la_nuit: false, energie: 8, heure: 12, debut_nuit: 19, fin_nuit: 6, vision_requin: 4,
  distance_algue: 4, distance_plage: 6, distance_requin: 9, tortue_a_cote: false, requin_derriere_tortue: false,
  mon_equipe: 1, mes_nids: 0, nids_voisine: 0, equipiere_a_cote: false, adversaire_a_cote: false, equipiere_fatiguee: false,
  requin_derriere_adversaire: false, nids_equipe: 0, nids_adversaires: 0,
  rang_equipe: 1, equipe_en_tete: true, equipe_rivale: 2, rivale_a_cote: false,
  requins_autour: 0, algues_autour: 2, requins_pres_algue: 0, distance_algue_sure: 4, algue_pres_plage: false, portions_algue: 5,
};

// une situation cohérente : terrain (plage, eau, algues, algues+plastique, eau+plastique), requin, heure, énergie…
export function situation({ terrain = "eau", requin = false, heure = 12, nuit = [19, 6], energie = 8, ...autres } = {}) {
  const s = { ...SITUATION_BASE, heure, energie, debut_nuit: nuit[0], fin_nuit: nuit[1] };
  s.sur_plage = terrain === "plage";
  s.algue_ici = terrain.startsWith("algues");
  s.plastique_ici = terrain.includes("plastique");
  s.est_la_nuit = estNuit(heure, nuit);
  s.distance_plage = s.sur_plage ? 0 : 6;
  s.distance_algue = s.algue_ici ? 0 : 4;
  s.requin_proche = requin;
  s.distance_requin = requin ? 2 : 9;
  s.requins_autour = requin ? 1 : 0;
  s.requins_pres_algue = requin && s.algue_ici ? 1 : 0;
  s.distance_algue_sure = s.algue_ici && !requin && !s.plastique_ici ? 0 : 4;
  return { ...s, ...autres };
}
export const enCapteurs = (sit) => Object.fromEntries(Object.entries({ ...SITUATION_BASE, ...sit }).map(([k, v]) => [k, () => v]));
export const unTour = (compiled, sit) => runTurn(compiled, enCapteurs(sit));

const NUIT = { heure: 22 }, JOUR = { heure: 12 };
const ALGUE = ["aller_vers_algue", "aller_vers_algue_libre"];

// Les tests. niveau « ponte » : sans eux, la tortue pond peu ou pas (❌) ;
// niveau « conseil » : pour aller plus loin (⚠️), ils ne changent pas la couleur du verdict.
export const TESTS = [
  { id: "ponte", niveau: "ponte", titre: "🌙 La nuit, sur la plage, 8 ⚡", sit: { ...NUIT, terrain: "plage", energie: 8 },
    attendu: ["pondre"], attenduTxt: "`pondre()`", regle: "`elif sur_plage() and est_la_nuit():` puis `pondre()`",
    siAbsent: "Ajoute la règle `elif sur_plage() and est_la_nuit():` puis `pondre()`, **au-dessus** de la règle qui mange." },
  { id: "rentrer", niveau: "ponte", titre: "🌙 La nuit, en pleine eau, 8 ⚡", sit: { ...NUIT, terrain: "eau", energie: 8 },
    attendu: ["aller_vers_plage"], attenduTxt: "`aller_vers_plage()`", regle: "`elif est_la_nuit():` puis `aller_vers_plage()`", sousPondre: true,
    siAbsent: "Ajoute la règle `elif est_la_nuit():` puis `aller_vers_plage()`, juste **sous** la règle de ponte." },
  { id: "rentrer_algues", niveau: "ponte", titre: "🌙 La nuit, sur des algues, 8 ⚡", sit: { ...NUIT, terrain: "algues", energie: 8 },
    attendu: ["aller_vers_plage"], attenduTxt: "`aller_vers_plage()`", regle: "`elif est_la_nuit():` puis `aller_vers_plage()`", sousPondre: true,
    siAbsent: "Ajoute la règle `elif est_la_nuit():` puis `aller_vers_plage()`, **au-dessus** de la règle qui mange." },
  { id: "manger", niveau: "ponte", titre: "☀️ Le jour, sur des algues, 5 ⚡", sit: { ...JOUR, terrain: "algues", energie: 5 },
    attendu: ["manger"], attenduTxt: "`manger()`", regle: "`elif algue_ici():` puis `manger()`",
    siAbsent: "Ajoute la règle `elif algue_ici():` puis `manger()`, juste avant le `else:`." },
  { id: "chercher", niveau: "ponte", titre: "☀️ Le jour, en pleine eau, 5 ⚡", sit: { ...JOUR, terrain: "eau", energie: 5 },
    attendu: ALGUE, attenduTxt: "`aller_vers_algue()`", regle: "`else:` puis `aller_vers_algue()`",
    siAbsent: "Termine par `else:` puis `aller_vers_algue()` : quand rien d'autre n'est vrai, elle va chercher à manger." },
  { id: "repartir", niveau: "ponte", titre: "☀️ Le jour, sur la plage, 5 ⚡", sit: { ...JOUR, terrain: "plage", energie: 5 },
    attendu: ALGUE, attenduTxt: "repartir manger : `aller_vers_algue()`", regle: "`else:` puis `aller_vers_algue()`",
    siAbsent: "Termine par `else:` puis `aller_vers_algue()` : le jour, elle repart manger.",
    siObtenu: {
      pondre: { raison: "Le jour, `pondre()` est **refusé** : elle reste sur la plage pour rien, et le soleil la fatigue.", conseil: "Ajoute `and est_la_nuit()` à la condition de la ligne {ligne}." },
      aller_vers_plage: { raison: "Elle est déjà sur la plage : elle y reste pour rien, et le soleil la fatigue.", conseil: "Le jour, elle doit repartir manger : vérifie la condition de la ligne {ligne}." },
    } },
  { id: "requin", niveau: "conseil", titre: "🦈 Un requin à 2 cases, en pleine eau", sit: { ...JOUR, terrain: "eau", energie: 8, requin: true },
    attendu: ["fuir"], attenduTxt: "`fuir()`", regle: "`if requin_proche():` puis `fuir()`",
    siAbsent: "Ajoute **tout en haut** `if requin_proche():` puis `fuir()` : le danger se teste en premier.",
    pourquoi: "Un requin qui t'attrape te fait perdre un nid." },
  { id: "requin_algues", niveau: "conseil", titre: "🦈 Un requin à 2 cases, sur des algues", sit: { ...JOUR, terrain: "algues", energie: 5, requin: true },
    attendu: ["fuir", "se_cacher"], attenduTxt: "`fuir()` ou `se_cacher()`", regle: "`if requin_proche():` puis `fuir()`",
    siAbsent: "Ajoute **tout en haut** `if requin_proche():` puis `fuir()` : le danger se teste en premier.",
    pourquoi: "Manger fait bouger les algues : le requin la repère." },
  { id: "plastique", niveau: "conseil", titre: "🛍️ Du plastique sur les algues, 5 ⚡", sit: { ...JOUR, terrain: "algues+plastique", energie: 5 },
    interdit: ["manger"], attenduTxt: "pas `manger()`", raison: "Ici, `manger()` lui fait avaler le sac plastique.",
    conseil: "Ajoute `and not plastique_ici()` à la condition de la ligne {ligne}.",
    pourquoi: "Avaler un sac plastique fait perdre 3 ⚡." },
  { id: "fatiguee", niveau: "conseil", titre: "🔋 La nuit, sur la plage, 3 ⚡ seulement", sit: { ...NUIT, terrain: "plage", energie: 3 },
    attendu: ALGUE, attenduTxt: "aller manger : `aller_vers_algue()`", regle: "`else:` puis `aller_vers_algue()`",
    siObtenu: {
      pondre: { raison: "Avec 3 ⚡, `pondre()` est **refusé** : elle attend sur la plage pour rien.", conseil: "Ajoute `and energie() >= 6` à la condition de la ligne {ligne} : sans assez d'énergie, elle ira d'abord manger." },
      aller_vers_plage: { raison: "Elle attend sur la plage sans pouvoir pondre (il faut 6 ⚡).", conseil: "Ajoute `and energie() >= 6` à la condition de la ligne {ligne}." },
    },
    siAbsent: "Termine par `else:` puis `aller_vers_algue()`.",
    pourquoi: "Pondre demande 6 ⚡." },
];

// ---------- lire le programme ----------
const PREC = { or: 1, and: 2, not: 3, cmp: 4 };
// une expression, réécrite comme l'élève l'a tapée (aux espaces près)
export function texte(e, parent = 0) {
  const p = (prec, s) => (prec < parent ? `(${s})` : s);
  switch (e.k) {
    case "num": return String(e.v);
    case "bool": return e.v ? "True" : "False";
    case "call": return e.name + "()";
    case "var": return e.name;
    case "not": return p(3, "not " + texte(e.a, 3));
    case "and": return p(2, texte(e.a, 2) + " and " + texte(e.b, 3));
    case "or": return p(1, texte(e.a, 1) + " or " + texte(e.b, 2));
    case "neg": return "-" + texte(e.a, 7);
    case "bin": { const pr = e.op === "+" || e.op === "-" ? 5 : 6; return p(pr, texte(e.a, pr) + ` ${e.op} ` + texte(e.b, pr + 1)); }
    case "cmp": return p(4, e.terms.map((t, i) => (i ? ` ${e.ops[i - 1]} ` : "") + texte(t, 5)).join(""));
  }
  return "?";
}
const capteursDe = (e, acc = new Set()) => {
  if (!e || typeof e !== "object") return acc;
  if (e.k === "call") acc.add(e.name);
  if (e.k === "var") acc.add("$" + e.name);
  for (const v of Object.values(e)) if (v && typeof v === "object") Array.isArray(v) ? v.forEach((x) => capteursDe(x, acc)) : capteursDe(v, acc);
  return acc;
};
// ce qu'on fait varier dans l'essai de toutes les situations (le reste garde sa valeur par défaut)
const VARIES = new Set(["requin_proche", "algue_ici", "plastique_ici", "sur_plage", "est_la_nuit", "energie", "heure"]);
const connue = (e) => [...capteursDe(e)].every((n) => VARIES.has(n));

const vrai = (v) => (typeof v === "boolean" ? v : v !== 0);
// valeur d'une expression dans une situation (undefined si elle utilise une variable)
function valeur(e, sit) {
  switch (e.k) {
    case "num": case "bool": return e.v;
    case "call": return sit[e.name];
    case "var": return undefined;
    case "not": { const a = valeur(e.a, sit); return a === undefined ? a : !vrai(a); }
    case "and": { const a = valeur(e.a, sit); return a === undefined || !vrai(a) ? a : valeur(e.b, sit); }
    case "or": { const a = valeur(e.a, sit); return a === undefined || vrai(a) ? a : valeur(e.b, sit); }
    case "neg": { const a = valeur(e.a, sit); return a === undefined ? a : -a; }
    case "bin": {
      const a = valeur(e.a, sit), b = valeur(e.b, sit);
      if (a === undefined || b === undefined) return undefined;
      const x = +a, y = +b;
      return { "+": x + y, "-": x - y, "*": x * y, "/": y ? x / y : undefined, "//": y ? Math.floor(x / y) : undefined, "%": y ? ((x % y) + y) % y : undefined }[e.op];
    }
    case "cmp": {
      let g = valeur(e.terms[0], sit);
      for (let i = 0; i < e.ops.length; i++) {
        const d = valeur(e.terms[i + 1], sit);
        if (g === undefined || d === undefined) return undefined;
        const a = +g, b = +d;
        const ok = { "<": a < b, "<=": a <= b, ">": a > b, ">=": a >= b, "==": a === b, "!=": a !== b }[e.ops[i]];
        if (!ok) return false;
        g = d;
      }
      return true;
    }
  }
}
const termesEt = (e) => (e.k === "and" ? [...termesEt(e.a), ...termesEt(e.b)] : [e]);

// toutes les actions et tous les if du programme, avec leur chemin depuis def tour()
function indexer(prog) {
  const actions = [], ifs = [];
  const derniere = (s) => {
    if (s.k !== "if") return s.line;
    const corps = s.elseBody || s.branches[s.branches.length - 1].body;
    return corps.length ? derniere(corps[corps.length - 1]) : s.elseLine || s.branches[0].line;
  };
  function parcourir(bloc, chemin) {
    bloc.forEach((s, i) => {
      const ici = [...chemin, { bloc, i }];
      if (s.k === "act") actions.push({ ...s, chemin: ici });
      else if (s.k === "if") {
        s.debut = s.branches[0].line; s.fin = derniere(s);
        ifs.push({ s, chemin: ici });
        s.branches.forEach((b, j) => parcourir(b.body, [...ici, { si: s, j }]));
        if (s.elseBody) parcourir(s.elseBody, [...ici, { si: s, j: -1 }]);
      }
    });
  }
  parcourir(prog, []);
  return { actions, ifs, derniere };
}
// un bloc qui fait TOUJOURS une action (une action seule, ou un if/elif/else dont chaque branche agit)
function agitToujours(bloc) {
  for (const s of bloc) {
    if (s.k === "act") return true;
    if (s.k === "return") return false;
    if (s.k === "if" && s.elseBody && s.branches.every((b) => agitToujours(b.body)) && agitToujours(s.elseBody)) return true;
  }
  return false;
}
const contientAction = (s) => s.k === "act" || (s.k === "if" && (s.branches.some((b) => b.body.some(contientAction)) || (s.elseBody || []).some(contientAction)));

// ---------- expliquer un tour ----------
const ligneCond = (entree) => (entree.j >= 0 ? entree.si.branches[entree.j].line : entree.si.elseLine);
// la ligne de la règle qui contient cette action (le if / elif / else juste au-dessus), ou l'action elle-même
const ligneRegle = (a) => { const e = [...a.chemin].reverse().find((x) => x.si); return e ? ligneCond(e) : a.line; };

function pourquoiAgit(a) {
  const conds = a.chemin.filter((x) => x.si);
  if (!conds.length) return "elle n'est dans aucun `if` : elle agit à chaque tour";
  return "parce que " + conds.map((x) => (x.j >= 0 ? `\`${texte(x.si.branches[x.j].cond)}\` est vrai` : `toutes les conditions du \`if\` ligne ${x.si.debut} sont fausses (c'est le \`else\`)`)).join(", et ");
}
// pourquoi la ligne de cette action n'a pas agi, d'après les conditions évaluées pendant le tour
function pourquoiPas(a, vals) {
  for (const x of a.chemin) {
    if (!x.si) continue;
    const n = x.j < 0 ? x.si.branches.length : x.j;
    for (let k = 0; k < n; k++) if (vals.get(x.si.branches[k].line) === true) return { type: "avant", br: x.si.branches[k] };
    if (x.j >= 0) {
      const v = vals.get(x.si.branches[x.j].line);
      if (v === false) return { type: "fausse", br: x.si.branches[x.j] };
      if (v === undefined) return { type: "nonLue" };
    }
  }
  return { type: "atteinte" };
}
function detailFaux(cond, sit) {
  const faux = termesEt(cond).filter((t) => { const v = valeur(t, sit); return v !== undefined && !vrai(v); });
  if (!faux.length) return `\`${texte(cond)}\` est faux`;
  return faux.map((t) => {
    const nombres = [...capteursDe(t)].filter((n) => typeof sit[n] === "number");
    return `\`${texte(t)}\` est faux` + (nombres.length ? ` (${nombres.map((n) => `${n}() vaut ${sit[n]}`).join(", ")})` : "");
  }).join(" et ");
}
const nomAct = (a) => `\`${a.name}()\` (ligne ${a.line})`;

// explique un test raté : ce qui agit, pourquoi l'action attendue n'agit pas, et quoi changer
function expliquer(an, test, sit, tr) {
  const vals = new Map(tr.conds);
  const A = tr.actionLine != null ? an.idx.actions.find((x) => x.line === tr.actionLine) : null;
  const out = { agit: "", raison: "", conseil: "", ligne: tr.actionLine, cible: null };
  if (tr.error) out.agit = `Ta tortue s'arrête sur une erreur : ${tr.error}`;
  else if (!A) out.agit = "Aucune règle ne s'applique : ta tortue **reste sur place**. Termine par un `else:` pour qu'elle ait toujours un ordre.";
  else out.agit = `Ta tortue fait ${nomAct(A)}, ${pourquoiAgit(A)}.`;

  if (test.attendu) {
    const cands = an.idx.actions.filter((x) => test.attendu.includes(x.name));
    if (!cands.length) { out.raison = `Il n'y a pas de \`${test.attendu[0]}()\` dans ton code.`; out.conseil = test.siAbsent || ""; return obtenu(out, test, A); }
    const extra = new Set(tr.extra.map(([l]) => l));
    const L = cands.find((x) => extra.has(x.line)) || cands.map((x) => ({ x, p: pourquoiPas(x, vals) })).sort((u, v) => ordreP(u.p) - ordreP(v.p))[0].x;
    out.cible = L.line;
    const p = extra.has(L.line) ? { type: "atteinte" } : pourquoiPas(L, vals);
    if (p.type === "atteinte") {
      out.raison = `La ligne ${L.line} \`${L.name}()\` est bien lue, mais **trop tard** : ta tortue fait **une seule action par tour**, la première.`;
      out.conseil = A && autreBloc(A, L)
        ? `Tes règles forment plusieurs blocs \`if\` à la suite. Relie-les en **une seule chaîne** \`if\` / \`elif\` / \`else\`, avec la règle de la ligne ${ligneRegle(L)} **avant** celle de la ligne ${ligneRegle(A)}.`
        : `Mets la règle de la ligne ${ligneRegle(L)} **avant** celle de la ligne ${A ? ligneRegle(A) : tr.actionLine}.`;
    } else if (p.type === "avant") {
      out.raison = `La ligne ${L.line} \`${L.name}()\` n'est même pas regardée : à la ligne ${p.br.line}, \`${texte(p.br.cond)}\` est vrai avant, et **le premier vrai gagne**.`;
      const dansElse = [...L.chemin].reverse().find((x) => x.si)?.j < 0;
      out.conseil = dansElse && test.regle
        ? `Ajoute la règle ${test.regle} **au-dessus** de la ligne ${p.br.line}.`
        : `Monte la règle de la ligne ${ligneRegle(L)} **au-dessus** de la ligne ${p.br.line}.`;
      if (test.sousPondre && an.idx.actions.some((x) => x.name === "pondre")) out.conseil += " Garde la règle de `pondre()` au-dessus d'elle.";
    } else if (p.type === "fausse") {
      out.raison = `La ligne ${L.line} \`${L.name}()\` n'agit pas : à la ligne ${p.br.line}, ${detailFaux(p.br.cond, sit)}.`;
      if (A && A.chemin[0].i < L.chemin[0].i && autreBloc(A, L)) out.raison += ` Et de toute façon, la ligne ${A.line} a déjà agi : une seule action par tour.`;
      out.conseil = test.siFausse || "";
    } else out.raison = `La ligne ${L.line} \`${L.name}()\` n'est pas atteinte.`;
  } else if (test.conseil && A) out.conseil = test.conseil.replace("{ligne}", ligneRegle(A));
  if (!test.attendu && test.raison) out.raison = test.raison;
  return obtenu(out, test, A);
}
// certains tests ont une explication sur mesure selon l'action obtenue (pondre() refusé le jour…)
function obtenu(out, test, A) {
  const o = A && test.siObtenu && test.siObtenu[A.name];
  if (o) { out.raison = o.raison; out.conseil = o.conseil.replace("{ligne}", ligneRegle(A)); }
  return out;
}
const ordreP = (p) => ({ avant: 0, fausse: 1, atteinte: 2, nonLue: 3 }[p.type]);
// deux actions dans des blocs différents (des if à la suite au lieu d'une seule chaîne)
const autreBloc = (A, L) => {
  for (let k = 0; k < Math.min(A.chemin.length, L.chemin.length); k++) {
    const a = A.chemin[k], l = L.chemin[k];
    if (a.si) { if (a.j !== l.j) return false; }   // deux branches de la même chaîne
    else if (a.i !== l.i) return true;              // même bloc, instructions différentes : des if à la suite
  }
  return false;
};
// tout ce qui décide si on arrive à cet endroit ne dépend que de ce qu'on a fait varier
const cheminConnu = (chemin) => chemin.every((x) => !x.si || x.si.branches.slice(0, x.j < 0 ? undefined : x.j + 1).every((b) => connue(b.cond)));

// explique un seul tour dans une situation (exercices des tutoriels) ; test = { attendu: [...] } ou { interdit: [...] }
export function expliquerSituation(compiled, sit, test) {
  const s = { ...SITUATION_BASE, ...sit }, tr = unTour(compiled, s);
  return { tr, ok: reussi(test, tr), ...expliquer({ idx: indexer(compiled.prog) }, test, s, tr) };
}

// ---------- l'analyse complète ----------
const reussi = (test, tr) => (test.attendu ? test.attendu.includes(tr.action) : !test.interdit.includes(tr.action));
const cache = new Map();

// diagnostiquer(code) → { ok, erreur, verdict, tests, cles, remarques }
export function diagnostiquer(source) {
  if (cache.has(source)) return cache.get(source);
  const r = analyser(source);
  if (cache.size > 60) cache.delete(cache.keys().next().value);
  cache.set(source, r);
  return r;
}

// la même chose pour un programme déjà analysé (le rapport de match part de la tortue de la partie)
const cacheProg = new WeakMap();
export function diagnostiquerProgramme(compiled) {
  if (!cacheProg.has(compiled)) cacheProg.set(compiled, analyserProg(compiled, compiled.warnings || []));
  return cacheProg.get(compiled);
}

function analyser(source) {
  const c = check(source);
  if (!c.ok) return { ok: false, erreur: c.error, verdict: { couleur: "bug", icone: "🐞", titre: `Ligne ${c.error.line} : ${c.error.message}` }, tests: [], cles: [], remarques: [] };
  return analyserProg(c.compiled, c.warnings);
}

function analyserProg(compiled, warnings) {
  const an = { idx: indexer(compiled.prog) };
  const { actions } = an.idx;

  // 1. les tests de situation
  const tests = TESTS.map((t) => {
    const sit = situation(t.sit), tr = unTour(compiled, sit);
    const ok = reussi(t, tr);
    return { id: t.id, niveau: t.niveau, titre: t.titre, attenduTxt: t.attenduTxt, attendu: t.attendu || null,
      obtenu: tr.action, ligne: tr.actionLine, erreur: tr.error, ok, pourquoi: t.pourquoi || "", ...(ok ? {} : expliquer(an, t, sit, tr)) };
  });

  // 2. toutes les situations de débutant
  const vu = { actions: new Map(), extra: new Map(), condVrai: new Set(), condFaux: new Set(), pondOk: 0, pondRefus: { jour: 0, plage: 0, energie: 0 }, plage: 0, mange: 0, cherche: 0, erreurs: 0, ignorees: 0 };
  const parLigne = new Map();   // pour chaque if/elif : les situations où sa condition a été lue
  let sit = SITUATION_BASE;
  const capt = Object.fromEntries(Object.keys(SITUATION_BASE).map((k) => [k, () => sit[k]]));   // un seul jeu de capteurs, relu à chaque situation
  for (const nuit of [[19, 6], [20, 5]]) for (const terrain of ["plage", "eau", "algues", "algues+plastique", "eau+plastique"]) for (const requin of [false, true])
    for (let energie = 0; energie <= P.energieMax; energie++) for (let heure = 0; heure < 24; heure++) {
      sit = situation({ terrain, requin, energie, heure, nuit });
      const tr = runTurn(compiled, capt);
      if (tr.error) { vu.erreurs++; continue; }
      for (const [l, v] of tr.conds) { (v ? vu.condVrai : vu.condFaux).add(l); if (!parLigne.has(l)) parLigne.set(l, sit); }
      for (const [l] of tr.extra) vu.extra.set(l, (vu.extra.get(l) || 0) + 1);
      if (tr.extra.length) vu.ignorees++;
      if (tr.actionLine == null) continue;
      vu.actions.set(tr.actionLine, (vu.actions.get(tr.actionLine) || 0) + 1);
      const a = tr.action;
      if (a === "pondre") {
        if (!sit.sur_plage) vu.pondRefus.plage++; else if (!sit.est_la_nuit) vu.pondRefus.jour++; else if (sit.energie < P.energiePonte) vu.pondRefus.energie++; else vu.pondOk++;
      }
      if (a === "aller_vers_plage" && !sit.sur_plage) vu.plage++;
      if (a === "manger" && sit.algue_ici) vu.mange++;
      if (ALGUE.includes(a) && !sit.algue_ici) vu.cherche++;
    }

  // 3. la structure : ce qui ne sert jamais
  const remarques = [];
  const morts = new Set();   // lignes d'actions qui ne peuvent jamais agir à cause d'un bloc qui agit toujours avant
  (function blocs(bloc) {
    const k = bloc.findIndex((s) => agitToujours([s]));
    if (k >= 0 && k < bloc.length - 1) {
      const apres = bloc.slice(k + 1).filter(contientAction);
      if (apres.length) {
        const s = bloc[k], d = s.k === "if" ? s.debut : s.line, f = s.k === "if" ? s.fin : s.line;
        const a0 = apres[0], debutApres = a0.k === "if" ? a0.debut : a0.line, finApres = an.idx.derniere(bloc[bloc.length - 1]);
        for (const a of actions) if (a.line >= debutApres && a.line <= finApres) morts.add(a.line);
        remarques.push({ type: "deux-blocs", gravite: "rouge", lignes: [debutApres, finApres],
          texte: `Ta tortue fait **une seule action par tour**. ${d === f ? `La ligne ${d}` : `Le bloc des lignes ${d} à ${f}`} fait **toujours** une action, donc ${debutApres === finApres ? `la ligne ${debutApres} ne sert` : `les lignes ${debutApres} à ${finApres} ne servent`} **jamais**.`,
          conseil: "Écris **une seule chaîne** : un `if`, puis des `elif`, et un seul `else` tout à la fin." });
      }
    }
    for (const s of bloc) if (s.k === "if") { s.branches.forEach((b) => blocs(b.body)); if (s.elseBody) blocs(s.elseBody); }
  })(compiled.prog);
  if (!remarques.length && vu.ignorees) {
    const [l] = [...vu.extra.entries()].sort((a, b) => b[1] - a[1])[0];
    remarques.push({ type: "if-separes", gravite: "orange", lignes: [l, l],
      texte: `Tes \`if\` sont **séparés** : quand plusieurs sont vrais, seule la **première** action compte (par exemple, la ligne ${l} est souvent lue trop tard).`,
      conseil: "Relie tes règles avec `elif` : c'est plus clair, et l'ordre des règles devient l'ordre des priorités." });
  }
  // conditions jamais vraies, ou toujours vraies (seulement si on a vraiment tout essayé)
  for (const { s, chemin } of an.idx.ifs) s.branches.forEach((b, j) => {
    if (morts.has(b.line) || !parLigne.has(b.line) || !cheminConnu(chemin) || !s.branches.slice(0, j + 1).every((x) => connue(x.cond))) return;
    if (!vu.condVrai.has(b.line)) {
      // vraie toute seule ? alors c'est une condition au-dessus qui passe avant (le premier vrai gagne)
      const avant = s.branches.slice(0, j).filter((x) => connue(x.cond));
      let couvre = null;
      if (avant.length) for (const sit of situationsOu(b.cond)) { const v = avant.find((x) => vrai(valeur(x.cond, sit))); if (v) { couvre = v; break; } }
      const meme = s.branches.slice(0, j).find((x) => texte(x.cond) === texte(b.cond));
      if (meme) remarques.push({ type: "doublon", gravite: "rouge", lignes: [b.line, b.line], ligneAvant: meme.line,
        texte: `La condition ligne ${b.line} est **la même** que ligne ${meme.line} : à cet endroit, elle n'est **jamais vraie** (si elle l'était, la ligne ${meme.line} aurait déjà gagné).`,
        conseil: `Retire la règle de la ligne ${b.line}, ou change sa condition.` });
      else remarques.push(couvre
        ? { type: "ordre", gravite: "rouge", lignes: [b.line, b.line], ligneAvant: couvre.line,
          texte: `La condition ligne ${b.line} n'est **jamais vraie à cet endroit** : quand \`${texte(b.cond)}\` est vrai, \`${texte(couvre.cond)}\` (ligne ${couvre.line}) est déjà vrai, et **le premier vrai gagne**.`,
          conseil: `Monte la règle de la ligne ${b.line} **au-dessus** de la ligne ${couvre.line}.` }
        : { type: "jamais-vraie", gravite: "rouge", lignes: [b.line, b.line],
          texte: `La condition ligne ${b.line} (\`${texte(b.cond)}\`) n'est **jamais vraie**` + (/energie\(\) *(>|>=) *1[0-9]|energie\(\) *> *10/.test(texte(b.cond)) ? " : l'énergie va de 0 à 10." : /heure\(\) *(>|>=) *2[4-9]/.test(texte(b.cond)) ? " : l'heure va de 0 à 23." : "." ),
          conseil: "Vérifie les signes `<` / `>` et les nombres, ou retire cette règle." });
    } else if (!vu.condFaux.has(b.line) && (j < s.branches.length - 1 || s.elseBody)) {
      remarques.push({ type: "toujours-vraie", gravite: "rouge", lignes: [b.line, b.line],
        texte: `La condition ligne ${b.line} (\`${texte(b.cond)}\`) est **toujours vraie** : les règles en dessous (\`elif\`, \`else\`) ne servent jamais.`,
        conseil: "Vérifie les signes `<` / `>` et les nombres." });
    }
  });
  // actions jamais exécutées (hors des cas déjà expliqués)
  const expliquees = new Set(remarques.flatMap((r) => (["ordre", "jamais-vraie", "doublon"].includes(r.type) ? [r.lignes[0]] : [])));
  for (const a of actions) {
    if (vu.actions.has(a.line) || morts.has(a.line)) continue;
    const r = ligneRegle(a);
    if (expliquees.has(r) || !cheminConnu(a.chemin)) continue;
    remarques.push({ type: "jamais", gravite: "orange", lignes: [a.line, a.line],
      texte: vu.extra.has(a.line) ? `${nomAct(a)} n'agit jamais : elle est toujours lue **trop tard**, après une autre action.` : `${nomAct(a)} n'est **jamais** exécuté : les règles au-dessus passent toujours avant.`,
      conseil: "Change l'ordre de tes règles, ou relie-les avec `elif`." });
  }

  // 4. les 4 actions clés
  const present = (noms) => actions.filter((a) => noms.includes(a.name));
  const etat = (noms, utile, refusee) => {
    const p = present(noms);
    if (!p.length) return "absente";
    if (utile) return "ok";
    if (p.some((a) => !morts.has(a.line) && !cheminConnu(a.chemin))) return "inconnu";
    return refusee ? "refusee" : "jamais";
  };
  const pondRefus = vu.pondRefus.jour + vu.pondRefus.plage + vu.pondRefus.energie;
  const cles = [
    { id: "pondre", nom: "pondre", icone: "🥚", etat: etat(["pondre"], vu.pondOk > 0, pondRefus > 0) },
    { id: "plage", nom: "aller vers la plage", icone: "🏖️", etat: etat(["aller_vers_plage"], vu.plage > 0, false) },
    { id: "manger", nom: "manger", icone: "🌿", etat: etat(["manger"], vu.mange > 0, false) },
    { id: "algue", nom: "aller vers les algues", icone: "➡️", etat: etat(ALGUE, vu.cherche > 0, false) },
  ];
  for (const k of cles) { const p = present(k.id === "pondre" ? ["pondre"] : k.id === "plage" ? ["aller_vers_plage"] : k.id === "manger" ? ["manger"] : ALGUE); k.lignes = p.map((a) => a.line); }

  // 5. le verdict
  const T = Object.fromEntries(tests.map((t) => [t.id, t]));
  const kp = cles[0], kplage = cles[1];
  let verdict;
  const premiereRemarque = (lignes) => remarques.find((r) => r.gravite === "rouge" && lignes.some((l) => l >= r.lignes[0] && l <= r.lignes[1] || r.ligneAvant === l));
  if (!actions.length) verdict = { couleur: "rouge", icone: "🔴", titre: "Ta tortue ne bougera jamais", cause: "Elle n'appelle aucune action : ajoute au moins `aller_vers_algue()`." };
  else if (kp.etat === "absente") verdict = { couleur: "rouge", icone: "🔴", titre: "Ta tortue ne pondra jamais", cause: "Il n'y a pas de `pondre()` dans ton code. " + TESTS[0].siAbsent };
  else if (kp.etat === "jamais" || kp.etat === "refusee") {
    const rem = premiereRemarque(kp.lignes.map((l) => ligneRegle(actions.find((a) => a.line === l))).concat(kp.lignes));
    const tp = T.ponte;
    let cause;
    if (rem) cause = rem.texte + " " + rem.conseil;
    else if (!tp.ok) cause = "La nuit, sur la plage, " + [tp.agit.replace(/^Ta tortue/, "ta tortue"), tp.raison, tp.conseil].filter(Boolean).join(" ");
    else if (kp.etat === "refusee") {
      const R = vu.pondRefus, pire = R.jour >= R.plage && R.jour >= R.energie ? "le jour (il faut `est_la_nuit()`)" : R.plage >= R.energie ? "hors de la plage (il faut `sur_plage()`)" : "sans assez d'énergie";
      cause = `\`pondre()\` est exécuté, mais seulement quand il est refusé : ${pire}. Il faut être **sur la plage**, **la nuit**, avec **6 ⚡**.`;
    } else cause = "`pondre()` n'est jamais exécuté au bon moment.";
    verdict = { couleur: "rouge", icone: "🔴", titre: "Ta tortue ne pondra jamais", cause };
  } else if (kplage.etat === "absente" || kplage.etat === "jamais") {
    const t = !T.rentrer.ok ? T.rentrer : T.rentrer_algues;
    verdict = { couleur: "rouge", icone: "🔴", titre: "Ta tortue ne pondra jamais", cause: "Elle ne va **jamais** vers la plage. " + (t.ok ? "" : [t.agit, t.raison, t.conseil].filter(Boolean).join(" ")) };
  } else {
    const rate = tests.find((t) => t.niveau === "ponte" && !t.ok);
    if (rate) verdict = { couleur: "orange", icone: "🟠", titre: "Ta tortue peut pondre, mais pas souvent", cause: `${rate.titre}, elle devrait faire \`${rate.attendu[0]}()\`. ` + [rate.agit, rate.raison, rate.conseil].filter(Boolean).join(" "), test: rate.id };
    else {
      const n = tests.filter((t) => !t.ok).length;
      verdict = { couleur: "vert", icone: "🟢", titre: "Ta tortue sait pondre !", cause: n ? `${n} conseil${n > 1 ? "s" : ""} pour aller plus loin.` : "Elle réussit tous les tests." };
    }
  }
  return { ok: true, compiled, verdict, tests, cles, remarques, stats: vu, warnings };
}

// quelques situations où une condition (seule) est vraie
function* situationsOu(cond) {
  for (const nuit of [[19, 6], [20, 5]]) for (const terrain of ["plage", "eau", "algues", "algues+plastique", "eau+plastique"]) for (const requin of [false, true])
    for (let energie = 0; energie <= P.energieMax; energie++) for (let heure = 0; heure < 24; heure++) {
      const sit = situation({ terrain, requin, energie, heure, nuit });
      if (vrai(valeur(cond, sit))) yield sit;
    }
}

// texte avec `code` et **gras** → HTML (le texte est échappé)
export function enTexteRiche(t) {
  const esc = (s) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  return esc(t).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
}

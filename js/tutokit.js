// =====================================================================
//  Lagon Arena — boîte à outils commune aux tutoriels (débutant et avancé)
//  composants : interrupteurs, exemple manipulable, exercice vérifié,
//  quiz, mission dans le lagon ; navigation entre les étapes.
// =====================================================================
import { simulate } from "./engine.js";
import { compile, check } from "./interp.js";
import { CodeEditor, CodeView, boiteOutils } from "./editor.js";
import { MatchViewer } from "./viewer.js";
import { CAPTEURS, ACTIONS_INFO } from "./primitives.js";
import { $, el, esc, store, activerCopie } from "./common.js";
import { unTour, expliquerSituation, diagnostiquer } from "./moteur/diagnostic.js";
import { riche, brancherLiens } from "./bilan.js";

// ---------------------------------------------------------------------
//  Progression (étoiles) et navigation
// ---------------------------------------------------------------------
let ETAPES = [], prog = { faits: [] }, cleProg = "", courant = 0, nettoyer = null, prefixeCode = "", MISSIONS = null;
export const fait = (cle) => { if (!prog.faits.includes(cle)) { prog.faits.push(cle); store.set(cleProg, prog); majNav(); } };
export const suivant = () => aller(courant + 1);
// une mission est terminée quand on la quitte par « Suivant » (ou quand on finit sa dernière étape)
export const missionFinie = (n) => { prog.missions ||= []; if (!prog.missions.includes(n)) { prog.missions.push(n); store.set(cleProg, prog); majNav(); } };
const mDe = (i) => ETAPES[i] && ETAPES[i].mission;

function bouton(e, i) {
  const ok = e.cle && prog.faits.includes(e.cle);
  const b = el("button", { type: "button", title: e.titre, "aria-label": `Étape ${e.court} : ${e.titre}`, class: (i === courant ? "on " : "") + (ok ? "fait " : "") + (e.court.length > 1 ? "m" : "") }, ok ? "✓" : e.court);
  if (i === courant) b.setAttribute("aria-current", "step");
  b.addEventListener("click", () => aller(i));
  return b;
}
function majNav() {
  const nav = $("#nav"); nav.innerHTML = "";
  if (MISSIONS) {   // les étapes rangées par mission : « 🌊 Mission 1 · Comprendre le jeu  ① ② ③ ④ »
    nav.classList.add("par-mission");
    for (const M of MISSIONS) {
      const idx = ETAPES.map((e, i) => (e.mission === M.n ? i : -1)).filter((i) => i >= 0);
      if (!idx.length) continue;
      const fini = (prog.missions || []).includes(M.n), ici = mDe(courant) === M.n;
      const g = el("div", { class: "nav-mission" + (ici ? " ici" : "") + (fini ? " finie" : "") });
      const t = el("button", { type: "button", class: "nav-m-titre", title: M.titre }, el("span", { class: "nm-ic" }, fini ? "✅" : M.icone), el("span", { class: "nm-txt" }, `Mission ${M.n}`), el("span", { class: "nm-nom" }, M.court || M.titre));
      t.addEventListener("click", () => aller(idx[0]));
      const pts = el("div", { class: "nav-m-etapes" });
      idx.forEach((i) => pts.append(bouton(ETAPES[i], i)));
      g.append(t, pts); nav.append(g);
    }
  } else ETAPES.forEach((e, i) => nav.append(bouton(e, i)));
  const nbEx = ETAPES.filter((e) => e.cle).length, nbFaits = ETAPES.filter((e) => e.cle && prog.faits.includes(e.cle)).length;
  const m = mDe(courant), M = MISSIONS && MISSIONS.find((x) => x.n === m);
  if (M) {
    const idx = ETAPES.map((e, i) => (e.mission === m ? i : -1)).filter((i) => i >= 0);
    $("#progression").textContent = `${M.icone} Mission ${m} · étape ${idx.indexOf(courant) + 1} / ${idx.length} · ⭐ ${nbFaits} / ${nbEx}`;
  } else $("#progression").textContent = `Étape ${courant + 1} / ${ETAPES.length} · ⭐ ${nbFaits} / ${nbEx}`;
  $("#prec").disabled = courant === 0;
  const suiv = $("#suiv"), apres = MISSIONS && mDe(courant + 1) !== m && MISSIONS.find((x) => x.n === mDe(courant + 1));
  suiv.classList.toggle("cache", courant === ETAPES.length - 1);
  suiv.textContent = apres ? `Mission ${apres.n} : ${apres.icone} ${apres.court || apres.titre} →` : "Suivant →";
}
export function aller(i) {
  i = Math.max(0, Math.min(ETAPES.length - 1, i));
  if (MISSIONS && i === courant + 1 && mDe(i) !== mDe(courant) && mDe(courant)) missionFinie(mDe(courant));
  if (nettoyer) { try { nettoyer(); } catch { /* rien */ } nettoyer = null; }
  document.querySelectorAll("ul.ac").forEach((p) => p.remove());   // popups d'autocomplétion des éditeurs précédents
  courant = i;
  const box = $("#etape"); box.innerHTML = "";
  if (MISSIONS && mDe(i) && mDe(i - 1) !== mDe(i)) {   // première étape d'une mission : son titre
    const M = MISSIONS.find((x) => x.n === mDe(i));
    box.append(el("div", { class: "debut-mission", html: `<span class="dm-ic">${M.icone}</span><div><b>Mission ${M.n} · ${esc(M.titre)}</b><br><span>${M.texte} <i>(${M.duree})</i></span></div>` }));
  }
  const zone = el("div"); box.append(zone);
  nettoyer = ETAPES[i].rendre(zone) || null;
  majNav();
  history.replaceState(null, "", location.pathname + location.search.replace(/[?&]mission=\d+/, "").replace(/^&/, "?") + "#" + (i + 1));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// missions : [{ n, icone, titre, court, texte, duree }] ; les étapes ont un champ « mission » (facultatif)
export function demarrer(etapes, cle, missions = null) {
  ETAPES = etapes; cleProg = cle; prefixeCode = cle + ":"; MISSIONS = missions;
  prog = store.get(cle, { faits: [] });
  activerCopie();
  $("#prec").addEventListener("click", () => aller(courant - 1));
  $("#suiv").addEventListener("click", () => aller(courant + 1));
  const h = parseInt(location.hash.slice(1), 10), m = Number(new URLSearchParams(location.search).get("mission"));
  if (Number.isFinite(h)) aller(h - 1);
  else if (m && ETAPES.some((e) => e.mission === m)) aller(ETAPES.findIndex((e) => e.mission === m));
  else aller(0);
}

// ---------------------------------------------------------------------
//  Petits composants
// ---------------------------------------------------------------------
export function bascule(label, valeur, onChange) {
  const input = el("input", { type: "checkbox" }); input.checked = valeur;
  const lab = el("label", { class: "switch" }, input, el("span", { class: "glissiere" }), el("span", { html: label }));
  input.addEventListener("change", () => onChange(input.checked));
  lab.regler = (v) => { input.checked = v; };
  return lab;
}
export function curseur(label, valeur, min, max, onChange) {
  const input = el("input", { type: "range", min, max, value: valeur });
  const val = el("b", {}, String(valeur));
  const lab = el("label", { class: "curseur" }, el("span", { html: label }), val, input);
  input.addEventListener("input", () => { val.textContent = input.value; onChange(+input.value); });
  lab.regler = (v) => { input.value = v; val.textContent = v; };
  return lab;
}
export const vf = (b) => `<span class="b-${b}">${b ? "True" : "False"}</span>`;
export const capt = (nom) => { const c = CAPTEURS.find((x) => x.nom === nom); return `${c.icone} <code>${nom}()</code>`; };
export const act = (nom) => { const a = ACTIONS_INFO.find((x) => x.nom === nom); return `${a.icone} <code>${nom}()</code>`; };

// exécute UN tour d'un programme dans une situation donnée (les mêmes situations que les tests de la tortue)
export { SITUATION_BASE, unTour } from "./moteur/diagnostic.js";

const PHRASE = {
  manger: "😋 la tortue <b>mange</b>.", fuir: "💨 la tortue <b>fuit</b>.", pondre: "🥚 la tortue <b>pond</b> !",
  aller_vers_algue: "➡️🌿 la tortue <b>nage vers les algues</b>.", aller_vers_plage: "➡️🏖️ la tortue <b>nage vers la plage</b>.",
  se_cacher: "🙈 la tortue <b>se cache</b>.", pousser: "💥 la tortue <b>pousse</b> sa voisine !",
  aller_vers_algue_libre: "➡️🌿✨ la tortue <b>nage vers des algues libres</b>.",
};
export const phrase = (a) => PHRASE[a] || `<code>${a}()</code>`;

// petit programme-exemple + interrupteurs / curseurs : on voit quelle ligne s'exécute
//  capteurs : ["algue_ici", {nom:"distance_requin", min:0, max:10}, …]
export function exemple(box, code, capteurs, sitDepart) {
  // le jeu exige def tour(): on l'ajoute en coulisse (et on décale les numéros de ligne)
  const comp = compile("def tour():\n" + code.split("\n").map((l) => "    " + l).join("\n"));
  const s = { ...sitDepart };
  box.innerHTML = `<div class="bascules"></div><div class="cv"></div><div class="msg ok resultat"></div>`;
  const cv = new CodeView(box.querySelector(".cv")); cv.setCode(code);
  const maj = () => {
    const r = unTour(comp, s);
    cv.montrer({ conds: r.conds.map(([n, v]) => [n - 1, v]), ligne: r.actionLine && r.actionLine - 1, extra: r.extra.map(([n, a]) => [n - 1, a]) });
    box.querySelector(".resultat").innerHTML = (r.action ? `→ ${phrase(r.action)}` : "→ 😐 Rien ne se passe : la condition est fausse, Python saute le bloc.") +
      r.extra.map(([n, a]) => `<br><span class="ignoree-txt">✋ Ligne ${n - 1} : <code>${a}()</code> est <b>ignorée</b>, car ta tortue a déjà fait une action ce tour-ci.</span>`).join("");
    box.querySelector(".resultat").className = "msg resultat " + (r.action ? "ok" : "warn");
  };
  const bs = {};
  for (const item of capteurs) {
    const k = typeof item === "string" ? item : item.nom;
    const c = CAPTEURS.find((x) => x.nom === k);
    if (typeof item === "string") bs[k] = bascule(`${c.icone} <code>${k}()</code>`, s[k], (v) => { s[k] = v; maj(); });
    else bs[k] = curseur(`${c.icone} <code>${k}()</code> =`, s[k] ?? item.min, item.min, item.max, (v) => { s[k] = v; maj(); });
    box.querySelector(".bascules").append(bs[k]);
  }
  maj();
  return { regler(sit) { Object.assign(s, sit); for (const k in bs) bs[k].regler(s[k]); maj(); } };
}

// exercice : écrire un petit programme, vérifié dans plusieurs situations
export function exercice(box, { cle, consigne, depart = "def tour():\n    ", cas, solution, indice, outils, avance = null }) {
  box.innerHTML = `<div class="exo">
    <h3>🎯 À toi !</h3>
    <div class="consigne">${consigne}</div>
    <div class="ed"></div><div class="boite"></div>
    <div class="row" style="margin-top:8px"><button class="btn vert verif">✔ Vérifier</button><button class="btn ghost small sol cache">👀 Voir la solution</button><button class="btn ghost small rst">↺ Recommencer</button></div>
    <div class="res"></div></div>`;
  const cleCode = prefixeCode + cle;
  const ed = new CodeEditor(box.querySelector(".ed"), { value: store.get(cleCode) || depart, onChange: (v) => store.set(cleCode, v), avance });
  boiteOutils(box.querySelector(".boite"), ed, outils);
  let essais = 0;
  const res = box.querySelector(".res");
  brancherLiens(res, ed);   // les « ligne 3 » des explications mènent à la ligne
  box.querySelector(".rst").addEventListener("click", () => { ed.value = depart; store.del(cleCode); res.innerHTML = ""; ed.focus(); });
  box.querySelector(".sol").addEventListener("click", () => {
    res.innerHTML = `<div class="msg info">👀 Une solution possible (recopie-la pour bien la retenir) :</div><div class="sol-code"></div>`;
    new CodeView(res.querySelector(".sol-code")).setCode(solution);
  });
  const desc = (k) => k.attendu ? act(k.attendu) : k.pas ? `pas ${act(k.pas)}` : "rien";
  box.querySelector(".verif").addEventListener("click", () => {
    essais++;
    const c = check(ed.value);
    if (!c.ok) {
      ed.setErreur(c.error.line);
      res.innerHTML = `<div class="msg err">🐞 <b>Ligne ${c.error.line}</b> : ${esc(c.error.message)}</div>` + (essais >= 2 ? `<div class="msg warn">💡 ${indice}</div>` : "");
    } else {
      const lignes = cas.map((k) => {
        const r = unTour(c.compiled, k.sit);
        const ok = k.attendu ? r.action === k.attendu : k.pas ? r.action !== k.pas : r.action == null;
        return { ok, html: `<tr class="${ok ? "ok" : "ko"}"><td>${k.texte}</td><td>${desc(k)}</td><td>${r.action ? act(r.action) : "rien"}</td><td>${ok ? "✅" : "❌"}</td></tr>` };
      });
      const tout = lignes.every((l) => l.ok);
      res.innerHTML = `<table class="cas"><tr><th>Situation</th><th>Attendu</th><th>Ta tortue</th><th></th></tr>${lignes.map((l) => l.html).join("")}</table>` +
        (tout ? `<div class="msg ok bravo">🎉 <b>Bravo !</b> Ton code marche dans toutes les situations.</div>`
              : `<div class="msg err">Presque ! Regarde les lignes ❌.</div>` + explication(c.compiled, cas[lignes.findIndex((l) => !l.ok)]) + (essais >= 2 ? `<div class="msg warn">💡 ${indice}</div>` : ""));
      if (tout) { fait(cle); const b = el("button", { class: "btn big pulse" }, "Continuer →"); b.addEventListener("click", suivant); res.append(b); }
    }
    if (essais >= 2) box.querySelector(".sol").classList.remove("cache");
  });
  return ed;
}

// ---------------------------------------------------------------------
//  Pour commencer en douceur (Seconde, grands débutants) : pas de clavier, des listes à choisir
// ---------------------------------------------------------------------
// le code à compléter : les trous sont des listes déroulantes.
//  morceaux : ["if ", { id: "q", choix: ["requin_proche()", …] }, ":\n    ", { id: "a", choix: [...] }]
//  (le code est écrit SANS « def tour(): », qu'on ajoute en coulisse)
export function trous(box, { cle, consigne, morceaux, cas, appris = "" }) {
  const cleRep = prefixeCode + "trous-" + cle, rep = store.get(cleRep, {});
  const html = morceaux.map((m) => typeof m === "string" ? esc(m).replace(/\b(if|elif|else|and|not)\b/g, '<span class="tok-kw">$1</span>').replace(/\n/g, "<br>").replace(/ {4}/g, "<span class=\"indent\">····</span>")
    : `<select class="trou" data-id="${m.id}" aria-label="${esc(m.label || "à choisir")}"><option value="">· · ·</option>${m.choix.map((c) => `<option${rep[m.id] === c ? " selected" : ""}>${esc(c)}</option>`).join("")}</select>`).join("");
  box.innerHTML = `<div class="exo trous-exo"><h3>🧩 Complète le code</h3><div class="consigne">${consigne}</div>
    <div class="code-trous"><span class="tok-kw">def</span> tour():<br><span class="indent">····</span>${html.replace(/<br>/g, "<br><span class=\"indent\">····</span>")}</div>
    <p class="petit muted">Choisis dans les listes, puis vérifie. Pas besoin de taper au clavier.</p>
    <div class="row"><button class="btn vert verif">✔ Vérifier</button></div><div class="res"></div></div>`;
  const val = () => { const r = {}; box.querySelectorAll("select.trou").forEach((x) => (r[x.dataset.id] = x.value)); return r; };
  box.querySelectorAll("select.trou").forEach((x) => x.addEventListener("change", () => store.set(cleRep, val())));
  box.querySelector(".verif").addEventListener("click", () => {
    const r = val(), res = box.querySelector(".res");
    if (Object.values(r).some((v) => !v)) { res.innerHTML = `<div class="msg warn">Il reste un trou : choisis dans chaque liste.</div>`; return; }
    const code = morceaux.map((m) => (typeof m === "string" ? m : r[m.id])).join("");
    const c = check("def tour():\n" + code.split("\n").map((l) => "    " + l).join("\n"));
    if (!c.ok) { res.innerHTML = `<div class="msg err">🐞 ${esc(c.error.message)}</div>`; return; }
    const lignes = cas.map((k) => { const t = unTour(c.compiled, k.sit); const ok = k.attendu ? t.action === k.attendu : t.action !== k.pas; return { ok, k, t }; });
    const tout = lignes.every((l) => l.ok);
    res.innerHTML = `<table class="cas"><tr><th>Situation</th><th>Attendu</th><th>Ta tortue</th><th></th></tr>${lignes.map(({ ok, k, t }) =>
      `<tr class="${ok ? "ok" : "ko"}"><td>${k.texte}</td><td>${k.attendu ? act(k.attendu) : "pas " + act(k.pas)}</td><td>${t.action ? act(t.action) : "rien"}</td><td>${ok ? "✅" : "❌"}</td></tr>`).join("")}</table>` +
      (tout ? `<div class="msg ok bravo">🎉 <b>Bravo !</b></div>${appris ? `<div class="appris">🎓 ${appris}</div>` : ""}` : `<div class="msg err">Presque ! Lis la question de chaque ligne ❌ : que doit faire la tortue dans cette situation ?</div>` + explication(c.compiled, lignes.find((l) => !l.ok).k));
    if (tout) { fait(cle); const b = el("button", { class: "btn big pulse", style: "margin-top:8px" }, "Continuer →"); b.addEventListener("click", suivant); res.append(b); }
  });
}

// une règle EN FRANÇAIS, avec deux listes : « Si [question] → [ordre] » ; la traduction en Python s'affiche dessous
export const QUESTIONS_FR = [
  ["requin_proche()", "🦈 un requin est proche"], ["algue_ici()", "🌿 il y a des algues ici"], ["sur_plage()", "🏖️ je suis sur la plage"],
  ["est_la_nuit()", "🌙 il fait nuit"], ["sur_plage() and est_la_nuit()", "🏖️ je suis sur la plage ET 🌙 il fait nuit"],
];
export const ORDRES_FR = [["fuir", "💨 fuir"], ["manger", "😋 manger"], ["pondre", "🥚 pondre"], ["aller_vers_plage", "➡️🏖️ aller vers la plage"], ["aller_vers_algue", "➡️🌿 aller vers les algues"]];
export function regleFr(box, { cle, taches }) {
  box.innerHTML = `<div class="exo regles-fr">${taches.map((t, i) => `<div class="regle-fr" data-i="${i}">
      <p class="rf-tache">${t.texte}</p>
      <div class="rf-ligne"><b>Si</b> <select class="rf-q" aria-label="la question"><option value="">· · · choisis la question</option>${QUESTIONS_FR.map(([v, f]) => `<option value="${esc(v)}">${f}</option>`).join("")}</select>
        <b>→</b> <select class="rf-a" aria-label="l'ordre"><option value="">· · · choisis l'ordre</option>${ORDRES_FR.map(([v, f]) => `<option value="${v}">${f}</option>`).join("")}</select></div>
      <div class="rf-py" aria-live="polite"></div></div>`).join("")}<div class="res"></div></div>`;
  const ok = new Set();
  box.querySelectorAll(".regle-fr").forEach((d) => {
    const t = taches[d.dataset.i], q = d.querySelector(".rf-q"), a = d.querySelector(".rf-a"), py = d.querySelector(".rf-py");
    const maj = () => {
      if (!q.value || !a.value) { py.innerHTML = ""; return; }
      const bon = q.value === t.q && a.value === t.a;
      const code = `<span class="tok-kw">if</span> ${q.value.replace(/(\w+)\(\)/g, '<span class="tok-sens">$1</span>()').replace(/ and /g, ' <span class="tok-kw">and</span> ')}:<br>    <span class="tok-act">${a.value}</span>()`;
      py.innerHTML = `<div class="rf-trad pas-copie"><span class="petit muted">🐍 En Python :</span><pre class="modele">${code}</pre></div><div class="msg ${bon ? "ok" : "err"}">${bon ? "✅ " + (t.bravo || "Oui !") : "❌ " + (q.value !== t.q ? (t.conseilQ || "Ce n'est pas la bonne question.") : (t.conseilA || "Ce n'est pas le bon ordre."))}</div>`;
      bon ? ok.add(t) : ok.delete(t);
      if (ok.size === taches.length) {
        fait(cle);
        const res = box.querySelector(".res");
        if (!res.innerHTML) { res.innerHTML = `<div class="msg ok bravo">🎉 <b>Tu sais écrire des règles !</b> Une règle = <b>une question</b> + <b>un ordre</b>. En Python, « Si » s'écrit <code>if</code>, et l'ordre se décale de 4 espaces.</div>`; const b = el("button", { class: "btn big pulse", style: "margin-top:8px" }, "Continuer →"); b.addEventListener("click", suivant); res.append(b); }
      }
    };
    q.addEventListener("change", maj); a.addEventListener("change", maj);
  });
}

// pourquoi la tortue ne fait pas ce qu'on attend dans ce cas : quelle ligne agit, et pourquoi (tests de la tortue)
function explication(compiled, k) {
  if (!k || !(k.attendu || k.pas)) return "";
  const e = expliquerSituation(compiled, k.sit, k.attendu ? { attendu: [k.attendu] } : { interdit: [k.pas] });
  const p = [e.agit, e.raison].filter(Boolean).map(riche).join(" ");
  return p ? `<div class="msg explique">🔍 <b>${k.texte}</b> : ${p}${e.conseil ? `<br>👉 ${riche(e.conseil)}` : ""}</div>` : "";
}

// quiz à boutons
export function quiz(box, titre, questions, rendreQuestion = null, fin = null) {
  let qi = 0, score = 0;
  const poser = () => {
    if (qi >= questions.length) {
      box.innerHTML = `<h3>${titre} : ${score} / ${questions.length} ${score === questions.length ? "🏆" : ""}</h3>` + (fin ? fin(score) : "");
      const b = el("button", { class: "btn small ghost" }, "↺ Rejouer le quiz"); b.addEventListener("click", () => { qi = 0; score = 0; poser(); }); box.append(b);
      if (score === questions.length && questions.cle) fait(questions.cle);
      return;
    }
    const q = questions[qi];
    box.innerHTML = `<h3>${titre} (${qi + 1}/${questions.length})</h3><div class="q-texte">${q.texte}</div><div class="row choix-rep"></div><div class="expl"></div>`;
    if (rendreQuestion) rendreQuestion(q);
    for (const [val, lab] of q.options) {
      const b = el("button", { class: "btn ghost rep", html: lab });
      b.addEventListener("click", () => {
        box.querySelectorAll(".rep").forEach((x) => (x.disabled = true));
        const bon = val === q.bon; if (bon) score++;
        b.classList.remove("ghost"); b.classList.add(bon ? "vert" : "corail");
        box.querySelector(".expl").innerHTML = `<div class="msg ${bon ? "ok" : "err"}">${bon ? "✅ Oui !" : "❌ Non."} ${q.pourquoi || ""}</div>`;
        if (q.apres) q.apres();
        const s = el("button", { class: "btn small" }, qi + 1 < questions.length ? "Suivante →" : "Résultat");
        s.addEventListener("click", () => { qi++; poser(); });
        box.querySelector(".expl").append(s);
      });
      box.querySelector(".choix-rep").append(b);
    }
  };
  poser();
}

// mission : réparer / écrire une tortue et la tester dans un petit lagon
//  M : { id, cle, titre, notion, probleme, objectif, code, indice, solution, appris, scenario, graine,
//        autres:[{id, nom, couleur, code}], reussi(sim), bilan(sim), avance,
//        test : le test de la tortue qui explique l'échec (« rentrer_algues »…) }
export function etapeMission(M) {
  return {
    court: M.court, titre: M.titre, cle: M.cle, mission: M.mission,
    rendre(box) {
      box.innerHTML = `<div class="etape"><div>
        <div class="mission-head"><h2 style="margin:0">${M.titre}</h2><span class="notion">${esc(M.notion)}</span></div>
        <p class="probleme">${M.probleme}</p>
        <div class="objectif">🎯 ${esc(M.objectif)}</div>
        <ol class="etapes-mini"><li>▶ <b>Teste</b> : regarde le problème.</li><li>✏️ <b>Corrige</b> le code.</li><li>▶ <b>Reteste</b>.</li></ol>
        <div id="ed"></div><div id="boite"></div>
        <div class="row" style="margin-top:10px">
          <button class="btn vert" id="tester">▶ Tester</button>
          <button class="btn ghost small" id="indice">💡 Indice</button>
          <button class="btn ghost small cache" id="sol">👀 Solution</button>
          <button class="btn ghost small" id="reset">↺</button>
        </div>
        <div id="res"></div>
      </div><div id="vue" class="vue-mission"><div class="vide-vue"><div>Clique sur <b>▶ Tester</b> pour lancer la tortue.</div></div></div></div>`;
      const cle = prefixeCode + "code-" + M.cle;
      const ed = new CodeEditor($("#ed", box), { value: store.get(cle) || M.code, onChange: (v) => store.set(cle, v), avance: M.avance ?? null });
      boiteOutils($("#boite", box), ed);
      brancherLiens($("#res", box), ed);
      let viewer = null, essais = 0;
      $("#indice", box).addEventListener("click", () => { $("#res", box).innerHTML = `<div class="msg warn">💡 ${esc(M.indice)}</div>`; $("#sol", box).classList.remove("cache"); });
      $("#sol", box).addEventListener("click", () => {
        $("#res", box).innerHTML = `<div class="msg info">👀 Une solution (recopie-la ligne par ligne pour la retenir) :</div><div id="solc"></div>`;
        new CodeView($("#solc", box)).setCode(M.solution);
      });
      $("#reset", box).addEventListener("click", () => { ed.value = M.code; store.del(cle); $("#res", box).innerHTML = ""; });
      $("#tester", box).addEventListener("click", () => {
        essais++;
        const c = check(ed.value);
        if (!c.ok) {
          ed.setErreur(c.error.line);
          $("#res", box).innerHTML = `<div class="msg err">🐞 <b>Ligne ${c.error.line}</b> : ${esc(c.error.message)}</div>`;
          return;
        }
        const sim = simulate({ joueurs: [{ id: "t", nom: "Ta tortue", couleur: "#ff7b5c", code: ed.value, equipe: M.equipe || 0 }, ...(M.autres || [])], graine: M.graine ?? 7, scenario: M.scenario, twist: M.twist || "calme" });
        if (viewer) viewer.destroy();
        viewer = new MatchViewer($("#vue", box), { sim, focus: "t", code: ed.value, vitesse: 5 });
        const ok = M.reussi(sim);
        const res = $("#res", box);
        res.innerHTML = `<div class="msg info">⏳ Ta tortue joue…</div>`;
        viewer.player.onEnd = () => {
          if (ok) {
            fait(M.cle);
            res.innerHTML = `<div class="msg ok bravo">✅ <b>Réussi !</b> ${esc(M.bilan(sim))}</div><div class="appris">🎓 ${M.appris}</div>`;
            const b = el("button", { class: "btn big pulse", style: "margin-top:10px" }, "Continuer →");
            b.addEventListener("click", suivant); res.append(b);
          } else {
            res.innerHTML = `<div class="msg err">❌ <b>Pas encore.</b> ${esc(M.bilan(sim))}<br>Regarde « Dans la tête de ta tortue » : quelle ligne s'exécute au mauvais moment ?</div>`;
            const t = M.test && diagnostiquer(ed.value).tests.find((x) => x.id === M.test && !x.ok);
            if (t) res.innerHTML += `<div class="msg explique">🔍 <b>${t.titre}</b> : ${[t.agit, t.raison].filter(Boolean).map(riche).join(" ")}${t.conseil ? `<br>👉 ${riche(t.conseil)}` : ""}</div>`;
            if (essais >= 2) { res.innerHTML += `<div class="msg warn">💡 ${esc(M.indice)}</div>`; $("#sol", box).classList.remove("cache"); }
          }
        };
      });
      return () => viewer && viewer.destroy();
    },
  };
}

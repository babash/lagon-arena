// =====================================================================
//  Lagon Arena — boîte à outils commune aux tutoriels (débutant et avancé)
//  composants : interrupteurs, exemple manipulable, exercice vérifié,
//  quiz, mission dans le lagon ; navigation entre les étapes.
// =====================================================================
import { simulate } from "./engine.js";
import { compile, runTurn, check } from "./interp.js";
import { CodeEditor, CodeView, boiteOutils } from "./editor.js";
import { MatchViewer } from "./viewer.js";
import { CAPTEURS, ACTIONS_INFO } from "./primitives.js";
import { $, el, esc, store, activerCopie } from "./common.js";

// ---------------------------------------------------------------------
//  Progression (étoiles) et navigation
// ---------------------------------------------------------------------
let ETAPES = [], prog = { faits: [] }, cleProg = "", courant = 0, nettoyer = null, prefixeCode = "";
export const fait = (cle) => { if (!prog.faits.includes(cle)) { prog.faits.push(cle); store.set(cleProg, prog); majNav(); } };
export const suivant = () => aller(courant + 1);

function majNav() {
  const nav = $("#nav"); nav.innerHTML = "";
  ETAPES.forEach((e, i) => {
    const ok = e.cle && prog.faits.includes(e.cle);
    const b = el("button", { title: e.titre, class: (i === courant ? "on " : "") + (ok ? "fait " : "") + (e.court.length > 1 ? "m" : "") }, ok ? "✓" : e.court);
    b.addEventListener("click", () => aller(i));
    nav.append(b);
  });
  const nbEx = ETAPES.filter((e) => e.cle).length, nbFaits = ETAPES.filter((e) => e.cle && prog.faits.includes(e.cle)).length;
  $("#progression").textContent = `Étape ${courant + 1} / ${ETAPES.length} · ⭐ ${nbFaits} / ${nbEx}`;
  $("#prec").disabled = courant === 0;
  $("#suiv").classList.toggle("cache", courant === ETAPES.length - 1);
}
export function aller(i) {
  i = Math.max(0, Math.min(ETAPES.length - 1, i));
  if (nettoyer) { try { nettoyer(); } catch { /* rien */ } nettoyer = null; }
  document.querySelectorAll("ul.ac").forEach((p) => p.remove());   // popups d'autocomplétion des éditeurs précédents
  courant = i;
  const box = $("#etape"); box.innerHTML = "";
  nettoyer = ETAPES[i].rendre(box) || null;
  majNav();
  history.replaceState(null, "", "#" + (i + 1));
  window.scrollTo({ top: 0, behavior: "smooth" });
}
export function demarrer(etapes, cle) {
  ETAPES = etapes; cleProg = cle; prefixeCode = cle + ":";
  prog = store.get(cle, { faits: [] });
  activerCopie();
  $("#prec").addEventListener("click", () => aller(courant - 1));
  $("#suiv").addEventListener("click", () => aller(courant + 1));
  const h = parseInt(location.hash.slice(1), 10);
  aller(Number.isFinite(h) ? h - 1 : 0);
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

// exécute UN tour d'un programme dans une situation donnée
export const SITUATION_BASE = {
  requin_proche: false, algue_ici: false, plastique_ici: false, sur_plage: false, est_la_nuit: false, energie: 8, heure: 12,
  distance_algue: 4, distance_plage: 6, distance_requin: 9, tortue_a_cote: false, requin_derriere_tortue: false,
  mon_equipe: 1, mes_nids: 0, nids_voisine: 0, equipiere_a_cote: false, adversaire_a_cote: false, equipiere_fatiguee: false,
  requin_derriere_adversaire: false, nids_equipe: 0, nids_adversaires: 0,
  rang_equipe: 1, equipe_en_tete: true, equipe_rivale: 2, rivale_a_cote: false,
  requins_autour: 0, algues_autour: 2, requins_pres_algue: 0, distance_algue_sure: 4, algue_pres_plage: false, portions_algue: 5,
};
export function unTour(compiled, sit) {
  const base = { ...SITUATION_BASE, ...sit };
  return runTurn(compiled, Object.fromEntries(Object.entries(base).map(([k, v]) => [k, () => v])));
}

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
    cv.montrer({ conds: r.conds.map(([n, v]) => [n - 1, v]), ligne: r.actionLine && r.actionLine - 1 });
    box.querySelector(".resultat").innerHTML = r.action ? `→ ${phrase(r.action)}` : "→ 😐 Rien ne se passe : la condition est fausse, Python saute le bloc.";
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
              : `<div class="msg err">Presque ! Regarde les lignes ❌.</div>` + (essais >= 2 ? `<div class="msg warn">💡 ${indice}</div>` : ""));
      if (tout) { fait(cle); const b = el("button", { class: "btn big pulse" }, "Continuer →"); b.addEventListener("click", suivant); res.append(b); }
    }
    if (essais >= 2) box.querySelector(".sol").classList.remove("cache");
  });
  return ed;
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
//        autres:[{id, nom, couleur, code}], reussi(sim), bilan(sim), avance }
export function etapeMission(M) {
  return {
    court: M.court, titre: M.titre, cle: M.cle,
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
            if (essais >= 2) { res.innerHTML += `<div class="msg warn">💡 ${esc(M.indice)}</div>`; $("#sol", box).classList.remove("cache"); }
          }
        };
      });
      return () => viewer && viewer.destroy();
    },
  };
}

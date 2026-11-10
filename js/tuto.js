// =====================================================================
//  Lagon Arena — tutoriel pour grands débutants
//  Principe : un exemple à manipuler d'abord, très peu de texte,
//  puis un petit exercice vérifié tout de suite.
//  Le fil rouge : sortir du tutoriel avec une tortue QUI POND. Les deux pièges
//  vus en classe ont chacun leur étape : deux blocs if / else à la suite
//  (« une seule chaîne ») et le mauvais ordre des règles (« les priorités »).
//  La dernière étape fait construire la tortue complète avec ses tests en direct,
//  jusqu'au 🟢, puis l'emporter dans l'éditeur de la partie.
// =====================================================================
import { simulate, BOTS, MISSIONS, MISSIONS_PONTE, P, POINTS_RANG, BONUS_PROGRESSION, CODE_DEPART, tileAt } from "./engine.js";
import { compile } from "./interp.js";
import { icone } from "./render.js";
import { CodeView, CodeEditor, boiteOutils } from "./editor.js";
import { MatchViewer, tableauMatch } from "./viewer.js";
import { CAPTEURS as TOUS_CAPTEURS, ACTIONS_INFO as TOUTES_ACTIONS } from "./primitives.js";
import { $, el, esc, store, toast, lienPartie, CLE_TORTUE_TUTO } from "./common.js";
import { bascule, vf, capt, act, exemple, phrase, exercice, quiz, etapeMission, demarrer, fait, suivant, trous, regleFr } from "./tutokit.js";
import { etapePilote } from "./tuto-pilote.js";
import { MISSIONS_TUTO, CLE_TUTO } from "./parcours.js";
import { reglesCartesHTML } from "./regles-vue.js";
import { panneauRegles } from "./regles-panneau.js";
import { TESTS, situation, unTour, expliquerSituation, diagnostiquer, enTexteRiche } from "./moteur/diagnostic.js";
import { bilanHTML, brancherLiens, lignesEnCause, riche } from "./bilan.js";
import { coupDePouceHTML } from "./pouce.js";

// le tutoriel débutant ne montre que les primitives de base
const CAPTEURS = TOUS_CAPTEURS.filter((c) => !c.avance && !c.equipe), ACTIONS_INFO = TOUTES_ACTIONS.filter((a) => !a.avance && !a.equipe);

const GRAINE_MISSION = 7;

// match de démonstration (5 tortues d'entraînement)
let demo = null;
const COUL = ["#ff7b5c", "#ffc93c", "#4363d8", "#f032e6", "#3cb44b"];
const matchDemo = () => demo ||= simulate({
  joueurs: BOTS.map((b, i) => ({ id: b.nom, nom: b.nom, couleur: COUL[i], code: b.code })), graine: 2024, twist: "calme", version: 1,   // tutoriel : la carte classique (exemples choisis à l'avance)
});


// =====================================================================
//  Les étapes
// =====================================================================
const ETAPES = [];

// ---------- 1. Le jeu ----------
ETAPES.push({
  court: "1", titre: "Le jeu", mission: 1,
  rendre(box) {
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>🐢 Le jeu</h2>
      <div class="but">🥚 But : <b>pondre le plus de nids.</b></div>
      <div class="trio">
        <div><span>🌿</span>Manger<br><small>pour avoir de l'énergie</small></div>
        <div><span>🏖️🌙</span>Pondre<br><small>sur la plage, la nuit</small></div>
        <div><span>🦈</span>Fuir<br><small>les requins (sinon −1 nid)</small></div>
      </div>
      <p>Pas de manette : <b>tu écris le programme</b> de ta tortue en Python.<br>Puis toutes les tortues de la classe jouent <b>en même temps</b>.</p>
      <p class="muted">👉 Regarde : les nids apparaissent sur les plages la nuit.</p>
    </div><div><div id="vue"></div><div id="classement" class="petit" style="margin-top:10px"></div></div></div>`;
    const sim = matchDemo();
    const v = new MatchViewer($("#vue", box), { sim, vitesse: 5, pensee: false });
    v.player.onEnd = () => { $("#classement", box).innerHTML = tableauMatch(sim); setTimeout(() => v.player.play(), 4000); };
    return () => v.destroy();
  },
});

// ---------- 2. Le lagon ----------
ETAPES.push({
  court: "2", titre: "Le lagon", mission: 1,
  rendre(box) {
    const L = [["tortue", "Ta tortue"], ["herbier", "Algues = <b>nourriture</b> (elles se vident et repoussent ailleurs)"], ["plage", "Plage = on y <b>pond</b> (et pas de requin)"], ["nid", "Nid = <b>1 point</b>"],
      ["requin", "Requin = <b>danger</b> (−1 nid)"], ["sac", "Sac plastique = <b>poison</b>"], ["corail", "Corail = <b>mur</b>"], ["nuit", "Nuit = <b>l'heure de pondre</b>"]];
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>🗺️ Le lagon</h2>
      <div class="legende grosse">${L.map(([t, txt]) => `<canvas data-ic="${t}"></canvas><div>${txt}</div>`).join("")}</div>
    </div><div><div id="vue"></div><p class="petit muted">Pendant la 2<sup>e</sup> nuit : des nids sont déjà pondus sur les plages.</p></div></div>`;
    box.querySelectorAll("canvas[data-ic]").forEach((c) => icone(c, c.dataset.ic));
    const v = new MatchViewer($("#vue", box), { sim: matchDemo(), autoplay: false, pensee: false });
    v.player.seek(108);
    return () => v.destroy();
  },
});

// ---------- 3. Pilote ta tortue (à la main, sans code) ----------
ETAPES.push(etapePilote);

// ---------- 3. Les questions (capteurs) ----------
ETAPES.push({
  court: "1", titre: "Les questions", cle: "capteurs", mission: 2,
  rendre(box) {
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>❓ Ta tortue se pose des questions</h2>
      <div class="exemple-gros"><code>algue_ici()</code> = « Y a-t-il des algues ici ? »<br>Réponse : <span class="b-true">True</span> (oui) ou <span class="b-false">False</span> (non).</div>
      <p>Ces questions s'appellent des <b>capteurs</b> :</p>
      <table class="prims">${CAPTEURS.map((c) => `<tr><td>${c.icone}</td><td><code>${c.nom}()</code></td><td>${esc(c.role)}</td></tr>`).join("")}</table>
    </div><div class="card"><div id="q"></div><div id="vue" style="margin-top:10px"></div></div></div>`;
    // on cherche dans le match de démo des moments faciles à lire
    const sim = matchDemo();
    const trouver = (pred) => {
      for (const [i, t] of sim.tortues.entries()) {
        const tr = sim.traces[t.id];
        for (let k = 20; k < tr.length; k++) {
          const r = tr[k], f = sim.frames[k].tortues[i];
          if (r && r.capteurs && !r.bloquee && f[4] === 0 && f[5] === 0 && pred(r, k, t)) return { id: t.id, nom: t.nom, tick: k, r };
        }
      }
      return null;
    };
    const dist = (k, r) => Math.min(...sim.frames[k].requins.map((s) => Math.abs(s[0] - r.x) + Math.abs(s[1] - r.y)));
    const Q = [
      { cap: "algue_ici", m: trouver((r) => r.capteurs.algue_ici && !r.capteurs.requin_proche) },
      { cap: "requin_proche", m: trouver((r, k) => r.capteurs.requin_proche && dist(k, r) <= 2) },
      { cap: "sur_plage", m: trouver((r, k) => k > 50 && tileAt(r.x, r.y) === "eau" && !r.capteurs.requin_proche && !r.capteurs.est_la_nuit) },
      { cap: "est_la_nuit", m: trouver((r) => r.capteurs.est_la_nuit && r.capteurs.sur_plage) },
    ].filter((q) => q.m);
    const v = new MatchViewer($("#vue", box), { sim, autoplay: false, pensee: false, controles: false, noms: false, zoom: 2.4 });
    const questions = Q.map((q) => ({
      texte: `Regarde la tortue <b>entourée</b> ⭕ (au centre de l'image).<br>Que répond ${capt(q.cap)} ?`,
      options: [[true, "True <small>(oui)</small>"], [false, "False <small>(non)</small>"]],
      bon: q.m.r.capteurs[q.cap],
      pourquoi: `${capt(q.cap)} vaut ${vf(q.m.r.capteurs[q.cap])} : ${esc(CAPTEURS.find((c) => c.nom === q.cap).role)}`,
      m: q.m,
    }));
    questions.cle = "capteurs";
    quiz($("#q", box), "🔎 Quiz", questions, (q) => { v.suivre(q.m.id); v.player.seek(q.m.tick); });
    return () => v.destroy();
  },
});

// ---------- 4. Les ordres (actions) ----------
ETAPES.push({
  court: "2", titre: "Les ordres", cle: "actions", mission: 2,
  rendre(box) {
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>❗ Ta tortue obéit à des ordres</h2>
      <div class="exemple-gros"><code>manger()</code> = « Mange ! »<br>À chaque tour : <b>un seul ordre</b>, le premier que Python lit.</div>
      <p>Ces ordres s'appellent des <b>actions</b> :</p>
      <table class="prims">${ACTIONS_INFO.map((a) => `<tr><td>${a.icone}</td><td><code>${a.nom}()</code></td><td>${esc(a.role)}</td></tr>`).join("")}</table>
    </div><div class="card" id="q"></div></div>`;
    const opts = ["manger", "pondre", "fuir", "aller_vers_plage"].map((a) => [a, act(a)]);
    const questions = [
      { texte: "🌿 Tu es sur des algues et tu as faim.", bon: "manger", pourquoi: "Sur des algues, on mange : +3 ⚡." },
      { texte: "🦈 Un requin fonce sur toi !", bon: "fuir", pourquoi: "Le danger d'abord : on fuit." },
      { texte: "🏖️🌙 Tu es sur la plage, il fait nuit, tu as 9 ⚡.", bon: "pondre", pourquoi: "Plage + nuit + assez d'énergie : on pond. +1 point !" },
      { texte: "🌙 Il fait nuit et tu es loin de la plage.", bon: "aller_vers_plage", pourquoi: "Pour pondre, il faut d'abord aller sur la plage." },
    ].map((q) => ({ ...q, options: opts }));
    questions.cle = "actions";
    quiz($("#q", box), "🧩 Quel ordre donner ?", questions);
  },
});

// ---------- Si… alors… : la règle en français (deux listes), avant tout code ----------
ETAPES.push({
  court: "3", titre: "Si… alors…", cle: "sialors", mission: 2,
  rendre(box) {
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>🗣️ Si… alors…</h2>
      <p>Ta tortue obéit à des <b>règles</b>. Une règle, c'est :</p>
      <div class="formule"><span class="f-q">❓ une question</span><b>→</b><span class="f-a">❗ un ordre</span></div>
      <p class="phrase-fr">« <b>Si</b> un requin est proche, <b>alors</b> fuis. »</p>
      <p>Si la réponse est <b>oui</b> (<span class="b-true">True</span>), la tortue obéit. Si c'est <b>non</b> (<span class="b-false">False</span>), elle passe à la règle suivante.</p>
      <p class="muted">👉 Choisis dans les listes les 3 règles d'une bonne tortue. Le code Python s'écrit tout seul en dessous.</p>
    </div><div class="card" id="exo"></div></div>`;
    regleFr($("#exo", box), { cle: "sialors", taches: [
      { texte: "1. 🦈 Pour <b>ne pas se faire attraper</b> :", q: "requin_proche()", a: "fuir", bravo: "Si un requin est proche → fuir.", conseilQ: "Quelle question parle du danger ?", conseilA: "Face à un requin, que faut-il faire ?" },
      { texte: "2. 🥚 Pour <b>pondre</b> :", q: "sur_plage() and est_la_nuit()", a: "pondre", bravo: "Sur la plage ET la nuit → pondre.", conseilQ: "Pour pondre, il faut DEUX choses à la fois : la plage et la nuit.", conseilA: "Quel ordre fait un nid ?" },
      { texte: "3. 🌿 Pour <b>reprendre des forces</b> :", q: "algue_ici()", a: "manger", bravo: "Des algues ici → manger.", conseilQ: "Où trouve-t-on à manger ?", conseilA: "Sur les algues, que faire ?" },
    ] });
  },
});

// ---------- De la règle au code : compléter (sans clavier) ----------
ETAPES.push({
  court: "1", titre: "Complète le code", cle: "trous", mission: 3,
  rendre(box) {
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>🧩 De la règle au code</h2>
      <p>La même règle, en français puis en Python :</p>
      <div class="traduction pas-copie">
        <div class="tr-fr">« <b>Si</b> un requin est proche, <b>alors</b> fuis. »</div>
        <div class="tr-fleche" aria-hidden="true">⬇️</div>
        <pre class="modele"><span class="tok-kw">if</span> <span class="tok-sens">requin_proche</span>():
    <span class="tok-act">fuir</span>()</pre>
      </div>
      <ul class="points">
        <li><code>if</code> veut dire <b>si</b>.</li>
        <li>Les parenthèses <code>()</code> : on <b>pose</b> la question, on <b>donne</b> l'ordre.</li>
        <li>Les <b>deux-points</b> <code>:</code> terminent la ligne du <code>if</code>.</li>
        <li>L'ordre est <b>décalé de 4 espaces</b> : il est « dans » le <code>if</code>.</li>
      </ul>
    </div><div class="card" id="exo"></div></div>`;
    trous($("#exo", box), {
      cle: "trous", consigne: "Complète pour écrire : « <b>Si</b> il y a des algues ici, <b>alors</b> mange. »",
      morceaux: ["if ", { id: "q", label: "la question", choix: ["requin_proche()", "algue_ici()", "sur_plage()", "est_la_nuit()"] }, ":\n    ", { id: "a", label: "l'ordre", choix: ["fuir()", "manger()", "pondre()", "aller_vers_plage()"] }],
      cas: [{ texte: "🌿 sur des algues", sit: { algue_ici: true }, attendu: "manger" }, { texte: "🌊 pas d'algues", sit: { algue_ici: false }, pas: "manger" }],
      appris: "Tu as écrit ta première règle en Python ! À l'étape suivante, tu l'écris toi-même, au clavier.",
    });
  },
});

// ---------- 5. Mon premier if ----------
ETAPES.push({
  court: "2", titre: "Mon premier if", cle: "if", mission: 3,
  rendre(box) {
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>✍️ Ton premier <code>if</code></h2>
      <p class="phrase-fr">« <b>Si</b> il y a des algues, <b>alors</b> mange. »</p>
      <div class="anatomie">
        <div class="ligne-code"><span class="a a1">if</span> <span class="a a2">algue_ici()</span><span class="a a3">:</span></div>
        <div class="ligne-code"><span class="a a4">····</span><span class="a a5">manger()</span></div>
        <ol class="leg">
          <li><span class="a a1">if</span> = <b>si</b></li>
          <li><span class="a a2">algue_ici()</span> = la <b>question</b></li>
          <li><span class="a a3">:</span> = <b>deux-points</b> (obligatoires !)</li>
          <li><span class="a a4">····</span> = <b>4 espaces</b> (touche <kbd>Tab</kbd>) : la ligne est « dans » le if</li>
          <li><span class="a a5">manger()</span> = l'<b>ordre</b>, fait seulement si la réponse est True</li>
        </ol>
      </div>
      <h3>🔬 Essaie :</h3><div id="ex"></div>
    </div><div class="card" id="exo"></div></div>`;
    exemple($("#ex", box), "if algue_ici():\n    manger()", ["algue_ici"], { algue_ici: true }, phrase);
    exercice($("#exo", box), {
      cle: "if",
      consigne: `Écris : « <b>Si</b> un requin est proche, <b>alors</b> fuir. »<br><span class="petit muted">La ligne <code>def tour():</code> est déjà écrite : écris <b>en dessous</b>. Astuce : tape <code>si</code> ou clique dans la boîte à outils.</span>`,
      cas: [{ texte: "🦈 requin proche", sit: { requin_proche: true }, attendu: "fuir" }, { texte: "😌 pas de requin", sit: { requin_proche: false }, pas: "fuir" }],
      solution: "def tour():\n    if requin_proche():\n        fuir()\n",
      indice: "Écris <code>if requin_proche():</code> puis appuie sur <kbd>Entrée</kbd> : la ligne suivante se décale toute seule. Écris alors <code>fuir()</code>.",
      avance: false,
      outils: { capteurs: ["requin_proche", "algue_ici", "sur_plage"], actions: ["fuir", "manger", "pondre"], mots: ["if"] },
    });
  },
});

// ---------- 6. else ----------
ETAPES.push({
  court: "3", titre: "else (sinon)", cle: "else", mission: 3,
  rendre(box) {
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>↔️ <code>else</code> = sinon</h2>
      <p class="phrase-fr">« <b>Si</b> il y a des algues, mange. <b>Sinon</b>, va vers les algues. »</p>
      <div id="ex"></div>
      <ul class="points">
        <li><code>else:</code> = <b>dans tous les autres cas</b>.</li>
        <li>Pas de question après <code>else</code>, mais toujours les <b>deux-points</b>.</li>
        <li><code>else</code> est aligné avec son <code>if</code>.</li>
      </ul>
    </div><div class="card" id="exo"></div></div>`;
    exemple($("#ex", box), "if algue_ici():\n    manger()\nelse:\n    aller_vers_algue()", ["algue_ici"], { algue_ici: false }, phrase);
    exercice($("#exo", box), {
      cle: "else",
      consigne: "Écris : « <b>Si</b> tu es sur la plage, pondre. <b>Sinon</b>, aller vers la plage. »",
      cas: [{ texte: "🏖️ sur la plage", sit: { sur_plage: true, est_la_nuit: true }, attendu: "pondre" }, { texte: "🌊 dans l'eau", sit: { sur_plage: false }, attendu: "aller_vers_plage" }],
      solution: "def tour():\n    if sur_plage():\n        pondre()\n    else:\n        aller_vers_plage()\n",
      indice: "Après <code>pondre()</code>, appuie sur <kbd>Entrée</kbd> puis efface 4 espaces (<kbd>⌫</kbd>) pour revenir sous le <code>if</code>. Écris <code>else:</code>.",
      avance: false,
      outils: { capteurs: ["sur_plage", "est_la_nuit", "algue_ici"], actions: ["pondre", "aller_vers_plage", "manger"], mots: ["if", "else"] },
    });
  },
});

// ---------- 7. and ----------
ETAPES.push({
  court: "4", titre: "and (et)", cle: "and", mission: 3,
  rendre(box) {
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>🤝 <code>and</code> = et</h2>
      <p class="phrase-fr">Pour pondre, il faut être <b>sur la plage</b> <b>ET</b> que ce soit <b>la nuit</b>.</p>
      <div id="bascules" class="row" style="gap:18px"></div>
      <div class="codeview" id="cond" style="margin-top:12px"></div>
      <div id="verdict" class="msg"></div>
      <p class="petit muted">Il faut aussi au moins ${P.energiePonte} ⚡ : on peut écrire <code>and energie() >= ${P.energiePonte}</code>.</p>
    </div><div class="card" id="exo"></div></div>`;
    const s = { plage: true, nuit: false };
    const maj = () => {
      const ok = s.plage && s.nuit;
      $("#cond", box).innerHTML = `<span class="l"><span class="n">1</span><span class="tok-kw">if</span> <span class="tok-sens">sur_plage</span>() <span class="tok-kw">and</span> <span class="tok-sens">est_la_nuit</span>():</span>` +
        `<span class="l ${ok ? "act" : ""}"><span class="n">2</span>    <span class="tok-act">pondre</span>()</span>` +
        `<div class="detail-cond"><span>${vf(s.plage)}</span><span class="tok-kw">and</span><span>${vf(s.nuit)}</span><span>→</span><span>${vf(ok)}</span></div>`;
      const v = $("#verdict", box);
      v.className = "msg " + (ok ? "ok" : "err");
      v.innerHTML = ok ? "🥚 Les deux sont vrais : <b>la tortue pond !</b>" : "⛔ Une seule réponse fausse suffit : <b>pas de ponte</b>.";
    };
    $("#bascules", box).append(bascule("🏖️ <code>sur_plage()</code>", s.plage, (v) => { s.plage = v; maj(); }), bascule("🌙 <code>est_la_nuit()</code>", s.nuit, (v) => { s.nuit = v; maj(); }));
    maj();
    exercice($("#exo", box), {
      cle: "and",
      consigne: "Écris : « <b>Si</b> tu es sur la plage <b>et</b> qu'il fait nuit, pondre. <b>Sinon</b>, aller vers la plage. »",
      cas: [
        { texte: "🏖️ plage + 🌙 nuit", sit: { sur_plage: true, est_la_nuit: true }, attendu: "pondre" },
        { texte: "🏖️ plage + ☀️ jour", sit: { sur_plage: true, est_la_nuit: false }, attendu: "aller_vers_plage" },
        { texte: "🌊 eau + 🌙 nuit", sit: { sur_plage: false, est_la_nuit: true }, attendu: "aller_vers_plage" },
      ],
      solution: "def tour():\n    if sur_plage() and est_la_nuit():\n        pondre()\n    else:\n        aller_vers_plage()\n",
      indice: "La première ligne : <code>if sur_plage() and est_la_nuit():</code>",
      avance: false,
      outils: { capteurs: ["sur_plage", "est_la_nuit"], actions: ["pondre", "aller_vers_plage"], mots: ["if", "else", "and"] },
    });
  },
});

// ---------- 8. elif ----------
ETAPES.push({
  court: "5", titre: "elif", cle: "elif", mission: 3,
  rendre(box) {
    const code = "if requin_proche():\n    fuir()\nelif algue_ici():\n    manger()\nelse:\n    aller_vers_algue()";
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>🔝 <code>elif</code> : le premier vrai gagne</h2>
      <p class="phrase-fr">« <b>Si</b> requin, fuis. <b>Sinon si</b> algues, mange. <b>Sinon</b>, va vers les algues. »</p>
      <div id="ex"></div>
      <div class="msg info">Python lit <b>de haut en bas</b>. Il fait <b>seulement le premier vrai</b> et ignore la suite.<br>👉 Le plus important (le danger) se met <b>en haut</b>.</div>
    </div><div class="card" id="q"></div></div>`;
    const ex = exemple($("#ex", box), code, ["requin_proche", "algue_ici"], { requin_proche: false, algue_ici: true }, phrase);
    const opts = ["fuir", "manger", "aller_vers_algue"].map((a) => [a, act(a)]);
    const questions = [
      { sit: { requin_proche: true, algue_ici: true }, texte: "🦈 Un requin est proche <b>et</b> 🌿 tu es sur des algues.", bon: "fuir", pourquoi: "La 1<sup>re</sup> condition est vraie : Python s'arrête là. La tortue fuit (elle ne mange pas)." },
      { sit: { requin_proche: false, algue_ici: true }, texte: "😌 Pas de requin, 🌿 tu es sur des algues.", bon: "manger", pourquoi: "1<sup>re</sup> condition fausse, 2<sup>e</sup> vraie : elle mange." },
      { sit: { requin_proche: false, algue_ici: false }, texte: "😌 Pas de requin, 🌊 pas d'algues.", bon: "aller_vers_algue", pourquoi: "Tout est faux : c'est le <code>else</code>." },
    ].map((q) => ({ ...q, options: opts, apres: () => ex.regler(q.sit) }));
    questions.cle = "elif";
    quiz($("#q", box), "🎯 Devine ce que fait la tortue", questions);
  },
});

// ---------- 9. Une seule chaîne ----------
// le piège n° 1 en classe : un 2e bloc if / else ajouté sous le premier… qui ne sert jamais
const DEUX_BLOCS = "if algue_ici():\n    manger()\nelse:\n    aller_vers_algue()\nif sur_plage() and est_la_nuit():\n    pondre()\nelse:\n    aller_vers_plage()";
const UNE_CHAINE = "def tour():\n    if sur_plage() and est_la_nuit():\n        pondre()\n    elif est_la_nuit():\n        aller_vers_plage()\n    elif algue_ici():\n        manger()\n    else:\n        aller_vers_algue()\n";
ETAPES.push({
  court: "1", titre: "Une seule chaîne", cle: "chaine", mission: 4,
  rendre(box) {
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>🔗 Une seule chaîne</h2>
      <p class="phrase-fr">À chaque tour, ta tortue fait <b>une seule action</b> : la <b>première</b> que Python rencontre.</p>
      <p>Cette tortue a <b>deux blocs</b> <code>if</code> / <code>else</code> à la suite. Joue avec les interrupteurs :</p>
      <div id="ex"></div>
      <div class="msg warn">⚠️ Le premier bloc fait <b>toujours</b> une action (son <code>if</code> ou son <code>else</code>)… donc le second bloc ne sert <b>jamais</b> : <b>elle ne pond jamais</b> !</div>
      <div class="msg ok">✅ La solution : <b>une seule chaîne</b>. Un <code>if</code>, des <code>elif</code>, et un seul <code>else</code> tout en bas.</div>
    </div><div class="card" id="exo"></div></div>`;
    exemple($("#ex", box), DEUX_BLOCS, ["algue_ici", "sur_plage", "est_la_nuit"], { algue_ici: false, sur_plage: true, est_la_nuit: true }, phrase);
    exercice($("#exo", box), {
      cle: "chaine",
      consigne: "Répare cette tortue : fais-en <b>une seule chaîne</b> <code>if</code> / <code>elif</code> / <code>else</code>, pour qu'elle ponde la nuit sur la plage.",
      depart: "def tour():\n" + DEUX_BLOCS.split("\n").map((l) => "    " + l).join("\n") + "\n",
      cas: [
        { texte: "🌙 nuit, 🏖️ sur la plage", sit: { sur_plage: true, est_la_nuit: true, heure: 22 }, attendu: "pondre" },
        { texte: "🌙 nuit, 🌊 dans l'eau", sit: { est_la_nuit: true, heure: 22 }, attendu: "aller_vers_plage" },
        { texte: "☀️ jour, 🌿 sur des algues", sit: { algue_ici: true }, attendu: "manger" },
        { texte: "☀️ jour, 🌊 dans l'eau", sit: {}, attendu: "aller_vers_algue" },
      ],
      solution: UNE_CHAINE,
      indice: "Mets la règle de ponte <b>en premier</b> (<code>if sur_plage() and est_la_nuit():</code>), puis <code>elif est_la_nuit():</code>, puis <code>elif algue_ici():</code>, et garde <b>un seul</b> <code>else:</code> tout en bas.",
      avance: false,
      outils: { capteurs: ["sur_plage", "est_la_nuit", "algue_ici"], actions: ["pondre", "aller_vers_plage", "manger", "aller_vers_algue"], mots: ["if", "elif", "else", "and"] },
    });
  },
});

// ---------- 10. L'ordre des priorités ----------
// le piège n° 2 : les bonnes règles, dans le mauvais ordre (manger d'abord, rentrer avant de pondre…)
const REGLES = {
  requin: { icone: "🦈", fr: "un requin est proche → <b>fuir</b>", cond: "requin_proche()", act: "fuir()" },
  pondre: { icone: "🥚", fr: "sur la plage <b>et</b> la nuit → <b>pondre</b>", cond: "sur_plage() and est_la_nuit()", act: "pondre()" },
  rentrer: { icone: "🌙", fr: "il fait nuit → <b>aller vers la plage</b>", cond: "est_la_nuit()", act: "aller_vers_plage()" },
  manger: { icone: "🌿", fr: "des algues → <b>manger</b>", cond: "algue_ici()", act: "manger()" },
};
const ORDRE_DEPART = ["manger", "rentrer", "pondre", "requin"];
const TESTS_ORDRE = ["ponte", "rentrer", "rentrer_algues", "manger", "chercher", "requin_algues"].map((id) => TESTS.find((t) => t.id === id));
const codeOrdre = (ordre) => "def tour():\n" + ordre.map((id, i) => `    ${i ? "elif" : "if"} ${REGLES[id].cond}:\n        ${REGLES[id].act}\n`).join("") + "    else:\n        aller_vers_algue()\n";
ETAPES.push({
  court: "2", titre: "L'ordre des priorités", cle: "ordre", mission: 4,
  rendre(box) {
    const CLE = "lagon:tuto2:ordre";
    let ordre = store.get(CLE);
    if (!Array.isArray(ordre) || ordre.length !== 4 || !ordre.every((id) => REGLES[id])) ordre = [...ORDRE_DEPART];
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>🔝 L'ordre des priorités</h2>
      <p class="phrase-fr">Le <b>premier vrai gagne</b> : la règle la plus <b>importante</b> se met <b>en haut</b>.</p>
      <p>Range les 4 règles avec les flèches ⬆️ ⬇️, jusqu'à ce que <b>tous les tests</b> soient ✅.</p>
      <ol class="regles-ordre" id="cartes"></ol>
      <div class="carte-regle fixe"><span class="rang">5</span><span class="ic">➡️</span><span class="fr"><b>Sinon</b> → aller vers les algues</span><span class="petit muted">(toujours en dernier)</span></div>
      <h3 style="margin-top:14px">🐍 Le code que ça donne</h3><div id="code"></div>
    </div><div class="card"><h3>🧪 Les tests</h3><p class="petit muted">Un seul tour dans chaque situation : quelle est la <b>première</b> action ?</p><div id="tests"></div><div id="res"></div></div></div>`;
    const cv = new CodeView($("#code", box));
    let reussi = false;
    const maj = (focus) => {
      store.set(CLE, ordre);
      $("#cartes", box).innerHTML = ordre.map((id, i) => `<li class="carte-regle" data-id="${id}"><span class="rang">${i + 1}</span><span class="ic">${REGLES[id].icone}</span>
        <span class="fr"><b>${i ? "Sinon, si" : "Si"}</b> ${REGLES[id].fr}</span>
        <span class="fleches"><button type="button" class="btn small ghost" data-sens="-1" aria-label="Monter la règle ${i + 1}" ${i === 0 ? "disabled" : ""}>⬆️</button><button type="button" class="btn small ghost" data-sens="1" aria-label="Descendre la règle ${i + 1}" ${i === ordre.length - 1 ? "disabled" : ""}>⬇️</button></span></li>`).join("");
      const code = codeOrdre(ordre), comp = compile(code);
      cv.setCode(code);
      const res = TESTS_ORDRE.map((t) => { const r = unTour(comp, situation(t.sit)); return { t, r, ok: t.attendu.includes(r.action) }; });
      $("#tests", box).innerHTML = `<div class="table-defile"><table class="cas"><tr><th>Situation</th><th>Attendu</th><th>Ta tortue</th><th></th></tr>${res.map(({ t, r, ok }) =>
        `<tr class="${ok ? "ok" : "ko"}"><td>${t.titre}</td><td>${riche(t.attenduTxt)}</td><td>${r.action ? act(r.action) : "rien"}</td><td>${ok ? "✅" : "❌"}</td></tr>`).join("")}</table></div>`;
      const rate = res.find((x) => !x.ok);
      if (rate) {
        const e = expliquerSituation(comp, situation(rate.t.sit), rate.t);
        cv.montrer({ conds: e.tr.conds, ligne: e.tr.actionLine, extra: e.tr.extra });
        $("#res", box).innerHTML = `<div class="msg explique">🔍 <b>${rate.t.titre}</b> : ${[e.agit, e.raison].filter(Boolean).map(enTexteRiche).join(" ")}</div>`;
      } else {
        cv.montrer(null);
        $("#res", box).innerHTML = `<div class="msg ok bravo">🎉 <b>Bravo !</b> Ta tortue fait la bonne action dans toutes les situations.</div>
          <div class="appris">🎓 L'ordre qui marche : <b>🦈 le danger</b>, puis <b>🥚 pondre</b>, puis <b>🌙 rentrer la nuit</b>, puis <b>🌿 manger</b>, et <b>➡️ sinon</b>, chercher à manger.</div>`;
        if (!reussi) { reussi = true; fait("ordre"); }
        const b = el("button", { class: "btn big pulse", style: "margin-top:10px" }, "Continuer →"); b.addEventListener("click", suivant); $("#res", box).append(b);
      }
      if (focus) { const b = box.querySelector(`.carte-regle[data-id="${focus.id}"] [data-sens="${focus.sens}"]`) || box.querySelector(`.carte-regle[data-id="${focus.id}"] button:not([disabled])`); if (b) b.focus(); }
    };
    $("#cartes", box).addEventListener("click", (e) => {
      const b = e.target.closest("[data-sens]"); if (!b) return;
      const id = b.closest(".carte-regle").dataset.id, i = ordre.indexOf(id), j = i + Number(b.dataset.sens);
      if (j < 0 || j >= ordre.length) return;
      [ordre[i], ordre[j]] = [ordre[j], ordre[i]];
      maj({ id, sens: b.dataset.sens });
    });
    maj();
  },
});

// ---------- 11. Énergie et dangers ----------
ETAPES.push({
  court: "4", titre: "Les règles", cle: "regles", mission: 1,
  rendre(box) {
    box.innerHTML = `<h2 class="titre-etape">📜 Les règles en 1 minute</h2>
    <p class="chapo">Tout le jeu tient en 6 cartes. Lis-les, puis essaie l'énergie à droite (ou en dessous).</p>
    <div class="etape etape-regles"><div>${reglesCartesHTML()}</div><div class="card">
      <h3>⚡ L'énergie : essaie !</h3>
      <div class="jauge" id="jauge"><div></div><span></span></div>
      <p id="nids" class="bigscore" style="margin:10px 0"></p>
      <div class="row">
        <button class="btn vert small" data-a="manger">😋 manger()</button>
        <button class="btn small" data-a="pondre">🥚 pondre()</button>
        <button class="btn sombre small" data-a="temps">⏳ 6 tours passent</button>
        <button class="btn corail small" data-a="plastique">🛍️ manger un sac</button>
      </div>
      <div id="log" class="msg info">Clique sur les boutons.</div>
      <div id="vf" class="quiz-vf"></div>
    </div></div>`;
    let e = P.energieDepart, n = 0;
    const maj = (msg, type = "info") => {
      $("#jauge div", box).style.width = (100 * e / P.energieMax) + "%";
      $("#jauge span", box).textContent = `⚡ ${e} / ${P.energieMax}`;
      $("#nids", box).innerHTML = `<span class="bloc"><b>${n}</b>nid${n > 1 ? "s" : ""} 🥚</span>`;
      if (msg) { const l = $("#log", box); l.className = "msg " + type; l.innerHTML = msg; }
    };
    box.querySelectorAll("[data-a]").forEach((b) => b.addEventListener("click", () => {
      const a = b.dataset.a;
      if (a === "manger") { if (e >= P.energieMax) return maj("Plus faim ! (déjà 10 ⚡)", "warn"); e = Math.min(P.energieMax, e + P.gainAlgue); maj(`Miam ! +${P.gainAlgue} ⚡`, "ok"); }
      else if (a === "pondre") { if (e < P.energiePonte) return maj(`⛔ Refusé : il faut ${P.energiePonte} ⚡. Mange d'abord !`, "err"); e -= P.coutPonte; n++; maj(`🥚 Un nid ! (−${P.coutPonte} ⚡)`, "ok"); }
      else if (a === "temps") { e--; maj("La nage fatigue : −1 ⚡"); }
      else { e -= P.pertePlastique; maj(`Beurk ! −${P.pertePlastique} ⚡`, "err"); }
      if (e <= 0) { e = 5; maj("😵 <b>Épuisée !</b> Retour au départ, bloquée 5 tours.", "err"); }
    }));
    maj();
    const VF = [[true, "Vrai"], [false, "Faux"]];
    const questions = [
      { texte: "🏖️☀️ On peut pondre <b>le jour</b>, sur la plage.", bon: false, pourquoi: "On ne pond que <b>la nuit</b> (de 19 h à 6 h)." },
      { texte: "🌿 Manger des algues donne de l'énergie.", bon: true, pourquoi: `+${P.gainAlgue} ⚡ à chaque bouchée.` },
      { texte: "🏖️🦈 Sur la plage, un requin peut t'attraper.", bon: false, pourquoi: "La plage est un <b>refuge</b> : jamais de requin." },
      { texte: "🧠 À chaque tour, ta tortue peut faire <b>deux</b> actions.", bon: false, pourquoi: "<b>Une seule</b> action par tour : la première règle vraie." },
    ].map((q) => ({ ...q, options: VF }));
    questions.cle = "regles";
    quiz($("#vf", box), "✔️ Vrai ou faux ?", questions);
  },
});

// ---------- 12 et 13. Missions : réparer une tortue dans le lagon ----------
const MB = MISSIONS_PONTE[0], MR = MISSIONS.find((m) => m.id === 2);
ETAPES.push(etapeMission({
  court: "3", mission: 4, cle: "mB", titre: "🔧 " + MB.titre, notion: MB.notion,
  probleme: "😟 " + MB.histoire, objectif: MB.objectif, code: MB.code, indice: MB.indice, solution: MB.solution,
  appris: "L'ordre des règles, c'est l'ordre des priorités : <b>pondre</b>, puis <b>rentrer la nuit</b>, puis <b>manger</b>.",
  scenario: MB.scenario, graine: GRAINE_MISSION, reussi: MB.reussi, bilan: MB.bilan, avance: false, test: MB.test,
}));
ETAPES.push(etapeMission({
  court: "4", mission: 4, cle: "m2", titre: "🔧 Gare au requin", notion: MR.notion,
  probleme: "😟 Elle mange même quand un requin arrive.", objectif: MR.objectif, code: MR.code, indice: MR.indice,
  solution: "def tour():\n    if requin_proche():\n        fuir()\n    elif algue_ici():\n        manger()\n    else:\n        aller_vers_algue()\n",
  appris: "<b>L'ordre compte</b> : le danger se teste <b>en premier</b>.",
  scenario: MR.scenario, graine: GRAINE_MISSION, reussi: MR.reussi, bilan: MR.bilan, avance: false, test: "requin_algues",
}));

// ---------- 14. Construis ta tortue (avec ses tests en direct, jusqu'au 🟢) ----------
ETAPES.push({
  court: "🐢", titre: "Construis ta tortue", cle: "construis", mission: 4,
  rendre(box) {
    const CLE = "lagon:tuto2:construis";
    box.innerHTML = `<div class="etape"><div>
      <h2 style="margin-top:0">🐢 Construis ta tortue</h2>
      <p>Voici la <b>tortue de départ</b> de la partie : elle mange… mais <b>ne pond jamais</b>. Complète-la jusqu'au <b>🟢</b>.</p>
      <div class="objectif">🎯 Une seule chaîne, dans l'ordre : 🦈 danger → 🥚 pondre → 🌙 rentrer la nuit → 🌿 manger → ➡️ sinon, chercher à manger.</div>
      <div id="ed" style="margin-top:10px"></div><div id="boite"></div>
      <div class="row" style="margin-top:6px"><button type="button" class="btn ghost small" id="mr-btn">🧩 Ajouter une règle sans taper</button></div>
      <div id="mr" class="cache"></div>
      <div id="statut" class="editor-status" aria-live="polite"></div>
    </div><div>
      <div class="card">
        <h3>🧪 Ses tests se mettent à jour pendant que tu écris</h3>
        <p class="petit">Chaque test fait jouer <b>un tour</b> à ta tortue dans une situation. Un ❌ te dit <b>quelle ligne</b> agit à la place, et <b>pourquoi</b>. Clique sur « ligne 5 » pour y aller.</p>
        <div class="row">
          <button class="btn ghost small" id="pouce-btn">💡 Coup de pouce</button>
          <button class="btn small" id="jouer">▶ La voir jouer</button>
          <button class="btn ghost small" id="depart">↺ Tortue de départ</button>
        </div>
        <div id="pouce" class="cache"></div>
        <div id="fin"></div>
      </div>
      <div id="vue" class="vue-mission" style="margin-top:12px"></div>
    </div></div>`;
    const ed = new CodeEditor($("#ed", box), { value: store.get(CLE) || CODE_DEPART, onChange: (v) => { store.set(CLE, v); clearTimeout(minu); minu = setTimeout(maj, 300); }, avance: false });
    boiteOutils($("#boite", box), ed);
    brancherLiens($("#statut", box), ed);
    let minu = null, viewer = null, vert = false;
    const fin = $("#fin", box);
    // 🧩 sans clavier : on choisit la question, l'ordre et le rang ; le code s'écrit tout seul
    const mr = panneauRegles($("#mr", box), { lire: () => ed.value, ecrire: (c) => { ed.value = c; store.set(CLE, c); maj(); } });
    $("#mr-btn", box).addEventListener("click", () => { $("#mr", box).classList.toggle("cache"); $("#mr-btn", box).classList.toggle("on"); mr.dessiner(); });
    function maj() {
      mr.dessiner();
      const d = diagnostiquer(ed.value), st = $("#statut", box);
      if (!d.ok) { ed.setErreur(d.erreur.line); st.innerHTML = `<div class="msg err">🐞 <b>Ligne ${d.erreur.line}</b> : ${esc(d.erreur.message)}</div>`; return; }
      st.innerHTML = bilanHTML(d, { ouvert: true });
      ed.marquer(lignesEnCause(d));
      const maintenant = d.verdict.couleur === "vert";
      if (maintenant && !vert) {
        fait("construis");
        fin.innerHTML = `<div class="msg ok bravo">🎉 <b>Ta tortue sait pondre !</b> Emporte-la : elle t'attendra dans l'éditeur de la partie.</div>
          <div class="row"><button class="btn vert" id="emporter">🐢 Emporter ma tortue</button></div>`;
        $("#emporter", box).addEventListener("click", emporter);
      } else if (!maintenant) fin.innerHTML = vert ? `<div class="msg warn">Oups : elle ne réussit plus tous les tests ❌. Regarde l'explication sous ton code.</div>` : "";
      vert = maintenant;
    }
    function emporter() {
      store.set(CLE_TORTUE_TUTO, { code: ed.value, at: Date.now(), pris: [] });
      fin.innerHTML = `<div class="msg ok">🐢 <b>C'est fait !</b> Ta tortue t'attend dans l'éditeur de la partie (et du bac à sable).</div>
        <div class="row"><a class="btn vert" href="${lienPartie()}">🐢 Rejoindre la partie</a><a class="btn ghost" href="eleve.html?libre=1">🧪 S'entraîner</a><button class="btn ghost small" id="suite">Continuer le tutoriel →</button></div>`;
      $("#suite", box).addEventListener("click", suivant);
      toast("🐢 Ta tortue est emportée !");
    }
    $("#pouce-btn", box).addEventListener("click", () => {
      const p = $("#pouce", box);
      if (!p.classList.contains("cache")) { p.classList.add("cache"); return; }
      p.innerHTML = coupDePouceHTML(ed.value); p.classList.remove("cache");
    });
    $("#depart", box).addEventListener("click", () => {
      if (!confirm("Repartir de la tortue de départ ? (ton code actuel sera perdu)")) return;
      ed.value = CODE_DEPART; store.set(CLE, CODE_DEPART); maj();
    });
    $("#jouer", box).addEventListener("click", () => {
      const d = diagnostiquer(ed.value);
      if (!d.ok) { ed.setErreur(d.erreur.line); return; }
      const COUL = ["#ffc93c", "#4363d8", "#f032e6", "#3cb44b"];
      const sim = simulate({ joueurs: [{ id: "moi", nom: "Ta tortue", couleur: "#ff7b5c", code: ed.value }, ...BOTS.slice(1).map((b, i) => ({ id: b.nom, nom: b.nom, couleur: COUL[i], code: b.code }))],
        graine: 1 + Math.floor(Math.random() * 1e6), twist: "calme" });
      if (viewer) viewer.destroy();
      viewer = new MatchViewer($("#vue", box), { sim, focus: "moi", code: ed.value, vitesse: 6 });
      viewer.player.onEnd = () => {
        const r = sim.resultats.find((x) => x.id === "moi");
        $("#vue", box).insertAdjacentHTML("beforeend", `<div class="msg ${r.nids ? "ok" : "err"}" style="margin-top:8px">${r.nids ? `🥚 Ta tortue a pondu <b>${r.nids} nid${r.nids > 1 ? "s" : ""}</b> : ${r.rang}<sup>${r.rang > 1 ? "e" : "re"}</sup> sur ${sim.resultats.length}.` : "😟 0 nid dans cette partie. Regarde ses tests ❌ et « Dans la tête de ta tortue »."}</div>`);
      };
    });
    maj();
    return () => viewer && viewer.destroy();
  },
});

ETAPES.push({
  court: "🏆", titre: "C'est parti !", mission: 4,
  rendre(box) {
    const pts = POINTS_RANG.slice(0, 5).map((p, i) => `<td><b>${i + 1}<sup>${i ? "e" : "er"}</sup></b><br>${p} pts</td>`).join("");
    const tt = store.get(CLE_TORTUE_TUTO);
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>🏆 En classe</h2>
      <ol class="seance">
        <li>🔑 Tape le <b>code</b> du tableau et un <b>pseudo</b>.</li>
        <li>⌨️ <b>Améliore</b> ta tortue, <b>teste</b>-la, puis <b>📤 envoie</b>-la.</li>
        <li>🎬 <b>Brawl</b> : toutes les tortues au tableau !</li>
        <li>🔍 Revois <b>ta</b> tortue : que s'est-il passé ?</li>
        <li>🔁 <b>Rematch</b> : corrige et recommence.</li>
      </ol>
      ${tt && tt.code ? `<div class="msg ok">🐢 Ta tortue du tutoriel <b>t'attend dans l'éditeur</b>. Améliore-la encore !</div>`
        : `<div class="msg warn">🐢 Au début, ta tortue mange… mais <b>ne pond jamais</b>. Construis-la à l'étape 🐢, ou améliore-la pendant la partie.</div>`}
      <div class="msg info">🧪 Sous l'éditeur, les <b>tests de ta tortue</b> te disent tout de suite si elle pond : 🟢, 🟠 ou 🔴.</div>
      <div class="msg info">👥 Parfois, la manche se joue <b>en équipes</b> : c'est le <b>total de l'équipe</b> qui compte. Tu sauras avant la manche avec qui tu joues : mettez-vous d'accord !</div>
    </div><div class="card">
      <h3>🧮 Les points</h3>
      <table class="scores pts"><tr>${pts}<td>…</td></tr></table>
      <div class="msg ok" style="margin-top:12px">📈 <b>+${BONUS_PROGRESSION} pts</b> si ta tortue pond plus de nids qu'à la manche d'avant.<br>Même sans gagner, <b>progresser rapporte des points</b> !</div>
      <div class="msg info">💡 Bloqué ? Le bouton <b>Coup de pouce</b> te donne une idée de code.</div>
      <div class="row" style="margin-top:14px">
        <a class="btn vert big" href="${lienPartie()}">🐢 Rejoindre la partie</a>
        <a class="btn ghost" href="eleve.html?libre=1">🧪 S'entraîner</a>
        <a class="btn ghost" href="tuto-avance.html">🚀 Tutoriel avancé</a>
      </div>
    </div></div>`;
  },
});


// les étapes, rangées par mission (l'ordre d'écriture est gardé à l'intérieur de chaque mission)
ETAPES.sort((a, b) => a.mission - b.mission);
demarrer(ETAPES, CLE_TUTO, MISSIONS_TUTO);

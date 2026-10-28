// =====================================================================
//  Lagon Arena — tutoriel pour grands débutants
//  Principe : un exemple à manipuler d'abord, très peu de texte,
//  puis un petit exercice vérifié tout de suite.
// =====================================================================
import { simulate, BOTS, MISSIONS, P, POINTS_RANG, BONUS_PROGRESSION, tileAt } from "./engine.js";
import { compile } from "./interp.js";
import { icone } from "./render.js";
import { CodeView } from "./editor.js";
import { MatchViewer, tableauMatch } from "./viewer.js";
import { CAPTEURS as TOUS_CAPTEURS, ACTIONS_INFO as TOUTES_ACTIONS } from "./primitives.js";
import { $, esc } from "./common.js";
import { bascule, vf, capt, act, exemple, phrase, exercice, quiz, etapeMission, demarrer, fait } from "./tutokit.js";

// le tutoriel débutant ne montre que les primitives de base
const CAPTEURS = TOUS_CAPTEURS.filter((c) => !c.avance), ACTIONS_INFO = TOUTES_ACTIONS.filter((a) => !a.avance);

const GRAINE_MISSION = 7;

// match de démonstration (5 tortues d'entraînement)
let demo = null;
const COUL = ["#ff7b5c", "#ffc93c", "#4363d8", "#f032e6", "#3cb44b"];
const matchDemo = () => demo ||= simulate({
  joueurs: BOTS.map((b, i) => ({ id: b.nom, nom: b.nom, couleur: COUL[i], code: b.code })), graine: 2024, twist: "calme",
});


// =====================================================================
//  Les étapes
// =====================================================================
const ETAPES = [];

// ---------- 1. Le jeu ----------
ETAPES.push({
  court: "1", titre: "Le jeu",
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
  court: "2", titre: "Le lagon",
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

// ---------- 3. Les questions (capteurs) ----------
ETAPES.push({
  court: "3", titre: "Les questions", cle: "capteurs",
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
  court: "4", titre: "Les ordres", cle: "actions",
  rendre(box) {
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>❗ Ta tortue obéit à des ordres</h2>
      <div class="exemple-gros"><code>manger()</code> = « Mange ! »<br>À chaque tour : <b>un seul ordre</b>.</div>
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

// ---------- 5. Mon premier if ----------
ETAPES.push({
  court: "5", titre: "Mon premier if", cle: "if",
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
  court: "6", titre: "else (sinon)", cle: "else",
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

// ---------- 7. elif ----------
ETAPES.push({
  court: "7", titre: "elif", cle: "elif",
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

// ---------- 8. and ----------
ETAPES.push({
  court: "8", titre: "and (et)", cle: "and",
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

// ---------- 9. Énergie et dangers ----------
ETAPES.push({
  court: "9", titre: "Énergie et dangers",
  rendre(box) {
    box.innerHTML = `<div class="etape"><div class="card">
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
    </div><div class="texte">
      <h2>⚠️ À retenir</h2>
      <div class="regle"><span>⚡</span><div>L'énergie <b>baisse</b> toute seule. À <b>0</b> : épuisée, retour au départ.</div></div>
      <div class="regle"><span>🦈</span><div>Attrapée par un requin = retour au départ et <b>−1 nid</b>. <b>Refuges</b> : la <b>plage</b> 🏖️ et les <b>algues</b> 🌿 (sauf quand tu manges).</div></div>
      <div class="regle"><span>🛍️</span><div>Sac plastique = <b>−${P.pertePlastique} ⚡</b>. <code>not plastique_ici()</code> = « <b>pas</b> de plastique ».</div></div>
      <div class="regle"><span>🌿</span><div>Une touffe d'algues <b>se vide</b> quand on la mange : une nouvelle <b>pousse ailleurs</b>.</div></div>
      <div class="regle"><span>☀️</span><div>Le jour, <b>sur la plage</b>, le soleil fatigue : l'énergie baisse plus vite.</div></div>
      <div class="regle"><span>🕐</span><div>Un match = <b>3 jours</b>. Nuit de 19 h à 6 h.</div></div>
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
  },
});

// ---------- 10 à 13. Missions : réparer une tortue dans le lagon ----------
const APPRIS = {
  1: "Sous le <code>if</code>, il faut <b>l'ordre qui correspond</b> à la question.",
  2: "<b>L'ordre des if compte</b> : le danger se teste en premier.",
  3: "<code>and</code> : <b>les deux</b> conditions doivent être vraies.",
  4: "<code>not</code> inverse : <code>not plastique_ici()</code> = « <b>pas</b> de plastique ».",
};
const SOLUTIONS = {
  1: "def tour():\n    if algue_ici():\n        manger()\n    else:\n        aller_vers_algue()\n",
  2: "def tour():\n    if requin_proche():\n        fuir()\n    elif algue_ici():\n        manger()\n    else:\n        aller_vers_algue()\n",
  3: "def tour():\n    if sur_plage() and est_la_nuit():\n        pondre()\n    elif est_la_nuit():\n        aller_vers_plage()\n    elif algue_ici():\n        manger()\n    else:\n        aller_vers_algue()\n",
  4: "def tour():\n    if algue_ici() and not plastique_ici():\n        manger()\n    else:\n        aller_vers_algue()\n",
};
const PROBLEME = {
  1: "Elle va sur les algues… mais ne mange jamais.",
  2: "Elle mange même quand un requin arrive.",
  3: "Elle essaie de pondre en plein jour.",
  4: "Elle mange le sac plastique !",
};
for (const M of MISSIONS) {
  ETAPES.push(etapeMission({
    court: "M" + M.id, cle: "m" + M.id, titre: `🔧 Répare la tortue ${M.id}`, notion: M.notion,
    probleme: "😟 " + PROBLEME[M.id], objectif: M.objectif, code: M.code, indice: M.indice,
    solution: SOLUTIONS[M.id], appris: APPRIS[M.id], scenario: M.scenario, graine: GRAINE_MISSION,
    reussi: M.reussi, bilan: M.bilan, avance: false,
  }));
}

ETAPES.push({
  court: "🏆", titre: "C'est parti !",
  rendre(box) {
    const pts = POINTS_RANG.slice(0, 5).map((p, i) => `<td><b>${i + 1}<sup>${i ? "e" : "er"}</sup></b><br>${p} pts</td>`).join("");
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>🏆 En classe</h2>
      <ol class="seance">
        <li>🔑 Tape le <b>code</b> du tableau et un <b>pseudo</b>.</li>
        <li>⌨️ <b>Améliore</b> ta tortue, <b>teste</b>-la, puis <b>📤 envoie</b>-la.</li>
        <li>🎬 <b>Brawl</b> : toutes les tortues au tableau !</li>
        <li>🔍 Revois <b>ta</b> tortue : que s'est-il passé ?</li>
        <li>🔁 <b>Rematch</b> : corrige et recommence.</li>
      </ol>
      <div class="msg warn">🐢 Au début, ta tortue mange… mais <b>ne pond jamais</b>. À toi de l'améliorer !</div>
    </div><div class="card">
      <h3>🧮 Les points</h3>
      <table class="scores pts"><tr>${pts}<td>…</td></tr></table>
      <div class="msg ok" style="margin-top:12px">📈 <b>+${BONUS_PROGRESSION} pts</b> si ta tortue pond plus de nids qu'à la manche d'avant.<br>Même sans gagner, <b>progresser rapporte des points</b> !</div>
      <div class="msg info">💡 Bloqué ? Le bouton <b>Coup de pouce</b> te donne une idée de code.</div>
      <div class="row" style="margin-top:14px">
        <a class="btn vert big" href="index.html">🐢 Rejoindre la partie</a>
        <a class="btn ghost" href="eleve.html?libre=1">🧪 S'entraîner</a>
        <a class="btn ghost" href="tuto-avance.html">🚀 Tutoriel avancé</a>
      </div>
    </div></div>`;
  },
});


demarrer(ETAPES, "lagon:tuto2");

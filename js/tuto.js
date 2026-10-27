// =====================================================================
//  Lagon Arena — tutoriel : les règles pas à pas, puis les missions
// =====================================================================
import { simulate, BOTS, MISSIONS, STARTER, P, TWISTS, heureDe, estNuit, POINTS_RANG, BONUS_PROGRESSION, TICKS } from "./engine.js";
import { compile, runTurn, check } from "./interp.js";
import { icone } from "./render.js";
import { CodeEditor, CodeView } from "./editor.js";
import { MatchViewer, tableauMatch } from "./viewer.js";
import { $, el, esc, store, AIDE_HTML } from "./common.js";

const GRAINE_MISSION = 7;
const prog = store.get("lagon:tuto", { vu: 0, missions: [] });
const sauver = () => store.set("lagon:tuto", prog);

// --- un match de démonstration avec les 5 tortues d'entraînement (réutilisé par plusieurs étapes) ---
let demo = null;
const matchDemo = () => demo ||= simulate({
  joueurs: BOTS.map((b, i) => ({ id: b.nom, nom: b.nom, couleur: ["#ff7b5c", "#ffc93c", "#4363d8", "#f032e6", "#3cb44b"][i], code: b.code })),
  graine: 2024, twist: "calme",
});

// =====================================================================
//  Petits composants
// =====================================================================
function bascule(label, valeur, onChange) {
  const input = el("input", { type: "checkbox" }); input.checked = valeur;
  const lab = el("label", { class: "switch" }, input, el("span", { class: "glissiere" }), el("span", {}, label));
  input.addEventListener("change", () => onChange(input.checked));
  return lab;
}
const vf = (b) => `<span class="b-${b}">${b ? "True" : "False"}</span>`;

// =====================================================================
//  Les étapes
// =====================================================================
const ETAPES = [];

// ---------- 1. La mission ----------
ETAPES.push({
  court: "1", titre: "Ta mission",
  rendre(box) {
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>🐢 Ta mission</h2>
      <p>Tu es une tortue marine du lagon. Ton but : <b>pondre un maximum de nids</b> sur les plages pendant le match.</p>
      <p>Mais tu n'as pas de manette : <b>tu écris le programme Python</b> qui décide de ce que fait ta tortue. Ensuite, toutes les tortues de la classe plongent <b>en même temps</b> dans le même lagon… et ce sont vos programmes qui jouent !</p>
      <div class="objectif">🥚 1 nid pondu = 1 point. La tortue qui a le plus de nids à la fin du match gagne.</div>
      <p>Pour y arriver, ta tortue devra :</p>
      <ul>
        <li>🌿 <b>manger des algues</b> pour garder de l'énergie ;</li>
        <li>🏖️ aller <b>sur la plage, la nuit</b>, pour pondre ;</li>
        <li>🦈 <b>échapper aux requins</b>.</li>
      </ul>
      <p class="muted">À droite : 5 tortues d'entraînement en plein match. Regarde les nids apparaître sur les plages quand la nuit tombe.</p>
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
    const L = [
      ["tortue", "<b>Ta tortue</b> : elle a ta couleur et ton pseudo. Elle avance d'une case par tour."],
      ["herbier", "<b>Les algues</b> (herbiers) : la nourriture. Chaque case a 3 portions, qui repoussent petit à petit."],
      ["plage", "<b>La plage</b> (à gauche et à droite) : le <b>seul</b> endroit où l'on peut pondre. Les requins n'y vont jamais."],
      ["nid", "<b>Un nid</b> : chaque nid pondu reste sur la plage, avec la couleur de sa tortue."],
      ["requin", "<b>Le requin</b> : il chasse les tortues qu'il voit. Quand il dort (z), il ne bouge pas."],
      ["sac", "<b>Le sac plastique</b> : il dérive et ressemble à une algue… mais l'avaler rend malade."],
      ["corail", "<b>Le corail</b> : un mur. Personne ne passe."],
      ["nuit", "<b>La nuit</b> : le lagon s'assombrit. C'est le moment de pondre !"],
    ];
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>🗺️ Le lagon</h2>
      <p>Le lagon est un quadrillage de cases. Toutes les tortues partent du <b>centre</b>, au milieu des requins et des algues.</p>
      <div class="legende">${L.map(([t, txt]) => `<canvas data-ic="${t}"></canvas><div>${txt}</div>`).join("")}</div>
    </div><div><div id="vue"></div><p class="petit muted">Le match de démonstration pendant la 2<sup>e</sup> nuit : des nids sont déjà apparus sur les plages.</p></div></div>`;
    box.querySelectorAll("canvas[data-ic]").forEach((c) => icone(c, c.dataset.ic));
    const v = new MatchViewer($("#vue", box), { sim: matchDemo(), autoplay: false, pensee: false });
    v.player.seek(108);
    return () => v.destroy();
  },
});

// ---------- 3. L'énergie ----------
ETAPES.push({
  court: "3", titre: "L'énergie",
  rendre(box) {
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>⚡ L'énergie</h2>
      <ul>
        <li>Ta tortue commence avec <b>${P.energieDepart}</b> d'énergie (maximum <b>${P.energieMax}</b>).</li>
        <li>Nager fatigue : elle perd <b>1</b> d'énergie <b>tous les ${P.perteEnergie} tours</b>.</li>
        <li><code>manger()</code> sur des algues : <b>+${P.gainAlgue}</b>.</li>
        <li><code>pondre()</code> coûte <b>${P.coutPonte}</b>, et il faut avoir <b>au moins ${P.energiePonte}</b> pour pondre.</li>
        <li>À <b>0</b>, ta tortue est <b>épuisée</b> 😵 : retour au point de départ, bloquée ${P.bloquee} tours.</li>
      </ul>
      <p>👉 Le bon rythme : <b>manger le jour</b> pour être pleine d'énergie, <b>pondre la nuit</b>.</p>
    </div><div class="card">
      <h3>🎮 Essaie !</h3>
      <div class="jauge" id="jauge"><div></div><span></span></div>
      <p id="nids" class="bigscore" style="margin:10px 0"></p>
      <div class="row">
        <button class="btn vert small" data-a="manger">🌿 manger()</button>
        <button class="btn small" data-a="pondre">🥚 pondre()</button>
        <button class="btn sombre small" data-a="temps">⏳ ${P.perteEnergie} tours passent</button>
        <button class="btn corail small" data-a="plastique">🛍️ manger un sac plastique</button>
      </div>
      <div id="log" class="msg info">Clique sur les boutons pour voir comment l'énergie évolue.</div>
      <p class="petit muted">Ici, on fait comme si ta tortue était sur une plage, la nuit, au milieu des algues. Dans le vrai jeu, il faut se déplacer !</p>
    </div></div>`;
    let e = P.energieDepart, n = 0;
    const maj = (msg, type = "info") => {
      $("#jauge div", box).style.width = (100 * e / P.energieMax) + "%";
      $("#jauge span", box).textContent = `énergie : ${e} / ${P.energieMax}`;
      $("#nids", box).innerHTML = `<span class="bloc"><b>${n}</b>nid${n > 1 ? "s" : ""}</span>`;
      if (msg) { const l = $("#log", box); l.className = "msg " + type; l.innerHTML = msg; }
    };
    box.querySelectorAll("[data-a]").forEach((b) => b.addEventListener("click", () => {
      const a = b.dataset.a;
      if (a === "manger") {
        if (e >= P.energieMax) return maj("Ta tortue n'a plus faim : manger avec 10 d'énergie ne sert à rien.", "warn");
        e = Math.min(P.energieMax, e + P.gainAlgue); maj(`Miam ! +${P.gainAlgue} d'énergie.`, "ok");
      } else if (a === "pondre") {
        if (e < P.energiePonte) return maj(`<b>pondre() refusé</b> : il faut au moins ${P.energiePonte} d'énergie. Va manger d'abord !`, "err");
        e -= P.coutPonte; n++; maj(`Un nid ! 🥚 (−${P.coutPonte} d'énergie)`, "ok");
      } else if (a === "temps") {
        e--; maj(`${P.perteEnergie} tours de nage : −1 d'énergie.`);
      } else { e -= P.pertePlastique; maj(`Beurk ! Ce n'était pas une algue : <b>−${P.pertePlastique}</b> d'énergie.`, "err"); }
      if (e <= 0) { e = 5; maj(`😵 <b>Épuisée !</b> Ta tortue retourne au départ et reste bloquée ${P.bloquee} tours. Elle repart avec 5 d'énergie.`, "err"); }
    }));
    maj();
  },
});

// ---------- 4. Le jour, la nuit et la ponte ----------
ETAPES.push({
  court: "4", titre: "Pondre",
  rendre(box) {
    const nuit = TWISTS.calme.nuit;
    let bandes = "";
    for (let t = 0; t < TICKS; t++) bandes += `<i class="${estNuit(heureDe(t), nuit) ? "n" : "j"}"></i>`;
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>🌙 Pondre : 3 conditions en même temps</h2>
      <p>Un match dure <b>${TICKS} tours</b>, soit <b>3 jours et 3 nuits</b> (1 journée = 60 tours). Le match commence à <b>8 h du matin</b>.</p>
      <div class="jours" title="Le match, tour par tour">${bandes}</div>
      <div class="row petit muted" style="justify-content:space-between"><span>tour 0 (8 h)</span><span>☀️ jour · 🌙 nuit de 19 h à 6 h</span><span>tour ${TICKS}</span></div>
      <p><code>pondre()</code> ne marche que si ta tortue est :</p>
      <ol>
        <li><b>sur une plage</b> 🏖️ <span class="muted">et</span></li>
        <li><b>la nuit</b> 🌙 <span class="muted">et</span></li>
        <li>avec <b>au moins ${P.energiePonte} d'énergie</b> ⚡.</li>
      </ol>
      <p>Les trois en même temps : en Python, on les relie avec <code>and</code>.<br>Sinon, <code>pondre()</code> est <b>refusé</b> et le tour est perdu.</p>
    </div><div class="card">
      <h3>🧪 Le testeur de ponte</h3>
      <div id="bascules" class="row" style="gap:18px"></div>
      <label class="champ" style="margin-top:12px"><span>⚡ <code>energie()</code> vaut <b id="ve"></b></span><input type="range" id="en" min="0" max="10" value="4"></label>
      <div class="codeview" id="cond" style="margin-top:12px"></div>
      <div id="verdict" class="msg"></div>
    </div></div>`;
    const s = { plage: true, nuit: false, e: 4 };
    const maj = () => {
      const c1 = s.plage, c2 = s.nuit, c3 = s.e >= P.energiePonte, ok = c1 && c2 && c3;
      $("#ve", box).textContent = s.e;
      $("#cond", box).innerHTML = `<span class="l"><span class="n">1</span><span class="tok-kw">if</span> <span class="tok-sens">sur_plage</span>() <span class="tok-kw">and</span> <span class="tok-sens">est_la_nuit</span>() <span class="tok-kw">and</span> <span class="tok-sens">energie</span>() <span class="tok-op">&gt;=</span> <span class="tok-num">${P.energiePonte}</span>:</span>` +
        `<span class="l ${ok ? "act" : ""}"><span class="n">2</span>    <span class="tok-act">pondre</span>()</span>` +
        `<div class="detail-cond"><span>${vf(c1)}</span><span class="tok-kw">and</span><span>${vf(c2)}</span><span class="tok-kw">and</span><span>${vf(c3)} <small>(${s.e} &gt;= ${P.energiePonte})</small></span><span>→</span><span>${vf(ok)}</span></div>`;
      const raison = !c1 ? "pas sur une plage" : !c2 ? "il fait jour" : !c3 ? "pas assez d'énergie" : "";
      const v = $("#verdict", box);
      v.className = "msg " + (ok ? "ok" : "err");
      v.innerHTML = ok ? "🥚 <b>pondre() réussit !</b> +1 nid." : `⛔ <b>pondre() refusé</b> : ${raison}. Il suffit d'une seule condition fausse pour que tout le <code>and</code> soit faux.`;
    };
    $("#bascules", box).append(bascule("🏖️ sur la plage", s.plage, (v) => { s.plage = v; maj(); }), bascule("🌙 il fait nuit", s.nuit, (v) => { s.nuit = v; maj(); }));
    $("#en", box).addEventListener("input", (e) => { s.e = +e.target.value; maj(); });
    maj();
  },
});

// ---------- 5. Les dangers ----------
ETAPES.push({
  court: "5", titre: "Les dangers",
  rendre(box) {
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>🦈 Les dangers… et les refuges</h2>
      <div class="danger"><b>🦈 Les requins</b>
        Un requin voit les tortues jusqu'à 4 cases et fonce sur la plus proche. S'il t'attrape : <b>retour au point de départ</b>, bloquée ${P.bloquee} tours 💫, puis ta tortue clignote quelques tours (protégée).
        Le capteur <code>requin_proche()</code> vaut <code>True</code> quand un requin est à ${P.porteeRequin} cases ou moins.</div>
      <div class="refuge"><b>🛡️ Deux refuges</b>
        <b>La plage</b> : les requins ne sortent jamais de l'eau.<br>
        <b>Les algues</b> : cachée dans les algues, ta tortue est invisible… <b>sauf quand elle mange</b> (les algues bougent !). <code>se_cacher()</code> la fait rester immobile et invisible.</div>
      <div class="danger"><b>🛍️ Le plastique</b>
        Un sac plastique sur des algues ressemble à de la nourriture. <code>manger()</code> sur un sac : <b>−${P.pertePlastique}</b> d'énergie au lieu de +${P.gainAlgue}. Le capteur <code>plastique_ici()</code> te prévient.</div>
    </div><div><h3>🎬 Regarde : cette tortue mange alors qu'un requin arrive…</h3><div id="vue"></div>
      <p class="petit muted">Tu répareras cette tortue dans la mission 2.</p></div></div>`;
    const M = MISSIONS[1];
    const sim = simulate({ joueurs: [{ id: "t", nom: "Gourmande", couleur: "#ff7b5c", code: M.code }], graine: GRAINE_MISSION, scenario: M.scenario });
    const v = new MatchViewer($("#vue", box), { sim, focus: "t", pensee: false, vitesse: 2.4 });
    v.player.onEnd = () => setTimeout(() => v.player.play(), 2500);
    return () => v.destroy();
  },
});

// ---------- 6. Le programme ----------
ETAPES.push({
  court: "6", titre: "Ton programme",
  rendre(box) {
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>🧠 Ton programme</h2>
      <p>Ton programme est une fonction <code>tour()</code>. Le jeu l'appelle <b>à chaque tour</b>, ${TICKS} fois par match. Ta tortue regarde autour d'elle avec ses <b>capteurs</b>, puis fait <b>une action</b>.</p>
      ${AIDE_HTML.split("</ol>")[0]}</ol>
      <p>👉 À droite, change la situation et regarde quelle ligne s'exécute. <span class="b-true">True</span> = condition vraie, <span class="b-false">False</span> = fausse.</p>
      <div class="card quiz" id="quiz"></div>
    </div><div class="card">
      <h3>🔬 Explorateur de conditions</h3>
      <div id="bascules" class="row" style="gap:14px"></div>
      <div id="code" style="margin-top:12px"></div>
      <div id="action" class="msg ok"></div>
      <p class="petit muted">Remarque : les lignes après la première condition vraie ne sont même pas regardées.</p>
    </div></div>`;
    const comp = compile(STARTER);
    const cv = new CodeView($("#code", box)); cv.setCode(STARTER);
    const s = { requin_proche: false, est_la_nuit: false, sur_plage: false, algue_ici: true };
    const executer = (sit) => runTurn(comp, Object.fromEntries(Object.entries({ ...sit, plastique_ici: false, energie: 8, heure: sit.est_la_nuit ? 22 : 14 }).map(([k, v]) => [k, () => v])));
    const maj = () => {
      const r = executer(s);
      cv.montrer({ conds: r.conds, ligne: r.actionLine });
      $("#action", box).innerHTML = `→ Ce tour-ci, ta tortue fait <code>${r.action}()</code> (ligne ${r.actionLine}).`;
    };
    for (const [k, lab] of [["requin_proche", "🦈 requin_proche()"], ["est_la_nuit", "🌙 est_la_nuit()"], ["sur_plage", "🏖️ sur_plage()"], ["algue_ici", "🌿 algue_ici()"]])
      $("#bascules", box).append(bascule(lab, s[k], (v) => { s[k] = v; maj(); }));
    maj();

    // mini-quiz : prédire l'action avant de la voir
    const Q = [
      { sit: { requin_proche: true, est_la_nuit: true, sur_plage: true, algue_ici: false }, txt: "Il fait nuit, ta tortue est sur la plage… et un requin rôde à 2 cases.", ok: "fuir", pourquoi: "La 1re condition requin_proche() est vraie : Python s'arrête là. La tortue fuit au lieu de pondre ! (Sur la plage, elle ne risquait pourtant rien… à toi d'améliorer ça.)" },
      { sit: { requin_proche: false, est_la_nuit: true, sur_plage: false, algue_ici: true }, txt: "Il fait nuit, ta tortue est dans les algues, aucun requin.", ok: "aller_vers_plage", pourquoi: "requin_proche() est faux, « est_la_nuit() and sur_plage() » est faux (pas sur la plage), puis est_la_nuit() est vrai : elle part vers la plage." },
      { sit: { requin_proche: false, est_la_nuit: false, sur_plage: false, algue_ici: true }, txt: "C'est le jour, ta tortue est dans les algues, aucun requin.", ok: "manger", pourquoi: "Les trois premières conditions sont fausses, algue_ici() est vraie : elle mange." },
    ];
    let qi = 0, score = 0;
    const quiz = $("#quiz", box);
    const poser = () => {
      if (qi >= Q.length) { quiz.innerHTML = `<h3>🎯 Devine l'action : ${score} / ${Q.length}</h3><p>${score === Q.length ? "Parfait ! Tu as compris : <b>le premier vrai gagne</b>." : "Relis bien : Python lit les conditions <b>de haut en bas</b> et s'arrête au <b>premier vrai</b>."}</p>`; return; }
      const q = Q[qi];
      quiz.innerHTML = `<h3>🎯 Devine l'action (${qi + 1}/${Q.length})</h3><p>${q.txt}<br><b>Avec le code de droite, que fait ta tortue ?</b></p><div class="row" id="rep"></div><div id="expl"></div>`;
      for (const a of ["fuir", "pondre", "aller_vers_plage", "manger", "aller_vers_algue"]) {
        const b = el("button", { class: "btn small ghost" }, a + "()");
        b.addEventListener("click", () => {
          quiz.querySelectorAll("#rep button").forEach((x) => (x.disabled = true));
          const bon = a === q.ok; if (bon) score++;
          b.classList.remove("ghost"); b.classList.add(bon ? "vert" : "corail");
          Object.assign(s, q.sit);
          $("#bascules", box).querySelectorAll("input").forEach((inp, i) => (inp.checked = s[["requin_proche", "est_la_nuit", "sur_plage", "algue_ici"][i]]));
          maj();
          $("#expl", quiz).innerHTML = `<div class="msg ${bon ? "ok" : "err"}">${bon ? "✅ Bien vu !" : `❌ Non : c'est <code>${q.ok}()</code>.`} ${esc(q.pourquoi)}</div>`;
          const suiv = el("button", { class: "btn small" }, qi + 1 < Q.length ? "Question suivante →" : "Voir mon score");
          suiv.addEventListener("click", () => { qi++; poser(); });
          $("#expl", quiz).append(suiv);
        });
        $("#rep", quiz).append(b);
      }
    };
    poser();
  },
});

// ---------- 7. Aide-mémoire ----------
ETAPES.push({
  court: "7", titre: "Capteurs et actions",
  rendre(box) {
    box.innerHTML = `<div class="card aide aide-large"><h2>📋 L'aide-mémoire</h2>
      <p>Voici <b>tout</b> ce que ta tortue sait faire. Tu retrouveras ce tableau dans l'onglet <b>❓ Aide</b> pendant la partie.</p>${AIDE_HTML}
      <h3>✍️ Ce que tu peux écrire</h3>
      <ul><li><code>if</code>, <code>elif</code>, <code>else</code>, avec <code>and</code>, <code>or</code>, <code>not</code> ;</li>
      <li>les comparaisons <code>&lt;</code> <code>&gt;</code> <code>&lt;=</code> <code>&gt;=</code> <code>==</code> <code>!=</code> sur <code>energie()</code> et <code>heure()</code> ;</li>
      <li>des if imbriqués (attention à l'indentation : 4 espaces) ;</li>
      <li>Pas de boucles : c'est le jeu qui appelle <code>tour()</code> à chaque tour.</li></ul></div>`;
  },
});

// ---------- 8 à 11. Les missions ----------
const APPRIS = {
  1: "<code>if</code> : quand la condition est <b>vraie</b>, Python exécute le bloc indenté juste en dessous. Il faut que l'action corresponde à la situation !",
  2: "L'<b>ordre des <code>if</code> / <code>elif</code></b> compte : Python s'arrête au <b>premier vrai</b>. Le plus urgent (le danger) se teste en premier.",
  3: "<code>and</code> : la condition entière n'est vraie que si <b>toutes</b> les parties sont vraies.",
  4: "<code>not</code> inverse une condition : <code>not plastique_ici()</code> est vrai quand il n'y a <b>pas</b> de plastique.",
};
for (const M of MISSIONS) {
  ETAPES.push({
    court: "M" + M.id, titre: "Mission " + M.id, mission: M.id,
    rendre(box) {
      box.innerHTML = `<div class="etape"><div>
        <div class="mission-head"><h2 style="margin:0">🔧 Mission ${M.id} : ${esc(M.titre)}</h2><span class="notion">${esc(M.notion)}</span></div>
        <p class="texte">${esc(M.histoire)}</p>
        <div class="objectif">🎯 Objectif : ${esc(M.objectif)}</div>
        <p class="petit"><b>1.</b> Clique sur <b>▶ Tester</b> pour voir le problème. <b>2.</b> Regarde « Dans la tête de ta tortue ». <b>3.</b> Corrige le code et reteste.</p>
        <div id="ed"></div>
        <div class="row" style="margin-top:10px">
          <button class="btn vert" id="tester">▶ Tester</button>
          <button class="btn ghost small" id="indice">💡 Indice</button>
          <button class="btn ghost small" id="reset">↺ Code de départ</button>
        </div>
        <div id="res"></div>
      </div><div id="vue" class="vue-mission"><div class="vide-vue"><div>Clique sur <b>▶ Tester</b> pour lancer la tortue.</div></div></div></div>`;
      const cle = "lagon:tuto:code" + M.id;
      const ed = new CodeEditor($("#ed", box), { value: store.get(cle) || M.code, onChange: (v) => store.set(cle, v) });
      let viewer = null;
      $("#indice", box).addEventListener("click", () => { $("#res", box).innerHTML = `<div class="msg warn">💡 ${esc(M.indice)}</div>`; });
      $("#reset", box).addEventListener("click", () => { ed.value = M.code; store.del(cle); $("#res", box).innerHTML = ""; });
      $("#tester", box).addEventListener("click", () => {
        const c = check(ed.value);
        if (!c.ok) {
          ed.setErreur(c.error.line);
          $("#res", box).innerHTML = `<div class="msg err">🐞 <b>Ligne ${c.error.line}</b> : ${esc(c.error.message)}</div>`;
          return;
        }
        const sim = simulate({ joueurs: [{ id: "t", nom: "Ta tortue", couleur: "#ff7b5c", code: ed.value }], graine: GRAINE_MISSION, scenario: M.scenario });
        if (viewer) viewer.destroy();
        viewer = new MatchViewer($("#vue", box), { sim, focus: "t", code: ed.value, vitesse: 2.4 });
        const ok = M.reussi(sim);
        const warn = c.warnings.map((w) => `<div class="msg warn">⚠️ Ligne ${w.line} : ${esc(w.msg)}</div>`).join("");
        const res = $("#res", box);
        res.innerHTML = warn + `<div class="msg info">⏳ Ta tortue joue… (${M.scenario.ticks} tours)</div>`;
        viewer.player.onEnd = () => {
          if (ok) {
            if (!prog.missions.includes(M.id)) { prog.missions.push(M.id); sauver(); majNav(); }
            res.innerHTML = warn + `<div class="msg ok bravo">✅ <b>Mission réussie !</b> ${esc(M.bilan(sim))}</div><div class="appris">🎓 <b>Ce que tu as appris :</b> ${APPRIS[M.id]}</div>`;
            const b = el("button", { class: "btn big pulse", style: "margin-top:10px" }, "Continuer →");
            b.addEventListener("click", () => aller(courant + 1)); res.append(b);
          } else {
            res.innerHTML = warn + `<div class="msg err">❌ <b>Pas encore…</b> ${esc(M.bilan(sim))}<br>Rejoue le match tour par tour (◀ ▶) et regarde quelle ligne s'exécute au mauvais moment.</div>`;
          }
        };
      });
      return () => viewer && viewer.destroy();
    },
  });
}

// ---------- 12. Le brawl ----------
ETAPES.push({
  court: "🏆", titre: "Le brawl en classe",
  rendre(box) {
    const pts = POINTS_RANG.slice(0, 6).map((p, i) => `<td><b>${i + 1}<sup>${i ? "e" : "er"}</sup></b><br>${p} pts</td>`).join("");
    box.innerHTML = `<div class="etape"><div class="texte">
      <h2>🏆 Le brawl en classe</h2>
      <ol class="seance">
        <li><b>🔑 Rejoins la salle</b> avec le code affiché au tableau et un <b>pseudo</b> (pas ton vrai nom).</li>
        <li><b>⌨️ Programme ta tortue</b> (8 minutes). Teste-la autant que tu veux contre les tortues d'entraînement. Quand elle te plaît : <b>📤 Envoyer</b>. Tu peux renvoyer une meilleure version jusqu'à la fin du chrono.</li>
        <li><b>🎬 Le brawl</b> : toutes les tortues de la classe dans le même lagon, projeté au tableau.</li>
        <li><b>🔍 Le rapport</b> : sur ton écran, revois le match en suivant <b>ta</b> tortue, ligne par ligne. Pourquoi s'est-elle fait attraper ? Pourquoi n'a-t-elle pas pondu ?</li>
        <li><b>🔁 Le rematch</b> : 6 minutes pour corriger… avec une <b>nouveauté</b> à chaque manche (invasion de plastique, requins affamés, nuits courtes…).</li>
        <li><b>⛈️ Le duel des champions</b> : les 3 meilleurs de la classe s'affrontent dans la tempête.</li>
      </ol>
    </div><div class="card">
      <h3>🧮 Les points de chaque manche</h3>
      <table class="scores pts"><tr>${pts}<td>…<br>1 pt min.</td></tr></table>
      <div class="msg ok" style="margin-top:12px">📈 <b>Bonus progrès : +${BONUS_PROGRESSION} pts</b> si ta tortue pond plus de nids qu'à la manche d'avant. Même sans gagner, <b>améliorer ta tortue rapporte des points</b> !</div>
      <div class="msg info">🐢 Au début, ta tortue sait manger… mais elle ne pond jamais. Si tu n'envoies rien, c'est elle qui joue !</div>
      <div class="row" style="margin-top:14px">
        <a class="btn vert big" href="index.html">🐢 Rejoindre la partie</a>
        <a class="btn ghost" href="eleve.html?libre=1">🧪 Bac à sable</a>
      </div>
    </div></div>`;
  },
});

// =====================================================================
//  Navigation
// =====================================================================
let courant = 0, nettoyer = null;
function majNav() {
  const nav = $("#nav"); nav.innerHTML = "";
  ETAPES.forEach((e, i) => {
    const b = el("button", { title: e.titre, class: (i === courant ? "on " : "") + (e.mission && prog.missions.includes(e.mission) ? "fait" : "") + (e.mission ? " m" : "") }, e.mission && prog.missions.includes(e.mission) ? "✓" : e.court);
    b.addEventListener("click", () => aller(i));
    nav.append(b);
  });
  $("#progression").textContent = `Étape ${courant + 1} / ${ETAPES.length} · Missions ${prog.missions.length} / ${MISSIONS.length}`;
  $("#prec").disabled = courant === 0;
  $("#suiv").classList.toggle("cache", courant === ETAPES.length - 1);
}
function aller(i) {
  i = Math.max(0, Math.min(ETAPES.length - 1, i));
  if (nettoyer) { try { nettoyer(); } catch { /* rien */ } nettoyer = null; }
  courant = i; prog.vu = Math.max(prog.vu, i); sauver();
  const box = $("#etape"); box.innerHTML = "";
  nettoyer = ETAPES[i].rendre(box) || null;
  majNav();
  history.replaceState(null, "", "#" + (i + 1));
  window.scrollTo({ top: 0, behavior: "smooth" });
}
$("#prec").addEventListener("click", () => aller(courant - 1));
$("#suiv").addEventListener("click", () => aller(courant + 1));
const h = parseInt(location.hash.slice(1), 10);
aller(Number.isFinite(h) ? h - 1 : 0);

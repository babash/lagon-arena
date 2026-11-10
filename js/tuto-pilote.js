// =====================================================================
//  Lagon Arena — tutoriel, mission 1 : « 🎮 Pilote ta tortue »
//  Avant d'écrire la moindre ligne de code, l'élève joue À LA MAIN : à chaque tour, il choisit
//  l'action de sa tortue. Il découvre ainsi les règles en les vivant : l'énergie qui baisse,
//  la ponte refusée le jour ou sans assez d'énergie, la plage, le requin.
//  C'est le vrai moteur du jeu (même lagon, mêmes règles) : la tortue est seulement « pilotée ».
// =====================================================================
import { simulate, P } from "./engine.js";
import { MatchViewer } from "./viewer.js";
import { ACTIONS_INFO } from "./primitives.js";
import { $, el, esc } from "./common.js";
import { fait, suivant, vf } from "./tutokit.js";

// le petit lagon de la mission : les algues à 2 cases, la plage à 3 cases des algues, la nuit dans 5 tours
const DUREE = 30;
const SCENARIO = { energie: 4, requins: [[11, 1]], plastiques: [], spawn: [6, 6], heureDepart: 17, herbes: [[4, 6, 3], [4, 7, 3]], repousse: false };   // (3 bouchées par touffe : on la voit rétrécir)
const ORDRES = ["manger", "pondre", "aller_vers_algue", "aller_vers_plage", "fuir"];
const VOIT = [
  ["algue_ici", "🌿", "Des algues ici ?"], ["sur_plage", "🏖️", "Sur la plage ?"],
  ["est_la_nuit", "🌙", "Il fait nuit ?"], ["requin_proche", "🦈", "Un requin proche ?"],
];
// ce que la tortue a fait, dit simplement (les « effets » du moteur sont déjà en français)
const NAGE = { aller_vers_algue: "elle nage d'une case vers les algues", aller_vers_plage: "elle nage d'une case vers la plage", fuir: "elle s'éloigne des requins", manger: "elle mange" };
const EFFET_SIMPLE = (e, a) => String(e || NAGE[a] || "c'est fait")
  .replace(/ÉPUISÉE \(énergie à 0\) !/, "😵 épuisée : retour au départ !")
  .replace(/^aucune action$/, "rien");

function jouer(choix) {
  return simulate({
    joueurs: [{ id: "moi", nom: "Toi", couleur: "#ff7b5c", code: "def tour():\n    pass\n", pilote: (tick) => choix[tick] ?? null }],
    graine: 11, scenario: { ...SCENARIO, ticks: choix.length + 1 },
  });
}

export const etapePilote = {
  court: "3", titre: "Pilote ta tortue", cle: "pilote", mission: 1,
  rendre(box) {
    box.innerHTML = `<div class="etape etape-pilote"><div class="p-tete texte">
      <h2>🎮 Pilote ta tortue</h2>
      <p>Pour une fois, c'est <b>toi</b> qui décides. À chaque tour, choisis <b>un ordre</b> pour ta tortue.</p>
      <div class="objectif">🎯 Mission : <b>pondre 1 nid</b> avant la fin (${DUREE} tours).</div>
    </div><div class="p-vue">
      <div id="vue"></div>
      <div class="row" style="margin-top:8px"><button class="btn ghost small" id="annuler" disabled>↩ Annuler le dernier tour</button><button class="btn ghost small" id="recommencer">↺ Recommencer</button><button class="btn ghost small" id="aide-pilote">💡 Un indice</button></div>
      <p class="petit muted" id="tours"></p>
    </div><div class="p-jeu texte">
      <div class="pilote-tableau">
        <div class="pilote-voit"><h4>👀 Ce que voit ta tortue</h4><div id="voit"></div></div>
        <div class="pilote-ordres"><h4>❗ Ton ordre pour ce tour</h4><div id="ordres" class="grille-ordres"></div></div>
      </div>
      <div id="journal" class="msg info" aria-live="polite">Clique sur un ordre pour jouer le premier tour.</div>
      <div id="fin"></div>
    </div></div>`;
    let choix = [], sim = null, v = null, reussi = false, indices = 0;
    for (const a of ORDRES) {
      const info = ACTIONS_INFO.find((x) => x.nom === a);
      const b = el("button", { type: "button", class: "btn ordre", "data-a": a, html: `<span class="ic">${info.icone}</span><code>${a}()</code>` });
      b.addEventListener("click", () => { if (choix.length < DUREE && !reussi) { choix.push(a); maj(true); } });
      $("#ordres", box).append(b);
    }
    const maj = (anim = false) => {
      sim = jouer(choix);
      const n = choix.length, i = sim.tortues.findIndex((t) => t.id === "moi");
      const vue = { ...sim, frames: sim.frames.slice(0, n + 1) };   // (le dernier tour, calculé seulement pour lire les capteurs, n'est pas montré)
      if (!v) v = new MatchViewer($("#vue", box), { sim: vue, focus: "moi", autoplay: false, pensee: false, controles: false, noms: false, zoom: 1.8, vitesse: 3 });
      else { v.sim = vue; v.player.sim = vue; }
      // le bandeau (heure, ⚡, 🥚) montre l'état APRÈS le dernier tour (la visionneuse s'arrête d'habitude un tour avant)
      const finir = () => { v.player.lastTick = n - 1; v.onTick(n); };
      if (anim && n > 0) { v.player.f = n - 1; v.player.onEnd = finir; v.player.play(); }
      else { v.player.f = n; v.player.playing = false; finir(); }
      const tr = sim.traces.moi || sim.traces[sim.tortues[i].id];
      const c = (tr[n] && tr[n].capteurs) || {};
      const fr = sim.frames[n].tortues[i], energie = fr[2], nids = fr[3];
      $("#voit", box).innerHTML = `<table class="voit">${VOIT.map(([k, ic, q]) => `<tr class="${k === "requin_proche" && c[k] ? "alerte" : ""}"><td>${ic}</td><td>${q}</td><td>${c[k] === undefined ? "…" : vf(!!c[k])}</td></tr>`).join("")}
        <tr><td>⚡</td><td>Énergie</td><td><b>${energie}</b> / ${P.energieMax}</td></tr><tr><td>🥚</td><td>Nids</td><td><b>${nids}</b></td></tr></table>`;
      const j = $("#journal", box);
      if (n > 0) {
        const der = tr[n - 1] || {};
        const refus = /refus|ne peut|pas sur une plage|il fait jour|pas assez/i.test(der.effet || "");
        j.className = "msg " + (refus ? "warn" : /ATTRAP|épuisée|ÉPUISÉE/.test(der.effet || "") ? "err" : "info");
        j.innerHTML = `Tour ${n} : <code>${esc(choix[n - 1])}()</code> → ${esc(EFFET_SIMPLE(der.effet, choix[n - 1]))}.` +
          (refus ? explRefus(der.effet) : "") + bouchees(der.effet, i, n) + (c.requin_proche && !c.sur_plage ? `<br>🦈 <b>Attention, un requin est proche !</b> Sur la plage ou dans les algues, tu es à l'abri.` : "");
      }
      $("#tours", box).textContent = `Tour ${n} / ${DUREE}`;
      $("#annuler", box).disabled = n === 0 || reussi;
      box.querySelectorAll(".ordre").forEach((b) => (b.disabled = reussi || n >= DUREE));
      if (nids >= 1 && !reussi) gagne();
      else if (n >= DUREE && !reussi) $("#fin", box).innerHTML = `<div class="msg err">⏰ <b>Le temps est écoulé</b> : pas de nid cette fois. Clique sur <b>↺ Recommencer</b>, et lis l'indice 💡.</div>`;
    };
    // après une bouchée : ce qu'il reste dans la touffe (elle disparaît quand elle est finie)
    const bouchees = (e, i, n) => {
      if (/plus faim/.test(e || "")) return `<br>🍽️ Elle a déjà ${P.energieMax} d'énergie : elle <b>n'a plus faim</b>, elle ne mange rien.`;
      if (!/mange une algue/.test(e || "")) return "";
      const [x, y] = sim.frames[n].tortues[i], h = (sim.frames[n].herbes || []).find((a) => a[0] === x && a[1] === y);
      return h && h[2] > 0 ? `<br>🌿 Une bouchée de moins : il en reste <b>${h[2]}</b> dans cette touffe.` : "<br>🌿 C'était la dernière bouchée : la touffe disparaît (elle repoussera ailleurs).";
    };
    const explRefus = (e) => {
      if (/jour/.test(e)) return "<br>☀️ On ne pond que <b>la nuit</b> (de 19 h à 6 h). Attends la nuit… ou va manger en attendant.";
      if (/plage/.test(e)) return "<br>🏖️ On ne pond que <b>sur la plage</b>.";
      if (/énergie|assez/.test(e)) return `<br>⚡ Il faut au moins <b>${P.energiePonte} d'énergie</b> pour pondre : mange d'abord des algues.`;
      return "";
    };
    const gagne = () => {
      reussi = true; fait("pilote");
      $("#fin", box).innerHTML = `<div class="msg ok bravo">🎉 <b>Un nid !</b> Tu l'as fait en ${choix.length} tours.</div>
        <div class="appris">🎓 <b>Ce que tu as découvert</b> : pour pondre, il faut <b>🏖️ la plage + 🌙 la nuit + ⚡ ${P.energiePonte}</b>. Et l'énergie se gagne en <b>mangeant</b>.</div>
        <div class="msg info">🤔 <b>Mais en classe, tu ne piloteras pas ta tortue !</b> Toutes les tortues jouent en même temps, très vite. Tu écriras <b>ses règles à l'avance</b>, par exemple : « <i>si il fait nuit, va vers la plage</i> ». C'est la suite du tutoriel.</div>`;
      const b = el("button", { class: "btn big pulse", style: "margin-top:8px" }, "Continuer →"); b.addEventListener("click", suivant); $("#fin", box).append(b);
      box.querySelectorAll(".ordre").forEach((x) => (x.disabled = true));
    };
    $("#annuler", box).addEventListener("click", () => { choix.pop(); $("#fin", box).innerHTML = ""; maj(); });
    $("#recommencer", box).addEventListener("click", () => { choix = []; reussi = false; $("#fin", box).innerHTML = ""; $("#journal", box).className = "msg info"; $("#journal", box).textContent = "Clique sur un ordre pour jouer le premier tour."; maj(); });
    const INDICES = [
      `⚡ Regarde ton énergie : il en faut <b>${P.energiePonte}</b> pour pondre. Va vers les algues 🌿, puis mange.`,
      "🌙 On ne pond que la nuit : elle commence à 19 h (regarde l'heure en haut du lagon).",
      "🏖️ Ensuite, va vers la plage. Une fois dessus, la nuit, avec assez d'énergie : ponds !",
    ];
    $("#aide-pilote", box).addEventListener("click", () => { $("#journal", box).className = "msg warn"; $("#journal", box).innerHTML = "💡 " + INDICES[indices++ % INDICES.length]; });
    maj();
    return () => v && v.destroy();
  },
};

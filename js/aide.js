// =====================================================================
//  Lagon Arena — l'AIDE de l'écran élève, en deux onglets
//   📜 Règles   : l'essentiel en 5 lignes, puis toutes les règles (sections dépliables) ;
//   💡 Conseils : l'essentiel en 5 lignes, puis des conseils par niveau, pour déboguer, etc.
//  Les primitives sont rangées par catégories et suivent ce qui est proposé à l'élève
//  (mode avancé, manche en équipes) : comme la boîte à outils.
// =====================================================================
import { P, TICKS, TWISTS, TWIST_ORDER, POINTS_RANG, BONUS_PROGRESSION } from "./engine.js";
import { CAPTEURS, ACTIONS_INFO, MOTS, parCategorie, ORDRE_QUESTIONS, ORDRE_ORDRES, visible } from "./primitives.js";
import { colorer } from "./editor.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const badge = (p) => (p.equipe ? ' <span class="badge-eq" title="manche en équipes">👥</span>' : p.avance ? ' <span class="badge-av" title="primitive avancée">🚀</span>' : "");
const ligne = (p) => `<tr><td class="ic">${p.icone}</td><td><code>${p.nom}()</code>${badge(p)}</td><td>${esc(p.role)}</td></tr>`;
const tables = (liste, ordre) => parCategorie(liste, ordre).map((g) => `<h4>${g.icone} ${esc(g.nom)}</h4><table class="prims">${g.items.map(ligne).join("")}</table>`).join("");
const section = (titre, html, ouvert = false) => `<details class="aide-section"${ouvert ? " open" : ""}><summary>${titre}</summary><div>${html}</div></details>`;
const code = (txt) => `<pre class="modele">${colorer(txt).join("\n")}</pre>`;
const nuit = (t) => `${t.nuit[0]} h – ${t.nuit[1]} h`;

// ------------------------------------------------------------------ 📜 RÈGLES
function regles() {
  const C = CAPTEURS.filter((c) => visible(c)), A = ACTIONS_INFO.filter((a) => visible(a));
  const caches = CAPTEURS.length + ACTIONS_INFO.length - C.length - A.length;
  return `<div class="essentiel"><h3>⭐ L'essentiel</h3><ol>
    <li>À chaque tour, le jeu lance ta fonction <code>tour()</code> : ta tortue fait <b>un seul ordre</b>, le premier qu'elle rencontre.</li>
    <li>Python lit de <b>haut en bas</b> et fait seulement le <b>premier <code>if</code> vrai</b> : l'ordre des <code>elif</code> compte !</li>
    <li><b>1 point</b> = <code>pondre()</code> <b>sur la plage</b>, <b>la nuit</b>, avec <b>${P.energiePonte} ⚡ ou plus</b>.</li>
    <li>🦈 Attrapée par un requin : <b>−1 nid</b> et retour au départ. Refuges : la <b>plage</b>, et les <b>algues</b> (sauf quand tu manges).</li>
    <li>⚡ L'énergie baisse avec le temps : mange des algues (+${P.gainAlgue}), jamais de plastique (−${P.pertePlastique}). À 0, ta tortue est épuisée.</li>
  </ol></div>
  <h3>✍️ Le modèle à suivre</h3>
  <pre class="modele"><span class="tok-kw">def</span> tour():
    <span class="tok-kw">if</span> <i>question</i>:          <span class="tok-com"># si…</span>
        <i>ordre</i>()
    <span class="tok-kw">elif</span> <i>autre question</i>:  <span class="tok-com"># sinon, si…</span>
        <i>ordre</i>()
    <span class="tok-kw">else</span>:                 <span class="tok-com"># sinon</span>
        <i>ordre</i>()</pre>
  ${section("❓ Les questions (capteurs) : réponse True / False ou un nombre", tables(C, ORDRE_QUESTIONS) +
    (caches ? `<p class="petit muted">🚀 ${caches} autres primitives existent : active « Primitives avancées » sous l'éditeur, ou fais le <a href="tuto-avance.html">tutoriel avancé</a>.</p>` : ""), true)}
  ${section("❗ Les ordres (actions) : un seul par tour", tables(A, ORDRE_ORDRES), true)}
  ${section("🔤 Les mots de Python", `<table class="prims">${MOTS.map((m) => `<tr><td><code>${m.nom}</code></td><td><i>${esc(m.fr)}</i></td><td>${esc(m.role)}</td></tr>`).join("")}</table>
    <p>Pour comparer : <code>==</code> (égal), <code>!=</code> (différent), <code>&lt;</code>, <code>&lt;=</code>, <code>&gt;</code>, <code>&gt;=</code>. Exemple : <code>energie() &gt;= 6</code>, <code>heure() &lt; 19</code>.</p>
    <p>Des parenthèses pour grouper : <code>est_la_nuit() and (sur_plage() or distance_plage() &lt;= 1)</code>.</p>`)}
  ${section("🕐 Le temps", `<ul>
    <li>Un match dure <b>${TICKS} tours</b>, soit 3 jours et 3 nuits (une journée = 60 tours). Il commence à 8 h.</li>
    <li>La nuit va de <b>19 h à 6 h</b> (de 20 h à 5 h avec les nuits courtes, la finale et la tempête).</li>
    <li><code>heure()</code> donne l'heure (0 à 23) : pratique pour <b>partir vers la plage avant la nuit</b>.</li>
    <li>🚀 <code>debut_nuit()</code> et <code>fin_nuit()</code> donnent les heures de la nuit <b>de la manche en cours</b> (elles changent avec la nouveauté et le lagon choisi par ton enseignant).</li></ul>`)}
  ${section("⚡ L'énergie", `<table class="prims">
    <tr><td>Départ</td><td>${P.energieDepart} ⚡ (maximum ${P.energieMax})</td></tr>
    <tr><td>Faim</td><td>−1 ⚡ tous les ${P.perteEnergie} tours</td></tr>
    <tr><td><code>manger()</code> des algues</td><td>+${P.gainAlgue} ⚡</td></tr>
    <tr><td><code>manger()</code> un sac plastique</td><td>−${P.pertePlastique} ⚡</td></tr>
    <tr><td><code>pondre()</code></td><td>−${P.coutPonte} ⚡ (il faut ${P.energiePonte} ⚡ ou plus)</td></tr>
    <tr><td>☀️ Le jour, sur la plage</td><td>−1 ⚡ de plus tous les ${P.soleilPlage} tours (le soleil fatigue)</td></tr>
    <tr><td>😵 À 0 ⚡ : épuisée</td><td>retour au départ, bloquée ${P.bloquee} tours</td></tr></table>`)}
  ${section("🌊 Le lagon", `<ul>
    <li><b>Un lagon différent à chaque partie</b> : le corail, les algues et les départs changent ; les plages ne bougent pas.</li>
    <li>🌿 Une touffe d'algues a <b>${P.portionsHerbier} repas</b>. Mangée jusqu'au bout, elle disparaît et une nouvelle pousse <b>ailleurs</b>.</li>
    <li>🛍️ Les sacs plastique dérivent, coulent, puis réapparaissent ailleurs.</li>
    <li>🪸 Le corail bloque le passage : les ordres « aller vers… » le contournent tout seuls.</li></ul>`)}
  ${section("🦈 Les requins", `<ul>
    <li>Ils voient à 4 cases (5 quand ils sont affamés) et chassent la tortue la plus proche ; sinon, ils patrouillent. 🚀 <code>vision_requin()</code> donne cette distance pour la manche en cours.</li>
    <li>Ils nagent 2 tours sur 3 (à chaque tour quand ils sont rapides).</li>
    <li><code>requin_proche()</code> est vrai quand un requin est à <b>${P.porteeRequin} cases ou moins</b>.</li>
    <li>Attrapée : <b>−1 nid</b> (si tu en as), retour au départ, bloquée ${P.bloqueeCapture} tours.</li>
    <li>Refuges : la <b>plage</b> (jamais de requin) et les <b>algues</b>, où tu es invisible… sauf quand tu manges. <code>fuir()</code> préfère la plage.</li></ul>`)}
  ${section("🌪️ Les nouveautés de manche", `<table class="prims">${[...TWIST_ORDER, ...Object.keys(TWISTS).filter((k) => !TWIST_ORDER.includes(k))].map((k) => {
    const T = TWISTS[k]; return `<tr><td class="ic">${T.icone}</td><td><b>${esc(T.nom)}</b></td><td>${esc(T.texte)} <span class="petit muted">(nuit ${nuit(T)})</span></td></tr>`; }).join("")}</table>`)}
  ${section("💥 Pousser (avancé)", `<p><code>pousser()</code> coûte ${P.coutPousse} ⚡ et pousse d'une case une tortue <b>collée</b> à la tienne. Si un requin attend derrière elle, elle est attrapée. En équipes, on ne pousse jamais une équipière, et l'équipe <b>rivale</b> est visée en premier.</p>`)}
  ${section("👥 Les équipes", `<ul>
    <li>Seul le <b>rang de l'équipe</b> compte : on compare la <b>moyenne de nids</b> de ses tortues (les équipes peuvent avoir des tailles différentes).</li>
    <li>🎁 <code>donner()</code> passe ${P.don} ⚡ à une équipière collée à toi.</li>
    <li>🛡️ Deux équipières <b>collées</b> sont protégées des requins.</li>
    <li>🎯 L'équipe <b>rivale</b> est la meilleure des autres équipes en ce moment.</li>
    <li>🤖 Les tortues d'entraînement ne sont dans aucune équipe.</li></ul>
    <p>Pour tout comprendre : le <a href="tuto-avance.html?niveau=equipe">tutoriel 👥 Équipe</a>.</p>`)}
  ${section("🧮 Les points", `<ul>
    <li>Selon ton rang parmi les élèves : ${POINTS_RANG.slice(0, 6).join(", ")}… (1 point au minimum).</li>
    <li><b>+${BONUS_PROGRESSION}</b> si ta tortue pond plus de nids qu'à la manche précédente : progresser rapporte !</li>
    <li>En équipes : de 20 points (1re équipe) à 10 (dernière), pour chaque élève de l'équipe.</li>
    <li>Les tortues d'entraînement 🤖 ne marquent pas de points.</li></ul>`)}`;
}

// ------------------------------------------------------------------ 💡 CONSEILS
function conseils() {
  return `<div class="essentiel"><h3>⭐ L'essentiel</h3><ol>
    <li><b>D'abord pondre</b> : sans <code>pondre()</code>, c'est zéro point. La nuit, va sur la plage et ponds.</li>
    <li><b>La survie tout en haut</b> : mets <code>if requin_proche():</code> en premier, avant de manger.</li>
    <li><b>Surveille ton énergie</b> : <code>energie() &gt;= ${P.energiePonte}</code> pour pondre, et mange avant d'avoir faim.</li>
    <li><b>Une partie ne prouve rien</b> : ▶ Teste, puis 📊 <b>Estime</b> sur 20 parties pour comparer tes versions.</li>
    <li><b>Après le brawl</b> : regarde « Dans la tête de ta tortue » au moment où ça a mal tourné, corrige, puis 🤔 <b>Et si… ?</b></li>
  </ol></div>
  ${section("🧱 Construire sa tortue pas à pas", `<p>Ajoute une règle à la fois, de la plus urgente à la moins urgente, et teste à chaque fois :</p>
    ${code(`def tour():
    if requin_proche() and not sur_plage():                  # 1. survivre
        fuir()
    elif sur_plage() and est_la_nuit() and energie() >= ${P.energiePonte}:   # 2. pondre
        pondre()
    elif est_la_nuit() and energie() >= ${P.energiePonte}:                   # 3. rejoindre la plage
        aller_vers_plage()
    elif algue_ici() and not plastique_ici():                # 4. manger
        manger()
    else:                                                    # 5. sinon, chercher à manger
        aller_vers_algue()`)}
    <p>Le <b>💡 Coup de pouce</b> (sous l'éditeur) te donne l'idée suivante d'après ce qui manque dans ton code.</p>`, true)}
  ${section("🐞 Comprendre pourquoi ça ne marche pas", `<ol>
    <li>Dans l'onglet <b>Résultats</b>, clique sur une icône de la frise (🦈 attrapée, 😵 épuisée, 🛍️ plastique) : le match saute à ce moment.</li>
    <li>Recule de quelques tours avec <b>◀ 1 tour</b>. Dans « Dans la tête de ta tortue », regarde <b>quelle condition était vraie</b> (en vert) et <b>quelle ligne a agi</b> (en jaune).</li>
    <li>Demande-toi : <i>qu'aurait-elle dû faire ?</i> Quelle question aurait dû être vraie ? Faut-il <b>déplacer</b> un <code>elif</code> plus haut ?</li>
    <li>Corrige, puis <b>🤔 Et si… ?</b> rejoue exactement le même match avec ton nouveau code. Dans le bac à sable, <b>🔁 Rejouer ce lagon</b> fait pareil.</li></ol>`)}
  ${section("⚠️ Les erreurs fréquentes", `<ul>
    <li><b>Un cas général avant un cas particulier</b> : avec <code>if algue_ici():</code> en premier, la tortue mange même quand un requin arrive. Les cas urgents vont en haut.</li>
    <li><b><code>=</code> au lieu de <code>==</code></b> pour comparer : <code>if energie() == 10:</code>.</li>
    <li><b>Les parenthèses oubliées</b> : <code>energie()</code>, pas <code>energie</code>.</li>
    <li><b>Les deux-points</b> après <code>if</code>, <code>elif</code>, <code>else</code>, et <b>4 espaces</b> avant l'ordre.</li>
    <li><b>Une condition jamais vraie</b> : <code>sur_plage() and not sur_plage()</code>, ou <code>heure() &gt; 25</code>. Le rejeu le montre : la ligne reste rouge.</li>
    <li><b>Un <code>else</code> qui ne sert à rien</b> : rien n'est lu après le premier ordre exécuté.</li>
    <li><b>Manger à 10 ⚡</b> ne sert à rien : <code>energie() &lt; ${P.energieMax}</code>.</li></ul>`)}
  ${section("🥈 Pour aller plus loin", `<ul>
    <li><b>Anticiper la nuit</b> : si la plage est loin, pars avant la nuit : <code>if heure() &gt;= 17 and energie() &gt;= 8:</code> puis <code>aller_vers_plage()</code>. Mieux, avec les primitives avancées : <code>if heure() &gt;= debut_nuit() - 2:</code> s'adapte toute seule aux nuits courtes.</li>
    <li><b>Se cacher</b> plutôt que fuir quand tu es déjà dans les algues : <code>if requin_proche() and algue_ici():</code> puis <code>se_cacher()</code>.</li>
    <li><b>Hors de vue</b> : un requin plus loin que <code>vision_requin()</code> cases ne te voit pas. <code>if distance_requin() &lt;= vision_requin() and not algue_ici():</code> veut dire « il peut me voir ».</li>
    <li><b>Les algues sont prises ?</b> <code>aller_vers_algue_libre()</code> évite celles où mange déjà une autre tortue.</li>
    <li><b>Les distances</b> (<code>distance_plage()</code>, <code>distance_requin()</code>…) permettent des règles plus fines que True / False.</li>
    <li>Lis le code des tortues d'entraînement (la Championne, la Pirate…) dans le <a href="tuto-avance.html">tutoriel avancé</a>, et essaie de les battre.</li></ul>`)}
  ${section("🥇 Choisir ses algues (expert)", `<ul>
    <li>Une zone avec <b>plusieurs requins</b> et <b>sans algues</b> ? Quitte-la : <code>if requins_autour() &gt;= 2 and algues_autour() == 0:</code></li>
    <li>Les algues les plus proches sont surveillées ? <code>distance_algue_sure()</code> donne la distance des algues <b>sans requin autour</b>.</li>
    <li>Le soir, mange <b>près de la plage</b> : <code>algue_pres_plage()</code>.</li>
    <li>Une touffe presque vide (<code>portions_algue() &lt;= 1</code>) va disparaître : vise la suivante.</li></ul>
    <p>Tout est expliqué dans le <a href="tuto-avance.html?niveau=expert">tutoriel 🥇 Expert</a>.</p>`)}
  ${section("👥 En équipe", `<ul>
    <li><b>Parlez-vous avant la manche</b> : qui mange loin, qui reste près de la plage pour aider ?</li>
    <li><b>Donne quand tu peux</b> : <code>if equipiere_fatiguee() and energie() &gt;= 8:</code> puis <code>donner()</code>.</li>
    <li><b>À deux, on est protégées</b> : face à un requin, <code>aller_vers_equipiere()</code> peut valoir mieux que fuir.</li>
    <li><b>Visez la rivale</b> : <code>if rivale_a_cote() and requin_derriere_adversaire():</code> puis <code>pousser()</code>.</li></ul>`)}
  ${section("🌪️ Selon la nouveauté", `<ul>
    <li>🛍️ <b>Plastique</b> : <code>not plastique_ici()</code> avant de manger, sinon −${P.pertePlastique} ⚡ à chaque bouchée.</li>
    <li>🌙 <b>Nuits courtes</b> : la nuit commence à 20 h et finit à 5 h ; pars vers la plage plus tôt et ponds vite.</li>
    <li>🦈 <b>Requins affamés</b> : ils sont rapides et voient plus loin ; la survie d'abord, cache-toi dans les algues.</li>
    <li>⛈️ <b>Tempête</b> : tout à la fois. Une tortue simple et prudente bat souvent une tortue compliquée.</li></ul>`)}
  ${section("📊 Bien utiliser l'estimation", `<ul>
    <li>Ce sont <b>toujours les mêmes lagons</b> : tu peux comparer deux versions de ta tortue honnêtement.</li>
    <li><b>Change une seule chose à la fois</b>, puis estime : tu sauras ce qui a marché.</li>
    <li>Regarde aussi la <b>part de parties sans œuf</b> : une tortue régulière vaut mieux qu'une tortue qui gagne gros une fois sur trois.</li>
    <li>Prête ? Propose-la au <a href="pantheon.html">🏛️ Panthéon</a>.</li></ul>`)}`;
}

// ------------------------------------------------------------------ l'aide dans la page
export function brancherAide(box) {
  let onglet = "regles";
  const dessiner = (garder = false) => {
    const ouverts = garder ? [...box.querySelectorAll("details[open] > summary")].map((s) => s.textContent) : null;
    box.innerHTML = `<div class="aide-tete"><h2>❓ Aide</h2>
      <div class="aide-onglets" role="tablist">
        <button type="button" role="tab" data-aide="regles" aria-selected="${onglet === "regles"}">📜 Règles</button>
        <button type="button" role="tab" data-aide="conseils" aria-selected="${onglet === "conseils"}">💡 Conseils</button>
      </div></div>
      <div class="aide-page">${onglet === "regles" ? regles() : conseils()}</div>`;
    if (ouverts) for (const d of box.querySelectorAll("details")) d.open = ouverts.includes(d.querySelector("summary").textContent);
    box.querySelectorAll("[data-aide]").forEach((b) => b.addEventListener("click", () => { onglet = b.dataset.aide; dessiner(); }));
  };
  dessiner();
  document.addEventListener("lagon:avance", () => dessiner(true));   // mode avancé, manche en équipes : les primitives proposées changent
}

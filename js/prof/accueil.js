// =====================================================================
//  Lagon Arena — enseignant : l'ACCUEIL
//  Créer une salle (séance en classe), créer un DEVOIR (salle préparée hors cours, à faire à la maison),
//  ou reprendre une salle.
// =====================================================================
import { db, MODE, nomEtablissement } from "../db.js";
import { POINTS_RANG, BONUS_PROGRESSION } from "../engine.js";
import { $, $$, toast, esc, store } from "../common.js";
import { reglages, mesSalles, memoriserSalle, oublierSalle } from "./etat.js";
import { ouvrir, fermer } from "./salle.js";
import { prevoirDevoir } from "./preparer.js";

export function accueil() {
  fermer();
  $("#info").innerHTML = MODE === "demo" ? `<span class="pill mode-demo">Mode démo</span>` : `<span class="pill" id="etat-db">⏳ Base de données…</span>`;
  if (MODE === "db") db.heureServeur()
    .then(() => { const p = $("#etat-db"); if (p) p.textContent = "🟢 Base de données"; })
    .catch((e) => { const p = $("#etat-db"); if (p) p.textContent = "🔴 Base de données"; toast(e.message, "err"); });
  const anciennes = Object.entries(mesSalles()).sort((a, b) => (b[1].cree || "").localeCompare(a[1].cree || ""));
  $("#main").innerHTML = `<div class="grid2">
    <div>
      <div class="card etab-card">
        <label class="champ"><span>🏫 Établissement <span class="petit muted">(facultatif)</span></span>
          <input type="text" id="etablissement" maxlength="60" value="${esc(store.get("lagon:etablissement") || "")}" placeholder="ex. Lycée de Chirongui" autocomplete="organization"></label>
        <p class="petit muted">La classe est reconnue par le <b>code de la salle</b>. L'établissement, si tu le donnes, s'affiche au Panthéon avec les tortues de ta classe (les élèves ne le tapent pas). Tu pourras le changer dans les réglages de la salle : les tortues de la classe suivent.</p>
      </div>
      <div class="card">
        <h2>🌊 Séance en classe</h2>
        <p>Crée une salle : un <b>code de 4 lettres</b> s'affiche au tableau, les élèves le tapent sur la page d'accueil avec un pseudo.</p>
        <button class="btn big corail" id="creer">➕ Créer une salle</button>
      </div>
      <div class="card">
        <h2>📚 Devoir à la maison</h2>
        <p>Une salle créée <b>hors cours</b>, avec une manche <b>sans limite de temps</b> : choisis la nouveauté (calme, plastique, tempête…), les équipes si tu le veux, puis lance-la. Tu reçois un <b>lien d'accès</b> et un message prêt à envoyer aux élèves (messagerie de l'établissement…). Ils et elles programment et envoient leur tortue depuis la maison ; tu lances le brawl quand tu veux (en classe, ou d'ici).</p>
        <button class="btn big" id="devoir">📚 Créer un devoir</button>
      </div>
      ${MODE === "demo" ? `<div class="msg warn"><b>Mode démo</b> : la base de données n'est pas configurée (voir <code>js/config.js</code> et le README). Tout reste dans <b>ce navigateur</b> : pour tester, ouvre des élèves dans d'autres onglets, ou ajoute des élèves fictif·ve·s.</div>` : ""}
      ${anciennes.length ? `<div class="card"><h3>Reprendre une salle</h3><ul class="joueurs-liste">${anciennes.map(([c, v]) => `<li><b>${c}</b>${v.devoir ? ' <span class="pill or-pill petit">📚 devoir</span>' : ""}<span class="petit muted">${v.cree ? new Date(v.cree).toLocaleString("fr-FR") : ""}</span><span class="etat"><button class="btn small" data-reprendre="${c}">Reprendre</button> <button class="x" data-oublier="${c}" title="Oublier">✕</button></span></li>`).join("")}</ul></div>` : ""}
    </div>
    <div class="card">
      <h2>⏱️ Déroulé conseillé (≈ 55 min)</h2>
      <ol class="seance">
        <li><b>Tutoriel</b> (10-15 min) : les élèves font <a href="tuto.html" target="_blank">le tutoriel</a> : les règles, 2 tortues à réparer, et chacun·e repart avec <b>une tortue qui pond</b>.</li>
        <li><b>Manche 1</b> : ${Math.round(reglages.duree1 / 60)} min de programmation → brawl projeté (≈ 1 min 15) → 3 min de rapport.</li>
        <li><b>Manche 2 — rematch</b> avec une nouveauté : ${Math.round(reglages.duree / 60)} min → brawl → rapport.</li>
        <li><b>Manche 3 — finale</b> : ${Math.round(reglages.duree / 60)} min → brawl → rapport.</li>
        <li><b>Duel des champion·ne·s</b> (facultatif) : les 3 premier·e·s, dans la tempête.</li>
        <li><b>Bilan</b> : podium, meilleure progression, export CSV.</li>
      </ol>
      <h3>♾️ Manche longue, devoir</h3>
      <p>Une manche à <b>temps illimité</b> reste ouverte jusqu'à ce que tu lances le brawl. Chaque élève a un <b>code de session</b> pour se reconnecter depuis la maison (bouton « 🏠 Mon code de session » de sa page ; tu les retrouves tous avec « 🔑 Codes de session »). Une salle est gardée <b>60 jours</b> après sa dernière utilisation.</p>
      <h3>🧮 Points</h3>
      <p>Points selon le rang parmi les élèves : ${POINTS_RANG.slice(0, 6).join(", ")}… (1 point minimum), <b>+${BONUS_PROGRESSION}</b> si l'élève pond plus de nids qu'à la manche précédente. Les tortues d'entraînement 🤖 complètent le lagon s'il y a moins de ${reglages.min} élèves ; elles ne marquent pas de points.</p>
    </div></div>`;
  $("#creer").addEventListener("click", () => creer(false));
  $("#devoir").addEventListener("click", () => creer(true));
  $$("[data-reprendre]").forEach((b) => b.addEventListener("click", () => ouvrir(b.dataset.reprendre)));
  $$("[data-oublier]").forEach((b) => b.addEventListener("click", () => { oublierSalle(b.dataset.oublier); accueil(); }));
  history.replaceState(null, "", "prof.html");
}

async function creer(devoir) {
  try {
    const etab = nomEtablissement($("#etablissement").value) || "";
    const r = await db.creerSalle(etab);
    store.set("lagon:etablissement", etab);   // proposé la prochaine fois (60 jours)
    if (r.sansEtablissement) toast("Salle créée, mais sans l'établissement : la base de données n'est pas à jour (relancer supabase.sql).", "err");
    memoriserSalle(r.code, r.secret, devoir ? { devoir: true } : {});
    if (devoir) prevoirDevoir(r.code);   // manche 1 sans limite de temps, à régler puis lancer
    await ouvrir(r.code);
  } catch (e) { toast(e.message, "err"); }
}

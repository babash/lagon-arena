// =====================================================================
//  Lagon Arena — la page d'ACCUEIL (index.html)
//  Deux publics, deux vues :
//   • 🐢 élève : entrer dans la partie (code de la salle + pseudo, ou son SEUL code de session),
//     le parcours en 4 missions (le tutoriel, avec sa progression), les règles en 1 minute,
//     s'entraîner seul, les missions avancées, le Panthéon ;
//   • 👩‍🏫 enseignant : comprendre le jeu en 30 secondes, créer une salle ou un devoir,
//     essayer en mode démo, reprendre ses salles, la documentation.
//  Un élève arrivé par un lien d'accès (?salle=ABCD) voit toujours la vue élève.
// =====================================================================
import { db, MODE } from "./db.js";
import { COULEURS } from "./engine.js";
import { $, $$, el, esc, store, salleInvitee, nouveauCodePerso, normaliserCode, codeValide, jetonDuCode, codeLisible, cleJeton, cleCodePerso } from "./common.js";
import { progressionTuto } from "./parcours.js";
import { reglesCartesHTML } from "./regles-vue.js";

const q = new URLSearchParams(location.search);

// ---------- la base de données et les compteurs ----------
const nombre = (n) => Number(n).toLocaleString("fr-FR");
if (MODE === "db") {
  $("#mode").textContent = "⏳ Connexion à la base de données…";
  db.heureServeur()
    .then(() => { $("#mode").textContent = "🟢 Connecté à la base de données de la classe"; })
    .catch((e) => { $("#mode").textContent = "🔴 " + e.message; });
  db.statistiques().then((s) => {
    if (!s || (!s.parties && !s.participants)) return;
    const box = $("#compteurs");
    box.innerHTML = `<div class="compteur"><b data-n="${s.parties}">0</b><span>🎬 partie${s.parties > 1 ? "s" : ""} jouée${s.parties > 1 ? "s" : ""}</span></div>
      <div class="compteur"><b data-n="${s.participants}">0</b><span>🐢 joueur${s.participants > 1 ? "s" : ""}</span></div>
      ${s.pantheon ? `<a class="compteur petit-compteur" href="pantheon.html"><b data-n="${s.pantheon}">0</b><span>🏛️ au Panthéon</span></a>` : ""}`;
    box.classList.remove("cache");
    defiler(box);
  }).catch(() => { /* base injoignable : pas de compteurs */ });
} else $("#mode").innerHTML = `<span class="pill mode-demo">Mode démo</span> la base de données n'est pas configurée : tout reste dans ce navigateur.`;

// les compteurs défilent de 0 jusqu'à leur valeur (directement s'il faut éviter les animations)
function defiler(box) {
  const chiffres = [...box.querySelectorAll("[data-n]")];
  const fin = (b) => { b.textContent = nombre(b.dataset.n); };
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { chiffres.forEach(fin); return; }
  const t0 = performance.now(), duree = 1400;
  const pas = (t) => {
    const x = Math.min(1, (t - t0) / duree), e = 1 - Math.pow(1 - x, 3);   // départ rapide, arrivée en douceur
    for (const b of chiffres) b.textContent = nombre(Math.round(Number(b.dataset.n) * e));
    if (x < 1) requestAnimationFrame(pas); else chiffres.forEach(fin);
  };
  requestAnimationFrame(pas);
}

// ---------- élève ou enseignant ----------
function montrer(profil) {
  for (const b of $$(".profil")) b.setAttribute("aria-selected", String(b.dataset.profil === profil));
  $("#vue-eleve").classList.toggle("cache", profil !== "eleve");
  $("#vue-prof").classList.toggle("cache", profil !== "prof");
}
for (const b of $$(".profil")) b.addEventListener("click", () => { store.set("lagon:profil", b.dataset.profil); montrer(b.dataset.profil); });
montrer(q.get("salle") ? "eleve" : q.has("prof") ? "prof" : store.get("lagon:profil", "eleve") === "prof" ? "prof" : "eleve");

// les salles de cet enseignant (gardées 60 jours dans ce navigateur)
const salles = Object.keys(store.get("lagon:prof", {}) || {});
if (salles.length) $("#mes-salles").innerHTML = `<div class="msg info">🔑 Vous avez <b>${salles.length} salle${salles.length > 1 ? "s" : ""}</b> sur ce navigateur (${salles.slice(0, 6).join(", ")}${salles.length > 6 ? "…" : ""}) : retrouvez-la${salles.length > 1 ? "s" : ""} dans l'<a href="prof.html">espace enseignant</a>.</div>`;

// ---------- le parcours : les 4 missions du tutoriel, avec leur progression ----------
const salleQ = q.get("salle") ? q.get("salle").toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
function dessinerParcours() {
  const P = progressionTuto(), prochaine = P.find((m) => m.etat !== "finie");
  const finies = P.filter((m) => m.etat === "finie").length;
  $("#barre-parcours div").style.width = (100 * finies / P.length) + "%";
  $("#missions").innerHTML = P.map((m) => {
    const ici = prochaine && m.n === prochaine.n;
    const lien = `tuto.html?mission=${m.n}${salleQ ? "&salle=" + encodeURIComponent(salleQ) : ""}`;
    const etiquette = m.etat === "finie" ? "✅ Réussie" : m.etat === "en cours" ? `⏳ ${m.ok} / ${m.total}` : ici ? "👉 À faire maintenant" : "À faire";
    const bouton = m.etat === "finie" ? "Revoir" : m.etat === "en cours" ? "Continuer →" : ici ? "Commencer →" : "Ouvrir";
    return `<li class="mission m-${m.etat.replace(" ", "-")}${ici ? " ici" : ""}">
      <a href="${lien}" class="mission-lien">
        <span class="mission-num" aria-hidden="true">${m.etat === "finie" ? "✓" : m.n}</span>
        <span class="mission-ic" aria-hidden="true">${m.icone}</span>
        <span class="mission-corps"><span class="mission-sur">Mission ${m.n} · ${m.duree}</span><b>${esc(m.titre)}</b><span class="mission-txt">${m.texte}</span></span>
        <span class="mission-pied"><span class="mission-etat">${etiquette}</span><span class="btn small ${ici ? "vert" : "ghost"}">${bouton}</span></span>
      </a></li>`;
  }).join("") + `<li class="mission m-partie${!prochaine ? " ici" : ""}"><a href="#titre-acces" class="mission-lien">
      <span class="mission-num" aria-hidden="true">🏁</span><span class="mission-ic" aria-hidden="true">🏆</span>
      <span class="mission-corps"><span class="mission-sur">Ensuite</span><b>La partie avec ta classe</b><span class="mission-txt">Ton enseignant affiche un code : entre-le en haut de la page, et que la meilleure tortue gagne !</span></span>
      <span class="mission-pied"><span class="mission-etat">${prochaine ? "Après les missions" : "👉 Prête !"}</span></span></a></li>`;
}
dessinerParcours();
addEventListener("pageshow", dessinerParcours);   // (retour arrière depuis le tutoriel : la progression a pu changer)
$("#regles-accueil").innerHTML = reglesCartesHTML();

// ---------- entrer dans la partie : deux façons ----------
function onglet(nom) {
  for (const b of $$("[data-acces]")) b.setAttribute("aria-selected", String(b.dataset.acces === nom));
  $("#rejoindre").classList.toggle("cache", nom !== "classe");
  $("#reprendre").classList.toggle("cache", nom !== "code");
}
for (const b of $$("[data-acces]")) b.addEventListener("click", () => { onglet(b.dataset.acces); (nom => $(nom === "code" ? "#codeperso" : "#salle").focus())(b.dataset.acces); });

// ---------- rejoindre une salle ----------
let couleur = store.get("lagon:couleur") || COULEURS[Math.floor(Math.random() * COULEURS.length)];
const pal = $("#palette");
for (const c of COULEURS) {
  const b = el("button", { type: "button", style: `background:${c}`, title: c, "aria-label": "couleur " + c });
  if (c === couleur) b.classList.add("on");
  b.addEventListener("click", () => { couleur = c; pal.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); });
  pal.append(b);
}
const der = store.get("lagon:derniere");
if (der) { $("#salle").value = der.salle; $("#pseudo").value = der.pseudo; }
if (q.get("salle")) {   // arrivé·e par le lien d'accès donné par l'enseignant
  const s = q.get("salle").toUpperCase();
  $("#salle").value = s;
  salleInvitee();   // (gardée en mémoire pour revenir ici après le tutoriel)
  $("#invitation").innerHTML = `<div class="card invitation-carte"><h2>🔗 Tu es invité·e dans la salle <span class="gros-code">${s.replace(/[^A-Z0-9]/g, "")}</span></h2>
    <ol><li>Tu n'as jamais joué ? Fais d'abord les <a href="#titre-parcours"><b>missions</b></a> plus bas (tu reviendras ici à la fin).</li>
    <li>Choisis un <b>pseudo</b> (pas ton vrai nom) et une couleur, puis <b>plonge dans le lagon</b>.</li>
    <li>Note ton <b>code de session</b> (bouton « 🏠 Mon code de session ») : avec lui seul, tu reviens depuis n'importe quel ordinateur.</li></ol></div>`;
  $("#invitation").classList.remove("cache");
  if (!$("#pseudo").value) setTimeout(() => $("#pseudo").focus(), 300);
}
if (q.get("pseudo")) $("#pseudo").value = q.get("pseudo");

// un raccourci : la dernière partie jouée sur ce navigateur (le jeton est déjà connu, rien à retaper)
if (der && der.salle && der.pseudo && store.get(cleJeton(der.salle, der.pseudo)) && (!salleQ || salleQ === der.salle)) {
  $("#reprise-rapide").innerHTML = `<a class="reprise-rapide" href="eleve.html?salle=${encodeURIComponent(der.salle)}&pseudo=${encodeURIComponent(der.pseudo)}">
    <span class="rr-ic" aria-hidden="true">▶</span><span><b>Reprendre ma partie</b><br><span class="petit">salle <b>${esc(der.salle)}</b> · ${esc(der.pseudo)}</span></span></a>`;
}

const montrerErreur = (id, t) => { $(id).innerHTML = t; $(id).classList.remove("cache"); };
async function entrer(salle, pseudo, j, code) {
  const p = await db.rejoindre(salle, pseudo, j, couleur);
  store.set(cleJeton(salle, p), j); if (code) store.set(cleCodePerso(salle, p), code);
  store.set("lagon:couleur", couleur); store.set("lagon:derniere", { salle, pseudo: p });
  location.href = `eleve.html?salle=${encodeURIComponent(salle)}&pseudo=${encodeURIComponent(p)}`;
}

// 1re façon : le code de la salle et un pseudo
$("#rejoindre").addEventListener("submit", async (e) => {
  e.preventDefault();
  const salle = $("#salle").value.trim().toUpperCase(), pseudo = $("#pseudo").value.trim();
  $("#erreur").classList.add("cache");
  // le jeton : celui déjà connu sur ce poste, sinon un nouveau code de session
  let code = store.get(cleCodePerso(salle, pseudo)), j;
  if (code) j = jetonDuCode(code);
  else if (store.get(cleJeton(salle, pseudo))) j = store.get(cleJeton(salle, pseudo));   // (ancien jeton, sans code de session)
  else { code = nouveauCodePerso(); j = jetonDuCode(code); }
  try { await entrer(salle, pseudo, j, code); }
  catch (err) {
    if (/déjà pris/.test(err.message)) montrerErreur("#erreur", `Ce pseudo est déjà pris dans cette salle.<br><b>Si c'est le tien</b> (tu viens d'un autre ordinateur), clique sur <button type="button" class="lien-bouton" id="vers-code">🏠 J'ai un code de session</button> et tape ton code. Sinon, choisis un autre pseudo.`);
    else montrerErreur("#erreur", esc(err.message));
    const v = $("#vers-code"); if (v) v.addEventListener("click", () => { onglet("code"); $("#codeperso").focus(); });
  }
});

// 2e façon : le code de session SEUL (la salle et le pseudo sont retrouvés par la base)
$("#reprendre").addEventListener("submit", async (e) => {
  e.preventDefault();
  const code = normaliserCode($("#codeperso").value);
  $("#erreur2").classList.add("cache");
  if (!codeValide(code)) return montrerErreur("#erreur2", "Code de session incorrect : 8 lettres ou chiffres, par exemple <b>K7PQ-2XMA</b>.");
  const j = jetonDuCode(code), secours = !$("#reprise-secours").classList.contains("cache");
  try {
    if (secours) {   // base de données pas encore à jour : on demande aussi la salle et le pseudo
      const salle = $("#salle2").value.trim().toUpperCase(), pseudo = $("#pseudo2").value.trim();
      if (!salle || !pseudo) return montrerErreur("#erreur2", "Tape aussi le code de ta salle et ton pseudo.");
      return await entrer(salle, pseudo, j, code);
    }
    const r = await db.retrouverSession(j);
    if (r === null) {
      $("#reprise-secours").classList.remove("cache");
      const d = store.get("lagon:derniere"); if (d) { $("#salle2").value = d.salle; $("#pseudo2").value = d.pseudo; }
      return montrerErreur("#erreur2", "Pour l'instant, tape aussi le code de ta salle et ton pseudo (ton enseignant doit mettre à jour la base de données).");
    }
    if (!r) return montrerErreur("#erreur2", `Aucune partie avec le code <b>${esc(codeLisible(code))}</b>. Vérifie-le dans ton cahier (attention aux lettres qui se ressemblent). La salle a peut-être été supprimée : demande à ton enseignant.`);
    if (r.couleur) couleur = r.couleur;
    await entrer(r.salle, r.pseudo, j, code);
  } catch (err) {
    montrerErreur("#erreur2", /déjà pris/.test(err.message) ? "Ce code de session ne correspond pas à ce pseudo. Vérifie la salle, le pseudo et le code (ou demande à ton enseignant de débloquer ton pseudo)." : esc(err.message));
  }
});

// lien personnel (…#code=K7PQ2XMA) : on entre directement, sans rien taper
const h = new URLSearchParams(location.hash.slice(1));
if (h.get("code")) {
  $("#codeperso").value = codeLisible(normaliserCode(h.get("code")));
  history.replaceState(null, "", location.pathname + location.search);
  onglet("code");
  $("#reprendre").requestSubmit();
}

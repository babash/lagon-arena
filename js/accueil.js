// =====================================================================
//  Lagon Arena — la page d'ACCUEIL (index.html)
//  Deux publics, deux vues :
//   • 🐢 élève : rejoindre la salle (le cas le plus fréquent, en classe), le tutoriel la première
//     fois, revenir d'un autre ordinateur (code de session), s'entraîner seul, le Panthéon ;
//   • 👩‍🏫 enseignant : comprendre le jeu en 30 secondes, créer une salle ou un devoir,
//     essayer en mode démo, reprendre ses salles, la documentation.
//  Un élève arrivé par un lien d'accès (?salle=ABCD) voit toujours la vue élève.
// =====================================================================
import { db, MODE } from "./db.js";
import { COULEURS } from "./engine.js";
import { $, $$, el, store, salleInvitee, nouveauCodePerso, normaliserCode, codeValide, jetonDuCode, cleJeton, cleCodePerso } from "./common.js";

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
  $("#lien-tuto").href = "tuto.html?salle=" + encodeURIComponent(s);
  $("#invitation").innerHTML = `<div class="card"><h2>🔗 Tu es invité·e dans la salle <span class="gros-code">${s.replace(/[^A-Z0-9]/g, "")}</span></h2>
    <ol><li>Tu n'as jamais joué ? Commence par le <a href="tuto.html?salle=${encodeURIComponent(s)}"><b>tutoriel</b></a> (tu reviendras ici à la fin).</li>
    <li>Choisis un <b>pseudo</b> (pas ton vrai nom) et une couleur, puis <b>plonge dans le lagon</b>.</li>
    <li>Note ton <b>code de session</b> (bouton « 🏠 Mon code de session ») pour revenir depuis un autre ordinateur.</li></ol></div>`;
  $("#invitation").classList.remove("cache");
  if (!$("#pseudo").value) setTimeout(() => $("#pseudo").focus(), 300);
}
if (q.get("pseudo")) $("#pseudo").value = q.get("pseudo");
// lien personnel (…#code=K7PQ2XMA) : le code de session est déjà rempli
const h = new URLSearchParams(location.hash.slice(1));
if (h.get("code")) { $("#codeperso").value = h.get("code"); $("#reprise").open = true; history.replaceState(null, "", location.pathname + location.search); }

$("#rejoindre").addEventListener("submit", async (e) => {
  e.preventDefault();
  const salle = $("#salle").value.trim().toUpperCase(), pseudo = $("#pseudo").value.trim();
  const saisi = normaliserCode($("#codeperso").value);
  const erreur = (t) => { $("#erreur").innerHTML = t; $("#erreur").classList.remove("cache"); };
  $("#erreur").classList.add("cache");
  if (saisi && !codeValide(saisi)) return erreur("Code de session incorrect : 8 lettres ou chiffres, par exemple <b>K7PQ-2XMA</b>.");
  // le jeton : celui du code de session tapé, sinon celui déjà connu sur ce poste, sinon un nouveau code de session
  let code = saisi || store.get(cleCodePerso(salle, pseudo)), j;
  if (code) j = jetonDuCode(code);
  else if (store.get(cleJeton(salle, pseudo))) j = store.get(cleJeton(salle, pseudo));   // (ancien jeton, sans code perso)
  else { code = nouveauCodePerso(); j = jetonDuCode(code); }
  try {
    const p = await db.rejoindre(salle, pseudo, j, couleur);
    store.set(cleJeton(salle, p), j); if (code) store.set(cleCodePerso(salle, p), code);
    store.set("lagon:couleur", couleur); store.set("lagon:derniere", { salle, pseudo: p });
    location.href = `eleve.html?salle=${encodeURIComponent(salle)}&pseudo=${encodeURIComponent(p)}`;
  } catch (err) {
    if (/déjà pris/.test(err.message)) {
      erreur(saisi ? "Ce code de session ne correspond pas à ce pseudo. Vérifie la salle, le pseudo et le code (ou demande à ton enseignant de débloquer ton pseudo)."
        : "Ce pseudo est déjà pris dans cette salle. <b>Si c'est le tien</b> (tu viens d'un autre ordinateur), ouvre « 🏠 Tu reviens depuis un autre ordinateur ? » et tape ton <b>code de session</b>. Sinon, choisis un autre pseudo.");
      if (!saisi) $("#reprise").open = true;
    } else erreur(err.message);
  }
});

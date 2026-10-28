// =====================================================================
//  Lagon Arena — enseignant : les liens à donner et les fenêtres qui les montrent
//   • lien d'accès ÉLÈVES (salle déjà remplie) + message à copier + QR code ;
//   • lien ENSEIGNANT (piloter la salle depuis un autre ordinateur) ;
//   • CODES DE SESSION des élèves (pour se reconnecter depuis un autre ordinateur).
//  Tous les liens pointent vers l'adresse publique du site (CONFIG.URL_SITE).
// =====================================================================
import { db } from "../db.js";
import { $, el, esc, toast, copier, lienSite, sansProtocole, codeLisible } from "../common.js";
import { S } from "./etat.js";

export const lienEleves = (code = S.code) => lienSite("index.html?salle=" + encodeURIComponent(code));
export const lienEnseignant = (code = S.code, secret = S.secret) => lienSite(`prof.html?salle=${encodeURIComponent(code)}#cle=${secret}`);

export function dessinerQR(box, texte, taille = 6) {
  if (typeof window.qrcode !== "function") return;
  try {
    const qr = window.qrcode(0, "M"); qr.addData(texte); qr.make();
    box.innerHTML = qr.createImgTag(taille, 8); box.classList.remove("cache");
  } catch { /* pas de QR code */ }
}

// une fenêtre par-dessus la page, avec un bouton « Fermer »
export function fenetre(html, { large = false } = {}) {
  const o = el("div", { class: "overlay" }, el("div", { class: "boite" + (large ? " boite-large" : ""),
    html: html + `<p class="row centre" style="margin-top:12px"><button class="btn ghost" data-fermer>Fermer</button></p>` }));
  document.body.append(o);
  $("[data-fermer]", o).addEventListener("click", () => o.remove());
  o.addEventListener("click", (e) => { if (e.target === o) o.remove(); });
  return o;
}
const boutonCopier = (o, sel, texte, msg) => $(sel, o).addEventListener("click", () => copier(texte).then(() => toast(msg), () => toast(texte)));

// le message à envoyer aux élèves (messagerie de l'établissement, cahier de textes…)
export function messageEleves({ devoir = false } = {}) {
  const lien = lienEleves();
  return devoir
    ? `🐢 Lagon Arena : devoir
1. Ouvre ce lien : ${lien}
2. Si tu n'as jamais joué, fais d'abord le tutoriel (bouton « Commencer le tutoriel »).
3. Choisis un pseudo (pas ton vrai nom) et clique sur « Plonger dans le lagon ».
4. Programme ta tortue, teste-la dans le bac à sable, puis clique sur « Envoyer ma tortue ». Tu peux la renvoyer autant que tu veux jusqu'au brawl.
5. Note ton code de session (bouton « 🏠 Mon code de session ») : il te permet de revenir depuis un autre ordinateur.`
    : `🐢 Lagon Arena : rejoins la salle ${S.code}
${lien}
Choisis un pseudo (pas ton vrai nom), puis plonge dans le lagon !`;
}

export function fenetreLienEleves({ devoir = false } = {}) {
  const lien = lienEleves();
  const o = fenetre(`<h2>🔗 Lien d'accès pour les élèves</h2>
    <p>${devoir ? "📚 <b>Devoir</b> : la manche est ouverte, sans limite de temps. " : ""}Donnez ce lien aux élèves : la salle <b>${esc(S.code)}</b> est déjà remplie, ils n'ont plus qu'à choisir un pseudo.</p>
    <p class="lien-prof">${esc(lien)}</p>
    <p class="row centre"><button class="btn" id="copier-lien-el">📋 Copier le lien</button></p>
    <div id="qr-lien" class="qr cache"></div>
    <h3>✉️ Message prêt à envoyer</h3>
    <textarea class="message-eleves" rows="${devoir ? 8 : 4}">${esc(messageEleves({ devoir }))}</textarea>
    <p class="row centre"><button class="btn ghost" id="copier-msg">📋 Copier le message</button></p>
    <p class="petit muted">Chaque élève reçoit un <b>code de session</b> pour revenir depuis un autre ordinateur (liste : « 🔑 Codes de session »).</p>`, { large: true });
  boutonCopier(o, "#copier-lien-el", lien, "Lien copié !");
  $("#copier-msg", o).addEventListener("click", () => { const t = $("textarea", o).value; copier(t).then(() => toast("Message copié !"), () => toast(t)); });
  dessinerQR($("#qr-lien", o), lien, 5);
}

export function fenetreLienEnseignant() {
  const lien = lienEnseignant();
  const o = fenetre(`<h2>🏠 Piloter depuis un autre ordinateur</h2>
    <p>Ouvrez ce <b>lien enseignant</b> sur l'autre ordinateur (envoyez-le-vous par la messagerie de l'établissement, par exemple) : la salle <b>${esc(S.code)}</b> s'y ajoutera à « Mes salles ».</p>
    <p class="lien-prof">${esc(lien)}</p>
    <p class="petit">⚠️ <b>Ne le donnez pas aux élèves</b> : ce lien permet de piloter la salle.</p>
    <p class="row centre"><button class="btn" id="copier-prof">📋 Copier le lien</button></p>`);
  boutonCopier(o, "#copier-prof", lien, "Lien enseignant copié !");
}

export async function fenetreCodesSession() {
  let l;
  try { l = await db.codesSession(S.code, S.secret); } catch { return toast("Codes de session indisponibles : relancez supabase.sql dans Supabase.", "err"); }
  const o = fenetre(`<h2>🔑 Codes de session · salle ${esc(S.code)}</h2>
    <p class="petit">Pour se reconnecter depuis un autre ordinateur (chez soi…), l'élève tape la salle, son pseudo et son code de session (« 🏠 Tu reviens depuis un autre ordinateur ? »). Chaque élève voit aussi le sien avec le bouton « 🏠 Mon code de session ».</p>
    <table class="scores codes-table"><tr><th>Pseudo</th><th>Code de session</th></tr>
      ${l.map((x) => `<tr><td>${esc(x.pseudo)}</td><td class="code-cell">${x.code ? codeLisible(x.code) : '<span class="muted petit">créé quand l\'élève ouvrira sa page</span>'}</td></tr>`).join("") || '<tr><td colspan="2" class="muted">Aucun élève</td></tr>'}</table>
    <p class="petit">⚠️ À ne pas projeter : chaque code permet d'envoyer une tortue à la place de l'élève.</p>
    <p class="row centre"><button class="btn ghost" id="imprimer-codes">🖨️ Imprimer</button></p>`, { large: true });
  $("#imprimer-codes", o).addEventListener("click", () => { document.body.classList.add("impr-codes"); window.print(); document.body.classList.remove("impr-codes"); });
}

export const adresseCourte = () => sansProtocole(lienSite("index.html"));

// Manche longue (♾️) et CODE DE SESSION : le code est montré tout de suite pendant une manche longue ;
// sur un autre ordinateur, le SEUL code suffit (la salle et le pseudo sont retrouvés), la dernière tortue
// envoyée revient dans l'éditeur ; le lien personnel index.html#code=… entre sans rien taper ;
// un mauvais code est expliqué ; « Reprendre ma partie » en un clic ; l'enseignant retrouve les codes.
import { TORTUES } from "../lib.mjs";

export default {
  nom: "session", ordre: 42, modes: ["demo", "base"], delai: 150,
  titre: "Manche longue et code de session : code seul, lien #code=, reprise",
  async lancer(t) {
    const ctxA = await t.contexte({ largeur: 1400, hauteur: 950 });
    const prof = await t.page(ctxA, "prof");
    const salle = await t.creerSalle(prof);
    await prof.click('[data-preset="longue"]');
    await t.attendre(async () => (await prof.textContent("#go")).includes("♾️"), "la manche longue est préparée (♾️)");
    await t.lancerManche(prof);

    // ---------- ordinateur A : Moya rejoint ; son code lui est montré tout de suite ----------
    const a = await t.rejoindre(await t.page(ctxA, "Moya-A"), salle, "Moya");
    const code = await t.attendre(async () => { const c = await a.$(".overlay .code-perso"); return c && t.propre(await c.textContent()); }, "pendant une manche longue, le code de session s'affiche tout de suite");
    t.correspond(code, /^[A-Z0-9]{4}-[A-Z0-9]{4}$/, "le code de session a 8 caractères (XXXX-XXXX)");
    const fenetre = await t.texte(a, ".overlay");
    t.contient(fenetre, "J'ai un code de session", "la fenêtre dit où taper le code");
    t.contient(fenetre, "C'est tout", "la fenêtre dit qu'il n'y a rien d'autre à taper");
    await t.fermerFenetre(a);
    await a.click("text=Mon code de session");
    await t.attendre(async () => (await t.texte(a, ".overlay .code-perso").catch(() => "")) === code, "« 🏠 Mon code de session » remontre le même code");
    await t.fermerFenetre(a);
    t.contient(await t.texte(a, "#manche-info"), "temps illimité", "l'élève sait que la manche est à temps illimité");
    await t.envoyer(a, TORTUES.bonne);
    t.contient(await t.texte(a, "#envoi"), "chez toi", "l'élève peut continuer chez lui");

    // ---------- ordinateur B : le SEUL code de session ----------
    const b = await t.page(await t.autreOrdinateur(a), "Moya-B");
    await b.goto(t.url("index.html"));
    await b.click("#o-code");
    await b.fill("#codeperso", "ABCD-EFGH");
    await b.click("#reprendre button[type=submit]");
    await t.attendre(async () => (await t.texte(b, "#erreur2")).includes("Aucune partie"), "un code inconnu est expliqué");
    await b.fill("#codeperso", code.toLowerCase().replace("-", " "));
    await b.click("#reprendre button[type=submit]");
    await b.waitForURL(/eleve\.html/, { timeout: 10000 });
    t.contient(decodeURIComponent(b.url()), `salle=${salle}&pseudo=Moya`, "le code seul retrouve la salle et le pseudo");
    await t.attendre(async () => (await t.lireCode(b)).includes("se_cacher()"), "la dernière tortue envoyée revient dans l'éditeur", { delai: 12000 });
    await t.attendre(() => b.$(".overlay .code-perso"), "sur un nouvel ordinateur, le code est rappelé (manche longue)");
    await t.fermerFenetre(b);
    await t.attendre(async () => (await b.textContent("#envoyer")).includes("Envoyée"), "le bouton montre que cette tortue est déjà envoyée");
    // on peut l'améliorer et la renvoyer depuis la maison
    await t.envoyer(b, TORTUES.moyenne);
    // « Reprendre ma partie » : un clic, rien à taper
    await b.goto(t.url("index.html"));
    t.contient(await t.texte(b, "#reprise-rapide"), "Reprendre ma partie", "l'accueil propose de reprendre la partie");
    await b.click("#reprise-rapide a");
    await b.waitForURL(/eleve\.html/);

    // ---------- ordinateur C : le lien personnel ----------
    const c = await t.page(await t.autreOrdinateur(a), "Moya-C");
    await c.goto(t.url("index.html#code=" + code.replace("-", "")));
    await c.waitForURL(/eleve\.html/, { timeout: 10000 });
    t.contient(decodeURIComponent(c.url()), "pseudo=Moya", "le lien personnel ouvre directement la partie");

    // ---------- l'enseignant retrouve les codes ; le brawl de la manche longue ----------
    await prof.click("#codes");
    await t.attendre(async () => (await t.texte(prof, "body")).includes(code.replace("-", "")) || (await t.texte(prof, "body")).includes(code), "l'enseignant retrouve le code de session de Moya");
    const f = await prof.$("[data-fermer]"); if (f) await f.click();
    await t.brawl(prof);
    await t.attendre(async () => (await t.texte(a, "#t-res")).includes("Classement du match"), "après le brawl de la manche longue, Moya a ses résultats", { delai: 15000 });
  },
};

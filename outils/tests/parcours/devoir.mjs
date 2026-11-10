// Un devoir à la maison : l'enseignant crée un devoir (manche sans limite de temps), obtient le lien
// et le message pour les élèves ; l'élève arrive par le lien (salle déjà remplie, invitation), reçoit
// son code de session tout de suite, envoie sa tortue ; plus tard, l'enseignant lance le brawl.
import { TORTUES } from "../lib.mjs";

export default {
  nom: "devoir", ordre: 43, modes: ["demo", "base"], delai: 120,
  titre: "Devoir : lien et message, invitation, code de session, envoi, brawl",
  async lancer(t) {
    const ctx = await t.contexte({ largeur: 1400, hauteur: 950 });
    const prof = await t.page(ctx, "prof");
    const salle = await t.creerSalle(prof, { devoir: true });
    t.contient(await prof.textContent("#go"), "Lancer le devoir", "le bouton lance le devoir");
    await prof.click("#go");
    await t.attendre(() => prof.$(".lien-prof"), "le lien pour les élèves s'affiche au lancement du devoir");
    const lien = await t.texte(prof, ".lien-prof");
    t.contient(lien, "salle=" + salle, "le lien contient la salle");
    const message = await prof.inputValue(".message-eleves");
    t.contient(message, lien, "le message prêt à envoyer contient le lien");
    t.contient(message, "code de session", "le message parle du code de session");
    await prof.click("[data-fermer]");
    await t.attendre(() => prof.isVisible("#brawl"), "le devoir est ouvert (programmation)");
    t.contient(await t.texte(prof, "#gc"), "♾️", "pas de chrono : temps illimité");

    // l'élève, chez lui, ouvre le lien
    const el = await t.page(ctx, "Maeva");
    await el.goto(t.url(`index.html?salle=${salle}`));
    await t.attendre(() => el.isVisible("#invitation"), "l'élève arrivé par le lien est accueilli (invitation)");
    t.egal(await el.inputValue("#salle"), salle, "la salle est déjà remplie");
    await el.fill("#pseudo", "Maeva");
    await el.click("#rejoindre button[type=submit]");
    await el.waitForURL(/eleve\.html/);
    await t.attendre(() => el.$(".overlay .code-perso"), "le code de session est montré tout de suite (devoir)");
    await t.fermerFenetre(el);
    t.contient(await t.texte(el, "#chrono"), "♾️", "l'élève voit que le temps est illimité");
    await t.envoyer(el, TORTUES.bonne);
    await t.attendre(async () => (await t.texte(prof, "#nb-env")) === "1", "l'enseignant voit la tortue envoyée", { delai: 12000 });

    // plus tard : le brawl
    await t.brawl(prof);
    await t.attendre(async () => (await t.texte(el, "#t-res")).includes("Classement du match"), "l'élève voit les résultats du devoir", { delai: 15000 });
  },
};

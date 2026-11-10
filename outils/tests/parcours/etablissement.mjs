// L'établissement (facultatif) : donné à la création de la salle, prérempli la fois suivante, affiché
// sous le code de la salle, modifiable dans les réglages ; l'élève qui propose sa tortue au Panthéon
// depuis la salle voit sa classe et son établissement, sans rien taper.
import { TORTUES } from "../lib.mjs";

export default {
  nom: "etablissement", ordre: 45, modes: ["demo", "base"], delai: 120,
  titre: "Établissement : création, réglages, Panthéon de la classe",
  async lancer(t) {
    const ctx = await t.contexte({ largeur: 1400, hauteur: 950 });
    const prof = await t.page(ctx, "prof");
    await prof.goto(t.url("prof.html"));
    await prof.fill("#etablissement", "Lycée des Lagons");
    await prof.click("#creer");
    const salle = await t.attendre(async () => { const c = t.propre(await prof.textContent("aside .code-salle").catch(() => "")); return /^[A-Z0-9]{4}$/.test(c) && c; }, "la salle est créée");
    await t.attendre(async () => (await t.texte(prof, "#etab-salle")).includes("Lycée des Lagons"), "l'établissement s'affiche sous le code de la salle");
    // il est prérempli pour la salle suivante
    await prof.goto(t.url("prof.html"));
    t.egal(await prof.inputValue("#etablissement"), "Lycée des Lagons", "l'établissement est prérempli la fois suivante");
    // il se change dans les réglages de la salle
    await prof.goto(t.url("prof.html?salle=" + salle));
    await t.attendre(() => prof.$("#r-etab"), "les réglages de la salle sont là");
    await prof.click(".reglages-d summary");
    await prof.fill("#r-etab", "Lycée de Chirongui"); await prof.press("#r-etab", "Tab");
    await t.attendre(async () => (await t.texte(prof, "#etab-salle")).includes("Chirongui"), "l'établissement modifié s'affiche");

    // l'élève de la salle propose sa tortue au Panthéon : classe + établissement, sans rien taper
    const el = await t.rejoindre(await t.page(ctx, "Naya"), salle, "Naya");
    await t.ecrireCode(el, TORTUES.experte.replace("energie() < 10", "energie() < 9"));
    await el.click('[data-t="test"]');
    await el.click("#pantheon");
    await t.attendre(() => el.$("#pt-form"), "le banc d'essai se termine", { delai: 40000 });
    const c = await t.texte(el, ".pt-classe");
    t.contient(c, salle, "la classe (code de la salle) est remplie");
    t.contient(c, "Chirongui", "l'établissement de la salle est rempli");
    t.ok(!(await el.isVisible("#pt-lycee")), "l'élève n'a pas à taper l'établissement");
  },
};

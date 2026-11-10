// Une manche en équipes : préparation (3 équipes, bascule et glisser-déposer d'un élève), carte d'équipe
// chez l'élève, primitives d'équipe proposées, retardataire placé dans une équipe, score des équipes
// en direct et résultats ; puis une manche réglée à la main (chacun pour soi, ×2, titre, nouveauté).
import { TORTUES } from "../lib.mjs";

const COOP = "def tour():\n    if equipiere_fatiguee() and energie() >= 8:\n        donner()\n    elif sur_plage() and est_la_nuit() and energie() >= 6:\n        pondre()\n    elif est_la_nuit() and energie() >= 6:\n        aller_vers_plage()\n    elif algue_ici():\n        manger()\n    else:\n        aller_vers_algue()\n";

export default {
  nom: "equipes", ordre: 41, modes: ["demo", "base"], delai: 180,
  titre: "Équipes : préparation, carte d'équipe, retardataire, score des équipes, manche ×2",
  async lancer(t) {
    const ctx = await t.contexte({ largeur: 1450, hauteur: 950 });
    const prof = await t.page(ctx, "prof");
    const salle = await t.creerSalle(prof);
    const el = {};
    for (const ps of ["Lina", "Moussa", "Zaina", "Ali", "Nour", "Ines"]) el[ps] = await t.rejoindre(await t.page(ctx, ps), salle, ps);
    await t.attendre(async () => (await t.texte(prof, "#liste")).includes("Ines"), "l'enseignant voit les 6 élèves", { delai: 12000 });

    await prof.click('[data-preset="equipes"]');
    await t.attendre(() => prof.$(".prep .eq-cols"), "les colonnes des équipes s'affichent");
    await prof.click('[data-nb="3"]');
    await t.attendre(async () => (await prof.$$(".prep [data-equipe]")).length === 3, "3 équipes");
    // Lina change d'équipe (clic, puis clic sur l'équipe 3)
    await prof.click('[data-bascule="Lina"]');
    await prof.click('[data-equipe="3"] h4');
    await t.attendre(async () => (await prof.$eval('[data-bascule="Lina"]', (b) => b.closest("[data-equipe]").dataset.equipe)) === "3", "Lina passe dans l'équipe 3");
    // Moussa est glissé dans l'équipe 1
    await prof.dragAndDrop('[data-bascule="Moussa"]', '[data-equipe="1"]');
    await t.attendre(async () => (await prof.$eval('[data-bascule="Moussa"]', (b) => b.closest("[data-equipe]").dataset.equipe)) === "1", "Moussa est glissé dans l'équipe 1");

    // chez l'élève : la carte de son équipe, et les primitives d'équipe dans la boîte à outils
    await t.attendre(async () => /quipe/.test(await t.texte(el.Lina, "#manche-info").catch(() => "")), "Lina voit son équipe avant la manche", { delai: 12000 });
    await t.attendre(async () => (await el.Lina.$$("#outils .c-equipe")).length > 0, "les primitives d'équipe sont proposées à l'élève", { delai: 8000 });

    await t.lancerManche(prof);
    t.ok(await prof.$("#rosters"), "l'écran projeté montre les équipes");
    await t.envoyer(el.Moussa, COOP);
    await t.envoyer(el.Lina, TORTUES.bonne);
    // un élève arrive pendant la manche : placé dans une équipe
    const tard = await t.rejoindre(await t.page(ctx, "Retard"), salle, "Retard");
    await t.attendre(async () => /quipe/.test(await t.texte(tard, "#manche-info").catch(() => "")), "le retardataire est placé dans une équipe", { delai: 12000 });

    await prof.click("#brawl");
    await t.attendre(() => prof.$("#score-eq"), "le score des équipes s'affiche pendant le brawl", { delai: 30000 });
    await t.attendre(async () => !(await prof.$eval("#fini", (b) => b.disabled)), "« Voir les résultats » est prêt");
    await prof.click("#fini");
    await t.attendre(() => prof.$(".resultat-equipes"), "les résultats par équipe s'affichent", { delai: 20000 });
    await t.attendre(async () => /quipe/.test(await t.texte(el.Lina, "#t-res")), "Lina voit le résultat de son équipe", { delai: 15000 });
    const sc = await t.db(prof, (db, c) => db.scores(c), salle);
    const m1 = sc.filter((s) => s.manche === 1 && !String(s.pseudo).startsWith("Bot-"));
    t.ok(m1.length >= 2 && m1.every((s) => s.equipe >= 1 && s.equipe <= 3), `les scores gardent l'équipe de chaque élève (${m1.map((s) => s.pseudo + ":" + s.equipe).join(" ")})`);

    // manche 2 réglée à la main : chacun pour soi, points doubles, requins affamés, un titre
    await prof.click('[data-preset="rematch"]');
    await prof.selectOption('.prep [data-k="coef"]', "2");
    await prof.selectOption('.prep [data-k="nouveaute"]', "affames");
    await prof.fill('.prep [data-k="titre"]', "Manche bonus"); await prof.press('.prep [data-k="titre"]', "Tab");
    await t.attendre(async () => (await prof.textContent("#go")).includes("×2"), "le bouton annonce les points doubles");
    await t.lancerManche(prof);
    t.contient(await t.texte(prof, ".titre-scene"), "Manche bonus", "le titre de la manche s'affiche au tableau");
    await t.attendre(async () => (await t.texte(el.Lina, "#twist")).includes("affamés"), "la nouveauté choisie arrive chez l'élève", { delai: 12000 });
    await t.brawl(prof);
    const sc2 = await t.db(prof, (db, c) => db.scores(c), salle);
    t.ok(sc2.some((s) => s.manche === 2 && !String(s.pseudo).startsWith("Bot-") && s.points >= 2), "la manche ×2 rapporte des points doublés");
  },
};

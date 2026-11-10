// Le lagon personnalisé : l'enseignant règle les requins, le plastique, le corail… (par-dessus une nouveauté),
// le résumé s'affiche, l'élève s'entraîne dans les mêmes conditions, le brawl l'annonce, et le match
// rejoué à partir des scores est identique (et différent sans le lagon personnalisé).
import { TORTUES } from "../lib.mjs";

export default {
  nom: "lagon", ordre: 44, modes: ["demo", "base"], delai: 120,
  titre: "Lagon personnalisé : réglages, élève, brawl, rejeu identique",
  async lancer(t) {
    const ctx = await t.contexte({ largeur: 1400, hauteur: 950 });
    const prof = await t.page(ctx, "prof");
    const salle = await t.creerSalle(prof, { devoir: true });
    await prof.selectOption('.prep [data-k="nouveaute"]', "tempete");
    t.ok(!(await prof.$eval(".prep-lagon", (d) => d.open)), "la section « lagon personnalisé » est fermée au départ");
    await prof.click(".prep-lagon summary");
    const indications = await prof.$$eval(".lagon-grille input", (l) => l.map((i) => i.dataset.lagon + "=" + i.placeholder));
    t.ok(indications.some((x) => x.startsWith("requins=5")), `les indications rappellent la nouveauté (${indications.join(" ")})`);
    for (const [k, v] of [["requins", "2"], ["plastiques", "0"], ["coraux", "12"]]) {
      await prof.fill(`[data-lagon="${k}"]`, v); await prof.press(`[data-lagon="${k}"]`, "Tab"); await t.pause(300);
    }
    await prof.selectOption('[data-lagon="rapides"]', "0"); await t.pause(300);
    const resume = await t.texte(prof, ".prep-lagon summary");
    t.correspond(resume, /2 requins/, "le résumé du lagon personnalisé");
    await prof.click("#go");
    await t.attendre(() => prof.$("[data-fermer]"), "le devoir est lancé");
    await prof.click("[data-fermer]");
    t.contient(await t.texte(prof, "#tw"), "Lagon personnalisé", "l'écran projeté annonce le lagon personnalisé");

    const el = await t.rejoindre(await t.page(ctx, "Ylang"), salle, "Ylang", { invite: true });
    await t.fermerCodeSession(el);
    await t.attendre(async () => (await t.texte(el, "#sb-twist")).includes("personnalisé"), "le bac à sable de l'élève utilise le lagon personnalisé", { delai: 12000 });
    await el.click("#tester");
    await t.attendre(() => el.$("#sb-vue canvas"), "l'élève teste dans ce lagon");
    await t.envoyer(el, TORTUES.bonne);

    await prof.click("#brawl");
    await t.attendre(() => prof.$(".brawl-grid"), "le brawl commence", { delai: 30000 });
    t.contient(await t.texte(prof, ".brawl-grid .titre-scene"), "lagon personnalisé", "le titre du brawl annonce le lagon personnalisé");
    await t.attendre(async () => !(await prof.$eval("#fini", (b) => b.disabled)), "« Voir les résultats » est prêt");
    await prof.click("#fini");
    await t.attendre(() => prof.$("#actions"), "les résultats s'affichent", { delai: 20000 });
    const v = await prof.evaluate(async (c) => {
      const { db } = await import("./js/db.js"); const { infosManche, lancerSimulation } = await import("./js/brawl.js");
      const [scores, tortues, joueurs, salle] = await Promise.all([db.scores(c), db.tortues(c), db.joueurs(c), db.salle(c)]);
      const info = infosManche(scores, 1);
      const sim = lancerSimulation(salle, 1, info.pseudos, joueurs, tortues, info.twist, null, info.equipes, info.version, info.lagon);
      const sans = lancerSimulation(salle, 1, info.pseudos, joueurs, tortues, info.twist, null, info.equipes, info.version, null);
      const n = (s) => s.resultats.map((r) => r.id + ":" + r.nids).sort().join(" ");
      const st = scores.filter((s) => s.manche === 1).map((s) => s.pseudo + ":" + s.nids).sort().join(" ");
      return { lagon: info.lagon, requins: sim.frames[0].requins.length, sacs: sim.frames[0].plastiques.length, identique: n(sim) === st, sansDiffere: n(sans) !== st };
    }, salle);
    t.ok(v.lagon && v.requins === 2 && v.sacs === 0, `le match a bien 2 requins et 0 sac (${JSON.stringify(v)})`);
    t.ok(v.identique, "le match rejoué depuis les scores est identique (lagon personnalisé gardé)");
    t.ok(v.sansDiffere, "sans le lagon personnalisé, le match serait différent");
  },
};

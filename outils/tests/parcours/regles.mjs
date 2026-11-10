// Les règles et les conseils (page élève) : 📜 Règles (6 cartes, le modèle français / Python, le détail
// dépliable), 💡 Conseils (l'essentiel, les sections), et les mêmes cartes à l'accueil et dans le tutoriel.
export default {
  nom: "regles", ordre: 32, delai: 60,
  titre: "Règles et conseils : cartes, modèle, détail, conseils",
  async lancer(t) {
    const p = await t.nouvellePage({ largeur: 1300 }, "regles");
    await p.goto(t.url("eleve.html?libre=1"));
    await t.attendre(() => p.$("#aide-regles .regle-carte"), "l'onglet des règles est prêt");
    await p.click('[data-t="regles"]');
    t.ok(await p.isVisible("#t-regles"), "l'onglet 📜 Règles s'ouvre");
    const cartes = await p.$$eval("#t-regles .regle-carte h3", (l) => l.map((x) => x.textContent.trim()));
    t.egal(cartes.join(" | "), "Le but | Pour pondre | L'énergie | Les requins | Le temps | Ton programme", "les 6 cartes, dans l'ordre");
    t.ok(await p.$("#t-regles .modele-duo .md-fr") && await p.$("#t-regles .modele-duo pre"), "le modèle en français ET en Python");
    const sections = await p.$$eval("#t-regles details.aide-section > summary", (l) => l.map((x) => x.textContent));
    t.ok(sections.length >= 8, `le détail des règles en sections dépliables (${sections.length})`);
    t.ok(sections.some((s) => s.includes("Les questions")) && sections.some((s) => s.includes("Les ordres")), "les questions et les ordres sont détaillés");
    t.contient(await t.texte(p, "#t-regles"), "requin_proche()", "les primitives sont listées");
    // une section fermée s'ouvre
    const ferme = await p.$("#t-regles details.aide-section:not([open]) > summary");
    if (ferme) { await ferme.click(); t.ok(await ferme.evaluate((s) => s.parentElement.open), "une section se déplie"); }

    await p.click('[data-t="conseils"]');
    t.ok(await p.isVisible("#t-conseils") && !(await p.isVisible("#t-regles")), "l'onglet 💡 Conseils remplace les règles");
    const c = await t.texte(p, "#t-conseils");
    t.contient(c, "L'essentiel", "les conseils commencent par l'essentiel");
    t.contient(c, "Comprendre pourquoi", "la section « Comprendre pourquoi ça ne marche pas »");
    t.ok((await p.$$("#t-conseils details.aide-section")).length >= 6, "les conseils ont leurs sections");

    // les mêmes cartes ailleurs : accueil et tutoriel
    await p.goto(t.url("index.html"));
    t.egal((await p.$$("#regles-accueil .regle-carte")).length, 6, "les 6 cartes à l'accueil");
    await p.goto(t.url("tuto.html?e=4#4"));
    await t.attendre(async () => (await p.$$("#etape .regle-carte")).length === 6, "les 6 cartes dans le tutoriel (mission 1)");
  },
};

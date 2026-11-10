// Sur téléphone (390 px de large) : AUCUN défilement horizontal, sur toutes les pages, toutes les étapes
// des tutoriels, tous les onglets de la page élève (bac à sable et salle), et les écrans de l'enseignant.
export default {
  nom: "telephone", ordre: 70, delai: 240,
  titre: "Téléphone 390 px : aucune page ne déborde (pages, étapes, onglets)",
  async lancer(t) {
    const ctx = await t.contexte({ largeur: 390, hauteur: 844, mobile: true });
    const p = await t.page(ctx, "téléphone");
    const verifier = async (chemin, ou = chemin) => { await p.goto(t.url(chemin)); await t.pause(450); await t.sansDebordement(p, ou); };
    let vus = 0;

    // l'accueil (vue élève, vue enseignant)
    await verifier("index.html", "accueil (élève)"); vus++;
    await p.click('[data-profil="prof"]'); await t.pause(200); await t.sansDebordement(p, "accueil (enseignant)"); vus++;
    await p.click('[data-profil="eleve"]');
    await p.click("#o-code"); await t.sansDebordement(p, "accueil (code de session)"); vus++;

    // le tutoriel débutant : toutes les étapes
    await p.goto(t.url("tuto.html?e=1#1"));
    const n = await p.$$eval(".nav-m-etapes button, #nav > button", (l) => l.length);
    t.ok(n >= 16, `le tutoriel a ses étapes (${n})`);
    for (let i = 1; i <= n; i++) { await verifier(`tuto.html?e=${i}#${i}`, `tutoriel, étape ${i}`); vus++; }

    // les tutoriels avancés : toutes les étapes des 3 niveaux
    await verifier("tuto-avance.html", "tutoriel avancé (niveaux)"); vus++;
    for (const niv of ["moyen", "expert", "equipe"]) {
      await p.goto(t.url(`tuto-avance.html?niveau=${niv}&e=1#1`));
      const m = await p.$$eval("#nav button", (l) => l.length);
      for (let i = 1; i <= m; i++) { await verifier(`tuto-avance.html?niveau=${niv}&e=${i}#${i}`, `tutoriel ${niv}, étape ${i}`); vus++; }
    }

    // la page élève, bac à sable : les 4 onglets, 🧩 ouvert, un test lancé
    await verifier("eleve.html?libre=1", "bac à sable"); vus++;
    await p.click("#regles-btn"); await t.pause(200); await t.sansDebordement(p, "🧩 Mes règles"); vus++;
    await p.click("#tester"); await t.attendre(() => p.$("#sb-vue canvas"), "le test se lance sur téléphone");
    for (const o of ["test", "regles", "conseils", "prog"]) { await p.click(`[data-t="${o}"]`); await t.pause(250); await t.sansDebordement(p, `bac à sable, onglet ${o}`); vus++; }

    // le Panthéon et son administration
    await verifier("pantheon.html", "Panthéon"); vus++;
    await verifier("pantheon.html?admin", "Panthéon (administration)"); vus++;

    // l'enseignant : accueil, salle en attente, manche en cours
    const prof = await t.page(ctx, "prof (téléphone)");
    const salle = await t.creerSalle(prof);
    await t.sansDebordement(prof, "enseignant : salle en attente"); vus++;
    await prof.goto(t.url("prof.html")); await t.pause(400);
    await t.sansDebordement(prof, "enseignant : accueil"); vus++;

    // la page élève dans une salle : les 6 onglets
    await t.rejoindre(p, salle, "Mobile");
    for (const o of ["prog", "test", "res", "cls", "regles", "conseils"]) { await p.click(`[data-t="${o}"]`); await t.pause(250); await t.sansDebordement(p, `élève en salle, onglet ${o}`); vus++; }
    t.log(vus, "écrans vérifiés à 390 px");
  },
};

// L'accueil : entrer dans la partie (deux façons), le parcours en missions et sa progression,
// les règles en 1 minute, la vue enseignant, le lien d'invitation, l'état de la base et les compteurs.
export default {
  nom: "accueil", ordre: 10, modes: ["demo", "base"], delai: 90,
  titre: "Accueil : entrer, missions, règles, vue enseignant, compteurs",
  async lancer(t) {
    const p = await t.nouvellePage({}, "accueil");
    await p.goto(t.url("index.html"));
    await t.attendre(async () => (await t.texte(p, "#mode")).length > 3, "l'état de la base s'affiche");
    if (t.mode === "demo") t.contient(await t.texte(p, "#mode"), "Mode démo", "accueil en mode démo");
    else await t.attendre(async () => (await t.texte(p, "#mode")).includes("Connecté"), "l'accueil se connecte à la base locale");

    // les deux façons d'entrer
    t.ok(await p.isVisible("#rejoindre"), "le formulaire « première fois » est visible au départ");
    t.ok(!(await p.isVisible("#reprendre")), "le formulaire « code de session » est caché au départ");
    await p.click("#o-code");
    t.ok(await p.isVisible("#reprendre") && !(await p.isVisible("#rejoindre")), "l'onglet « J'ai un code de session » montre seulement le champ du code");
    t.egal(await p.getAttribute("#o-code", "aria-selected"), "true", "l'onglet du code est sélectionné");
    await p.click("#o-classe");
    t.ok(await p.isVisible("#salle") && await p.isVisible("#pseudo"), "retour à la salle + pseudo");
    t.ok((await p.$$("#palette button")).length >= 10, "la palette de couleurs est là");
    t.egal(await p.innerHTML("#reprise-rapide"), "", "pas de « Reprendre ma partie » sur un navigateur neuf");

    // une salle qui n'existe pas
    await p.fill("#salle", "ZZQQ"); await p.fill("#pseudo", "Personne");
    await p.click("#rejoindre button[type=submit]");
    await t.attendre(async () => (await p.isVisible("#erreur")) && (await t.texte(p, "#erreur")).includes("introuvable"), "une salle inconnue est signalée");

    // le parcours : 4 missions + la partie
    const missions = await p.$$eval("#missions .mission", (l) => l.map((x) => x.className));
    t.egal(missions.length, 5, "4 missions + « la partie avec ta classe »");
    t.ok(missions[0].includes("ici"), "la mission 1 est « à faire maintenant »");
    t.contient(await t.texte(p, "#missions .mission:first-child"), "Commencer", "bouton Commencer sur la mission 1");
    t.contient(await p.getAttribute("#missions .mission:nth-child(3) a", "href"), "tuto.html?mission=3", "chaque mission ouvre le tutoriel au bon endroit");

    // les règles en 1 minute
    const cartes = await p.$$eval("#regles-accueil .regle-carte h3", (l) => l.map((x) => x.textContent));
    t.egal(cartes.length, 6, "6 cartes de règles");
    t.contient(await t.texte(p, '#regles-accueil [data-cle="pondre"]'), "6 d'énergie", "la carte « Pour pondre » donne l'énergie minimale");

    // la progression du tutoriel est lue sur ce navigateur
    await p.evaluate(() => localStorage.setItem("lagon:tuto2", JSON.stringify({ _exp: Date.now() + 3600e3, v: { faits: ["pilote", "regles", "capteurs"], missions: [1] } })));
    await p.reload();
    await t.attendre(async () => (await t.texte(p, "#missions .mission:first-child")).includes("Réussie"), "la mission 1 apparaît réussie");
    const m2 = await p.$eval("#missions .mission:nth-child(2)", (x) => ({ c: x.className, t: x.textContent }));
    t.ok(m2.c.includes("ici") && m2.t.includes("1 / 3"), "la mission 2 est en cours (1 / 3) et c'est la prochaine");
    t.ok(await p.$eval("#barre-parcours div", (d) => parseFloat(d.style.width) > 0), "la barre de progression avance");

    // la vue enseignant (mémorisée)
    await p.click('[data-profil="prof"]');
    t.ok(await p.isVisible("#vue-prof") && !(await p.isVisible("#vue-eleve")), "la vue enseignant remplace la vue élève");
    t.ok(await p.isVisible('a[href="prof.html"]'), "le bouton « Créer une salle » est là");
    await p.reload();
    t.ok(await p.isVisible("#vue-prof"), "le choix « enseignant » est gardé au rechargement");
    await p.click('[data-profil="eleve"]');

    // arrivé par le lien d'accès de l'enseignant : la vue élève, la salle déjà remplie
    const salle = await t.db(p, (db) => db.creerSalle().then((r) => r.code));
    const q = await t.nouvellePage({}, "invite");
    await q.goto(t.url("index.html?salle=" + salle.toLowerCase()));
    await t.attendre(() => q.isVisible("#invitation"), "l'invitation s'affiche");
    t.contient(await t.texte(q, "#invitation"), salle, "l'invitation nomme la salle");
    t.egal(await q.inputValue("#salle"), salle, "le code de la salle est déjà rempli");
    t.contient(await q.getAttribute("#missions .mission:first-child a", "href"), "salle=" + salle, "les missions ramènent ensuite à la salle");

    // les compteurs (avec la base seulement : parties jouées, joueurs)
    if (t.mode === "base") {
      await q.fill("#pseudo", "Compteur"); await q.click("#rejoindre button[type=submit]");
      await q.waitForURL(/eleve\.html/);
      await p.reload();
      await t.attendre(() => p.isVisible("#compteurs"), "les compteurs s'affichent avec la base");
      t.correspond(await t.texte(p, "#compteurs"), /joueur/, "le compteur de joueurs est là");
    } else t.ok(!(await p.isVisible("#compteurs")), "pas de compteurs en mode démo");
    t.log("salle", salle);
  },
};

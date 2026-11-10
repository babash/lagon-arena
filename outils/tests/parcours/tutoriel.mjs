// Le tutoriel débutant, en 4 missions : la navigation par mission, 🎮 Pilote ta tortue (refus, puis
// un nid), les règles + vrai/faux, Si… alors…, Complète le code, Mon premier if, une mission dans le lagon,
// Construis ta tortue avec 🧩 (sans taper) jusqu'au 🟢, puis « Emporter » : la tortue attend dans l'éditeur.
const PILOTE = ["aller_vers_algue", "aller_vers_algue", "manger", "aller_vers_plage", "aller_vers_plage", "aller_vers_plage", "aller_vers_plage", "aller_vers_plage", "pondre"];

export default {
  nom: "tutoriel", ordre: 20, delai: 150,
  titre: "Tutoriel débutant : 4 missions, pilote, si… alors, trous, 🧩, emporter",
  async lancer(t) {
    const ctx = await t.contexte();
    const p = await t.page(ctx, "tuto");
    // on recharge à chaque étape (le # seul ne recharge pas la page)
    const etape = async (n) => { await p.goto(t.url(`tuto.html?e=${n}#${n}`)); await t.attendre(() => p.$("#etape h2"), `l'étape ${n} s'affiche`); };

    // ---------- la navigation par mission ----------
    await p.goto(t.url("tuto.html?mission=1"));
    await t.attendre(async () => (await t.texte(p, "#progression")).includes("Mission 1"), "le tutoriel s'ouvre sur la mission 1");
    t.egal((await p.$$(".nav-mission")).length, 4, "la navigation est rangée en 4 missions");
    t.ok(await p.isVisible(".debut-mission"), "la 1re étape d'une mission annonce la mission");
    const nb = await p.$$eval(".nav-m-etapes button", (l) => l.length);
    t.ok(nb >= 16, `au moins 16 étapes (${nb})`);
    await p.goto(t.url("tuto.html?mission=3"));
    await t.attendre(async () => (await t.texte(p, "#etape h2")).includes("De la règle au code"), "?mission=3 ouvre « Complète le code »");
    t.contient(await t.texte(p, "#progression"), "Mission 3 · étape 1", "la progression situe l'étape dans sa mission");

    // ---------- 🎮 Pilote ta tortue (mission 1, étape 3) ----------
    await etape(3);
    t.contient(await t.texte(p, "#etape h2"), "Pilote ta tortue", "étape 3 = Pilote ta tortue");
    await p.click('.ordre[data-a="pondre"]');
    await t.attendre(async () => (await t.texte(p, "#journal")).includes("refusé"), "pondre loin de la plage est refusé");
    t.contient(await t.texte(p, "#journal"), "sur la plage", "le refus est expliqué (la plage)");
    await p.click("#annuler");
    await t.attendre(async () => (await t.texte(p, "#tours")).includes("Tour 0"), "↩ annule le dernier tour");
    for (const a of PILOTE) { await p.click(`.ordre[data-a="${a}"]`); await t.pause(380); }
    await t.attendre(async () => (await t.texte(p, "#fin")).includes("Un nid"), "le pilote réussit à pondre un nid");
    await t.attendre(async () => (await t.texte(p, "#vue .hud")).includes("🥚 1"), "le bandeau du lagon montre le nid (état après le dernier tour)");
    t.correspond(await t.texte(p, "#voit"), /Nids\s*1/, "« Ce que voit ta tortue » compte le nid");
    t.ok(await p.$eval('.ordre[data-a="manger"]', (b) => b.disabled), "après la réussite, les ordres sont désactivés");
    t.contient(await p.textContent("#suiv"), "Suivant", "le bouton Suivant");

    // ---------- 📜 Les règles (mission 1, étape 4) + vrai / faux ----------
    await etape(4);
    t.egal((await p.$$(".regle-carte")).length, 6, "les 6 cartes des règles");
    t.contient(await p.textContent("#suiv"), "Mission 2", "le dernier « Suivant » d'une mission annonce la mission suivante");
    for (const rep of ["Faux", "Vrai", "Faux", "Faux"]) {
      await p.click(`#vf .rep:text-is("${rep}")`);
      await p.click("#vf .expl button");
    }
    t.contient(await t.texte(p, "#vf h3"), "4 / 4", "le vrai / faux des règles est réussi");
    // l'énergie à essayer
    await p.click('[data-a="pondre"]'); await p.click('[data-a="pondre"]');
    t.contient(await t.texte(p, "#log"), "Refusé", "pondre sans assez d'énergie est refusé");
    await p.click("#suiv");
    await t.attendre(async () => (await t.texte(p, "#progression")).includes("Mission 2"), "« Suivant » passe à la mission 2");

    // ---------- Si… alors… (mission 2, étape 3) ----------
    await etape(7);
    t.contient(await t.texte(p, "#etape h2"), "Si", "étape 7 = Si… alors…");
    const reponses = [["requin_proche()", "fuir"], ["sur_plage() and est_la_nuit()", "pondre"], ["algue_ici()", "manger"]];
    const regles = await p.$$(".regle-fr");
    // une erreur d'abord : le bon ordre, mais la mauvaise question
    await regles[0].$eval(".rf-q", (s) => { s.value = "algue_ici()"; s.dispatchEvent(new Event("change")); });
    await regles[0].$eval(".rf-a", (s) => { s.value = "fuir"; s.dispatchEvent(new Event("change")); });
    t.contient(await regles[0].textContent(), "danger", "une mauvaise question est expliquée");
    t.contient(await regles[0].textContent(), "if algue_ici()", "la traduction Python s'affiche");
    for (let i = 0; i < 3; i++) {
      await regles[i].$eval(".rf-q", (s, v) => { s.value = v; s.dispatchEvent(new Event("change")); }, reponses[i][0]);
      await regles[i].$eval(".rf-a", (s, v) => { s.value = v; s.dispatchEvent(new Event("change")); }, reponses[i][1]);
    }
    t.contient(await t.texte(p, ".regles-fr .res"), "Tu sais écrire des règles", "les 3 règles en français sont réussies");

    // ---------- Complète le code (mission 3, étape 1) ----------
    await etape(8);
    await p.selectOption('select.trou[data-id="q"]', "requin_proche()"); await p.selectOption('select.trou[data-id="a"]', "manger()");
    await p.click(".trous-exo .verif");
    t.contient(await t.texte(p, ".trous-exo .res"), "Presque", "une mauvaise question est refusée");
    await p.selectOption('select.trou[data-id="q"]', "algue_ici()");
    await p.click(".trous-exo .verif");
    t.contient(await t.texte(p, ".trous-exo .res"), "Bravo", "le code à trous est réussi");

    // ---------- Mon premier if (mission 3, étape 2) : au clavier ----------
    await etape(9);
    await p.fill(".exo .ed textarea", "def tour():\n    if requin_proche():\n        manger()\n");
    await p.click(".exo .verif");
    t.contient(await t.texte(p, ".exo .res"), "Presque", "un mauvais ordre est refusé");
    t.contient(await t.texte(p, ".exo .res"), "ligne 3", "l'explication montre la ligne en cause");
    await p.fill(".exo .ed textarea", "def tour():\n    if requin_proche():\n        fuir()\n");
    await p.click(".exo .verif");
    t.contient(await t.texte(p, ".exo .res"), "Bravo", "le premier if est réussi");

    // ---------- une mission dans le lagon : « Elle mange au lieu de pondre » (mission 4) ----------
    const nMission = await p.evaluate(() => [...document.querySelectorAll(".nav-m-etapes button")].findIndex((b) => /mange au lieu/i.test(b.title)) + 1);
    t.ok(nMission > 0, "la mission « Elle mange au lieu de pondre » est dans le tutoriel");
    await etape(nMission);
    await p.click("#tester");
    await t.attendre(async () => (await t.texte(p, "#res")).includes("Pas encore"), "la tortue de départ de la mission échoue", { delai: 15000 });
    t.contient(await t.texte(p, "#res"), "🔍", "l'échec est expliqué par les tests de la tortue");
    await p.fill("#ed textarea", "def tour():\n    if sur_plage() and est_la_nuit():\n        pondre()\n    elif est_la_nuit():\n        aller_vers_plage()\n    elif algue_ici():\n        manger()\n    else:\n        aller_vers_algue()\n");
    await p.click("#tester");
    await t.attendre(async () => (await t.texte(p, "#res")).includes("Réussi"), "la tortue réparée réussit la mission", { delai: 15000 });

    // ---------- 🐢 Construis ta tortue, avec 🧩 (sans taper) ----------
    const nConstruis = await p.evaluate(() => [...document.querySelectorAll(".nav-m-etapes button")].findIndex((b) => /Construis/.test(b.title)) + 1);
    await etape(nConstruis);
    t.contient(await t.texte(p, ".bilan-verdict"), "jamais", "la tortue de départ ne pondra jamais (🔴)");
    await p.click("#mr-btn");
    const ajouter = async (q, a, rang) => {
      await p.selectOption('.mr-ajout select[name="q"]', { index: q });
      await p.selectOption('.mr-ajout select[name="a"]', a);
      await p.selectOption('.mr-ajout select[name="rang"]', String(rang));
      await p.click('.mr-ajout button[type="submit"]'); await t.pause(350);
    };
    await ajouter(0, "fuir()", 0); await ajouter(1, "pondre()", 1); await ajouter(3, "aller_vers_plage()", 2);
    await t.attendre(async () => (await t.texte(p, ".bilan-verdict")).includes("sait pondre"), "avec 3 règles ajoutées sans taper, la tortue sait pondre (🟢)");
    t.egal((await p.$$(".mr-liste li")).length, 5, "🧩 montre 4 règles + « Sinon »");
    await p.click("#emporter");
    t.contient(await t.texte(p, "#fin"), "C'est fait", "la tortue est emportée");
    const code = await p.inputValue("#ed textarea");

    // elle attend dans l'éditeur (bac à sable), et l'accueil montre les missions avancées
    const e = await t.page(ctx, "eleve");
    await e.goto(t.url("eleve.html?libre=1"));
    await t.attendre(async () => (await e.inputValue("#ed textarea")) === code, "la tortue du tutoriel est chargée dans l'éditeur");
    const a = await t.page(ctx, "accueil");
    await a.goto(t.url("index.html"));
    await t.attendre(async () => (await a.$$eval("#missions .m-finie", (l) => l.length)) >= 1, "l'accueil montre au moins une mission réussie");
    const etats = await a.$$eval("#missions .mission-etat", (l) => l.map((x) => x.textContent));
    t.log("missions :", etats.join(" | "));
  },
};

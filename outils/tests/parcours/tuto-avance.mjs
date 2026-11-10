// Les tutoriels avancés (🥈 intermédiaire, 🥇 expert, 👥 équipe) : la page des niveaux, toutes les étapes
// sans erreur, les exercices réussis avec une bonne solution, le quiz expert, la progression des niveaux.
const SOL = {
  "🦈 La zone dangereuse": "def tour():\n    if requins_autour() >= 2:\n        aller_vers_plage()\n    elif requins_pres_algue() >= 1:\n        se_cacher()\n    else:\n        aller_vers_algue()\n",
  "🍽️ Le bon repas": "def tour():\n    if requins_pres_algue() >= 1:\n        se_cacher()\n    elif algue_ici():\n        manger()\n    elif portions_algue() <= 1:\n        aller_vers_algue_libre()\n    else:\n        aller_vers_algue()\n",
  "🌅 Dîner près de la plage": "def tour():\n    if heure() >= 15 and algue_pres_plage():\n        aller_vers_algue()\n    elif heure() >= 15:\n        aller_vers_plage()\n    else:\n        aller_vers_algue()\n",
  "🤝 S'entraider": "def tour():\n    if equipiere_fatiguee() and energie() >= 8:\n        donner()\n    elif requin_derriere_adversaire():\n        pousser()\n    else:\n        aller_vers_algue_libre()\n",
  "🎯 Plusieurs équipes : la rivale": "def tour():\n    if rivale_a_cote() and requin_derriere_adversaire():\n        pousser()\n    elif not equipe_en_tete() and equipiere_fatiguee():\n        donner()\n    else:\n        aller_vers_algue()\n",
};

export default {
  nom: "tuto-avance", ordre: 21, delai: 150,
  titre: "Tutoriels avancés : 3 niveaux, toutes les étapes, exercices",
  async lancer(t) {
    const p = await t.nouvellePage({ largeur: 1400, hauteur: 950 }, "avancé");
    await p.goto(t.url("tuto-avance.html"));
    await t.attendre(async () => (await p.$$(".niveau")).length >= 3, "la page montre les 3 niveaux");
    const reussis = [];
    for (const niv of ["moyen", "expert", "equipe"]) {
      await p.goto(t.url(`tuto-avance.html?niveau=${niv}&r=1#1`));
      await t.attendre(() => p.$("#etape h2"), `le niveau ${niv} s'ouvre`);
      const n = await p.$$eval("#nav button", (l) => l.length);
      t.ok(n >= 4, `${niv} : au moins 4 étapes (${n})`);
      for (let i = 0; i < n; i++) {
        const titre = (await t.texte(p, "#etape h2"));
        t.ok(titre.length > 2, `${niv} : l'étape ${i + 1} a un titre`);
        if (SOL[titre] && await p.$(".exo .ed textarea")) {
          await p.fill(".exo .ed textarea", SOL[titre]); await p.click(".exo .verif");
          t.contient(await t.texte(p, ".exo .res"), "Bravo", `${niv} : l'exercice « ${titre} » est réussi avec une bonne solution`);
          reussis.push(titre);
        }
        if (niv === "expert" && i === 1 && await p.$("#q .rep")) {   // quiz : True, False, True, False
          for (const rep of ["True", "False", "True", "False"]) { await p.click(`#q .rep:text-is("${rep}")`); await p.click("#q .expl button"); }
          t.contient(await t.texte(p, "#q h3"), "4 / 4", "le quiz expert est réussi");
        }
        if (i < n - 1) { await p.click("#suiv"); await t.pause(250); }
      }
      t.log(niv, ":", n, "étapes", await t.texte(p, "#progression"));
    }
    t.ok(reussis.length >= 4, `au moins 4 exercices avancés vérifiés (${reussis.length})`);
    await p.goto(t.url("tuto-avance.html"));
    const jauges = await p.$$eval(".niveau .jauge span", (l) => l.map((x) => x.textContent));
    t.ok(jauges.some((j) => !/^0\s*\//.test(j.trim())), `la progression des niveaux avance (${jauges.join(" ")})`);
  },
};

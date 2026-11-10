// 🧩 Mes règles (page élève) : la liste des règles lue dans le code, ajouter une règle au bon rang
// (y compris une question écrite à la main), monter / descendre / supprimer, toujours UNE seule chaîne ;
// l'alerte « deux blocs » ; le tout reste un programme Python valide (🟢 à la fin).
import { TORTUES } from "../lib.mjs";

export default {
  nom: "mesregles", ordre: 31, delai: 60,
  titre: "🧩 Mes règles : ajouter au bon rang, réordonner, supprimer, deux blocs",
  async lancer(t) {
    const p = await t.nouvellePage({ largeur: 1300 }, "mesregles");
    await p.goto(t.url("eleve.html?libre=1"));
    await t.attendre(() => p.$(".bilan-verdict"), "la page élève est prête");
    t.ok(!(await p.isVisible("#mes-regles")), "le panneau est fermé au départ");
    await p.click("#regles-btn");
    await t.attendre(() => p.$(".mr-liste"), "🧩 ouvre la liste des règles");
    const lignes = async () => p.$$eval(".mr-liste li", (l) => l.map((x) => x.textContent.replace(/\s+/g, " ").trim()));
    let l = await lignes();
    t.egal(l.length, 2, "la tortue de départ : 1 règle + « Sinon »");
    t.contient(l[0], "algue_ici()", "la règle 1 est « des algues → manger »");
    t.contient(l[1], "Sinon", "« Sinon » est en dernier");

    const ajouter = async (q, a, rang) => {
      await p.selectOption('.mr-ajout select[name="q"]', typeof q === "number" ? { index: q } : q);
      await p.selectOption('.mr-ajout select[name="a"]', a);
      await p.selectOption('.mr-ajout select[name="rang"]', String(rang));
      await p.click('.mr-ajout button[type="submit"]'); await t.pause(450);
    };
    await ajouter("requin_proche()", "fuir()", 0);                       // tout en haut
    await ajouter(1, "pondre()", 1);                                    // après la règle 1
    await ajouter(3, "aller_vers_plage()", 2);                          // après la règle 2
    let code = await t.lireCode(p);
    t.correspond(code, /\n    if requin_proche\(\):\n        fuir\(\)\n    elif sur_plage\(\) and est_la_nuit\(\) and energie\(\) >= 6:\n        pondre\(\)\n    elif est_la_nuit\(\) and energie\(\) >= 6:\n        aller_vers_plage\(\)\n    elif algue_ici\(\):/, "les règles sont insérées au bon rang, en une seule chaîne if / elif");
    t.egal((code.match(/^    if /gm) || []).length, 1, "un seul if en tête de chaîne");
    t.egal((code.match(/^    else:/gm) || []).length, 1, "un seul else, en dernier");
    await t.attendre(async () => (await t.texte(p, ".bilan-verdict")).includes("sait pondre"), "la tortue construite avec 🧩 sait pondre");
    l = await lignes();
    t.egal(l.length, 5, "4 règles + « Sinon »");

    // monter la règle 4 (« des algues ») au rang 3
    await p.click('[data-mr="monter"][data-i="3"]'); await t.pause(450);
    code = await t.lireCode(p);
    t.ok(code.indexOf("elif algue_ici():") < code.indexOf("elif est_la_nuit() and"), "⬆️ fait monter la règle dans le code");
    t.ok(await p.$eval('[data-mr="monter"][data-i="0"]', (b) => b.disabled), "on ne peut pas monter la 1re règle");
    // la redescendre
    await p.click('[data-mr="descendre"][data-i="2"]'); await t.pause(450);
    code = await t.lireCode(p);
    t.ok(code.indexOf("elif est_la_nuit() and") < code.indexOf("elif algue_ici():"), "⬇️ la redescend");

    // une question écrite à la main
    await p.selectOption('.mr-ajout select[name="q"]', "autre");
    t.ok(await p.isVisible('.mr-ajout input[name="autre"]'), "« ✏️ autre question… » ouvre un champ");
    await p.fill('.mr-ajout input[name="autre"]', "heure() >= 17 and energie() >= 8");
    await p.selectOption('.mr-ajout select[name="a"]', "aller_vers_plage()");
    await p.selectOption('.mr-ajout select[name="rang"]', "3");
    await p.click('.mr-ajout button[type="submit"]'); await t.pause(450);
    t.contient(await t.lireCode(p), "    elif heure() >= 17 and energie() >= 8:\n        aller_vers_plage()", "la question écrite à la main est ajoutée");

    // supprimer la 1re règle : la suivante devient « if »
    const avant = (await lignes()).length;
    await p.click('[data-mr="suppr"][data-i="0"]'); await t.pause(450);
    t.egal((await lignes()).length, avant - 1, "🗑️ supprime une règle");
    code = await t.lireCode(p);
    t.ok(!code.includes("requin_proche"), "la règle supprimée a disparu du code");
    t.correspond(code, /\n    if sur_plage\(\) and est_la_nuit\(\)/, "la nouvelle 1re règle commence par if");
    await t.attendre(async () => !(await t.texte(p, "#statut")).includes("🐞"), "le code reste valide");

    // deux blocs à la suite : 🧩 refuse et explique
    await t.ecrireCode(p, TORTUES.deuxBlocs);
    await t.attendre(async () => (await t.texte(p, "#mes-regles")).includes("deux blocs"), "deux blocs if à la suite : 🧩 explique d'en faire une seule chaîne");
    t.ok(!(await p.$(".mr-ajout")), "pas d'ajout possible tant qu'il y a deux blocs");
    await p.click("#regles-btn");
    t.ok(!(await p.isVisible("#mes-regles")), "🧩 se referme");
  },
};

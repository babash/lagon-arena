// Le bac à sable (eleve.html?libre=1) : les onglets, l'aide-mémoire, le bilan 🔴 → 🟢, ▶ Tester qui bascule
// vers 🧪 Tester (lagon + pensée), « Rejouer ce lagon » qui y reste, le clic sur une ligne de la pensée qui
// ramène à l'éditeur, l'estimation, la nouveauté, le coup de pouce, « côte à côte », le mode avancé.
import { TORTUES } from "../lib.mjs";

export default {
  nom: "bac", ordre: 30, delai: 120,
  titre: "Bac à sable : onglets, tester, pensée → éditeur, estimation, côte à côte",
  async lancer(t) {
    const p = await t.nouvellePage({ largeur: 1400, hauteur: 950 }, "bac");
    await p.goto(t.url("eleve.html?libre=1"));
    await t.attendre(() => p.$(".bilan-verdict"), "le bilan de la tortue s'affiche");
    const onglets = await p.$$eval("#tabs .tab", (l) => l.filter((b) => b.offsetParent).map((b) => b.dataset.t));
    t.egal(onglets.join(" "), "prog test regles conseils", "bac à sable seul : Programmer, Tester, Règles, Conseils (sans Résultats ni Classement)");
    t.ok(await p.isVisible("#t-prog") && !(await p.isVisible("#t-test")), "on commence sur ✍️ Programmer");

    // l'aide-mémoire, toujours le même ; son lien ouvre 📜 Règles
    const am = await t.texte(p, "#rappel");
    t.contient(am, "1 action par tour", "l'aide-mémoire rappelle « une action par tour »");
    t.contient(am, "−1 nid", "l'aide-mémoire rappelle le requin");
    await p.click("#rappel .am-lien");
    t.ok(await p.isVisible("#t-regles"), "« 📜 Toutes les règles » ouvre l'onglet des règles");
    await p.click('[data-t="prog"]');

    // la tortue de départ ne pond pas ; une bonne tortue : 🟢
    t.contient(await t.lireCode(p), "ne pond jamais", "l'éditeur commence avec la tortue de départ commentée");
    t.contient(await t.texte(p, ".bilan-verdict"), "jamais", "la tortue de départ est 🔴");
    await t.ecrireCode(p, TORTUES.bonne);
    await t.attendre(async () => (await t.texte(p, ".bilan-verdict")).includes("sait pondre"), "une bonne tortue est 🟢");
    // une erreur de syntaxe : signalée, et ▶ Tester reste sur Programmer
    await t.ecrireCode(p, "def tour():\n    if algue_ici()\n        manger()\n");
    await t.attendre(async () => (await t.texte(p, "#statut")).includes("Ligne 2"), "une erreur de syntaxe montre sa ligne");
    await p.click("#tester");
    t.ok(await p.isVisible("#t-prog"), "avec une erreur, ▶ Tester reste sur l'éditeur");
    await t.ecrireCode(p, TORTUES.bonne);

    // ▶ Tester : bascule vers 🧪 Tester, lagon + pensée + bilan + rapport
    await p.click("#tester");
    await t.attendre(() => p.isVisible("#t-test"), "▶ Tester ouvre l'onglet 🧪 Tester");
    t.ok(!(await p.isVisible("#t-prog")), "l'éditeur est caché pendant le test");
    await t.attendre(() => p.$("#sb-vue canvas"), "le lagon du test est dessiné");
    t.ok(await p.$("#sb-vue .pensee"), "« Dans la tête de ta tortue » est là");
    t.contient(await t.texte(p, "#sb-res"), "Résultat", "le résultat du test et son rapport");
    t.ok(await p.$("#sb-bilan .bilan"), "le bilan de santé est à côté du match");
    t.ok(!(await p.$eval("#autre", (b) => b.disabled)), "« Rejouer ce lagon » est disponible");
    await p.click("#autre");
    t.ok(await p.isVisible("#t-test"), "« Rejouer ce lagon » reste sur 🧪 Tester");

    // un clic sur une ligne de la pensée : retour à l'éditeur, sur cette ligne
    await p.click("#sb-vue .pensee .l >> nth=5");
    await t.attendre(() => p.isVisible("#t-prog"), "un clic sur une ligne de la pensée ramène à l'éditeur");
    t.ok(await p.$("#ed .ln-diag"), "la ligne cliquée est marquée dans l'éditeur");

    // la nouveauté du bac à sable
    await p.click('[data-t="test"]');
    await p.selectOption("#sel-twist", "plastique");
    await t.attendre(async () => (await t.texte(p, "#sb-twist")).includes("plastique"), "la nouveauté choisie s'affiche");

    // 📊 l'estimation sur 10 parties
    await p.selectOption("#nb-estim", "10");
    await p.click("#estimer");
    await t.attendre(() => p.$(".estim-moy"), "l'estimation donne une moyenne", { delai: 30000 });
    t.correspond(await t.texte(p, ".estim-moy"), /œufs? par partie/, "la moyenne est en œufs par partie");
    t.ok((await p.$$("#estim-res .histo > div")).length >= 1, "l'histogramme des parties est là");

    // 💡 coup de pouce
    await p.click('[data-t="prog"]');
    await p.click("#pouce-btn");
    t.ok((await t.texte(p, "#pouce")).length > 20, "le coup de pouce donne une idée");

    // 🪟 côte à côte (grand écran) : le code et le test ensemble
    await p.check("#cote");
    await t.attendre(async () => (await p.isVisible("#t-prog")) && (await p.isVisible("#t-test")), "côte à côte : Programmer et Tester sont affichés ensemble");
    t.ok(await p.$eval("#espace", (e) => e.classList.contains("duo")), "la mise en page côte à côte est active");
    await p.uncheck("#cote");
    await t.attendre(async () => !(await p.isVisible("#t-test")), "sans côte à côte, un seul onglet");

    // 🚀 primitives avancées : la toolbox et les règles changent
    await p.click(".avance-sw .glissiere");
    await p.click('[data-t="regles"]');
    await t.attendre(async () => (await t.texte(p, "#t-regles")).includes("distance_requin"), "en mode avancé, les règles listent les primitives avancées");
    await p.click('[data-t="prog"]');
    await p.click(".avance-sw .glissiere");

    // ↺ tortue de départ
    await p.click("#reinit");
    await t.attendre(async () => (await t.lireCode(p)).includes("ne pond jamais"), "↺ remet la tortue de départ");
  },
};

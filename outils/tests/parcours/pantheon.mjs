// Le Panthéon : une copie de tortue d'entraînement est refusée ; une vraie tortue passe le banc d'essai et
// entre (hors classe, depuis le bac à sable, sans établissement) ; le même programme proposé par un autre est
// refusé ; la page du Panthéon (pseudo, établissement, score et date, jamais la classe ; filtre par
// établissement, « ma tortue », retrouver avec son code) ; une tortue proposée depuis une salle est rattachée
// à sa classe et prend l'établissement de la salle ; l'administration (vérifier, retirer).
import { TORTUES } from "../lib.mjs";

export default {
  nom: "pantheon", ordre: 50, modes: ["demo", "base"], delai: 180,
  titre: "Panthéon : banc d'essai, copies, classe, page publique, administration",
  async lancer(t) {
    const ctx1 = await t.contexte({ largeur: 1300 });
    const el = await t.page(ctx1, "eleve");
    await el.goto(t.url("eleve.html?libre=1"));
    await t.attendre(() => el.$(".bilan-verdict"), "le bac à sable est prêt");
    // avec une vraie base, on retire d'abord les tortues laissées par un passage précédent de ce test
    // (sinon « même programme déjà au Panthéon ») : c'est l'administrateur qui retire, avec LAGON_ADMIN
    if (t.mode === "base") {
      const n = await t.db(el, async (db, secret) => {
        const l = await db.pantheonAdmin(secret);
        const restes = l.filter((x) => ["Maki_Rapide", "Tricheur", "Copieur", "Moya"].includes(x.pseudo));
        for (const x of restes) await db.pantheonRetirer(secret, x.id);
        return restes.length;
      }, process.env.LAGON_ADMIN || "secret-admin-123");
      t.ok(n >= 0, `restes d'un passage précédent retirés (${n})`);
    }

    // 1. une copie de la tortue d'entraînement « Bulle » : refusée
    await t.ecrireCode(el, "def tour():\n    # ma super tortue\n    if algue_ici():\n        manger()\n    else:\n        aller_vers_algue()\n");
    await el.click('[data-t="test"]');
    await el.click("#pantheon");
    await t.attendre(() => el.$(".overlay"), "une fenêtre répond à la proposition");
    t.ok(!(await el.$("#pt-form")), "une copie de tortue d'entraînement n'a pas de formulaire d'inscription");
    t.correspond(await t.texte(el, ".overlay"), /tortue de départ|entraînement|copie/i, "la fenêtre explique que c'est une copie");
    await t.fermerFenetre(el);

    // 2. une vraie tortue : banc d'essai, puis inscription (hors classe)
    await t.ecrireCode(el, TORTUES.experte);
    await el.click('[data-t="test"]');
    await el.click("#pantheon");
    await t.attendre(() => el.$("#pt-form"), "le banc d'essai (20 parties) se termine et le formulaire s'ouvre", { delai: 40000 });
    await el.fill("#pt-pseudo", "Maki_Rapide");
    t.ok(!(await el.$("#pt-lycee")), "hors classe, l'élève ne tape pas d'établissement (ce n'est pas une donnée de l'élève)");
    await el.click("#pt-form button[type=submit]");
    const codeP = await t.attendre(async () => { const c = await el.$(".overlay .code-perso"); return c && t.propre(await c.textContent()); }, "la tortue entre au Panthéon et l'élève reçoit son code Panthéon");
    await t.fermerFenetre(el);

    // 3. le même programme, par quelqu'un d'autre : refusé
    const el2 = await t.page(await t.autreOrdinateur(el, { largeur: 1300 }), "eleve2");
    await el2.goto(t.url("eleve.html?libre=1"));
    await t.attendre(() => el2.$(".bilan-verdict"), "le 2e bac à sable est prêt");
    await t.ecrireCode(el2, TORTUES.experte + "# copie\n");
    await el2.click('[data-t="test"]');
    await el2.click("#pantheon");
    await t.attendre(() => el2.$("#pt-form"), "le 2e banc d'essai se termine", { delai: 40000 });
    await el2.fill("#pt-pseudo", "Copieur");
    await el2.click("#pt-form button[type=submit]");
    await t.attendre(async () => (await t.texte(el2, "#pt-erreur").catch(() => "")).includes("déjà au Panthéon"), "le même programme est refusé");
    await t.fermerFenetre(el2);
    // une moyenne inventée, envoyée directement : elle entre, mais restera à vérifier
    await t.db(el, (db) => db.proposerPantheon({ pseudo: "Tricheur", code: "def tour():\n    if sur_plage():\n        pondre()\n    else:\n        aller_vers_plage()\n", moyenne: 9.99, banc: 1, jeton: "pantheon-ZZZZ9999-lagon" }));

    // 4. une tortue proposée depuis une salle (un autre ordinateur, donc un autre code Panthéon) : rattachée à la classe
    const ctx3 = await t.autreOrdinateur(el, { largeur: 1300 });
    const cl = await t.page(ctx3, "Moya");
    await cl.goto(t.url("index.html"));
    const salle = await t.db(cl, (db) => db.creerSalle("Lycée de Chirongui").then((r) => r.code));
    await t.rejoindre(cl, salle, "Moya");
    await t.ecrireCode(cl, TORTUES.experte.replace("heure() >= 17", "heure() >= 16"));   // (une autre tortue que celle de Maki)
    await cl.click('[data-t="test"]');
    await cl.click("#pantheon");
    await t.attendre(() => cl.$("#pt-form"), "le banc d'essai de la classe se termine", { delai: 40000 });
    t.contient(await t.texte(cl, ".pt-classe"), salle, "depuis une salle, la tortue est rattachée à la classe");
    t.contient(await t.texte(cl, ".pt-classe"), "Lycée de Chirongui", "depuis une salle, l'établissement de la salle est repris");
    await cl.click("#pt-form button[type=submit]");
    await t.attendre(() => cl.$(".overlay .code-perso"), "la tortue de la classe entre au Panthéon");
    await t.fermerFenetre(cl);

    // 5. la page du Panthéon
    const p = await t.page(ctx3, "pantheon");
    await p.goto(t.url("pantheon.html"));
    await t.attendre(async () => (await t.texte(p, "#classement")).includes("Maki_Rapide") || (t.log("classement :", (await t.texte(p, "#classement")).slice(0, 300)), false), "Maki_Rapide est au classement", { delai: 15000, pas: 3000 });
    const lignes = await p.$$eval("#classement tr", (l) => l.map((r) => r.innerText.replace(/\s+/g, " ").trim()));
    t.ok(lignes.some((l) => l.includes("Maki_Rapide") && l.includes("entrée le") && !l.includes("Lycée")), "depuis le bac à sable : le pseudo et la date, sans établissement");
    t.ok(lignes.some((l) => l.includes("Moya") && l.includes("Lycée de Chirongui") && l.includes("entrée le")), "depuis la salle : le pseudo, l'établissement de la salle et la date");
    t.ok(!lignes.some((l) => l.includes(salle) || /classe/.test(l)), "la classe (le code de la salle) n'est jamais affichée");
    t.contient(await t.texte(p, "#ma-tortue"), "Moya", "« ma tortue » montre la dernière tortue proposée sur ce navigateur");
    await p.click('#classement a[data-lycee="Lycée de Chirongui"]');
    await t.attendre(async () => (await t.texte(p, "#resume")).includes("dans cet établissement") && decodeURIComponent(p.url()).includes("lycee=Lycée de Chirongui"), "le filtre par établissement");
    t.ok(!(await t.texte(p, "#classement")).includes("Maki_Rapide"), "le filtre n'affiche que cet établissement");
    // retrouver sa tortue depuis un autre ordinateur, avec son code Panthéon
    const p2 = await t.page(await t.autreOrdinateur(p), "pantheon2");
    await p2.goto(t.url("pantheon.html"));
    await p2.fill("#code-pt", codeP.toLowerCase().replace("-", " "));
    await p2.click("#retrouver button");
    await t.attendre(async () => (await t.texte(p2, "#ma-tortue")).includes("Maki_Rapide"), "le code Panthéon retrouve la tortue sur un autre ordinateur");

    // 6. l'administration (en démo, n'importe quel mot de passe ; avec la base : LAGON_ADMIN)
    const a = await t.page(ctx3, "admin");
    await a.goto(t.url("pantheon.html?admin"));
    if (t.mode === "base") {
      await a.fill("#adm-secret", "faux-mot-de-passe"); await a.click("#adm-login button"); await t.pause(800);
      t.ok(await a.isVisible("#adm-login"), "un mauvais mot de passe administrateur est refusé");
    }
    await a.fill("#adm-secret", process.env.LAGON_ADMIN || "secret-admin-123");
    await a.click("#adm-login button");
    await t.attendre(async () => (await t.texte(a, "#adm-liste")).includes("Tricheur"), "l'administrateur voit toutes les tortues");
    await a.click("#adm-verif");
    await t.attendre(async () => (await t.texte(a, "#adm-etat")).length > 3, "la vérification des moyennes avance", { delai: 60000 });
    const r = a.locator("#adm-liste tr", { hasText: "Tricheur" }).locator("button");
    await r.click(); await r.click();
    await t.attendre(async () => !(await t.texte(a, "#adm-liste")).includes("Tricheur"), "le tricheur est retiré du Panthéon");
  },
};

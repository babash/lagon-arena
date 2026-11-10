// Une séance en classe : l'enseignant crée la salle, 3 élèves la rejoignent (un pseudo déjà pris est refusé),
// manche 1 (envois, état sur le bouton, compteur d'envois), brawl, résultats chez les élèves, classement,
// « Et si… ? », manche 2, puis fin de séance.
import { TORTUES } from "../lib.mjs";

export default {
  nom: "seance", ordre: 40, modes: ["demo", "base"], delai: 180,
  titre: "Séance : salle, 3 élèves, 2 manches, brawl, résultats, Et si, fin",
  async lancer(t) {
    const ctx = await t.contexte({ largeur: 1450, hauteur: 950 });   // (en démo, la « base » est partagée par les onglets du même navigateur)
    const prof = await t.page(ctx, "prof");
    const salle = await t.creerSalle(prof);
    t.log("salle", salle);
    const el = {};
    for (const ps of ["Lina", "Moussa", "Zaina"]) el[ps] = await t.rejoindre(await t.page(ctx, ps), salle, ps);
    t.contient(await t.texte(el.Lina, "#info"), "Lina", "le pseudo s'affiche en haut de la page élève");
    t.ok(!(await el.Lina.$eval("#envoyer", (b) => b.disabled === false)), "avant la manche, on ne peut pas envoyer");
    t.contient(await t.texte(el.Lina, "#envoi"), "pas encore commencé", "l'élève sait que la manche n'a pas commencé");

    // un autre ordinateur prend « Lina » : refusé, avec le chemin du code de session
    const autre = await t.page(await t.autreOrdinateur(prof), "doublon");
    await autre.goto(t.url("index.html"));
    await autre.fill("#salle", salle); await autre.fill("#pseudo", "Lina");
    await autre.click("#rejoindre button[type=submit]");
    await t.attendre(async () => (await t.texte(autre, "#erreur")).includes("déjà pris"), "un pseudo déjà pris est refusé");
    await autre.click("#vers-code");
    t.ok(await autre.isVisible("#reprendre"), "le message propose d'entrer avec le code de session");

    // l'enseignant voit les 3 élèves
    await t.attendre(async () => { const l = await t.texte(prof, "#liste"); return ["Lina", "Moussa", "Zaina"].every((x) => l.includes(x)); }, "l'enseignant voit les 3 élèves dans la liste", { delai: 12000 });

    // ---------- manche 1 ----------
    await t.lancerManche(prof);
    await t.envoyer(el.Lina, TORTUES.bonne);
    await t.envoyer(el.Moussa, TORTUES.moyenne);
    await t.ecrireCode(el.Moussa, TORTUES.moyenne + "# modifiée\n");
    await t.attendre(async () => (await el.Moussa.textContent("#envoyer")).includes("Modifiée"), "une tortue modifiée après l'envoi est signalée sur le bouton");
    t.contient(await t.texte(el.Moussa, "#envoi"), "ancienne version", "l'élève est prévenu que l'ancienne version jouera");
    await t.attendre(async () => (await t.texte(prof, "#nb-env")) === "2", "l'enseignant voit 2 tortues envoyées", { delai: 12000 });
    await t.brawl(prof);

    // chez les élèves : les résultats s'ouvrent seuls
    for (const ps of ["Lina", "Moussa"]) {
      await t.attendre(() => el[ps].isVisible("#t-res"), `${ps} voit l'onglet Résultats`, { delai: 15000 });
      await t.attendre(async () => (await t.texte(el[ps], "#t-res")).includes("Classement du match"), `${ps} a ses résultats de la manche 1`, { delai: 15000 });
    }
    t.ok(await el.Lina.$("#t-res canvas"), "le match se revoit chez l'élève");
    await el.Lina.click('[data-t="cls"]');
    t.contient(await t.texte(el.Lina, "#t-cls"), "Moussa", "le classement de la séance liste les élèves");
    const scores = await t.db(prof, (db, c) => db.scores(c), salle);
    const humains = scores.filter((s) => s.manche === 1 && !String(s.pseudo).startsWith("Bot-"));
    t.ok(humains.length >= 2 && humains.every((s) => s.points >= 1), `les élèves de la manche 1 ont des points (${humains.map((s) => s.pseudo + ":" + s.points).join(" ")})`);
    t.ok(scores.some((s) => String(s.pseudo).startsWith("Bot-")), "des tortues d'entraînement complètent le lagon");

    // Et si… ? (Moussa rejoue le même match avec un meilleur code)
    await el.Moussa.click('[data-t="prog"]');
    await t.ecrireCode(el.Moussa, TORTUES.bonne);
    await t.attendre(() => el.Moussa.isVisible("#rejouer"), "« 🔁 Rejouer le dernier brawl » est proposé");
    await el.Moussa.click("#rejouer");
    await t.attendre(async () => (await t.texte(el.Moussa, "#etsi-res")).length > 20, "« Et si… ? » compare l'ancien et le nouveau code");

    // ---------- manche 2 (rematch) ----------
    await t.lancerManche(prof);
    await t.attendre(async () => (await t.texte(el.Zaina, "#bandeau")).includes("Manche 2"), "les élèves voient la manche 2 commencer", { delai: 12000 });
    await t.envoyer(el.Zaina, TORTUES.moyenne);
    await t.brawl(prof);
    await t.attendre(async () => (await t.texte(el.Zaina, "#t-res")).includes("Manche 2"), "Zaina voit ses résultats de la manche 2", { delai: 15000 });

    // ---------- fin de séance ----------
    await prof.click("#actions .btn.sombre");
    await t.attendre(() => prof.$("#nouvelle"), "l'écran de fin de séance (podium) s'affiche", { delai: 15000 });
    await t.attendre(async () => (await t.texte(el.Lina, "#bandeau")).includes("Fin de la séance"), "les élèves voient la fin de la séance", { delai: 12000 });
    await t.capture(prof, "seance-fin", { fullPage: true });
  },
};

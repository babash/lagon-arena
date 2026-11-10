// Ce que voit l'enseignant (chantiers 3 et 4) : l'état de chaque tortue pendant la programmation
// (🟢 🟠 🔴 🐞 ⏳), le compteur « N tortues sur M pondent », la fiche d'un élève (avertissement « visible
// au tableau », 🙈 Masquer, Échap), le résumé des causes après le brawl, la fiche après le brawl,
// le Panthéon automatique (au tableau, puis chez l'élève, avec son code Panthéon), le CSV avec les codes.
import { TORTUES } from "../lib.mjs";

// (la liste est redessinée à chaque rafraîchissement : on clique par le DOM, sans attendre qu'elle soit « stable »)
const ouvrirFiche = (p, pseudo) => p.evaluate((n) => [...document.querySelectorAll("#liste .nom-eleve")].find((b) => b.textContent.trim() === n).click(), pseudo);
const BUG = "def tour():\n    if algue_ici()\n        manger()\n";
const DEUX_BLOCS = "def tour():\n    if algue_ici():\n        manger()\n    else:\n        aller_vers_algue()\n    if sur_plage() and est_la_nuit():\n        pondre()\n    else:\n        aller_vers_plage()\n";

export default {
  nom: "enseignant", ordre: 33, modes: ["demo", "base"], delai: 240,
  titre: "Enseignant : état des tortues, fiche élève, résumé, Panthéon automatique, CSV",
  async lancer(t) {
    const ctx = await t.contexte({ largeur: 1400, hauteur: 950 });
    const prof = await t.page(ctx, "prof");
    const salle = await t.creerSalle(prof);
    const maki = await t.rejoindre(await t.page(ctx, "Maki"), salle, "Maki");
    const bulle = await t.rejoindre(await t.page(ctx, "Bulle"), salle, "Bulle");
    const zed = await t.rejoindre(await t.page(ctx, "Zed"), salle, "Zed");
    await t.attendre(async () => (await prof.$$("#liste li")).length >= 3, "les 3 élèves sont dans la liste");
    await t.lancerManche(prof);
    // avec une vraie base, le programme doit être neuf pour entrer au Panthéon : on ajoute une condition
    // toujours fausse, avec un nombre unique (la tortue joue exactement pareil)
    const unique = t.mode === "base" ? TORTUES.experte.replace("if requin_proche() and algue_ici():", `if (requin_proche() or energie() > ${900 + (Date.now() % 9000)}) and algue_ici():`) : TORTUES.experte;
    await t.envoyer(maki, unique);
    await t.envoyer(bulle, DEUX_BLOCS);
    // (une tortue avec une erreur de syntaxe ne peut pas être envoyée : on la dépose directement)
    await t.db(zed, async (db, [s, src]) => { const j = JSON.parse(localStorage.getItem(`lagon:jeton:${s}:Zed`)).v; await db.deposer(s, "Zed", j, 1, src); }, [salle, BUG]);

    // pendant la programmation : un état par élève, et le compteur
    const etats = await t.attendre(async () => {
      const l = (await prof.$$eval("#liste li", (x) => x.map((li) => li.textContent.replace(/\s+/g, " ")))).join(" | ");
      return /Maki.*🟢/.test(l) && /Bulle.*🔴/.test(l) && /Zed.*🐞/.test(l) && l;
    }, "les états 🟢 🔴 🐞 apparaissent dans la liste", { delai: 20000 });
    t.ok(etats, "états : " + etats.slice(0, 120));
    t.correspond(await t.texte(prof, "#etat-classe"), /1 tortue sur 3/, "le compteur dit combien de tortues pondent");

    // la fiche d'un élève : avertissement, cause, code ; 🙈 Masquer et Échap la ferment
    await ouvrirFiche(prof, "Bulle");
    await t.attendre(() => prof.$(".fiche-eleve"), "la fiche de Bulle s'ouvre");
    const f = await t.texte(prof, ".fiche-eleve");
    t.correspond(f, /tableau/i, "la fiche prévient qu'elle est visible au tableau");
    t.correspond(f, /deux blocs|bloc/i, "la fiche donne la cause (deux blocs à la suite)");
    t.contient(f, "pondre()", "la fiche montre le code envoyé");
    await prof.evaluate(() => document.querySelector(".fiche-eleve [data-masquer]").click());
    await t.attendre(async () => !(await prof.$(".fiche-eleve")), "🙈 Masquer ferme la fiche d'un coup");
    await ouvrirFiche(prof, "Maki");
    await t.attendre(() => prof.$(".fiche-eleve"), "la fiche de Maki s'ouvre");
    await prof.keyboard.press("Escape");
    await t.attendre(async () => !(await prof.$(".fiche-eleve")), "Échap ferme la fiche");

    // le brawl, puis les résultats : résumé, fiche après le match, Panthéon automatique
    await t.brawl(prof);   // (jusqu'aux résultats)
    await t.attendre(() => prof.$("#pantheon-auto"), "les résultats s'affichent avec le Panthéon automatique");
    const pt = await t.attendre(async () => {
      const x = await t.texte(prof, "#pantheon-auto").catch(() => "");
      return /Panthéon/.test(x) && !/Banc d.essai/.test(x) && !(await prof.$("#pantheon-auto .en-cours")) && x;
    }, "le banc d'essai du Panthéon automatique se termine", { delai: 90000 });
    const nids = await prof.$eval("table.scores tr[data-pseudo='Maki'] td:nth-child(3)", (td) => Number(td.textContent)).catch(() => 0);
    if (nids > 0) t.correspond(pt, /Maki.*entre au Panthéon/, "au tableau : la meilleure tortue entre au Panthéon");
    await prof.click("#resume-d summary").catch(() => {});
    t.correspond(await t.texte(prof, "body"), /tortues? sur 3/, "le résumé de la classe après le match");

    // l'élève voit son entrée au Panthéon, avec son code Panthéon
    if (nids > 0) {
      await maki.click('[data-t="res"]').catch(() => {});
      await t.attendre(async () => /entre au Panthéon/.test(await t.texte(maki, "body")), "Maki voit « Ta tortue entre au Panthéon »", { delai: 20000 });
    }

    // fin de séance : le CSV peut inclure les codes
    await t.sansDebordement(prof, "résultats de l'enseignant");
  },
};

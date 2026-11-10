// Le stockage d'un jour (ordinateurs partagés du lycée) : ce que laisse un élève expire au bout d'un jour,
// ce qui appartient à l'enseignant au bout de 60 jours ; les valeurs expirées sont effacées au chargement ;
// les anciennes valeurs (sans date) reçoivent une durée de vie ; les clés des autres sites ne sont pas touchées.
const JOUR = 24 * 3600 * 1000;

export default {
  nom: "stockage", ordre: 60, delai: 60,
  titre: "Stockage : 1 jour pour l'élève, 60 jours pour l'enseignant, ménage au chargement",
  async lancer(t) {
    const p = await t.nouvellePage({}, "stockage");
    await p.goto(t.url("index.html"));
    // une partie d'hier (expirée), une ancienne valeur enseignant sans date, une clé d'un autre site
    await p.evaluate((J) => {
      localStorage.setItem("lagon:derniere", JSON.stringify({ _exp: Date.now() - 1000, v: { salle: "OLDX", pseudo: "Hier" } }));
      localStorage.setItem("lagon:jeton:OLDX:Hier", JSON.stringify({ _exp: Date.now() - 1000, v: "perso-AAAABBBB-lagon" }));
      localStorage.setItem("lagon:prof", JSON.stringify({ WXYZ: { secret: "s", cree: Date.now() } }));
      localStorage.setItem("autre-site", "garde-moi");
    }, JOUR);
    await p.reload();
    const s = await p.evaluate(() => ({ der: localStorage.getItem("lagon:derniere"), jeton: localStorage.getItem("lagon:jeton:OLDX:Hier"), prof: localStorage.getItem("lagon:prof"), autre: localStorage.getItem("autre-site"), salle: document.querySelector("#salle").value }));
    t.egal(s.der, null, "la partie expirée d'hier est effacée au chargement");
    t.egal(s.jeton, null, "le jeton expiré est effacé");
    t.egal(s.salle, "", "le pseudo et la salle de l'élève précédent ne sont plus proposés");
    t.egal(await p.innerHTML("#reprise-rapide"), "", "pas de « Reprendre ma partie » pour l'élève d'hier");
    const prof = JSON.parse(s.prof);
    t.ok(prof._exp && prof.v && prof.v.WXYZ, "une ancienne valeur enseignant (sans date) reçoit une date d'expiration");
    t.ok(Math.abs(prof._exp - (Date.now() + 60 * JOUR)) < JOUR, "… dans 60 jours (enseignant)");
    t.egal(s.autre, "garde-moi", "les clés des autres sites ne sont pas touchées");

    // un élève rejoint une salle : ce qu'il laisse expire dans 1 jour
    const salle = await t.db(p, (db) => db.creerSalle().then((r) => r.code));
    await t.rejoindre(p, salle, "Aujourdhui");
    const j = await p.evaluate((c) => JSON.parse(localStorage.getItem(`lagon:jeton:${c}:Aujourdhui`)), salle);
    t.ok(j && j._exp && Math.abs(j._exp - (Date.now() + JOUR)) < 3600e3, "le jeton de l'élève expire dans 1 jour");
    const demo = await p.evaluate(() => JSON.parse(localStorage.getItem("lagon-demo-v1")));
    if (t.mode === "demo") t.ok(demo && Math.abs(demo._exp - (Date.now() + 60 * JOUR)) < JOUR, "la base de démo (celle de l'enseignant) vit 60 jours");
  },
};

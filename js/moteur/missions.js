// =====================================================================
//  Lagon Arena — moteur : les missions des tutoriels (code à réparer, petit lagon sur mesure)
//  Vérifiées par outils/verifier.mjs : le code donné échoue, la solution réussit.
// =====================================================================

// ---------- missions du tutoriel ----------
export const MISSIONS = [
  {
    id: 1, titre: "La tortue qui ne mange jamais", notion: "if",
    histoire: "Cette tortue va jusqu'aux algues… puis reste plantée là, le ventre vide.",
    objectif: "Atteindre 9 d'énergie en 30 tours.",
    code: `def tour():
    if algue_ici():
        aller_vers_algue()
    else:
        aller_vers_algue()
`,
    indice: "Regarde la ligne 3 : quand algue_ici() est vrai, que devrait faire la tortue ?",
    scenario: { energie: 3, requins: [], plastiques: [], spawn: [7, 6], heureDepart: 8, ticks: 30 },
    reussi: (sim) => sim.tortues[0].stats.energieMax >= 9,
    bilan: (sim) => `Énergie maximale atteinte : ${sim.tortues[0].stats.energieMax} / 10.`,
  },
  {
    id: 2, titre: "La gourmande", notion: "ordre des elif",
    histoire: "Cette tortue adore manger… même quand un requin arrive. Or manger fait bouger les algues : le requin la repère !",
    objectif: "Survivre 40 tours sans être attrapée, en mangeant au moins une fois.",
    code: `def tour():
    if algue_ici():
        manger()
    elif requin_proche():
        fuir()
    else:
        aller_vers_algue()
`,
    indice: "Python teste les conditions de haut en bas et s'arrête au premier vrai. Quel test doit passer en premier ?",
    scenario: { energie: 2, requins: [[8, 6], [6, 9]], plastiques: [], spawn: [5, 6], heureDepart: 8, ticks: 40 },
    reussi: (sim) => sim.tortues[0].stats.captures.length === 0 && sim.tortues[0].stats.repas >= 1,
    bilan: (sim) => `Attrapée ${sim.tortues[0].stats.captures.length} fois · ${sim.tortues[0].stats.repas} repas.`,
  },
  {
    id: 3, titre: "La pondeuse impatiente", notion: "and",
    histoire: "Cette tortue est sur la plage et essaie de pondre… en plein après-midi. Elle attend, attend, et s'affaiblit.",
    objectif: "Pondre au moins 1 nid en 50 tours.",
    code: `def tour():
    if sur_plage():
        pondre()
    elif est_la_nuit():
        aller_vers_plage()
    elif algue_ici():
        manger()
    else:
        aller_vers_algue()
`,
    indice: "pondre() ne marche que si la tortue est sur la plage ET qu'il fait nuit. Comment dire « et » en Python ?",
    scenario: { energie: 7, requins: [], plastiques: [], spawn: [1, 3], heureDepart: 12, ticks: 50 },
    reussi: (sim) => sim.tortues[0].nids >= 1,
    bilan: (sim) => {
      const refus = Object.entries(sim.tortues[0].stats.refus).map(([r, n]) => `${n} × « ${r} »`).join(", ");
      return `${sim.tortues[0].nids} nid(s)` + (refus ? ` · pondre() refusé : ${refus}.` : ".");
    },
  },
  {
    id: 4, titre: "Bonus : le sac plastique", notion: "not",
    histoire: "Un sac plastique flotte sur les algues. Cette tortue le confond avec de la nourriture…",
    objectif: "Manger 2 algues sans avaler de plastique, en 30 tours.",
    code: `def tour():
    if algue_ici():
        manger()
    else:
        aller_vers_algue()
`,
    indice: "Il faut manger s'il y a des algues ET PAS de plastique. « Pas » se dit not.",
    scenario: { energie: 4, requins: [], plastiques: [[4, 6]], spawn: [4, 6], heureDepart: 8, ticks: 30 },
    reussi: (sim) => sim.tortues[0].stats.plastiques.length === 0 && sim.tortues[0].stats.repas >= 2,
    bilan: (sim) => `${sim.tortues[0].stats.repas} repas · ${sim.tortues[0].stats.plastiques.length} sac(s) plastique avalé(s).`,
  },
];

// ---------- missions du tutoriel avancé ----------
const RIVALE_GOURMANDE = `def tour():
    if algue_ici():
        manger()
    else:
        aller_vers_algue()
`;
const pleinAuTour = (sim) => { const i = sim.tortues.findIndex((t) => t.id === "t"); return sim.frames.findIndex((f) => f.tortues[i][2] >= 10); };
export const MISSIONS_AVANCEES = [
  {
    id: "A1", titre: "🔧 Le buffet est pris", notion: "aller_vers_algue_libre()",
    probleme: "😟 Les algues les plus proches sont déjà occupées par deux gourmandes. Ta tortue y va quand même… et attend.",
    objectif: "Être pleine d'énergie (10 ⚡) en 15 tours.",
    code: RIVALE_GOURMANDE,
    solution: `def tour():
    if algue_ici():
        manger()
    else:
        aller_vers_algue_libre()
`,
    indice: "Il existe un ordre qui va vers les algues où il n'y a PERSONNE : aller_vers_algue_libre().",
    appris: "<code>aller_vers_algue_libre()</code> évite les touffes déjà occupées : pas de bousculade, plus de repas.",
    scenario: { energie: 3, energies: { t: 3, u1: 2, u2: 2 }, requins: [], plastiques: [], heureDepart: 8, ticks: 20, repousse: false,
      herbes: [[10, 3, 3], [9, 3, 3], [15, 2, 5]], spawns: { t: [11, 4], u1: [10, 3], u2: [9, 3] } },
    autres: [{ id: "u1", nom: "Gourmande 1", couleur: "#9fb3c2", code: RIVALE_GOURMANDE }, { id: "u2", nom: "Gourmande 2", couleur: "#c9d6df", code: RIVALE_GOURMANDE }],
    reussi: (sim) => { const k = pleinAuTour(sim); return k >= 0 && k <= 15; },
    bilan: (sim) => { const k = pleinAuTour(sim); return k >= 0 ? `Pleine d'énergie au tour ${k}.` : "Jamais pleine d'énergie."; },
  },
  {
    id: "A2", titre: "🏴‍☠️ La pirate", notion: "requin_derriere_tortue()",
    probleme: "😟 Une rivale se repose sur la plage, collée à toi… et un requin attend juste derrière elle. Mais ta tortue a peur et s'enfuit.",
    objectif: "Pousser la rivale sur le requin (10 tours maximum).",
    code: `def tour():
    if requin_proche():
        fuir()
    elif tortue_a_cote():
        pousser()
    else:
        se_cacher()
`,
    solution: `def tour():
    if requin_derriere_tortue():
        pousser()
    elif requin_proche():
        fuir()
    else:
        se_cacher()
`,
    indice: "Le premier vrai gagne : requin_proche() est vrai, donc ta tortue fuit. Teste d'abord requin_derriere_tortue().",
    appris: "<code>pousser()</code> (−2 ⚡) envoie la voisine d'une case. Avec un requin derrière elle, elle est attrapée et perd un nid !",
    scenario: { energie: 8, requins: [[19, 6]], requinsFixes: true, plastiques: [], heureDepart: 10, ticks: 10, repousse: false, herbes: [], spawns: { t: [21, 6], u1: [20, 6] } },
    autres: [{ id: "u1", nom: "Rivale", couleur: "#9fb3c2", code: "def tour():\n    se_cacher()\n" }],
    reussi: (sim) => sim.tortues.find((t) => t.id === "t").stats.victimes >= 1,
    bilan: (sim) => { const s = sim.tortues.find((t) => t.id === "t").stats; return `${s.pousses.length} poussée(s), ${s.victimes} rivale(s) attrapée(s).`; },
  },
];
MISSIONS_AVANCEES.push({
  id: "A3", titre: "🍼 La nourrice", notion: "donner()", equipe: 1,
  probleme: "😟 Ton équipière 🔵 est sur la plage, la nuit… mais elle n'a plus assez d'énergie pour pondre. Toi, tu es pleine d'énergie, collée à elle. Mais ta tortue part manger !",
  objectif: "Que ton équipe ponde au moins 2 nids en 10 tours.",
  code: `def tour():
    if algue_ici():
        manger()
    else:
        aller_vers_algue()
`,
  solution: `def tour():
    if equipiere_fatiguee():
        donner()
    elif algue_ici():
        manger()
    else:
        aller_vers_algue()
`,
  indice: "Si une équipière collée à toi est fatiguée (equipiere_fatiguee()), donne-lui de l'énergie avec donner(). Teste-le en premier !",
  appris: "<code>donner()</code> passe 3 ⚡ à une équipière collée à toi. En équipe, c'est le <b>total de l'équipe</b> qui compte : aider rapporte autant que pondre soi-même !",
  scenario: { energie: 10, energies: { t: 10, u1: 3 }, requins: [], plastiques: [], heureDepart: 21, ticks: 10, repousse: false,
    herbes: [[15, 6, 5]], spawns: { t: [19, 6], u1: [20, 6] } },
  autres: [{ id: "u1", nom: "Équipière", couleur: "#2f6fdb", equipe: 1, code: `def tour():
    if sur_plage() and est_la_nuit() and energie() >= 6:
        pondre()
    else:
        se_cacher()
` }],
  reussi: (sim) => sim.tortues.filter((t) => t.equipe === 1).reduce((a, t) => a + t.nids, 0) >= 2,
  bilan: (sim) => `Nids de l'équipe : ${sim.tortues.filter((t) => t.equipe === 1).reduce((a, t) => a + t.nids, 0)} · énergie donnée : ${sim.tortues.find((t) => t.id === "t").stats.dons} ⚡.`,
});

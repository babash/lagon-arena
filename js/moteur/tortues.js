// =====================================================================
//  Lagon Arena — moteur : la tortue de départ, les tortues d'entraînement 🤖 et les couleurs
// =====================================================================

// ---------- tortue de départ et tortues d'entraînement ----------
export const STARTER = `def tour():
    if requin_proche():
        fuir()
    elif est_la_nuit() and sur_plage():
        pondre()
    elif est_la_nuit():
        aller_vers_plage()
    elif algue_ici():
        manger()
    else:
        aller_vers_algue()
`;
// Le code que reçoit chaque élève au début de la séance : sa tortue mange, mais ne pond jamais.
// C'est aussi la tortue qui joue si un élève n'envoie rien.
export const CODE_DEPART = `def tour():
    # Elle sait manger, mais ne pond jamais !
    # Améliore-la avec if / elif / else.
    if algue_ici():
        manger()
    else:
        aller_vers_algue()
`;
export const BOTS = [
  { nom: "Bulle", niveau: "facile", code: `def tour():
    if algue_ici():
        manger()
    else:
        aller_vers_algue()
` },
  { nom: "Gourmande", niveau: "facile", code: `def tour():
    if algue_ici():
        manger()
    elif requin_proche():
        fuir()
    elif est_la_nuit() and sur_plage():
        pondre()
    elif est_la_nuit():
        aller_vers_plage()
    else:
        aller_vers_algue()
` },
  { nom: "Prudente", niveau: "moyen", code: STARTER },
  { nom: "Maline", niveau: "moyen", code: `def tour():
    if requin_proche() and algue_ici():
        se_cacher()
    elif requin_proche():
        fuir()
    elif est_la_nuit() and sur_plage() and energie() >= 6:
        pondre()
    elif est_la_nuit() and energie() >= 6:
        aller_vers_plage()
    elif algue_ici() and not plastique_ici():
        manger()
    else:
        aller_vers_algue()
` },
  { nom: "Championne", niveau: "difficile", code: `def tour():
    if requin_proche() and algue_ici():
        se_cacher()
    elif requin_proche() and not sur_plage():
        fuir()
    elif sur_plage() and est_la_nuit() and energie() >= 6:
        pondre()
    elif energie() >= 9 and heure() >= 16:
        aller_vers_plage()
    elif est_la_nuit() and energie() >= 6:
        aller_vers_plage()
    elif algue_ici() and not plastique_ici() and energie() < 10:
        manger()
    else:
        aller_vers_algue()
` },
];

// Tortue d'entraînement « avancée » (tutoriel avancé, bac à sable en mode avancé)
export const BOT_PIRATE = { nom: "Pirate", niveau: "avancé", code: `def tour():
    if requin_derriere_tortue() and energie() >= 4:
        pousser()
    elif distance_requin() <= 2 and not sur_plage():
        fuir()
    elif sur_plage() and est_la_nuit() and energie() >= 6:
        pondre()
    elif est_la_nuit() and energie() >= 6:
        aller_vers_plage()
    elif heure() >= 17 and energie() >= 9:
        aller_vers_plage()
    elif algue_ici() and not plastique_ici() and energie() < 10:
        manger()
    else:
        aller_vers_algue_libre()
` };

export const COULEURS = ["#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4", "#42d4f4", "#f032e6",
  "#bfef45", "#fabed4", "#469990", "#dcbeff", "#9a6324", "#fffac8", "#800000", "#aaffc3", "#808000", "#ffd8b1", "#000075", "#a9a9a9"];

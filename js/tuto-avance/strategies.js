// =====================================================================
//  Lagon Arena — les stratégies complètes données en exemple dans le tutoriel avancé
//  (à part : le Panthéon s'en sert aussi, pour refuser une copie telle quelle)
// =====================================================================

// 🥇 niveau expert : lire le lagon, choisir ses algues
export const CODE_EXPERT = `def tour():
    if requin_proche() and not sur_plage():
        fuir()
    elif sur_plage() and est_la_nuit() and energie() >= 6:
        pondre()
    elif est_la_nuit() and energie() >= 6:
        aller_vers_plage()
    elif requins_autour() >= 2 and algues_autour() == 0 and not sur_plage():
        aller_vers_plage()
    elif heure() >= 16 and energie() >= 8 and not algue_pres_plage():
        aller_vers_plage()
    elif algue_ici() and not plastique_ici() and energie() < 10:
        manger()
    elif portions_algue() <= 1 and algues_autour() >= 2:
        aller_vers_algue_libre()
    else:
        aller_vers_algue()
`;

// 👥 niveau équipe : s'entraider, pousser les rivales
export const CODE_EQUIPE = `def tour():
    if requin_proche() and not sur_plage() and not equipiere_a_cote():
        fuir()
    elif equipiere_fatiguee() and energie() >= 8:
        donner()
    elif rivale_a_cote() and requin_derriere_adversaire() and energie() >= 4:
        pousser()
    elif sur_plage() and est_la_nuit() and energie() >= 6:
        pondre()
    elif est_la_nuit() and energie() >= 6:
        aller_vers_plage()
    elif algue_ici() and not plastique_ici() and energie() < 10:
        manger()
    else:
        aller_vers_algue_libre()
`;

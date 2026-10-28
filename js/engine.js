// =====================================================================
//  Lagon Arena — le MOTEUR du jeu : point d'entrée unique
//  (aucun accès à la page : il sert au site ET à l'outil de vérification outils/verifier.mjs)
//
//  Le code est rangé dans js/moteur/ :
//    hasard.js      hasard reproductible (graines)
//    regles.js      réglages, nouveautés de manche, heures, points
//    carte.js       grille, distances, carte classique, cartes aléatoires sans blocage
//    equipes.js     équipes (couleurs) et résultat des équipes
//    tortues.js     tortue de départ, tortues d'entraînement 🤖
//    monde.js       l'état d'une partie et les questions qu'on se pose dessus
//    capteurs.js    les capteurs (questions du programme de l'élève)
//    actions.js     les actions (une par tour)
//    requins.js     chasse, patrouille et captures des requins
//    simulation.js  la boucle des tours : simulate()
//    rapport.js     le rapport de match d'une tortue
//    missions.js    les missions des tutoriels
// =====================================================================
export * from "./moteur/hasard.js";
export * from "./moteur/regles.js";
export * from "./moteur/carte.js";
export * from "./moteur/equipes.js";
export * from "./moteur/tortues.js";
export { simulate } from "./moteur/simulation.js";
export { rapport } from "./moteur/rapport.js";
export * from "./moteur/missions.js";

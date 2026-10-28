// =====================================================================
//  Lagon Arena — moteur : le rapport de match d'une tortue (ce qui s'est passé + 2 conseils)
// =====================================================================

// ---------- rapport de match pour une tortue ----------
const nomAction = (a) => (a ? a + "()" : "aucune action");
export function rapport(sim, id) {
  const t = sim.tortues.find((x) => x.id === id);
  if (!t) return null;
  const s = t.stats;
  const lignes = [], conseils = [];
  if (t.compileError) {
    return { lignes: [`Ta tortue n'a pas pu jouer : erreur à la ligne ${t.compileError.line}.`], conseils: [t.compileError.message], marqueurs: [] };
  }
  const perdusTot = s.captures.filter((c) => c.perdu).length;
  lignes.push(perdusTot
    ? `🥚 ${s.pontes.length} nid${s.pontes.length > 1 ? "s" : ""} pondu${s.pontes.length > 1 ? "s" : ""}, ${perdusTot} perdu${perdusTot > 1 ? "s" : ""} à cause des requins : ${t.nids} au final.`
    : `🥚 ${t.nids} nid${t.nids > 1 ? "s" : ""} pondu${t.nids > 1 ? "s" : ""}.`);
  if (s.captures.length) {
    const freq = {};
    for (const c of s.captures) { const k = c.ligne ? `la ligne ${c.ligne} : ${nomAction(c.action)}` : "aucune action"; freq[k] = (freq[k] || 0) + 1; }
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
    const quoi = top[0] === "aucune action" ? "elle ne faisait aucune action" : `elle exécutait ${top[0]}`;
    const nPerdus = s.captures.filter((c) => c.perdu).length;
    lignes.push(`🦈 Attrapée ${s.captures.length} fois (tours ${s.captures.map((c) => c.tick).join(", ")})${nPerdus ? ` : −${nPerdus} nid${nPerdus > 1 ? "s" : ""}` : ""}. ` +
      (top[1] === s.captures.length ? `À chaque fois, ${quoi}.` : `Le plus souvent, ${quoi}.`));
  } else lignes.push("🦈 Jamais attrapée par un requin.");
  if (s.plastiques.length) lignes.push(`🛍️ A avalé ${s.plastiques.length} sac${s.plastiques.length > 1 ? "s" : ""} plastique (ligne ${s.plastiques[0].ligne} : manger()).`);
  if (s.epuisee.length) lignes.push(`😵 S'est épuisée ${s.epuisee.length} fois (énergie à 0).`);
  const refusTxt = Object.entries(s.refus).map(([r, n]) => `${n} × « ${r} »`).join(", ");
  if (refusTxt) lignes.push(`⛔ pondre() refusé : ${refusTxt}.`);
  if (s.pousses.length) lignes.push(`💥 A poussé ${s.pousses.length} tortue${s.pousses.length > 1 ? "s" : ""}${s.victimes ? ` (dont ${s.victimes} sur un requin !)` : ""}.`);
  if (s.poussee.length) lignes.push(`😤 S'est fait pousser ${s.poussee.length} fois.`);
  if (s.dons) lignes.push(`🤝 A donné ${s.dons} ⚡ à ses équipières.`);
  if (s.recus) lignes.push(`🎁 A reçu ${s.recus} ⚡ de ses équipières.`);
  if (s.soleil >= 10) lignes.push(`☀️ A passé beaucoup de temps au soleil sur la plage (−${s.soleil} ⚡).`);

  // conseils (2 au maximum, du plus important au moins important) ; `code` = à écrire tel quel
  const capManger = s.captures.filter((c) => c.action === "manger").length;
  const capAutre = s.captures.filter((c) => c.action && c.action !== "fuir" && c.action !== "manger" && c.action !== "se_cacher").length;
  if (t.nids === 0 && s.pontes.length === 0) {
    if (!s.actions.pondre) conseils.push("Ta tortue ne pond jamais : 0 point ! Ajoute avant ton `else:` les lignes `elif sur_plage() and est_la_nuit():` puis `pondre()`.");
    else if (s.refus["il fait jour"] && !s.refus["pas sur une plage"]) conseils.push("`pondre()` est refusé le jour. Ajoute `and est_la_nuit()` dans la condition.");
    else if (s.refus["pas sur une plage"]) conseils.push("`pondre()` ne marche que sur la plage. La nuit, va vers la plage : `elif est_la_nuit():` puis `aller_vers_plage()`.");
  }
  if (capManger) conseils.push("Attrapée en train de manger ! Mets tout en haut : `if requin_proche():` puis `fuir()`.");
  else if (capAutre) conseils.push("Un requin était proche et ta tortue faisait autre chose. Mets le test `requin_proche()` plus haut (le premier vrai gagne).");
  else if (s.captures.length >= 2) conseils.push("Elle fuit mais se fait rattraper. Dans les algues, `se_cacher()` la rend invisible.");
  if (s.plastiques.length) conseils.push("Elle a mangé du plastique. Écris `algue_ici() and not plastique_ici()` avant `manger()`.");
  if ((s.refus["pas assez d'énergie"] || 0) >= 3) conseils.push("Elle attend sur la plage sans assez d'énergie (6 ⚡ minimum). Ajoute `and energie() >= 6`.");
  if ((s.refus["il fait jour"] || 0) >= 5 && s.pontes.length > 0) conseils.push("Elle essaie souvent de pondre en plein jour : ajoute `and est_la_nuit()`.");
  if (s.epuisee.length) conseils.push("Elle tombe à 0 ⚡. Elle doit manger quand elle a peu d'énergie : `energie() < 4`.");
  if (s.immobile > 20) conseils.push("Elle reste souvent sans rien faire. Ajoute un `else:` à la fin pour qu'elle ait toujours un ordre.");
  if (s.pasFaim > 10) conseils.push("`manger()` à 10 ⚡ ne sert à rien : pars plutôt vers la plage.");
  if (s.captures.filter((c) => c.par).length) conseils.push("Une tortue t'a poussée sur un requin ! Méfie-toi quand `tortue_a_cote()` est vrai (tutoriel avancé).");
  if (s.pousses.length >= 3 && !s.victimes) conseils.push("Tes `pousser()` coûtent 2 ⚡ chacun sans rien rapporter : pousse seulement si `requin_derriere_tortue()`.");
  if (s.soleil >= 15) conseils.push("Le jour, rester sur la plage fatigue (soleil). Va plutôt manger et reviens à la tombée de la nuit.");
  if (!conseils.length) conseils.push(t.nids >= 6
    ? "Très belle tortue ! Pour gagner encore : pars vers la plage avant la nuit, par exemple avec `heure() >= 16`."
    : "Pour pondre plus : remplis ton énergie le jour, puis va vers la plage un peu avant la nuit (`heure() >= 16`).");

  const marqueurs = [
    ...s.pontes.map((tick) => ({ tick, type: "nid" })),
    ...s.captures.map((c) => ({ tick: c.tick, type: "capture" })),
    ...s.plastiques.map((p) => ({ tick: p.tick, type: "plastique" })),
    ...s.epuisee.map((tick) => ({ tick, type: "epuisee" })),
    ...s.pousses.map((p) => ({ tick: p.tick, type: "pousse" })),
    ...sim.events.filter((e) => e.type === "don" && e.id === id).map((e) => ({ tick: e.tick, type: "don" })),
  ].sort((a, b) => a.tick - b.tick);
  return { lignes, conseils: conseils.slice(0, 2), marqueurs };
}

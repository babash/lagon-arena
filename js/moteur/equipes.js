// =====================================================================
//  Lagon Arena — moteur : les équipes (de 2 à 6, couleur automatique) et leur résultat
// =====================================================================

// Équipes : de 2 à MAX_EQUIPES. Chaque numéro d'équipe a automatiquement son nom, son icône et sa couleur.
export const EQUIPES = {
  1: { nom: "Bleue", icone: "🔵", couleur: "#2f6fdb" },
  2: { nom: "Rouge", icone: "🔴", couleur: "#e5484d" },
  3: { nom: "Verte", icone: "🟢", couleur: "#1f9d55" },
  4: { nom: "Jaune", icone: "🟡", couleur: "#e0a800" },
  5: { nom: "Violette", icone: "🟣", couleur: "#8b5cf6" },
  6: { nom: "Orange", icone: "🟠", couleur: "#f07c1a" },
};
export const MAX_EQUIPES = Object.keys(EQUIPES).length;
export const equipeInfo = (e) => EQUIPES[e] || { nom: "?", icone: "⚪", couleur: "#8a99a6" };
// couleur d'équipe avec transparence, et variables CSS (--eq, --eq-fond, --eq-bord) pour les cartes
export function rgbaEquipe(e, a) {
  const h = equipeInfo(e).couleur;
  return `rgba(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)},${a})`;
}
export const styleEquipe = (e) => `--eq:${equipeInfo(e).couleur};--eq-fond:${rgbaEquipe(e, 0.13)};--eq-bord:${rgbaEquipe(e, 0.5)}`;

// ---------- résultat d'une manche en équipes ----------
//  On compare la MOYENNE de nids par tortue (les équipes peuvent avoir des tailles différentes).
//  R[e] = { e, nids, n, moyenne, membres, rang } ; R.liste = équipes rangées ; R.nb = nombre d'équipes ;
//  R.gagnant = numéro de l'équipe gagnante (0 si plusieurs équipes sont à égalité en tête).
export function resultatEquipes(liste) {
  const nums = [...new Set(liste.filter((t) => t.equipe > 0).map((t) => t.equipe))].sort((a, b) => a - b);
  if (!nums.length) return null;
  const R = { liste: [], nb: nums.length };
  for (const e of nums) {
    const m = liste.filter((t) => t.equipe === e);
    const nids = m.reduce((a, t) => a + t.nids, 0);
    R[e] = { e, nids, n: m.length, moyenne: nids / m.length, membres: m.map((t) => t.id) };
    R.liste.push(R[e]);
  }
  R.liste.sort((a, b) => b.moyenne - a.moyenne || a.e - b.e);
  let rang = 0, prev = null;
  R.liste.forEach((x, i) => { if (prev === null || Math.abs(x.moyenne - prev) > 1e-9) rang = i + 1; prev = x.moyenne; x.rang = rang; });
  for (const x of R.liste) x.exaequo = R.liste.filter((y) => y.rang === x.rang).length;
  const premiers = R.liste.filter((x) => x.rang === 1);
  R.gagnant = premiers.length === 1 ? premiers[0].e : 0;
  return R;
}

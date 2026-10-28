// =====================================================================
//  Lagon Arena — moteur : le hasard REPRODUCTIBLE
//  Même graine = même suite de nombres, sur tous les navigateurs : chacun peut rejouer exactement le même match.
// =====================================================================

// ---------- générateur pseudo-aléatoire (mulberry32) ----------
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// la graine d'une manche (chaque manche d'une salle a la sienne, donc sa propre carte)
export const graineManche = (graineSalle, manche) => ((graineSalle * 31 + manche * 7919) % 2147483647) || 1;

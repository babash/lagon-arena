// =====================================================================
//  Lagon Arena — le STOCKAGE LOCAL du navigateur, avec une durée de vie
//
//  Les ordinateurs du lycée sont partagés : ce qu'un élève laisse dans le navigateur
//  (pseudo, jeton, programme, progression des tutoriels…) n'a pas à y rester plus d'UN JOUR.
//  Pour revenir plus tard, l'élève a son code de session.
//  Ce qui appartient à l'enseignant (ses salles et leur secret, ses réglages) vit 60 jours,
//  comme les salles dans la base.
//
//  Chaque valeur est enregistrée avec sa date d'expiration : { "_exp": 1730000000000, "v": … }.
//  La durée repart de zéro à chaque écriture (pas à la lecture : sinon le pseudo du dernier
//  élève resterait proposé indéfiniment sur un poste partagé).
//  Au chargement de la page, les valeurs expirées sont effacées.
// =====================================================================
const JOUR = 24 * 3600 * 1000;
export const DUREE_ELEVE = JOUR;
export const DUREE_ENSEIGNANT = 60 * JOUR;
// les clés de l'enseignant (le reste est « élève » : 1 jour)
const CLES_ENSEIGNANT = [/^lagon:prof$/, /^lagon:reglages$/, /^lagon:prep:/, /^lagon:faux:/, /^lagon-demo-v\d+$/, /^lagon:profil$/];
export const dureeDe = (cle) => (CLES_ENSEIGNANT.some((r) => r.test(cle)) ? DUREE_ENSEIGNANT : DUREE_ELEVE);
const estNotre = (cle) => cle.startsWith("lagon:") || cle.startsWith("lagon-demo-v");

const emballee = (x) => x !== null && typeof x === "object" && !Array.isArray(x) && "_exp" in x && "v" in x;
const lireBrut = (cle) => { const t = localStorage.getItem(cle); if (t === null) return undefined; try { return JSON.parse(t); } catch { return t; } };
const ecrire = (cle, v) => localStorage.setItem(cle, JSON.stringify({ _exp: Date.now() + dureeDe(cle), v }));

export const store = {
  get(cle, def = null) {
    try {
      const x = lireBrut(cle);
      if (x === undefined) return def;
      if (!emballee(x)) { ecrire(cle, x); return x; }   // valeur d'une ancienne version : on lui donne une durée de vie
      if (x._exp < Date.now()) { localStorage.removeItem(cle); return def; }
      return x.v;
    } catch { return def; }
  },
  set(cle, v) { try { ecrire(cle, v); } catch { /* stockage plein ou indisponible */ } },
  del(cle) { try { localStorage.removeItem(cle); } catch { /* rien */ } },
};

// le ménage : au chargement de chaque page
export function menageLocal() {
  try {
    const maintenant = Date.now();
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const cle = localStorage.key(i);
      if (!cle || !estNotre(cle)) continue;
      const x = lireBrut(cle);
      if (!emballee(x)) ecrire(cle, x);                  // ancienne valeur : expire dans 1 jour (ou 60)
      else if (x._exp < maintenant) localStorage.removeItem(cle);
    }
  } catch { /* stockage indisponible */ }
}
menageLocal();

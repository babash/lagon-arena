// =====================================================================
//  Lagon Arena — « 🧩 Mes règles » : la chaîne if / elif / else vue comme une liste de règles
//  On lit le code de la tortue comme une liste ordonnée (« 1. si requin proche → fuir »),
//  puis on peut AJOUTER une règle au bon rang, en MONTER / DESCENDRE une, ou en SUPPRIMER une :
//  le code est réécrit proprement (if pour la 1re, elif pour les suivantes, else en dernier).
//  Impossible ainsi de fabriquer par erreur un second bloc if / else sous le premier.
// =====================================================================

const ENTETE = /^\s*def\s+tour\s*\(\s*\)\s*:/;
const indentDe = (l) => l.match(/^ */)[0].length;
const vide = (l) => /^\s*(#.*)?$/.test(l);

// lit le code ; renvoie { ok:true, avant, regles:[{cond, com, corps}], sinon:{corps}|null, apres, I } ou { ok:false, raison }
export function lireRegles(code) {
  const L = String(code || "").replace(/\t/g, "    ").split("\n");
  const d = L.findIndex((l) => ENTETE.test(l));
  if (d < 0) return { ok: false, raison: "Il manque la ligne <code>def tour():</code>." };
  const premiere = L.findIndex((l, i) => i > d && !vide(l));
  if (premiere < 0) return { ok: true, avant: L.slice(0, d + 1), regles: [], sinon: null, apres: [], I: "    ", vide: true };
  const n = indentDe(L[premiere]), I = " ".repeat(n);
  const avant = L.slice(0, d + 1), regles = [], apres = [];
  let sinon = null, cur = null, i = d + 1, simple = null;
  for (; i < L.length; i++) {
    const l = L[i];
    if (vide(l) && !cur && !sinon && !simple) { avant.push(l); continue; }   // commentaires avant la chaîne
    if (!vide(l) && indentDe(l) < n) break;                               // fin de la fonction
    if (!vide(l) && indentDe(l) === n) {
      const t = l.trim(), m = t.match(/^(if|elif)\s+(.+?)\s*:\s*(#.*)?$/);
      if (m && m[1] === "if") {
        if (cur || sinon || simple) return { ok: false, raison: "deux" };
        cur = { cond: m[2], com: m[3] || "", corps: [] }; regles.push(cur); continue;
      }
      if (m && m[1] === "elif") {
        if (!cur || sinon) return { ok: false, raison: "Un <code>elif</code> doit suivre un <code>if</code>." };
        cur = { cond: m[2], com: m[3] || "", corps: [] }; regles.push(cur); continue;
      }
      if (/^else\s*:\s*(#.*)?$/.test(t)) {
        if (!cur || sinon) return { ok: false, raison: "Un <code>else</code> doit suivre un <code>if</code>." };
        sinon = { corps: [] }; cur = sinon; continue;
      }
      // une instruction seule (pas de if) : acceptée seulement si c'est tout le programme (elle deviendra le « sinon »)
      if (cur || sinon || simple) return { ok: false, raison: sinon || cur ? "deux" : "autre" };
      simple = { corps: [I + l] }; continue;
    }
    (cur || simple || { corps: avant }).corps.push(l);
  }
  for (; i < L.length; i++) apres.push(L[i]);
  if (simple) { if (regles.length) return { ok: false, raison: "deux" }; sinon = simple; }
  // les lignes vides de fin de bloc vont après la chaîne
  const derniers = (sinon || regles[regles.length - 1] || { corps: [] }).corps;
  while (derniers.length && /^\s*$/.test(derniers[derniers.length - 1])) apres.unshift(derniers.pop());
  return { ok: true, avant, regles, sinon, apres, I };
}

// réécrit le code à partir des règles
export function ecrireRegles({ avant, regles, sinon, apres, I }) {
  const out = [...avant];
  if (!regles.length && sinon) out.push(...sinon.corps.map((l) => (l.startsWith(I + I) ? l.slice(I.length) : l)));
  else {
    regles.forEach((r, k) => { out.push(`${I}${k ? "elif" : "if"} ${r.cond}:${r.com ? "  " + r.com : ""}`, ...r.corps); });
    if (sinon) out.push(`${I}else:`, ...sinon.corps);
  }
  let txt = out.concat(apres).join("\n");
  if (!txt.endsWith("\n")) txt += "\n";
  return txt;
}

// l'action principale d'un bloc (pour l'afficher : « → fuir() »)
export const actionDe = (corps) => {
  const l = corps.find((x) => /\w+\(\)/.test(x) && !/^\s*#/.test(x));
  if (!l) return "…";
  return corps.filter((x) => !/^\s*(#.*)?$/.test(x)).length > 1 ? l.trim() + " …" : l.trim();
};

// les modifications : chacune renvoie le nouveau code (ou null si impossible)
export function ajouterRegle(code, { cond, action, rang }) {
  const p = lireRegles(code); if (!p.ok) return null;
  const r = { cond: cond.trim(), com: "", corps: [p.I + p.I + action.trim()] };
  if (!p.regles.length && !p.sinon) p.sinon = { corps: [p.I + p.I + "aller_vers_algue()"] };
  p.regles.splice(Math.max(0, Math.min(p.regles.length, rang)), 0, r);
  return ecrireRegles(p);
}
export function deplacerRegle(code, i, sens) {
  const p = lireRegles(code); if (!p.ok) return null;
  const j = i + sens; if (j < 0 || j >= p.regles.length) return null;
  [p.regles[i], p.regles[j]] = [p.regles[j], p.regles[i]];
  return ecrireRegles(p);
}
export function supprimerRegle(code, i) {
  const p = lireRegles(code); if (!p.ok || !p.regles[i]) return null;
  p.regles.splice(i, 1);
  return ecrireRegles(p);
}

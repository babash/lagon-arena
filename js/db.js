// =====================================================================
//  Lagon Arena — accès aux données
//  • Supabase (API REST) si js/config.js est rempli ;
//  • sinon MODE DÉMO : tout est stocké dans ce navigateur (localStorage),
//    partagé entre les onglets (pratique pour tester prof + élèves sur un seul poste).
// =====================================================================
import { CONFIG } from "./config.js";
import { store } from "./stockage.js";

const params = new URLSearchParams(location.search);
// ?demo force le mode démo (mémorisé pour cet onglet), ?demo=0 l'annule
let forceDemo = false;
try {
  if (params.get("demo") === "0") sessionStorage.removeItem("lagon-demo");
  else if (params.has("demo")) sessionStorage.setItem("lagon-demo", "1");
  forceDemo = sessionStorage.getItem("lagon-demo") === "1";
} catch { forceDemo = params.has("demo"); }
export const MODE = CONFIG.SUPABASE_URL && !forceDemo ? "db" : "demo";

// ---------------------------------------------------------------------
class Supabase {
  constructor(url, key) {
    this.base = (CONFIG.REST_URL || url.replace(/\/+$/, "") + "/rest/v1");
    this.headers = { "Content-Type": "application/json", apikey: key };
    // les anciennes clés « anon » sont des JWT : elles vont aussi dans Authorization
    if (key.startsWith("eyJ")) this.headers.Authorization = "Bearer " + key;
  }
  async req(path, opts = {}) {
    let r;
    try { r = await fetch(this.base + path, { ...opts, headers: { ...this.headers, ...(opts.headers || {}) } }); }
    catch { throw new Error("Connexion impossible à la base de données. Vérifie la connexion Internet."); }
    const txt = await r.text();
    let data = null;
    try { data = txt ? JSON.parse(txt) : null; } catch { data = { message: txt }; }
    if (!r.ok) {
      const m = (data && (data.message || data.hint)) || `Erreur ${r.status}`;
      // base créée mais script supabase.sql pas (encore) lancé
      if (/could not find the (function|table)|schema cache|does not exist|PGRST20[25]/i.test(m + " " + (data && data.code)))
        throw new Error("La base de données n'est pas prête : l'enseignant doit lancer le fichier supabase.sql dans Supabase (SQL Editor → Run).");
      if (r.status === 401 || /invalid api key|no api key/i.test(m))
        throw new Error("Clé Supabase refusée : vérifiez SUPABASE_KEY dans js/config.js (clé « publishable »).");
      throw new Error(m);
    }
    return data;
  }
  rpc(fn, args = {}) { return this.req("/rpc/" + fn, { method: "POST", body: JSON.stringify(args) }); }
  get(table, query) { return this.req(`/${table}?${query}`); }

  async heureServeur() { return new Date(await this.rpc("heure_serveur")); }
  creerSalle() { return this.rpc("creer_salle"); }
  async salle(code) { const r = await this.get("salles", `code=eq.${encodeURIComponent(code)}&select=*`); return r[0] || null; }
  piloter(code, secret, s) {
    return this.rpc("piloter_salle", { p_code: code, p_secret: secret, p_manche: s.manche, p_phase: s.phase,
      p_duree: s.duree ?? null, p_graine: s.graine ?? null, p_nouveaute: s.nouveaute ?? null, p_duel: s.duel ?? null });
  }
  joueurs(code) { return this.get("joueurs", `salle=eq.${encodeURIComponent(code)}&select=pseudo,couleur&order=rejoint_le`); }
  rejoindre(code, pseudo, jeton, couleur) { return this.rpc("rejoindre", { p_salle: code, p_pseudo: pseudo, p_jeton: jeton, p_couleur: couleur }); }
  deposer(code, pseudo, jeton, manche, src) { return this.rpc("deposer_tortue", { p_salle: code, p_pseudo: pseudo, p_jeton: jeton, p_manche: manche, p_code: src }); }
  depots(code, manche) { return this.rpc("etat_depots", { p_salle: code, p_manche: manche }); }
  changerJeton(code, pseudo, ancien, nouveau) { return this.rpc("changer_jeton", { p_salle: code, p_pseudo: pseudo, p_ancien: ancien, p_nouveau: nouveau }); }
  async maTortue(code, pseudo, jeton) { const r = await this.rpc("ma_tortue", { p_salle: code, p_pseudo: pseudo, p_jeton: jeton }); return (r && r[0]) || null; }
  codesSession(code, secret) { return this.rpc("codes_session", { p_code: code, p_secret: secret }); }
  tortues(code) { return this.get("tortues", `salle=eq.${encodeURIComponent(code)}&select=pseudo,manche,code`); }
  enregistrerScores(code, secret, manche, scores) { return this.rpc("enregistrer_scores", { p_code: code, p_secret: secret, p_manche: manche, p_scores: scores }); }
  scores(code) { return this.get("scores", `salle=eq.${encodeURIComponent(code)}&select=*&order=manche,rang`); }
  retirerJoueur(code, secret, pseudo) { return this.rpc("retirer_joueur", { p_code: code, p_secret: secret, p_pseudo: pseudo }); }
  libererPseudo(code, secret, pseudo) { return this.rpc("liberer_pseudo", { p_code: code, p_secret: secret, p_pseudo: pseudo }); }
  definirConfig(code, secret, config) { return this.rpc("definir_config", { p_code: code, p_secret: secret, p_config: config }); }
  // l'accueil et le Panthéon
  // les chiffres de l'accueil. Si la base n'a pas encore la fonction (supabase.sql pas encore relancé),
  // on les compte dans les tables publiques : les parties d'après le numéro de manche de chaque salle.
  async statistiques() {
    try { return await this.rpc("statistiques"); }
    catch {
      const salles = await this.get("salles", "select=manche,phase");
      const parties = salles.reduce((n, s) => n + (["brawl", "resultats", "fin"].includes(s.phase) ? s.manche : Math.max(0, s.manche - 1)), 0);
      return { parties, participants: await this.compter("joueurs"), pantheon: 0, approximatif: true };
    }
  }
  // nombre de lignes d'une table publique (sans les télécharger)
  async compter(table) {
    const r = await fetch(`${this.base}/${table}?select=*`, { method: "HEAD", headers: { ...this.headers, Prefer: "count=exact", Range: "0-0" } });
    const n = parseInt((r.headers.get("content-range") || "").split("/")[1], 10);
    return Number.isFinite(n) ? n : 0;
  }
  proposerPantheon({ pseudo, lycee, code, moyenne, banc, jeton }) {
    return this.rpc("proposer_pantheon", { p_pseudo: pseudo, p_lycee: lycee || null, p_code: code, p_moyenne: moyenne, p_banc: banc, p_jeton: jeton });
  }
  pantheonTop(limite = 100, lycee = null) { return this.rpc("pantheon_top", { p_limite: limite, p_lycee: lycee || null }); }
  pantheonLycees() { return this.rpc("pantheon_lycees"); }
  async maTortuePantheon(jeton) { const r = await this.rpc("ma_tortue_pantheon", { p_jeton: jeton }); return (r && r[0]) || null; }
  pantheonAdmin(secret) { return this.rpc("pantheon_admin", { p_secret: secret }); }
  pantheonValider(secret, id, moyenne) { return this.rpc("pantheon_valider", { p_secret: secret, p_id: id, p_moyenne: moyenne }); }
  pantheonRetirer(secret, id) { return this.rpc("pantheon_retirer", { p_secret: secret, p_id: id }); }
}

// ---------------------------------------------------------------------
const KEY = "lagon-demo-v1";
class Demo {
  load() { return store.get(KEY) || this.vide(); }
  vide() { return { salles: {}, secrets: {}, joueurs: {}, jetons: {}, tortues: [], scores: [], pantheon: [] }; }
  save(s) { store.set(KEY, s); }
  async pause() { await new Promise((r) => setTimeout(r, 30)); }
  verifProf(s, code, secret) { if (s.secrets[code] !== secret) throw new Error("Accès refusé : cette salle appartient à un autre enseignant."); }

  async heureServeur() { return new Date(); }
  async creerSalle() {
    await this.pause();
    const s = this.load();
    const L = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    let code; do { code = Array.from({ length: 4 }, () => L[Math.floor(Math.random() * L.length)]).join(""); } while (s.salles[code]);
    const secret = Math.random().toString(36).slice(2) + Date.now().toString(36);
    s.salles[code] = { code, cree_le: new Date().toISOString(), manche: 0, phase: "attente", fin_chrono: null, graine: 1 + Math.floor(Math.random() * 1e6), nouveaute: "calme", duel: null };
    s.secrets[code] = secret; s.joueurs[code] = []; s.jetons[code] = {};
    this.save(s);
    return { code, secret };
  }
  async salle(code) { await this.pause(); return this.load().salles[code] || null; }
  async piloter(code, secret, p) {
    await this.pause();
    const s = this.load(); this.verifProf(s, code, secret);
    const sa = s.salles[code];
    Object.assign(sa, { manche: p.manche, phase: p.phase, duel: p.duel ?? null });
    if (p.duree != null) sa.fin_chrono = new Date(Date.now() + p.duree * 1000).toISOString();
    if (p.graine != null) sa.graine = p.graine;
    if (p.nouveaute != null) sa.nouveaute = p.nouveaute;
    this.save(s);
  }
  async joueurs(code) { await this.pause(); return (this.load().joueurs[code] || []).map(({ pseudo, couleur }) => ({ pseudo, couleur })); }
  async rejoindre(code, pseudo, jeton, couleur) {
    await this.pause();
    const s = this.load(); code = code.toUpperCase(); pseudo = pseudo.trim();
    if (!s.salles[code]) throw new Error("Salle introuvable : vérifie le code affiché au tableau.");
    if (pseudo.length < 2 || pseudo.length > 14 || !/^[A-Za-z0-9À-ÿ _-]+$/.test(pseudo)) throw new Error("Pseudo invalide : 2 à 14 lettres ou chiffres.");
    const j = s.joueurs[code].find((x) => x.pseudo === pseudo);
    if (!j) {
      if (s.joueurs[code].length >= 30) throw new Error("La salle est pleine (30 joueurs maximum).");
      s.joueurs[code].push({ pseudo, couleur }); s.jetons[code][pseudo] = jeton;
    } else if (s.jetons[code][pseudo] == null) { s.jetons[code][pseudo] = jeton; j.couleur = couleur; }   // pseudo débloqué
    else if (s.jetons[code][pseudo] !== jeton) throw new Error("Ce pseudo est déjà pris dans cette salle. Si c'est le tien (autre ordinateur), demande à ton enseignant de le débloquer.");
    else j.couleur = couleur;
    this.save(s);
    return pseudo;
  }
  async deposer(code, pseudo, jeton, manche, src) {
    await this.pause();
    const s = this.load(), sa = s.salles[code];
    if (!s.jetons[code] || s.jetons[code][pseudo] !== jeton) throw new Error("Joueur inconnu : reconnecte-toi à la salle.");
    if (sa.phase !== "prog" || sa.manche !== manche) throw new Error("Trop tard : la programmation de cette manche est terminée.");
    if (sa.fin_chrono && Date.now() > new Date(sa.fin_chrono).getTime() + 10000) throw new Error("Trop tard : le chrono est terminé.");
    if (sa.duel && !sa.duel.includes(pseudo)) throw new Error("Seuls les finalistes jouent le duel : regarde le match au tableau !");
    const now = new Date().toISOString();
    const t = s.tortues.find((x) => x.salle === code && x.pseudo === pseudo && x.manche === manche);
    if (t) { t.code = src; t.depose_le = now; } else s.tortues.push({ salle: code, pseudo, manche, code: src, depose_le: now });
    this.save(s);
    return now;
  }
  async changerJeton(code, pseudo, ancien, nouveau) {
    await this.pause();
    const s = this.load();
    if (!s.jetons[code] || s.jetons[code][pseudo] !== ancien) throw new Error("Joueur inconnu : reconnecte-toi à la salle.");
    s.jetons[code][pseudo] = nouveau; this.save(s);
  }
  async codesSession(code, secret) {
    await this.pause();
    const s = this.load(); this.verifProf(s, code, secret);
    return Object.entries(s.jetons[code] || {}).map(([pseudo, j]) => ({ pseudo, code: /^perso-[A-Z0-9]{8}-lagon$/.test(j || "") ? j.slice(6, 14) : null }))
      .sort((a, b) => a.pseudo.localeCompare(b.pseudo));
  }
  async maTortue(code, pseudo, jeton) {
    await this.pause();
    const s = this.load();
    if (!s.jetons[code] || s.jetons[code][pseudo] !== jeton) throw new Error("Joueur inconnu : reconnecte-toi à la salle.");
    const l = s.tortues.filter((t) => t.salle === code && t.pseudo === pseudo).sort((a, b) => b.manche - a.manche);
    return l.length ? { manche: l[0].manche, code: l[0].code, depose_le: l[0].depose_le } : null;
  }
  async depots(code, manche) { await this.pause(); return this.load().tortues.filter((t) => t.salle === code && t.manche === manche).map(({ pseudo, depose_le }) => ({ pseudo, depose_le })); }
  async tortues(code) {
    await this.pause();
    const s = this.load(), sa = s.salles[code];
    return s.tortues.filter((t) => t.salle === code && (sa.manche > t.manche || (sa.manche === t.manche && ["brawl", "resultats", "fin"].includes(sa.phase))))
      .map(({ pseudo, manche, code: c }) => ({ pseudo, manche, code: c }));
  }
  async enregistrerScores(code, secret, manche, scores) {
    await this.pause();
    const s = this.load(); this.verifProf(s, code, secret);
    s.scores = s.scores.filter((x) => !(x.salle === code && x.manche === manche));
    for (const x of scores) s.scores.push({ salle: code, manche, ...x, bonus: x.bonus || 0 });
    this.save(s);
  }
  async scores(code) { await this.pause(); return this.load().scores.filter((x) => x.salle === code).sort((a, b) => a.manche - b.manche || a.rang - b.rang); }
  async definirConfig(code, secret, config) {
    await this.pause();
    const s = this.load(); this.verifProf(s, code, secret);
    s.salles[code].config = config;
    this.save(s);
  }
  async libererPseudo(code, secret, pseudo) {
    await this.pause();
    const s = this.load(); this.verifProf(s, code, secret);
    delete s.jetons[code][pseudo];
    this.save(s);
  }
  async retirerJoueur(code, secret, pseudo) {
    await this.pause();
    const s = this.load(); this.verifProf(s, code, secret);
    s.joueurs[code] = s.joueurs[code].filter((j) => j.pseudo !== pseudo);
    delete s.jetons[code][pseudo];
    s.tortues = s.tortues.filter((t) => !(t.salle === code && t.pseudo === pseudo));
    this.save(s);
  }
  // l'accueil et le Panthéon (mêmes règles que supabase.sql, dans ce navigateur)
  async statistiques() {
    const s = this.load();
    return { parties: new Set(s.scores.map((x) => x.salle + "/" + x.manche)).size, participants: Object.values(s.joueurs).reduce((n, l) => n + l.length, 0),
      salles: Object.keys(s.salles).length, pantheon: (s.pantheon || []).length };
  }
  classementPantheon(s) {
    return (s.pantheon || []).slice().sort((a, b) => b.moyenne - a.moyenne || a.cree_le.localeCompare(b.cree_le)).map((p, i) => ({ ...p, rang: i + 1 }));
  }
  async proposerPantheon({ pseudo, lycee, code, moyenne, banc, jeton }) {
    await this.pause();
    const s = this.load(); s.pantheon = s.pantheon || [];
    pseudo = pseudo.trim(); lycee = (lycee || "").trim().replace(/\s+/g, " ") || null;
    if (banc !== 1) throw new Error("Ta page est trop ancienne : recharge-la (Ctrl+F5).");
    if (pseudo.length < 2 || pseudo.length > 14 || !/^[A-Za-z0-9À-ÿ _-]+$/.test(pseudo)) throw new Error("Pseudo invalide : 2 à 14 lettres ou chiffres.");
    if (lycee && (lycee.length > 60 || !/^[A-Za-z0-9À-ÿ '’.,()&/-]+$/.test(lycee))) throw new Error("Nom de lycée invalide : 60 caractères au plus, lettres et chiffres.");
    const empreinte = code.replace(/#[^\n]*/g, "").replace(/\s+/g, "");
    if (s.pantheon.some((p) => p.empreinte === empreinte && p.jeton !== jeton)) throw new Error("Cette tortue est déjà au Panthéon (même programme) : invente ta propre stratégie !");
    if (s.pantheon.some((p) => p.pseudo.toLowerCase() === pseudo.toLowerCase() && p.jeton !== jeton)) throw new Error("Ce pseudo est déjà au Panthéon. Choisis-en un autre, ou tape ton code Panthéon si c'est le tien.");
    const m = Math.round(moyenne * 100) / 100, now = new Date().toISOString();
    let p = s.pantheon.find((x) => x.jeton === jeton), statut;
    if (!p) { p = { id: Date.now(), pseudo, lycee, moyenne: m, banc, code, empreinte, jeton, verifie: false, cree_le: now }; s.pantheon.push(p); statut = "nouveau"; }
    else if (m > p.moyenne) { Object.assign(p, { pseudo, lycee, moyenne: m, code, empreinte, verifie: false }); statut = "ameliore"; }
    else { Object.assign(p, { pseudo, lycee }); statut = "moins_bien"; }
    this.save(s);
    return { statut, moyenne: p.moyenne, rang: this.classementPantheon(s).find((x) => x.id === p.id).rang };
  }
  async pantheonTop(limite = 100, lycee = null) {
    await this.pause();
    return this.classementPantheon(this.load()).filter((p) => !lycee || (p.lycee || "").toLowerCase() === lycee.trim().toLowerCase())
      .slice(0, limite).map(({ rang, pseudo, lycee: l, moyenne, verifie, cree_le }) => ({ rang, pseudo, lycee: l, moyenne, verifie, cree_le }));
  }
  async pantheonLycees() {
    const n = {};
    for (const p of this.load().pantheon || []) if (p.lycee) { const k = p.lycee.toLowerCase(); n[k] = n[k] || { lycee: p.lycee, tortues: 0 }; n[k].tortues++; }
    return Object.values(n).sort((a, b) => b.tortues - a.tortues);
  }
  async maTortuePantheon(jeton) {
    const p = this.classementPantheon(this.load()).find((x) => x.jeton === jeton);
    return p ? { pseudo: p.pseudo, lycee: p.lycee, moyenne: p.moyenne, verifie: p.verifie, rang: p.rang } : null;
  }
  async pantheonAdmin(secret) { if (!secret) throw new Error("Mot de passe administrateur incorrect."); return this.classementPantheon(this.load()); }
  async pantheonValider(secret, id, moyenne) {
    const s = this.load(), p = (s.pantheon || []).find((x) => x.id === id);
    if (p) { p.moyenne = Math.round(moyenne * 100) / 100; p.verifie = true; this.save(s); }
  }
  async pantheonRetirer(secret, id) { const s = this.load(); s.pantheon = (s.pantheon || []).filter((x) => x.id !== id); this.save(s); }
}

export const db = MODE === "db" ? new Supabase(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY) : new Demo();

// décalage entre l'horloge de ce poste et celle du serveur (pour des chronos synchronisés)
let decalage = 0;
export async function synchroniserHorloge() {
  try {
    const t0 = Date.now(); const srv = await db.heureServeur(); const t1 = Date.now();
    decalage = srv.getTime() - (t0 + t1) / 2;
  } catch { decalage = 0; }
}
export const maintenant = () => Date.now() + decalage;
export const secondesRestantes = (fin) => (fin ? (new Date(fin).getTime() - maintenant()) / 1000 : null);

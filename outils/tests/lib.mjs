// =====================================================================
//  Lagon Arena — tests : la boîte à outils commune aux parcours
//  Chaque parcours reçoit un objet « t » : des pages prêtes à l'emploi (polices bloquées,
//  configuration forcée, erreurs JavaScript relevées), et des vérifications qui ARRÊTENT
//  le parcours au premier problème (ok, egal, contient, attendre…).
//
//  Mode démo (par défaut) : js/config.js est remplacé par une configuration SANS base de données,
//  pour que les tests ne touchent jamais la vraie base, même dans un nouvel onglet.
//  Mode base (LAGON_DB=http://localhost:3300) : js/config.js pointe vers la base locale (PostgREST).
// =====================================================================
import { fileURLToPath } from "node:url";

export class Echec extends Error {}

const configJS = (db) => `export const CONFIG = { SUPABASE_URL: ${JSON.stringify(db || "")}, SUPABASE_KEY: "test-publishable", REST_URL: ${JSON.stringify(db || "")},
  URL_SITE: "https://babash.github.io/lagon-arena/", DUREE_PROG_1: 480, DUREE_PROG: 360, MIN_TORTUES: 8 };`;

// le texte d'un élément, espaces normalisés
export const propre = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
export const pause = (ms) => new Promise((r) => setTimeout(r, ms));
export const DOSSIER_CAPTURES = fileURLToPath(new URL("./captures/", import.meta.url));

export function outils({ browser, base, db = "", log = () => {} }) {
  const erreurs = [];
  const mode = db ? "base" : "demo";
  const t = {
    browser, base, db, mode, erreurs, log, pause, propre,
    // l'adresse d'une page du site ; en mode démo, on ajoute ?demo (inoffensif : la config est déjà sans base)
    url(chemin, { demo = true } = {}) {
      const [p, h] = chemin.split("#");
      const sep = p.includes("?") ? "&" : "?";
      return base + p + (mode === "demo" && demo ? sep + "demo" : "") + (h !== undefined ? "#" + h : "");
    },
    // un navigateur « neuf » (un autre ordinateur) : stockage vide
    async contexte({ largeur = 1366, hauteur = 900, mobile = false } = {}) {
      const ctx = await browser.newContext({ viewport: { width: largeur, height: hauteur }, isMobile: mobile, hasTouch: mobile });
      await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net|supabase\.co/, (r) => r.abort());
      await ctx.route(/\/js\/config\.js(\?.*)?$/, (r) => r.fulfill({ contentType: "text/javascript", body: configJS(db) }));
      return ctx;
    },
    // « un autre ordinateur » : un navigateur neuf (rien en mémoire : ni pseudo, ni jeton, ni code).
    // En mode démo, la « base » vit dans le navigateur : on y recopie celle de la page source (sinon la salle n'existerait pas).
    async autreOrdinateur(source, opts = {}) {
      const ctx = await t.contexte(opts);
      if (mode === "demo" && source) {
        const base = await source.evaluate(() => localStorage.getItem("lagon-demo-v1"));
        if (base) await ctx.addInitScript((d) => { if (!localStorage.getItem("lagon-demo-v1")) localStorage.setItem("lagon-demo-v1", d); }, base);
      }
      return ctx;
    },
    // une page : erreurs JavaScript relevées, boîtes de dialogue acceptées (confirm)
    async page(ctx, nom = "page") {
      const p = await ctx.newPage();
      p.on("pageerror", (e) => erreurs.push(`${nom} : ${e.message}`));
      p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|ERR_|net::/.test(m.text())) erreurs.push(`${nom} (console) : ${m.text()}`); });
      p.on("dialog", (d) => d.accept().catch(() => {}));
      return p;
    },
    async nouvellePage(opts = {}, nom = "page") { const ctx = await t.contexte(opts); return t.page(ctx, nom); },

    // ---------- vérifications ----------
    ok(cond, msg) { if (!cond) throw new Echec(msg); },
    egal(a, b, msg) { if (a !== b) throw new Echec(`${msg} (obtenu : ${JSON.stringify(a)}, attendu : ${JSON.stringify(b)})`); },
    contient(txt, morceau, msg) { if (!String(txt).includes(morceau)) throw new Echec(`${msg} : « ${morceau} » absent de « ${propre(txt).slice(0, 240)} »`); },
    correspond(txt, re, msg) { if (!re.test(String(txt))) throw new Echec(`${msg} : ${re} ne correspond pas à « ${propre(txt).slice(0, 240)} »`); },
    // attend qu'une fonction renvoie une valeur vraie (sinon échec avec le message)
    async attendre(fn, msg, { delai = 10000, pas = 150 } = {}) {
      const fin = Date.now() + delai;
      let der;
      for (;;) {
        try { der = await fn(); if (der) return der; } catch (e) { der = e.message; }
        if (Date.now() > fin) throw new Echec(`${msg} (après ${delai / 1000} s${typeof der === "string" && der ? " : " + der.slice(0, 160) : ""})`);
        await pause(pas);
      }
    },
    async texte(p, sel) { return propre(await p.textContent(sel)); },
    // aucun défilement horizontal de la page (téléphone…)
    async debordement(p) { return p.evaluate(() => document.documentElement.scrollWidth - innerWidth); },
    async sansDebordement(p, ou) { const d = await t.debordement(p); if (d > 0) throw new Echec(`${ou} : la page déborde de ${d} px en largeur`); },
    // le code de l'éditeur (textarea de CodeEditor)
    async ecrireCode(p, code, sel = "#ed textarea") {
      if (sel === "#ed textarea" && await p.$('#tabs [data-t="prog"]') && !(await p.isVisible("#ed"))) await p.click('#tabs [data-t="prog"]');   // (page élève : l'éditeur est dans ✍️ Programmer)
      await p.fill(sel, code); await pause(550);
    },
    async lireCode(p, sel = "#ed textarea") { return p.inputValue(sel); },
    // la base de données du site (démo ou locale), depuis une page déjà ouverte sur le site
    async db(p, fn, arg) { return p.evaluate(async ([src, a]) => { const { db } = await import("./js/db.js"); return (0, eval)("(" + src + ")")(db, a); }, [fn.toString(), arg]); },
    // ---------- les gestes d'une séance ----------
    // l'enseignant crée une salle (ou un devoir) : renvoie le code de la salle
    async creerSalle(prof, { devoir = false } = {}) {
      await prof.goto(t.url("prof.html"));
      await prof.click(devoir ? "#devoir" : "#creer");
      const code = await t.attendre(async () => { const c = propre(await prof.textContent("aside .code-salle").catch(() => "")); return /^[A-Z0-9]{4}$/.test(c) && c; }, "la salle est créée (code de 4 caractères)");
      await t.attendre(() => prof.$("#go"), "le panneau de préparation de la manche est là");
      return code;
    },
    // un élève rejoint la salle (salle + pseudo) ; renvoie la page élève
    async rejoindre(p, salle, pseudo, { invite = false } = {}) {
      await p.goto(t.url(invite ? `index.html?salle=${salle}` : "index.html"));
      if (!invite) await p.fill("#salle", salle);
      await p.fill("#pseudo", pseudo);
      await p.click("#rejoindre button[type=submit]");
      await p.waitForURL(/eleve\.html/, { timeout: 10000 });
      await t.attendre(() => p.$(".bilan-verdict, #statut .msg"), `${pseudo} arrive sur sa page`);
      return p;
    },
    // ferme la fenêtre par-dessus la page (code de session…), si elle est ouverte
    async fermerFenetre(p) { const b = await p.$("#fermer-ov"); if (b) { await b.click(); await pause(150); } },
    // manche longue / devoir : la fenêtre du code de session s'ouvre toute seule ; on attend qu'elle arrive, puis on la ferme
    async fermerCodeSession(p) { await t.attendre(() => p.$(".overlay .code-perso"), "la fenêtre du code de session s'ouvre (manche longue)"); await t.fermerFenetre(p); },
    // l'enseignant lance la manche préparée
    async lancerManche(prof) {
      await prof.click("#go");
      await t.attendre(() => prof.isVisible("#brawl"), "la manche est lancée (écran de programmation)");
      const f = await prof.$("[data-fermer]"); if (f) await f.click().catch(() => {});   // (fenêtre du lien pour un devoir)
    },
    // un élève envoie sa tortue
    async envoyer(p, code) {
      await p.click('#tabs [data-t="prog"]');
      await t.ecrireCode(p, code);
      await t.attendre(async () => !(await p.$eval("#envoyer", (b) => b.disabled)), "le bouton 📤 Envoyer est actif (la manche est ouverte)");
      await p.click("#envoyer");
      await t.attendre(async () => (await p.textContent("#envoyer")).includes("Envoyée"), "la tortue est envoyée (✅ sur le bouton)");
    },
    // brawl puis résultats (l'enseignant)
    async brawl(prof) {
      await prof.click("#brawl");
      await t.attendre(() => prof.$(".brawl-grid"), "le brawl commence", { delai: 30000 });
      await t.attendre(async () => !(await prof.$eval("#fini", (b) => b.disabled).catch(() => true)), "le bouton « Voir les résultats » est prêt");
      await prof.click("#fini");
      await t.attendre(() => prof.$("#actions"), "les résultats de la manche s'affichent", { delai: 20000 });
    },
    // un rendu visuel, pour regarder après coup (outils/tests/captures/parcours/)
    async capture(p, nom, opts = {}) { try { await p.screenshot({ path: `${DOSSIER_CAPTURES}parcours/${nom}.png`, ...opts }); } catch { /* facultatif */ } },
  };
  return t;
}

// les tortues qui servent dans plusieurs parcours
export const TORTUES = {
  bonne: `def tour():
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
`,
  moyenne: `def tour():
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
`,
  // une tortue « experte », différente des tortues d'entraînement (pour le Panthéon)
  experte: `def tour():
    if requin_proche() and algue_ici():
        se_cacher()
    elif requin_proche() and not sur_plage():
        fuir()
    elif sur_plage() and est_la_nuit() and energie() >= 6:
        pondre()
    elif heure() >= 17 and energie() >= 8:
        aller_vers_plage()
    elif est_la_nuit() and energie() >= 6:
        aller_vers_plage()
    elif algue_ici() and not plastique_ici() and energie() < 10:
        manger()
    else:
        aller_vers_algue()
`,
  deuxBlocs: `def tour():
    if algue_ici():
        manger()
    else:
        aller_vers_algue()
    if sur_plage() and est_la_nuit():
        pondre()
    else:
        aller_vers_plage()
`,
};

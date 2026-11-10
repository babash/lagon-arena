// =====================================================================
//  Lagon Arena — lancer TOUS les parcours de test
//
//    node outils/tests/tout.mjs                 tous les parcours, en mode démo (sans base)
//    node outils/tests/tout.mjs session tuto    seulement ceux-là
//    LAGON_DB=http://localhost:3300 node outils/tests/tout.mjs
//                                               en plus : les parcours « base », contre une base
//                                               locale (PostgREST + supabase.sql), jamais la vraie
//
//  Un petit serveur statique (Node, sans dépendance) sert le site sur un port libre (8770 et +).
//  Chaque parcours (outils/tests/parcours/*.mjs) s'arrête au premier problème ; à la fin, un
//  résumé ✔ / ✘, et le code de sortie vaut 1 si un parcours a échoué.
//  Prérequis : Playwright et Chromium (npm i -D playwright && npx playwright install chromium).
// =====================================================================
import http from "node:http";
import { readFile, readdir, stat, mkdir } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { outils, Echec, DOSSIER_CAPTURES } from "./lib.mjs";

const RACINE = fileURLToPath(new URL("../../", import.meta.url));
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".ico": "image/x-icon", ".json": "application/json", ".md": "text/plain; charset=utf-8", ".woff2": "font/woff2" };

// ---------- le serveur ----------
export async function demarrerServeur(portDepart = 8770) {
  const serveur = http.createServer(async (req, res) => {
    try {
      let chemin = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (chemin.endsWith("/")) chemin += "index.html";
      const fichier = normalize(join(RACINE, chemin));
      if (!fichier.startsWith(RACINE)) { res.writeHead(403).end(); return; }
      const s = await stat(fichier);
      if (!s.isFile()) throw new Error("pas un fichier");
      res.writeHead(200, { "Content-Type": TYPES[extname(fichier)] || "application/octet-stream", "Cache-Control": "no-store" });
      res.end(await readFile(fichier));
    } catch { res.writeHead(404, { "Content-Type": "text/plain" }).end("introuvable"); }
  });
  for (let port = portDepart; port < portDepart + 50; port++) {
    const ok = await new Promise((r) => { serveur.once("error", () => r(false)); serveur.listen(port, "127.0.0.1", () => r(true)); });
    if (ok) return { serveur, base: `http://127.0.0.1:${port}/` };
  }
  throw new Error("Aucun port libre pour le serveur de test.");
}

// ---------- les parcours ----------
async function chargerParcours() {
  const dossier = fileURLToPath(new URL("./parcours/", import.meta.url));
  const fichiers = (await readdir(dossier)).filter((f) => f.endsWith(".mjs")).sort();
  const l = [];
  for (const f of fichiers) {
    const m = (await import(pathToFileURL(join(dossier, f)).href)).default;
    l.push({ fichier: f, ordre: m.ordre ?? 50, modes: ["demo"], delai: 180, ...m });
  }
  return l.sort((a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom));
}

// Playwright : installé dans le projet (node_modules) ou globalement (NODE_PATH)
export async function chargerPlaywright() {
  try { return await import("playwright"); }
  catch { return createRequire(import.meta.url)("playwright"); }
}

async function baseJoignable(db) {
  if (!db) return false;
  try { const r = await fetch(db.replace(/\/+$/, "") + "/", { signal: AbortSignal.timeout(3000) }); return r.status < 500; } catch { return false; }
}

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const db = (process.env.LAGON_DB || "").replace(/\/+$/, "");
  const tous = await chargerParcours();
  const choisis = args.length ? tous.filter((p) => args.some((a) => p.nom === a || p.nom.startsWith(a) || p.fichier.startsWith(a))) : tous;
  if (!choisis.length) { console.error("Aucun parcours ne correspond à :", args.join(" "), "\nDisponibles :", tous.map((p) => p.nom).join(", ")); process.exit(2); }
  const avecBase = await baseJoignable(db);
  if (db && !avecBase) console.log(`⚠️  LAGON_DB=${db} ne répond pas : seuls les parcours en mode démo sont lancés.`);

  await mkdir(DOSSIER_CAPTURES + "parcours", { recursive: true });
  const { serveur, base } = await demarrerServeur(Number(process.env.LAGON_PORT) || 8770);
  const { chromium } = await chargerPlaywright();
  const browser = await chromium.launch();
  console.log(`🐢 Lagon Arena · tests · site servi sur ${base}${avecBase ? ` · base locale ${db}` : " · mode démo"}\n`);

  const resultats = [], t0 = Date.now();
  const tours = [];
  for (const p of choisis) {
    if (p.modes.includes("demo")) tours.push({ p, mode: "demo" });
    if (avecBase && p.modes.includes("base")) tours.push({ p, mode: "base" });
  }
  for (const { p, mode } of tours) {
    const debut = Date.now();
    const lignes = [];
    const t = outils({ browser, base, db: mode === "base" ? db : "", log: (...x) => lignes.push(x.join(" ")) });
    let erreur = null;
    try {
      await Promise.race([
        p.lancer(t),
        new Promise((_, rej) => setTimeout(() => rej(new Echec(`trop long (plus de ${p.delai} s)`)), p.delai * 1000)),
      ]);
      if (t.erreurs.length) erreur = new Echec("erreurs JavaScript dans les pages :\n      " + [...new Set(t.erreurs)].slice(0, 8).join("\n      "));
    } catch (e) { erreur = e; }
    // on ferme les navigateurs « neufs » ouverts par le parcours
    for (const ctx of browser.contexts()) await ctx.close().catch(() => {});
    const duree = ((Date.now() - debut) / 1000).toFixed(1);
    const nom = `${p.nom}${mode === "base" ? " [base]" : ""}`;
    if (erreur) {
      console.log(`✘ ${nom.padEnd(22)} ${duree.padStart(6)} s  ${p.titre}`);
      console.log(`    → ${erreur instanceof Echec ? erreur.message : String(erreur.message || erreur).split("\n").filter((l) => l.trim() && !/^\s*-/.test(l.replace(/\x1b\[\d+m/g, ""))).slice(0, 3).join("\n      ")}`);
      if (!(erreur instanceof Echec) && erreur.stack) { const l = erreur.stack.split("\n").find((x) => x.includes("/parcours/")); if (l) console.log("      " + l.trim()); }
      for (const l of lignes.slice(-6)) console.log("      · " + l);
    } else {
      console.log(`✔ ${nom.padEnd(22)} ${duree.padStart(6)} s  ${p.titre}`);
      if (process.env.LAGON_BAVARD) for (const l of lignes) console.log("      · " + l);
    }
    resultats.push({ nom, ok: !erreur });
  }
  await browser.close();
  serveur.close();
  const rates = resultats.filter((r) => !r.ok);
  console.log(`\n${rates.length ? "✘" : "✔"} ${resultats.length - rates.length} / ${resultats.length} parcours réussis en ${((Date.now() - t0) / 1000).toFixed(0)} s` +
    (rates.length ? ` · échecs : ${rates.map((r) => r.nom).join(", ")}` : "") + (!avecBase && tous.some((p) => p.modes.includes("base")) ? "\n  (parcours avec base non lancés : LAGON_DB=http://localhost:3300 pour les ajouter)" : ""));
  process.exit(rates.length ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e); process.exit(1); });

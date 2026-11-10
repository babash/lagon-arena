// =====================================================================
//  Lagon Arena — les CAPTURES DE RÉFÉRENCE, aux 5 tailles d'écran (390, 768, 1024, 1366, 1920 px)
//
//    node outils/tests/captures.mjs               photographie les pages principales (mode démo)
//                                                 et les compare à la série de référence
//    node outils/tests/captures.mjs --reference   … puis en fait la nouvelle série de référence
//
//  Les images vont dans outils/tests/captures/ (non versionné) :
//    reference/<page>-<largeur>.png   la série de référence (avant une modification)
//    derniere/<page>-<largeur>.png    la dernière série
//    diff/<page>-<largeur>.png        les pixels qui ont changé, en rouge (quand il y en a)
//  La comparaison se fait dans le navigateur (canvas) : aucune dépendance de plus.
//  Les animations sont coupées (prefers-reduced-motion) ; les lagons animés peuvent varier un peu.
// =====================================================================
import { mkdir, readFile, writeFile, copyFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { demarrerServeur, chargerPlaywright } from "./tout.mjs";
import { DOSSIER_CAPTURES } from "./lib.mjs";

const LARGEURS = [390, 768, 1024, 1366, 1920];
const PAGES = [
  ["accueil-eleve", "index.html"],
  ["accueil-prof", "index.html?prof"],
  ["tuto-lagon", "tuto.html?e=2#2"],
  ["tuto-pilote", "tuto.html?e=3#3"],
  ["tuto-regles", "tuto.html?e=4#4"],
  ["tuto-si-alors", "tuto.html?e=7#7"],
  ["tuto-trous", "tuto.html?e=8#8"],
  ["tuto-avance", "tuto-avance.html"],
  ["eleve-programmer", "eleve.html?libre=1"],
  ["eleve-regles", "eleve.html?libre=1", (p) => p.click('[data-t="regles"]')],
  ["pantheon", "pantheon.html"],
  ["prof-accueil", "prof.html"],
];
const CONFIG_DEMO = `export const CONFIG = { SUPABASE_URL: "", SUPABASE_KEY: "", URL_SITE: "https://babash.github.io/lagon-arena/", DUREE_PROG_1: 480, DUREE_PROG: 360, MIN_TORTUES: 8 };`;

async function main() {
  const reference = process.argv.includes("--reference");
  for (const d of ["reference", "derniere", "diff"]) await mkdir(DOSSIER_CAPTURES + d, { recursive: true });
  const { serveur, base } = await demarrerServeur(Number(process.env.LAGON_PORT) || 8780);
  const { chromium } = await chargerPlaywright();
  const browser = await chromium.launch();
  console.log(`📸 ${PAGES.length} pages × ${LARGEURS.length} largeurs (${base})`);
  for (const largeur of LARGEURS) {
    const ctx = await browser.newContext({ viewport: { width: largeur, height: 900 }, reducedMotion: "reduce", deviceScaleFactor: 1 });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net|supabase\.co/, (r) => r.abort());
    await ctx.route(/\/js\/config\.js(\?.*)?$/, (r) => r.fulfill({ contentType: "text/javascript", body: CONFIG_DEMO }));
    const p = await ctx.newPage();
    for (const [nom, chemin, geste] of PAGES) {
      await p.goto(base + chemin.replace(/(#|$)/, (m) => (chemin.includes("?") ? "&" : "?") + "demo" + m));
      await p.waitForTimeout(700);
      if (geste) { await geste(p); await p.waitForTimeout(300); }
      await p.screenshot({ path: `${DOSSIER_CAPTURES}derniere/${nom}-${largeur}.png`, fullPage: true });
    }
    await ctx.close();
  }

  // la comparaison avec la série de référence
  const cmp = await browser.newPage();
  const lignes = [];
  for (const [nom] of PAGES) {
    const cases = [];
    for (const largeur of LARGEURS) {
      const f = `${nom}-${largeur}.png`, ref = DOSSIER_CAPTURES + "reference/" + f, der = DOSSIER_CAPTURES + "derniere/" + f;
      if (!existsSync(ref)) { cases.push("nouvelle"); continue; }
      const [a, b] = await Promise.all([readFile(ref), readFile(der)]);
      const r = await cmp.evaluate(async ([a, b]) => {
        const img = (s) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = "data:image/png;base64," + s; });
        const [A, B] = await Promise.all([img(a), img(b)]);
        if (A.width !== B.width || A.height !== B.height) return { taille: `${A.width}×${A.height} → ${B.width}×${B.height}` };
        const c = document.createElement("canvas"); c.width = A.width; c.height = A.height;
        const g = c.getContext("2d", { willReadFrequently: true });
        g.drawImage(A, 0, 0); const da = g.getImageData(0, 0, c.width, c.height);
        g.drawImage(B, 0, 0); const db = g.getImageData(0, 0, c.width, c.height);
        let n = 0;
        for (let i = 0; i < da.data.length; i += 4) {
          const d = Math.abs(da.data[i] - db.data[i]) + Math.abs(da.data[i + 1] - db.data[i + 1]) + Math.abs(da.data[i + 2] - db.data[i + 2]);
          if (d > 48) { n++; db.data[i] = 255; db.data[i + 1] = 0; db.data[i + 2] = 0; }
        }
        if (!n) return { pc: 0 };
        g.putImageData(db, 0, 0);
        return { pc: (100 * n) / (c.width * c.height), diff: c.toDataURL("image/png").split(",")[1] };
      }, [a.toString("base64"), b.toString("base64")]);
      if (r.taille) cases.push("taille " + r.taille);
      else {
        cases.push(r.pc ? r.pc.toFixed(2) + " %" : "identique");
        if (r.diff) await writeFile(DOSSIER_CAPTURES + "diff/" + f, Buffer.from(r.diff, "base64"));
      }
    }
    lignes.push([nom, ...cases]);
  }
  console.log("\n" + ["page".padEnd(18), ...LARGEURS.map((l) => String(l).padEnd(22))].join(" "));
  for (const l of lignes) console.log([l[0].padEnd(18), ...l.slice(1).map((c) => c.padEnd(22))].join(" "));
  if (reference) {
    for (const f of await readdir(DOSSIER_CAPTURES + "derniere")) await copyFile(DOSSIER_CAPTURES + "derniere/" + f, DOSSIER_CAPTURES + "reference/" + f);
    console.log("\n✔ Cette série est la nouvelle référence (captures/reference/).");
  }
  console.log(`\nImages : ${DOSSIER_CAPTURES}`);
  await browser.close();
  serveur.close();
}
main().catch((e) => { console.error(e); process.exit(1); });

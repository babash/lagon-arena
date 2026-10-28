// =====================================================================
//  Lagon Arena — visionneuse de match réutilisable
//  lagon animé + barre de lecture + « pensée de la tortue » (code et capteurs)
//  Utilisée par le tutoriel, le bac à sable et les résultats élève.
// =====================================================================
import { Lagon, Player, controles } from "./render.js";
import { CodeView, capteursHTML } from "./editor.js";
import { rapport } from "./engine.js";
import { el, esc } from "./common.js";

const jourDe = (tick, depart) => Math.floor((depart + tick * 24 / 60) / 24) + 1;

export class MatchViewer {
  /**
   * @param container élément qui recevra la visionneuse
   * @param opts { sim, focus (id de la tortue suivie), code (son code), vitesse, autoplay,
   *               pensee (afficher le code et les capteurs), noms }
   */
  constructor(container, { sim, focus = null, code = null, vitesse = 2.4, autoplay = true, pensee = true, noms = true, marqueurs = null, controles: avecControles = true, zoom = 1 } = {}) {
    this.container = container; this.sim = sim; this.focus = focus; this.code = code;
    container.innerHTML = "";
    const box = el("div", { class: "lagon-box" });
    const canvas = el("canvas");
    this.hud = el("div", { class: "hud" });
    box.append(canvas, this.hud);
    container.append(box);
    this.lagon = new Lagon(canvas, { noms });
    const rp = focus ? rapport(sim, focus) : null;
    this.player = new Player(this.lagon, sim, { vitesse, focus, onTick: (t) => this.onTick(t) });
    this.player.zoom = zoom;
    this.ctrl = avecControles ? controles(this.player, marqueurs || (rp ? rp.marqueurs : [])) : null;
    if (this.ctrl) container.append(this.ctrl);
    if (pensee && focus) {
      const p = el("div", { class: "pensee" });
      const cv = el("div"); this.capt = el("div", { class: "capteurs" });
      p.append(cv, this.capt);
      container.append(el("h3", { class: "titre-pensee" }, "🧠 Dans la tête de ta tortue"),
        el("p", { class: "petit muted", style: "margin:0 0 6px" }, "Les lignes vertes sont des conditions vraies (True), les rouges sont fausses (False), la ligne jaune est l'action exécutée."),
        p);
      this.cv = new CodeView(cv);
      this.cv.setCode(code || "");
    }
    this.onTick(0);
    if (autoplay) this.player.play();
  }
  onTick(t) {
    const fr = this.sim.frames[Math.min(t, this.sim.frames.length - 1)];
    let txt = `<span class="pill">Jour ${jourDe(t, this.sim.heureDepart)} · ${fr.heure} h ${fr.nuit ? "🌙" : "☀️"}</span>`;
    const i = this.focus ? this.sim.tortues.findIndex((x) => x.id === this.focus) : -1;
    if (i >= 0) {
      const tt = fr.tortues[i];
      txt += `<span class="pill">⚡ ${tt[2]}</span><span class="pill">🥚 ${tt[3]}</span>`;
    }
    this.hud.innerHTML = txt;
    if (this.cv) {
      const rec = this.sim.traces[this.focus] && this.sim.traces[this.focus][t];
      this.cv.montrer(rec);
      this.capt.innerHTML = capteursHTML(rec, t, this.code || "");
    }
  }
  destroy() { this.player.destroy(); this.lagon.destroy(); if (this.ctrl) this.ctrl.detruire(); this.container.innerHTML = ""; }
  suivre(id) { this.focus = id; this.player.focus = id; this.onTick(this.player.lastTick < 0 ? 0 : this.player.lastTick); }
}

// texte avec `code` → <code>code</code>
export const codeTxt = (t) => esc(t).replace(/`([^`]+)`/g, "<code>$1</code>");

// Bloc « rapport du match » : ce qui s'est passé + conseils
export function rapportHTML(sim, id) {
  const r = rapport(sim, id);
  if (!r) return "";
  return `<div class="rapport"><ul>${r.lignes.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` +
    r.conseils.map((c) => `<div class="conseil">💡 ${codeTxt(c)}</div>`).join("") + "</div>";
}

// Tableau de classement d'un match (tous les participants)
export function tableauMatch(sim, moi = null, estBot = () => false, rangs = null) {
  const rows = sim.resultats.map((r) => `<tr class="${r.id === moi ? "moi" : ""} ${estBot(r.id) ? "bot" : ""}">
    <td class="num">${rangs ? (estBot(r.id) ? "🤖" : rangs[r.id] ?? "") : r.rang}</td><td><span class="swatch" style="background:${r.couleur}"></span>${esc(r.nom)}</td>
    <td class="num">${r.nids}</td><td class="num">${r.captures}</td></tr>`).join("");
  return `<table class="scores"><tr><th class="num">#</th><th>Tortue</th><th class="num">🥚 Nids</th><th class="num">🦈 Attrapée</th></tr>${rows}</table>`;
}

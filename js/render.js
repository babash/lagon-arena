// =====================================================================
//  Lagon Arena — dessin du lagon (canvas) et lecteur de match
// =====================================================================
import { MAP, W, H, tileAt } from "./engine.js";

const TAU = Math.PI * 2;
function hash(x, y, s = 0) { let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
const lerp = (a, b, u) => a + (b - a) * u;

// ---------------------------------------------------------------------
export class Lagon {
  constructor(canvas, { noms = true } = {}) {
    this.canvas = canvas; this.ctx = canvas.getContext("2d"); this.noms = noms;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cell = 0; this.bg = null;
    this.resize();
    this._ro = new ResizeObserver(() => { const old = this.cell; this.resize(); if (this.cell !== old && this.last) this.draw(...this.last); });
    this._ro.observe(canvas.parentElement);
  }
  destroy() { this._ro.disconnect(); }
  resize() {
    const w = Math.max(240, this.canvas.parentElement.clientWidth);
    this.cell = w / W;
    this.canvas.width = Math.round(w * this.dpr); this.canvas.height = Math.round(this.cell * H * this.dpr);
    this.canvas.style.height = this.cell * H + "px";
    this.bg = this.fond();
  }

  // ---------- décor fixe ----------
  fond() {
    const c = this.cell, off = document.createElement("canvas");
    off.width = this.canvas.width; off.height = this.canvas.height;
    const g = off.getContext("2d"); g.scale(this.dpr, this.dpr);
    // eau : plus claire près des côtes, plus profonde vers le large (à l'est)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const prof = x / W, n = hash(x, y) * 0.06;
      g.fillStyle = `hsl(${186 + prof * 10}, ${68 - prof * 8}%, ${50 - prof * 16 + n * 100}%)`;
      g.fillRect(x * c, y * c, c + 1, c + 1);
    }
    // reflets
    g.strokeStyle = "rgba(255,255,255,.13)"; g.lineWidth = Math.max(1, c * 0.05);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (tileAt(x, y) === "eau" && hash(x, y, 7) < 0.35) {
      const cx = (x + hash(x, y, 2)) * c, cy = (y + hash(x, y, 3)) * c;
      g.beginPath(); g.arc(cx, cy, c * 0.28, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = tileAt(x, y), px = x * c, py = y * c;
      if (t === "plage") {
        g.fillStyle = "#f3deaa"; g.fillRect(px, py, c + 1, c + 1);
        g.fillStyle = "rgba(190,150,80,.35)";
        for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(px + hash(x, y, k) * c, py + hash(x, y, k + 9) * c, c * 0.035, 0, TAU); g.fill(); }
        // écume côté eau
        g.strokeStyle = "rgba(255,255,255,.75)"; g.lineWidth = Math.max(1.5, c * 0.08);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < W && ny < H && tileAt(nx, ny) !== "plage") {
            g.beginPath();
            if (dx === 1) { g.moveTo(px + c, py); g.lineTo(px + c, py + c); }
            if (dx === -1) { g.moveTo(px, py); g.lineTo(px, py + c); }
            if (dy === 1) { g.moveTo(px, py + c); g.lineTo(px + c, py + c); }
            if (dy === -1) { g.moveTo(px, py); g.lineTo(px + c, py); }
            g.stroke();
          }
        }
      }
      if (t === "herbier") {
        g.fillStyle = "rgba(25,110,70,.38)";
        g.beginPath(); g.ellipse(px + c / 2, py + c / 2, c * 0.48, c * 0.44, 0, 0, TAU); g.fill();
      }
      if (t === "corail") {
        const cols = ["#ff8a6b", "#ff6f91", "#ffb37a", "#f25f5c"];
        for (let k = 0; k < 5; k++) {
          g.fillStyle = cols[Math.floor(hash(x, y, k + 20) * cols.length)];
          g.beginPath(); g.arc(px + c * (0.2 + 0.6 * hash(x, y, k)), py + c * (0.2 + 0.6 * hash(x, y, k + 5)), c * (0.16 + 0.12 * hash(x, y, k + 11)), 0, TAU); g.fill();
        }
        g.fillStyle = "rgba(255,255,255,.45)";
        for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(px + c * hash(x, y, k + 30), py + c * hash(x, y, k + 40), c * 0.03, 0, TAU); g.fill(); }
      }
    }
    return off;
  }

  // ---------- éléments mobiles ----------
  tortue(g, x, y, s, couleur, dir, { alpha = 1, gris = false } = {}) {
    g.save(); g.translate(x, y); g.rotate([-Math.PI / 2, 0, Math.PI / 2, Math.PI][dir || 0]); g.globalAlpha = alpha;
    const peau = gris ? "#b9c2c9" : "#8fd694";
    g.fillStyle = peau;
    for (const [fx, fy, r] of [[0.18, -0.3, -0.6], [0.18, 0.3, 0.6], [-0.26, -0.26, 0.6], [-0.26, 0.26, -0.6]]) {
      g.save(); g.translate(fx * s, fy * s); g.rotate(r); g.beginPath(); g.ellipse(0, 0, s * 0.17, s * 0.08, 0, 0, TAU); g.fill(); g.restore();
    }
    g.beginPath(); g.arc(s * 0.36, 0, s * 0.12, 0, TAU); g.fill();               // tête
    g.fillStyle = gris ? "#8c979f" : couleur;
    g.strokeStyle = "rgba(0,0,0,.55)"; g.lineWidth = Math.max(1, s * 0.05);
    g.beginPath(); g.ellipse(0, 0, s * 0.3, s * 0.24, 0, 0, TAU); g.fill(); g.stroke();   // carapace
    g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = Math.max(0.8, s * 0.03);
    g.beginPath(); g.moveTo(-s * 0.12, -s * 0.12); g.lineTo(s * 0.1, 0); g.lineTo(-s * 0.12, s * 0.12); g.stroke();
    g.fillStyle = "#10233a"; g.beginPath(); g.arc(s * 0.41, -s * 0.05, s * 0.022, 0, TAU); g.arc(s * 0.41, s * 0.05, s * 0.022, 0, TAU); g.fill();
    g.restore();
  }
  requin(g, x, y, s, fx, fy, repos) {
    const a = Math.atan2(fy || 0, fx || 1);
    g.save(); g.translate(x, y); g.rotate(a); g.globalAlpha = repos ? 0.55 : 1;
    g.fillStyle = "#5b7083";
    g.beginPath(); g.moveTo(-s * 0.48, 0); g.lineTo(-s * 0.68, -s * 0.2); g.lineTo(-s * 0.62, 0); g.lineTo(-s * 0.68, s * 0.2); g.closePath(); g.fill();   // queue
    g.beginPath(); g.ellipse(0, 0, s * 0.5, s * 0.17, 0, 0, TAU); g.fill();
    g.fillStyle = "#d9e4ea"; g.beginPath(); g.ellipse(s * 0.05, s * 0.06, s * 0.36, s * 0.07, 0, 0, TAU); g.fill();
    g.fillStyle = "#3e5163"; g.beginPath(); g.moveTo(-s * 0.05, 0); g.lineTo(-s * 0.22, -s * 0.3); g.lineTo(s * 0.12, 0); g.closePath(); g.fill();   // aileron
    g.fillStyle = "#fff"; g.beginPath(); g.arc(s * 0.36, -s * 0.06, s * 0.035, 0, TAU); g.fill();
    g.restore();
    if (repos) { g.fillStyle = "rgba(255,255,255,.9)"; g.font = `bold ${Math.round(s * 0.32)}px Nunito, sans-serif`; g.fillText("z", x + s * 0.25, y - s * 0.35); }
  }
  sac(g, x, y, s) {
    g.save(); g.translate(x, y); g.globalAlpha = 0.92;
    g.fillStyle = "rgba(255,255,255,.95)"; g.strokeStyle = "rgba(90,110,130,.9)"; g.lineWidth = Math.max(1, s * 0.04);
    g.beginPath(); g.moveTo(-s * 0.2, -s * 0.12); g.lineTo(s * 0.2, -s * 0.12); g.lineTo(s * 0.24, s * 0.24); g.lineTo(-s * 0.24, s * 0.24); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.arc(-s * 0.1, -s * 0.12, s * 0.07, Math.PI, 0); g.arc(s * 0.1, -s * 0.12, s * 0.07, Math.PI, 0); g.stroke();
    g.restore();
  }
  algues(g, x, y, s, n, temps) {
    const blades = n * 3;
    for (let k = 0; k < blades; k++) {
      const bx = x + (hash(x, y, k) - 0.5) * s * 0.7, by = y + s * 0.3;
      const h = s * (0.35 + 0.25 * hash(x, y, k + 3));
      const sway = Math.sin(temps * 2 + k + x) * s * 0.06;
      g.strokeStyle = k % 2 ? "#3fbf6f" : "#2c9a57"; g.lineWidth = Math.max(1.5, s * 0.07); g.lineCap = "round";
      g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + sway, by - h * 0.6, bx + sway * 2, by - h); g.stroke();
    }
  }
  nid(g, x, y, s, couleur) {
    g.fillStyle = "rgba(120,85,40,.35)"; g.beginPath(); g.ellipse(x, y + s * 0.05, s * 0.2, s * 0.12, 0, 0, TAU); g.fill();
    g.fillStyle = "#fffaf0"; g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 1;
    for (const [dx, dy] of [[-0.07, 0], [0.07, 0], [0, -0.06]]) { g.beginPath(); g.ellipse(x + dx * s, y + dy * s, s * 0.06, s * 0.075, 0, 0, TAU); g.fill(); g.stroke(); }
    g.fillStyle = couleur; g.beginPath(); g.arc(x + s * 0.14, y - s * 0.1, s * 0.05, 0, TAU); g.fill();
  }

  // ---------- image complète à l'instant f (nombre de tours, à virgule) ----------
  draw(sim, f, opts = {}) {
    this.last = [sim, f, opts];
    const g = this.ctx, c = this.cell, d = this.dpr;
    const n = sim.frames.length - 1;
    f = Math.max(0, Math.min(n, f));
    const k = Math.min(Math.floor(f), n), u = f - k, A = sim.frames[k], B = sim.frames[Math.min(k + 1, n)];
    // zoom (facultatif) centré sur la tortue suivie
    const z = opts.zoom && opts.focus ? opts.zoom : 1;
    let tx = 0, ty = 0;
    if (z > 1) {
      const i = sim.tortues.findIndex((t) => t.id === opts.focus);
      if (i >= 0) {
        const a = A.tortues[i], b = B.tortues[i];
        const fx = (lerp(a[0], b[0], u) + 0.5) * c, fy = (lerp(a[1], b[1], u) + 0.5) * c, Wp = W * c, Hp = H * c;
        tx = Math.min(0, Math.max(Wp - Wp * z, Wp / 2 - fx * z));
        ty = Math.min(0, Math.max(Hp - Hp * z, Hp / 2 - fy * z));
      }
    }
    g.setTransform(d * z, 0, 0, d * z, tx * d, ty * d);
    g.drawImage(this.bg, 0, 0, this.canvas.width / d, this.canvas.height / d);
    const temps = opts.temps ?? performance.now() / 1000;

    // touffes d'algues (elles bougent : on les dessine à chaque image)
    for (const [x, y, n] of A.herbes || []) {
      g.fillStyle = "rgba(25,110,70,.38)";
      g.beginPath(); g.ellipse((x + 0.5) * c, (y + 0.5) * c, c * 0.48, c * 0.44, 0, 0, TAU); g.fill();
      if (n > 0) this.algues(g, (x + 0.5) * c, (y + 0.5) * c, c, Math.min(3, n), temps);
    }
    // nids pondus jusqu'ici
    const parCase = {};
    for (const nd of sim.nids) {
      if (nd.tick >= f || (nd.perdu != null && nd.perdu < f)) continue;
      const key = nd.x + "," + nd.y, i = (parCase[key] = (parCase[key] || 0) + 1) - 1;
      const ox = ((i % 3) - 1) * 0.28, oy = (Math.floor(i / 3) % 3 - 1) * 0.28;
      const t = sim.tortues.find((t) => t.id === nd.id);
      this.nid(g, (nd.x + 0.5 + ox) * c, (nd.y + 0.5 + oy) * c, c, t ? t.couleur : "#fff");
    }
    for (const [x, y] of A.plastiques) this.sac(g, (x + 0.5) * c, (y + 0.5) * c, c);

    // tortues
    const focus = opts.focus;
    sim.tortues.forEach((t, i) => {
      const a = A.tortues[i], b = B.tortues[i];
      const saut = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) > 1;
      const x = saut ? a[0] : lerp(a[0], b[0], u), y = saut ? a[1] : lerp(a[1], b[1], u);
      const px = (x + 0.5) * c, py = (y + 0.5) * c;
      const bloquee = a[4] > 0, immun = a[5] > 0 && !bloquee, cachee = a[7] === 1;
      let alpha = bloquee ? 0.55 : cachee ? 0.6 : immun && Math.floor(temps * 6) % 2 ? 0.45 : 1;
      const gros = z > 1 && t.id === focus;   // en gros plan : tortue plus petite pour voir la case en dessous
      if (t.equipe) {   // halo de l'équipe (🔵 / 🔴)
        g.fillStyle = t.equipe === 1 ? "rgba(47,111,219,.55)" : "rgba(229,72,77,.55)";
        g.beginPath(); g.arc(px, py, c * 0.44, 0, TAU); g.fill();
      }
      if (t.id === focus) {
        g.strokeStyle = "#fff"; g.lineWidth = Math.max(2, c * 0.08);
        g.beginPath(); g.arc(px, py, c * (0.5 + 0.05 * Math.sin(temps * 5)), 0, TAU); g.stroke();
      }
      if (gros) this.tortue(g, px - c * 0.22, py - c * 0.22, c * 0.55, t.couleur, b[6] ?? a[6], { alpha, gris: bloquee });
      else this.tortue(g, px, py, c, t.couleur, b[6] ?? a[6], { alpha, gris: bloquee });
      if (bloquee) { g.font = `${Math.round(c * 0.4)}px sans-serif`; g.fillText("💫", px - c * 0.2, py - c * 0.3); }
      if (this.noms || t.id === focus) {
        const label = String(t.nom).slice(0, 12);
        g.font = `800 ${Math.max(9, Math.round(c * 0.3))}px Nunito, sans-serif`; g.textAlign = "center";
        g.lineWidth = 3; g.strokeStyle = "rgba(4,28,46,.85)"; g.strokeText(label, px, py - c * 0.42);
        g.fillStyle = t.id === focus ? "#ffe680" : "#fff"; g.fillText(label, px, py - c * 0.42); g.textAlign = "start";
      }
    });
    // requins
    A.requins.forEach((s, i) => {
      const e = B.requins[i] || s;
      const saut = Math.abs(s[0] - e[0]) + Math.abs(s[1] - e[1]) > 1;
      const x = saut ? (u < 0.5 ? s[0] : e[0]) : lerp(s[0], e[0], u), y = saut ? (u < 0.5 ? s[1] : e[1]) : lerp(s[1], e[1], u);
      this.requin(g, (x + 0.5) * c, (y + 0.5) * c, c, e[3], e[4], s[2] > 0);
    });
    // 💥 tortues poussées (pendant le tour où ça se passe)
    if (sim.events.length) for (const e of sim.events) {
      if (e.type !== "pousse" || e.tick !== k) continue;
      const i = sim.tortues.findIndex((t) => t.id === e.cible); if (i < 0) continue;
      const b = B.tortues[i];
      g.font = `${Math.round(c * 0.7)}px sans-serif`; g.globalAlpha = 1 - u * 0.6;
      g.fillText("💥", (b[0] + 0.15) * c, (b[1] + 0.35) * c); g.globalAlpha = 1;
    }
    // nuit
    const na = lerp(A.nuit ? 1 : 0, B.nuit ? 1 : 0, u);
    if (na > 0) {
      g.fillStyle = `rgba(8, 16, 60, ${0.45 * na})`; g.fillRect(0, 0, W * c, H * c);
      g.globalAlpha = na; g.font = `${Math.round(c * 0.9)}px sans-serif`; g.fillText("🌙", (W - 1.3) * c, c * 1.1); g.globalAlpha = 1;
    }
  }
}

// ---------------------------------------------------------------------
//  Lecteur : fait avancer le temps, redessine, prévient à chaque nouveau tour
// ---------------------------------------------------------------------
export class Player {
  constructor(lagon, sim, { vitesse = 2.4, focus = null, onTick = () => {}, onEnd = () => {} } = {}) {
    Object.assign(this, { lagon, sim, vitesse, focus, onTick, onEnd });
    this.f = 0; this.playing = false; this.lastTick = -1; this.prev = null;
    this.loop = this.loop.bind(this); this.raf = requestAnimationFrame(this.loop);
  }
  get ticks() { return this.sim.frames.length - 1; }
  loop(ts) {
    const dt = this.prev == null ? 0 : Math.min(0.1, (ts - this.prev) / 1000);
    this.prev = ts;
    if (this.playing) {
      this.f += dt * this.vitesse;
      if (this.f >= this.ticks) { this.f = this.ticks; this.playing = false; this.lagon.draw(this.sim, this.f, { focus: this.focus, zoom: this.zoom }); this.tick(); this.onEnd(); }
    }
    this.lagon.draw(this.sim, this.f, { focus: this.focus, zoom: this.zoom });
    this.tick();
    this.raf = requestAnimationFrame(this.loop);
  }
  tick() { const t = Math.min(this.ticks - 1, Math.floor(this.f)); if (t !== this.lastTick) { this.lastTick = t; this.onTick(t); } }
  play() { if (this.f >= this.ticks) this.f = 0; this.playing = true; }
  pause() { this.playing = false; }
  toggle() { this.playing ? this.pause() : this.play(); }
  seek(t) { this.f = Math.max(0, Math.min(this.ticks, t)); }
  fin() { this.f = this.ticks; }
  destroy() { cancelAnimationFrame(this.raf); }
}

// ---------------------------------------------------------------------
//  Barre de contrôle : lecture/pause, vitesse, frise avec les événements
// ---------------------------------------------------------------------
const ICONES = { nid: "🥚", capture: "🦈", plastique: "🛍️", epuisee: "😵", pousse: "💥", don: "🎁" };
export function controles(player, marqueurs = []) {
  const btn = document.createElement("button"); btn.className = "btn small"; btn.textContent = "▶ Lecture";
  const vit = document.createElement("select");
  for (const [v, l] of [[1.2, "lent"], [2.4, "normal"], [5, "rapide"], [12, "très rapide"]]) { const o = document.createElement("option"); o.value = v; o.textContent = l; if (v === player.vitesse) o.selected = true; vit.append(o); }
  const tl = document.createElement("div"); tl.className = "timeline";
  const range = document.createElement("input"); range.type = "range"; range.min = 0; range.max = player.ticks; range.step = 1; range.value = 0;
  const marks = document.createElement("div"); marks.className = "marks";
  for (const m of marqueurs) {
    const s = document.createElement("span"); s.className = "mk"; s.textContent = ICONES[m.type] || "•";
    s.style.left = (100 * m.tick / player.ticks) + "%"; s.title = `Tour ${m.tick}`;
    s.addEventListener("click", () => { player.pause(); player.seek(Math.max(0, m.tick - 2)); });
    marks.append(s);
  }
  tl.append(marks, range);
  const lab = document.createElement("span"); lab.className = "pill"; lab.style.background = "var(--lagon-pale)"; lab.style.color = "var(--ocean-800)";
  const box = document.createElement("div"); box.className = "controls";
  const prec = document.createElement("button"); prec.className = "btn small ghost"; prec.textContent = "◀ 1 tour"; prec.title = "Tour précédent";
  const suiv = document.createElement("button"); suiv.className = "btn small ghost"; suiv.textContent = "1 tour ▶"; suiv.title = "Tour suivant";
  box.append(btn, prec, suiv, vit, tl, lab);
  btn.addEventListener("click", () => player.toggle());
  prec.addEventListener("click", () => { player.pause(); player.seek(Math.floor(player.f) - 1); });
  suiv.addEventListener("click", () => { player.pause(); player.seek(Math.floor(player.f) + 1); });
  vit.addEventListener("change", () => { player.vitesse = +vit.value; });
  range.addEventListener("input", () => { player.pause(); player.seek(+range.value); });
  const maj = () => {
    btn.textContent = player.playing ? "⏸ Pause" : "▶ Lecture";
    range.value = Math.floor(player.f); lab.textContent = `Tour ${Math.min(player.ticks, Math.floor(player.f))} / ${player.ticks}`;
    box._raf = requestAnimationFrame(maj);
  };
  maj();
  box.detruire = () => cancelAnimationFrame(box._raf);
  return box;
}

// petite icône dessinée (légende du tutoriel)
export function icone(canvas, type) {
  const s = 40, d = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = s * d; canvas.height = s * d; const g = canvas.getContext("2d"); g.scale(d, d);
  const L = Object.create(Lagon.prototype);
  const fonds = { eau: "#2bb3c3", corail: "#2bb3c3", herbier: "#2aa9a0", plage: "#f3deaa", requin: "#1f9fb2", tortue: "#2bb3c3", sac: "#2bb3c3", nid: "#f3deaa", nuit: "#1c2b5a" };
  g.fillStyle = fonds[type] || "#2bb3c3"; g.fillRect(0, 0, s, s);
  if (type === "corail") { for (const [x, y, r, col] of [[12, 14, 8, "#ff8a6b"], [26, 12, 7, "#ff6f91"], [20, 26, 9, "#ffb37a"], [30, 28, 6, "#f25f5c"]]) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); } }
  if (type === "herbier") L.algues.call(L, g, 20, 22, 40, 3, 1);
  if (type === "requin") L.requin.call(L, g, 22, 20, 40, 1, 0, false);
  if (type === "tortue") L.tortue.call(L, g, 20, 20, 40, "#ff7b5c", 1);
  if (type === "sac") L.sac.call(L, g, 20, 20, 40);
  if (type === "nid") L.nid.call(L, g, 20, 22, 40, "#ff7b5c");
  if (type === "nuit") { g.font = "24px sans-serif"; g.fillText("🌙", 7, 29); }
}

export { MAP };

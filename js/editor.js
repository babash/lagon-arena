// =====================================================================
//  Lagon Arena — éditeur de code (coloration, indentation automatique)
//  et vue « pensée de la tortue » (lignes exécutées, conditions vraies/fausses)
// =====================================================================
import { SENSORS, ACTIONS } from "./interp.js";
import { esc } from "./common.js";

const KW = new Set(["if", "elif", "else", "and", "or", "not", "def", "pass", "return"]);
export function colorer(code) {
  return code.split("\n").map((ligne) => {
    let out = "", i = 0;
    const h = ligne.indexOf("#");
    const corps = h >= 0 ? ligne.slice(0, h) : ligne, com = h >= 0 ? ligne.slice(h) : "";
    const re = /([A-Za-z_À-ÿ][A-Za-z_0-9À-ÿ]*)|(\d+(?:\.\d+)?)|(==|!=|<=|>=|[<>=+\-*/%])/g;
    let m;
    while ((m = re.exec(corps))) {
      out += esc(corps.slice(i, m.index)); i = re.lastIndex;
      if (m[1]) {
        const w = m[1];
        if (KW.has(w)) out += `<span class="tok-kw">${w}</span>`;
        else if (w === "True" || w === "False") out += `<span class="tok-bool">${w}</span>`;
        else if (w in SENSORS) out += `<span class="tok-sens">${w}</span>`;
        else if (ACTIONS.includes(w)) out += `<span class="tok-act">${w}</span>`;
        else out += esc(w);
      } else if (m[2]) out += `<span class="tok-num">${m[2]}</span>`;
      else out += `<span class="tok-op">${esc(m[3])}</span>`;
    }
    out += esc(corps.slice(i));
    if (com) out += `<span class="tok-com">${esc(com)}</span>`;
    return out;
  });
}

export class CodeEditor {
  constructor(container, { value = "", onChange = () => {} } = {}) {
    this.onChange = onChange; this.errLine = null;
    container.innerHTML = "";
    this.root = document.createElement("div"); this.root.className = "editor";
    this.gutter = document.createElement("div"); this.gutter.className = "gutter";
    const wrap = document.createElement("div"); wrap.className = "code-wrap";
    this.pre = document.createElement("pre"); this.pre.className = "hl"; this.pre.setAttribute("aria-hidden", "true");
    this.ta = document.createElement("textarea");
    Object.assign(this.ta, { spellcheck: false, autocomplete: "off" });
    this.ta.setAttribute("autocapitalize", "off"); this.ta.setAttribute("wrap", "off"); this.ta.setAttribute("aria-label", "Code de ta tortue");
    wrap.append(this.pre, this.ta); this.root.append(this.gutter, wrap); container.append(this.root);
    this.ta.value = value;
    this.ta.addEventListener("input", () => { this.errLine = null; this.render(); this.onChange(this.ta.value); });
    this.ta.addEventListener("keydown", (e) => this.touche(e));
    this.render();
  }
  get value() { return this.ta.value; }
  set value(v) { this.ta.value = v; this.render(); }
  setErreur(n) { this.errLine = n; this.render(); }
  render() {
    const lignes = colorer(this.ta.value);
    this.pre.innerHTML = lignes.map((l, i) => (i + 1 === this.errLine ? `<span class="ln-err">${l || " "}</span>` : l)).join("\n") + "\n";
    this.gutter.innerHTML = lignes.map((_, i) => (i + 1 === this.errLine ? `<span class="errl">${i + 1}</span>` : i + 1)).join("\n");
    const maxLen = Math.max(...this.ta.value.split("\n").map((l) => l.length), 20);
    this.ta.style.minWidth = this.pre.style.minWidth = `calc(${maxLen + 3}ch + 28px)`;
    this.ta.style.height = "auto"; this.ta.style.height = this.ta.scrollHeight + "px";
  }
  insere(txt, debut, fin) {
    this.ta.setRangeText(txt, debut, fin, "end");
    this.ta.dispatchEvent(new Event("input"));
  }
  touche(e) {
    const ta = this.ta, v = ta.value, s = ta.selectionStart, f = ta.selectionEnd;
    if (e.key === "Tab") {
      e.preventDefault();
      const deb = v.lastIndexOf("\n", s - 1) + 1;
      if (s === f && !e.shiftKey) { this.insere("    ", s, f); return; }
      const finL = v.indexOf("\n", f - (f > s && v[f - 1] === "\n" ? 1 : 0)); const fin = finL < 0 ? v.length : finL;
      const bloc = v.slice(deb, fin).split("\n");
      const nouveau = bloc.map((l) => (e.shiftKey ? l.replace(/^ {1,4}/, "") : "    " + l)).join("\n");
      ta.setRangeText(nouveau, deb, fin, "select"); ta.dispatchEvent(new Event("input"));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const deb = v.lastIndexOf("\n", s - 1) + 1, ligne = v.slice(deb, s);
      let ind = ligne.match(/^ */)[0];
      if (/:\s*(#.*)?$/.test(ligne)) ind += "    ";
      this.insere("\n" + ind, s, f);
    } else if (e.key === "Backspace" && s === f) {
      const deb = v.lastIndexOf("\n", s - 1) + 1, avant = v.slice(deb, s);
      if (avant.length >= 4 && /^ +$/.test(avant) && avant.length % 4 === 0) { e.preventDefault(); this.insere("", s - 4, s); }
    }
  }
}

// ---------------------------------------------------------------------
export class CodeView {
  constructor(container) { this.box = document.createElement("div"); this.box.className = "codeview"; container.innerHTML = ""; container.append(this.box); }
  setCode(code) {
    this.lignes = colorer(code.replace(/\s+$/, ""));
    this.box.innerHTML = this.lignes.map((l, i) => `<span class="l" data-n="${i + 1}"><span class="n">${i + 1}</span>${l || " "}</span>`).join("");
  }
  montrer(rec) {
    for (const s of this.box.querySelectorAll(".l")) { s.classList.remove("vrai", "faux", "act"); const t = s.querySelector(".tag"); if (t) t.remove(); }
    if (!rec || rec.bloquee) return;
    const tag = (n, cls, txt) => {
      const s = this.box.querySelector(`.l[data-n="${n}"]`); if (!s) return;
      s.classList.add(cls); const t = document.createElement("span"); t.className = "tag"; t.textContent = txt; s.append(t);
    };
    for (const [n, v] of rec.conds || []) tag(n, v ? "vrai" : "faux", v ? "True" : "False");
    if (rec.ligne) tag(rec.ligne, "act", "action !");
    const cible = rec.ligne || (rec.conds && rec.conds.length ? rec.conds[rec.conds.length - 1][0] : null);
    const el = cible && this.box.querySelector(`.l[data-n="${cible}"]`);
    if (el && this.box.scrollHeight > this.box.clientHeight) {
      const top = el.offsetTop - this.box.clientHeight / 2;
      this.box.scrollTop = Math.max(0, top);
    }
  }
}

// tableau des capteurs vus par la tortue à un tour donné
const NOMS_CAPTEURS = ["requin_proche", "algue_ici", "plastique_ici", "sur_plage", "est_la_nuit", "energie", "heure"];
export function capteursHTML(rec, tick) {
  if (!rec) return "";
  if (rec.bloquee) return `<h4>Tour ${tick}</h4><p><b>💫 Bloquée</b> : la tortue vient d'être attrapée ou épuisée, elle attend.</p>`;
  if (!rec.capteurs) return `<h4>Tour ${tick}</h4><p class="effet mal">${esc(rec.erreur || "")}</p>`;
  const rows = NOMS_CAPTEURS.map((k) => {
    const v = rec.capteurs[k];
    const txt = typeof v === "boolean" ? (v ? "True" : "False") : v;
    return `<tr><td><code>${k}()</code></td><td class="${typeof v === "boolean" ? "v-" + v : ""}">${txt}</td></tr>`;
  }).join("");
  const mal = /refusé|plastique|ATTRAPÉE|ÉPUISÉE|rien|aucune|plus faim|il faudrait/.test(rec.effet || "");
  return `<h4>Tour ${tick} : ce que voit la tortue</h4><table>${rows}</table>` +
    `<div class="effet ${mal ? "mal" : ""}">${rec.action ? "→ " + esc(rec.action) + "()" : "→ aucune action"}${rec.effet ? " : " + esc(rec.effet) : ""}</div>` +
    (rec.erreur ? `<div class="effet mal">${esc(rec.erreur)}</div>` : "") +
    (rec.extra ? `<div class="petit muted">Les autres actions du même tour sont ignorées (une seule action par tour).</div>` : "");
}

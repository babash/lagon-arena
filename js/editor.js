// =====================================================================
//  Lagon Arena — éditeur de code pour grands débutants
//   • coloration, numéros de ligne, indentation automatique (Tab, Entrée) ;
//   • AUTOCOMPLÉTION : on tape le début d'un mot (ou un mot français :
//     « si », « sinon », « nuit », « plage »…) et l'éditeur propose la suite,
//     avec le rôle de chaque primitive ;
//   • barre d'info : le rôle du mot sous le curseur ;
//   • les deux-points oubliés après if / elif / else sont ajoutés à « Entrée ».
//  + boîte à outils cliquable (capteurs, actions, mots-clés)
//  + vue « pensée de la tortue » (lignes exécutées, conditions vraies/fausses)
// =====================================================================
import { SENSORS, ACTIONS } from "./interp.js";
import { INFO, CAPTEURS, ACTIONS_INFO, MOTS, estAvance, visible } from "./primitives.js";
import { esc, copier } from "./common.js";

const KW = new Set(["if", "elif", "else", "and", "or", "not", "def", "pass", "return"]);

// ---------------------------------------------------------------------
//  Chaîne if / elif / else : toutes les lignes qui vont ensemble
//  (même décalage, dans le même bloc). Renvoie {lignes:[…], niveau} ou null.
// ---------------------------------------------------------------------
const motCle = (l) => (l.match(/^\s*(if|elif|else)\b/) || [])[1];
const decalage = (l) => l.match(/^ */)[0].length;
export function chaineIf(lignes, c) {
  if (c < 0 || c >= lignes.length || !motCle(lignes[c])) return null;
  const n0 = decalage(lignes[c]);
  let debut = c;
  if (motCle(lignes[c]) !== "if") {
    debut = -1;
    for (let j = c - 1; j >= 0; j--) {
      const l = lignes[j]; if (!l.trim() || /^\s*#/.test(l)) continue;
      const d = decalage(l);
      if (d > n0) continue;
      if (d < n0) break;
      const k = motCle(l);
      if (k === "if") { debut = j; break; }
      if (k === "elif") continue;
      break;
    }
    if (debut < 0) return null;
  }
  const res = [debut];
  for (let j = debut + 1; j < lignes.length; j++) {
    const l = lignes[j]; if (!l.trim() || /^\s*#/.test(l)) continue;
    const d = decalage(l);
    if (d > n0) continue;
    if (d < n0) break;
    const k = motCle(l);
    if (k === "elif" || k === "else") { res.push(j); if (k === "else") break; continue; }
    break;
  }
  return { lignes: res, niveau: n0 / 4, debut, fin: res[res.length - 1] };
}

// Coloration + guides d'indentation (un trait vertical coloré par niveau de décalage)
export function colorer(code, { chaine = null } = {}) {
  return code.split("\n").map((ligne, numL) => {
    const lead = ligne.match(/^ */)[0].length, niv = Math.floor(lead / 4);
    const dansChaine = chaine && numL > chaine.debut && numL <= chaine.fin;
    let out = "";
    for (let k = 0; k < niv; k++) out += `<span class="ind n${k % 4}${dansChaine && k === chaine.niveau ? " actif" : ""}">    </span>`;
    let i = niv * 4;
    const h = ligne.indexOf("#");
    const corps = h >= 0 ? ligne.slice(0, h) : ligne, com = h >= 0 ? ligne.slice(Math.max(h, i)) : "";
    const re = /([A-Za-z_À-ÿ][A-Za-z_0-9À-ÿ]*)|(\d+(?:\.\d+)?)|(==|!=|<=|>=|[<>=+\-*/%])/g;
    re.lastIndex = i;
    let m, premier = true;
    const surChaine = chaine && chaine.lignes.includes(numL);
    while ((m = re.exec(corps))) {
      out += esc(corps.slice(i, m.index)); i = re.lastIndex;
      if (m[1]) {
        const w = m[1];
        if (KW.has(w) && premier && surChaine) out += `<span class="tok-kw chaine">${w}</span>`;
        else if (KW.has(w)) out += `<span class="tok-kw">${w}</span>`;
        else if (w === "True" || w === "False") out += `<span class="tok-bool">${w}</span>`;
        else if (w in SENSORS) out += `<span class="tok-sens">${w}</span>`;
        else if (ACTIONS.includes(w)) out += `<span class="tok-act">${w}</span>`;
        else out += esc(w);
      } else if (m[2]) out += `<span class="tok-num">${m[2]}</span>`;
      else out += `<span class="tok-op">${esc(m[3])}</span>`;
      premier = false;
    }
    out += esc(corps.slice(i));
    if (com) out += `<span class="tok-com">${esc(com)}</span>`;
    return out;
  });
}

const sansAccent = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const AIDE_DEFAUT = "✍️ Tape le début d'un mot (ou en français : <i>si</i>, <i>sinon</i>, <i>nuit</i>…) : l'éditeur te propose la suite. <b>Entrée</b> pour choisir.";

export function infoHTML(nom) {
  const i = INFO[nom];
  if (!i) return "";
  if (i.type === "capteur") return `${i.icone} <code>${nom}()</code> <b>question</b> : ${esc(i.role)} <span class="muted">→ ${i.rep}</span>`;
  if (i.type === "action") return `${i.icone} <code>${nom}()</code> <b>action</b> : ${esc(i.role)}`;
  return `🔤 <code>${nom}</code> = « ${esc(i.fr)} » : ${esc(i.role)}`;
}

export class CodeEditor {
  constructor(container, { value = "", onChange = () => {}, info = true, avance = null } = {}) {
    this.onChange = onChange; this.errLine = null; this.avance = avance;   // avance : null = suivre le mode avancé
    this.ligneCurseur = -1;
    container.innerHTML = "";
    this.root = document.createElement("div"); this.root.className = "editor";
    this.gutter = document.createElement("div"); this.gutter.className = "gutter";
    const wrap = document.createElement("div"); wrap.className = "code-wrap"; this.wrap = wrap;
    this.pre = document.createElement("pre"); this.pre.className = "hl"; this.pre.setAttribute("aria-hidden", "true");
    this.ta = document.createElement("textarea");
    Object.assign(this.ta, { spellcheck: false, autocomplete: "off" });
    this.ta.setAttribute("autocapitalize", "off"); this.ta.setAttribute("autocorrect", "off");
    this.ta.setAttribute("wrap", "off"); this.ta.setAttribute("aria-label", "Code de ta tortue");
    wrap.append(this.pre, this.ta); this.root.append(this.gutter, wrap); container.append(this.root);
    const cp = document.createElement("button"); cp.type = "button"; cp.className = "copier"; cp.textContent = "📋 Copier";
    cp.title = "Copier tout le code"; cp.addEventListener("click", () => copier(this.ta.value));
    this.root.append(cp);
    if (info) { this.barre = document.createElement("div"); this.barre.className = "editor-info"; this.barre.innerHTML = AIDE_DEFAUT; container.append(this.barre); }
    this.popup = document.createElement("ul"); this.popup.className = "ac cache"; this.popup.setAttribute("role", "listbox");
    document.body.append(this.popup);
    this.choix = []; this.sel = 0;
    this.ta.value = value;
    this.ta.addEventListener("input", (e) => {
      this.errLine = null; this.render(); this.onChange(this.ta.value);
      if (e.inputType === "insertText" && e.data && /[\wÀ-ÿ]/.test(e.data)) this.proposer();
      else if (e.inputType === "deleteContentBackward" && this.ouvert()) this.proposer();
      else this.fermer();
    });
    this.ta.addEventListener("keydown", (e) => this.touche(e));
    this.ta.addEventListener("blur", () => setTimeout(() => { this.fermer(); this.render(); }, 150));
    this.ta.addEventListener("focus", () => this.render());
    for (const ev of ["click", "keyup"]) this.ta.addEventListener(ev, (e) => {
      if (!["ArrowUp", "ArrowDown"].includes(e.key) || this.popup.classList.contains("cache")) this.infoCurseur();
      const cl = this.ta.value.slice(0, this.ta.selectionStart).split("\n").length - 1;
      if (cl !== this.ligneCurseur) this.render();       // surligner le if / elif / else correspondant
    });
    wrap.addEventListener("scroll", () => this.fermer());
    window.addEventListener("resize", () => this.fermer());
    this.render();
  }
  get value() { return this.ta.value; }
  set value(v) { this.ta.value = v; this.errLine = null; this.render(); }
  setErreur(n) { this.errLine = n; this.render(); }
  focus() { this.ta.focus(); }
  render() {
    const v = this.ta.value;
    this.ligneCurseur = v.slice(0, this.ta.selectionStart).split("\n").length - 1;
    this.chaine = document.activeElement === this.ta ? chaineIf(v.split("\n"), this.ligneCurseur) : null;
    const lignes = colorer(v, { chaine: this.chaine });
    this.pre.innerHTML = lignes.map((l, i) => (i + 1 === this.errLine ? `<span class="ln-err">${l || " "}</span>` : l)).join("\n") + "\n";
    this.gutter.innerHTML = lignes.map((_, i) => (i + 1 === this.errLine ? `<span class="errl">${i + 1}</span>`
      : this.chaine && this.chaine.lignes.includes(i) ? `<span class="chl">${i + 1}</span>` : i + 1)).join("\n");
    const maxLen = Math.max(...this.ta.value.split("\n").map((l) => l.length), 20);
    this.ta.style.minWidth = this.pre.style.minWidth = `calc(${maxLen + 3}ch + 28px)`;
    this.ta.style.height = "auto"; this.ta.style.height = this.ta.scrollHeight + "px";
  }
  insere(txt, debut, fin, curseur = null) {
    this.ta.setRangeText(txt, debut, fin, "end");
    if (curseur != null) this.ta.selectionStart = this.ta.selectionEnd = debut + curseur;
    this.ta.dispatchEvent(new Event("input"));
  }

  // ---------- barre d'info ----------
  montrerInfo(html) { if (this.barre) this.barre.innerHTML = html || AIDE_DEFAUT; }
  infoCurseur() {
    if (this.ouvert() || (this.garderInfo && Date.now() < this.garderInfo)) return;
    const v = this.ta.value, s = this.ta.selectionStart;
    const motEn = (p) => { let a = p, b = p; while (a > 0 && /\w/.test(v[a - 1])) a--; while (b < v.length && /\w/.test(v[b])) b++; return v.slice(a, b); };
    let mot = motEn(s);
    if (!mot) { let p = s, k = 0; while (p > 0 && /[():]/.test(v[p - 1]) && k < 4) { p--; k++; } if (k) mot = motEn(p); }
    // ce else / elif va avec quel if ?
    const lignes = v.split("\n"), cl = v.slice(0, s).split("\n").length - 1, ch = chaineIf(lignes, cl);
    if (ch && ch.lignes.length > 1 && ["if", "elif", "else"].includes(mot)) {
      const k = motCle(lignes[cl]);
      const msg = k === "if" ? `Ce <code>if</code> continue avec ${ch.lignes.slice(1).map((n) => `<code>${motCle(lignes[n])}</code> (ligne ${n + 1})`).join(", ")}.`
        : `Ce <code>${k}</code> va avec le <code>if</code> de la <b>ligne ${ch.debut + 1}</b> : ils sont alignés (même décalage).`;
      this.montrerInfo("↔️ " + msg);
      return;
    }
    this.montrerInfo(INFO[mot] && this.voit(mot) ? infoHTML(mot) : null);
  }
  voit(nom) { const i = INFO[nom]; return !i || visible(i, this.avance); }

  // ---------- autocomplétion ----------
  contexte(avant) {
    const t = avant.trim();
    if (t === "") return "debut";
    if (/(^|\s)(if|elif|and|or|not)$/.test(t) || /[(=<>!]$/.test(t)) return "condition";
    return "autre";
  }
  suggestions(mot, avant) {
    const m = sansAccent(mot), ctx = this.contexte(avant);
    const out = [];
    for (const [nom, i] of Object.entries(INFO)) {
      if (!this.voit(nom)) continue;                                      // primitives avancées : seulement en mode avancé
      if (ctx === "condition" && i.type === "action") continue;           // une action n'est pas une question
      if (ctx === "debut" && i.type === "capteur") continue;              // un capteur seul ne fait rien
      if (ctx === "debut" && ["and", "or", "not", "True", "False"].includes(nom)) continue;
      if (ctx === "condition" && ["if", "elif", "else"].includes(nom)) continue;
      const n = sansAccent(nom), fr = i.fr ? sansAccent(i.fr) : "";
      let score = null;
      if (n.startsWith(m)) score = 0;
      else if (fr && fr.startsWith(m)) score = 1;
      else if (m.length >= 2 && n.includes(m)) score = 2;
      else if (m.length >= 2 && fr && fr.includes(m)) score = 3;
      if (score == null) continue;
      if (nom === mot) continue;                                          // déjà écrit en entier
      const bonus = (ctx === "condition" && i.type === "capteur") || (ctx === "debut" && i.type !== "capteur") ? -0.5 : 0;
      out.push({ nom, i, score: score + bonus });
    }
    out.sort((a, b) => a.score - b.score || a.nom.length - b.nom.length);
    return out.slice(0, 6);
  }
  motAvant() {
    const v = this.ta.value, s = this.ta.selectionStart;
    const debLigne = v.lastIndexOf("\n", s - 1) + 1;
    const avantCurseur = v.slice(debLigne, s);
    const m = avantCurseur.match(/[A-Za-zÀ-ÿ_][\wÀ-ÿ]*$/);
    if (!m) return null;
    return { mot: m[0], debut: s - m[0].length, avant: avantCurseur.slice(0, avantCurseur.length - m[0].length), debLigne };
  }
  proposer(force = false) {
    const w = this.motAvant();
    if (!w || (!force && w.mot.length < 1) || w.avant.includes("#")) return this.fermer();
    const apres = this.ta.value.slice(this.ta.selectionStart);
    if (/^[\w(]/.test(apres)) return this.fermer();                       // on est au milieu d'un mot
    this.choix = this.suggestions(w.mot, w.avant);
    if (!this.choix.length) return this.fermer();
    this.sel = 0; this.mot = w;
    this.dessinerPopup();
  }
  dessinerPopup() {
    this.popup.innerHTML = "";
    this.choix.forEach((c, k) => {
      const li = document.createElement("li");
      li.className = k === this.sel ? "on" : "";
      const nom = c.i.type === "mot" ? c.nom : c.nom + "()";
      li.innerHTML = `<span class="ic">${c.i.icone}</span><span class="nm">${nom}</span>` +
        (c.i.type === "mot" ? `<span class="fr">${esc(c.i.fr)}</span>` : "") +
        `<span class="rl">${esc(c.i.type === "mot" ? c.i.role : c.i.role)}</span>`;
      li.addEventListener("mousedown", (e) => { e.preventDefault(); this.sel = k; this.accepter(); });
      this.popup.append(li);
    });
    // position : sous le curseur (police à chasse fixe → calcul direct)
    const cs = getComputedStyle(this.ta);
    const mesure = document.createElement("span");
    mesure.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font-family:${cs.fontFamily};font-size:${cs.fontSize}`;
    mesure.textContent = "M".repeat(20); document.body.append(mesure);
    const cw = mesure.getBoundingClientRect().width / 20; mesure.remove();
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.55;
    const v = this.ta.value, s = this.mot.debut;
    const ligne = v.slice(0, s).split("\n").length - 1, col = s - (v.lastIndexOf("\n", s - 1) + 1);
    const r = this.ta.getBoundingClientRect();
    let x = r.left + parseFloat(cs.paddingLeft) + col * cw - 6, y = r.top + parseFloat(cs.paddingTop) + (ligne + 1) * lh + 2;
    this.popup.classList.remove("cache");
    const pw = this.popup.offsetWidth, ph = this.popup.offsetHeight;
    x = Math.max(4, Math.min(x, window.innerWidth - pw - 4));
    if (y + ph > window.innerHeight - 4) y = y - lh - ph - 4;
    this.popup.style.left = x + "px"; this.popup.style.top = y + "px";
    const c = this.choix[this.sel];
    if (c) { this.montrerInfo(infoHTML(c.nom)); this.garderInfo = 0; }
  }
  fermer() { this.popup.classList.add("cache"); this.choix = []; }
  ouvert() { return !this.popup.classList.contains("cache") && this.choix.length > 0; }

  // texte à insérer pour une primitive (et position du curseur dans ce texte)
  gabarit(nom, resteLigne) {
    const i = INFO[nom];
    const vide = resteLigne.trim() === "";
    if (i.type === "capteur" || i.type === "action") return { txt: nom + "()" };
    if ((nom === "if" || nom === "elif") && vide) return { txt: nom + " :", curseur: nom.length + 1 };
    if (nom === "else" && vide) return { txt: "else:" };
    if (["and", "or", "not"].includes(nom)) return { txt: nom + " " };
    return { txt: nom + (["if", "elif"].includes(nom) ? " " : "") };
  }
  accepter() {
    const c = this.choix[this.sel]; if (!c) return;
    const fin = this.ta.selectionStart, v = this.ta.value;
    const finLigne = v.indexOf("\n", fin) < 0 ? v.length : v.indexOf("\n", fin);
    const g = this.gabarit(c.nom, v.slice(fin, finLigne));
    this.fermer();
    this.insere(g.txt, this.mot.debut, fin, g.curseur);
    this.montrerInfo(infoHTML(c.nom));
    this.ta.focus();
  }
  // insertion depuis la boîte à outils (au curseur)
  insererPrimitive(nom) {
    const v = this.ta.value;
    let s = this.ta.selectionStart, f = this.ta.selectionEnd;
    const finLigne = v.indexOf("\n", f) < 0 ? v.length : v.indexOf("\n", f);
    const g = this.gabarit(nom, v.slice(f, finLigne));
    let txt = g.txt, cur = g.curseur;
    const prec = v[s - 1];
    if (prec && /[\w)]/.test(prec)) { txt = " " + txt; if (cur != null) cur++; }  // espace avant si besoin
    this.insere(txt, s, f, cur);
    this.montrerInfo(infoHTML(nom));
    this.ta.focus();
  }

  touche(e) {
    const ta = this.ta, v = ta.value, s = ta.selectionStart, f = ta.selectionEnd;
    if (this.ouvert()) {
      if (e.key === "ArrowDown") { e.preventDefault(); this.sel = (this.sel + 1) % this.choix.length; this.dessinerPopup(); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); this.sel = (this.sel - 1 + this.choix.length) % this.choix.length; this.dessinerPopup(); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); this.accepter(); return; }
      if (e.key === "Escape") { e.preventDefault(); this.fermer(); return; }
    }
    if (e.key === " " && e.ctrlKey) { e.preventDefault(); this.proposer(true); return; }
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
      const deb = v.lastIndexOf("\n", s - 1) + 1;
      let finL = v.indexOf("\n", s); if (finL < 0) finL = v.length;
      let pos = s;
      // curseur juste avant « : » (gabarit « if : ») → on va en fin de ligne
      if (/^\s*:?\s*$/.test(v.slice(s, finL)) || /^\)?:\s*$/.test(v.slice(s, finL))) pos = finL;
      let ligne = v.slice(deb, pos);
      let ajout = "";
      // deux-points oubliés après if / elif / else : on les ajoute (et on le dit)
      if (/^\s*(if|elif)\s+\S/.test(ligne) && !/:\s*(#.*)?$/.test(ligne) && !ligne.includes("#")) { ajout = ":"; }
      else if (/^\s*else\s*$/.test(ligne)) { ajout = ":"; }
      if (ajout) {
        ligne = ligne.replace(/\s+$/, "") + ajout;
        this.montrerInfo("✨ J'ai ajouté les <b>deux-points</b> <code>:</code> à la fin de la ligne : ils sont obligatoires après <code>if</code>, <code>elif</code> et <code>else</code>.");
        this.garderInfo = Date.now() + 4000;
      }
      let ind = ligne.match(/^ */)[0];
      if (/:\s*(#.*)?$/.test(ligne)) ind += "    ";
      ta.setRangeText(ligne + "\n" + ind, deb, pos, "end");
      ta.dispatchEvent(new Event("input"));
    } else if (e.key === "Backspace" && s === f) {
      const deb = v.lastIndexOf("\n", s - 1) + 1, avant = v.slice(deb, s);
      if (avant.length >= 4 && /^ +$/.test(avant) && avant.length % 4 === 0) { e.preventDefault(); this.insere("", s - 4, s); }
    }
  }
}

// ---------------------------------------------------------------------
//  Boîte à outils : toutes les primitives, cliquables, avec leur rôle
// ---------------------------------------------------------------------
export function boiteOutils(container, editor, { capteurs = null, actions = null, mots = ["if", "elif", "else", "and", "not"], titre = true } = {}) {
  const dessiner = () => {
    const C = CAPTEURS.filter((c) => (!capteurs || capteurs.includes(c.nom)) && editor.voit(c.nom));
    const A = ACTIONS_INFO.filter((a) => (!actions || actions.includes(a.nom)) && editor.voit(a.nom));
    const M = MOTS.filter((m) => mots.includes(m.nom) || (m.nom === "or" && !capteurs && editor.voit("distance_algue")));
    const chip = (nom, html, cls) => `<button type="button" class="chip ${cls}${INFO[nom].avance ? " c-avance" : INFO[nom].equipe ? " c-equipe" : ""}" data-p="${nom}" title="${esc(INFO[nom].type === "mot" ? INFO[nom].fr + " : " + INFO[nom].role : INFO[nom].role)}">${html}</button>`;
    container.innerHTML = `<div class="outils">
      ${titre ? `<div class="outils-titre">🧰 Clique pour insérer dans ton code :</div>` : ""}
      ${M.length ? `<div class="outils-groupe"><span class="lab">Mots</span>${M.map((m) => chip(m.nom, `<code>${m.nom}</code> <small>${esc(m.fr)}</small>`, "c-mot")).join("")}</div>` : ""}
      ${C.length ? `<div class="outils-groupe"><span class="lab">❓ Questions</span>${C.map((c) => chip(c.nom, `${c.icone} <code>${c.nom}()</code>`, "c-capt")).join("")}</div>` : ""}
      ${A.length ? `<div class="outils-groupe"><span class="lab">❗ Ordres</span>${A.map((a) => chip(a.nom, `${a.icone} <code>${a.nom}()</code>`, "c-act")).join("")}</div>` : ""}
    </div>`;
    container.querySelectorAll("[data-p]").forEach((b) => {
      b.addEventListener("mousedown", (e) => e.preventDefault());            // garder le curseur dans l'éditeur
      b.addEventListener("click", () => editor.insererPrimitive(b.dataset.p));
      b.addEventListener("mouseenter", () => editor.montrerInfo(infoHTML(b.dataset.p)));
    });
  };
  dessiner();
  document.addEventListener("lagon:avance", dessiner);
}

// ---------------------------------------------------------------------
//  Vue « pensée de la tortue »
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
export function capteursHTML(rec, tick, code = "") {
  if (!rec) return "";
  if (rec.bloquee) return `<h4>Tour ${tick}</h4><p><b>💫 Bloquée</b> : la tortue vient d'être attrapée ou épuisée, elle attend.</p>`;
  if (!rec.capteurs) return `<h4>Tour ${tick}</h4><p class="effet mal">${esc(rec.erreur || "")}</p>`;
  const rows = CAPTEURS.filter((c) => visible(c) || code.includes(c.nom + "(")).map((c) => {
    const v = rec.capteurs[c.nom];
    const txt = typeof v === "boolean" ? (v ? "True" : "False") : v;
    return `<tr title="${esc(c.role)}"><td>${c.icone} <code>${c.nom}()</code></td><td class="${typeof v === "boolean" ? "v-" + v : ""}">${txt}</td></tr>`;
  }).join("");
  const mal = /refusé|plastique|ATTRAPÉE|ÉPUISÉE|rien|aucune|plus faim|il faudrait/.test(rec.effet || "");
  return `<h4>Tour ${tick} : ce que voit la tortue</h4><table>${rows}</table>` +
    `<div class="effet ${mal ? "mal" : ""}">${rec.action ? "→ " + esc(rec.action) + "()" : "→ aucune action"}${rec.effet ? " : " + esc(rec.effet) : ""}</div>` +
    (rec.erreur ? `<div class="effet mal">${esc(rec.erreur)}</div>` : "") +
    (rec.extra ? `<div class="petit muted">Les autres actions du même tour sont ignorées (une seule action par tour).</div>` : "");
}

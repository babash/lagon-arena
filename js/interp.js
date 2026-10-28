// =====================================================================
//  Lagon Arena — mini-interpréteur Python (uniquement les conditions)
//  Langage accepté :
//      def tour():
//          if <condition>:          elif <condition>:       else:
//          action()                 pass                    variable = expression
//  Conditions : True / False, nombres, + - * , < <= > >= == !=, and, or, not,
//               parenthèses, appels de capteurs : requin_proche() …
//  Les messages d'erreur sont en français et pensés pour des élèves de 1re.
// =====================================================================

export const SENSORS = {
  requin_proche: "booléen", algue_ici: "booléen", plastique_ici: "booléen",
  sur_plage: "booléen", est_la_nuit: "booléen", energie: "nombre", heure: "nombre",
  // niveau avancé
  distance_algue: "nombre", distance_plage: "nombre", distance_requin: "nombre",
  tortue_a_cote: "booléen", requin_derriere_tortue: "booléen",
  // jeu en équipes
  mon_equipe: "nombre", mes_nids: "nombre", nids_voisine: "nombre", nids_equipe: "nombre", nids_adversaires: "nombre",
  equipiere_a_cote: "booléen", adversaire_a_cote: "booléen", equipiere_fatiguee: "booléen", requin_derriere_adversaire: "booléen",
  rang_equipe: "nombre", equipe_en_tete: "booléen", equipe_rivale: "nombre", rivale_a_cote: "booléen",
};
export const ACTIONS = ["manger", "pondre", "fuir", "se_cacher", "aller_vers_algue", "aller_vers_plage",
  /* niveau avancé */ "aller_vers_algue_libre", "pousser",
  /* jeu en équipes */ "donner", "aller_vers_equipiere"];
const KNOWN = [...Object.keys(SENSORS), ...ACTIONS];
const KEYWORDS = new Set(["if", "elif", "else", "and", "or", "not", "True", "False", "def", "pass", "return"]);

export class CodeError extends Error {
  constructor(line, message) { super(message); this.line = line; }
}

// ---------- outils ----------
function levenshtein(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function suggestion(name) {
  let best = null, score = 99;
  for (const k of KNOWN) {
    const s = levenshtein(name.toLowerCase(), k);
    if (s < score) { score = s; best = k; }
  }
  return score <= Math.max(2, Math.floor(name.length / 3)) ? best : null;
}

// ---------- découpage en lexèmes d'une ligne ----------
const TOKEN_RE = /\s*(?:(\d+(?:\.\d+)?)|([A-Za-z_À-ÿ][A-Za-z_0-9À-ÿ]*)|(==|!=|<=|>=|=<|=>|&&|\|\||\/\/|[-+*\/%<>=():!,]))/y;

function tokenize(text, line) {
  const toks = [];
  let pos = 0;
  while (pos < text.length) {
    if (/^\s*$/.test(text.slice(pos))) break;
    TOKEN_RE.lastIndex = pos;
    const m = TOKEN_RE.exec(text);
    if (!m) {
      const ch = text.slice(pos).trim()[0];
      if (ch === '"' || ch === "'") throw new CodeError(line, "Les textes entre guillemets ne servent pas ici : la tortue ne travaille qu'avec des conditions.");
      if (ch === "[" || ch === "]" || ch === "{" || ch === "}") throw new CodeError(line, `Le caractère « ${ch} » n'est pas utile ici : utilise des parenthèses ( ).`);
      throw new CodeError(line, `Caractère inattendu : « ${ch} ».`);
    }
    pos = TOKEN_RE.lastIndex;
    if (m[1] !== undefined) toks.push({ t: "num", v: Number(m[1]) });
    else if (m[2] !== undefined) toks.push({ t: "name", v: m[2] });
    else toks.push({ t: "op", v: m[3] });
  }
  return toks;
}

// ---------- analyse d'une expression (descente récursive) ----------
class ExprParser {
  constructor(toks, line, ctx) { this.toks = toks; this.i = 0; this.line = line; this.ctx = ctx; }
  peek() { return this.toks[this.i]; }
  next() { return this.toks[this.i++]; }
  isOp(v) { const t = this.peek(); return t && t.t === "op" && t.v === v; }
  isName(v) { const t = this.peek(); return t && t.t === "name" && t.v === v; }
  err(msg) { throw new CodeError(this.line, msg); }

  parseAll() {
    if (!this.peek()) this.err("Il manque une condition.");
    const e = this.parseOr();
    const t = this.peek();
    if (t) {
      if (t.t === "op" && t.v === "=") this.err("Pour comparer, il faut écrire == (deux signes égal). Un seul = sert à donner une valeur à une variable.");
      if (t.t === "name" && (t.v === "and" || t.v === "or")) this.err(`Il manque quelque chose avant « ${t.v} ».`);
      if (t.t === "name") this.err(`Je ne comprends pas « ${t.v} » à cet endroit. As-tu oublié and / or entre deux conditions ?`);
      this.err(`Je ne comprends pas « ${t.v} » à cet endroit.`);
    }
    return e;
  }
  parseOr() {
    let e = this.parseAnd();
    while (this.isName("or") || this.isOp("||")) {
      if (this.isOp("||")) this.err("En Python, « ou » s'écrit or (et pas ||).");
      this.next(); e = { k: "or", a: e, b: this.parseAnd() };
    }
    return e;
  }
  parseAnd() {
    let e = this.parseNot();
    while (this.isName("and") || this.isOp("&&")) {
      if (this.isOp("&&")) this.err("En Python, « et » s'écrit and (et pas &&).");
      this.next(); e = { k: "and", a: e, b: this.parseNot() };
    }
    return e;
  }
  parseNot() {
    if (this.isOp("!")) this.err("En Python, « non » s'écrit not (et pas !).");
    if (this.isName("not")) { this.next(); return { k: "not", a: this.parseNot() }; }
    return this.parseCmp();
  }
  parseCmp() {
    const first = this.parseArith();
    const ops = [], terms = [first];
    for (;;) {
      const t = this.peek();
      if (!t || t.t !== "op") break;
      if (t.v === "=<") this.err("On écrit <= (le signe < d'abord).");
      if (t.v === "=>") this.err("On écrit >= (le signe > d'abord).");
      if (t.v === "=") this.err("Pour comparer, il faut écrire == (deux signes égal). Un seul = sert à donner une valeur à une variable.");
      if (!["<", "<=", ">", ">=", "==", "!="].includes(t.v)) break;
      this.next(); ops.push(t.v); terms.push(this.parseArith());
    }
    return ops.length ? { k: "cmp", ops, terms } : first;
  }
  parseArith() {
    let e = this.parseTerm();
    while (this.isOp("+") || this.isOp("-")) { const op = this.next().v; e = { k: "bin", op, a: e, b: this.parseTerm() }; }
    return e;
  }
  parseTerm() {
    let e = this.parseUnary();
    while (this.isOp("*") || this.isOp("/") || this.isOp("//") || this.isOp("%")) { const op = this.next().v; e = { k: "bin", op, a: e, b: this.parseUnary() }; }
    return e;
  }
  parseUnary() {
    if (this.isOp("-")) { this.next(); return { k: "neg", a: this.parseUnary() }; }
    if (this.isOp("+")) { this.next(); return this.parseUnary(); }
    return this.parseAtom();
  }
  parseAtom() {
    const t = this.next();
    if (!t) this.err("La condition est incomplète.");
    if (t.t === "num") return { k: "num", v: t.v };
    if (t.t === "op" && t.v === "(") {
      const e = this.parseOr();
      if (!this.isOp(")")) this.err("Il manque une parenthèse fermante ).");
      this.next(); return e;
    }
    if (t.t === "op") this.err(`Le symbole « ${t.v} » est mal placé.`);
    const name = t.v;
    if (name === "True" || name === "False") return { k: "bool", v: name === "True" };
    if (["true", "false", "TRUE", "FALSE", "vrai", "faux", "Vrai", "Faux"].includes(name))
      this.err(`On écrit ${/^[tTvV]/.test(name) ? "True" : "False"} (avec une majuscule, en anglais).`);
    if (["and", "or", "not"].includes(name)) this.err(`Il manque une condition avant « ${name} ».`);
    if (KEYWORDS.has(name)) this.err(`Le mot « ${name} » ne peut pas être utilisé ici.`);
    if (this.isOp("(")) {
      this.next();
      if (!this.isOp(")")) {
        if (KNOWN.includes(name)) this.err(`${name}() ne prend rien entre les parenthèses : écris ${name}().`);
        this.err(`Il manque une parenthèse fermante ) après ${name}(.`);
      }
      this.next();
      if (ACTIONS.includes(name)) this.err(`${name}() est une action, pas une condition : on ne peut pas la tester.`);
      if (!(name in SENSORS)) {
        const s = suggestion(name);
        this.err(`La fonction ${name}() n'existe pas.` + (s ? ` Voulais-tu écrire ${s}() ?` : " Regarde la liste des capteurs dans l'aide."));
      }
      return { k: "call", name };
    }
    if (name in SENSORS || ACTIONS.includes(name)) this.err(`Il manque les parenthèses : écris ${name}().`);
    this.ctx.used.push({ name, line: this.line });
    return { k: "var", name };
  }
}

// ---------- analyse du programme ----------
export function compile(source) {
  const raw = source.replace(/\r/g, "").replace(/\t/g, "    ").split("\n");
  const lines = [];
  raw.forEach((txt, i) => {
    let code = txt;
    const h = code.indexOf("#");
    if (h >= 0) code = code.slice(0, h);
    if (code.trim() === "") return;
    const indent = code.match(/^ */)[0].length;
    lines.push({ n: i + 1, indent, text: code.trim() });
  });
  if (!lines.length) throw new CodeError(1, "Ton programme est vide. Il doit commencer par def tour():");

  const ctx = { used: [], assigned: new Set(), warnings: [] };
  const first = lines[0];
  if (first.indent !== 0) throw new CodeError(first.n, "La ligne def tour(): doit commencer tout à gauche, sans espace.");
  if (!/^def\b/.test(first.text)) throw new CodeError(first.n, "Ton programme doit commencer par la ligne : def tour():");
  if (!/^def\s+tour\s*\(\s*\)\s*:$/.test(first.text)) {
    if (/^def\s+tour\s*\(\s*\)\s*$/.test(first.text)) throw new CodeError(first.n, "Il manque les deux-points : à la fin de def tour():");
    throw new CodeError(first.n, "La première ligne doit être exactement : def tour():");
  }
  if (lines.length === 1) throw new CodeError(first.n, "La fonction tour() est vide : écris au moins une action en dessous (indentée de 4 espaces).");
  for (const l of lines.slice(1)) if (l.indent === 0)
    throw new CodeError(l.n, "Tout le code de ta tortue doit être à l'intérieur de def tour(), donc décalé (indenté) de 4 espaces.");

  let pos = 1;
  function parseBlock(indent) {
    const stmts = [];
    while (pos < lines.length) {
      const l = lines[pos];
      if (l.indent < indent) break;
      if (l.indent > indent) throw new CodeError(l.n, "Décalage (indentation) incorrect : cette ligne n'est pas alignée avec les autres lignes de son bloc.");
      stmts.push(parseStmt(indent));
    }
    return stmts;
  }
  function headerCond(l, kw) {
    let rest = l.text.slice(kw.length);
    if (!/^[\s(]/.test(rest)) throw new CodeError(l.n, `Il manque un espace après ${kw}.`);
    const colon = rest.lastIndexOf(":");
    let inline = "";
    if (!rest.trimEnd().endsWith(":")) {
      // forme courte « if cond: action() » acceptée
      const toks = rest;
      const idx = findTopColon(toks);
      if (idx < 0) throw new CodeError(l.n, `Il manque les deux-points : à la fin de la ligne ${kw}.`);
      inline = rest.slice(idx + 1).trim();
      rest = rest.slice(0, idx);
    } else rest = rest.slice(0, colon);
    const cond = new ExprParser(tokenize(rest, l.n), l.n, ctx).parseAll();
    return { cond, inline };
  }
  function findTopColon(s) {
    let depth = 0;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === "(") depth++;
      else if (s[i] === ")") depth--;
      else if (s[i] === ":" && depth === 0) return i;
    }
    return -1;
  }
  function body(l, inline, indent) {
    if (inline) return [parseSimple({ n: l.n, text: inline })];
    pos++;
    if (pos >= lines.length || lines[pos].indent <= indent)
      throw new CodeError(l.n, "Après les deux-points, il faut au moins une ligne décalée (indentée) de 4 espaces.");
    const inner = lines[pos].indent;
    const b = parseBlock(inner);
    return b;
  }
  function parseStmt(indent) {
    const l = lines[pos];
    const w = l.text.split(/[\s(:]/)[0];
    if (w === "if") {
      const branches = [];
      const h = headerCond(l, "if");
      branches.push({ cond: h.cond, line: l.n, body: body(l, h.inline, indent) });
      if (h.inline) pos++;
      let elseBody = null, elseLine = null;
      while (pos < lines.length && lines[pos].indent === indent) {
        const m = lines[pos];
        const w2 = m.text.split(/[\s(:]/)[0];
        if (w2 === "elif") {
          if (elseBody) throw new CodeError(m.n, "Un elif ne peut pas venir après un else.");
          const h2 = headerCond(m, "elif");
          branches.push({ cond: h2.cond, line: m.n, body: body(m, h2.inline, indent) });
          if (h2.inline) pos++;
        } else if (w2 === "else") {
          if (elseBody) throw new CodeError(m.n, "Il ne peut y avoir qu'un seul else.");
          const rest = m.text.slice(4).trim();
          if (rest === "") throw new CodeError(m.n, "Il manque les deux-points : on écrit else:");
          if (!rest.startsWith(":")) throw new CodeError(m.n, "else ne prend jamais de condition. Pour tester une autre condition, utilise elif.");
          elseLine = m.n;
          const inline = rest.slice(1).trim();
          elseBody = body(m, inline, indent);
          if (inline) pos++;
        } else break;
      }
      return { k: "if", branches, elseBody, elseLine };
    }
    if (w === "elif") throw new CodeError(l.n, "Ce elif n'a pas de if juste au-dessus de lui, au même niveau de décalage.");
    if (w === "else") throw new CodeError(l.n, "Ce else n'a pas de if juste au-dessus de lui, au même niveau de décalage.");
    if (w === "while" || w === "for") throw new CodeError(l.n, `Pas de boucle ${w} ici : le jeu appelle déjà tour() à chaque tour. Utilise seulement des conditions.`);
    if (w === "def") throw new CodeError(l.n, "Une seule fonction est autorisée : def tour():");
    const s = parseSimple(l);
    pos++;
    return s;
  }
  function parseSimple(l) {
    const text = l.text;
    if (text === "pass") return { k: "pass", line: l.n };
    if (text === "return" || text === "return None") return { k: "return", line: l.n };
    if (/^(if|elif|else|while|for)\b/.test(text)) throw new CodeError(l.n, "Après les deux-points, mets plutôt l'instruction sur la ligne suivante, décalée de 4 espaces.");
    const toks = tokenize(text, l.n);
    // affectation de variable : nom = expression
    if (toks.length >= 2 && toks[0].t === "name" && toks[1].t === "op" && toks[1].v === "=") {
      const name = toks[0].v;
      if (KEYWORDS.has(name)) throw new CodeError(l.n, `« ${name} » est un mot réservé de Python.`);
      if (KNOWN.includes(name)) throw new CodeError(l.n, `${name} est le nom d'une fonction du jeu : choisis un autre nom de variable.`);
      if (toks.length === 2) throw new CodeError(l.n, `Il manque une valeur après ${name} =`);
      ctx.assigned.add(name);
      const e = new ExprParser(toks.slice(2), l.n, ctx).parseAll();
      return { k: "set", name, e, line: l.n };
    }
    // appel d'action
    if (toks[0] && toks[0].t === "name" && ACTIONS.includes(toks[0].v)) {
      const name = toks[0].v;
      if (toks.length === 1) throw new CodeError(l.n, `Il manque les parenthèses : écris ${name}()`);
      if (!(toks[1].t === "op" && toks[1].v === "(")) throw new CodeError(l.n, `Après ${name}, il faut des parenthèses : ${name}()`);
      if (!(toks[2] && toks[2].t === "op" && toks[2].v === ")")) throw new CodeError(l.n, `${name}() ne prend rien entre les parenthèses.`);
      if (toks.length > 3) throw new CodeError(l.n, "Une seule action par ligne.");
      return { k: "act", name, line: l.n };
    }
    if (toks[0] && toks[0].t === "name" && ["if", "elif", "else"].includes(toks[0].v.toLowerCase()) && toks[0].v !== toks[0].v.toLowerCase())
      throw new CodeError(l.n, `Python fait la différence entre majuscules et minuscules : écris ${toks[0].v.toLowerCase()} en minuscules.`);
    if (toks[0] && toks[0].t === "name" && !KEYWORDS.has(toks[0].v) && toks[1] && toks[1].t === "op" && toks[1].v === "(" && !(toks[0].v in SENSORS)) {
      const s = suggestion(toks[0].v);
      throw new CodeError(l.n, `La fonction ${toks[0].v}() n'existe pas.` + (s ? ` Voulais-tu écrire ${s}() ?` : " Regarde la liste des actions dans l'aide."));
    }
    // expression seule (ex. un capteur) : autorisée mais inutile
    const e = new ExprParser(toks, l.n, ctx).parseAll();
    ctx.warnings.push({ line: l.n, msg: "Cette ligne ne fait rien : un capteur seul ne déplace pas la tortue. Utilise-le dans un if." });
    return { k: "expr", e, line: l.n };
  }

  const prog = parseBlock(lines[1].indent);
  for (const u of ctx.used) if (!ctx.assigned.has(u.name)) {
    const s = suggestion(u.name);
    throw new CodeError(u.line, `« ${u.name} » n'existe pas.` + (s ? ` Voulais-tu écrire ${s}() ?` : ""));
  }
  const hasAction = JSON.stringify(prog).includes('"k":"act"');
  if (!hasAction) ctx.warnings.push({ line: first.n, msg: "Ta tortue n'appelle aucune action : elle ne bougera jamais." });
  return { prog, warnings: ctx.warnings, lineCount: raw.length };
}

// ---------- exécution d'un tour ----------
export function runTurn(compiled, sensors) {
  const trace = { conds: [], action: null, actionLine: null, extra: [], error: null, visited: [] };
  const vars = Object.create(null);
  const STOP = {};
  function val(e) {
    switch (e.k) {
      case "num": return e.v;
      case "bool": return e.v;
      case "call": return sensors[e.name]();
      case "var":
        if (!(e.name in vars)) throw new CodeError(null, `La variable ${e.name} est utilisée avant d'avoir reçu une valeur.`);
        return vars[e.name];
      case "not": return !truthy(val(e.a));
      case "and": { const a = val(e.a); return truthy(a) ? val(e.b) : a; }
      case "or": { const a = val(e.a); return truthy(a) ? a : val(e.b); }
      case "neg": return -num(val(e.a));
      case "bin": {
        const a = num(val(e.a)), b = num(val(e.b));
        if (e.op === "+") return a + b;
        if (e.op === "-") return a - b;
        if (e.op === "*") return a * b;
        if (b === 0) throw new CodeError(null, "Division par zéro.");
        if (e.op === "/") return a / b;
        if (e.op === "//") return Math.floor(a / b);
        return ((a % b) + b) % b;
      }
      case "cmp": {
        let left = val(e.terms[0]);
        for (let i = 0; i < e.ops.length; i++) {
          const right = val(e.terms[i + 1]);
          const a = typeof left === "boolean" ? +left : left, b = typeof right === "boolean" ? +right : right;
          let ok;
          switch (e.ops[i]) {
            case "<": ok = a < b; break; case "<=": ok = a <= b; break;
            case ">": ok = a > b; break; case ">=": ok = a >= b; break;
            case "==": ok = a === b; break; case "!=": ok = a !== b; break;
          }
          if (!ok) return false;
          left = right;
        }
        return true;
      }
    }
  }
  function num(v) { return typeof v === "boolean" ? +v : v; }
  function truthy(v) { return typeof v === "boolean" ? v : v !== 0; }
  function exec(stmts) {
    for (const s of stmts) {
      if (s.k === "if") {
        let done = false;
        for (const br of s.branches) {
          const v = truthy(val(br.cond));
          trace.conds.push([br.line, v]);
          if (v) { exec(br.body); done = true; break; }
        }
        if (!done && s.elseBody) { trace.visited.push(s.elseLine); exec(s.elseBody); }
      } else if (s.k === "act") {
        if (trace.action === null) { trace.action = s.name; trace.actionLine = s.line; }
        else trace.extra.push([s.line, s.name]);
      } else if (s.k === "set") { vars[s.name] = val(s.e); trace.visited.push(s.line); }
      else if (s.k === "return") { trace.visited.push(s.line); throw STOP; }
      else if (s.k === "expr") { val(s.e); trace.visited.push(s.line); }
      else trace.visited.push(s.line);
    }
  }
  try { exec(compiled.prog); }
  catch (e) {
    if (e !== STOP) { trace.error = e.message; trace.action = null; trace.actionLine = null; }
  }
  return trace;
}

// Vérifie un programme et renvoie {ok, error:{line,message}, warnings}
export function check(source) {
  try {
    const c = compile(source);
    return { ok: true, compiled: c, warnings: c.warnings };
  } catch (e) {
    if (e instanceof CodeError) return { ok: false, error: { line: e.line, message: e.message }, warnings: [] };
    return { ok: false, error: { line: 1, message: "Erreur inattendue : " + e.message }, warnings: [] };
  }
}

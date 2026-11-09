import { InputError } from "./validate.js";

function err(m) {
  throw new InputError(m);
}

function tokenize(src) {
  const s = String(src).replace(/\bAND\b/gi, "&").replace(/\bOR\b/gi, "+").replace(/\bXOR\b/gi, "^").replace(/\bNOT\b/gi, "!");
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (/\s/.test(c)) continue;
    if (/[A-Za-z]/.test(c)) { out.push({ t: "var", v: c.toUpperCase() }); continue; }
    if (c === "0" || c === "1") { out.push({ t: "const", v: c === "1" }); continue; }
    if ("+|∨".includes(c)) { out.push({ t: "or" }); continue; }
    if ("*&·.∧".includes(c)) { out.push({ t: "and" }); continue; }
    if ("^⊕".includes(c)) { out.push({ t: "xor" }); continue; }
    if ("!~¬".includes(c)) { out.push({ t: "not" }); continue; }
    if (c === "'" || c === "’") { out.push({ t: "post" }); continue; }
    if (c === "(" || c === ")") { out.push({ t: c }); continue; }
    err(`رمز غير مفهوم «${c}» في التعبير المنطقي.`);
  }
  return out;
}

export function parseBool(src) {
  if (!String(src ?? "").trim()) err("أدخل تعبيراً منطقياً.");
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const starts = (k) => k && (k.t === "var" || k.t === "const" || k.t === "(" || k.t === "not");
  function or() {
    let a = xor();
    while (peek() && peek().t === "or") { p++; a = { t: "or", a, b: xor() }; }
    return a;
  }
  function xor() {
    let a = and();
    while (peek() && peek().t === "xor") { p++; a = { t: "xor", a, b: and() }; }
    return a;
  }
  function and() {
    let a = unary();
    for (;;) {
      if (peek() && peek().t === "and") { p++; a = { t: "and", a, b: unary() }; continue; }
      if (starts(peek())) { a = { t: "and", a, b: unary() }; continue; }
      return a;
    }
  }
  function unary() {
    if (peek() && peek().t === "not") { p++; return { t: "not", a: unary() }; }
    let a = atom();
    while (peek() && peek().t === "post") { p++; a = { t: "not", a }; }
    return a;
  }
  function atom() {
    const k = toks[p++];
    if (!k) err("التعبير المنطقي غير مكتمل.");
    if (k.t === "var") return { t: "var", v: k.v };
    if (k.t === "const") return { t: "const", v: k.v };
    if (k.t === "(") {
      const a = or();
      if (!toks[p] || toks[p].t !== ")") err("يوجد قوس مفتوح لم يُغلق.");
      p++;
      return a;
    }
    err("التعبير المنطقي غير صحيح الصياغة.");
  }
  const tree = or();
  if (p < toks.length) err("تعذر فهم التعبير المنطقي كاملاً، تحقق من الأقواس والرموز.");
  return tree;
}

export function boolVars(n, set = new Set()) {
  if (n.t === "var") set.add(n.v);
  if (n.a) boolVars(n.a, set);
  if (n.b) boolVars(n.b, set);
  return [...set].sort();
}

export function evalBool(n, env) {
  switch (n.t) {
    case "var": return !!env[n.v];
    case "const": return n.v;
    case "not": return !evalBool(n.a, env);
    case "and": return evalBool(n.a, env) && evalBool(n.b, env);
    case "or": return evalBool(n.a, env) || evalBool(n.b, env);
    case "xor": return evalBool(n.a, env) !== evalBool(n.b, env);
  }
  return false;
}

export function truthTable(n, vars = boolVars(n)) {
  const rows = [];
  const N = vars.length;
  for (let m = 0; m < 1 << N; m++) {
    const env = {};
    vars.forEach((v, i) => { env[v] = (m >> (N - 1 - i)) & 1; });
    rows.push({ m, bits: vars.map((v) => env[v]), out: evalBool(n, env) ? 1 : 0 });
  }
  return { vars, rows, minterms: rows.filter((r) => r.out).map((r) => r.m), maxterms: rows.filter((r) => !r.out).map((r) => r.m) };
}

export function termText(term, vars) {
  const lits = [];
  for (let i = 0; i < term.length; i++) {
    if (term[i] === "-") continue;
    lits.push(term[i] === "1" ? vars[i] : `${vars[i]}'`);
  }
  return lits.join("") || "1";
}

export function termTex(term, vars) {
  const lits = [];
  for (let i = 0; i < term.length; i++) {
    if (term[i] === "-") continue;
    lits.push(term[i] === "1" ? vars[i] : `\\overline{${vars[i]}}`);
  }
  return lits.join("") || "1";
}

export function sopText(terms, vars) {
  if (!terms.length) return "0";
  return terms.map((t) => termText(t, vars)).join(" + ");
}

export function sopTex(terms, vars) {
  if (!terms.length) return "0";
  return terms.map((t) => termTex(t, vars)).join(" + ");
}

const bitsOf = (m, n) => m.toString(2).padStart(n, "0");
const ones = (s) => [...s].filter((c) => c === "1").length;
const covers = (term, m, n) => {
  const b = bitsOf(m, n);
  for (let i = 0; i < n; i++) if (term[i] !== "-" && term[i] !== b[i]) return false;
  return true;
};

function combine(a, b) {
  let diff = -1;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      if (a[i] === "-" || b[i] === "-" || diff >= 0) return null;
      diff = i;
    }
  }
  return diff < 0 ? null : a.slice(0, diff) + "-" + a.slice(diff + 1);
}

export function quineMcCluskey(minterms, dontcares, n) {
  const all = [...new Set([...minterms, ...dontcares])].sort((a, b) => a - b);
  const log = [];
  if (!minterms.length) return { primes: [], essential: [], cover: [], log, stages: [] };
  if (minterms.length + dontcares.length === 1 << n && minterms.length) return { primes: ["-".repeat(n)], essential: ["-".repeat(n)], cover: ["-".repeat(n)], log: ["كل التركيبات تعطي 1، فالدالة = 1."], stages: [] };
  let current = all.map((m) => ({ term: bitsOf(m, n), ms: [m] }));
  const primes = [];
  const stages = [];
  while (current.length) {
    stages.push(current.map((c) => ({ ...c })));
    const used = new Set();
    const next = [];
    for (let i = 0; i < current.length; i++) for (let j = i + 1; j < current.length; j++) {
      if (Math.abs(ones(current[i].term) - ones(current[j].term)) !== 1) continue;
      const c = combine(current[i].term, current[j].term);
      if (!c) continue;
      used.add(i); used.add(j);
      if (!next.some((x) => x.term === c)) next.push({ term: c, ms: [...new Set([...current[i].ms, ...current[j].ms])].sort((a, b) => a - b) });
    }
    current.forEach((c, i) => { if (!used.has(i) && !primes.some((p) => p.term === c.term)) primes.push(c); });
    current = next;
  }
  const primeTerms = primes.map((p) => p.term);
  const essential = [];
  for (const m of minterms) {
    const cov = primeTerms.filter((t) => covers(t, m, n));
    if (cov.length === 1 && !essential.includes(cov[0])) essential.push(cov[0]);
  }
  let remaining = minterms.filter((m) => !essential.some((t) => covers(t, m, n)));
  const cover = [...essential];
  if (remaining.length) {
    const cand = primeTerms.filter((t) => !essential.includes(t) && remaining.some((m) => covers(t, m, n)));
    const best = minimalCover(cand, remaining, n);
    cover.push(...best);
    log.push(`بعد الحدود الأساسية بقيت حدود صغرى غير مغطاة (${remaining.join("، ")})، فاخترنا أقل مجموعة من الحدود الأولية تغطيها${cand.length <= 18 ? " بطريقة بتريك (بحث شامل)" : " بطريقة جشعة"}.`);
  }
  return { primes: primeTerms, primeInfo: primes, essential, cover, log, stages };
}

function cost(set) {
  return set.length * 100 + set.reduce((s, t) => s + [...t].filter((c) => c !== "-").length, 0);
}

function minimalCover(cand, remaining, n) {
  if (cand.length <= 18) {
    let best = null;
    const N = cand.length;
    for (let mask = 1; mask < 1 << N; mask++) {
      const set = cand.filter((_, i) => mask & (1 << i));
      if (best && set.length > best.length) continue;
      if (remaining.every((m) => set.some((t) => covers(t, m, n))) && (!best || cost(set) < cost(best))) best = set;
    }
    return best || [];
  }
  const out = [];
  let left = remaining.slice();
  while (left.length) {
    const pick = cand.filter((t) => !out.includes(t)).sort((a, b) => left.filter((m) => covers(b, m, n)).length - left.filter((m) => covers(a, m, n)).length)[0];
    out.push(pick);
    left = left.filter((m) => !covers(pick, m, n));
  }
  return out;
}

export function sopEval(terms, n, m) {
  return terms.some((t) => covers(t, m, n));
}

export const GRAY = { 1: [0, 1], 2: [0, 1, 3, 2] };

export function kmapLayout(n) {
  if (n === 2) return { rowVars: 1, colVars: 1 };
  if (n === 3) return { rowVars: 1, colVars: 2 };
  if (n === 4) return { rowVars: 2, colVars: 2 };
  return null;
}

export { bitsOf, covers };

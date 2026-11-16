import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, rmSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import * as acorn from "../vendor/acorn/acorn.mjs";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const LANGS = ["en", "fr", "es", "tr", "id", "ur", "fa"];
export const RTL = new Set(["ar", "ur", "fa"]);
const ARABIC_LETTER = /[ء-يٱ-ۓ]/;

const posix = (p) => p.split(sep).join("/");

export function sourceFiles() {
  const out = [];
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith(".js")) out.push(posix(relative(ROOT, p)));
    }
  };
  walk(join(ROOT, "lib"));
  out.push("assets/js/registry.js");
  return out.sort();
}

export const keyOf = (text) => createHash("sha1").update(text).digest("hex").slice(0, 12);

function walk(node, parent, fn) {
  if (!node || typeof node.type !== "string") return;
  if (fn(node, parent) === false) return;
  for (const k of Object.keys(node)) {
    if (k === "type" || k === "start" || k === "end" || k === "loc") continue;
    const v = node[k];
    if (Array.isArray(v)) { for (const c of v) if (c && typeof c.type === "string") walk(c, node, fn); }
    else if (v && typeof v.type === "string") walk(v, node, fn);
  }
}

function units(src) {
  const ast = acorn.parse(src, { ecmaVersion: "latest", sourceType: "module" });
  const found = [];
  walk(ast, null, (n, parent) => {
    if (n.type === "Literal" && typeof n.value === "string" && ARABIC_LETTER.test(n.value)) {
      if (parent && (parent.type === "ImportDeclaration" || parent.type === "ExportNamedDeclaration" || parent.type === "ExportAllDeclaration")) return;
      found.push({ kind: "str", start: n.start, end: n.end, text: n.value });
      return;
    }
    if (n.type === "TemplateLiteral" && !(parent && parent.type === "TaggedTemplateExpression")) {
      const cooked = n.quasis.map((q) => q.value.cooked ?? q.value.raw);
      if (cooked.some((c) => ARABIC_LETTER.test(c))) {
        let text = "";
        cooked.forEach((c, i) => { text += c; if (i < n.expressions.length) text += `{%${i}}`; });
        found.push({ kind: "tpl", start: n.start, end: n.end, text, exprs: n.expressions.map((e) => [e.start, e.end]) });
      }
    }
  });
  return found;
}

export function extract(file) {
  const src = readFileSync(join(ROOT, file), "utf8");
  const list = units(src);
  const seen = new Map();
  for (const u of list) {
    const k = keyOf(u.text);
    if (seen.has(k)) continue;
    const lineStart = src.lastIndexOf("\n", u.start) + 1;
    const lineEnd = src.indexOf("\n", u.start);
    const ctx = src.slice(lineStart, lineEnd < 0 ? undefined : lineEnd).trim().slice(0, 160);
    const entry = { k, text: u.text };
    if (u.text.length < 40) entry.ctx = ctx;
    seen.set(k, entry);
  }
  return [...seen.values()];
}

const placeholders = (s) => (s.match(/\{%\d+\}/g) || []).sort().join(",");

export function validTranslation(text, tr) {
  if (typeof tr !== "string" || !tr.length) return false;
  return placeholders(text) === placeholders(tr);
}

const escTpl = (s) => s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

export function translateSource(src, dict, stats) {
  const list = units(src).sort((a, b) => a.start - b.start);
  const top = [];
  for (const u of list) if (!top.some((t) => u.start >= t.start && u.end <= t.end)) top.push(u);
  const inner = (u) => list.filter((x) => x !== u && x.start >= u.start && x.end <= u.end);
  const render = (start, end, pool) => {
    const mine = pool.filter((x) => x.start >= start && x.end <= end).filter((x, _, arr) => !arr.some((y) => y !== x && x.start >= y.start && x.end <= y.end));
    let out = "", at = start;
    for (const u of mine) { out += src.slice(at, u.start) + renderUnit(u); at = u.end; }
    return out + src.slice(at, end);
  };
  const renderUnit = (u) => {
    const k = keyOf(u.text);
    const tr = dict[k];
    const ok = validTranslation(u.text, tr);
    if (stats) { stats.total++; if (ok) stats.done++; else stats.missing.push(k); }
    if (u.kind === "str") return ok ? JSON.stringify(tr) : src.slice(u.start, u.end);
    const pool = inner(u);
    const exprSrc = u.exprs.map(([s, e]) => render(s, e, pool));
    if (!ok) {
      let out = "", at = u.start;
      u.exprs.forEach(([s, e], i) => { out += src.slice(at, s) + exprSrc[i]; at = e; });
      return out + src.slice(at, u.end);
    }
    const parts = tr.split(/(\{%\d+\})/);
    let out = "`";
    for (const p of parts) {
      const m = p.match(/^\{%(\d+)\}$/);
      out += m ? "${" + exprSrc[Number(m[1])] + "}" : escTpl(p);
    }
    return out + "`";
  };
  return render(0, src.length, list);
}

export function loadDict(lang, file) {
  const p = join(ROOT, "i18n", lang, `${file}.json`);
  if (!existsSync(p)) return {};
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { console.warn(`invalid JSON: i18n/${lang}/${file}.json`); return {}; }
}

export function outPath(lang, file) {
  if (file === "assets/js/registry.js") return `assets/js/registry.${lang}.js`;
  return file.replace(/^lib\//, `lib-${lang}/`);
}

function cmdExtract() {
  let files = 0, strings = 0, chars = 0;
  for (const f of sourceFiles()) {
    const list = extract(f);
    const p = join(ROOT, "i18n", "src", `${f}.json`);
    if (!list.length) { if (existsSync(p)) rmSync(p); continue; }
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(list, null, 1) + "\n");
    files++; strings += list.length; chars += list.reduce((s, x) => s + x.text.length, 0);
  }
  console.log(`extracted ${strings} strings (${chars} chars) from ${files} files`);
}

function cmdBuild(langs) {
  const report = {};
  for (const lang of langs) {
    const outRoot = join(ROOT, `lib-${lang}`);
    if (existsSync(outRoot)) rmSync(outRoot, { recursive: true, force: true });
    const per = {};
    for (const f of sourceFiles()) {
      const src = readFileSync(join(ROOT, f), "utf8");
      const stats = { total: 0, done: 0, missing: [] };
      const out = translateSource(src, loadDict(lang, f), stats);
      const p = join(ROOT, outPath(lang, f));
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, out);
      if (stats.total) per[f] = { total: stats.total, done: stats.done };
    }
    report[lang] = per;
    const tot = Object.values(per).reduce((a, b) => ({ total: a.total + b.total, done: a.done + b.done }), { total: 0, done: 0 });
    console.log(`${lang}: ${tot.done}/${tot.total} strings translated`);
  }
  const p = join(ROOT, "i18n", "coverage.json");
  const prev = existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : {};
  writeFileSync(p, JSON.stringify({ ...prev, ...report }, null, 1) + "\n");
}

const uiPlaceholders = (s) => (String(s).match(/\{\d+\}/g) || []).sort().join(",");

export function validUi(u, tr) {
  if (u.k.startsWith("@")) return !!tr && typeof tr === "object" && typeof tr.other === "string" && tr.other.includes("{0}");
  return typeof tr === "string" && tr.length > 0 && uiPlaceholders(u.text) === uiPlaceholders(tr);
}

function cmdTodo(lang, prefix) {
  const out = [];
  for (const f of [...sourceFiles(), "ui"].filter((x) => x.startsWith(prefix || ""))) {
    const src = join(ROOT, "i18n", "src", `${f}.json`);
    if (!existsSync(src)) continue;
    const list = JSON.parse(readFileSync(src, "utf8"));
    const dict = loadDict(lang, f);
    const miss = list.filter((u) => (f === "ui" ? !validUi(u, dict[u.k]) : !validTranslation(u.text, dict[u.k])));
    if (miss.length) out.push(`${f}\t${miss.length}\t${miss.reduce((s, u) => s + u.text.length, 0)}`);
  }
  console.log(out.join("\n") || "nothing to translate");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === "extract") cmdExtract();
  else if (cmd === "build") cmdBuild(args.length ? args : LANGS);
  else if (cmd === "todo") cmdTodo(args[0], args[1]);
  else console.log("usage: node scripts/i18n.mjs extract | build [langs...] | todo <lang> [prefix]");
}

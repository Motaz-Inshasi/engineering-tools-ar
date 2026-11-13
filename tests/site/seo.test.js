import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { htmlFiles, read, rel, ROOT } from "./helpers.js";
import { tools, categories } from "../../assets/js/registry.js";
import { donateInfo } from "../../scripts/site-parts.mjs";

const supportOn = donateInfo(JSON.parse(read(join(ROOT, "site.config.json")))).enabled;
const aboutOn = !!JSON.parse(read(join(ROOT, "site.config.json"))).author;

const pages = htmlFiles().filter((f) => !rel(f).startsWith("vendor/") && rel(f) !== "404.html");
const get = (html, re) => (html.match(re) || [])[1];

test("الصفحات المولّدة محدّثة مع الشيفرة (لا فرق بعد إعادة التوليد)", () => {
  execFileSync(process.execPath, [join(ROOT, "scripts", "generate.mjs"), "--check"], { stdio: "pipe" });
});

test("كل صفحة لها lang و dir وعنوان ووصف و canonical و Open Graph", () => {
  const titles = new Map(), descs = new Map();
  for (const f of pages) {
    const html = read(f), r = rel(f);
    assert.match(html, /<html lang="ar" dir="rtl">/, r);
    const title = get(html, /<title>([^<]+)<\/title>/);
    const desc = get(html, /<meta name="description" content="([^"]+)">/);
    assert.ok(title && title.length >= 10 && title.length <= 90, `${r}: title «${title}»`);
    assert.ok(desc && desc.length >= 50 && desc.length <= 320, `${r}: description length ${desc?.length}`);
    assert.match(html, /<link rel="canonical" href="[^"]+">/, r);
    for (const p of ["og:title", "og:description", "og:type", "og:locale", "og:site_name"]) assert.ok(html.includes(`property="${p}"`), `${r}: ${p}`);
    assert.match(html, /<meta name="viewport"/, r);
    assert.ok(!titles.has(title), `${r}: duplicate title with ${titles.get(title)}`);
    assert.ok(!descs.has(desc), `${r}: duplicate description with ${descs.get(desc)}`);
    titles.set(title, r); descs.set(desc, r);
  }
  assert.equal(pages.length, 1 + categories.length + tools.length + (supportOn ? 1 : 0) + (aboutOn ? 1 : 0));
});

test("بيانات JSON-LD صالحة في كل صفحة", () => {
  for (const f of pages) {
    const html = read(f);
    const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(m, `${rel(f)}: missing JSON-LD`);
    const data = JSON.parse(m[1]);
    const list = Array.isArray(data) ? data : [data];
    assert.ok(list.every((d) => d["@context"] === "https://schema.org" && d["@type"]), rel(f));
  }
});

test("كل صفحة في sitemap، وكل رابط في sitemap يشير إلى صفحة موجودة", () => {
  const sm = read(join(ROOT, "sitemap.xml"));
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const config = JSON.parse(read(join(ROOT, "site.config.json")));
  const base = (config.siteUrl || "").replace(/\/+$/, "");
  const paths = locs.map((l) => (base ? l.slice(base.length + 1) : l === "./" ? "" : l));
  const expected = ["", ...categories.map((c) => `category/${c.slug}/`), ...tools.map((t) => `tools/${t.slug}/`), ...(supportOn ? ["support/"] : []), ...(aboutOn ? ["about/"] : [])];
  assert.deepEqual([...paths].sort(), [...expected].sort());
  for (const p of paths) assert.ok(existsSync(join(ROOT, p, "index.html")), p);
});

test("كل صفحة أداة فيها روابط لأدوات ذات صلة وقوانين ومثال وزر نسخ وتنبيه", () => {
  for (const t of tools) {
    const html = read(join(ROOT, "tools", t.slug, "index.html"));
    assert.match(html, /id="h-related"/, t.slug);
    assert.ok((html.match(/href="\.\.\/\.\.\/tools\//g) || []).length >= 2, `${t.slug}: related links`);
    assert.match(html, /class="formula"/, t.slug);
    assert.match(html, /id="example-btn"/, t.slug);
    assert.match(html, /id="copy-btn"/, t.slug);
    assert.match(html, /للاستخدام التعليمي/, t.slug);
    assert.ok(!html.includes("noindex"), `${t.slug}: noindex`);
    assert.ok(!/class="katex-error"/.test(html), `${t.slug}: KaTeX error`);
  }
});

test("robots.txt و 404.html موجودان وسليمان", () => {
  assert.match(read(join(ROOT, "robots.txt")), /User-agent: \*/);
  const nf = read(join(ROOT, "404.html"));
  assert.match(nf, /noindex/);
  assert.ok(!/<link rel="stylesheet"|<script src=/.test(nf), "404 must be self-contained");
});

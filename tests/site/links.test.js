import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { htmlFiles, attrs, resolveTarget, read, rel, walk, ROOT } from "./helpers.js";

const config = JSON.parse(read(join(ROOT, "site.config.json")));
const siteUrl = (config.siteUrl || "").replace(/\/+$/, "");
const donate = (config.donate?.url || "").trim();
const allowed = (u) => (siteUrl && u.startsWith(siteUrl)) || (donate && u === new URL(donate).href);

test("لا توجد روابط داخلية مكسورة في أي صفحة", () => {
  const broken = [];
  let checked = 0;
  for (const f of htmlFiles()) {
    const html = read(f);
    for (const url of [...attrs(html, "href"), ...attrs(html, "src")]) {
      if (/^(https?:|mailto:|data:|#|javascript:)/.test(url)) continue;
      checked++;
      if (!existsSync(resolveTarget(f, url))) broken.push(`${rel(f)} → ${url}`);
    }
  }
  assert.deepEqual(broken, []);
  assert.ok(checked > 1000, `checked only ${checked} links`);
});

test("لا روابط مطلقة في الصفحات (عدا canonical و og:url لنطاق الموقع نفسه)", () => {
  const bad = [];
  for (const f of htmlFiles()) {
    const html = read(f);
    for (const url of [...attrs(html, "href"), ...attrs(html, "src"), ...attrs(html, "action")]) {
      if (url.startsWith("/") || (/^https?:/.test(url) && !allowed(url))) bad.push(`${rel(f)}: ${url}`);
    }
    for (const url of attrs(html, "content")) {
      if (/^https?:/.test(url) && !(siteUrl && url.startsWith(siteUrl))) bad.push(`${rel(f)} meta: ${url}`);
    }
  }
  assert.deepEqual(bad, []);
});

test("لا اعتماد على CDN أو موارد خارجية في الشيفرة أثناء التشغيل", () => {
  const bad = [];
  for (const f of walk().filter((p) => /\.(js|css|html)$/.test(p) && !rel(p).startsWith("vendor/"))) {
    const src = read(f);
    for (const m of src.matchAll(/(?:import\s*(?:[^'"]*from\s*)?|import\(|url\(|src=|href=)\s*["'`]?((?:https?:)?\/\/[^"'`)\s]+)/g)) {
      if (allowed(m[1])) continue;
      bad.push(`${rel(f)}: ${m[1]}`);
    }
  }
  assert.deepEqual(bad, []);
});

test("استيرادات الوحدات في JavaScript نسبية فقط", () => {
  const bad = [];
  for (const f of walk().filter((p) => p.endsWith(".js") && /^(lib|assets)\//.test(rel(p)))) {
    const src = read(f);
    const specs = [...src.matchAll(/^\s*(?:import|export)\b[^;]*?\bfrom\s*["']([^"']+)["']/gm), ...src.matchAll(/\bimport\(\s*[`"']([^`"']+)[`"']/g)].map((m) => m[1]);
    for (const s of specs) if (!s.startsWith(".")) bad.push(`${rel(f)}: ${s}`);
    if (f.endsWith("ui.js")) assert.ok(specs.length >= 3, "import scan should find imports in ui.js");
  }
  assert.deepEqual(bad, []);
});

test("لا ملفات حساسة أو بيانات شخصية في المستودع", () => {
  const bad = [];
  for (const f of walk()) {
    const r = rel(f);
    if (/(^|\/)\.env|\.pem$|\.key$|id_rsa/.test(r)) bad.push(r);
    if (/\.(js|html|json|md|css)$/.test(r) && !r.startsWith("vendor/")) {
      const s = read(f);
      if (/@gmail\.com|@hotmail\.com|password\s*[:=]|api[_-]?key\s*[:=]\s*["'][A-Za-z0-9]/i.test(s)) bad.push(`${r} (محتوى)`);
    }
  }
  assert.deepEqual(bad, []);
});

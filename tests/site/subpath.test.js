import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { htmlFiles, attrs, read, rel, ROOT } from "./helpers.js";

const PORT = 4400 + Math.floor(Math.random() * 400);
const BASE = `http://localhost:${PORT}/test-repo/`;
let server;

before(async () => {
  server = spawn(process.execPath, [join(ROOT, "scripts", "serve.mjs"), "--port", String(PORT), "--base", "/test-repo/"], { stdio: "pipe" });
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(BASE); if (r.ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("server did not start");
});

after(() => server?.kill());

test("كل الصفحات وكل مواردها تُحمَّل بنجاح من المسار الفرعي /test-repo/", async () => {
  const urls = new Set();
  for (const f of htmlFiles().filter((p) => !rel(p).startsWith("vendor/") && rel(p) !== "404.html")) {
    const pageUrl = new URL(rel(f).replace(/index\.html$/, ""), BASE);
    urls.add(pageUrl.href);
    for (const u of [...attrs(read(f), "href"), ...attrs(read(f), "src")]) {
      if (/^(https?:|data:|#|mailto:)/.test(u)) continue;
      urls.add(new URL(u, pageUrl).href.split("#")[0]);
    }
  }
  urls.add(new URL("vendor/katex/fonts/KaTeX_Main-Regular.woff2", BASE).href);
  urls.add(new URL("lib/core/parser.js", BASE).href);
  const failed = [];
  const list = [...urls];
  for (let i = 0; i < list.length; i += 25) {
    const res = await Promise.all(list.slice(i, i + 25).map(async (u) => [u, (await fetch(u)).status]));
    for (const [u, s] of res) if (s !== 200) failed.push(`${s} ${u}`);
  }
  assert.deepEqual(failed, []);
  assert.ok(list.length >= 80, `only ${list.length} urls`);
});

test("كل الروابط تبقى داخل المسار الفرعي ولا تخرج إلى جذر النطاق", async () => {
  for (const f of htmlFiles().filter((p) => !rel(p).startsWith("vendor/") && rel(p) !== "404.html")) {
    const pageUrl = new URL(rel(f).replace(/index\.html$/, ""), BASE);
    for (const u of [...attrs(read(f), "href"), ...attrs(read(f), "src"), ...attrs(read(f), "action")]) {
      if (/^(https?:|data:|#|mailto:)/.test(u)) continue;
      assert.ok(new URL(u, pageUrl).pathname.startsWith("/test-repo/"), `${rel(f)}: ${u}`);
    }
  }
});

test("صفحة غير موجودة تعيد 404 مع صفحة الخطأ العربية", async () => {
  const r = await fetch(new URL("tools/not-a-tool/", BASE));
  assert.equal(r.status, 404);
  assert.match(await r.text(), /الصفحة غير موجودة/);
});

test("الخادم لا يكشف ملفات المطوّر (node_modules و tests و .git)", async () => {
  for (const p of ["node_modules/katex/package.json", "tests/unit/helpers.js", ".git/config", "../package.json"]) {
    assert.equal((await fetch(new URL(p, BASE))).status, 404, p);
  }
});

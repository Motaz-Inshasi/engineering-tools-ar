import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { donateHtml, donateUrl } from "../../scripts/site-parts.mjs";
import { htmlFiles, read, rel, ROOT } from "./helpers.js";

const base = { donate: { url: "", label: "ادعم الموقع", text: "نص" } };
const withUrl = (url, extra = {}) => ({ donate: { ...base.donate, url, ...extra } });

test("زر التبرع مخفي تماماً عندما يكون الرابط فارغاً", () => {
  assert.equal(donateHtml(base), "");
  assert.equal(donateHtml({}), "");
  assert.equal(donateHtml(withUrl("   ")), "");
});

test("زر التبرع يظهر برابط آمن عند إضافة الرابط", () => {
  const html = donateHtml(withUrl("https://ko-fi.com/example"));
  assert.match(html, /href="https:\/\/ko-fi\.com\/example"/);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /ادعم الموقع/);
  assert.match(html, /class="sr-only"> \(يفتح في نافذة جديدة\)/);
  assert.match(html, /<p>نص<\/p>/);
});

test("روابط غير آمنة تُرفض برسالة واضحة، والنصوص تُهرَّب", () => {
  assert.throws(() => donateUrl(withUrl("http://ko-fi.com/x")), /https/);
  assert.throws(() => donateUrl(withUrl("javascript:alert(1)")), /https/);
  assert.throws(() => donateUrl(withUrl("ko-fi.com/x")), /غير صالح/);
  const html = donateHtml(withUrl("https://example.com/?a=1&b=2", { label: "<b>x</b>" }));
  assert.ok(html.includes("&amp;b=2") && html.includes("&lt;b&gt;x&lt;/b&gt;") && !html.includes("<b>x"));
});

test("حالة الصفحات المولّدة تطابق الإعداد الحالي", () => {
  const config = JSON.parse(read(join(ROOT, "site.config.json")));
  const has = !!(config.donate?.url || "").trim();
  for (const f of htmlFiles().filter((p) => !rel(p).startsWith("vendor/") && rel(p) !== "404.html")) {
    assert.equal(read(f).includes('class="donate"'), has, rel(f));
  }
});

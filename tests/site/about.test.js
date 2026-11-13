import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { emailHtml, isEmail } from "../../scripts/site-parts.mjs";
import { GROUPS, ICON_SLUGS, catIcon } from "../../scripts/icons.mjs";
import { categories } from "../../assets/js/registry.js";
import { read, ROOT } from "./helpers.js";

const config = JSON.parse(readFileSync(join(ROOT, "site.config.json"), "utf8"));

test("البريد يُكتب مموّهاً ولا يظهر نصاً صريحاً في HTML", () => {
  const h = emailHtml("someone@example.com");
  assert.ok(!h.includes("someone@example.com"));
  assert.ok(h.includes('data-u="enoemos"'));
  assert.ok(h.includes('data-d="moc.elpmaxe"'));
  assert.equal(emailHtml("not-an-email"), "");
  assert.ok(isEmail("a.b@c.io"));
  assert.ok(!isEmail("a@b"));
});

test("صفحة التواصل موجودة ولا تحتوي البريد صريحاً", { skip: !config.author }, () => {
  const p = join(ROOT, "about", "index.html");
  assert.ok(existsSync(p));
  const html = read(p);
  assert.ok(html.includes(config.author.name));
  if (config.author.email) {
    assert.ok(!html.includes(config.author.email), "email must be obfuscated");
    assert.ok(html.includes("data-u="));
  }
  assert.ok(read(join(ROOT, "sitemap.xml")).includes("about/"));
});

test("كل قسم له أيقونة ومجموعة واحدة فقط", () => {
  const inGroups = GROUPS.flatMap((g) => g.cats);
  assert.equal(new Set(inGroups).size, inGroups.length);
  for (const c of categories) {
    assert.ok(ICON_SLUGS.includes(c.slug), `${c.slug}: icon`);
    assert.ok(inGroups.includes(c.slug), `${c.slug}: group`);
    assert.match(catIcon(c.slug), /^<svg [^>]*aria-hidden="true"/);
  }
});

test("الصفحة الرئيسية تحتوي شبكة الأقسام وقسم آخر الأدوات", () => {
  const html = read(join(ROOT, "index.html"));
  assert.ok(html.includes('id="browse"'));
  assert.ok(html.includes('id="recent"'));
  assert.equal((html.match(/class="tile-ic"/g) || []).length, categories.length);
});

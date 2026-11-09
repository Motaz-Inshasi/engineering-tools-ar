import { test } from "node:test";
import { assert } from "./helpers.js";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tools, categories } from "../../assets/js/registry.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function live() {
  const out = [];
  for (const t of tools) {
    const p = join(ROOT, "lib", t.category, `${t.slug}.js`);
    if (!existsSync(p) || !readFileSync(p, "utf8").trim()) continue;
    const mod = await import(pathToFileURL(p).href);
    if (mod.meta) out.push({ ...t, mod });
  }
  return out;
}

test("السجل: أسماء فريدة وتصنيفات صحيحة", () => {
  assert.equal(new Set(tools.map((t) => t.slug)).size, tools.length);
  for (const t of tools) assert.ok(categories.some((c) => c.slug === t.category), t.slug);
});

test("كل أداة جاهزة لها بيانات كاملة وأسماء حقول صالحة", async () => {
  for (const t of await live()) {
    const m = t.mod.meta;
    assert.ok(m.description && m.description.length > 40, `${t.slug}: description`);
    assert.ok(Array.isArray(m.formulas) && m.formulas.length >= 1, `${t.slug}: formulas`);
    assert.ok(m.example && m.example.values && m.example.expect.length >= 1, `${t.slug}: example`);
    assert.ok(m.invalid && m.invalid.values, `${t.slug}: invalid`);
    assert.equal(typeof t.mod.solve, "function", `${t.slug}: solve`);
    const ids = m.inputs.map((i) => i.id);
    assert.equal(new Set(ids).size, ids.length, `${t.slug}: duplicate input ids`);
    for (const id of ids) {
      assert.ok(!["q", "site-q", "home-search"].includes(id), `${t.slug}: input id «${id}» is reserved`);
      assert.match(id, /^[A-Za-z][A-Za-z0-9_]*$/, `${t.slug}: input id «${id}»`);
    }
    for (const r of m.related || []) assert.ok(tools.some((x) => x.slug === r), `${t.slug}: related «${r}» not in registry`);
  }
});

test("كل أداة جاهزة لها ملف اختبار غير فارغ فيه 5 تحققات على الأقل", async () => {
  for (const t of await live()) {
    const p = join(ROOT, "tests", "unit", t.category, `${t.slug}.test.js`);
    assert.ok(existsSync(p), `${t.slug}: missing test file`);
    const src = readFileSync(p, "utf8");
    const checks = (src.match(/\b(assert\.\w+|close|throwsInput|checkExample)\(/g) || []).length;
    assert.ok(checks >= 5, `${t.slug}: only ${checks} checks`);
  }
});

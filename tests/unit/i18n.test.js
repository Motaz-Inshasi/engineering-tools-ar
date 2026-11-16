import { test } from "node:test";
import { assert } from "./helpers.js";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tools } from "../../assets/js/registry.js";
import { LANGS, RTL, translateSource, keyOf, validTranslation, sourceFiles, extract, outPath, loadDict } from "../../scripts/i18n.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const released = existsSync(join(ROOT, "i18n", "released.json")) ? JSON.parse(readFileSync(join(ROOT, "i18n", "released.json"), "utf8")) : {};
const ARABIC = /[ء-ي]/;
const TEXT_EXAMPLES = new Set(["word-counter", "json-formatter"]);

const numbers = (s) => (String(s).match(/-?\d+\.\d+(?:e[-+]?\d+)?|-?\d{3,}/gi) || []).sort();
const shape = (r) => ({
  results: r.results.length,
  steps: (r.steps || []).length,
  blocks: (r.blocks || []).map((b) => b.type + (b.rows ? `:${b.rows.length}` : "") + (b.series ? `:${b.series.map((s) => s.points.length).join("/")}` : "")).join(","),
  nums: numbers([...r.results.map((x) => x.value), ...(r.steps || []).map((s) => (typeof s === "string" ? s : s.tex || ""))].join(" "))
});

test("مستخرج النصوص يعيد بناء الكود كما هو عند الترجمة المطابقة", () => {
  const src = 'const a = "مرحبا";\nconst b = `العدد ${n} من ${m > 1 ? "عناصر" : "عنصر"}`;\nconst c = "x";\nconst d = `{0} حرفي ${k}`;';
  const dict = {};
  for (const text of ["مرحبا", "العدد {%0} من {%1}", "عناصر", "عنصر", "{0} حرفي {%0}"]) dict[keyOf(text)] = text;
  const out = translateSource(src, dict);
  const run = (code) => new Function("n", "m", "k", `${code}\nreturn [a, b, c, d];`)(3, 2, 7);
  assert.deepEqual(run(out), run(src));
  const en = {};
  en[keyOf("مرحبا")] = "Hello";
  en[keyOf("العدد {%0} من {%1}")] = "number {%0} of {%1}";
  en[keyOf("عناصر")] = "items";
  en[keyOf("عنصر")] = "item";
  en[keyOf("{0} حرفي {%0}")] = "{0} literal `x` ${ok} \\ {%0}";
  const t = run(translateSource(src, en));
  assert.deepEqual(t, ["Hello", "number 3 of items", "x", "{0} literal `x` ${ok} \\ 7"]);
  assert.equal(validTranslation("العدد {%0} من {%1}", "number {%1} of {%0}"), true);
  assert.equal(validTranslation("العدد {%0} من {%1}", "number {%0}"), false);
  assert.equal(validTranslation("نص", ""), false);
});

test("ملفات النصوص المستخرجة محدّثة مع الكود العربي", () => {
  for (const f of sourceFiles()) {
    const p = join(ROOT, "i18n", "src", `${f}.json`);
    const now = extract(f);
    if (!now.length) { assert.ok(!existsSync(p), `${f}: ملف مستخرج زائد`); continue; }
    assert.ok(existsSync(p), `${f}: شغّل node scripts/i18n.mjs extract`);
    assert.deepEqual(JSON.parse(readFileSync(p, "utf8")), now, `${f}: شغّل node scripts/i18n.mjs extract`);
  }
});

for (const lang of LANGS) {
  if (!existsSync(join(ROOT, `lib-${lang}`))) continue;
  test(`${lang}: نسخة الأدوات المبنية محدّثة مع الكود العربي والترجمات`, () => {
    for (const f of sourceFiles()) {
      const built = join(ROOT, outPath(lang, f));
      assert.ok(existsSync(built), `${built}: شغّل npm run i18n`);
      assert.equal(readFileSync(built, "utf8"), translateSource(readFileSync(join(ROOT, f), "utf8"), loadDict(lang, f)), `${f} (${lang}): شغّل npm run i18n`);
    }
  });
}

for (const lang of LANGS) {
  const cats = new Set(released[lang] || []);
  if (!cats.size) continue;
  const { tools: ltools, categories: lcats } = await import(pathToFileURL(join(ROOT, `assets/js/registry.${lang}.js`)).href);
  test(`${lang}: السجل مترجم للأقسام المنشورة`, () => {
    for (const c of lcats.filter((x) => cats.has(x.slug))) {
      if (!RTL.has(lang)) assert.ok(!ARABIC.test(c.title + c.description), `${lang} ${c.slug}`);
    }
    for (const t of ltools.filter((x) => cats.has(x.category))) if (!RTL.has(lang)) assert.ok(!ARABIC.test(t.title), `${lang} ${t.slug}: ${t.title}`);
  });
  for (const t of tools.filter((x) => cats.has(x.category))) {
    const arPath = join(ROOT, "lib", t.category, `${t.slug}.js`);
    if (!existsSync(arPath)) continue;
    test(`${lang}: ${t.slug} يعطي نفس الحساب بعد الترجمة`, async () => {
      const ar = await import(pathToFileURL(arPath).href);
      const tr = await import(pathToFileURL(join(ROOT, `lib-${lang}`, t.category, `${t.slug}.js`)).href);
      assert.deepEqual(tr.meta.inputs.map((i) => [i.id, i.type, (i.options || []).map((o) => o[0]).join("|")]), ar.meta.inputs.map((i) => [i.id, i.type, (i.options || []).map((o) => o[0]).join("|")]));
      const a = ar.solve(ar.meta.example.values);
      const b = tr.solve(tr.meta.example.values);
      const sa = shape(a), sb = shape(b);
      if (TEXT_EXAMPLES.has(t.slug)) { delete sa.nums; delete sb.nums; }
      assert.deepEqual(sb, sa);
      const all = JSON.stringify(b);
      if (!TEXT_EXAMPLES.has(t.slug)) for (const e of ar.meta.example.expect) for (const n of String(e).match(/-?\d+(?:\.\d+)?/g) || []) assert.ok(all.includes(n), `${t.slug}: expect number ${n} from «${e}»`);
      let fa = null, fb = null;
      try { ar.solve(ar.meta.invalid.values); } catch (e) { fa = e.field ?? null; }
      try { tr.solve(tr.meta.invalid.values); } catch (e) { fb = e.field ?? null; assert.equal(e.name, "InputError"); }
      assert.equal(fb, fa);
      if (!RTL.has(lang)) {
        const text = JSON.stringify([tr.meta.description, tr.meta.inputs.map((i) => [i.label, i.help, i.options]), b.results, b.steps, b.blocks?.filter((x) => x.type !== "html" && x.type !== "plot")]);
        const m = text.match(/[ء-ي][^"]{0,40}/);
        assert.ok(!m, `${t.slug}: نص عربي غير مترجم «${m && m[0]}»`);
      }
    });
  }
}

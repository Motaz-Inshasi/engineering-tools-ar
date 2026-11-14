import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/programming/js-checker.js";
import { escapeHtml, codeBlock, closest } from "../../../lib/programming/code-view.js";

const run = (code, mode = "script") => mod.solve({ code, mode });
const all = (code, mode) => run(code, mode).results.map((r) => r.value).join(" | ");
const first = (code, mode) => run(code, mode).results.find((r) => r.label === "أول خطأ" || r.label === "أهم تحذير")?.value || "";

test("المثال المحلول ورسالة الخطأ", () => {
  const r = checkExample(mod);
  assert.match(r.results[0].value, /❌/);
  assert.match(first(mod.meta.example.values.code), /السطر 7: .*«totl».*«total»/);
});

test("أخطاء الصياغة تُشرح بالعربية مع رقم السطر الصحيح", () => {
  assert.match(first("let x = 1\nlet x = 2"), /^السطر 2: .*«x» معرّف مسبقاً/);
  assert.match(first("console.log(\"hi)"), /لم يُغلق بعلامة التنصيص/);
  assert.match(first("const a;"), /«a».*const يجب أن يُعطى قيمة/);
  assert.match(first("if (x) {\n  y()\n"), /^السطر 1: انتهى الكود والقوس «\{»/);
  assert.match(first("function f( {"), /القوس «\(» .*لم يُغلق قبل «\{»/);
  assert.match(first("for (let i = 0; i < 3; i++ {\n}"), /القوس «\(» .*لم يُغلق قبل «\{»/);
  assert.match(first("f(1 2)"), /ينقص فاصلة «,» بين «1» و«2»/);
  assert.match(first("obj = {a:1 b:2}"), /ينقص فاصلة «,» بين خصائص الكائن/);
  assert.match(first("let y = 5 +;"), /العامل «\+» يحتاج قيمة/);
  assert.match(first("let z = (1 + 2]"), /«\]» لا يطابق القوس «\(»/);
  assert.match(first("return 5"), /return مكتوبة خارج أي دالة/);
  assert.match(first("await g()"), /async/);
  assert.match(first("import x from \"y\""), /import و export/);
  assert.equal(run("import x from \"y\";\nconsole.log(x);", "module").results[0].value, "✅ لا توجد أخطاء");
  assert.match(all("let t = “hi”"), /علامة تنصيص «ذكية»/);
  assert.match(first("x = 3px"), /3px/);
  assert.match(first("5 = x"), /الطرف الأيسر/);
});

test("الأخطاء المنطقية الشائعة", () => {
  assert.match(first("const n = 5;\nn = 6;"), /^السطر 2: .*الثابت «n»/);
  assert.match(first("let v = 3;\nif (v = 4) { console.log(v) }"), /إسناد = داخل شرط/);
  assert.match(all("let v;\nif (typeof v === \"strng\") {}"), /إلى "string"/);
  assert.match(all("let q = NaN;\nif (q === NaN) {}"), /المقارنة مع NaN.*Number\.isNaN/);
  assert.match(first("function h(){ return 1; console.log(2) }\nh()"), /لن يُنفَّذ أبداً/);
  assert.match(first("let o = {a:1, a:2};\nconsole.log(o)"), /المفتاح «a» مكرر/);
  assert.match(first("switch(1){case 1: console.log(1)\ncase 2: break}"), /break/);
  assert.match(first("conole.log(5)"), /«conole».*«console»/);
  assert.match(first("let arr = [1];\nconsole.log(arr.lenght)"), /«lenght».*«length»/);
  assert.match(all("let a = 1;\nif (a == \"1\") {}"), /المقارنة == تحوّل الأنواع.*استخدم === للمقارنة الصارمة/);
  assert.match(first("if (x > 1); { console.log(1) }\nlet x = 2;"), /فاصلة منقوطة مباشرة بعد شرط/);
});

test("كود صحيح ومتنوع لا يعطي أخطاء ولا تحذيرات كاذبة", () => {
  const good = [
    "class Stack {\n  #items = [];\n  push(x) { this.#items.push(x); return this; }\n  get size() { return this.#items.length; }\n}",
    "const { a, b: [c, ...rest] } = { a: 1, b: [2, 3] };\nconsole.log(a + c, rest);",
    "async function load(url) {\n  try {\n    const res = await fetch(url);\n    return await res.json();\n  } catch (err) {\n    console.error(err);\n  }\n}\nload('/x');",
    "document.querySelector('#b')?.addEventListener('click', (e) => e.preventDefault());",
    "const obj = { when: 1, then: 2 };\nconsole.log(obj.when, obj.then, typeof missing === 'undefined');",
    "let counter = 0;\ncounter++;\nconsole.log(counter == null);"
  ];
  for (const g of good) {
    const r = run(g);
    assert.equal(r.results[0].value, "✅ لا توجد أخطاء", g);
  }
  assert.equal(run("export function f() { return 1; }\nexport const k = 2;", "module").results.find((x) => x.label === "الملخص").value, "0 خطأ، 0 تحذير، 0 ملاحظة");
});

test("عرض الكود آمن ويعلّم موضع الخطأ", () => {
  const r = run("let s = \"<b>\";\nlet s = 1;");
  const html = r.blocks.find((b) => b.type === "html").html;
  assert.ok(html.includes("&lt;b&gt;"));
  assert.ok(!html.includes("<b>"));
  assert.ok(html.includes('<span class="bad">'));
  assert.equal(escapeHtml(`<a href="x">'&`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;");
  const long = Array.from({ length: 200 }, (_, i) => `l${i}`).join("\n");
  const block = codeBlock(long, [{ line: 100, col: 0, len: 2 }]).html;
  assert.ok(block.includes('<span class="bad">l9</span>9'));
  assert.ok(block.includes(">l96\n") && !block.includes(">l10\n"));
  assert.ok(block.startsWith('<pre class="code" dir="ltr"><code><span class="ln">   </span>…'));
  assert.ok(block.endsWith('<span class="ln">   </span>…</code></pre>'));
  assert.equal(closest("totl", ["total", "list"]), "total");
  assert.equal(closest("abc", ["xyz"]), null);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => run(""), "code");
  throwsInput(() => run("x".repeat(200001)), "code");
  throwsInput(() => mod.solve({ code: "let a = 1;", mode: "python" }), "mode");
});

import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/programming/json-formatter.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const problem = (text) => {
  const r = mod.parseJson(text);
  assert.equal(r.ok, false, `expected a syntax error for ${JSON.stringify(text)}`);
  return r.problem;
};

test("التنسيق بمسافتين يطابق JSON.stringify", () => {
  const x = { a: 1, b: [true, null, "s"], c: { d: {}, e: [] }, f: "مرحبا" };
  const r = mod.parseJson(JSON.stringify(x));
  assert.equal(r.ok, true);
  assert.equal(mod.formatJson(r.tree, "format", "  ", false), JSON.stringify(x, null, 2));
  assert.equal(mod.formatJson(r.tree, "minify", null, false), JSON.stringify(x));
});

test("الترتيب الأبجدي للمفاتيح وإزاحة التبويب", () => {
  const sorted = mod.parseJson('{"b":1,"a":{"d":1,"c":2}}');
  assert.equal(mod.formatJson(sorted.tree, "minify", null, true), '{"a":{"c":2,"d":1},"b":1}');
  const tab = mod.parseJson('{"a":[1]}');
  assert.equal(mod.formatJson(tab.tree, "format", "\t", false), '{\n\t"a": [\n\t\t1\n\t]\n}');
});

test("إحصاءات البنية", () => {
  const res = mod.solve({ text: '{"a":1,"b":[2,3]}', mode: "validate", indent: "2", sortKeys: "" });
  const get = (label) => res.results.find((x) => x.label === label).value;
  assert.equal(get("عدد المفاتيح"), "2");
  assert.equal(get("عدد القيم"), "5");
  assert.equal(get("أقصى عمق"), "2");
  assert.equal(get("نوع القيمة الجذرية"), "كائن");
});

test("موقع الأخطاء بالسطر والعمود", () => {
  const cases = [
    ['{"a":1,}', 1, 8, "فاصلة زائدة"],
    ["{'a':1}", 1, 2, "مزدوجتين"],
    ["{a:1}", 1, 2, "علامتي تنصيص"],
    ["[1 2]", 1, 4, "فاصلة"],
    ['{"a" 1}', 1, 6, "النقطتين"],
    ['"abc', 1, 1, "علامة التنصيص"],
    ['{\n"a": "x\n}', 2, 6, "علامة التنصيص"],
    ["{\n  \"a\": 1", 2, 9, "السطر 1"],
    ['{"a": True}', 1, 7, "true"],
    ["[1]]", 1, 4, "زائد"],
    ["[01]", 1, 2, "صفر"],
    ['"\\x41"', 1, 2, "تسلسل"],
    ['"a\tb"', 1, 3, "تحكم"],
    ["{} {}", 1, 4, "زائد"],
    ['{"a":1 // x\n}', 1, 8, "التعليقات"]
  ];
  for (const [text, line, col, part] of cases) {
    const p = problem(text);
    assert.equal(p.line, line, `line for ${JSON.stringify(text)}`);
    assert.equal(p.col, col, `column for ${JSON.stringify(text)}`);
    assert.ok(p.message.includes(part) || p.suggestion.includes(part), `message for ${JSON.stringify(text)}: ${p.message}`);
  }
});

test("عرض الخطأ في الواجهة", () => {
  const res = mod.solve({ text: '{"a":1,}', mode: "format", indent: "2", sortKeys: "" });
  assert.equal(res.results[0].value, "❌ وُجد 1 خطأ");
  const row = res.blocks.find((b) => b.type === "table").rows[0];
  assert.deepEqual(row.slice(0, 2), ["1", "8"]);
  const html = res.blocks.find((b) => b.type === "html").html;
  assert.ok(html.includes('<span class="bad">}</span>'));
  assert.ok(html.includes('<span class="ln">1</span>'));
});

test("الإدخال الفارغ والنص الطويل", () => {
  throwsInput(() => mod.solve({ text: "  \n ", mode: "format", indent: "2", sortKeys: "" }), "text");
  throwsInput(() => mod.solve({ text: "1".repeat(200001), mode: "format", indent: "2", sortKeys: "" }), "text");
});

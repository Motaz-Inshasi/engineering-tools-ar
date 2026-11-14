import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/programming/bracket-checker.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const run = (text, lang = "clike") => mod.solve({ text, lang });
const rowsOf = (res) => {
  const t = res.blocks.find((b) => b.type === "table" && b.head[0] === "السطر");
  return t ? t.rows : [];
};
const countOf = (res, ch) => {
  const t = res.blocks.find((b) => b.type === "table" && b.head[0] === "الرمز");
  return t.rows.find((r) => r[0] === ch)[1];
};

test("الأقواس داخل النصوص والتعليقات لا تُحسب", () => {
  const c = run('int main() {\n  printf("([{");  // ) ] }\n  /* ( */ return 0;\n}');
  assert.equal(c.results[0].value, "✅ لا توجد أخطاء");
  assert.equal(rowsOf(c).length, 0);
  const py = run("s = '''(\n'''\nx = [1]  # (\nprint(s)", "python");
  assert.equal(py.results[0].value, "✅ لا توجد أخطاء");
});

test("الأقواس غير المغلقة في if (a[0] > 1 {", () => {
  const rows = rowsOf(run("if (a[0] > 1 {"));
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0].slice(0, 2), ["1", "4"]);
  assert.ok(rows[0][2].includes("(") && rows[0][2].includes("لم يُغلق"), rows[0][2]);
  assert.deepEqual(rows[1].slice(0, 2), ["1", "14"]);
  assert.ok(rows[1][2].includes("{"), rows[1][2]);
});

test("عدم تطابق الأقواس يذكر موقع القوس المفتوح", () => {
  const res = run("foo(]");
  const rows = rowsOf(res);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].slice(0, 2), ["1", "5"]);
  assert.ok(rows[0][2].includes("العمود 4"), rows[0][2]);
  assert.ok(rows[0][2].includes(")"), rows[0][2]);
  assert.equal(run("( [ )").results[1].value, "1");
});

test("القوس الزائد والإغلاق بلا فتح", () => {
  const rows = rowsOf(run("}"));
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].slice(0, 2), ["1", "1"]);
  assert.ok(rows[0][2].includes("لا يقابله"));
});

test("النص غير المغلق يحدد بداية النص", () => {
  const rows = rowsOf(run('int a = "abc;\nint b = (1);'));
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].slice(0, 2), ["1", "9"]);
  assert.ok(rows[0][2].includes("لم يُغلق"));
  const block = rowsOf(run("a /* x"));
  assert.deepEqual(block[0].slice(0, 2), ["1", "3"]);
});

test("لغة Python: النص متعدد الأسطر يُتجاهل وعلامة التعليق", () => {
  assert.equal(rowsOf(run('s = """(\n"""\nprint(1)', "python")).length, 0);
  assert.equal(rowsOf(run("x = 1  # ((", "python")).length, 0);
});

test("النص العادي يحسب الأقواس داخل علامات التنصيص", () => {
  assert.equal(rowsOf(run('x "(" ', "plain")).length, 1);
  assert.equal(rowsOf(run('x "(" ', "clike")).length, 0);
});

test("عدد الأقواس وأقصى عمق تداخل", () => {
  const res = run("(a[0]) {}");
  assert.equal(countOf(res, "("), "1");
  assert.equal(countOf(res, "]"), "1");
  assert.equal(countOf(res, "{"), "1");
  assert.equal(res.results[4].value, "2");
});

test("الحد الأقصى لعدد المشكلات المعروضة", () => {
  const res = run(")".repeat(60));
  assert.equal(res.results[0].value, "❌ وُجد 60 خطأ");
  assert.equal(rowsOf(res).length, 50);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ text: "  \n", lang: "clike" }), "text");
  throwsInput(() => mod.solve({ text: "x", lang: "ruby" }), "lang");
});

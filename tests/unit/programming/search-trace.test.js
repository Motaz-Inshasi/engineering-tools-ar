import { test } from "node:test";
import { assert, throwsInput, checkExample, rng, resultValue } from "../helpers.js";
import * as mod from "../../../lib/programming/search-trace.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const SORTED = "1, 3, 5, 7, 9, 11, 13";
const bin = (list, target) => mod.solve({ list, target: String(target), algo: "binary" });
const lin = (list, target) => mod.solve({ list, target: String(target), algo: "linear" });

test("البحث الثنائي: 7 في index 3 بمقارنة واحدة، و13 في index 6", () => {
  const a = bin(SORTED, 7);
  assert.equal(resultValue(a, "النتيجة"), "موجودة");
  assert.equal(resultValue(a, "الفهرس (0-based)"), "3");
  assert.equal(resultValue(a, "الموضع (1-based)"), "4");
  assert.equal(resultValue(a, "عدد المقارنات"), "1");
  const b = bin(SORTED, 13);
  assert.equal(resultValue(b, "الفهرس (0-based)"), "6");
  assert.equal(resultValue(b, "عدد المقارنات"), "3");
});

test("البحث الثنائي عن 4 غير موجودة بثلاث خطوات", () => {
  const res = bin(SORTED, 4);
  assert.equal(resultValue(res, "النتيجة"), "غير موجودة");
  assert.equal(resultValue(res, "عدد المقارنات"), "3");
  assert.equal(resultValue(res, "الفهرس (0-based)"), "—");
  const table = res.blocks.find((b) => b.type === "table");
  assert.equal(table.rows.length, 3);
});

test("البحث الخطي على 4, 2, 7 يجد 7 عند index 2 بثلاث مقارنات", () => {
  const res = lin("4, 2, 7", 7);
  assert.equal(resultValue(res, "الفهرس (0-based)"), "2");
  assert.equal(resultValue(res, "عدد المقارنات"), "3");
  assert.equal(resultValue(lin("4, 2, 7", 5), "النتيجة"), "غير موجودة");
});

test("أقصى عدد مقارنات: floor(log2 n)+1 للثنائي وn للخطي", () => {
  assert.equal(resultValue(bin(SORTED, 7), "أقصى عدد مقارنات"), "3");
  assert.equal(resultValue(bin("1,2,3,4,5,6,7,8", 1), "أقصى عدد مقارنات"), "4");
  assert.equal(resultValue(lin(SORTED, 7), "أقصى عدد مقارنات"), "7");
  assert.equal(resultValue(bin("5", 5), "أقصى عدد مقارنات"), "1");
});

test("القائمة غير المرتبة مع البحث الثنائي: ترتيب أولاً وتنبيه والفهرس بالنسبة للمرتبة", () => {
  const res = bin("9, 2, 7, 4", 9);
  assert.equal(resultValue(res, "الفهرس (0-based)"), "3");
  assert.equal(resultValue(res, "عدد المقارنات"), "3");
  const warn = res.blocks.find((b) => b.type === "note" && b.tone === "warn");
  assert.ok(warn && warn.text.includes("مرتبة"), "warn note expected");
  assert.equal(resultValue(res, "القائمة المرتبة"), "2, 4, 7, 9");
  assert.equal(res.blocks.filter((b) => b.type === "note" && b.tone === "warn").length, 1);
  assert.equal(bin(SORTED, 7).blocks.some((b) => b.type === "note" && b.tone === "warn"), false);
});

test("القيم المكررة: البحث الخطي يعيد أول موضع، والثنائي يعيد موضعاً من المكررات", () => {
  const lres = lin("2, 5, 2, 2, 8", 2);
  assert.equal(resultValue(lres, "الفهرس (0-based)"), "0");
  assert.ok(lres.blocks.some((b) => b.type === "note" && b.text.includes("أول موضع")));
  const bres = bin("1, 2, 2, 2, 3", 2);
  const idx = Number(resultValue(bres, "الفهرس (0-based)"));
  assert.ok(idx >= 1 && idx <= 3, `index ${idx}`);
});

test("البحث الخطي والثنائي يتفقان على وجود القيمة في قوائم عشوائية", () => {
  const next = rng(4242);
  for (let t = 0; t < 40; t++) {
    const n = 1 + Math.floor(next() * 25);
    const list = Array.from({ length: n }, () => Math.floor(next() * 50) - 20).sort((x, y) => x - y);
    const target = next() < 0.5 ? list[Math.floor(next() * n)] : 1000;
    const text = list.join(", ");
    const l = lin(text, target), b = bin(text, target);
    assert.equal(resultValue(l, "النتيجة"), resultValue(b, "النتيجة"), text);
    assert.ok(Number(resultValue(b, "عدد المقارنات")) <= Math.floor(Math.log2(n)) + 1, text);
    if (resultValue(b, "النتيجة") === "موجودة") {
      assert.equal(list[Number(resultValue(b, "الفهرس (0-based)"))], target, text);
    }
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ list: "", target: "7", algo: "binary" }), "list");
  throwsInput(() => mod.solve({ list: "1, x, 3", target: "7", algo: "linear" }), "list");
  throwsInput(() => mod.solve({ list: SORTED, target: "abc", algo: "binary" }), "target");
  throwsInput(() => mod.solve({ list: SORTED, target: "", algo: "binary" }), "target");
  throwsInput(() => mod.solve({ list: SORTED, target: "7", algo: "jump" }), "algo");
  throwsInput(() => mod.solve({ list: "1 ".repeat(100001), target: "1", algo: "linear" }), "list");
});

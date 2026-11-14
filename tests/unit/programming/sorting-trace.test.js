import { test } from "node:test";
import { assert, throwsInput, checkExample, rng, resultValue } from "../helpers.js";
import * as mod from "../../../lib/programming/sorting-trace.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const ALGOS = ["bubble", "selection", "insertion", "merge", "quick"];
const run = (list, algo = "bubble", order = "asc") => mod.solve({ list, algo, order });
const sortedOf = (res) => resultValue(res, "القائمة بعد الترتيب");

test("الفقاعات على 5, 1, 4, 2, 8 تعطي أربع تبديلات وتسع مقارنات", () => {
  const res = run("5,1,4,2,8", "bubble");
  assert.equal(sortedOf(res), "1, 2, 4, 5, 8");
  assert.equal(resultValue(res, "عدد المقارنات"), "9");
  assert.equal(resultValue(res, "التبديلات"), "4");
});

test("الاختيار على n=5 يعطي 10 مقارنات دائماً", () => {
  assert.equal(resultValue(run("5,1,4,2,8", "selection"), "عدد المقارنات"), "10");
  assert.equal(resultValue(run("9,7,5,3,1", "selection"), "عدد المقارنات"), "10");
});

test("الإدراج على قائمة مرتبة: n-1 مقارنات و0 إزاحات", () => {
  const res = run("1,2,3,4,5", "insertion");
  assert.equal(resultValue(res, "عدد المقارنات"), "4");
  assert.equal(resultValue(res, "الإزاحات"), "0");
});

test("القيم المعكوسة: الفقاعات والإدراج تعطيان n(n-1)/2 تبديلاً أو إزاحة", () => {
  assert.equal(resultValue(run("5,4,3,2,1", "bubble"), "التبديلات"), "10");
  assert.equal(resultValue(run("5,4,3,2,1", "insertion"), "الإزاحات"), "10");
  assert.equal(resultValue(run("5,4,3,2,1", "selection"), "التبديلات"), "2");
});

test("الدمج على 4,3,2,1: 4 مقارنات و8 كتابات", () => {
  const res = run("4,3,2,1", "merge");
  assert.equal(resultValue(res, "عدد المقارنات"), "4");
  assert.equal(resultValue(res, "الكتابات"), "8");
  assert.equal(sortedOf(res), "1, 2, 3, 4");
});

test("السريع على قائمة مرتبة من 3 عناصر: 3 مقارنات و0 تبديلات", () => {
  const res = run("1,2,3", "quick");
  assert.equal(resultValue(res, "عدد المقارنات"), "3");
  assert.equal(resultValue(res, "التبديلات"), "0");
});

test("كل الخوارزميات ترتب القوائم المختلفة بشكل صحيح في الاتجاهين", () => {
  const next = rng(777);
  const lists = [[1], [2, 1], [3, 3, 3], [-2, 5, -2, 0, 5], [1, 2, 3, 4, 5, 6], [6, 5, 4, 3, 2, 1]];
  for (let t = 0; t < 40; t++) {
    const n = 2 + Math.floor(next() * 28);
    lists.push(Array.from({ length: n }, () => Math.floor(next() * 21) - 10));
  }
  for (const list of lists) {
    if (list.length < 2) continue;
    const text = list.join(", ");
    for (const algo of ALGOS) {
      const asc = [...list].sort((x, y) => x - y).join(", ");
      const desc = [...list].sort((x, y) => y - x).join(", ");
      assert.equal(sortedOf(run(text, algo, "asc")), asc, `${algo} asc ${text}`);
      assert.equal(sortedOf(run(text, algo, "desc")), desc, `${algo} desc ${text}`);
    }
  }
});

test("الترتيب التنازلي والقيم السالبة والمكررة", () => {
  assert.equal(sortedOf(run("3, 1, 2", "bubble", "desc")), "3, 2, 1");
  assert.equal(sortedOf(run("-2 5 -2 0 5", "quick")), "-2, -2, 0, 5, 5");
  assert.equal(sortedOf(run("7 7 7", "merge", "desc")), "7, 7, 7");
});

test("الفقاعات تتوقف مبكراً وتذكر ذلك عند القائمة المرتبة", () => {
  const res = run("1,2,3,4", "bubble");
  const notes = res.blocks.filter((b) => b.type === "note").map((b) => b.text).join(" ");
  assert.ok(notes.includes("توقفت"), notes);
  assert.equal(resultValue(res, "التبديلات"), "0");
});

test("جدول التتبّع يحوي صفاً لكل مرور أو خطوة", () => {
  const table = run("5,1,4,2,8", "insertion").blocks.find((b) => b.type === "table");
  assert.equal(table.rows.length, 4);
  assert.equal(table.ltr, true);
  const sel = run("5,1,4,2,8", "selection").blocks.find((b) => b.type === "table");
  assert.equal(sel.rows.length, 4);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ list: "5", algo: "bubble", order: "asc" }), "list");
  throwsInput(() => mod.solve({ list: "", algo: "bubble", order: "asc" }), "list");
  throwsInput(() => mod.solve({ list: Array.from({ length: 31 }, (_, i) => i).join(","), algo: "bubble", order: "asc" }), "list");
  throwsInput(() => mod.solve({ list: "3, abc, 5", algo: "merge", order: "asc" }), "list");
  throwsInput(() => mod.solve({ list: "1 ".repeat(100001), algo: "bubble", order: "asc" }), "list");
  throwsInput(() => mod.solve({ list: "1, 2", algo: "xyz", order: "asc" }), "algo");
  throwsInput(() => mod.solve({ list: "1, 2", algo: "bubble", order: "up" }), "order");
});

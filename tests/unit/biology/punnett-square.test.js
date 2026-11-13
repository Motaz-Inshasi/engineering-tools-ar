import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/biology/punnett-square.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const ratios = (p1, p2, dominance = "complete") => mod.solve({ mode: "auto", p1, p2, dominance }).results.slice(0, 2).map((r) => r.value);

test("نسب مندل المعروفة", () => {
  assert.deepEqual(ratios("Aa", "Aa"), ["3:1", "1:2:1"]);
  assert.deepEqual(ratios("Aa", "aa"), ["1:1", "1:1"]);
  assert.deepEqual(ratios("AaBb", "AaBb"), ["9:3:3:1", "1:2:1:2:4:2:1:2:1"]);
  assert.deepEqual(ratios("AaBb", "aabb"), ["1:1:1:1", "1:1:1:1"]);
  assert.deepEqual(ratios("AABB", "aabb"), ["1", "1"]);
  assert.deepEqual(ratios("Aa", "Aa", "incomplete"), ["1:2:1", "1:2:1"]);
  assert.equal(ratios("AaBbCc", "AaBbCc")[0], "27:9:9:9:3:3:3:1");
});

test("الاحتمالات في الجداول مجموعها 100%", () => {
  const r = mod.solve({ mode: "auto", p1: "AaBbCc", p2: "AabbCc", dominance: "complete" });
  for (const b of r.blocks.slice(1)) {
    const s = b.rows.reduce((a, row) => a + parseFloat(row[2]), 0);
    assert.ok(Math.abs(s - 100) < 0.05, String(s));
  }
  assert.equal(r.blocks[0].rows.length, 4);
});

test("الوراثة المرتبطة بالكروموسوم X", () => {
  const v = (p1, p2) => mod.solve({ mode: "xlinked", p1, p2 }).results.map((r) => r.value);
  assert.deepEqual(v("XAXa", "XAY"), ["50%", "0%", "50%", "25%"]);
  assert.deepEqual(v("XAXa", "XaY"), ["50%", "50%", "50%", "50%"]);
  assert.deepEqual(v("XaXa", "XAY"), ["100%", "0%", "100%", "50%"]);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ mode: "auto", p1: "Ab", p2: "Aa" }), "p1");
  throwsInput(() => mod.solve({ mode: "auto", p1: "Aa", p2: "Bb" }), "p2");
  throwsInput(() => mod.solve({ mode: "auto", p1: "A1", p2: "Aa" }), "p1");
  throwsInput(() => mod.solve({ mode: "xlinked", p1: "XAY", p2: "XAY" }), "p1");
  throwsInput(() => mod.solve({ mode: "xlinked", p1: "XAXa", p2: "XAXa" }), "p2");
});

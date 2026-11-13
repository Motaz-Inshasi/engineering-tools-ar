import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/geometry/triangle-solver.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const run = (v) => mod.solve({ unit: "", ...v });
const nums = (s) => s.split("، ").map((x) => parseFloat(x.split("= ")[1]));

test("الحالات SSS و SAS و ASA", () => {
  const r = run({ a: "3", b: "4", c: "5" });
  close(nums(r.results[1].value)[2], 90, 1e-9);
  assert.equal(r.results[3].value, "مختلف الأضلاع، قائم الزاوية");
  assert.equal(run({ a: "8", c: "5", B: "60" }).results[0].value, "a = 8، b = 7، c = 5");
  const asa = nums(run({ A: "40", B: "60", c: "10" }).results[0].value);
  close(asa[0], (10 * Math.sin((40 * Math.PI) / 180)) / Math.sin((80 * Math.PI) / 180), 1e-5);
  assert.equal(run({ a: "1", b: "1", c: "1" }).results[3].value, "متساوي الأضلاع، حاد الزوايا");
});

test("الحالة الغامضة SSA: حلان أو حل أو لا حل", () => {
  assert.equal(run({ a: "6", b: "8", A: "30" }).blocks.length, 2);
  assert.equal(run({ a: "10", b: "8", A: "30" }).blocks.length, 1);
  assert.equal(run({ a: "4", b: "8", A: "30" }).blocks.length, 1);
  throwsInput(() => run({ a: "3", b: "8", A: "30" }), "a");
});

test("المساحة بهيرون تساوي نصف حاصل ضرب ضلعين في جيب الزاوية بينهما", () => {
  const r = run({ a: "7", b: "9", C: "50" });
  close(parseFloat(r.results[2].value), 0.5 * 7 * 9 * Math.sin((50 * Math.PI) / 180), 1e-5);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => run({ a: "1", b: "2", c: "5" }), "c");
  throwsInput(() => run({ A: "60", B: "60", C: "60" }), "a");
  throwsInput(() => run({ a: "3", b: "4" }), "a");
  throwsInput(() => run({ A: "100", B: "90", c: "5" }), "B");
  throwsInput(() => run({ a: "3", b: "4", C: "180" }), "C");
});

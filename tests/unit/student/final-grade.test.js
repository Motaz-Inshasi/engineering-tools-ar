import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/student/final-grade.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const solve = (current, weight, target) => mod.solve({ current, weight, target });

test("قيم معروفة يدوياً", () => {
  close(solve("80", "40", "85").values.need, 92.5, 1e-9);
  close(solve("90", "50", "80").values.need, 70, 1e-9);
  close(solve("50", "100", "70").values.need, 70, 1e-9);
  close(solve("0", "25", "50").values.need, 200, 1e-9);
  assert.equal(solve("80", "40", "85").results[0].value, "92.5%");
});

test("الحكم: مستحيل وممكن ومضمون", () => {
  assert.equal(solve("0", "25", "50").values.verdict, "مستحيل");
  assert.equal(solve("80", "40", "85").values.verdict, "ممكن");
  assert.equal(solve("100", "10", "80").values.verdict, "مضمون");
});

test("تحقق عكسي: الدرجة الحالية مع الدرجة المطلوبة تعطي الهدف", () => {
  for (const [c, w, t] of [["80", "40", "85"], ["65", "30", "72"], ["90", "50", "80"]]) {
    const r = solve(c, w, t);
    const weight = Number(w) / 100;
    close(r.values.kept + r.values.need * weight, Number(t), 1e-9);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => solve("80", "0", "85"), "weight");
  throwsInput(() => solve("80", "101", "85"), "weight");
  throwsInput(() => solve("", "40", "85"), "current");
  throwsInput(() => solve("80", "40", "-1"), "target");
  throwsInput(() => solve("120", "40", "85"), "current");
});

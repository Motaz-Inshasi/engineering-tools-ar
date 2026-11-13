import { test } from "node:test";
import { assert, close, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/differential-equations/ode-first-order.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const solveAt = (a, b, t0, y0, t1, preset = "none") => mod.solve({ a, b, t0, y0, t1, preset });
const yAt = (res) => parseFloat(resultValue(res, "قيمة y"));

test("قيم معروفة مع شروط ابتدائية مختلفة", () => {
  close(yAt(solveAt("1", "0", "0", "5", "1")), 5 * Math.exp(-1), 1e-3);
  close(yAt(solveAt("2", "4", "0", "0", "1")), 2 - 2 * Math.exp(-2), 1e-3);
  close(yAt(solveAt("0.5", "1", "3", "1", "5")), 2 - Math.exp(-1), 1e-3);
  close(yAt(solveAt("-0.5", "0", "0", "1", "2")), Math.exp(1), 1e-3);
  close(yAt(solveAt("0.1", "2", "0", "0", "10")), 20 * (1 - Math.exp(-1)), 1e-3);
});

test("حالة a = 0 تعطي y = y0 + b(t − t0)", () => {
  assert.equal(yAt(solveAt("0", "3", "0", "1", "2")), 7);
  assert.equal(yAt(solveAt("0", "3", "2", "1", "5")), 10);
});

test("الحل يحقق المعادلة y' + a·y = b على منحنى الرسم", () => {
  const res = solveAt("0.3", "1.2", "0", "-1", "4");
  const pts = res.blocks.find((b) => b.type === "plot").series[0].points;
  const h = pts[1][0] - pts[0][0];
  let worst = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const y = pts[i][1];
    const dy = (pts[i + 1][1] - pts[i - 1][1]) / (2 * h);
    worst = Math.max(worst, Math.abs(dy + 0.3 * y - 1.2));
  }
  assert.ok(worst < 1e-2, `residual ${worst}`);
});

test("الثابت الزمني والحالة المستقرة وزمن نصف الفرق", () => {
  const res = solveAt("0.1", "2", "0", "0", "10");
  assert.equal(resultValue(res, "الثابت الزمني"), "10");
  assert.equal(resultValue(res, "الحالة المستقرة"), "20");
  close(parseFloat(resultValue(res, "زمن نصف الفرق")), Math.LN2 / 0.1, 1e-3);
  assert.equal(res.copy.includes("y(10) = 12.64"), true);
});

test("بدون t1 لا تظهر قيمة y ويبقى الحل كاملاً", () => {
  const res = solveAt("0.1", "2", "0", "0", "");
  assert.ok(!res.results.some((r) => r.label.startsWith("قيمة y")));
  assert.ok(res.steps.length >= 6);
});

test("النماذج التطبيقية تضيف ملاحظة ووحدات دون تغيير الحل", () => {
  const plain = solveAt("0.1", "2", "0", "0", "10");
  const newton = solveAt("0.1", "2", "0", "0", "10", "newton");
  assert.equal(yAt(plain), yAt(newton));
  assert.ok(newton.blocks.some((b) => b.type === "note"));
  assert.ok(newton.blocks.some((b) => b.type === "table"));
});

test("أخطاء الإدخال", () => {
  throwsInput(() => solveAt("", "2", "0", "0", "10"), "a");
  throwsInput(() => solveAt("0.1", "2", "0", "", "10"), "y0");
  throwsInput(() => solveAt("0.1", "2", "0", "0", "10", "bogus"), "preset");
  throwsInput(() => solveAt("0.1", "", "0", "0", "10"), "b");
});

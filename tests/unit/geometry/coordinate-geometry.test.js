import { test } from "node:test";
import { assert, close, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/geometry/coordinate-geometry.js";

const pts = (x1, y1, x2, y2, x3 = "", y3 = "") => mod.solve({ ...mod.meta.example.values, mode: "points", x1, y1, x2, y2, x3, y3 });
const lines = (a1, b1, c1, a2, b2, c2) => mod.solve({ ...mod.meta.example.values, mode: "lines", a1, b1, c1, a2, b2, c2 });
const num = (s) => parseFloat(s);

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

test("المسافة والمنتصف والميل للنقطتين (0,0) و(4,6)", () => {
  const r = pts("0", "0", "4", "6");
  close(num(resultValue(r, "المسافة")), Math.sqrt(52), 1e-5);
  assert.equal(resultValue(r, "نقطة المنتصف"), "(2, 3) cm");
  assert.match(resultValue(r, "الميل"), /^3\/2/);
  close(num(resultValue(r, "زاوية الميل")), 56.30993, 1e-5);
  assert.equal(resultValue(r, "المعادلة بالميل"), "y = (3/2)x");
  assert.equal(resultValue(r, "الصيغة العامة"), "3x − 2y = 0");
});

test("الميل الصحيح والمقطع: النقطتان (1,1) و(3,5) تعطيان y = 2x − 1", () => {
  const r = pts("1", "1", "3", "5");
  assert.equal(resultValue(r, "الميل"), "2");
  assert.equal(resultValue(r, "المعادلة بالميل"), "y = 2x − 1");
  assert.equal(resultValue(r, "الصيغة العامة"), "2x − y − 1 = 0");
});

test("المستقيم الرأسي: الميل غير معرّف وزاوية الميل 90 درجة", () => {
  const r = pts("2", "0", "2", "5");
  assert.equal(resultValue(r, "الميل"), "غير معرّف");
  assert.equal(resultValue(r, "زاوية الميل"), "90°");
  assert.equal(resultValue(r, "المعادلة بالميل"), "x = 2");
  assert.equal(resultValue(r, "الصيغة العامة"), "x − 2 = 0");
});

test("البعد عن نقطة ثالثة وتحقق الاستقامة", () => {
  const off = pts("0", "0", "4", "6", "0", "5");
  close(num(resultValue(off, "بُعد النقطة الثالثة")), 10 / Math.sqrt(13), 1e-5);
  assert.equal(resultValue(off, "النقاط الثلاث"), "لا");
  assert.equal(resultValue(pts("0", "0", "4", "6", "2", "3"), "النقاط الثلاث"), "نعم");
});

test("تقاطع مستقيمين: 2x + y = 5 و x - y = 1 يتقاطعان في (2, 1)", () => {
  const r = lines("2", "1", "5", "1", "-1", "1");
  assert.equal(resultValue(r, "نقطة التقاطع"), "(2, 1) cm");
  assert.equal(resultValue(r, "متوازيان"), "لا");
  close(num(resultValue(r, "الزاوية الحادة")), 71.56505, 1e-5);
});

test("كشف التوازي والانطباق والتعامد", () => {
  const par = lines("2", "4", "1", "1", "2", "3");
  assert.equal(resultValue(par, "متوازيان"), "نعم");
  assert.match(resultValue(par, "نقطة التقاطع"), /لا توجد/);
  const same = lines("2", "4", "2", "1", "2", "1");
  assert.equal(resultValue(same, "متوازيان"), "نعم");
  assert.match(resultValue(same, "نقطة التقاطع"), /منطبقان/);
  const perp = lines("1", "1", "1", "1", "-1", "0");
  assert.equal(resultValue(perp, "متعامدان"), "نعم");
  assert.equal(resultValue(perp, "الزاوية الحادة"), "90°");
  assert.equal(resultValue(perp, "نقطة التقاطع"), "(0.5, 0.5) cm");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => pts("1", "1", "1", "1"), "x2");
  throwsInput(() => pts("0", "0", "4", "6", "1", ""), "y3");
  throwsInput(() => lines("0", "0", "1", "1", "2", "3"), "a1");
  throwsInput(() => lines("2", "1", "5", "0", "0", "1"), "a2");
});

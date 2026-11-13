import { test } from "node:test";
import { assert, close, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/geometry/circle-geometry.js";

const central = (r, theta) => mod.solve({ ...mod.meta.example.values, mode: "central", r, theta });
const three = (x1, y1, x2, y2, x3, y3) => mod.solve({ ...mod.meta.example.values, mode: "three", x1, y1, x2, y2, x3, y3 });
const equation = (D, E, F) => mod.solve({ ...mod.meta.example.values, mode: "equation", D, E, F });
const num = (s) => parseFloat(s);

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

test("الزاوية المركزية 90 درجة لدائرة نصف قطرها 2", () => {
  const res = central("2", "90");
  close(num(resultValue(res, "المحيط")), 4 * Math.PI, 1e-5);
  close(num(resultValue(res, "المساحة")), 4 * Math.PI, 1e-5);
  close(num(resultValue(res, "طول القوس")), Math.PI, 1e-5);
  close(num(resultValue(res, "طول الوتر")), 2 * Math.SQRT2, 1e-5);
  close(num(resultValue(res, "مساحة القطاع")), Math.PI, 1e-5);
  close(num(resultValue(res, "مساحة القطعة")), Math.PI - 2, 1e-5);
  close(num(resultValue(res, "السهم")), 2 - Math.SQRT2, 1e-5);
});

test("الزاوية 360 درجة تعطي الدائرة كاملة والوتر صفراً", () => {
  const res = central("3", "360");
  assert.equal(resultValue(res, "طول الوتر"), "0 cm");
  close(num(resultValue(res, "مساحة القطعة")), 9 * Math.PI, 1e-5);
  close(num(resultValue(res, "السهم")), 6, 1e-9);
});

test("الدائرة المارة بثلاث نقاط: مثلث قائم وترها قطر الدائرة", () => {
  const res = three("0", "0", "4", "0", "0", "3");
  assert.equal(resultValue(res, "مركز الدائرة"), "(2, 1.5) cm");
  assert.equal(resultValue(res, "نصف القطر"), "2.5 cm");
  assert.equal(res.results.find((r) => r.label === "القطر").value, "5 cm");
  close(num(resultValue(res, "المساحة")), 6.25 * Math.PI, 1e-5);
});

test("الاتساق: نقاط على دائرة مركزها الأصل ونصف قطرها 5", () => {
  const res = three("5", "0", "0", "5", "-5", "0");
  assert.equal(resultValue(res, "مركز الدائرة"), "(0, 0) cm");
  assert.equal(resultValue(res, "نصف القطر"), "5 cm");
});

test("المعادلة العامة: x²+y²-4x+6y-3=0 مركزها (2, -3) ونصف قطرها 4", () => {
  const res = equation("-4", "6", "-3");
  assert.equal(resultValue(res, "مركز الدائرة"), "(2, -3) cm");
  assert.equal(resultValue(res, "نصف القطر"), "4 cm");
  close(num(resultValue(res, "المحيط")), 8 * Math.PI, 1e-5);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => central("", "90"), "r");
  throwsInput(() => central("2", "0"), "theta");
  throwsInput(() => central("2", "400"), "theta");
  throwsInput(() => three("0", "0", "1", "1", "2", "2"), "x3");
  throwsInput(() => equation("0", "0", "1"), "F");
});

import { test } from "node:test";
import { assert, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/economics/price-elasticity.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const calc = (values) => mod.solve({ P1: "10", Q1: "100", P2: "12", Q2: "80", method: "mid", ...values });

test("المرونة بالنقطة المتوسطة لمثال معروف", () => {
  const res = calc({});
  assert.equal(resultValue(res, "معامل المرونة"), "-1.222");
  assert.equal(resultValue(res, "تصنيف المرونة"), "مرن");
  assert.equal(resultValue(res, "الإيراد الكلي قبل"), "1,000.00");
  assert.equal(resultValue(res, "الإيراد الكلي بعد"), "960.00");
});

test("النسبة البسيطة وتصنيفات المرونة", () => {
  assert.equal(resultValue(calc({ method: "simple" }), "معامل المرونة"), "-1");
  assert.equal(resultValue(calc({ method: "simple" }), "تصنيف المرونة"), "أحادي المرونة");
  assert.equal(resultValue(calc({ P2: "9", Q2: "120", method: "simple" }), "تصنيف المرونة"), "مرن");
  assert.equal(resultValue(calc({ P2: "12", Q2: "95" }), "تصنيف المرونة"), "غير مرن");
  assert.equal(resultValue(calc({ P2: "12", Q2: "100" }), "تصنيف المرونة"), "عديم المرونة");
});

test("أثر التغيّر على الإيراد وتماثل النقطة المتوسطة", () => {
  assert.ok(resultValue(calc({ method: "simple" }), "أثر التغيّر").includes("انخفض الإيراد الكلي بمقدار 40.00"));
  const forward = resultValue(calc({}), "معامل المرونة");
  const backward = resultValue(mod.solve({ P1: "12", Q1: "80", P2: "10", Q2: "100", method: "mid" }), "معامل المرونة");
  assert.equal(forward, backward);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => calc({ P2: "10" }), "P2");
  throwsInput(() => calc({ Q1: "-1" }), "Q1");
  throwsInput(() => calc({ P1: "0" }), "P1");
  throwsInput(() => calc({ method: "x" }), "method");
  throwsInput(() => calc({ Q1: "0", method: "simple" }), "Q1");
});

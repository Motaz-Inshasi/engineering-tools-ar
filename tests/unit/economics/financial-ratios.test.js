import { test } from "node:test";
import { assert, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/economics/financial-ratios.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const blank = { CA: "", CL: "", inv: "", TA: "", TL: "", equity: "", rev: "", cogs: "", ni: "" };
const full = { CA: "500000", CL: "250000", inv: "100000", TA: "1000000", TL: "600000", equity: "400000", rev: "800000", cogs: "500000", ni: "80000" };
const calc = (values) => mod.solve({ ...blank, ...values });

test("كل النسب لبيانات معروفة", () => {
  const res = calc(full);
  assert.equal(resultValue(res, "النسبة الجارية"), "2");
  assert.equal(resultValue(res, "نسبة السيولة السريعة"), "1.6");
  assert.equal(resultValue(res, "نسبة الدين إلى الأصول"), "60%");
  assert.equal(resultValue(res, "نسبة الدين إلى حقوق الملكية"), "1.5");
  assert.equal(resultValue(res, "العائد على الأصول"), "8%");
  assert.equal(resultValue(res, "العائد على حقوق الملكية"), "20%");
  assert.equal(resultValue(res, "هامش الربح الإجمالي"), "37.5%");
  assert.equal(resultValue(res, "هامش صافي الربح"), "10%");
  assert.equal(resultValue(res, "معدل دوران الأصول"), "0.8");
  assert.equal(res.results.length, 9);
});

test("تُحسب النسب المتاحة فقط وتُذكر الناقصة", () => {
  const res = calc({ CA: "500000", CL: "250000" });
  assert.equal(res.results.length, 1);
  assert.equal(res.results[0].value, "2");
  const note = res.blocks.find((b) => b.type === "note");
  assert.ok(note.text.includes("نسبة السيولة السريعة (بيانات ناقصة)"));
});

test("المقام صفراً لا يُحسب ولا يسبب خطأً إن وُجدت نسب أخرى", () => {
  const res = calc({ CA: "500", CL: "0", TA: "1000", TL: "300" });
  assert.equal(res.results.length, 1);
  assert.equal(res.results[0].label, "نسبة الدين إلى الأصول");
});

test("نص النسخ يحوي كل النسب المحسوبة", () => {
  const res = calc(full);
  assert.equal(res.copy.split("،").length, 9);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => calc({}), "CA");
  throwsInput(() => calc({ CA: "500", CL: "0" }), "CA");
  throwsInput(() => calc({ CL: "-5", CA: "100" }), "CL");
  throwsInput(() => calc({ TA: "abc", CA: "1" }), "TA");
});

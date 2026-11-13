import { test } from "node:test";
import { assert, throwsInput, checkExample, close, resultValue } from "../helpers.js";
import * as mod from "../../../lib/economics/npv-irr.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const calc = (values) => mod.solve({ r: "10", cf: "-1000 300 400 500", ...values });
const num = (s) => Number(String(s).replace(/,/g, ""));

test("NPV وIRR ومؤشر الربحية لمثال معروف", () => {
  const res = calc({});
  assert.equal(resultValue(res, "صافي القيمة الحالية"), "-21.04");
  assert.equal(resultValue(res, "معدل العائد الداخلي"), "8.896%");
  assert.equal(resultValue(res, "مؤشر الربحية"), "0.979");
});

test("فترة الاسترداد العادية والمخصومة", () => {
  const res = calc({});
  assert.equal(resultValue(res, "فترة الاسترداد"), "2.6 سنة");
  assert.equal(resultValue(res, "فترة الاسترداد المخصوم"), "لا يسترد الاستثمار خلال المدة");
});

test("NPV عند معدل IRR يقارب الصفر وينخفض مع معدل الخصم", () => {
  assert.ok(Math.abs(num(resultValue(calc({ r: "8.8962" }), "صافي القيمة الحالية"))) < 0.05);
  const a = num(resultValue(calc({ r: "5" }), "صافي القيمة الحالية"));
  const b = num(resultValue(calc({ r: "10" }), "صافي القيمة الحالية"));
  const c = num(resultValue(calc({ r: "15" }), "صافي القيمة الحالية"));
  assert.ok(a > b && b > c);
});

test("لا يُعرّف IRR عندما لا تتغير إشارة NPV", () => {
  assert.equal(resultValue(mod.solve({ r: "5", cf: "100 200" }), "معدل العائد الداخلي"), "غير معرّف");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => calc({ cf: "-1000" }), "cf");
  throwsInput(() => calc({ cf: "0 100" }), "cf");
  throwsInput(() => calc({ cf: "-1000 abc 300" }), "cf");
  throwsInput(() => calc({ r: "-100" }), "r");
  throwsInput(() => calc({ r: "" }), "r");
});

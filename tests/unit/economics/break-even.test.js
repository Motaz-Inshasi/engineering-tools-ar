import { test } from "node:test";
import { assert, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/economics/break-even.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const calc = (values) => mod.solve({ F: "10000", p: "50", v: "30", target: "", ...values });

test("نقطة التعادل لمثال معروف", () => {
  const res = calc({});
  assert.equal(resultValue(res, "نقطة التعادل بالوحدات"), "500 وحدة");
  assert.equal(resultValue(res, "إيراد نقطة التعادل"), "25,000.00");
  assert.equal(resultValue(res, "نسبة هامش المساهمة"), "40%");
});

test("الوحدات لتحقيق الربح المستهدف وتقريب الوحدات للأعلى", () => {
  assert.equal(resultValue(calc({ target: "5000" }), "الوحدات لتحقيق الربح المستهدف"), "750 وحدة");
  assert.equal(resultValue(calc({ v: "33.3" }), "أقل عدد صحيح"), "599 وحدة");
});

test("الإيراد والتكلفة تتقاطعان عند نقطة التعادل في الرسم", () => {
  const [revenue, cost] = calc({}).blocks[0].series;
  assert.equal(revenue.points[10][0], 500);
  assert.equal(revenue.points[10][1], cost.points[10][1]);
  assert.equal(revenue.points[20][0], 1000);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => calc({ p: "30" }), "p");
  throwsInput(() => calc({ p: "10", v: "30" }), "p");
  throwsInput(() => calc({ F: "-1" }), "F");
  throwsInput(() => calc({ v: "-1" }), "v");
  throwsInput(() => calc({ F: "100", target: "-200" }), "target");
});

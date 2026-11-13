import { test } from "node:test";
import { assert, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/everyday-math/fuel-cost.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const base = { distance: "300", roundTrip: "", method: "per100", consumption: "8", price: "2", passengers: "1" };
const calc = (values) => mod.solve({ ...base, ...values });

test("300 كم باستهلاك 8 لتر لكل 100 كم تحتاج 24 لتراً", () => {
  const res = calc({});
  assert.equal(resultValue(res, "الوقود المطلوب"), "24 لتر");
  assert.equal(resultValue(res, "التكلفة الإجمالية"), "48.00");
  assert.equal(resultValue(res, "تكلفة الكيلومتر"), "0.16");
});

test("450 كم بسيارة تقطع 15 كم لكل لتر بسعر 1.5 تكلف 45", () => {
  const res = calc({ distance: "450", method: "kmpl", consumption: "15", price: "1.5" });
  assert.equal(resultValue(res, "الوقود المطلوب"), "30 لتر");
  assert.equal(resultValue(res, "التكلفة الإجمالية"), "45.00");
});

test("12.5 كم لكل لتر تكافئ 8 لتر لكل 100 كم", () => {
  const perKm = calc({ method: "kmpl", consumption: "12.5" });
  const per100 = calc({});
  assert.equal(resultValue(perKm, "الوقود المطلوب"), resultValue(per100, "الوقود المطلوب"));
  assert.equal(resultValue(perKm, "الاستهلاك المكافئ"), "8 لتر / 100 كم");
});

test("ذهاب وعودة تضاعف المسافة: 100 كم تصبح 200 كم بـ 6.5 لتر لكل 100 كم وسعر 2.5", () => {
  const res = calc({ distance: "100", roundTrip: "1", consumption: "6.5", price: "2.5" });
  assert.equal(resultValue(res, "المسافة الإجمالية"), "200 كم");
  assert.equal(resultValue(res, "الوقود المطلوب"), "13 لتر");
  assert.equal(resultValue(res, "التكلفة الإجمالية"), "32.50");
});

test("تقسيم التكلفة على 4 ركاب: 48 تصبح 12 لكل راكب", () => {
  const res = calc({ passengers: "4" });
  assert.equal(resultValue(res, "تكلفة الفرد"), "12.00");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => calc({ distance: "0" }), "distance");
  throwsInput(() => calc({ consumption: "0" }), "consumption");
  throwsInput(() => calc({ price: "-1" }), "price");
  throwsInput(() => calc({ passengers: "0" }), "passengers");
  throwsInput(() => calc({ method: "gallons" }), "method");
});

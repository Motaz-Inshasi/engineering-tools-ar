import { test } from "node:test";
import { assert, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/everyday-math/speed-distance-time.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const base = { mode: "solve", speed: "80", speedUnit: "kmh", distance: "120", timeMode: "decimal", time: "", timeH: "", timeM: "", legMode: "speeds", d1: "60", v1: "60", t1: "1", d2: "60", v2: "30", t2: "2" };
const calc = (values) => mod.solve({ ...base, ...values });

test("120 كم بسرعة 80 كم/ساعة تستغرق ساعة و30 دقيقة", () => {
  assert.equal(resultValue(calc({}), "الزمن"), "ساعة واحدة و30 دقيقة");
});

test("90 كم/ساعة لمدة 2.5 ساعة تقطع 225 كم، والزمن يظهر بالساعات والدقائق", () => {
  const res = calc({ speed: "90", distance: "", time: "2.5" });
  assert.equal(resultValue(res, "المسافة"), "225 كم");
  assert.equal(resultValue(res, "الزمن"), "ساعتان و30 دقيقة");
});

test("150 كم في ساعتين و30 دقيقة تعني سرعة 60 كم/ساعة و16.6667 م/ث", () => {
  const res = calc({ speed: "", distance: "150", timeMode: "hm", time: "", timeH: "2", timeM: "30" });
  assert.equal(resultValue(res, "السرعة بالكيلومتر/ساعة"), "60 كم/ساعة");
  assert.equal(resultValue(res, "السرعة بالمتر/ثانية"), "16.6667 م/ث");
});

test("10 م/ث على 72 كم تعني 36 كم/ساعة وزمناً ساعتين", () => {
  const res = calc({ speed: "10", speedUnit: "ms", distance: "72", time: "" });
  assert.equal(resultValue(res, "السرعة بالكيلومتر/ساعة"), "36 كم/ساعة");
  assert.equal(resultValue(res, "الزمن"), "ساعتان");
});

test("60 ميل/ساعة تساوي 96.56064 كم/ساعة، فتقطع 96.56064 كم في ساعة واحدة", () => {
  const res = calc({ speed: "60", speedUnit: "mph", distance: "96.56064", time: "" });
  assert.equal(resultValue(res, "السرعة بالكيلومتر/ساعة"), "96.5606 كم/ساعة");
  assert.equal(resultValue(res, "الزمن"), "ساعة واحدة");
});

test("متوسط مرحلتين بسرعتين 60 و30 على مسافتين متساويتين هو 40 وليس 45", () => {
  const res = calc({ mode: "average" });
  assert.equal(resultValue(res, "متوسط السرعة"), "40 كم/ساعة");
  assert.equal(resultValue(res, "المتوسط التوافقي"), "40 كم/ساعة");
});

test("متوسط بالمسافة والزمن: 150 كم في 3 ساعات تعطي 50 كم/ساعة", () => {
  const res = calc({ mode: "average", legMode: "times", d1: "100", t1: "2", d2: "50", t2: "1" });
  assert.equal(resultValue(res, "متوسط السرعة"), "50 كم/ساعة");
  assert.equal(resultValue(res, "إجمالي الزمن"), "3 ساعات");
});

test("مسافتان غير متساويتين بسرعتين 90 و60 تعطيان متوسطاً 75 لا المتوسط الحسابي", () => {
  const res = calc({ mode: "average", d1: "90", v1: "90", d2: "60", v2: "60" });
  assert.equal(resultValue(res, "متوسط السرعة"), "75 كم/ساعة");
  assert.equal(res.results.some((r) => r.label.includes("التوافقي")), false);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => calc({ speed: "80", distance: "120", time: "1.5" }), "time");
  throwsInput(() => calc({ speed: "80", distance: "", time: "" }), "distance");
  throwsInput(() => calc({ speed: "0" }), "speed");
  throwsInput(() => calc({ timeMode: "hm", time: "", timeH: "1", timeM: "70", speed: "", distance: "120" }), "timeM");
  throwsInput(() => calc({ mode: "average", d1: "-1" }), "d1");
  throwsInput(() => calc({ mode: "average", legMode: "times", t1: "0" }), "t1");
});

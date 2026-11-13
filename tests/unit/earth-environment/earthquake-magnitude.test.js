import { test } from "node:test";
import { assert, close, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/earth-environment/earthquake-magnitude.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const none = { M: "", M1: "", M2: "", A: "", dt: "" };
const energy = (M) => mod.solve({ ...none, mode: "energy", M }).values;
const compare = (M1, M2) => mod.solve({ ...none, mode: "compare", M1, M2 }).values;
const richter = (A, dt) => mod.solve({ ...none, mode: "richter", A, dt }).values;

test("الطاقة عند المقدار 0 هي 10^4.8 جول", () => {
  close(energy("0").E, Math.pow(10, 4.8), 1e-9);
  close(energy("0").E, 63095.7344, 1e-6);
});

test("الطاقة عند المقدار 5 تقارب 1.9953e12 جول ومكافئ 476.88 طن TNT", () => {
  const v = energy("5");
  close(v.E, 1.99526e12, 1e-4);
  assert.ok(Math.abs(v.tons - 476.88) < 0.01, String(v.tons));
});

test("زيادة المقدار بواحد تضرب الطاقة في 10^1.5 (نحو 31.6 مرة)", () => {
  close(energy("6").E / energy("5").E, Math.pow(10, 1.5), 1e-9);
});

test("المقارنة 5 مقابل 7 تعطي السعة 100 والطاقة 1000", () => {
  const v = compare("5", "7");
  close(v.amp, 100, 1e-9);
  close(v.en, 1000, 1e-9);
  close(compare("7", "5").amp, 100, 1e-9);
});

test("مقدار ريختر لسعة 10 mm وفاصل 5 s يساوي 2.88618", () => {
  close(richter("10", "5").ML, 2.88618, 1e-5);
});

test("مقدار ريختر لسعة 1 mm وفاصل 0.125 s يساوي -2.92", () => {
  close(richter("1", "0.125").ML, -2.92, 1e-9);
});

test("فئة المقدار تتبع الجدول", () => {
  assert.equal(resultValue(mod.solve({ ...none, mode: "energy", M: "8.5" }), "فئة"), "8+");
  assert.equal(resultValue(mod.solve({ ...none, mode: "energy", M: "2.9" }), "فئة"), "أقل من 3");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ ...none, mode: "energy", M: "11" }), "M");
  throwsInput(() => mod.solve({ ...none, mode: "compare", M1: "-1", M2: "5" }), "M1");
  throwsInput(() => mod.solve({ ...none, mode: "richter", A: "0", dt: "5" }), "A");
  throwsInput(() => mod.solve({ ...none, mode: "richter", A: "10", dt: "" }), "dt");
  throwsInput(() => mod.solve({ ...none, mode: "xyz" }), "mode");
});

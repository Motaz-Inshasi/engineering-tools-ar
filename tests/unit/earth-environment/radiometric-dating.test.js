import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/earth-environment/radiometric-dating.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const base = { iso: "C14", halfLife: "", mode: "fraction", pct: "25", ratio: "", age: "" };
const run = (o) => mod.solve({ ...base, ...o }).values;

test("C-14 عند 25% يساوي عمرين نصفيين أي 11460 سنة", () => {
  close(run({}).t, 11460, 1e-9);
  assert.equal(mod.solve({ ...base }).results[0].value, "11460 سنة");
});

test("نسبة الابن إلى الأم D/P = 1 تعطي عمراً يساوي عمر النصف", () => {
  close(run({ iso: "K40", mode: "ratio", ratio: "1" }).t, 1.248e9, 1e-9);
});

test("U-238 بنسبة D/P = 0.5 تعطي t = T·log2(1.5) ≈ 2.6136e9 سنة", () => {
  const t = run({ iso: "U238", mode: "ratio", ratio: "0.5" }).t;
  assert.ok(Math.abs(t / 1e9 - 2.61361) < 1e-4, String(t));
});

test("Rb-87 بعد عمر نصف واحد تبقى 50%", () => {
  close(run({ iso: "Rb87", mode: "age", age: "4.97e10" }).remain, 50, 1e-9);
});

test("التحويل العكسي: من النسبة إلى العمر ثم العمر إلى النسبة يعيد النسبة", () => {
  const t = run({ pct: "37.5" }).t;
  close(run({ mode: "age", age: String(t) }).remain, 37.5, 1e-9);
});

test("عمر النصف المخصص ونسبة D/P صفر", () => {
  close(run({ iso: "custom", halfLife: "1000", pct: "50" }).t, 1000, 1e-9);
  assert.equal(run({ mode: "ratio", ratio: "0" }).t, 0);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ ...base, pct: "0" }), "pct");
  throwsInput(() => mod.solve({ ...base, pct: "150" }), "pct");
  throwsInput(() => mod.solve({ ...base, iso: "custom", halfLife: "" }), "halfLife");
  throwsInput(() => mod.solve({ ...base, mode: "ratio", ratio: "-1" }), "ratio");
  throwsInput(() => mod.solve({ ...base, mode: "age", age: "-5" }), "age");
  throwsInput(() => mod.solve({ ...base, mode: "xyz" }), "mode");
});

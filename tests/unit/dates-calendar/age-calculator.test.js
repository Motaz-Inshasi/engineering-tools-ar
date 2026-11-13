import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/dates-calendar/age-calculator.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const v = (r, l) => r.results.find((x) => x.label.startsWith(l)).value;

test("أعمار معروفة", () => {
  assert.equal(v(mod.solve({ birth: "2000-11-13", ref: "2026-11-13" }), "العمر"), "26 سنة");
  assert.equal(v(mod.solve({ birth: "2000-11-13", ref: "2026-11-13" }), "عيد الميلاد القادم"), "اليوم! كل عام وأنت بخير");
  assert.equal(v(mod.solve({ birth: "2000-05-15", ref: "2026-11-13" }), "يوم الميلاد"), "الاثنين — 11 صفر 1421هـ");
  assert.equal(v(mod.solve({ birth: "2000-05-15", ref: "2026-11-13" }), "العمر بالهجري"), "27 سنة هجرية تقريباً");
  assert.equal(v(mod.solve({ birth: "2026-11-12", ref: "2026-11-13" }), "العمر"), "يوم واحد");
});

test("عيد الميلاد القادم بعد 183 يوماً", () => {
  assert.equal(v(mod.solve({ birth: "2000-05-15", ref: "2026-11-13" }), "عيد الميلاد القادم"), "السبت 15 مايو 2027م (بعد 183 يوماً)");
});

test("بدون تاريخ حساب يستخدم اليوم ولا يفشل", () => {
  assert.ok(mod.solve({ birth: "1990-01-01", ref: "" }).results.length >= 6);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ birth: "2030-01-01", ref: "2026-01-01" }), "birth");
  throwsInput(() => mod.solve({ birth: "", ref: "" }), "birth");
  throwsInput(() => mod.solve({ birth: "2000-01-01", ref: "1-1" }), "ref");
});

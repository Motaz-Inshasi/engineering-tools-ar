import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/medicine/drug-dosage.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const base = { weight: "20", dosePerKg: "15", basis: "dose", freq: "4", stockMg: "250", stockMl: "5", maxDose: "" };
const run = (o) => mod.solve({ ...base, ...o }).results;

test("قيم معروفة محسوبة يدوياً", () => {
  const r = run({});
  assert.equal(r[0].value, "300 mg");
  assert.equal(r[1].value, "1200 mg");
  assert.equal(r[2].value, "6 mL");
});

test("الأساس اليومي يُقسم على عدد الجرعات", () => {
  const r = run({ basis: "day", dosePerKg: "60", freq: "3" });
  assert.equal(r[0].value, "400 mg");
  assert.equal(r[1].value, "1200 mg");
  assert.equal(r[2].value, "8 mL");
});

test("الحد الأقصى يقيّد الجرعة ويعدّل الحجم واليومية", () => {
  const r = run({ maxDose: "250" });
  assert.equal(r[0].value, "250 mg");
  assert.equal(r[1].value, "1000 mg");
  assert.equal(r[2].value, "5 mL");
  assert.ok(mod.solve({ ...base, maxDose: "250" }).blocks.length >= 2);
});

test("الحد الأقصى الأكبر من الجرعة لا يغيّر النتيجة", () => {
  const r = run({ maxDose: "1000" });
  assert.equal(r[0].value, "300 mg");
  assert.equal(r[2].value, "6 mL");
});

test("الحجم يتناسب مع تركيز المخزون", () => {
  const vol = Number(run({ stockMg: "500", stockMl: "10" })[2].value.split(" ")[0]);
  assert.ok(Math.abs(vol - 6) < 1e-9);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ ...base, weight: "0" }), "weight");
  throwsInput(() => mod.solve({ ...base, dosePerKg: "" }), "dosePerKg");
  throwsInput(() => mod.solve({ ...base, freq: "1.5" }), "freq");
  throwsInput(() => mod.solve({ ...base, freq: "25" }), "freq");
  throwsInput(() => mod.solve({ ...base, stockMl: "0" }), "stockMl");
  throwsInput(() => mod.solve({ ...base, maxDose: "-10" }), "maxDose");
});

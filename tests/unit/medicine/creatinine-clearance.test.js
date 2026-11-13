import { test } from "node:test";
import { assert, close, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/medicine/creatinine-clearance.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const base = { age: "60", weight: "72", sex: "male", scrUnit: "mgdl", scr: "1.0" };
const run = (o) => mod.solve({ ...base, ...o });

test("Cockcroft-Gault: 60 سنة و72 kg وكرياتينين 1.0 يعطي 80", () => {
  close(parseFloat(resultValue(run({}), "Cockcroft")), 80, 1e-9, "CG male");
});

test("Cockcroft-Gault للأنثى بعامل 0.85", () => {
  const v = parseFloat(resultValue(run({ sex: "female", weight: "60" }), "Cockcroft"));
  close(v, (80 * 60 / 72) * 0.85, 1e-3, "CG female");
});

test("CKD-EPI 2021 للرجل: 60 سنة وكرياتينين 1.0 يعطي نحو 86.16", () => {
  close(parseFloat(resultValue(run({}), "CKD-EPI")), 86.1626, 1e-3, "eGFR male");
});

test("CKD-EPI 2021 للأنثى: 50 سنة وكرياتينين 0.8 يعطي نحو 89.71", () => {
  close(parseFloat(resultValue(run({ sex: "female", age: "50", scr: "0.8" }), "CKD-EPI")), 89.7074, 1e-3, "eGFR female");
});

test("وحدة µmol/L تعطي النتيجة نفسها لـ 88.4 µmol/L", () => {
  const a = run({});
  const b = run({ scrUnit: "umol", scr: "88.4" });
  close(parseFloat(resultValue(b, "Cockcroft")), parseFloat(resultValue(a, "Cockcroft")), 1e-9, "CG");
  close(parseFloat(resultValue(b, "CKD-EPI")), parseFloat(resultValue(a, "CKD-EPI")), 1e-9, "eGFR");
});

test("مراحل مرض الكلى تتبع معدل الترشيح", () => {
  assert.ok(resultValue(run({ age: "30", scr: "0.8" }), "مرحلة").startsWith("G1"));
  assert.ok(resultValue(run({}), "مرحلة").startsWith("G2"));
  assert.ok(resultValue(run({ age: "80", scr: "3.0" }), "مرحلة").startsWith("G4"));
  assert.ok(resultValue(run({ age: "80", scr: "5.0" }), "مرحلة").startsWith("G5"));
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ ...base, age: "10" }), "age");
  throwsInput(() => mod.solve({ ...base, age: "121" }), "age");
  throwsInput(() => mod.solve({ ...base, weight: "0" }), "weight");
  throwsInput(() => mod.solve({ ...base, scr: "" }), "scr");
  throwsInput(() => mod.solve({ ...base, scr: "50" }), "scr");
  throwsInput(() => mod.solve({ ...base, scrUnit: "xx" }), "scrUnit");
});

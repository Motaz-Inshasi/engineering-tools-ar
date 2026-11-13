import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/medicine/lab-units.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const run = (analyte, direction, value) => mod.solve({ analyte, direction, value }).results[0].value;

test("قيم معروفة من الجداول المرجعية", () => {
  assert.equal(run("glucose", "toSi", "100"), "5.551 mmol/L");
  assert.equal(run("cholesterol", "toSi", "200"), "5.172 mmol/L");
  assert.equal(run("creatinine", "toSi", "1"), "88.4 µmol/L");
  assert.equal(run("hemoglobin", "toSi", "14"), "140 g/L");
  assert.equal(run("bilirubin", "toSi", "2"), "34.2 µmol/L");
  assert.equal(run("triglycerides", "toSi", "177.14"), "2 mmol/L");
});

test("التحويل العكسي يعيد القيمة الأصلية تقريباً", () => {
  const analytes = ["glucose", "cholesterol", "hdl", "ldl", "triglycerides", "creatinine", "bun", "uric", "calcium", "hemoglobin", "bilirubin"];
  for (const a of analytes) {
    const si = parseFloat(run(a, "toSi", "10"));
    const back = parseFloat(run(a, "fromSi", String(si)));
    close(back, 10, 2e-3, a);
  }
});

test("عامل التحويل والجدول المرجعي متاحان", () => {
  const res = mod.solve({ analyte: "uric", direction: "toSi", value: "7" });
  assert.ok(res.results[2].value.includes("×"));
  assert.ok(res.blocks.some((b) => b.type === "table" && b.rows.length === 11));
});

test("الوحدة الأصلية تظهر في النتائج", () => {
  const res = mod.solve({ analyte: "calcium", direction: "fromSi", value: "2.5" });
  assert.ok(res.results[1].value.includes("mmol/L"));
  assert.ok(res.results[0].value.includes("mg/dL"));
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ analyte: "glucose", direction: "toSi", value: "-1" }), "value");
  throwsInput(() => mod.solve({ analyte: "glucose", direction: "toSi", value: "" }), "value");
  throwsInput(() => mod.solve({ analyte: "xx", direction: "toSi", value: "1" }), "analyte");
  throwsInput(() => mod.solve({ analyte: "glucose", direction: "zz", value: "1" }), "direction");
});

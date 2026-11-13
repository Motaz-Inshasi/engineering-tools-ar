import { test } from "node:test";
import { assert, close, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/medicine/bmi-bsa.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const run = (weight, height, sex = "male") => mod.solve({ weight, height, sex });

test("قيم معروفة: 70 kg و175 cm", () => {
  const res = run("70", "175");
  close(parseFloat(resultValue(res, "مؤشر كتلة")), 22.857, 1e-3, "BMI");
  close(parseFloat(resultValue(res, "Mosteller")), 1.84466, 1e-3, "Mosteller");
  close(parseFloat(resultValue(res, "Du Bois")), 1.84814, 1e-3, "Du Bois");
});

test("الوزن المثالي ونطاق الوزن الصحي", () => {
  const male = parseFloat(resultValue(run("70", "175", "male"), "الوزن المثالي"));
  close(male, 50 + 2.3 * (175 / 2.54 - 60), 1e-3, "Devine male");
  const female = parseFloat(resultValue(run("70", "175", "female"), "الوزن المثالي"));
  close(female, 45.5 + 2.3 * (175 / 2.54 - 60), 1e-3, "Devine female");
  assert.equal(resultValue(run("70", "175"), "نطاق الوزن الصحي"), "56.66 – 76.26 kg");
});

test("فئات مؤشر كتلة الجسم عند الحدود", () => {
  const cat = (w) => resultValue(run(w, "200"), "الفئة");
  assert.ok(cat("60").includes("نقص"));
  assert.ok(cat("80").includes("طبيعي"));
  assert.ok(cat("100").includes("زيادة"));
  assert.ok(cat("120").includes("الدرجة الأولى"));
  assert.ok(cat("140").includes("الدرجة الثانية"));
  assert.ok(cat("160").includes("الدرجة الثالثة"));
});

test("مساحة السطح تزيد مع الوزن والطول", () => {
  const a = parseFloat(resultValue(run("60", "170"), "Mosteller"));
  const b = parseFloat(resultValue(run("80", "170"), "Mosteller"));
  const c = parseFloat(resultValue(run("60", "180"), "Mosteller"));
  assert.ok(b > a && c > a);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ weight: "0", height: "175", sex: "male" }), "weight");
  throwsInput(() => mod.solve({ weight: "70", height: "", sex: "male" }), "height");
  throwsInput(() => mod.solve({ weight: "70", height: "100", sex: "male" }), "height");
  throwsInput(() => mod.solve({ weight: "70", height: "175", sex: "other" }), "sex");
});

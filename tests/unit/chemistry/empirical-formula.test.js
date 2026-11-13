import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/chemistry/empirical-formula.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const emp = (data, M = "") => mod.solve({ data, M }).results.filter((r) => r.label.startsWith("الصيغة")).map((r) => r.value);

test("صيغ أولية معروفة", () => {
  assert.deepEqual(emp("Fe 69.94\nO 30.06"), ["Fe2O3"]);
  assert.deepEqual(emp("C 92.26\nH 7.74", "78.11"), ["CH", "C6H6"]);
  assert.deepEqual(emp("C 85.63\nH 14.37"), ["CH2"]);
  assert.deepEqual(emp("K 26.6\nCr 35.4\nO 38.0"), ["Cr2K2O7"]);
  assert.deepEqual(emp("P 43.64\nO 56.36", "283.9"), ["O5P2", "O10P4"]);
});

test("تقبل الكتل بالغرام وليس النسب فقط", () => {
  assert.deepEqual(emp("Na 2.3\nCl 3.545"), ["ClNa"]);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ data: "C 40" }), "data");
  throwsInput(() => mod.solve({ data: "C 40\nC 60" }), "data");
  throwsInput(() => mod.solve({ data: "C abc\nH 5" }), "data");
  throwsInput(() => mod.solve({ data: "C 40.0\nH 6.71\nO 53.29", M: "100" }), "M");
});

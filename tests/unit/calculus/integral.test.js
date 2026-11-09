import { test } from "node:test";
import { assert, close, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/calculus/integral.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const def = (f, a, b) => mod.solve({ f, v: "x", mode: "definite", a, b });

test("تكاملات محددة معروفة", () => {
  close(resultValue(def("x^2", "0", "3"), "العشرية"), 9);
  close(resultValue(def("sin(x)", "0", "pi"), "العشرية"), 2);
  close(resultValue(def("1/x", "1", "e"), "العشرية"), 1);
  close(resultValue(def("x^2", "3", "0"), "العشرية"), -9);
  close(resultValue(def("1/(x^2+1)", "-1", "1"), "العشرية"), Math.PI / 2);
  close(resultValue(def("x", "-1e6", "1e6"), "العشرية"), 0);
});

test("قيم عددية واضحة التسمية عند غياب الحل الرمزي", () => {
  const r = def("e^(-x^2)", "-inf", "inf");
  close(r.results[0].value, Math.sqrt(Math.PI), 1e-8);
  assert.match(r.results[0].label, /تقريب عددي/);
  const s = def("sin(x)/x", "0.000001", "1");
  close(s.results[0].value, 0.946083070367183 - 0.000001, 1e-6);
});

test("التكامل عبر نقطة غير معرّفة لا يعطي نتيجة خاطئة", () => {
  const r = def("1/x", "-1", "1");
  assert.ok(r.blocks.some((b) => b.type === "note"));
  assert.ok(!r.results[0].label.includes("العشرية"));
});

test("غير المحدد", () => {
  const r = mod.solve({ f: "cos(x)", v: "x", mode: "indefinite" });
  assert.equal(r.results[0].text, "sin(x) + C");
  const n = mod.solve({ f: "e^(x^2)", v: "x", mode: "indefinite" });
  assert.equal(n.results[0].value, "غير متاح رمزياً");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => def("x", "1", "1"), "b");
  throwsInput(() => def("x", "", "1"), "a");
  throwsInput(() => mod.solve({ f: "x", v: "x", mode: "zzz" }), "mode");
  throwsInput(() => def("x+", "0", "1"), "f");
});

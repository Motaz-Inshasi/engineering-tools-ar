import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/calculus/taylor-series.js";
import { parse } from "../../../lib/core/parser.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const coeffs = (f, a, n) => mod.taylorCoefficients(parse(f), "x", a, n).coeffs;

test("معاملات ماكلورين المعروفة", () => {
  coeffs("e^x", 0, 5).forEach((c, k) => close(c, [1, 1, 1 / 2, 1 / 6, 1 / 24, 1 / 120][k]));
  coeffs("sin(x)", 0, 5).forEach((c, k) => close(c, [0, 1, 0, -1 / 6, 0, 1 / 120][k], 1e-12));
  coeffs("cos(x)", 0, 4).forEach((c, k) => close(c, [1, 0, -1 / 2, 0, 1 / 24][k], 1e-12));
  coeffs("1/(1-x)", 0, 4).forEach((c) => close(c, 1));
  coeffs("ln(x)", 1, 3).forEach((c, k) => close(c, [0, 1, -1 / 2, 1 / 3][k], 1e-12));
});

test("النص الناتج والتقريب", () => {
  const r = mod.solve({ f: "e^x", v: "x", a: "0", n: "3", x0: "0.1" });
  assert.equal(r.results[0].text, "1 + x + x^2/2 + x^3/6");
  close(r.results[1].value, 1 + 0.1 + 0.005 + 0.1 ** 3 / 6);
  const s = mod.solve({ f: "x^2", v: "x", a: "-2", n: "2" });
  assert.equal(s.results[0].text, "4 - 4*(x + 2) + (x + 2)^2");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ f: "ln(x)", v: "x", a: "0", n: "3" }), "a");
  throwsInput(() => mod.solve({ f: "x", v: "x", a: "0", n: "0" }), "n");
  throwsInput(() => mod.solve({ f: "x", v: "x", a: "0", n: "2.5" }), "n");
  throwsInput(() => mod.solve({ f: "x", v: "x", a: "", n: "2" }), "a");
});

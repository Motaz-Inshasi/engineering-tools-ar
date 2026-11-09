import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/calculus/root-finding.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

test("الطرق الثلاث تعطي الجذر نفسه", () => {
  const n = mod.solve({ f: "x^2 - 2", v: "x", method: "newton", x0: "1" });
  const b = mod.solve({ f: "x^2 - 2", v: "x", method: "bisection", a: "0", b: "2", tol: "1e-12" });
  const s = mod.solve({ f: "x^2 - 2", v: "x", method: "secant", x0: "1", x1: "2" });
  for (const r of [n, b, s]) close(r.results[0].value, Math.SQRT2, 1e-10);
  close(mod.solve({ f: "cos(x) - x", v: "x", method: "newton", x0: "0.5" }).results[0].value, 0.7390851332151607, 1e-12);
  close(mod.solve({ f: "x + 5", v: "x", method: "newton", x0: "100" }).results[0].value, -5);
  close(mod.solve({ f: "x^3", v: "x", method: "bisection", a: "-1", b: "2", tol: "1e-12" }).results[0].value, 0, 1e-9);
  close(mod.solve({ f: "x - 1e9", v: "x", method: "secant", x0: "0", x1: "1" }).results[0].value, 1e9);
});

test("الحالات الفاشلة برسائل واضحة", () => {
  throwsInput(() => mod.solve({ f: "x^2 + 1", v: "x", method: "bisection", a: "0", b: "1" }), "b");
  throwsInput(() => mod.solve({ f: "x^2 - 1", v: "x", method: "newton", x0: "0" }), "x0");
  throwsInput(() => mod.solve({ f: "x", v: "x", method: "bisection", a: "2", b: "1" }), "b");
  throwsInput(() => mod.solve({ f: "x", v: "x", method: "secant", x0: "1", x1: "1" }), "x1");
  throwsInput(() => mod.solve({ f: "x", v: "x", method: "newton", x0: "1", tol: "-1" }), "tol");
});

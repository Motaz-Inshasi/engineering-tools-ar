import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/statistics/probability-distributions.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const P = (v) => Number(mod.solve(v).results[0].value);

test("التوزيع الطبيعي والقيم الحرجة", () => {
  close(P({ dist: "normal", mu: "0", sigma: "1", query: "le", x: "1.96" }), 0.975002, 1e-5);
  close(P({ dist: "normal", mu: "0", sigma: "1", query: "inv", prob: "0.975" }), 1.95996, 1e-5);
  close(P({ dist: "normal", mu: "50", sigma: "10", query: "ge", x: "70" }), 0.0227501, 1e-5);
  close(P({ dist: "t", df: "10", query: "inv", prob: "0.975" }), 2.22814, 1e-5);
  close(P({ dist: "chi2", df: "1", query: "inv", prob: "0.95" }), 3.84146, 1e-5);
});

test("التوزيعات المتقطعة بحساب مستقل", () => {
  const C = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; };
  close(P({ dist: "binomial", n: "10", p: "0.5", query: "eq", x: "5" }), C(10, 5) / 1024, 1e-5);
  close(P({ dist: "binomial", n: "10", p: "0.5", query: "ge", x: "8" }), (C(10, 8) + C(10, 9) + 1) / 1024, 1e-5);
  const pois = (k) => Math.exp(-3) * 3 ** k / [1, 1, 2, 6, 24][k];
  close(P({ dist: "poisson", lambda: "3", query: "between", x: "2", x2: "4" }), pois(2) + pois(3) + pois(4), 1e-5);
  assert.equal(P({ dist: "binomial", n: "20", p: "0.3", query: "inv", prob: "0.5" }), 6);
});

test("الأسي والمنتظم", () => {
  close(P({ dist: "exponential", lambda: "0.5", query: "ge", x: "2" }), Math.exp(-1), 1e-5);
  close(P({ dist: "uniform", a: "0", b: "10", query: "between", x: "2", x2: "5" }), 0.3, 1e-9);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ dist: "normal", mu: "0", sigma: "0", query: "le", x: "1" }), "sigma");
  throwsInput(() => mod.solve({ dist: "binomial", n: "10", p: "1.5", query: "le", x: "1" }), "p");
  throwsInput(() => mod.solve({ dist: "binomial", n: "10", p: "0.5", query: "eq", x: "2.5" }), "x");
  throwsInput(() => mod.solve({ dist: "normal", mu: "0", sigma: "1", query: "eq", x: "1" }), "query");
  throwsInput(() => mod.solve({ dist: "normal", mu: "0", sigma: "1", query: "between", x: "2", x2: "1" }), "x2");
  throwsInput(() => mod.solve({ dist: "uniform", a: "5", b: "1", query: "le", x: "1" }), "b");
});

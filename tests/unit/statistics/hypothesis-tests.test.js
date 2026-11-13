import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/statistics/hypothesis-tests.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const run = (v) => mod.solve({ alpha: "0.05", alt: "two", ...v });
const stat = (r) => Number(r.results[0].value.split("= ")[1]);
const dec = (r) => r.results.find((x) => x.label === "القرار").value;

test("اختبارات z و t بحساب يدوي", () => {
  close(stat(run({ test: "z1", xbar: "52.3", sigma: "6", n: "25", mu0: "50" })), 2.3 / 1.2, 1e-3);
  const p = run({ test: "paired", d1: "72 68 75 80 66 71 77 69", d2: "75 70 74 85 70 75 80 70" });
  close(stat(p), 3.862, 1e-3);
  assert.equal(dec(p), "نرفض H₀");
  const w = run({ test: "t2", xbar: "52.3", sd: "6.1", n: "25", xbar2: "48.9", sd2: "7.4", n2: "30" });
  close(stat(w), 3.4 / Math.sqrt(6.1 ** 2 / 25 + 7.4 ** 2 / 30), 1e-3);
  assert.equal(run({ test: "t1", xbar: "52.3", sd: "6.1", n: "25", mu0: "50", alt: "greater" }).results[1].value, "p = 0.03578");
});

test("اختبارات النسب ومربع كاي", () => {
  close(stat(run({ test: "prop1", n: "100", x: "58", p0: "0.5" })), 1.6, 1e-9);
  close(stat(run({ test: "gof", obs: "18 22 20 25 15" })), 2.9, 1e-9);
  close(stat(run({ test: "gof", obs: "30 50 20", exp: "0.25 0.5 0.25" })), 2, 1e-9);
  const ind = run({ test: "indep", table: "20 30\n25 25\n15 35" });
  close(stat(ind), 4.167, 1e-3);
  assert.equal(ind.results.find((x) => x.label.startsWith("درجات")).value, "2");
});

test("الرفض عندما يكون الفرق كبيراً", () => {
  assert.equal(dec(run({ test: "t1", xbar: "60", sd: "5", n: "30", mu0: "50" })), "نرفض H₀");
  assert.equal(dec(run({ test: "prop2", n: "200", x: "150", n2: "200", x2: "90" })), "نرفض H₀");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => run({ test: "t1", xbar: "52", sd: "-6", n: "25", mu0: "50" }), "sd");
  throwsInput(() => run({ test: "paired", d1: "1 2 3", d2: "1 2" }), "d2");
  throwsInput(() => run({ test: "prop1", n: "10", x: "12", p0: "0.5" }), "x");
  throwsInput(() => run({ test: "gof", obs: "10 20", exp: "1 2 3" }), "exp");
  throwsInput(() => run({ test: "indep", table: "1 2 3" }), "table");
  throwsInput(() => run({ test: "t1", xbar: "52", sd: "6", n: "25", mu0: "50", alpha: "0.9" }), "alpha");
});

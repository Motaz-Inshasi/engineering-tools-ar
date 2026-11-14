import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/calculus/function-plotter.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

test("الجذور ونقطة التقاطع", () => {
  const r = mod.findRoots(Math.sin, -7, 7);
  assert.equal(r.length, 5);
  close(r[0], -2 * Math.PI, 1e-10);
  close(r[2], 0);
  assert.deepEqual(mod.findRoots((x) => x * x + 1, -5, 5), []);
  assert.deepEqual(mod.findRoots((x) => 1 / x, -1, 1), []);
  const big = mod.findRoots((x) => x - 5e5, 0, 1e6);
  close(big[0], 5e5);
  const res = mod.solve({ f1: "x^2 - 1", xmin: "-3", xmax: "3" });
  assert.match(res.results.find((x) => x.label === "التقاطع مع محور y").value, /f\(0\) = -1/);
  assert.equal(res.blocks[0].series.length, 2);
});

const run = (f1, xmin, xmax) => mod.solve({ f1, f2: "", f3: "", xmin: String(xmin), xmax: String(xmax), ymin: "", ymax: "" });

test("المجال الواسع لا يُسقط الجذور المتقاربة ولا جذور التماس", () => {
  assert.deepEqual(mod.findRoots((x) => x ** 3 - 2 * x + 1, -1e5, 1e5).map((r) => +r.toFixed(6)), [-1.618034, 0.618034, 1]);
  assert.deepEqual(mod.findRoots((x) => x ** 3 - 2 * x + 1, -500, 500).map((r) => +r.toFixed(6)), [-1.618034, 0.618034, 1]);
  assert.deepEqual(mod.findRoots((x) => (x - 1) * (x - 1.001), -1000, 1000), [1, 1.001]);
  assert.deepEqual(mod.findRoots((x) => (x - 3.3) ** 2, -500, 500), [3.3]);
  assert.deepEqual(mod.findRoots((x) => (x - 0.123) ** 2 * (x + 7), -1000, 1000), [-7, 0.123]);
  assert.deepEqual(mod.findRoots((x) => x * x - 4, -1e5, 1e5), [-2, 2]);
  assert.deepEqual(mod.findRoots((x) => Math.abs(x) - 3, -1000, 1000), [-3, 3]);
  assert.deepEqual(mod.findRoots(Math.tan, -1.5, 1.5), [0]);
});

test("جذر log(x) يبقى موجوداً عند توسيع المجال قرب حدّ مجال التعريف", () => {
  for (const [a, b] of [[-10, 10], [-1000, 1000], [-1e5, 1e5], [0, 1e6], [-999999, 1], [-0.001, 999999]]) {
    assert.equal(run("log(x)", a, b).results[1].value, "x = 1", `${a}..${b}`);
    assert.equal(run("ln(x)", a, b).results[1].value, "x = 1", `${a}..${b}`);
  }
  assert.equal(run("ln(x+0.5)", -999999, 1).results[1].value, "x = 0.5");
  assert.equal(run("sqrt(x-2)-1", -5e5, 5e5).results[1].value, "x = 3");
  assert.equal(run("ln(abs(x))", -999990, 10).results[1].value, "x = -1، x = 1");
  assert.equal(run("1/x", -1e5, 1e5).results[0].value, "0");
  const s = run("sqrt(sin(x)) - 0.5", -5e5, 5e5);
  assert.match(s.results[0].value, /كثيرة جداً/);
  assert.match(s.results[1].value, /x = 0\.25268026/);
});

test("الجذور الكثيرة تُختصر: العدد وأقربها إلى الصفر ونمط التكرار", () => {
  const r = run("sin(x)", -1000, 1000);
  assert.equal(r.results[0].value, "637");
  assert.equal(r.results[1].label, "أقرب الجذور إلى الصفر");
  assert.equal(r.results[1].value.split("x =").length - 1, 6);
  assert.match(r.results[1].value, /و 631 جذراً آخر/);
  assert.match(r.results.find((x) => x.label === "نمط الجذور").value, /π/);
  const t = run("sin(10x)", -5, 5);
  assert.match(t.results.find((x) => x.label === "نمط الجذور").value, /π\/10/);
  const few = run("x^2 - 4", -1000, 1000);
  assert.equal(few.results[0].value, "2");
  assert.equal(few.results[1].value, "x = -2، x = 2");
  assert.ok(!few.results.some((x) => x.label === "نمط الجذور"));
});

test("التذبذب السريع في مجال واسع جداً يعطي تنبيهاً وجذوراً صحيحة قرب الصفر", () => {
  const r = run("sin(x)", -500000, 500000);
  assert.match(r.results[0].value, /كثيرة جداً/);
  assert.equal(r.results[1].value, "x = -9.424778، x = -6.2831853، x = -3.1415927، x = 0، x = 3.1415927، x = 6.2831853");
  assert.ok(r.steps.some((s) => typeof s === "string" && s.startsWith("تنبيه")));
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ f1: "", xmin: "0", xmax: "1" }), "f1");
  throwsInput(() => mod.solve({ f1: "x", xmin: "1", xmax: "1" }), "xmax");
  throwsInput(() => mod.solve({ f1: "x", xmin: "0", xmax: "1", ymin: "2", ymax: "1" }), "ymax");
  throwsInput(() => mod.solve({ f1: "x", f2: "x+", xmin: "0", xmax: "1" }), "f2");
  throwsInput(() => mod.solve({ f1: "x", xmin: "0", xmax: "1e9" }), "xmax");
});

import { test } from "node:test";
import { assert, close, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/biology/population-growth.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const exp = (N0, r, t) => mod.solve({ model: "exp", N0: String(N0), r: String(r), t: String(t), K: "1000" });

test("النموذج الأسّي: 100 e^1 = 271.83 و زمن التضاعف ln2/0.1 = 6.931", () => {
  const res = exp(100, 0.1, 10);
  assert.equal(resultValue(res, "عند الزمن"), "271.8");
  assert.equal(resultValue(res, "التضاعف"), "6.931");
  close(Number(resultValue(res, "عند الزمن")), 100 * Math.E, 1e-3);
});

test("النموذج الهندسي: 100 × 1.05^10 = 162.89", () => {
  const res = mod.solve({ model: "geom", N0: "100", r: "0.05", t: "10", K: "1000" });
  assert.equal(resultValue(res, "عند الزمن"), "162.9");
  close(Number(resultValue(res, "عند الزمن")), 162.8894627, 1e-3);
});

test("النموذج الأسّي المتناقص: زمن نصف العمر ln2/0.1", () => {
  const res = exp(100, -0.1, 10);
  assert.equal(resultValue(res, "نصف العمر"), "6.931");
  assert.ok(res.results[0].value.length > 0);
});

test("اللوجستي: الوصول إلى K/2 عند ln(9)/0.5 حيث N = 50", () => {
  const t = String(Math.log(9) / 0.5);
  const res = mod.solve({ model: "logistic", N0: "10", r: "0.5", t, K: "100" });
  assert.equal(resultValue(res, "K/2"), "4.394");
  assert.equal(resultValue(res, "عند الزمن"), "50");
  assert.equal(mod.solve({ model: "logistic", N0: "10", r: "0.5", t: "0", K: "100" }).results[0].value, "10");
});

test("اللوجستي: N0 فوق K/2 مع r موجب فالوصول إلى K/2 حدث في الماضي", () => {
  const res = mod.solve({ model: "logistic", N0: "80", r: "0.5", t: "1", K: "100" });
  assert.equal(resultValue(res, "K/2"), "غير منطبق");
  const down = mod.solve({ model: "logistic", N0: "80", r: "-0.5", t: "1", K: "100" });
  close(Number(resultValue(down, "K/2")), Math.log(0.25) / -0.5, 1e-3);
});

test("الرسم البياني موجود للزمن الموجب مع خطوط K في اللوجستي", () => {
  const res = mod.solve({ model: "logistic", N0: "10", r: "0.5", t: "5", K: "100" });
  const plot = res.blocks.find((b) => b.type === "plot");
  assert.equal(plot.series[0].points.length, 201);
  assert.equal(plot.hlines.length, 2);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ model: "geom", N0: "100", r: "-1", t: "5", K: "1000" }), "r");
  throwsInput(() => mod.solve({ model: "geom", N0: "100", r: "0.1", t: "2.5", K: "1000" }), "t");
  throwsInput(() => mod.solve({ model: "exp", N0: "0", r: "0.1", t: "5", K: "1000" }), "N0");
  throwsInput(() => mod.solve({ model: "exp", N0: "100", r: "0.1", t: "-1", K: "1000" }), "t");
  throwsInput(() => mod.solve({ model: "logistic", N0: "100", r: "0.1", t: "5", K: "0" }), "K");
});

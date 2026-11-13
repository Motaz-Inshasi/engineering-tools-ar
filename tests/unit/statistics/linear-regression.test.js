import { test } from "node:test";
import { assert, close, throwsInput, checkExample, rng } from "../helpers.js";
import * as mod from "../../../lib/statistics/linear-regression.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const val = (r, l) => r.results.find((x) => x.label.startsWith(l)).value;

test("قيم مرجعية للانحدار الخطي", () => {
  const r = mod.solve({ data: "1 2\n2 4\n3 5\n4 4\n5 5", model: "linear", x0: "6" });
  assert.equal(val(r, "المقطع"), "2.2");
  assert.equal(val(r, "معامل التحديد"), "0.6");
  assert.equal(val(r, "قيمة p"), "0.124 (غير دال عند 0.05)");
  assert.equal(val(r, "التنبؤ"), "5.8");
});

test("النماذج غير الخطية تسترجع معاملات دقيقة", () => {
  assert.equal(mod.solve({ data: "1 3\n2 12\n3 27\n4 48", model: "power" }).copy, "y = 3·x^2, r = 1, R² = 1, p < 0.0001");
  const e = mod.solve({ data: [0, 1, 2, 3, 4].map((x) => `${x} ${5 * Math.exp(0.3 * x)}`).join("\n"), model: "exponential" });
  assert.equal(val(e, "معادلة"), "y = 5·e^(0.3x)");
  const l = mod.solve({ data: [1, 2, 4, 8].map((x) => `${x} ${2 + 3 * Math.log(x)}`).join("\n"), model: "logarithmic" });
  assert.equal(val(l, "معادلة"), "y = 2 + 3·ln x");
});

test("الميل يطابق الحساب المستقل لبيانات عشوائية", () => {
  const R = rng(7), xs = [], ys = [];
  for (let i = 0; i < 30; i++) { const x = R() * 10; xs.push(x); ys.push(1.5 - 0.8 * x + (R() - 0.5)); }
  const n = xs.length, sx = xs.reduce((a, b) => a + b), sy = ys.reduce((a, b) => a + b);
  const sxy = xs.reduce((a, x, i) => a + x * ys[i], 0), sxx = xs.reduce((a, x) => a + x * x, 0);
  const b = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const r = mod.solve({ data: xs.map((x, i) => `${x} ${ys[i]}`).join("\n"), model: "linear" });
  close(parseFloat(val(r, "الميل")), b, 1e-5);
  assert.ok(parseFloat(val(r, "معامل الارتباط")) < -0.9);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ data: "1 2\n2 3", model: "linear" }), "data");
  throwsInput(() => mod.solve({ data: "1 2\n2 3\n3", model: "linear" }), "data");
  throwsInput(() => mod.solve({ data: "1 2\n2 -3\n3 4", model: "exponential" }), "data");
  throwsInput(() => mod.solve({ data: "1 5\n2 5\n3 5", model: "linear" }), "data");
  throwsInput(() => mod.solve({ data: "1 2\n2 3\n3 5", model: "power", x0: "-1" }), "x0");
});

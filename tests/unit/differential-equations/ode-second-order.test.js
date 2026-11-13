import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/differential-equations/ode-second-order.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const sol = (v) => mod.solve(v).results.find((x) => x.label === "الحل مع الشروط الابتدائية").tex;

test("حلول معروفة", () => {
  assert.equal(sol({ a: "1", b: "2", c: "5", g: "zero", y0: "1", v0: "0" }), "y(t) = e^{-t}\\left(\\cos 2t + 0.5\\,\\sin 2t\\right)");
  assert.equal(sol({ a: "1", b: "-3", c: "2", g: "zero", y0: "0", v0: "1" }), "y(t) = e^{2t} - e^{t}");
  assert.equal(sol({ a: "1", b: "4", c: "4", g: "zero", y0: "1", v0: "0" }), "y(t) = e^{-2t} + 2\\,t\\,e^{-2t}");
  assert.equal(sol({ a: "1", b: "0", c: "4", g: "cos", K: "3", w: "2", y0: "0", v0: "0" }), "y(t) = 0.75\\,t\\sin 2t");
  assert.equal(sol({ a: "1", b: "-3", c: "2", g: "exp", K: "1", s: "1", y0: "0", v0: "0" }), "y(t) = e^{2t} - e^{t} - t\\,e^{t}");
});

test("الحل يحقق المعادلة والشروط الابتدائية عددياً", () => {
  const cases = [[2, 3, 1, "const", { K: "5" }], [1, 1, 1, "sin", { K: "1", w: "2" }], [1, 2, 1, "exp", { K: "1", s: "-1" }], [3, 0.5, 7, "cos", { K: "2", w: "1.3" }]];
  for (const [a, b, c, g, ex] of cases) {
    const r = mod.solve({ a: String(a), b: String(b), c: String(c), g, ...ex, y0: "1", v0: "-1" });
    const pts = r.blocks[0].series[0].points;
    const h = pts[1][0] - pts[0][0];
    close(pts[0][1], 1, 1e-9);
    const d0 = (-25 * pts[0][1] + 48 * pts[1][1] - 36 * pts[2][1] + 16 * pts[3][1] - 3 * pts[4][1]) / (12 * h);
    assert.ok(Math.abs(d0 + 1) < 0.01 + 10 * h ** 4, `${a},${b},${c},${g}: y'(0) ≈ ${d0}, h = ${h}`);
    const K = Number(ex.K), s = Number(ex.s || 0), w = Number(ex.w || 0);
    const gf = (t) => (g === "const" ? K : g === "exp" ? K * Math.exp(s * t) : g === "cos" ? K * Math.cos(w * t) : K * Math.sin(w * t));
    for (const i of [50, 150, 250]) {
      const [t, y] = pts[i];
      const y1 = (pts[i + 1][1] - pts[i - 1][1]) / (2 * h), y2 = (pts[i + 1][1] - 2 * y + pts[i - 1][1]) / (h * h);
      assert.ok(Math.abs(a * y2 + b * y1 + c * y - gf(t)) < (1e-3 + h * h) * Math.max(1, Math.abs(gf(t)), Math.abs(c * y)), `${a},${b},${c},${g} at ${t}`);
    }
  }
});

test("تصنيف التخميد", () => {
  const kind = (b) => mod.solve({ a: "1", b, c: "4", g: "zero", y0: "", v0: "" }).results.find((x) => x.label === "نوع الاستجابة").value;
  assert.equal(kind("0"), "بلا تخميد (اهتزاز دائم)");
  assert.equal(kind("1"), "تخميد ناقص (اهتزاز متلاشٍ)");
  assert.equal(kind("4"), "تخميد حرج");
  assert.equal(kind("6"), "تخميد زائد");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ a: "0", b: "1", c: "1", g: "zero" }), "a");
  throwsInput(() => mod.solve({ a: "1", b: "1", c: "1", g: "zero", y0: "1", v0: "" }), "v0");
  throwsInput(() => mod.solve({ a: "1", b: "1", c: "1", g: "cos", K: "1", w: "0" }), "w");
});

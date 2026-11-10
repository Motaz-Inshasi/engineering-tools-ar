import { test } from "node:test";
import { assert, close, throwsInput, checkExample, rng } from "../helpers.js";
import * as mod from "../../../lib/algebra/polynomial-roots.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const roots = (c) => mod.solve({ c }).results[0].value;

test("جذور معروفة", () => {
  assert.equal(roots("1 0 -4"), "x = -2، x = 2");
  assert.equal(roots("1 0 1"), "x = -j، x = j");
  assert.equal(roots("2 -3"), "x = 1.5");
  assert.equal(roots("1 -3 3 -1"), "x = 1 (مكرر 3)");
  assert.equal(roots("1 0 0 0 -16"), "x = -2، x = -2j، x = 2j، x = 2");
  assert.equal(roots("0 0 1 -5"), "x = 5");
  assert.equal(roots("1 0 0"), "x = 0 (مكرر 2)");
  const r = mod.solve({ c: "1 -2 -5 6" });
  assert.equal(r.results[1].value, 3);
});

test("الجذور النسبية بالقسمة التركيبية", () => {
  const rr = mod.rationalRoots([2, -3, -11, 6]);
  assert.deepEqual(rr.found.sort((a, b) => a - b), [-2, 0.5, 3]);
  assert.equal(mod.rationalRoots([1.5, 2]), null);
});

test("درجات عالية ومعاملات كبيرة وصغيرة", () => {
  const r = mod.solve({ c: "1 0 0 0 0 0 0 0 0 0 -1" });
  assert.equal(r.results[0].value.split("،").length, 10);
  const big = mod.solve({ c: "1 -1e6 0" });
  assert.match(big.results[0].value, /1000000/);
  const tiny = mod.solve({ c: "1 -1e-6" });
  assert.equal(tiny.results[0].value, "x = 1e-6");
});

test("الإدخال كتعبير أو معادلة بأي ترتيب وبأي متغير", () => {
  assert.equal(roots("x^7 - x^5"), "x = -1، x = 0 (مكرر 5)، x = 1");
  assert.equal(roots("(x-1)(x+2)^3"), "x = -2 (مكرر 3)، x = 1");
  assert.equal(roots("2x^3 = 8x"), "x = -2، x = 0، x = 2");
  assert.equal(roots("t^2 - 4"), "t = -2، t = 2");
  assert.equal(roots("-4 + x^2"), roots("x^2 - 4"));
  assert.equal(roots("x^2 + 1"), "x = -j، x = j");
  assert.equal(roots("x^2 - 4"), roots("1 0 -4"));
  assert.equal(mod.solve({ c: "x^20 - 1" }).results[0].value.split("،").length, 20);
  assert.equal(mod.readPolynomial({ c: "3x^2 - x^3" }).desc.join(" "), "-1 3 0 0");
});

test("تحقق مستقل: المعاملات المقروءة من تعبير مخلوط الترتيب = المعاملات الأصلية (200 حالة)", () => {
  const rand = rng(404);
  for (let t = 0; t < 200; t++) {
    const k = 1 + Math.floor(rand() * 12);
    const coeffs = Array.from({ length: k + 1 }, () => Math.round((rand() - 0.5) * 20) || 0);
    coeffs[k] = coeffs[k] || 3;
    const terms = coeffs.map((c, i) => (c ? `(${c})*x^${i}` : null)).filter(Boolean);
    for (let i = terms.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [terms[i], terms[j]] = [terms[j], terms[i]]; }
    const desc = mod.readPolynomial({ c: terms.join(" + ") }).desc;
    assert.deepEqual(desc, coeffs.slice().reverse(), terms.join(" + "));
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ c: "0 0 5" }), "c");
  throwsInput(() => mod.solve({ c: "5" }), "c");
  throwsInput(() => mod.solve({ c: "1/x + 1" }), "c");
  throwsInput(() => mod.solve({ c: "sin(x)" }), "c");
  throwsInput(() => mod.solve({ c: "x^2 + y" }), "c");
  throwsInput(() => mod.solve({ c: "x^(1/2) - 1" }), "c");
  throwsInput(() => mod.solve({ c: "x^21 + 1" }), "c");
  throwsInput(() => mod.solve({ c: "x = 1 = 2" }), "c");
  throwsInput(() => mod.solve({ c: "x + (2" }), "c");
});

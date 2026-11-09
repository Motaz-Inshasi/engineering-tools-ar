import { test } from "node:test";
import { assert, close, throwsInput, checkExample, rng } from "../helpers.js";
import * as mod from "../../../lib/ac-circuits/phasor.js";
import { parseComplex } from "../../../lib/core/complex.js";
import { parseNumber } from "../../../lib/core/format.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const ph = (p1, p2, op) => mod.solve({ p1, p2, op, f: "50" }).results;

test("قيم معروفة", () => {
  assert.equal(ph("3", "4j", "add")[1].text, "3 + 4j");
  assert.equal(ph("5∠0", "5∠180", "add")[1].text, "0");
  assert.equal(ph("2∠30", "3∠60", "mul")[0].text, "6 ∠ 90°");
  assert.equal(ph("6∠90", "3∠60", "div")[0].text, "2 ∠ 30°");
  assert.equal(ph("1+j", "1-j", "sub")[1].text, "2j");
  assert.equal(ph("1e6∠0", "1e-6∠0", "mul")[0].text, "1 ∠ 0°");
});

test("تحقق مستقل: مجموع الموجتين الزمنيتين = موجة الطور الناتج", () => {
  const rand = rng(6);
  for (let t = 0; t < 50; t++) {
    const A = 1 + rand() * 10, a = rand() * 360 - 180, B = 1 + rand() * 10, b = rand() * 360 - 180;
    const r = mod.solve({ p1: `${A}∠${a}`, p2: `${B}∠${b}`, op: "add", f: "60" });
    const z = parseComplex(r.results[1].text, parseNumber);
    for (const tt of [0, 0.001, 0.004, 0.011]) {
      const w = 2 * Math.PI * 60;
      const lhs = A * Math.cos(w * tt + (a * Math.PI) / 180) + B * Math.cos(w * tt + (b * Math.PI) / 180);
      const rhs = Math.hypot(z.re, z.im) * Math.cos(w * tt + Math.atan2(z.im, z.re));
      assert.ok(Math.abs(rhs - lhs) < 1e-5 * (A + B), `${lhs} vs ${rhs}`);
    }
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ p1: "10∠30", p2: "0", op: "div", f: "50" }), "p2");
  throwsInput(() => mod.solve({ p1: "abc", p2: "1", op: "add", f: "50" }), "p1");
  throwsInput(() => mod.solve({ p1: "1", p2: "1", op: "pow", f: "50" }), "op");
  throwsInput(() => mod.solve({ p1: "1", p2: "1", op: "add", f: "0" }), "f");
});

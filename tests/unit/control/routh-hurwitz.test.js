import { test } from "node:test";
import { assert, throwsInput, checkExample, rng } from "../helpers.js";
import * as mod from "../../../lib/control/routh-hurwitz.js";
import { roots, fromRoots, toTex } from "../../../lib/core/polynomial.js";
import { C } from "../../../lib/core/complex.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const R = (p) => mod.solve({ p });
const v = (r, i) => r.results[i].value;

test("أمثلة الكتب", () => {
  assert.equal(v(R("s^3 + 6s^2 + 11s + 6"), 0), "مستقر");
  assert.equal(v(R("s^4 + 2s^3 + 3s^2 + 4s + 5"), 1), 2);
  const eps = R("s^5 + 2s^4 + 2s^3 + 4s^2 + 11s + 10");
  assert.equal(v(eps, 1), 2);
  assert.equal(v(eps, 2), 2);
  const zr = R("s^5 + 7s^4 + 6s^3 + 42s^2 + 8s + 56");
  assert.equal(v(zr, 2), 0);
  assert.equal(v(zr, 3), 4);
  assert.match(v(zr, 0), /حدياً/);
  assert.equal(v(R("s - 3"), 2), 1);
  assert.equal(v(R("s^2 + 1e-6 s + 1e6"), 0), "مستقر");
  assert.equal(v(R("1e6 s^3 + 2e6 s^2 + 3e6 s + 1e6"), 0), "مستقر");
});

test("تحقق عشوائي: تغيرات الإشارة = عدد الجذور في النصف الأيمن", () => {
  const rand = rng(4);
  let checked = 0;
  for (let t = 0; t < 150; t++) {
    const n = 2 + Math.floor(rand() * 5);
    const rs = [];
    while (rs.length < n) {
      const re = (rand() - 0.5) * 6;
      if (Math.abs(re) < 0.05) continue;
      if (rs.length <= n - 2 && rand() < 0.4) { const im = 0.2 + rand() * 3; rs.push(C(re, im), C(re, -im)); }
      else rs.push(C(re));
    }
    const p = fromRoots(rs);
    const r = R(toTex(p, "s").replace(/\{|\}/g, "").replace(/\\frac(\d)(\d)/g, "$1/$2"));
    const expected = rs.filter((z) => z.re > 0).length;
    if (r.results[1].value !== expected) assert.fail(`${toTex(p, "s")}: changes ${r.results[1].value} vs RHP ${expected}`);
    checked++;
  }
  assert.ok(checked === 150);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => R("5"), "p");
  throwsInput(() => R("1/(s+1)"), "p");
  throwsInput(() => R(""), "p");
  throwsInput(() => R("s^2 + x"), "p");
});

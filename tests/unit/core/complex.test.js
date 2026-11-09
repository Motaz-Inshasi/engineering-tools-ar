import { test } from "node:test";
import { assert, close, rng } from "../helpers.js";
import { C, cadd, csub, cmul, cdiv, cabs, carg, cpolar, cexp, csqrt, cpow, croots, cfmt, cpolarText, cinv } from "../../../lib/core/complex.js";

test("العمليات الأساسية", () => {
  assert.deepEqual(cadd(C(1, 2), C(3, -1)), C(4, 1));
  assert.deepEqual(csub(C(1, 2), C(3, -1)), C(-2, 3));
  assert.deepEqual(cmul(C(1, 2), C(3, 4)), C(-5, 10));
  const q = cdiv(C(-5, 10), C(3, 4));
  close(q.re, 1); close(q.im, 2);
  close(cabs(C(3, 4)), 5);
  close(carg(C(0, 1)), Math.PI / 2);
  assert.ok(Number.isNaN(cdiv(C(1, 1), C(0, 0)).re));
});

test("الصيغة القطبية والأسية", () => {
  const z = cpolar(2, Math.PI / 3);
  close(z.re, 1); close(z.im, Math.sqrt(3));
  const e = cexp(C(0, Math.PI));
  close(e.re, -1); close(e.im, 0, 1e-12);
  const s = csqrt(C(-4, 0));
  close(s.re, 0); close(s.im, 2);
  const p = cpow(C(1, 1), 8);
  close(p.re, 16); close(p.im, 0);
  const r = croots(C(1, 0), 3);
  assert.equal(r.length, 3);
  for (const w of r) { const c = cpow(w, 3); close(c.re, 1, 1e-12); close(c.im, 0, 1e-12); }
});

test("تحقق عشوائي: z × (1/z) = 1", () => {
  const rand = rng(3);
  for (let i = 0; i < 200; i++) {
    const z = C((rand() - 0.5) * 1e3, (rand() - 0.5) * 1e-2);
    const one = cmul(z, cinv(z));
    close(one.re, 1, 1e-12); close(one.im, 0, 1e-9);
  }
});

test("التنسيق", () => {
  assert.equal(cfmt(C(3, -4)), "3 - 4j");
  assert.equal(cfmt(C(0, 1)), "j");
  assert.equal(cfmt(C(2, 0)), "2");
  assert.equal(cpolarText(C(0, 2)), "2 ∠ 90°");
});

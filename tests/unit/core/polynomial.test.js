import { test } from "node:test";
import { assert, close, rng } from "../helpers.js";
import { C, cabs } from "../../../lib/core/complex.js";
import { roots, distinctRoots, pmul, pdivmod, padd, pderiv, peval, fromRoots, toTex, toRational, sameRoots, factorTex } from "../../../lib/core/polynomial.js";
import { decompose, evalDecomposition, realForm } from "../../../lib/core/partial.js";
import { parse } from "../../../lib/core/parser.js";

test("الحساب على كثيرات الحدود", () => {
  assert.deepEqual(pmul([1, 1], [-1, 1]), [-1, 0, 1]);
  const { q, r } = pdivmod([-1, 0, 0, 1], [-1, 1]);
  assert.deepEqual(q, [1, 1, 1]); assert.deepEqual(r, [0]);
  assert.deepEqual(padd([1, 2, 3], [0, 0, -3]), [1, 2]);
  assert.deepEqual(pderiv([5, 3, 2]), [3, 4]);
  assert.equal(peval([1, 2, 3], 2), 17);
  assert.equal(toTex([1, -2, 0, 3]), "3x^{3} - 2x + 1");
});

test("الجذور بقيم معروفة", () => {
  assert.ok(sameRoots(roots([6, -5, 1]), [C(2), C(3)]));
  assert.ok(sameRoots(roots([-6, 11, -6, 1]), [C(1), C(2), C(3)]));
  assert.ok(sameRoots(roots([1, 0, 1]), [C(0, 1), C(0, -1)]));
  assert.ok(sameRoots(roots([0, 0, 1, 1]), [C(0), C(0), C(-1)]));
  assert.ok(sameRoots(roots([-1, 0, 0, 0, 1]), [C(1), C(-1), C(0, 1), C(0, -1)]));
  const g = distinctRoots([1, 3, 3, 1]);
  assert.equal(g.length, 1); assert.equal(g[0].mult, 3); close(g[0].root.re, -1);
  assert.deepEqual(roots([5]), []);
  close(roots([-1e-6, 1])[0].re, 1e-6);
});

test("تحقق عشوائي: جذور كثيرة حدود مبنية من جذور معروفة", () => {
  const rand = rng(11);
  for (let t = 0; t < 40; t++) {
    const n = 2 + Math.floor(rand() * 5);
    const rs = [];
    while (rs.length < n) {
      if (rs.length <= n - 2 && rand() < 0.4) { const a = (rand() - 0.5) * 8, b = 0.2 + rand() * 4; rs.push(C(a, b), C(a, -b)); }
      else rs.push(C((rand() - 0.5) * 10));
    }
    const p = fromRoots(rs);
    assert.ok(sameRoots(roots(p), rs, 1e-6), `roots of ${JSON.stringify(rs)}`);
  }
});

test("toRational", () => {
  const r = toRational(parse("(s+1)/(s^2+3s+2)"), "s");
  assert.deepEqual(r, { num: [1], den: [2, 1] });
  const q = toRational(parse("(x-1)^2"), "x");
  assert.deepEqual(q.num, [1, -2, 1]);
  assert.equal(factorTex([2, 3, 1], "s"), "\\left(s + 2\\right)\\left(s + 1\\right)");
});

test("الكسور الجزئية: مجموع الكسور يساوي الدالة الأصلية", () => {
  const cases = [[[1], [2, 3, 1]], [[0, 0, 1], [0, 0, 0, 1, 1]], [[1, 2], [5, 2, 1]], [[3, 0, 0, 1], [-1, 0, 1]], [[1], [1, 3, 3, 1]], [[2, 1], [0, 1, 0, 1]]];
  for (const [n, d] of cases) {
    const dec = decompose(n, d);
    for (const z of [C(0.37, 0.1), C(-2.3, 0.5), C(4, -1)]) {
      const a = evalDecomposition(dec, z);
      let num = C(0), den = C(0);
      for (let i = n.length - 1; i >= 0; i--) num = { re: num.re * z.re - num.im * z.im + n[i], im: num.re * z.im + num.im * z.re };
      for (let i = d.length - 1; i >= 0; i--) den = { re: den.re * z.re - den.im * z.im + d[i], im: den.re * z.im + den.im * z.re };
      const q = { re: (num.re * den.re + num.im * den.im) / (den.re ** 2 + den.im ** 2), im: (num.im * den.re - num.re * den.im) / (den.re ** 2 + den.im ** 2) };
      assert.ok(cabs({ re: a.re - q.re, im: a.im - q.im }) < 1e-8 * Math.max(1, cabs(q)), `${n}/${d}`);
    }
  }
  const rf = realForm(decompose([1], [2, 3, 1]));
  const got = rf.map((t) => [t.r, Math.round(t.A * 1e9) / 1e9]).sort((a, b) => a[0] - b[0]);
  assert.deepEqual(got, [[-2, -1], [-1, 1]]);
  const quad = realForm(decompose([1, 2], [5, 2, 1]));
  assert.equal(quad[0].kind, "quad");
  close(quad[0].B, 2); close(quad[0].Cc, 1); close(quad[0].p, 2); close(quad[0].q, 5);
});

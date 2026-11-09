import { test } from "node:test";
import { assert, close, throwsInput, checkExample, rng } from "../helpers.js";
import * as mod from "../../../lib/algebra/matrix.js";
import { det, inverse, mmul, rank, eigen, charPoly } from "../../../lib/core/matrix.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

test("المحددات المعروفة", () => {
  close(det([[4, 7], [2, 6]]).value, 10);
  close(det([[6, 1, 1], [4, -2, 5], [2, 8, 7]]).value, -306);
  close(det([[0, 1], [1, 0]]).value, -1);
  close(det([[1, 2], [2, 4]]).value, 0);
  close(det([[1e6, 0], [0, 1e-6]]).value, 1);
  close(det([[2, 0, 0, 0], [0, 3, 0, 0], [0, 0, -1, 0], [0, 0, 0, 5]]).value, -30);
  close(mod.solve({ op: "det", A: "1 2 3\n4 5 6\n7 8 10" }).results[0].value, -3);
});

test("الرتبة والقيم الذاتية", () => {
  assert.equal(rank([[1, 2], [2, 4]]), 1);
  assert.equal(rank([[1, 2, 3], [4, 5, 6], [7, 8, 9]]), 2);
  assert.equal(rank([[0, 0], [0, 0]]), 0);
  const e = eigen([[2, 0], [0, 3]]).values.map((v) => v.value.re).sort();
  assert.deepEqual(e, [2, 3]);
  const r = eigen([[0, -1], [1, 0]]).values.map((v) => v.value);
  assert.ok(r.every((z) => Math.abs(z.re) < 1e-12 && Math.abs(Math.abs(z.im) - 1) < 1e-12));
  const s = eigen([[4, 1], [2, 3]]);
  const vals = s.values.map((v) => v.value.re).sort();
  close(vals[0], 2); close(vals[1], 5);
  for (const v of s.values) {
    const Av = mmul([[4, 1], [2, 3]], v.vectors[0].map((x) => [x]));
    Av.forEach((row, i) => close(row[0], v.value.re * v.vectors[0][i], 1e-9));
  }
  assert.deepEqual(charPoly([[1, 2], [3, 4]]).map((x) => Math.round(x * 1e9) / 1e9), [-2, -5, 1]);
});

test("الضرب والجمع", () => {
  const r = mod.solve({ op: "multiply", A: "1 2\n3 4", B: "5 6\n7 8" });
  assert.equal(r.results[0].text, "19\t22\n43\t50");
  assert.equal(mod.solve({ op: "add", A: "1 2", B: "3 4" }).results[0].text, "4\t6");
  assert.equal(mod.solve({ op: "transpose", A: "1 2 3" }).results[0].text, "1\n2\n3");
  throwsInput(() => mod.solve({ op: "multiply", A: "1 2", B: "1 2" }), "B");
  throwsInput(() => mod.solve({ op: "add", A: "1 2", B: "1 2 3" }), "B");
});

test("تحقق عشوائي: A × A⁻¹ = I", () => {
  const rand = rng(5);
  let checked = 0;
  for (let t = 0; t < 60; t++) {
    const n = 2 + Math.floor(rand() * 6);
    const A = Array.from({ length: n }, () => Array.from({ length: n }, () => (rand() - 0.5) * 10));
    const r = inverse(A);
    if (!r) continue;
    const I = mmul(A, r.inv);
    I.forEach((row, i) => row.forEach((x, j) => close(x, i === j ? 1 : 0, 1e-8)));
    checked++;
  }
  assert.ok(checked > 50);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ op: "inverse", A: "1 2\n2 4" }), "A");
  throwsInput(() => mod.solve({ op: "det", A: "1 2 3\n4 5 6" }), "A");
  throwsInput(() => mod.solve({ op: "det", A: "" }), "A");
  throwsInput(() => mod.solve({ op: "nope", A: "1" }), "op");
});

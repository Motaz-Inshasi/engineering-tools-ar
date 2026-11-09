import { test } from "node:test";
import { assert, close, throwsInput, checkExample, rng } from "../helpers.js";
import * as mod from "../../../lib/algebra/linear-system.js";
import { mvec } from "../../../lib/core/matrix.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const sol = (aug) => mod.solve({ aug });

test("حلول معروفة", () => {
  const r = sol("1 1 3\n1 -1 1");
  close(r.results[1].value, 2); close(r.results[2].value, 1);
  const s = sol("0 1 2\n1 0 3");
  close(s.results[1].value, 3); close(s.results[2].value, 2);
  close(sol("5 10").results[1].value, 2);
  const big = sol("1e6 1 1000001\n1 1e-6 1.000001");
  assert.equal(big.results[0].value.includes("لا نهائي") || big.results[0].value.includes("وحيد"), true);
  const neg = sol("-2 -4\n");
  close(neg.results[1].value, 2);
});

test("تصنيف الأنظمة", () => {
  assert.equal(sol("1 1 2\n2 2 5").results[0].value, "لا يوجد حل (نظام غير متسق)");
  const inf = sol("1 1 2\n2 2 4");
  assert.equal(inf.results[0].value, "عدد لا نهائي من الحلول");
  assert.match(inf.results[1].value, /x2 حر/);
  assert.equal(sol("0 0 0").results[0].value, "عدد لا نهائي من الحلول");
});

test("تحقق عشوائي: A x = b للأنظمة العشوائية", () => {
  const rand = rng(21);
  for (let t = 0; t < 30; t++) {
    const n = 2 + Math.floor(rand() * 5);
    const A = Array.from({ length: n }, () => Array.from({ length: n }, () => Math.round((rand() - 0.5) * 20)));
    const x = Array.from({ length: n }, () => Math.round((rand() - 0.5) * 10));
    const b = mvec(A, x);
    const r = sol(A.map((row, i) => [...row, b[i]].join(" ")).join("\n"));
    if (r.results[0].value !== "حل وحيد") continue;
    r.results.slice(1).forEach((q, i) => close(q.value, x[i], 1e-8));
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => sol(""), "aug");
  throwsInput(() => sol("1 2\n3"), "aug");
  throwsInput(() => sol("1 a 3"), "aug");
  throwsInput(() => sol("5"), "aug");
});

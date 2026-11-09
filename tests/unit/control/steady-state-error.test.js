import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/control/steady-state-error.js";
import { peval, padd } from "../../../lib/core/polynomial.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const E = (G, A = "1") => mod.solve({ G, A }).results;

test("الأنواع 0 و 1 و 2", () => {
  const t0 = E("10/((s+1)(s+2))");
  assert.equal(t0[0].value, 0);
  assert.equal(t0[1].value, "5");
  assert.equal(t0[4].value, "0.166667");
  assert.equal(t0[5].value, "∞");
  const t1 = E("10(s + 2)/(s(s + 1)(s + 5))");
  assert.equal(t1[4].value, "0");
  assert.equal(t1[5].value, "0.25");
  const t2 = E("(s + 1)/(s^2 (s + 10))");
  assert.equal(t2[0].value, 2);
  assert.equal(t2[6].value, "10");
  assert.equal(E("10/((s+1)(s+2))", "5")[4].value, "0.833333");
  assert.equal(E("1e6/((s+1)(s+2))")[4].value, "2e-6");
});

test("تحقق مستقل: خطأ الخطوة = 1 − T(0) للحلقة المغلقة", () => {
  for (const [num, den] of [[[10], [2, 3, 1]], [[3, 1], [4, 5, 1]], [[0.5], [1, 2, 3, 1]]]) {
    const G = `(${num.map((c, k) => `${c}s^${k}`).join("+")})/(${den.map((c, k) => `${c}s^${k}`).join("+")})`;
    const r = mod.solve({ G, A: "1" });
    const T0 = peval(num, 0) / peval(padd(den, num), 0);
    close(Number(r.results[4].value), 1 - T0, 1e-5);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ G: "1/(s - 1)", A: "1" }), "G");
  throwsInput(() => mod.solve({ G: "100/(s^3 + 2s^2 + s)", A: "1" }), "G");
  throwsInput(() => mod.solve({ G: "1/(s+1)", A: "0" }), "A");
  throwsInput(() => mod.solve({ G: "", A: "1" }), "G");
});

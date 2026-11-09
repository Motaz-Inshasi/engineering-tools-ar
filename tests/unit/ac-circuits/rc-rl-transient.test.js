import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/ac-circuits/rc-rl-transient.js";
import { inverse } from "../../../lib/signals/laplace.js";
import { evaluate } from "../../../lib/core/parser.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const run = (o) => mod.solve(o).results;

test("قيم معروفة", () => {
  assert.equal(run({ type: "RC", mode: "charge", Vs: "10", R: "1k", C: "1m", t: "1" })[3].value, "6.321 V");
  assert.equal(run({ type: "RC", mode: "discharge", Vs: "10", R: "1k", C: "1m", t: "1" })[3].value, "3.679 V");
  assert.equal(run({ type: "RL", mode: "charge", Vs: "12", R: "6", L: "3", t: "0.5" })[0].value, "500 ms");
  assert.equal(run({ type: "RL", mode: "charge", Vs: "12", R: "6", L: "3", t: "0.5" })[3].value, "1.264 A");
  assert.equal(run({ type: "RC", mode: "charge", Vs: "5", R: "1", C: "1", pct: "50" })[3].value, "693.1 ms");
  assert.equal(run({ type: "RC", mode: "charge", Vs: "1", R: "1M", C: "1p" })[0].value, "1 µs");
});

test("تحقق مستقل: جهد شحن المكثف = عكس لابلاس لـ Vs / (s(RCs + 1))", () => {
  for (const [Vs, R, C] of [[5, 1e4, 1e-4], [12, 100, 1e-6], [-3, 1, 2]]) {
    const tau = R * C;
    const f = inverse(`${Vs}/(s (${tau} s + 1))`).ft;
    for (const k of [0.2, 1, 3]) {
      const out = mod.solve({ type: "RC", mode: "charge", Vs: String(Vs), R: String(R), C: String(C), t: String(k * tau) });
      const steps = out.steps.map((s) => s.tex || "").join(" ");
      const v = Number(steps.match(/v_C\([^)]*\) = ([-\d.e+]+)\\ V/)[1]);
      close(v, evaluate(f, { t: k * tau }), 1e-5);
    }
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ type: "RC", mode: "charge", Vs: "5", R: "10k", C: "-1u" }), "C");
  throwsInput(() => mod.solve({ type: "RL", mode: "charge", Vs: "5", R: "10", L: "0" }), "L");
  throwsInput(() => mod.solve({ type: "RC", mode: "charge", Vs: "0", R: "1", C: "1" }), "Vs");
  throwsInput(() => mod.solve({ type: "RC", mode: "charge", Vs: "1", R: "1", C: "1", pct: "100" }), "pct");
  throwsInput(() => mod.solve({ type: "RC", mode: "charge", Vs: "1", R: "1", C: "1", t: "-1" }), "t");
});

import { test } from "node:test";
import { assert, close, throwsInput, checkExample, rng } from "../helpers.js";
import * as mod from "../../../lib/signals/laplace.js";
import { parse, evaluate } from "../../../lib/core/parser.js";
import { peval } from "../../../lib/core/polynomial.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const F = (f) => mod.forward(f).combined;
const at = (r, s) => peval(r.num, s) / peval(r.den, s);

const PAIRS = [
  ["1", (s) => 1 / s],
  ["t", (s) => 1 / s ** 2],
  ["t^3", (s) => 6 / s ** 4],
  ["e^(-3t)", (s) => 1 / (s + 3)],
  ["sin(2t)", (s) => 2 / (s * s + 4)],
  ["cos(5t)", (s) => s / (s * s + 25)],
  ["sinh(2t)", (s) => 2 / (s * s - 4)],
  ["cosh(t)", (s) => s / (s * s - 1)],
  ["t e^(2t)", (s) => 1 / (s - 2) ** 2],
  ["e^(-t) sin(3t)", (s) => 3 / ((s + 1) ** 2 + 9)],
  ["e^(-2t) cos(t)", (s) => (s + 2) / ((s + 2) ** 2 + 1)],
  ["t sin(t)", (s) => (2 * s) / (s * s + 1) ** 2],
  ["t cos(2t)", (s) => (s * s - 4) / (s * s + 4) ** 2],
  ["sin(t)^2", (s) => 2 / (s * (s * s + 4))],
  ["5 - 2t + e^(4t)", (s) => 5 / s - 2 / s ** 2 + 1 / (s - 4)],
  ["2^t", (s) => 1 / (s - Math.LN2)]
];

test("أزواج جدول لابلاس المعروفة", () => {
  for (const [f, G] of PAIRS) {
    const r = F(f);
    for (const s of [5.3, 7.1, 11.9]) close(at(r, s), G(s), 1e-10, f);
  }
});

const INV = [
  ["1/s", "1"],
  ["1/(s+2)", "e^(-2*t)"],
  ["(s + 3)/((s + 1)(s + 2))", "2*e^(-t) - e^(-2*t)"],
  ["1/(s^2 (s+1))", null],
  ["5/(s^2+4s+13)", null],
  ["1/(s^2+1)^2", null],
  ["6/(s-2)^4", null],
  ["(2s+1)/(s^2+9)", null]
];

const EXPECT = {
  "1/(s^2 (s+1))": (t) => t - 1 + Math.exp(-t),
  "5/(s^2+4s+13)": (t) => (5 / 3) * Math.exp(-2 * t) * Math.sin(3 * t),
  "1/(s^2+1)^2": (t) => (Math.sin(t) - t * Math.cos(t)) / 2,
  "6/(s-2)^4": (t) => t ** 3 * Math.exp(2 * t),
  "(2s+1)/(s^2+9)": (t) => 2 * Math.cos(3 * t) + Math.sin(3 * t) / 3
};

test("عكس لابلاس بقيم معروفة", () => {
  for (const [Fs, text] of INV) {
    const r = mod.inverse(Fs);
    if (text) assert.equal(mod.solve({ mode: "inverse", fs: Fs }).results[0].text, text);
    else for (const t of [0.2, 0.9, 1.7, 3.1]) close(evaluate(r.ft, { t }), EXPECT[Fs](t), 1e-9, Fs);
  }
  assert.equal(mod.solve({ mode: "inverse", fs: "(s^2+1)/(s+1)" }).results[0].text, "-δ(t) + δ'(t) + 2*e^(-t)");
});

test("تحقق مستقل: لابلاس ثم عكسه يعيد الدالة نفسها", () => {
  const fns = ["3 + 2t e^(-t) + sin(2t)", "e^(-2t) cos(3t)", "sin(2t+1)", "t^3 e^(2t)", "e^(-t) + t e^(-t)", "t^2 e^(-3t) sin(4t)", "cosh(3t) - 2sinh(t)", "t^5", "cos(t)^2"];
  const rand = rng(17);
  for (let i = 0; i < 25; i++) {
    const a = Math.round((rand() - 0.7) * 8), b = 1 + Math.round(rand() * 5), n = Math.floor(rand() * 3), k = Math.round((rand() - 0.5) * 10) || 1;
    fns.push(`${k} t^${n} e^(${a}t) ${rand() < 0.5 ? "sin" : "cos"}(${b}t)`);
  }
  for (const f of fns) {
    const back = mod.inverse(F(f)).ft;
    for (const t of [0.13, 0.7, 1.3, 2.2]) {
      const want = evaluate(parse(f, ["t"]), { t });
      close(evaluate(back, { t }), want, 1e-7, f);
    }
  }
});

test("قيم حدية: أعداد كبيرة وصغيرة جداً وصفر", () => {
  close(at(F("1e6 e^(-1e-3 t)"), 2), 1e6 / (2 + 1e-3), 1e-10);
  close(at(F("1e-9 t"), 3), 1e-9 / 9, 1e-10);
  close(evaluate(mod.inverse("1e6/(s+1e3)").ft, { t: 1e-3 }), 1e6 * Math.exp(-1), 1e-9);
  assert.equal(mod.solve({ mode: "inverse", fs: "0/(s+1)" }).results[0].text, "0");
});

test("رسائل صريحة للحالات غير المدعومة", () => {
  throwsInput(() => mod.solve({ mode: "forward", ft: "1/t" }), "ft");
  throwsInput(() => mod.solve({ mode: "forward", ft: "sin(t) cos(t)" }), "ft");
  throwsInput(() => mod.solve({ mode: "forward", ft: "t^0.5" }), "ft");
  throwsInput(() => mod.solve({ mode: "forward", ft: "sin(t^2)" }), "ft");
  throwsInput(() => mod.solve({ mode: "forward", ft: "ln(t)" }), "ft");
  throwsInput(() => mod.solve({ mode: "inverse", fs: "e^(-2s)/s" }), "fs");
  throwsInput(() => mod.solve({ mode: "inverse", fs: "s^2 + 1" }), "fs");
  throwsInput(() => mod.solve({ mode: "inverse", fs: "" }), "fs");
  throwsInput(() => mod.solve({ mode: "sideways", ft: "1" }), "mode");
});

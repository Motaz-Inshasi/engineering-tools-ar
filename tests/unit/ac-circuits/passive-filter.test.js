import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/ac-circuits/passive-filter.js";
import { cabs, carg } from "../../../lib/core/complex.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

test("قيم معروفة", () => {
  assert.equal(mod.solve({ type: "rc-lp", R: "1k", C: "1u" }).results[0].text, "fc = 159.2 Hz");
  assert.equal(mod.solve({ type: "rl-hp", R: "100", L: "10m" }).results[0].text, "fc = 1.592 kHz");
  assert.equal(mod.solve({ type: "rlc-bp", R: "10", L: "1m", C: "100n" }).results[0].text, "f0 = 15.92 kHz");
  close(cabs(mod.H("rc-lp", { R: 1e3, C: 1e-6 }, 0.001)), 1, 1e-6);
  close(cabs(mod.H("rc-hp", { R: 1e3, C: 1e-6 }, 1e9)), 1, 1e-6);
  close(cabs(mod.H("rlc-bp", { R: 10, L: 1e-3, C: 1e-7 }, 1 / (2 * Math.PI * Math.sqrt(1e-10)))), 1, 1e-9);
});

test("تحقق مستقل: عند تردد القطع |H| = 1/√2 والطور ±45°، والميل −20 dB/عقد", () => {
  for (const [type, p] of [["rc-lp", { R: 1600, C: 1e-7 }], ["rc-hp", { R: 47e3, C: 1e-9 }], ["rl-lp", { R: 50, L: 1e-3 }], ["rl-hp", { R: 1e3, L: 1 }]]) {
    const fc = type.startsWith("rc") ? 1 / (2 * Math.PI * p.R * p.C) : p.R / (2 * Math.PI * p.L);
    const h = mod.H(type, p, fc);
    close(cabs(h), Math.SQRT1_2, 1e-12);
    close(Math.abs((carg(h) * 180) / Math.PI), 45, 1e-9);
    const far = type.endsWith("lp") ? [100 * fc, 1000 * fc] : [fc / 1000, fc / 100];
    const slope = Math.abs(20 * Math.log10(cabs(mod.H(type, p, far[1]))) - 20 * Math.log10(cabs(mod.H(type, p, far[0]))));
    close(slope, 20, 1e-3);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ type: "rc-lp", R: "0", C: "100n" }), "R");
  throwsInput(() => mod.solve({ type: "rl-lp", R: "10", L: "" }), "L");
  throwsInput(() => mod.solve({ type: "rc-lp", R: "10", C: "1", f: "-5" }), "f");
  throwsInput(() => mod.solve({ type: "notch", R: "10", C: "1" }), "type");
});

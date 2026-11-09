import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/electronics/timer-555.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

test("قيم معروفة", () => {
  assert.equal(mod.solve({ mode: "mono", R: "100k", C: "10u" }).results[0].value, "1.099 s");
  assert.equal(mod.solve({ mode: "astable", R1: "10k", R2: "10k", C: "1u" }).results[0].value, "48.09 Hz");
  assert.equal(mod.solve({ mode: "astable", R1: "1k", R2: "100k", C: "1n" }).results[1].value, "50.25%");
  assert.equal(mod.solve({ mode: "astable", R1: "1k", R2: "1k", C: "1p" }).results[0].value, "480.9 MHz");
  assert.equal(mod.solve({ mode: "mono", R: "1M", C: "1000u" }).results[0].value, "1.099 ks");
});

test("تحقق مستقل: محاكاة شحن المكثف بين ⅓ و ⅔ تعطي الأزمنة نفسها", () => {
  const R1 = 4.7e3, R2 = 22e3, C = 1e-7;
  const sim = (R, from, to, dir) => { let v = from, t = 0; const dt = R * C / 2e5; while (dir > 0 ? v < to : v > to) { v += ((dir > 0 ? 1 : 0) - v) / (R * C) * dt; t += dt; } return t; };
  const tH = sim(R1 + R2, 1 / 3, 2 / 3, 1), tL = sim(R2, 2 / 3, 1 / 3, -1);
  const r = mod.solve({ mode: "astable", R1: String(R1), R2: String(R2), C: String(C) });
  const steps = r.steps.map((s) => s.tex || "").join(" ");
  close(Number(steps.match(/t_H = [^=]+= ([\d.e+-]+)/)[1]), tH, 1e-4);
  close(Number(steps.match(/t_L = [^=]+= ([\d.e+-]+)/)[1]), tL, 1e-4);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ mode: "astable", R1: "1k", R2: "0", C: "100n" }), "R2");
  throwsInput(() => mod.solve({ mode: "astable", R1: "0.5", R2: "1k", C: "100n" }), "R1");
  throwsInput(() => mod.solve({ mode: "mono", R: "1k", C: "-1" }), "C");
  throwsInput(() => mod.solve({ mode: "bistable", C: "1u" }), "mode");
});

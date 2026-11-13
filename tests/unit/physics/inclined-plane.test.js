import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/physics/inclined-plane.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

test("قيم معروفة: m = 10 و θ = 30 و μs = 0.5 و μk = 0.3", () => {
  const r = mod.solve({ m: "10", theta: "30", mu_s: "0.5", mu_k: "0.3", g: "9.81" }).values;
  close(r.W, 98.1, 1e-9);
  close(r.N, 98.1 * Math.cos(Math.PI / 6), 1e-9);
  close(r.a, 9.81 * (0.5 - 0.3 * Math.cos(Math.PI / 6)), 1e-9);
  close(r.critical, (Math.atan(0.5) * 180) / Math.PI, 1e-9);
  assert.equal(r.slides, true);
});

test("لا ينزلق عندما tanθ أقل من أو يساوي μs", () => {
  const r = mod.solve({ m: "10", theta: "20", mu_s: "0.5", mu_k: "0.3", g: "9.81" }).values;
  assert.equal(r.slides, false);
  close(r.a, 0, 1e-9);
  close(r.Fp, 98.1 * Math.sin((20 * Math.PI) / 180), 1e-9);
  assert.ok(r.Fp <= r.fsMax);
});

test("زاوية الحرج عند μs = 1 هي 45 درجة", () => {
  const below = mod.solve({ m: "1", theta: "44", mu_s: "1", mu_k: "0.5", g: "10" }).values;
  const above = mod.solve({ m: "1", theta: "46", mu_s: "1", mu_k: "0.5", g: "10" }).values;
  assert.equal(below.slides, false);
  assert.equal(above.slides, true);
  close(above.critical, 45, 1e-9);
  close(above.a, 10 * (Math.sin((46 * Math.PI) / 180) - 0.5 * Math.cos((46 * Math.PI) / 180)), 1e-9);
});

test("اتساق المركبات: N² + F∥² = W²", () => {
  const r = mod.solve({ m: "7", theta: "35", mu_s: "0.6", mu_k: "0.4", g: "9.81" }).values;
  close(r.N * r.N + r.Fp * r.Fp, r.W * r.W, 1e-9);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ m: "0", theta: "30", mu_s: "0.5", mu_k: "0.3", g: "9.81" }), "m");
  throwsInput(() => mod.solve({ m: "10", theta: "90", mu_s: "0.5", mu_k: "0.3", g: "9.81" }), "theta");
  throwsInput(() => mod.solve({ m: "10", theta: "30", mu_s: "0.3", mu_k: "0.5", g: "9.81" }), "mu_k");
  throwsInput(() => mod.solve({ m: "10", theta: "30", mu_s: "-0.1", mu_k: "0", g: "9.81" }), "mu_s");
});

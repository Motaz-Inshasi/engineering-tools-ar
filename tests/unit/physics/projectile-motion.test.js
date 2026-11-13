import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/physics/projectile-motion.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

test("قيم معروفة: v0 = 20 و θ = 45 و h0 = 0", () => {
  const r = mod.solve({ v0: "20", theta: "45", h0: "0", g: "9.81" }).values;
  close(r.R, 400 / 9.81, 1e-9);
  close(r.H, 200 / 19.62, 1e-9);
  close(r.tof, (2 * 20 * Math.sin(Math.PI / 4)) / 9.81, 1e-9);
});

test("ارتفاع ابتدائي: v0 = 10 و θ = 30 و h0 = 10 و g = 10", () => {
  const r = mod.solve({ v0: "10", theta: "30", h0: "10", g: "10" }).values;
  close(r.H, 11.25, 1e-9);
  close(r.tof, 2, 1e-9);
  close(r.R, 10 * Math.sqrt(3), 1e-9);
  close(r.speed, Math.sqrt(300), 1e-9);
  close(r.angle, 60, 1e-9);
});

test("الإطلاق الرأسي عند θ = 90", () => {
  const r = mod.solve({ v0: "10", theta: "90", h0: "0", g: "10" }).values;
  close(r.R, 0, 1e-9);
  close(r.H, 5, 1e-9);
  close(r.tof, 2, 1e-9);
  close(r.angle, 90, 1e-9);
});

test("الاتساق: الارتفاع صفر عند زمن الطيران", () => {
  const r = mod.solve({ v0: "10", theta: "30", h0: "10", g: "10" }).values;
  assert.ok(Math.abs(10 + r.vy0 * r.tof - 0.5 * 10 * r.tof * r.tof) < 1e-9);
  assert.ok(r.tPeak < r.tof);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ v0: "20", theta: "0", h0: "0", g: "9.81" }), "theta");
  throwsInput(() => mod.solve({ v0: "20", theta: "120", h0: "0", g: "9.81" }), "theta");
  throwsInput(() => mod.solve({ v0: "20", theta: "45", h0: "-1", g: "9.81" }), "h0");
  throwsInput(() => mod.solve({ v0: "20", theta: "45", h0: "0", g: "0" }), "g");
  throwsInput(() => mod.solve({ v0: "0", theta: "45", h0: "0", g: "9.81" }), "v0");
});

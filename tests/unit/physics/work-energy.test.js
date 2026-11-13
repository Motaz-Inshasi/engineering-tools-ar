import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/physics/work-energy.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

test("الطاقة الحركية والكامنة", () => {
  close(mod.solve({ mode: "ke", m: "2", v: "10" }).values.KE, 100, 1e-9);
  close(mod.solve({ mode: "pe", m: "5", h: "10", g: "9.81" }).values.PE, 490.5, 1e-9);
});

test("الشغل W = F d cosθ", () => {
  close(mod.solve({ mode: "work", F: "100", d: "5", theta: "60" }).values.W, 250, 1e-9);
  close(mod.solve({ mode: "work", F: "100", d: "5", theta: "90" }).values.W, 0, 1e-9);
});

test("القدرة بطريقتين متطابقتين عندما تكون v = d/t", () => {
  const r = mod.solve({ mode: "power", W: "1000", t: "20", F: "200", v: "0.25" }).values;
  close(r.P, 50, 1e-9);
  close(r.Pf, 50, 1e-9);
});

test("السقوط: حفظ الطاقة وأثر نسبة الفقد", () => {
  const r = mod.solve({ mode: "fall", v0: "0", h: "20", g: "9.81", loss: "0" }).values;
  close(r.v, Math.sqrt(392.4), 1e-9);
  close((r.v * r.v) / (2 * 9.81), 20, 1e-9);
  close(mod.solve({ mode: "fall", v0: "0", h: "20", g: "9.81", loss: "50" }).values.v, Math.sqrt(196.2), 1e-9);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ mode: "ke", m: "0", v: "10" }), "m");
  throwsInput(() => mod.solve({ mode: "power", W: "1000", t: "0" }), "t");
  throwsInput(() => mod.solve({ mode: "power", W: "1000", t: "20", F: "200" }), "v");
  throwsInput(() => mod.solve({ mode: "fall", v0: "0", h: "20", g: "9.81", loss: "150" }), "loss");
  throwsInput(() => mod.solve({ mode: "work", F: "100", theta: "60" }), "d");
  throwsInput(() => mod.solve({ mode: "bogus" }), "mode");
});

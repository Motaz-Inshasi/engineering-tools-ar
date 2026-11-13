import { test } from "node:test";
import { assert, close, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/materials/beam-deflection.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const base = { beam: "ss_point", L: "4", P: "10k", w: "5k", mat: "a36", Ecust: "200", section: "custom", b: "100", h: "200", d: "100", Icust: "8e7", Iunit: "mm4", ccust: "100" };
const deflMm = (r) => parseFloat(resultValue(r, "أقصى انحراف"));

test("كمرة بسيطة بحمل مركّز: δ = PL³/48EI = 0.8333 mm والإجهاد 12.5 MPa", () => {
  const r = mod.solve(base);
  close(deflMm(r), 1e4 * 4 ** 3 / (48 * 200e9 * 8e-5) * 1000, 1e-3);
  assert.equal(resultValue(r, "أقصى إجهاد"), "12.5 MPa");
  assert.equal(resultValue(r, "أقصى عزم"), "10 kN·m");
});

test("كمرة بسيطة بحمل منتظم: δ = 5wL⁴/384EI = 1.25 mm", () => {
  const r = mod.solve({ ...base, beam: "ss_uniform", section: "rect", b: "100", h: "200" });
  const I = 100 * 200 ** 3 / 12 * 1e-12;
  close(deflMm(r), (5 * 5000 * 4 ** 4) / (384 * 200e9 * I) * 1000, 1e-3);
  assert.equal(resultValue(r, "أقصى انحراف"), "1.25 mm");
  assert.equal(resultValue(r, "أقصى عزم"), "10 kN·m");
});

test("ذراع بحمل مركّز في الطرف: δ = PL³/3EI و M = PL", () => {
  const r = mod.solve({ beam: "cant_point", L: "2", P: "1k", mat: "a36", section: "circle", d: "50" });
  const I = Math.PI * 50 ** 4 / 64 * 1e-12;
  close(deflMm(r), (1000 * 2 ** 3) / (3 * 200e9 * I) * 1000, 1e-3);
  assert.equal(resultValue(r, "أقصى عزم"), "2 kN·m");
  assert.equal(resultValue(r, "عزم التثبيت"), "2 kN·m");
});

test("ذراع بحمل منتظم بمادة مخصصة: δ = wL⁴/8EI = 12.15 mm و M = wL²/2", () => {
  const r = mod.solve({ beam: "cant_uniform", L: "3", w: "500", mat: "custom", Ecust: "100", section: "rect", b: "50", h: "100" });
  assert.equal(resultValue(r, "أقصى انحراف"), "12.15 mm");
  assert.equal(resultValue(r, "أقصى عزم"), "2.25 kN·m");
});

test("الانحراف يتناسب طردياً مع الحمل", () => {
  const r1 = mod.solve(base);
  const r2 = mod.solve({ ...base, P: "20k" });
  close(deflMm(r2) / deflMm(r1), 2, 1e-3);
});

test("التحقق من الحد L/360 وتحذير التجاوز", () => {
  const ok = mod.solve(base);
  assert.equal(resultValue(ok, "الحد المسموح"), "11.11 mm");
  assert.ok(resultValue(ok, "التحقق").startsWith("مقبول"));
  const bad = mod.solve({ ...base, P: "200k" });
  assert.ok(resultValue(bad, "التحقق").includes("يتجاوز"));
  assert.ok(bad.blocks.some((b) => b.type === "note" && b.tone === "warn"));
});

test("وحدة cm⁴ تعطي النتيجة نفسها لـ mm⁴", () => {
  const a = mod.solve(base);
  const b = mod.solve({ ...base, Icust: "8e3", Iunit: "cm4" });
  assert.equal(resultValue(a, "أقصى انحراف"), resultValue(b, "أقصى انحراف"));
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ ...base, L: "0" }), "L");
  throwsInput(() => mod.solve({ ...base, mat: "nope" }), "mat");
  throwsInput(() => mod.solve({ ...base, beam: "bridge" }), "beam");
  throwsInput(() => mod.solve({ ...base, P: "" }), "P");
  throwsInput(() => mod.solve({ ...base, Icust: "-1" }), "Icust");
});

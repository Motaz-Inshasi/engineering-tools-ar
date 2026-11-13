import { test } from "node:test";
import { assert, close, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/materials/stress-strain.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const axial = (over = {}) => ({ mode: "axial", F: "10k", section: "circle", d: "10", b: "", h: "", Acust: "", L: "1000", dL: "", mat: "a36", Ecust: "", Ycust: "", Ucust: "", ...over });

test("قيم معروفة لقضيب دائري: A = 78.54 mm² و σ = 127.3 MPa", () => {
  const r = mod.solve(axial());
  const A = Math.PI * 25;
  const sigma = 10000 / A;
  close(parseFloat(resultValue(r, "المساحة")), A, 1e-3);
  close(parseFloat(resultValue(r, "الإجهاد")), sigma, 1e-3);
  close(parseFloat(resultValue(r, "الانفعال")), sigma / 200000, 1e-3);
  close(parseFloat(resultValue(r, "الاستطالة")), (sigma / 200000) * 1000, 1e-3);
  close(parseFloat(resultValue(r, "عامل الأمان")), 250 / sigma, 2e-3);
});

test("قطاع مستطيل 20×40 mm تحت 40 kN على طول 2000 mm", () => {
  const r = mod.solve(axial({ section: "rect", b: "20", h: "40", F: "40k", L: "2000" }));
  assert.equal(resultValue(r, "المساحة"), "800 mm²");
  assert.equal(resultValue(r, "الإجهاد"), "50 MPa");
  assert.equal(resultValue(r, "الانفعال"), "2.5e-4");
  assert.equal(resultValue(r, "الاستطالة"), "0.5 mm");
  assert.equal(resultValue(r, "عامل الأمان"), "5");
});

test("الوضع العكسي: قياس الاستطالة يعيد معامل المرونة 200 GPa", () => {
  const r = mod.solve({ ...axial(), mode: "measurement", dL: "0.63662", L: "1000" });
  close(parseFloat(resultValue(r, "معامل المرونة المقاس")), 200, 1e-3);
  assert.equal(resultValue(r, "الانفعال"), "6.366e-4");
});

test("تحذيرات الخضوع والكسر", () => {
  const yieldWarn = mod.solve(axial({ F: "20k" }));
  assert.ok(yieldWarn.blocks.some((b) => b.text && b.text.includes("مقاومة الخضوع")));
  assert.ok(!yieldWarn.blocks.some((b) => b.text && b.text.includes("مقاومة الشد")));
  const fracture = mod.solve(axial({ F: "40k" }));
  assert.ok(fracture.blocks.some((b) => b.text && b.text.includes("مقاومة الشد القصوى")));
  assert.equal(mod.solve(axial({ F: "5k" })).blocks.length, 0);
});

test("مادة مخصصة بلا حد خضوع: عامل الأمان غير منطبق", () => {
  const r = mod.solve(axial({ mat: "custom", Ecust: "100" }));
  assert.equal(resultValue(r, "عامل الأمان"), "غير منطبق");
  assert.equal(resultValue(r, "الانفعال"), "1.273e-3");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve(axial({ d: "0" })), "d");
  throwsInput(() => mod.solve(axial({ F: "" })), "F");
  throwsInput(() => mod.solve(axial({ L: "-5" })), "L");
  throwsInput(() => mod.solve(axial({ section: "rect", b: "", h: "40" })), "b");
  throwsInput(() => mod.solve({ ...axial(), mode: "measurement", dL: "0" }), "dL");
  throwsInput(() => mod.solve(axial({ mat: "unobtainium" })), "mat");
});

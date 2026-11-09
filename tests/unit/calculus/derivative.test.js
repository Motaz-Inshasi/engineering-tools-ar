import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/calculus/derivative.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

test("قيم معروفة", () => {
  assert.equal(mod.solve({ f: "x^3", v: "x", order: "1" }).results[0].text, "3*x^2");
  assert.equal(mod.solve({ f: "x^3", v: "x", order: "2" }).results[0].text, "6*x");
  assert.equal(mod.solve({ f: "x^3", v: "x", order: "4" }).results[0].text, "0");
  assert.equal(mod.solve({ f: "sin(t)", v: "t", order: "2" }).results[0].text, "-sin(t)");
  assert.equal(mod.solve({ f: "7", v: "x", order: "1" }).results[0].text, "0");
  const r = mod.solve({ f: "x^2", v: "x", order: "1", at: "-3" });
  close(r.results[1].value, -6);
  const big = mod.solve({ f: "e^x", v: "x", order: "1", at: "50" });
  close(big.results[1].value, Math.exp(50));
  const tiny = mod.solve({ f: "x^2", v: "x", order: "1", at: "1e-12" });
  close(tiny.results[1].value, 2e-12);
});

test("المشتقة غير المعرّفة عند النقطة تُذكر بوضوح", () => {
  const r = mod.solve({ f: "ln(x)", v: "x", order: "1", at: "0" });
  assert.ok(r.blocks.some((b) => b.text.includes("غير معرّفة")));
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ f: "", v: "x", order: "1" }), "f");
  throwsInput(() => mod.solve({ f: "y^2", v: "x", order: "1" }), "f");
  throwsInput(() => mod.solve({ f: "x", v: "xy", order: "1" }), "v");
  throwsInput(() => mod.solve({ f: "x", v: "x", order: "9" }), "order");
  throwsInput(() => mod.solve({ f: "x", v: "x", order: "1", at: "abc" }), "at");
});

import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/algebra/trigonometry.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const ang = (theta, unit = "deg") => mod.solve({ mode: "angle", theta, unit });
const get = (r, k) => r.results.find((x) => x.label === k);

test("قيم دقيقة للزوايا الخاصة", () => {
  assert.equal(get(ang("30"), "sin").text, "sin = 1/2");
  assert.equal(get(ang("45"), "cos").text, "cos = √2/2");
  assert.equal(get(ang("240"), "tan").text, "tan = √3");
  assert.equal(get(ang("-30"), "sin").text, "sin = -1/2");
  assert.equal(get(ang("90"), "tan").value, "غير معرّفة");
  assert.equal(get(ang("0"), "csc").value, "غير معرّفة");
  assert.equal(get(ang("pi/6", "rad"), "sin").text, "sin = 1/2");
  assert.equal(get(ang("15"), "sin").text, "sin = (√6-√2)/4");
  close(get(ang("37"), "sin").value, Math.sin((37 * Math.PI) / 180));
  assert.equal(get(ang("720030"), "cos").text, "cos = √3/2");
});

test("الدوال العكسية والحل العام", () => {
  const r = mod.solve({ mode: "inverse", fn: "sin", val: "0.5" });
  close(r.results[0].value, 30);
  assert.equal(r.results[2].value, "30°، 150°");
  const c = mod.solve({ mode: "inverse", fn: "cos", val: "-1" });
  assert.equal(c.results[2].value, "180°");
  const t = mod.solve({ mode: "inverse", fn: "tan", val: "1" });
  assert.equal(t.results[2].value, "45°، 225°");
});

test("التحقق من المتطابقة sin² + cos² = 1", () => {
  for (let d = -720; d <= 720; d += 7.3) {
    const r = ang(String(d));
    const s = Math.sin((d * Math.PI) / 180), c = Math.cos((d * Math.PI) / 180);
    close(s * s + c * c, 1, 1e-12);
    assert.ok(r.results.length === 6);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ mode: "inverse", fn: "sin", val: "2" }), "val");
  throwsInput(() => mod.solve({ mode: "inverse", fn: "cos", val: "-1.01" }), "val");
  throwsInput(() => mod.solve({ mode: "angle", theta: "", unit: "deg" }), "theta");
  throwsInput(() => mod.solve({ mode: "angle", theta: "1e12", unit: "deg" }), "theta");
  throwsInput(() => mod.solve({ mode: "angle", theta: "30", unit: "grad" }), "unit");
});

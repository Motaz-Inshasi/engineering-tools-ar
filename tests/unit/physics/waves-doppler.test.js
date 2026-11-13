import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/physics/waves-doppler.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const run = (o) => mod.solve({ ...mod.meta.example.values, ...o });
const val = (res, key) => parseFloat(res.results.find((x) => x.label.includes(key)).value);

test("الموجة: v = 340 و f = 500 تعطي λ = 0.68 m", () => {
  const r = run({ mode: "wave", v: "340", f: "500", lam: "" });
  close(val(r, "الطول الموجي"), 0.68, 1e-3);
});

test("الموجة: f = 440 و λ = 0.78 تعطي v = 343.2 m/s", () => {
  const r = run({ mode: "wave", v: "", f: "440", lam: "0.78" });
  close(val(r, "سرعة الموجة"), 343.2, 1e-3);
});

test("الموجة: v = 343 و λ = 0.5 تعطي f = 686 Hz", () => {
  const r = run({ mode: "wave", v: "343", f: "", lam: "0.5" });
  close(val(r, "التردد"), 686, 1e-3);
});

test("الشدة: I = 1e-6 تعطي 60 dB و I = 1e-12 تعطي 0 dB", () => {
  close(val(run({ mode: "intensity", intDir: "I2b", I: "1e-6" }), "مستوى الصوت"), 60, 1e-3);
  assert.equal(val(run({ mode: "intensity", intDir: "I2b", I: "1e-12" }), "مستوى الصوت"), 0);
});

test("الشدة: مضاعفة الشدة تضيف 3.01 dB تقريباً", () => {
  const r = run({ mode: "intensity", intDir: "I2b", I: "2e-6" });
  close(val(r, "مستوى الصوت"), 63.0103, 1e-3);
});

test("الشدة العكسية: β = 120 dB تعطي I = 1 W/m²", () => {
  const r = run({ mode: "intensity", intDir: "b2I", beta: "120" });
  close(val(r, "شدة الصوت"), 1, 1e-3);
});

test("دوبلر: f=500 و vs=30 نحو الراصد الثابت تعطي 547.9 Hz", () => {
  const r = run({ mode: "doppler", f0: "500", c: "343", vo: "0", vs: "30", obsDir: "toward", srcDir: "toward" });
  close(val(r, "التردد المسموع"), 500 * 343 / 313, 1e-3);
});

test("دوبلر: الراصد يقترب بسرعة 10 والمصدر ثابت", () => {
  const r = run({ mode: "doppler", f0: "500", c: "343", vo: "10", vs: "0", obsDir: "toward", srcDir: "toward" });
  close(val(r, "التردد المسموع"), 500 * 353 / 343, 1e-3);
});

test("دوبلر: المصدر يبتعد بسرعة 30 فيقل التردد", () => {
  const r = run({ mode: "doppler", f0: "500", c: "343", vo: "0", vs: "30", obsDir: "toward", srcDir: "away" });
  close(val(r, "التردد المسموع"), 500 * 343 / 373, 1e-3);
  assert.match(r.results.find((x) => x.label === "الاتجاه").value, /أقل/);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => run({ mode: "wave", v: "340", f: "500", lam: "0.68" }), "lam");
  throwsInput(() => run({ mode: "wave", v: "340", f: "", lam: "" }), "f");
  throwsInput(() => run({ mode: "doppler", vs: "343", srcDir: "toward" }), "vs");
  throwsInput(() => run({ mode: "doppler", vo: "400", obsDir: "away", vs: "0" }), "vo");
  throwsInput(() => run({ mode: "intensity", intDir: "b2I", beta: "abc" }), "beta");
  throwsInput(() => run({ mode: "bad" }), "mode");
});

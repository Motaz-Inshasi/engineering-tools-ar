import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/sensors/sensor-divider.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

test("قيم معروفة", () => {
  close(mod.vout(5, 10e3, 10e3, "bottom"), 2.5);
  close(mod.vout(5, 1e3, 10e3, "top"), 5 * 10 / 11);
  close(mod.vout(3.3, 0, 1e3, "bottom"), 0);
  assert.equal(mod.solve({ Rmin: "100", Rmax: "10k", Vcc: "5", pos: "bottom" }).results[0].value, "1 kΩ");
  assert.equal(mod.solve({ Rmin: "1k", Rmax: "100k", Vcc: "5", pos: "bottom", R: "47k" }).results[1].value, "47 kΩ");
  assert.equal(mod.solve({ Rmin: "1", Rmax: "1e6", Vcc: "1", pos: "top" }).results[0].value, "1 kΩ");
});

test("تحقق مستقل: R = √(Rmin·Rmax) تعطي أكبر مدى (مسح عددي)", () => {
  for (const [a, b] of [[1e3, 1e5], [200, 800], [10, 1e6]]) {
    const span = (R) => Math.abs(mod.vout(1, b, R, "bottom") - mod.vout(1, a, R, "bottom"));
    const best = span(Math.sqrt(a * b));
    for (let k = -3; k <= 3; k += 0.01) assert.ok(span(Math.sqrt(a * b) * 10 ** k) <= best * (1 + 1e-12));
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ Rmin: "100k", Rmax: "1k", Vcc: "5", pos: "bottom" }), "Rmax");
  throwsInput(() => mod.solve({ Rmin: "0", Rmax: "1k", Vcc: "5", pos: "bottom" }), "Rmin");
  throwsInput(() => mod.solve({ Rmin: "1", Rmax: "1k", Vcc: "-5", pos: "bottom" }), "Vcc");
  throwsInput(() => mod.solve({ Rmin: "1", Rmax: "1k", Vcc: "5", pos: "side" }), "pos");
});

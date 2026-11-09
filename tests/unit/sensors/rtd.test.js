import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/sensors/rtd.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

test("قيم جدول IEC 60751 المنشورة لـ PT100", () => {
  const table = [[-200, 18.52], [-100, 60.26], [-50, 80.31], [0, 100], [50, 119.4], [100, 138.51], [200, 175.86], [500, 280.98], [850, 390.48]];
  for (const [T, R] of table) close(mod.rOfT(100, T), R, 5e-4, `${T} °C`);
});

test("تحقق مستقل: الحرارة من المقاومة ثم العكس يعيد القيمة عبر المدى كله", () => {
  for (let T = -200; T <= 850; T += 7.3) {
    close(mod.tOfR(100, mod.rOfT(100, T)), T, 1e-9);
    close(mod.tOfR(1000, mod.rOfT(1000, T)), T, 1e-9);
  }
  assert.equal(mod.solve({ type: "1000", dir: "t2r", T: "0" }).results[0].value, "1000 Ω");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ type: "100", dir: "t2r", T: "1000" }), "T");
  throwsInput(() => mod.solve({ type: "100", dir: "t2r", T: "-250" }), "T");
  throwsInput(() => mod.solve({ type: "100", dir: "r2t", R: "10" }), "R");
  throwsInput(() => mod.solve({ type: "100", dir: "r2t", R: "500" }), "R");
  throwsInput(() => mod.solve({ type: "200", dir: "r2t", R: "100" }), "type");
});

import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/dc-circuits/max-power-transfer.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

test("قيم معروفة", () => {
  close(mod.power(12, 8, 8), 4.5);
  close(mod.power(12, 8, 4), 144 * 4 / 144);
  close(mod.power(10, 50, 0), 0);
  close(mod.power(1e3, 1e-3, 1e-3), 2.5e8);
  close(mod.power(-12, 8, 8), 4.5);
  assert.match(mod.solve({ Vth: "10", Rth: "5", RL: "15" }).results[4].value, /^75%/);
});

test("تحقق مستقل: R_L = R_th هي القيمة العظمى فعلاً (مسح عددي)", () => {
  for (const [V, R] of [[12, 8], [5, 0.1], [100, 1e4], [1e-3, 1e6]]) {
    const pmax = mod.power(V, R, R);
    for (let k = -3; k <= 3; k += 0.01) assert.ok(mod.power(V, R, R * Math.pow(10, k)) <= pmax * (1 + 1e-12));
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ Vth: "12", Rth: "0" }), "Rth");
  throwsInput(() => mod.solve({ Vth: "0", Rth: "5" }), "Vth");
  throwsInput(() => mod.solve({ Vth: "12", Rth: "5", RL: "-1" }), "RL");
  throwsInput(() => mod.solve({ Vth: "", Rth: "5" }), "Vth");
});

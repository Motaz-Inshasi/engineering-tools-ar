import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/sensors/pwm-servo.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const S = (o) => mod.solve({ mode: "servo", fclk: "16M", pre: "8", f: "50", range: "180", tmin: "1m", tmax: "2m", ...o }).results;

test("قيم معروفة", () => {
  assert.deepEqual(mod.timer(16e6, 1, 1000), { top: 15999, fact: 1000, bits: Math.log2(16000) });
  assert.equal(S({ angle: "0" })[5].value, 2000);
  assert.equal(S({ angle: "180" })[5].value, 4000);
  assert.equal(mod.solve({ mode: "pwm", fclk: "72M", pre: "72", f: "1k", duty: "25" }).results[3].value, 250);
  assert.equal(mod.solve({ mode: "pwm", fclk: "16M", pre: "1", f: "62.5k", duty: "100" }).results[0].value, 255);
  close(mod.timer(8e6, 64, 61).fact, 8e6 / (64 * 2049), 1e-12);
});

test("تحقق مستقل: قيمة المقارنة ÷ (TOP+1) × الدور = عرض النبضة المطلوب (خلال عدّة واحدة)", () => {
  for (const angle of [0, 15, 45, 90, 133, 180]) {
    const r = S({ angle: String(angle) });
    const top = r[0].value, ocr = r[5].value;
    const tp = 1e-3 + (angle / 180) * 1e-3;
    const tick = 1 / (16e6 / 8);
    assert.ok(Math.abs((ocr * 0.02) / (top + 1) - tp) <= tick);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ mode: "pwm", fclk: "16M", pre: "1", f: "1", duty: "50" }), "pre");
  throwsInput(() => mod.solve({ mode: "pwm", fclk: "16M", pre: "1", f: "20M", duty: "50" }), "f");
  throwsInput(() => S({ angle: "200" }), "angle");
  throwsInput(() => S({ angle: "90", tmin: "2m", tmax: "1m" }), "tmax");
  throwsInput(() => S({ angle: "90", f: "1k" }), "f");
});

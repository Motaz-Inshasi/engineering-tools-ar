import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/control/bode-plot.js";
import { polesZeros, evalTF } from "../../../lib/signals/common.js";
import { C, cabs, carg } from "../../../lib/core/complex.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const fr = (num, den, w) => {
  const tf = { num, den };
  const { zeros, poles } = polesZeros(tf);
  return mod.freqResponse(tf, zeros, poles, w);
};

test("قيم معروفة", () => {
  const r = fr([1], [1, 1], 1);
  close(r.db, -10 * Math.log10(2)); close(r.deg, -45);
  close(fr([1], [0, 1], 10).db, -20);
  close(fr([1], [0, 1], 10).deg, -90);
  close(fr([0, 0, 1], [1], 3).deg, 180);
  close(fr([-1, 1], [1, 1], 1).deg, 90);
  const pm = mod.solve({ G: "1/(s(s+1))" });
  close(pm.results[1].value, 51.8272923, 1e-6);
  assert.equal(pm.results[3].value, "لا نهائي");
});

test("تحقق مستقل: المقدار والطور = حساب مباشر لـ G(jω)", () => {
  const tf = { num: [20, 4], den: [0, 50, 15, 1] };
  const { zeros, poles } = polesZeros(tf);
  for (const w of [0.01, 0.3, 1, 7, 120, 5e4]) {
    const g = evalTF(tf, C(0, w));
    const r = mod.freqResponse(tf, zeros, poles, w);
    close(r.mag, cabs(g), 1e-10);
    const d = ((r.deg - (carg(g) * 180) / Math.PI) % 360 + 360) % 360;
    assert.ok(d < 1e-8 || 360 - d < 1e-8, `phase at ${w}`);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ G: "1/s", wmin: "10", wmax: "1" }), "wmax");
  throwsInput(() => mod.solve({ G: "1/s", wmin: "1e-9", wmax: "1e9" }), "wmax");
  throwsInput(() => mod.solve({ G: "1/s", wmin: "-1" }), "wmin");
  throwsInput(() => mod.solve({ G: "s" }), "G");
});

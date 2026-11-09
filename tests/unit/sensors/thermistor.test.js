import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/sensors\/thermistor.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const beta = (o) => mod.solve({ model: "beta", R0: "10k", T0: "25", beta: "3950", ...o }).results[0].value;

test("قيم معروفة", () => {
  assert.equal(beta({ dir: "r2t", R: "10k" }), "25 °C");
  assert.equal(beta({ dir: "t2r", T: "25" }), "10 kΩ");
  assert.equal(beta({ dir: "t2r", T: "0" }), "33.621 kΩ");
  assert.equal(beta({ dir: "t2r", T: "100" }), "697.52 Ω");
  const sh = mod.solve({ model: "sh", dir: "r2t", R: "10k", A: "1.129148e-3", B: "2.34125e-4", C: "8.76741e-8" }).results[0].value;
  assert.match(sh, /^25\.0\d? °C$|^24\.9\d? °C$|^25 °C$/);
});

test("تحقق مستقل: معاملات Steinhart-Hart من 3 نقاط تعيد النقاط نفسها، والعكس ثم الطرد يعيد الحرارة", () => {
  const pts = [[0, 32650], [25, 10000], [50, 3600]];
  const [A, B, C] = mod.shCoeffs(pts);
  for (const [T, R] of pts) close(mod.shT(A, B, C, R), T, 1e-9);
  for (const T of [-40, -10, 0, 37, 85, 150]) close(mod.shT(A, B, C, mod.shR(A, B, C, T)), T, 1e-9);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ model: "beta", dir: "r2t", R: "-5", R0: "10k", T0: "25", beta: "3950" }), "R");
  throwsInput(() => mod.solve({ model: "beta", dir: "r2t", R: "5k", R0: "10k", T0: "25", beta: "0" }), "beta");
  throwsInput(() => mod.solve({ model: "sh3", dir: "r2t", R: "5k", pts: "0 10k\n25 10k" }), "pts");
  throwsInput(() => mod.solve({ model: "sh3", dir: "r2t", R: "5k", pts: "0 10k\n25 10k\n50 10k" }), "pts");
  throwsInput(() => mod.solve({ model: "beta", dir: "t2r", T: "-300", R0: "10k", T0: "25", beta: "3950" }), "T");
});

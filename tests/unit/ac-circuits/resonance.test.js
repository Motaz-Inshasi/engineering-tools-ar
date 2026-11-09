import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/ac-circuits/resonance.js";
import { zR, zL, zC, zsum, zpar } from "../../../lib/ac-circuits/common.js";
import { cabs } from "../../../lib/core/complex.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const res = (conn, R, L, C) => mod.solve({ conn, R, L, C }).results;

test("قيم معروفة", () => {
  assert.equal(res("series", "10", "1m", "100n")[0].text, "f0 = 15.92 kHz");
  close(res("series", "10", "1m", "100n")[2].value, 10);
  close(res("parallel", "10k", "1m", "100n")[2].value, 100);
  assert.equal(res("series", "1", "1", "1")[0].text, "f0 = 159.2 mHz");
  close(res("series", "1e6", "1e-3", "1e-9")[2].value, 1e-3);
  assert.equal(res("series", "1", "1n", "1p")[0].text, "f0 = 5.033 GHz");
});

test("تحقق مستقل: |Z| أصغر ما يمكن عند f0 للتوالي، وعند f1 و f2 تهبط الاستجابة إلى 1/√2", () => {
  const R = 20, L = 5e-3, C = 2e-7;
  const f0 = 1 / (2 * Math.PI * Math.sqrt(L * C));
  const Zs = (f) => cabs(zsum(zR(R), zL(L, 2 * Math.PI * f), zC(C, 2 * Math.PI * f)));
  for (const k of [0.9, 0.99, 1.01, 1.1]) assert.ok(Zs(f0 * k) > Zs(f0));
  const r = mod.solve({ conn: "series", R: String(R), L: String(L), C: String(C) });
  const steps = r.steps.map((s) => (typeof s === "string" ? s : s.tex)).join(" ");
  const f1 = Number(steps.match(/f_1 = ([\d.e+-]+)/)[1]), f2 = Number(steps.match(/f_2 = ([\d.e+-]+)/)[1]);
  close(R / Zs(f1), Math.SQRT1_2, 1e-5);
  close(R / Zs(f2), Math.SQRT1_2, 1e-5);
  const Zp = (f) => cabs(zpar(zR(R), zL(L, 2 * Math.PI * f), zC(C, 2 * Math.PI * f)));
  close(Zp(f0), R, 1e-9);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ conn: "series", R: "10", L: "-1m", C: "100n" }), "L");
  throwsInput(() => mod.solve({ conn: "series", R: "0", L: "1", C: "1" }), "R");
  throwsInput(() => mod.solve({ conn: "series", R: "1", L: "1", C: "" }), "C");
  throwsInput(() => mod.solve({ conn: "x", R: "1", L: "1", C: "1" }), "conn");
});

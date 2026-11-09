import { test } from "node:test";
import { assert, close, throwsInput, checkExample, rng } from "../helpers.js";
import * as mod from "../../../lib/dc-circuits/ohms-law.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const v = (input) => mod.solve(input).values;

test("كل التركيبات الست تعطي القيم نفسها", () => {
  const ref = { V: 12, I: 0.5, R: 24, P: 6 };
  const pairs = [["V", "I"], ["V", "R"], ["V", "P"], ["I", "R"], ["I", "P"], ["R", "P"]];
  for (const [a, b] of pairs) {
    const out = v({ [a]: String(ref[a]), [b]: String(ref[b]) });
    for (const k of ["V", "I", "R", "P"]) close(out[k], ref[k], 1e-12, `${a}${b} → ${k}`);
  }
});

test("قيم كبيرة وصغيرة وسالبة", () => {
  close(v({ V: "1e6", R: "1e12" }).I, 1e-6);
  close(v({ I: "1e-9", R: "1e3" }).P, 1e-15);
  close(v({ V: "-5", I: "-0.1" }).R, 50);
  close(v({ P: "1e9", R: "1e-3" }).I, 1e6);
  const rand = rng(2);
  for (let i = 0; i < 100; i++) {
    const R = Math.exp(rand() * 20 - 5), I = Math.exp(rand() * 10 - 8);
    const o = v({ I: String(I), R: String(R) });
    close(o.V / o.I, R, 1e-12); close(o.P, o.V * o.I, 1e-12);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ V: "5", I: "1", R: "5" }));
  throwsInput(() => mod.solve({ V: "5" }));
  throwsInput(() => mod.solve({ V: "5", R: "0" }), "R");
  throwsInput(() => mod.solve({ V: "5", I: "0" }), "I");
  throwsInput(() => mod.solve({ V: "5", I: "-1" }), "I");
  throwsInput(() => mod.solve({ P: "-1", R: "5" }), "P");
});

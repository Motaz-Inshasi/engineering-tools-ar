import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/electronics/resistor-color-code.js";
import { SERIES } from "../../../lib/core/eseries.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

test("قيم معروفة", () => {
  close(mod.decode(4, ["brown", "black", "red", "gold"]).value, 1000);
  close(mod.decode(4, ["brown", "black", "gold", "gold"]).value, 1);
  close(mod.decode(4, ["yellow", "violet", "silver", "silver"]).value, 0.47);
  close(mod.decode(5, ["brown", "black", "black", "brown", "brown"]).value, 1000);
  const six = mod.decode(6, ["red", "red", "black", "black", "brown", "brown"]);
  close(six.value, 220); assert.equal(six.tol, 1); assert.equal(six.tc, 100);
  close(mod.decode(4, ["white", "white", "white", "gold"]).value, 99e9);
  assert.deepEqual(mod.encode(4700, 4, 5).keys, ["yellow", "violet", "red", "gold"]);
  assert.deepEqual(mod.encode(0.1, 4, 10).keys, ["brown", "black", "silver", "silver"]);
  assert.equal(mod.encode(4730, 4, 5).rounded, true);
});

test("تحقق مستقل: الترميز ثم القراءة يعيد القيمة لكل قيم E24 و E96 عبر العقود", () => {
  for (const [series, bands, nd] of [["E24", 4, 2], ["E96", 5, 3]]) {
    for (const b of SERIES[series]) for (let e = -1; e <= 6; e++) {
      const v = Number((b * Math.pow(10, e - (nd - 1))).toPrecision(6));
      if (v < (bands === 4 ? 0.1 : 1)) continue;
      const enc = mod.encode(v, bands, 1);
      assert.equal(enc.rounded, false, `${v}`);
      close(mod.decode(bands, enc.keys).value, v, 1e-9, `${series} ${v}`);
    }
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ mode: "decode", bands: "4", b1: "gold", b2: "violet", b3: "red", b4: "gold" }), "b1");
  throwsInput(() => mod.solve({ mode: "decode", bands: "4", b1: "red", b2: "red", b3: "none", b4: "gold" }), "b3");
  throwsInput(() => mod.solve({ mode: "decode", bands: "4", b1: "red", b2: "red", b3: "red", b4: "orange" }), "b4");
  throwsInput(() => mod.solve({ mode: "encode", bands: "4", value: "0.001", tol: "5" }), "value");
  throwsInput(() => mod.solve({ mode: "encode", bands: "4", value: "-5", tol: "5" }), "value");
  throwsInput(() => mod.solve({ mode: "decode", bands: "6", b1: "red", b2: "red", b3: "red", b4: "red", b5: "brown", b6: "white" }), "b6");
});

import { test } from "node:test";
import { assert, close, throwsInput, checkExample, rng } from "../helpers.js";
import * as mod from "../../../lib/units/engineering-notation.js";
import { parseNumber } from "../../../lib/core/format.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const E = (x, unit = "") => mod.solve({ x, unit }).results;

test("قيم معروفة", () => {
  assert.equal(E("4700", "Ω")[0].value, "4.7 kΩ");
  assert.equal(E("2.2M", "Ω")[0].value, "2.2 MΩ");
  assert.equal(E("0.000000022", "F")[0].value, "22 nF");
  assert.equal(E("999999.9999999")[1].value, "1 × 10^6");
  assert.equal(E("-0.0153", "A")[0].value, "-15.3 mA");
  assert.equal(E("0")[2].value, "0 × 10^0");
  assert.equal(E("1e-30")[0].value, "1e-30");
  assert.equal(E("123456")[2].value, "1.23456 × 10^5");
});

test("تحقق مستقل: المعامل بين 1 و 1000 والأُس من مضاعفات 3 ويعيد القيمة الأصلية", () => {
  const rand = rng(81);
  for (let t = 0; t < 500; t++) {
    const x = (rand() < 0.5 ? -1 : 1) * Math.pow(10, rand() * 40 - 20);
    const { mant, exp } = mod.engParts(x);
    assert.ok(Math.abs(mant) >= 1 && Math.abs(mant) < 1000, `${x}: ${mant}`);
    assert.equal(Math.abs(exp % 3), 0);
    close(mant * 10 ** exp, x, 1e-10);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ x: "12abc" }), "x");
  throwsInput(() => mod.solve({ x: "" }), "x");
  throwsInput(() => mod.solve({ x: "inf" }), "x");
  throwsInput(() => mod.solve({ x: "1..2" }), "x");
  assert.ok(isFinite(parseNumber("4.7k")));
});

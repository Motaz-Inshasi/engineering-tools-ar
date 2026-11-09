import { test } from "node:test";
import { assert, throwsInput, checkExample, rng } from "../helpers.js";
import * as mod from "../../../lib/algebra/number-bases.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const conv = (x, from, to) => mod.solve({ x, from, to }).results[0].value;

test("تحويلات معروفة", () => {
  assert.equal(conv("255", "10", "16"), "FF");
  assert.equal(conv("1011.101", "2", "10"), "11.625");
  assert.equal(conv("0.1", "10", "2"), "0.00011001100110011001");
  assert.equal(conv("-42", "10", "2"), "-101010");
  assert.equal(conv("0", "10", "2"), "0");
  assert.equal(conv("777", "8", "10"), "511");
  assert.equal(conv("ZZ", "36", "10"), "1295");
  assert.equal(conv("18446744073709551616", "10", "16"), "10000000000000000");
  assert.equal(conv("ff", "16", "2"), "11111111");
});

test("تحقق عشوائي: التحويل ذهاباً وإياباً يعيد العدد", () => {
  const rand = rng(99);
  for (let t = 0; t < 300; t++) {
    const n = BigInt(Math.floor(rand() * 1e15));
    const b1 = 2 + Math.floor(rand() * 35), b2 = 2 + Math.floor(rand() * 35);
    const s = n.toString(b1).toUpperCase();
    const mid = mod.convert(s, b1, b2);
    assert.equal(mod.convert(mid, b2, b1), s);
    assert.equal(mod.convert(s, b1, 10), n.toString());
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ x: "129", from: "2", to: "10" }), "x");
  throwsInput(() => mod.solve({ x: "10", from: "1", to: "10" }), "from");
  throwsInput(() => mod.solve({ x: "10", from: "10", to: "37" }), "to");
  throwsInput(() => mod.solve({ x: "1.2.3", from: "10", to: "2" }), "x");
  throwsInput(() => mod.solve({ x: "", from: "10", to: "2" }), "x");
});

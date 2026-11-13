import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/computing/ieee754.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const enc = (value, precision = "32") => mod.solve({ mode: "encode", precision, value });
const v = (r, l) => r.results.find((x) => x.label.startsWith(l)).value;

test("تمثيلات معروفة", () => {
  assert.equal(v(enc("1"), "التمثيل"), "0x3F800000");
  assert.equal(v(enc("0.1"), "التمثيل"), "0x3DCCCCCD");
  assert.equal(v(enc("0.1", "64"), "التمثيل"), "0x3FB999999999999A");
  assert.equal(v(enc("-2", "64"), "التمثيل"), "0xC000000000000000");
  assert.equal(v(enc("inf"), "التمثيل"), "0x7F800000");
  assert.equal(v(enc("0.1", "64"), "القيمة المخزنة"), "0.1000000000000000055511151231257827021181583404541015625");
});

test("خطأ التقريب والأنواع الخاصة", () => {
  assert.equal(v(enc("0.1"), "خطأ التقريب"), "1.49e-9 (نسبي 1.49e-8)");
  assert.equal(v(enc("0.5", "64"), "خطأ التقريب"), "صفر (تمثيل دقيق)");
  assert.equal(v(enc("1e40"), "خطأ التقريب"), "تجاوز للمدى (overflow) فأصبح لا نهاية");
  assert.equal(v(mod.solve({ mode: "decode", precision: "32", hex: "00000001" }), "النوع"), "عدد دون الطبيعي (subnormal)");
  assert.equal(v(mod.solve({ mode: "decode", precision: "32", hex: "7FC00000" }), "النوع"), "ليس عدداً (NaN)");
});

test("الترميز ثم فك الترميز يعيد العدد نفسه", () => {
  for (const x of ["3.14159", "-1234.5", "6.02e23", "0.15625"]) {
    const h = v(enc(x, "64"), "التمثيل").slice(2);
    const d = mod.solve({ mode: "decode", precision: "64", hex: h });
    assert.equal(Number(v(d, "القيمة المخزنة")), Number(x));
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ mode: "encode", precision: "32", value: "1,5" }), "value");
  throwsInput(() => mod.solve({ mode: "decode", precision: "32", hex: "3F80" }), "hex");
  throwsInput(() => mod.solve({ mode: "decode", precision: "64", hex: "XYZ" }), "hex");
});

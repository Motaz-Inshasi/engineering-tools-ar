import { test } from "node:test";
import { assert, close } from "../helpers.js";
import { parseNumber, fmt, tex, eng, toFraction, niceTex, nice, normalizeDigits } from "../../../lib/core/format.js";

test("parseNumber يقبل الصيغ الهندسية والأرقام العربية", () => {
  close(parseNumber("4.7k"), 4700);
  close(parseNumber("10u"), 1e-5);
  close(parseNumber("10µ"), 1e-5);
  close(parseNumber("2.2M"), 2.2e6);
  close(parseNumber("3m"), 0.003);
  close(parseNumber("1e-3"), 0.001);
  close(parseNumber("١٢٫٥"), 12.5);
  close(parseNumber("-5"), -5);
  close(parseNumber("100p"), 1e-10);
  assert.equal(parseNumber("inf"), Infinity);
  assert.equal(parseNumber("-inf"), -Infinity);
  assert.ok(Number.isNaN(parseNumber("abc")));
  assert.ok(Number.isNaN(parseNumber("")));
  assert.ok(Number.isNaN(parseNumber("1.2.3")));
  assert.equal(parseNumber(7), 7);
});

test("fmt يعرض الأرقام بدقة مناسبة", () => {
  assert.equal(fmt(0), "0");
  assert.equal(fmt(-0), "0");
  assert.equal(fmt(1 / 3), "0.333333");
  assert.equal(fmt(123456789012), "1.23457e11");
  assert.equal(fmt(0.00001234), "1.234e-5");
  assert.equal(fmt(-2.5), "-2.5");
  assert.equal(fmt(Infinity), "∞");
  assert.equal(fmt(NaN), "غير معرّف");
  assert.equal(tex(1.5e-7), "1.5 \\times 10^{-7}");
});

test("eng يختار البادئة الهندسية الصحيحة", () => {
  assert.equal(eng(4700, "Ω"), "4.7 kΩ");
  assert.equal(eng(0.000001, "F"), "1 µF");
  assert.equal(eng(2.2e-9, "F"), "2.2 nF");
  assert.equal(eng(1e6, "Hz"), "1 MHz");
  assert.equal(eng(0, "V"), "0 V");
  assert.equal(eng(-0.0153, "A"), "-15.3 mA");
  assert.equal(eng(999.99, "V"), "1 kV");
  assert.equal(eng(12, ""), "12");
});

test("toFraction و nice", () => {
  assert.deepEqual(toFraction(0.75), [3, 4]);
  assert.deepEqual(toFraction(-1 / 3), [-1, 3]);
  assert.deepEqual(toFraction(5), [5, 1]);
  assert.equal(toFraction(Math.PI, 100), null);
  assert.equal(niceTex(0.5), "\\frac{1}{2}");
  assert.equal(niceTex(-2), "-2");
  assert.equal(nice(2 / 3), "2/3");
  assert.equal(normalizeDigits("٣−٢"), "3-2");
});

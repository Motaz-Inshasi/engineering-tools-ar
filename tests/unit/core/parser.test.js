import { test } from "node:test";
import { assert, close, throwsInput } from "../helpers.js";
import { parse, evaluate, toTex, toText, variables } from "../../../lib/core/parser.js";

const ev = (s, x = 2) => evaluate(parse(s), { x });

test("الأولويات والضرب الضمني", () => {
  close(ev("2 + 3 * 4"), 14);
  close(ev("2^3^2"), 512);
  close(ev("-x^2"), -4);
  close(ev("2x"), 4);
  close(ev("2(x+1)"), 6);
  close(ev("(x+1)(x-1)"), 3);
  close(ev("x sin(x)"), 2 * Math.sin(2));
  close(ev("sin 2x"), Math.sin(4));
  close(ev("sin^2 x"), Math.sin(2) ** 2);
  close(ev("2^-1"), 0.5);
  close(ev("|x - 5|"), 3);
  close(ev("3!"), 6);
  close(ev("1/2x"), 1);
});

test("الدوال والثوابت", () => {
  close(ev("pi"), Math.PI);
  close(ev("e"), Math.E);
  close(ev("ln(e^x)"), 2);
  close(ev("log(100)"), 2);
  close(ev("sqrt(16)"), 4);
  close(ev("exp(0)"), 1);
  close(ev("arcsin(1)"), Math.PI / 2);
  close(ev("x^(1/3)", -8), -2);
  close(ev("cosh(0)"), 1);
  close(ev("2·3×4÷2"), 12);
  close(ev("x²"), 4);
});

test("رسائل الخطأ للتعابير غير الصحيحة", () => {
  throwsInput(() => parse("sin(x"));
  throwsInput(() => parse("x +* 2"));
  throwsInput(() => parse("x)"));
  throwsInput(() => parse(""));
  throwsInput(() => parse("x # 2"));
  throwsInput(() => parse("y + 1", ["x"]));
});

test("toTex و toText", () => {
  assert.equal(toTex(parse("x^2/2")), "\\frac{x^{2}}{2}");
  assert.equal(toTex(parse("sqrt(x)")), "\\sqrt{x}");
  assert.equal(toText(parse("2*(x+1)")), "2*(x + 1)");
  assert.equal(toText(parse("-(x-1)")), "-(x - 1)");
  assert.deepEqual([...variables(parse("x*y+z"))].sort(), ["x", "y", "z"]);
  assert.match(toTex(parse("2 x sin(x)")), /2 x \\sin/);
});

test("دالة أكبر عدد صحيح [x] والسقف", () => {
  assert.equal(ev("[x]", 2.7), 2);
  assert.equal(ev("[x]", -2.3), -3);
  assert.equal(ev("[x]", 3), 3);
  assert.equal(ev("floor(x)", -0.5), -1);
  assert.equal(ev("⌊x⌋", 4.9), 4);
  assert.equal(ev("ceil(x)", 2.1), 3);
  assert.equal(ev("⌈x⌉", -2.1), -2);
  assert.equal(ev("[0.1*30]"), 3);
  assert.equal(ev("2[x]+1", 2.5), 5);
  assert.equal(ev("[x/2]^2", 5), 4);
  assert.equal(ev("[|x|]", -2.5), 2);
  assert.equal(ev("{x+1}^2", 2), 9);
  assert.equal(toText(parse("[x+1]")), "[x + 1]");
  assert.equal(toTex(parse("[x]")), String.raw`\left\lfloor x \right\rfloor`);
  assert.equal(toTex(parse("ceil(x)")), String.raw`\left\lceil x \right\rceil`);
  throwsInput(() => parse("[x"));
  throwsInput(() => parse("x]"));
  throwsInput(() => parse("[x)"));
});

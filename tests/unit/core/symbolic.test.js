import { test } from "node:test";
import { assert, close, rng } from "../helpers.js";
import { parse, evaluate, toText } from "../../../lib/core/parser.js";
import { simplify, derivative, diff, integrate, verifyAntiderivative } from "../../../lib/core/symbolic.js";
import { derivNumeric, integrateNumeric } from "../../../lib/core/numeric.js";

const s = (e) => toText(simplify(parse(e)));
const d = (e) => toText(diff(parse(e), "x"));

test("التبسيط", () => {
  assert.equal(s("x + x"), "2*x");
  assert.equal(s("x*x*x"), "x^3");
  assert.equal(s("x/x"), "1");
  assert.equal(s("0*x + 1*y"), "y");
  assert.equal(s("(x+1) - (x+1)"), "0");
  assert.equal(s("2/4 x"), "x/2");
  assert.equal(s("e^x e^(2x)"), "e^(3*x)");
  assert.equal(s("sqrt(x)^2"), "x");
  assert.equal(s("sin(0) + cos(0)"), "1");
  assert.equal(s("x^0"), "1");
});

test("المشتقات بقيم معروفة من الكتب", () => {
  assert.equal(d("x^3 + 2x"), "3*x^2 + 2");
  assert.equal(d("x^2 sin(x)"), "x^2*cos(x) + 2*x*sin(x)");
  assert.equal(d("e^(3x)"), "3*e^(3*x)");
  assert.equal(d("ln(x)"), "1/x");
  assert.equal(d("1/x"), "-1/x^2");
  assert.equal(d("5"), "0");
  assert.equal(d("sqrt(x)"), "1/(2*sqrt(x))");
  assert.equal(d("2^x"), "2^x*ln(2)");
  assert.equal(d("x^x"), "x^x*(ln(x) + 1)");
  assert.equal(d("atan(x)"), "1/(x^2 + 1)");
});

test("خطوات الاشتقاق تذكر القاعدة", () => {
  const r = derivative(parse("sin(x^2)"), "x");
  assert.ok(r.steps.some((st) => st.rule.includes("السلسلة")));
  const p = derivative(parse("x e^x"), "x");
  assert.ok(p.steps.some((st) => st.rule.includes("الضرب")));
  const q = derivative(parse("x/(x+1)"), "x");
  assert.ok(q.steps.some((st) => st.rule.includes("القسمة")));
});

const EXPRS = ["x^3 - 2x + 1", "sin(x) cos(x)", "e^(2x) / (x^2 + 1)", "ln(x^2 + 1)", "sqrt(x^2 + 3)", "tan(x/3)", "x^2 e^(-x)", "atan(2x) + acos(x/5)", "cosh(x) - sinh(2x)", "(x+1)^5 / (x-7)", "abs(x - 0.25)", "log(x^2+2)", "x^(2.5)"];

test("تحقق مستقل: المشتقة الرمزية = الفرق المحدود العددي", () => {
  const rand = rng(7);
  for (const e of EXPRS) {
    const n = parse(e);
    const dn = diff(n, "x");
    for (let i = 0; i < 6; i++) {
      const x = 0.3 + rand() * 2.2;
      const sym = evaluate(dn, { x });
      const numd = derivNumeric((t) => evaluate(n, { x: t }), x);
      close(sym, numd, 1e-6, `${e} at ${x}`);
    }
  }
});

const INTEGRALS = [
  ["x^2", "x^3/3"], ["3x^2 + 2x + 1", "x^3 + x^2 + x"], ["sin(2x)", "-cos(2*x)/2"], ["1/x", "ln(abs(x))"],
  ["e^(3x)", "e^(3*x)/3"], ["x e^x", null], ["x^2 sin(x)", null], ["ln(x)", "x*ln(x) - x"], ["1/(x^2+1)", "atan(x)"],
  ["2x cos(x^2)", "sin(x^2)"], ["x/(x^2+1)", "ln(x^2 + 1)/2"], ["e^x sin(x)", null], ["sec(x)^2", "tan(x)"],
  ["1/sqrt(x)", "2*sqrt(x)"], ["(2x+1)^5", null], ["sin(x)^2", null], ["1/(x^2-1)", null], ["x^3/(x^2+1)", null],
  ["1/(x (x+1)^2)", null], ["atan(x)", null], ["x ln(x)", null], ["cos(3x+1)", null], ["5", "5*x"], ["1/(x^2+2x+5)", null]
];

test("التكاملات المعروفة وتحقق مستقل بالاشتقاق", () => {
  for (const [e, expected] of INTEGRALS) {
    const r = integrate(parse(e), "x");
    assert.ok(r, `integral of ${e} should be found`);
    if (expected) assert.equal(toText(r.result), expected, e);
    assert.ok(verifyAntiderivative(r.result, parse(e), "x"), `F' = f for ${e}`);
  }
});

test("تحقق مستقل: التكامل الرمزي المحدد = التكامل العددي", () => {
  for (const [e] of INTEGRALS) {
    const f = parse(e);
    const r = integrate(f, "x");
    const a = 0.5, b = 0.9;
    const F = (x) => evaluate(r.result, { x });
    const exact = F(b) - F(a);
    const numv = integrateNumeric((x) => evaluate(f, { x }), a, b).value;
    close(exact, numv, 1e-8, e);
  }
});

test("التكامل غير الموجود رمزياً يرجع null بأمانة", () => {
  assert.equal(integrate(parse("e^(x^2)"), "x"), null);
  assert.equal(integrate(parse("sin(x)/x"), "x"), null);
  assert.equal(integrate(parse("x^x"), "x"), null);
});

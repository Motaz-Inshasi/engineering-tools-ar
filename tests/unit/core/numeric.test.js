import { test } from "node:test";
import { assert, close } from "../helpers.js";
import { integrateNumeric, simpson, derivNumeric, bisection, newton, secant, linspace, sampleFunction } from "../../../lib/core/numeric.js";

test("التكامل العددي بقيم معروفة", () => {
  close(integrateNumeric(Math.sin, 0, Math.PI).value, 2, 1e-10);
  close(integrateNumeric((x) => x * x, 0, 3).value, 9, 1e-12);
  close(integrateNumeric((x) => Math.exp(-x * x), -Infinity, Infinity).value, Math.sqrt(Math.PI), 1e-8);
  close(integrateNumeric((x) => 1 / (x * x), 1, Infinity).value, 1, 1e-8);
  close(integrateNumeric((x) => 1 / Math.sqrt(x), 0, 1).value, 2, 1e-6);
  close(integrateNumeric((x) => x, 2, 0).value, -2, 1e-12);
  assert.equal(integrateNumeric((x) => x, 1, 1).value, 0);
  close(simpson(Math.cos, 0, Math.PI / 2), 1, 1e-10);
});

test("التكامل المتباعد لا يُعلن كتقارب", () => {
  const r = integrateNumeric((x) => 1 / x, 0, 1);
  assert.equal(r.ok, false);
});

test("المشتقة العددية", () => {
  close(derivNumeric(Math.sin, 0), 1, 1e-9);
  close(derivNumeric((x) => x ** 3, 2), 12, 1e-8);
  close(derivNumeric(Math.exp, 1, 2), Math.E, 1e-5);
});

test("طرق الجذور", () => {
  const f = (x) => x ** 3 - 2 * x - 5;
  close(bisection(f, 2, 3).root, 2.0945514815423265, 1e-9);
  close(newton(f, (x) => 3 * x * x - 2, 2).root, 2.0945514815423265, 1e-14);
  close(secant(f, 2, 3).root, 2.0945514815423265, 1e-12);
  assert.equal(bisection((x) => x * x + 1, 0, 1).reason, "sign");
  assert.equal(newton((x) => x * x - 1, (x) => 2 * x, 0).reason, "zeroDerivative");
  assert.equal(bisection((x) => x, 0, 1).root, 0);
  close(newton((x) => x * x - 1e-10, (x) => 2 * x, 1).root, 1e-5, 1e-9);
  close(newton((x) => x - 1e12, () => 1, 0).root, 1e12, 1e-12);
});

test("linspace و sampleFunction", () => {
  assert.deepEqual(linspace(0, 1, 3), [0, 0.5, 1]);
  const pts = sampleFunction((x) => 1 / x, -1, 1, 3);
  assert.equal(pts[1][1], null);
});

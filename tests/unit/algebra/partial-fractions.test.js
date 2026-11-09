import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/algebra/partial-fractions.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const pf = (num, den, v = "s") => mod.solve({ num, den, v }).results[0].text;

test("تفكيكات معروفة من الكتب", () => {
  assert.equal(pf("1", "s(s+1)"), "1/s - 1/(s + 1)");
  assert.equal(pf("1", "(s+1)^2"), "1/(s + 1)^2");
  assert.equal(pf("s+2", "s^2 + 2s + 5"), "(s + 2)/(s^2 + 2*s + 5)");
  assert.equal(pf("1", "s^2 (s+1)"), "1/s^2 - 1/s + 1/(s + 1)");
  assert.equal(pf("s^3", "s^2 - 1"), "s + 1/2/(s - 1) + 1/2/(s + 1)");
  assert.equal(pf("2x + 3", "x^2 + 3x + 2", "x"), "1/(x + 1) + 1/(x + 2)");
  assert.equal(pf("1", "s^2+1"), "(1)/(s^2 + 1)");
});

test("الحالات الحدية", () => {
  assert.equal(pf("0", "s+1"), "");
  assert.equal(pf("1000000", "s - 1e-3"), "1000000/(s - 0.001)");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ num: "1", den: "5", v: "s" }), "den");
  throwsInput(() => mod.solve({ num: "sin(s)", den: "s", v: "s" }), "num");
  throwsInput(() => mod.solve({ num: "1", den: "0", v: "s" }), "den");
  throwsInput(() => mod.solve({ num: "1", den: "(s^2+1)^2", v: "s" }), "den");
  throwsInput(() => mod.solve({ num: "", den: "s", v: "s" }), "num");
});

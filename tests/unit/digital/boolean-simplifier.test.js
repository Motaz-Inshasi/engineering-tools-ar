import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/digital/boolean-simplifier.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const S = (n, m, d = "") => mod.solve({ mode: "minterms", n: String(n), m, d }).results[0].text;

test("تبسيطات كتابية", () => {
  assert.equal(S(2, "1, 2, 3"), "F = A + B");
  assert.equal(S(3, "0, 1, 2, 3"), "F = A'");
  assert.equal(S(3, "1, 3, 5, 7"), "F = C");
  assert.equal(S(4, "1, 3, 7, 11, 15", "0, 2, 5"), "F = A'B' + CD");
  assert.equal(S(3, ""), "F = 0");
  assert.equal(S(2, "0, 1, 2, 3"), "F = 1");
  assert.equal(mod.solve({ mode: "expr", expr: "A'B'C' + A'B'C + AB'C' + AB'C" }).results[0].text, "F = B'");
  assert.equal(S(1, "1"), "F = A");
});

test("خريطة كارنو تظهر لـ 2 إلى 4 متغيرات فقط", () => {
  assert.ok(mod.solve({ mode: "minterms", n: "4", m: "0" }).blocks[0].caption.includes("كارنو"));
  assert.ok(!mod.solve({ mode: "minterms", n: "5", m: "0" }).blocks.some((b) => b.caption.includes("كارنو")));
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ mode: "minterms", n: "3", m: "1, 9" }), "m");
  throwsInput(() => mod.solve({ mode: "minterms", n: "9", m: "1" }), "n");
  throwsInput(() => mod.solve({ mode: "minterms", n: "3", m: "1", d: "-1" }), "d");
  throwsInput(() => mod.solve({ mode: "expr", expr: "1 + 0" }), "expr");
  throwsInput(() => mod.solve({ mode: "minterms", n: "3", m: "a" }), "m");
});

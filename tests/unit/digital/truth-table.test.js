import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/digital\/truth-table.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const m = (expr) => mod.solve({ expr }).results[0].value;

test("قيم معروفة", () => {
  assert.equal(m("A B"), "Σm(3)");
  assert.equal(m("A + B"), "Σm(1, 2, 3)");
  assert.equal(m("A ^ B"), "Σm(1, 2)");
  assert.equal(m("(A + B)'"), "Σm(0)");
  assert.equal(m("A A'"), "Σm()");
  assert.equal(m("1"), "Σm(0)");
  assert.equal(m("A'B'C'D'E'F'G'H'"), "Σm(0)");
  assert.equal(mod.solve({ expr: "A B" }).results[1].value, "ΠM(0, 1, 2)");
});

test("تحقق مستقل: قانونا دي مورغان متكافئان في جدول الحقيقة", () => {
  assert.equal(m("(AB)'"), m("A' + B'"));
  assert.equal(m("(A + B + C)'"), m("A'B'C'"));
  assert.equal(m("A(B + C)"), m("AB + AC"));
  assert.equal(m("A + A'B"), m("A + B"));
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ expr: "A + (B" }), "expr");
  throwsInput(() => mod.solve({ expr: "" }), "expr");
  throwsInput(() => mod.solve({ expr: "A % B" }), "expr");
  throwsInput(() => mod.solve({ expr: "ABCDEFGHI" }), "expr");
});

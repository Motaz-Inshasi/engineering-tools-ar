import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/ac-circuits/impedance.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const z = (el, val, f) => mod.solve({ el, val, f });

test("قيم معروفة", () => {
  assert.equal(z("R", "100", "50").results[0].text, "Z = 100 Ω");
  assert.equal(z("L", "1", "50").results[0].text, "Z = 314.159j Ω");
  assert.equal(z("C", "1u", "1k").results[0].text, "Z = -159.155j Ω");
  close(z("L", "1", "50").results[2].value, 90);
  close(z("C", "1u", "1k").results[2].value, -90);
  assert.equal(z("C", "1p", "1G").results[0].text, "Z = -159.155j Ω");
  assert.equal(z("L", "1n", "1").results[0].text, "Z = 6.28319e-9j Ω");
});

test("تحقق مستقل: Z × Y = 1 ومفاعلتا L و C تتساويان عند تردد الرنين", () => {
  const L = 2e-3, Cp = 47e-9, f0 = 1 / (2 * Math.PI * Math.sqrt(L * Cp));
  const xl = z("L", String(L), String(f0)).results[3].value, xc = z("C", String(Cp), String(f0)).results[3].value;
  assert.equal(xl, xc);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => z("C", "10u", "0"), "f");
  throwsInput(() => z("C", "-1", "50"), "val");
  throwsInput(() => z("X", "1", "50"), "el");
  throwsInput(() => z("R", "", "50"), "val");
});

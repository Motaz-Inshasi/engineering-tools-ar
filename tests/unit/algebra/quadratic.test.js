import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/algebra/quadratic.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const q = (a, b, c) => mod.solve({ a, b, c });

test("حلول معروفة", () => {
  const r = q("1", "-3", "2");
  close(r.results[1].value, 2); close(r.results[2].value, 1);
  const d = q("1", "-4", "4");
  close(d.results[1].value, 2);
  assert.match(d.results[0].value, /مكرر/);
  const n = q("-1", "0", "9");
  close(n.results[1].value, 3); close(n.results[2].value, -3);
  assert.equal(q("1", "0", "1").results[1].value, "0 + j");
  const z = q("5", "0", "0");
  close(z.results[1].value, 0);
});

test("الدقة العددية مع معاملات متباعدة جداً", () => {
  const r = q("1", "1e8", "1");
  close(r.results[1].value, -1e-8, 1e-9);
  close(r.results[2].value, -1e8, 1e-12);
  const s = q("1e-10", "1", "1");
  close(s.results[1].value, -1.0000000001, 1e-9);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => q("0", "1", "1"), "a");
  throwsInput(() => q("", "1", "1"), "a");
  throwsInput(() => q("1", "x", "1"), "b");
  throwsInput(() => q("1", "1", "inf"), "c");
});

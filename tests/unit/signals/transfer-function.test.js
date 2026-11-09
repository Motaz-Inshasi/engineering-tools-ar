import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/signals/transfer-function.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const tf = (G) => mod.solve({ G });
const v = (r, i) => r.results[i].value;

test("أقطاب وأصفار معروفة", () => {
  const r = tf("(s+1)/((s+2)(s+3))");
  assert.equal(v(r, 0), "z = -1");
  assert.equal(v(r, 1), "p = -3، p = -2");
  close(v(r, 3), 1 / 6);
  assert.equal(v(r, 4), 1);
  const o = tf("1/(s^2+4)");
  assert.equal(v(o, 1), "p = 0 ± 2j");
  assert.match(v(o, 2), /حدياً/);
  assert.match(v(tf("1/(s-1)"), 2), /غير مستقر/);
  assert.match(v(tf("1/(s^2+1)^2"), 2), /مكرر/);
  assert.equal(v(tf("5/(s(s+1))"), 3), Infinity);
  assert.equal(v(tf("1/(s+1e6)"), 1), "p = -1000000");
  close(v(tf("1e-6/(s+1e-3)"), 3), 1e-3);
});

test("ζ و ωn لزوج الأقطاب المركب", () => {
  const r = tf("25/(s^2 + 6s + 25)");
  const row = r.blocks[0].rows[0];
  assert.equal(row[2], "5");
  assert.equal(row[3], "0.6");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => tf("s + 1"), "G");
  throwsInput(() => tf("sin(s)/s"), "G");
  throwsInput(() => tf("0/(s+1)"), "G");
  throwsInput(() => tf(""), "G");
  throwsInput(() => tf("1/(x+1)"), "G");
});

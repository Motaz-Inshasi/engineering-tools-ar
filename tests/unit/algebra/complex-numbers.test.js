import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/algebra/complex-numbers.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const run = (op, z1, z2, n) => mod.solve({ op, z1, z2, n });

test("عمليات معروفة", () => {
  assert.equal(run("add", "1+2j", "3-5j").results[0].text, "4 - 3j");
  assert.equal(run("sub", "1+2j", "3-5j").results[0].text, "-2 + 7j");
  assert.equal(run("div", "-5+10j", "3+4j").results[0].text, "1 + 2j");
  assert.equal(run("pow", "1+j", "", "2").results[0].text, "2j");
  assert.equal(run("conj", "3+4j").results[0].text, "3 - 4j");
  const c = run("convert", "3+4j");
  close(c.results[2].value, 5);
  close(c.results[3].value, 53.13010235415598);
  const p = run("convert", "2∠90");
  assert.equal(p.results[0].text, "2j");
  close(run("convert", "-1e-9-1e-9j").results[2].value, Math.SQRT2 * 1e-9);
  close(run("mul", "1e6j", "1e6j").results[2].value, 1e12);
});

test("الجذور", () => {
  const r = run("roots", "-8", "", "3");
  assert.match(r.results[0].value, /1 \+ 1\.7320508j/);
  assert.match(r.results[0].value, /-2/);
  assert.equal(run("roots", "1", "", "4").results[0].value, "1، j، -1، -j");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => run("div", "1", "0"), "z2");
  throwsInput(() => run("add", "1+", "2"), "z1");
  throwsInput(() => run("roots", "1", "", "0"), "n");
  throwsInput(() => run("pow", "0", "", "-1"), "n");
  throwsInput(() => run("add", "abc", "1"), "z1");
});

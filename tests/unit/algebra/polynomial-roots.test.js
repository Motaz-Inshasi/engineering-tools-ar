import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/algebra/polynomial-roots.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const roots = (c) => mod.solve({ c }).results[0].value;

test("جذور معروفة", () => {
  assert.equal(roots("1 0 -4"), "x = -2، x = 2");
  assert.equal(roots("1 0 1"), "x = -j، x = j");
  assert.equal(roots("2 -3"), "x = 1.5");
  assert.equal(roots("1 -3 3 -1"), "x = 1 (مكرر 3)");
  assert.equal(roots("1 0 0 0 -16"), "x = -2، x = -2j، x = 2j، x = 2");
  assert.equal(roots("0 0 1 -5"), "x = 5");
  assert.equal(roots("1 0 0"), "x = 0 (مكرر 2)");
  const r = mod.solve({ c: "1 -2 -5 6" });
  assert.equal(r.results[1].value, 3);
});

test("الجذور النسبية بالقسمة التركيبية", () => {
  const rr = mod.rationalRoots([2, -3, -11, 6]);
  assert.deepEqual(rr.found.sort((a, b) => a - b), [-2, 0.5, 3]);
  assert.equal(mod.rationalRoots([1.5, 2]), null);
});

test("درجات عالية ومعاملات كبيرة وصغيرة", () => {
  const r = mod.solve({ c: "1 0 0 0 0 0 0 0 0 0 -1" });
  assert.equal(r.results[0].value.split("،").length, 10);
  const big = mod.solve({ c: "1 -1e6 0" });
  assert.match(big.results[0].value, /1000000/);
  const tiny = mod.solve({ c: "1 -1e-6" });
  assert.equal(tiny.results[0].value, "x = 1e-6");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ c: "0 0 5" }), "c");
  throwsInput(() => mod.solve({ c: "5" }), "c");
  throwsInput(() => mod.solve({ c: "1 x 2" }), "c");
  throwsInput(() => mod.solve({ c: "1 2 3 4 5 6 7 8 9 10 11 12" }), "c");
});

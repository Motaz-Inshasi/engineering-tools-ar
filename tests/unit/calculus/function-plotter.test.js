import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/calculus/function-plotter.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

test("الجذور ونقطة التقاطع", () => {
  const r = mod.findRoots(Math.sin, -7, 7);
  assert.equal(r.length, 5);
  close(r[0], -2 * Math.PI, 1e-10);
  close(r[2], 0);
  assert.deepEqual(mod.findRoots((x) => x * x + 1, -5, 5), []);
  assert.deepEqual(mod.findRoots((x) => 1 / x, -1, 1), []);
  const big = mod.findRoots((x) => x - 5e5, 0, 1e6);
  close(big[0], 5e5);
  const res = mod.solve({ f1: "x^2 - 1", xmin: "-3", xmax: "3" });
  assert.match(res.results[1].value, /f\(0\) = -1/);
  assert.equal(res.blocks[0].series.length, 2);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ f1: "", xmin: "0", xmax: "1" }), "f1");
  throwsInput(() => mod.solve({ f1: "x", xmin: "1", xmax: "1" }), "xmax");
  throwsInput(() => mod.solve({ f1: "x", xmin: "0", xmax: "1", ymin: "2", ymax: "1" }), "ymax");
  throwsInput(() => mod.solve({ f1: "x", f2: "x+", xmin: "0", xmax: "1" }), "f2");
  throwsInput(() => mod.solve({ f1: "x", xmin: "0", xmax: "1e9" }), "xmax");
});

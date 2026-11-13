import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/elementary-math/gcd-lcm.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const run = (numList) => mod.solve({ numList }).results.map((r) => r.value);

test("قيم معروفة", () => {
  assert.deepEqual(run("48, 180"), ["12", "720"]);
  assert.deepEqual(run("12, 18, 30"), ["6", "180"]);
  assert.deepEqual(run("1071 462"), ["21", "23562"]);
  assert.deepEqual(run("7, 13"), ["1", "91"]);
  assert.deepEqual(run("4, 6, 8, 10"), ["2", "120"]);
});

test("أعداد كبيرة حتى 10^15 بدقة تامة", () => {
  const a = 999999999999999n;
  const b = 1000000000000000n;
  assert.deepEqual(run(`${a}, ${b}`), ["1", (a * b).toString()]);
  assert.deepEqual(run("1000000000000000, 375"), ["125", "3000000000000000"]);
});

test("جدول خطوات إقليدس للعددين 48 و 180", () => {
  const t = mod.solve({ numList: "48, 180" }).blocks[0];
  assert.deepEqual(t.rows[0], ["180", "48", "3", "36", "180 = 3·48 + 36"]);
  assert.deepEqual(t.rows[1], ["48", "36", "1", "12", "48 = 1·36 + 12"]);
  assert.deepEqual(t.rows[2], ["36", "12", "3", "0", "36 = 3·12 + 0"]);
});

test("التحليل إلى العوامل يعطي الأسس الصغرى والكبرى", () => {
  const t = mod.solve({ numList: "48, 180" }).blocks[1];
  assert.deepEqual(t.rows[0], ["2", "4", "2", "2", "4"]);
  assert.deepEqual(t.rows[1], ["3", "1", "2", "1", "2"]);
  assert.deepEqual(t.rows[2], ["5", "0", "1", "0", "1"]);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ numList: "48, 0" }), "numList");
  throwsInput(() => mod.solve({ numList: "1" }), "numList");
  throwsInput(() => mod.solve({ numList: "2.5, 4" }), "numList");
  throwsInput(() => mod.solve({ numList: "1,2,3,4,5,6,7,8,9,10,11" }), "numList");
  throwsInput(() => mod.solve({ numList: "" }), "numList");
});

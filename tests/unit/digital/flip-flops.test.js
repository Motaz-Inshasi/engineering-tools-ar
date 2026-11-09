import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/digital/flip-flops.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const seq = (type, q, s) => mod.solve({ type, q0: q, seq: s }).results[0].value;

test("قيم معروفة", () => {
  assert.equal(seq("D", "0", "1\n0\n1\n1"), "Q = 1, 0, 1, 1");
  assert.equal(seq("T", "0", "1\n1\n0\n1"), "Q = 1, 0, 0, 1");
  assert.equal(seq("SR", "1", "0 0\n0 1\n1 0"), "Q = 1, 0, 1");
  assert.equal(seq("JK", "1", "1 1\n1 1\n1 1"), "Q = 0, 1, 0");
  assert.equal(seq("JK", "0", "0 0"), "Q = 0");
  assert.equal(seq("T", "1", Array(64).fill("1").join("\n")).split(", ").length, 64);
});

test("تحقق مستقل: الحالة التالية تحقق جدول الإثارة لكل انتقال", () => {
  const EXC = { D: { "00": [[0]], "01": [[1]], "10": [[0]], "11": [[1]] }, T: { "00": [[0]], "01": [[1]], "10": [[1]], "11": [[0]] } };
  for (const type of ["D", "T"]) for (const q of [0, 1]) for (const x of [0, 1]) {
    const nq = mod.next(type, q, [x]);
    assert.ok(EXC[type][`${q}${nq}`].some((v) => v[0] === x));
  }
  for (const q of [0, 1]) for (const j of [0, 1]) for (const k of [0, 1]) {
    const nq = mod.next("JK", q, [j, k]);
    const need = { "00": [0, null], "01": [1, null], "10": [null, 1], "11": [null, 0] }[`${q}${nq}`];
    assert.ok((need[0] === null || need[0] === j) && (need[1] === null || need[1] === k));
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ type: "SR", q0: "0", seq: "1 1" }), "seq");
  throwsInput(() => mod.solve({ type: "JK", q0: "0", seq: "1" }), "seq");
  throwsInput(() => mod.solve({ type: "D", q0: "0", seq: "2" }), "seq");
  throwsInput(() => mod.solve({ type: "D", q0: "0", seq: "" }), "seq");
  throwsInput(() => mod.solve({ type: "D", q0: "5", seq: "1" }), "q0");
});

import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/digital/logic-gates.js";
import { parseBool, evalBool } from "../../../lib/core/boolean.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

test("قيم معروفة", () => {
  assert.equal(mod.gate("AND", [1, 1, 1]), 1);
  assert.equal(mod.gate("AND", [1, 0]), 0);
  assert.equal(mod.gate("NOR", [0, 0, 0, 0, 0, 0, 0, 0]), 1);
  assert.equal(mod.gate("XNOR", [1, 1]), 1);
  assert.equal(mod.gate("NOT", [1]), 0);
  assert.equal(mod.gate("BUF", [0]), 0);
  assert.equal(mod.gate("XOR", [1, 1, 1]), 1);
});

test("تحقق مستقل: كل بوابة تطابق تعبيرها الجبري في المحلل المنطقي", () => {
  const ex = { AND: "A B C", OR: "A + B + C", NAND: "(A B C)'", NOR: "(A + B + C)'", XOR: "A ^ B ^ C", XNOR: "(A ^ B ^ C)'" };
  for (const [g, e] of Object.entries(ex)) {
    const tree = parseBool(e);
    for (let m = 0; m < 8; m++) {
      const b = [(m >> 2) & 1, (m >> 1) & 1, m & 1];
      assert.equal(mod.gate(g, b), evalBool(tree, { A: b[0], B: b[1], C: b[2] }) ? 1 : 0, `${g} ${b}`);
    }
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ gate: "AND", bits: "1 2" }), "bits");
  throwsInput(() => mod.solve({ gate: "NOT", bits: "1 0" }), "bits");
  throwsInput(() => mod.solve({ gate: "AND", bits: "1" }), "bits");
  throwsInput(() => mod.solve({ gate: "AND", bits: "1 1 1 1 1 1 1 1 1" }), "bits");
  throwsInput(() => mod.solve({ gate: "MAYBE", bits: "1 1" }), "gate");
});

import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/dc-circuits/nodal-analysis.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const V = (net) => mod.solve({ net }).copy;

test("دوائر كتابية", () => {
  assert.equal(V("V1 1 0 10\nR1 1 2 1k\nR2 2 0 1k"), "V(1) = 10 V\nV(2) = 5 V");
  assert.equal(V("I1 0 1 1m\nR1 1 0 1k"), "V(1) = 1 V");
  assert.equal(V("I1 0 1 3\nR1 1 0 2\nR2 1 2 2\nR3 2 0 2"), "V(1) = 4 V\nV(2) = 2 V");
  assert.equal(V("V1 1 0 1e-3\nR1 1 0 1e9"), "V(1) = 1 mV");
  assert.equal(V("V1 a gnd 5\nV2 b a 3\nR1 b gnd 8"), "V(a) = 5 V\nV(b) = 8 V");
});

test("التحقق ضمن الخطوات والجدول", () => {
  const r = mod.solve({ net: "V1 1 0 12\nR1 1 2 2k\nR2 2 0 4k\nR3 2 3 1k\nI1 0 3 2m\nR4 3 0 3k" });
  assert.ok(r.steps.some((s) => (typeof s === "string" ? s : s.text || "").includes("KCL")));
  assert.equal(r.blocks[0].rows.length, 6);
  assert.equal(r.blocks[0].rows[0][5], "يولّد");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ net: "V1 1 0 5\nR1 2 3 10" }), "net");
  throwsInput(() => mod.solve({ net: "" }), "net");
  throwsInput(() => mod.solve({ net: "R1 1 2 5" }), "net");
  throwsInput(() => mod.solve({ net: "V1 1 0 5\nV2 1 0 3\nR1 1 0 1" }), "net");
  throwsInput(() => mod.solve({ net: "R1 1 0 abc" }), "net");
});

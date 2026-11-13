import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/materials/material-properties.js";
import { MATERIALS } from "../../../lib/materials/data.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const get = (res, part) => res.results.find((r) => r.label.includes(part)).value;

test("بيانات المواد كاملة وقيم مرجعية معروفة", () => {
  assert.ok(MATERIALS.length >= 18);
  for (const m of MATERIALS) {
    for (const k of ["id", "ar", "en", "E", "uts", "density", "alpha", "k", "poisson"]) assert.ok(k in m, `${m.id}.${k}`);
    assert.ok(m.yield === null || m.yield > 0, `${m.id} yield`);
  }
  const a36 = MATERIALS.find((m) => m.id === "a36");
  assert.equal(a36.E, 200);
  assert.equal(a36.yield, 250);
  assert.equal(a36.density, 7850);
  const al = MATERIALS.find((m) => m.id === "al6061");
  assert.equal(al.E, 69);
  assert.equal(al.yield, 276);
});

test("المقاومة النوعية والمعامل النوعي لفولاذ A36", () => {
  const res = mod.solve({ mat: "a36", cmp: "none" });
  assert.equal(get(res, "المقاومة النوعية"), "31.85 kJ/kg");
  assert.equal(get(res, "المعامل النوعي"), "25.48 MJ/kg");
});

test("مقارنة مادتين تعطي نسبة المقاومة النوعية الصحيحة", () => {
  const res = mod.solve({ mat: "a36", cmp: "al6061" });
  const ratio = (250 / 7850) / (276 / 2700);
  assert.ok(res.copy.includes(`نسبة المقاومة النوعية = ${ratio.toPrecision(3)}`), res.copy);
  assert.ok(res.blocks[0].head.length === 5);
});

test("مقارنة المادة بنفسها مرفوضة برسالة واضحة", () => {
  throwsInput(() => mod.solve({ mat: "copper", cmp: "copper" }), "cmp");
  const res = mod.solve({ mat: "copper", cmp: "a36" });
  assert.ok(res.copy.includes("نسبة المقاومة النوعية"), res.copy);
});

test("القيم غير المنطبقة تظهر بوضوح مع ملاحظة", () => {
  const res = mod.solve({ mat: "concrete", cmp: "none" });
  assert.equal(get(res, "مقاومة الخضوع"), "غير منطبق");
  assert.equal(get(res, "المقاومة النوعية"), "غير منطبق");
  assert.ok(res.blocks.some((b) => b.type === "note"));
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ mat: "unknown", cmp: "none" }), "mat");
  throwsInput(() => mod.solve({ mat: "a36", cmp: "bogus" }), "cmp");
});

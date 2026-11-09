import { test } from "node:test";
import { assert, close, throwsInput, rng } from "../helpers.js";
import { SERIES, nearest, decadeValues } from "../../../lib/core/eseries.js";
import { parseBool, truthTable, quineMcCluskey, sopEval, evalBool } from "../../../lib/core/boolean.js";

test("جداول E القياسية متسقة", () => {
  assert.equal(SERIES.E12.length, 12); assert.equal(SERIES.E24.length, 24); assert.equal(SERIES.E96.length, 96); assert.equal(SERIES.E192.length, 192);
  assert.deepEqual(SERIES.E96, SERIES.E192.filter((_, i) => i % 2 === 0));
  assert.deepEqual(SERIES.E48, SERIES.E96.filter((_, i) => i % 2 === 0));
  assert.ok(SERIES.E12.every((v) => SERIES.E24.includes(v)));
  assert.ok(SERIES.E6.every((v) => SERIES.E12.includes(v)));
  assert.ok(SERIES.E192.includes(920));
});

test("أقرب قيمة قياسية", () => {
  assert.deepEqual(nearest(4321, "E12"), { below: 3900, above: 4700, closest: 4700 });
  assert.deepEqual(nearest(1000, "E24"), { below: 1000, above: 1000, closest: 1000 });
  assert.equal(nearest(0.149, "E12").above, 0.15);
  assert.equal(nearest(9.9e6, "E12").above, 10e6);
  assert.equal(nearest(-1, "E12"), null);
  assert.ok(decadeValues("E12", 0, 2).includes(820));
  assert.ok(!decadeValues("E12", 0, 1).includes(820));
});

test("المحلل المنطقي", () => {
  const env = { A: 1, B: 0, C: 1 };
  assert.equal(evalBool(parseBool("AB + C"), env), true);
  assert.equal(evalBool(parseBool("A'B'"), env), false);
  assert.equal(evalBool(parseBool("(A + B)'"), env), false);
  assert.equal(evalBool(parseBool("A ^ C"), env), false);
  assert.equal(evalBool(parseBool("NOT B AND A"), env), true);
  assert.equal(evalBool(parseBool("!(A & !C) | 0"), env), true);
  assert.deepEqual(truthTable(parseBool("A + B")).minterms, [1, 2, 3]);
  throwsInput(() => parseBool("A + (B"));
  throwsInput(() => parseBool("A # B"));
  throwsInput(() => parseBool(""));
});

test("تحقق مستقل: التبسيط بكواين-ماكلاسكي يطابق الدالة الأصلية لدوال عشوائية", () => {
  const rand = rng(77);
  for (let t = 0; t < 150; t++) {
    const n = 1 + Math.floor(rand() * 6);
    const ms = [], ds = [];
    for (let m = 0; m < 1 << n; m++) { const r = rand(); if (r < 0.4) ms.push(m); else if (r < 0.5) ds.push(m); }
    const q = quineMcCluskey(ms, ds, n);
    for (let m = 0; m < 1 << n; m++) if (!ds.includes(m)) assert.equal(sopEval(q.cover, n, m), ms.includes(m), `n=${n} m=${m}`);
  }
});

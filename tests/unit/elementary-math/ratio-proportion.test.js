import { test } from "node:test";
import { assert, close, throwsInput, checkExample, rng } from "../helpers.js";
import * as mod from "../../../lib/elementary-math/ratio-proportion.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const base = { mode: "simplify", ratio: "", total: "", a: "", b: "", c: "", d: "", x1: "", y1: "", x2: "" };
const run = (o) => mod.solve({ ...base, ...o }).results;

test("تبسيط النسبة إلى أعداد صحيحة في أبسط صورة", () => {
  assert.equal(run({ ratio: "2:3:5" })[0].value, "2 : 3 : 5");
  assert.equal(run({ ratio: "0.5:1.25" })[0].value, "2 : 5");
  assert.equal(run({ ratio: "12:18" })[0].value, "2 : 3");
  assert.equal(run({ ratio: "1.5:0.5:2" })[0].value, "3 : 1 : 4");
  assert.equal(run({ ratio: "0.2:0.3" })[0].value, "2 : 3");
  assert.equal(run({ ratio: "100:1000" })[0].value, "1 : 10");
});

test("قسمة المبلغ بنسبة معطاة", () => {
  const r = run({ mode: "divide", ratio: "2:3:5", total: "1200" });
  assert.deepEqual(r.map((x) => x.value), ["240", "360", "600"]);
  assert.deepEqual(run({ mode: "divide", ratio: "1:1:2", total: "1000" }).map((x) => x.value), ["250", "250", "500"]);
  assert.deepEqual(run({ mode: "divide", ratio: "0.5:1", total: "30" }).map((x) => x.value), ["10", "20"]);
  const total = 777;
  const shares = run({ mode: "divide", ratio: "4:7:9", total: String(total) }).map((x) => Number(x.value));
  close(shares.reduce((s, v) => s + v, 0), total, 1e-9, "shares sum");
});

test("حل التناسب a/b = c/d لكل حد مجهول", () => {
  assert.equal(run({ mode: "solve", a: "", b: "3", c: "4", d: "6" })[0].value, "2");
  assert.equal(run({ mode: "solve", a: "2", b: "", c: "4", d: "6" })[0].value, "3");
  assert.equal(run({ mode: "solve", a: "2", b: "3", c: "", d: "6" })[0].value, "4");
  assert.equal(run({ mode: "solve", a: "2", b: "3", c: "4", d: "" })[0].value, "6");
  assert.equal(run({ mode: "solve", a: "2", b: "3", c: "4", d: "" })[1].value, "2/3 = 4/6");
});

test("التناسب الطردي والعكسي", () => {
  assert.equal(run({ mode: "direct", x1: "2", y1: "10", x2: "5" })[0].value, "25");
  assert.equal(run({ mode: "inverse", x1: "5", y1: "12", x2: "6" })[0].value, "10");
  assert.equal(run({ mode: "inverse", x1: "4", y1: "6", x2: "8" })[0].value, "3");
  const rnd = rng(5);
  for (let i = 0; i < 50; i++) {
    const x1 = 1 + Math.floor(rnd() * 20);
    const y1 = 1 + Math.floor(rnd() * 50);
    const x2 = 1 + Math.floor(rnd() * 20);
    const direct = Number(run({ mode: "direct", x1: String(x1), y1: String(y1), x2: String(x2) })[0].value);
    close(direct, (y1 * x2) / x1, 1e-9);
    const inverse = Number(run({ mode: "inverse", x1: String(x1), y1: String(y1), x2: String(x2) })[0].value);
    close(inverse, (y1 * x1) / x2, 1e-9);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ ...base, mode: "simplify", ratio: "2:0" }), "ratio");
  throwsInput(() => mod.solve({ ...base, mode: "simplify", ratio: "2" }), "ratio");
  throwsInput(() => mod.solve({ ...base, mode: "simplify", ratio: "1:2:3:4:5:6" }), "ratio");
  throwsInput(() => mod.solve({ ...base, mode: "divide", ratio: "2:3", total: "0" }), "total");
  throwsInput(() => mod.solve({ ...base, mode: "direct", x1: "0", y1: "3", x2: "2" }), "x1");
  throwsInput(() => mod.solve({ ...base, mode: "inverse", x1: "2", y1: "3", x2: "0" }), "x2");
  throwsInput(() => mod.solve({ ...base, mode: "solve", a: "2", b: "", c: "4", d: "" }), "d");
  throwsInput(() => mod.solve({ ...base, mode: "solve", a: "2", b: "3", c: "4", d: "6" }), "a");
  throwsInput(() => mod.solve({ ...base, mode: "solve", a: "0", b: "3", c: "4", d: "" }), "a");
});

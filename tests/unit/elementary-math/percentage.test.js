import { test } from "node:test";
import { assert, close, throwsInput, checkExample, rng } from "../helpers.js";
import * as mod from "../../../lib/elementary-math/percentage.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const base = { mode: "of", pct: "", base: "", part: "", whole: "", dir: "inc", final: "", from: "", to: "", p1: "", p2: "" };
const run = (o) => mod.solve({ ...base, ...o }).results;

test("الأنماط السبعة بقيم معروفة", () => {
  assert.equal(run({ mode: "of", pct: "20", base: "150" })[0].value, "30");
  assert.equal(run({ mode: "what", part: "30", whole: "150" })[0].value, "20%");
  assert.equal(run({ mode: "change", from: "80", to: "100" })[0].value, "+25%");
  assert.equal(run({ mode: "change", from: "100", to: "80" })[0].value, "-20%");
  assert.equal(run({ mode: "change", from: "100", to: "80" })[2].value, "نقص");
  assert.equal(run({ mode: "add", pct: "15", base: "200" })[0].value, "230");
  assert.equal(run({ mode: "sub", pct: "15", base: "200" })[0].value, "170");
  assert.equal(run({ mode: "reverse", final: "230", pct: "15", dir: "inc" })[0].value, "200");
  assert.equal(run({ mode: "reverse", final: "170", pct: "15", dir: "dec" })[0].value, "200");
  assert.equal(run({ mode: "points", p1: "12", p2: "15" })[0].value, "3 نقطة مئوية");
  assert.equal(run({ mode: "points", p1: "12", p2: "15" })[1].value, "+25%");
});

test("الزيادة ثم العكس تعيد القيمة الأصلية", () => {
  const rnd = rng(11);
  for (let i = 0; i < 100; i++) {
    const y = 1 + Math.floor(rnd() * 5000);
    const x = Math.floor(rnd() * 100);
    const up = Number(run({ mode: "add", pct: String(x), base: String(y) })[0].value);
    const back = Number(run({ mode: "reverse", final: String(up), pct: String(x), dir: "inc" })[0].value);
    close(back, y, 1e-9, `y=${y} x=${x}`);
    const down = Number(run({ mode: "sub", pct: String(x), base: String(y) })[0].value);
    const orig = Number(run({ mode: "reverse", final: String(down), pct: String(x), dir: "dec" })[0].value);
    close(orig, y, 1e-9, `y=${y} x=${x} dec`);
  }
});

test("النسبة المئوية لتغير قيمة تساوي ما يحققه الأصل", () => {
  const r = run({ mode: "change", from: "250", to: "300" });
  assert.equal(r[0].value, "+20%");
  assert.equal(r[1].value, "50");
  assert.equal(run({ mode: "what", part: "1", whole: "4" })[0].value, "25%");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ ...base, mode: "change", from: "0", to: "5" }), "from");
  throwsInput(() => mod.solve({ ...base, mode: "what", part: "5", whole: "0" }), "whole");
  throwsInput(() => mod.solve({ ...base, mode: "sub", pct: "120", base: "50" }), "pct");
  throwsInput(() => mod.solve({ ...base, mode: "reverse", final: "50", pct: "100", dir: "dec" }), "pct");
  throwsInput(() => mod.solve({ ...base, mode: "points", p1: "0", p2: "5" }), "p1");
  throwsInput(() => mod.solve({ ...base, mode: "of", pct: "-5", base: "10" }), "pct");
  throwsInput(() => mod.solve({ ...base, mode: "xyz" }), "mode");
});

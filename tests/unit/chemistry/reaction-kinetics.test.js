import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/chemistry/reaction-kinetics.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const base = { mode: "integrated", order: "1", k: "", A0: "", t: "", k1: "", T1: "", T2: "", Ea: "", k2: "" };
const run = (o) => mod.solve({ ...base, ...o });
const val = (r, i) => Number(String(r.results[i].value).split(" ")[0]);
const findVal = (r, part) => Number(String(r.results.find((x) => x.label.includes(part)).value).split(" ")[0]);

test("الرتبة الأولى: قيم معروفة", () => {
  const r = run({ order: "1", k: "0.1", A0: "1", t: "10" });
  close(val(r, 0), Math.exp(-1), 2e-4, "[A]t = e^-1");
  close(val(r, 1), Math.LN2 / 0.1, 1e-3, "t1/2 = ln2 / k");
  close(val(run({ order: "1", k: "0.1", A0: "1", t: String(Math.LN2 / 0.1) }), 0), 0.5, 1e-3, "[A] at half-life");
});

test("الرتبة الصفرية والثانية", () => {
  close(val(run({ order: "0", k: "0.5", A0: "2", t: "1" }), 0), 1.5, 1e-9, "zero order linear decay");
  close(val(run({ order: "0", k: "0.5", A0: "2", t: "1" }), 1), 2, 1e-9, "zero order half-life A0/2k");
  const z = run({ order: "0", k: "0.5", A0: "2", t: "5" });
  close(val(z, 0), 0, 1e-12, "fully consumed");
  close(findVal(z, "الاستهلاك"), 4, 1e-9, "full consumption time A0/k");
  close(val(run({ order: "2", k: "0.2", A0: "1", t: "5" }), 0), 0.5, 1e-9, "second order [A]t");
  close(val(run({ order: "2", k: "0.2", A0: "1", t: "5" }), 1), 5, 1e-9, "second order half-life");
});

test("أرهينيوس وطاقة التنشيط: تبادل عكسي", () => {
  close(val(run({ mode: "arrhenius", k1: "1", T1: "300", T2: "310", Ea: "50" }), 0), Math.exp((-50000 / 8.314) * (1 / 310 - 1 / 300)), 1e-3, "k2");
  close(val(run({ mode: "arrhenius", k1: "2.5", T1: "300", T2: "300", Ea: "80" }), 0), 2.5, 1e-9, "same temperature");
  close(val(run({ mode: "activation", k1: "1", T1: "300", k2: "2", T2: "310" }), 0), (8.314 * Math.LN2) / (1 / 300 - 1 / 310) / 1000, 1e-3, "Ea from two rates");
  const k2 = val(run({ mode: "arrhenius", k1: "1", T1: "300", T2: "310", Ea: "50" }), 0);
  close(val(run({ mode: "activation", k1: "1", T1: "300", k2: String(k2), T2: "310" }), 0), 50, 1e-3, "round trip Ea");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => run({ order: "1", k: "0", A0: "1", t: "10" }), "k");
  throwsInput(() => run({ order: "1", k: "0.1", A0: "-1", t: "10" }), "A0");
  throwsInput(() => run({ order: "1", k: "0.1", A0: "1", t: "-2" }), "t");
  throwsInput(() => run({ order: "3", k: "0.1", A0: "1", t: "2" }), "order");
  throwsInput(() => run({ mode: "arrhenius", k1: "1", T1: "0", T2: "310", Ea: "50" }), "T1");
  throwsInput(() => run({ mode: "activation", k1: "1", T1: "300", k2: "2", T2: "300" }), "T2");
  throwsInput(() => run({ mode: "activation", k1: "1", T1: "300", k2: "-2", T2: "310" }), "k2");
  assert.ok(run({ order: "2", k: "0.2", A0: "1", t: "0" }).results.length >= 2);
});

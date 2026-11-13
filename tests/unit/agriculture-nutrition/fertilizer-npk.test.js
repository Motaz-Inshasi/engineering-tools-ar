import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/agriculture-nutrition/fertilizer-npk.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const base = { area: "1", areaUnit: "ha", mode: "single", rate: "100", nutrient: "N", fert: "urea", cN: "0", cP: "0", cK: "0", tN: "100", tP: "46", tK: "60" };
const run = (o) => mod.solve({ ...base, ...o }).values;

test("100 كغ N/هكتار من اليوريا على هكتار واحد تعطي 217.39 كغ", () => {
  close(run({}).total, 217.3913043, 1e-8);
  assert.equal(run({}).bags, 5);
});

test("الدونم يساوي 0.1 هكتار", () => {
  close(run({ area: "1", areaUnit: "dunum" }).total, 21.7391304, 1e-8);
});

test("1000 م² من K2O بمعدل 120 باستخدام MOP تعطي 20 كغ", () => {
  close(run({ area: "1000", areaUnit: "m2", nutrient: "K", fert: "mop", rate: "120" }).total, 20, 1e-9);
});

test("DAP لتغطية 50 كغ P2O5 تعطي 108.6957 كغ", () => {
  close(run({ nutrient: "P", fert: "dap", rate: "50" }).total, 108.6956522, 1e-8);
});

test("السماد المخصص يستخدم النسبة المدخلة (20% N)", () => {
  close(run({ fert: "custom", cN: "20" }).perHa, 500, 1e-9);
});

test("خلطة الأهداف N=100 وP=46 وK=60 تعطي DAP 100 وMOP 100 ويوريا 178.26", () => {
  const v = run({ mode: "mix" });
  close(v.dap, 100, 1e-9);
  close(v.mop, 100, 1e-9);
  close(v.urea, 178.2608696, 1e-8);
  close(v.suppliedN, 100, 1e-9);
  close(v.suppliedP, 46, 1e-9);
  close(v.suppliedK, 60, 1e-9);
});

test("إذا تجاوز N القادم من DAP الهدف تصبح اليوريا صفراً", () => {
  const v = run({ mode: "mix", tN: "10", tP: "46", tK: "0" });
  assert.equal(v.urea, 0);
  close(v.dapN, 18, 1e-9);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ ...base, area: "0" }), "area");
  throwsInput(() => mod.solve({ ...base, areaUnit: "xx" }), "areaUnit");
  throwsInput(() => mod.solve({ ...base, fert: "mop" }), "fert");
  throwsInput(() => mod.solve({ ...base, fert: "custom", cN: "0" }), "fert");
  throwsInput(() => mod.solve({ ...base, mode: "mix", tN: "0", tP: "0", tK: "0" }), "tN");
});

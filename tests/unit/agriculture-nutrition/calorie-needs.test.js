import { test } from "node:test";
import { close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/agriculture-nutrition/calorie-needs.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const base = { sex: "male", age: "25", weight: "70", height: "175", activity: "1.55", goal: "0" };
const run = (o) => mod.solve({ ...base, ...o }).values;

test("Mifflin للذكر 25 سنة و70 كغ و175 سم يعطي 1673.75", () => {
  close(run({}).mifflin, 1673.75, 1e-12);
});

test("Mifflin للأنثى 30 سنة و60 كغ و165 سم يعطي 1320.25", () => {
  close(run({ sex: "female", age: "30", weight: "60", height: "165" }).mifflin, 1320.25, 1e-12);
});

test("Harris–Benedict للذكر يعطي 1724.052", () => {
  close(run({}).hb, 1724.052, 1e-9);
});

test("Harris–Benedict للأنثى يعطي 1383.683", () => {
  close(run({ sex: "female", age: "30", weight: "60", height: "165" }).hb, 1383.683, 1e-9);
});

test("الاحتياج اليومي TDEE = BMR × 1.55", () => {
  close(run({}).tdee, 1673.75 * 1.55, 1e-12);
});

test("الهدف يطرح 500 للتخسيس ويضيف 300 للزيادة", () => {
  close(run({ goal: "-500" }).target, 2094.3125, 1e-9);
  close(run({ goal: "300" }).target, 2894.3125, 1e-9);
});

test("توزيع الماكروز لهدف 2594.3125 kcal: بروتين 162.1445 g ودهون 86.4771 g وكربوهيدرات 291.8602 g", () => {
  const v = run({});
  close(v.protein, 162.1445313, 1e-8);
  close(v.fat, 86.4770833, 1e-8);
  close(v.carbs, 291.8601563, 1e-8);
  close(v.protein * 4 + v.fat * 9 + v.carbs * 4, v.target, 1e-9);
});

test("الماء 35 مل لكل كغ: 70 كغ تعطي 2450 مل", () => {
  close(run({}).water, 2450, 1e-12);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ ...base, age: "10" }), "age");
  throwsInput(() => mod.solve({ ...base, age: "101" }), "age");
  throwsInput(() => mod.solve({ ...base, weight: "0" }), "weight");
  throwsInput(() => mod.solve({ ...base, height: "" }), "height");
  throwsInput(() => mod.solve({ ...base, sex: "x" }), "sex");
  throwsInput(() => mod.solve({ ...base, activity: "2" }), "activity");
  throwsInput(() => mod.solve({ ...base, goal: "100" }), "goal");
});

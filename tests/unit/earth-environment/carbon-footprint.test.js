import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/earth-environment/carbon-footprint.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const base = { elec: "0", elecF: "0.5", km: "0", cons: "7", fuel: "gasoline", lpg: "0", flights: "0" };
const run = (o) => mod.solve({ ...base, ...o }).values;

test("1000 km طيران سنوياً تنتج 150 كغ CO2", () => {
  close(run({ flights: "1000" }).total, 150, 1e-9);
});

test("100 km شهرياً بسيارة 7 L/100km بنزين تنتج 194.04 كغ سنوياً", () => {
  close(run({ km: "100" }).eCar, 194.04, 1e-9);
});

test("الديزل ينتج 225.12 كغ لنفس المسافة", () => {
  close(run({ km: "100", fuel: "diesel" }).eCar, 225.12, 1e-9);
});

test("10 kg غاز شهرياً تنتج 357.6 كغ سنوياً", () => {
  close(run({ lpg: "10" }).eLpg, 357.6, 1e-9);
});

test("100 kWh شهرياً بمعامل 0.4 تنتج 480 كغ سنوياً", () => {
  close(run({ elec: "100", elecF: "0.4" }).eEl, 480, 1e-9);
});

test("عدد الأشجار يقرب للأعلى (150 كغ تحتاج 8 أشجار)", () => {
  assert.equal(run({ flights: "1000" }).trees, 8);
});

test("مجموع المصادر يساوي الإجمالي والطن هو الكيلوغرام مقسوماً على 1000", () => {
  const v = run({ elec: "300", km: "1000", lpg: "5", flights: "2000" });
  close(v.total, v.eEl + v.eCar + v.eLpg + v.eFl, 1e-12);
  close(v.tonnes, v.total / 1000, 1e-12);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ ...base }), "elec");
  throwsInput(() => mod.solve({ ...base, elec: "-1" }), "elec");
  throwsInput(() => mod.solve({ ...base, elec: "10", fuel: "xyz" }), "fuel");
  throwsInput(() => mod.solve({ ...base, flights: "-5", elec: "1" }), "flights");
});

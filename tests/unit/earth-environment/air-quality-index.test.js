import { test } from "node:test";
import { assert, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/earth-environment/air-quality-index.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const run = (pollutant, C) => mod.solve({ pollutant, C }).values;

test("PM2.5 بتركيز 35.4 يعطي 100 وبتركيز 12 يعطي 56", () => {
  assert.equal(run("pm25", "35.4").I, 100);
  assert.equal(run("pm25", "12").I, 56);
});

test("حدود PM2.5 تعطي 0 و50 و301 و500", () => {
  assert.equal(run("pm25", "0").I, 0);
  assert.equal(run("pm25", "9").I, 50);
  assert.equal(run("pm25", "225.5").I, 301);
  assert.equal(run("pm25", "325.4").I, 500);
});

test("PM10 بتركيز 100 يعطي 73 (49/99 × 45 + 51 ≈ 73.27)", () => {
  assert.equal(run("pm10", "100").I, 73);
});

test("NO2 بتركيز 150 ppb يعطي 110 (49/259 × 49 + 101 ≈ 110.27)", () => {
  assert.equal(run("no2", "150").I, 110);
});

test("CO بتركيز 9.45 يُقطع إلى 9.4 فيعطي 100", () => {
  const v = run("co", "9.45");
  assert.equal(v.c, 9.4);
  assert.equal(v.I, 100);
});

test("الأوزون 0.0605 يُقطع إلى 0.060 فيعطي 67 (49/0.015 × 0.005 + 51 ≈ 67.33)", () => {
  assert.equal(run("o3", "0.0605").I, 67);
});

test("PM2.5 بتركيز 225 يقع في فئة غير صحي جداً بمؤشر 225", () => {
  const v = run("pm25", "150");
  assert.equal(v.I, 225);
  assert.equal(v.category, "غير صحي جداً");
});

test("التركيز فوق آخر حد يعطي خارج المقياس", () => {
  const res = mod.solve({ pollutant: "pm25", C: "326" });
  assert.equal(resultValue(res, "مؤشر"), "خارج المقياس (أكثر من 500)");
  assert.equal(res.values.I, null);
});

test("فئة المؤشر متوسط عند 35.4 µg/m³", () => {
  assert.equal(run("pm25", "35.4").category, "متوسط");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ pollutant: "pm25", C: "-1" }), "C");
  throwsInput(() => mod.solve({ pollutant: "pm25", C: "" }), "C");
  throwsInput(() => mod.solve({ pollutant: "xx", C: "10" }), "pollutant");
});

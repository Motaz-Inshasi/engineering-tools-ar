import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/medicine/fluid-requirements.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const maint = (weight) => mod.solve({ mode: "maintenance", weight, burn: "" }).results;
const park = (weight, burn) => mod.solve({ mode: "parkland", weight, burn }).results;

test("الصيانة: 25 kg تعطي 1600 mL/day و65 mL/h", () => {
  const r = maint("25");
  assert.equal(r[0].value, "1600 mL/day");
  assert.equal(r[1].value, "65 mL/h");
});

test("الصيانة: 70 kg تعطي 2500 mL/day و110 mL/h", () => {
  const r = maint("70");
  assert.equal(r[0].value, "2500 mL/day");
  assert.equal(r[1].value, "110 mL/h");
});

test("الصيانة: حدود الشرائح عند 5 و15 كغ", () => {
  assert.equal(maint("5")[0].value, "500 mL/day");
  assert.equal(maint("5")[1].value, "20 mL/h");
  assert.equal(maint("15")[0].value, "1250 mL/day");
  assert.equal(maint("15")[1].value, "50 mL/h");
});

test("باركلاند: 80 kg و20% تعطي 6400 mL ومعدلات 400 و200", () => {
  const r = park("80", "20");
  assert.equal(r[0].value, "6400 mL");
  assert.equal(r[1].value, "400 mL/h");
  assert.equal(r[2].value, "200 mL/h");
});

test("الاتساق: معدلات باركلاند تجمع الإجمالي", () => {
  const r = park("100", "40");
  const total = parseFloat(r[0].value);
  const first = parseFloat(r[1].value) * 8;
  const second = parseFloat(r[2].value) * 16;
  assert.ok(Math.abs(first + second - total) < 1e-6);
  assert.ok(Math.abs(first - second) < 1e-6);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ mode: "maintenance", weight: "0", burn: "" }), "weight");
  throwsInput(() => mod.solve({ mode: "xx", weight: "70", burn: "" }), "mode");
  throwsInput(() => mod.solve({ mode: "parkland", weight: "70", burn: "0" }), "burn");
  throwsInput(() => mod.solve({ mode: "parkland", weight: "70", burn: "101" }), "burn");
  throwsInput(() => mod.solve({ mode: "parkland", weight: "70", burn: "" }), "burn");
});

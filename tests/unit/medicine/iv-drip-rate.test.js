import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/medicine/iv-drip-rate.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const run = (volume, hours, minutes, dropFactor) => mod.solve({ volume, hours, minutes, dropFactor }).results;

test("قيم معروفة محسوبة يدوياً", () => {
  const r = run("1000", "8", "0", "15");
  assert.equal(r[0].value, "125 mL/h");
  assert.equal(r[1].value, "31.25 gtt/min");
  assert.equal(r[2].value, "31 gtt/min");
});

test("المدة بالدقائق تُضاف إلى الساعات", () => {
  const r = run("500", "4", "30", "20");
  assert.equal(r[0].value, "111.111 mL/h");
  assert.equal(r[2].value, "37 gtt/min");
});

test("عامل 60 يعطي القطرات مساوية للمعدل", () => {
  const r = run("100", "1", "0", "60");
  assert.equal(r[0].value, "100 mL/h");
  assert.equal(r[2].value, "100 gtt/min");
});

test("الاتساق: القطرات الدقيقة = المعدل × العامل ÷ 60", () => {
  const rate = Number(run("750", "5", "15", "10")[0].value.split(" ")[0]);
  const exact = Number(run("750", "5", "15", "10")[1].value.split(" ")[0]);
  assert.ok(Math.abs(exact - rate * 10 / 60) < 1e-3);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ volume: "0", hours: "8", minutes: "0", dropFactor: "15" }), "volume");
  throwsInput(() => mod.solve({ volume: "1000", hours: "0", minutes: "0", dropFactor: "15" }), "hours");
  throwsInput(() => mod.solve({ volume: "1000", hours: "8", minutes: "60", dropFactor: "15" }), "minutes");
  throwsInput(() => mod.solve({ volume: "1000", hours: "-1", minutes: "0", dropFactor: "15" }), "hours");
  throwsInput(() => mod.solve({ volume: "1000", hours: "8", minutes: "0", dropFactor: "12" }), "dropFactor");
});

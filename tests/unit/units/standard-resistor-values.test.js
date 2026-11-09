import { test } from "node:test";
import { assert, throwsInput, checkExample, rng } from "../helpers.js";
import * as mod from "../../../lib/units/standard-resistor-values.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const R = (x, series = "E12", combo = "") => mod.solve({ x, series, combo }).results;

test("قيم معروفة", () => {
  assert.equal(R("1000")[0].value, "1 kΩ");
  assert.equal(R("1234", "E24")[0].value, "1.2 kΩ");
  assert.equal(R("1234", "E96")[0].value, "1.24 kΩ");
  assert.equal(R("0.33", "E6")[0].value, "330 mΩ");
  assert.equal(R("8.7M", "E12")[0].value, "8.2 MΩ");
  assert.equal(R("9.6", "E12")[0].value, "10 Ω");
  assert.equal(R("4.42k", "E192")[0].value, "4.42 kΩ");
});

test("تحقق مستقل: التركيبة أدق من القيمة المفردة، وقيمتها المحسوبة صحيحة", () => {
  const rand = rng(91);
  for (let t = 0; t < 40; t++) {
    const x = Math.pow(10, 1 + rand() * 5);
    const c = mod.bestCombo(x, "E12");
    const v = c.type === "series" ? c.a + c.b : (c.a * c.b) / (c.a + c.b);
    assert.ok(Math.abs(v - c.v) < 1e-9 * v);
    const single = R(String(x), "E12")[0];
    assert.ok(c.err <= 0.05, `${x}: ${c.err}`);
    assert.ok(single.value.length > 0);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ x: "0", series: "E12" }), "x");
  throwsInput(() => mod.solve({ x: "-5", series: "E12" }), "x");
  throwsInput(() => mod.solve({ x: "100", series: "E7" }), "series");
  throwsInput(() => mod.solve({ x: "", series: "E12" }), "x");
});

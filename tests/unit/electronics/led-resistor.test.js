import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/electronics/led-resistor.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const r = (Vs, Vf, If, n = "1", series = "E12") => mod.solve({ Vs, Vf, If, n, series }).results;

test("قيم معروفة", () => {
  assert.equal(r("5", "2", "20m")[0].value, "150 Ω");
  assert.equal(r("12", "3", "20m", "3")[0].value, "150 Ω");
  assert.equal(r("9", "2", "15m")[1].value, "470 Ω");
  assert.equal(r("3.3", "3", "10m")[0].value, "30 Ω");
  assert.equal(r("24", "3.2", "350m", "5", "E24")[1].value, "24 Ω");
  assert.equal(r("1000", "2", "1m")[1].value, "1 MΩ");
});

test("القيمة المختارة لا تتجاوز التيار المطلوب أبداً", () => {
  for (const Vs of [3.3, 5, 9, 12, 24]) for (const If of [0.005, 0.01, 0.02, 0.03]) {
    const res = mod.solve({ Vs: String(Vs), Vf: "1.8", If: String(If), n: "1", series: "E12" });
    const actual = res.results[2].value;
    const val = Number(actual.split(" ")[0]) * (actual.includes(" mA") ? 1e-3 : actual.includes(" µA") ? 1e-6 : 1);
    assert.ok(val <= If * (1 + 1e-3), `${Vs} ${If}: ${actual}`);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ Vs: "5", Vf: "3", If: "20m", n: "2" }), "n");
  throwsInput(() => mod.solve({ Vs: "5", Vf: "2", If: "0", n: "1" }), "If");
  throwsInput(() => mod.solve({ Vs: "5", Vf: "2", If: "20m", n: "1.5" }), "n");
  throwsInput(() => mod.solve({ Vs: "", Vf: "2", If: "20m", n: "1" }), "Vs");
});

import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/sensors/shunt-resistor.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const R = (Imax, Vsh, Vref = "3.3", N = "12") => mod.solve({ Imax, Vsh, Vref, N }).results;

test("قيم معروفة", () => {
  assert.equal(R("10", "100m")[1].value, "1 W");
  assert.equal(R("10", "100m")[2].value, "2 W");
  assert.equal(R("1", "50m")[0].value, "50 mΩ");
  assert.equal(R("100", "75m")[0].value, "750 µΩ");
  assert.equal(R("1m", "100m")[0].value, "100 Ω");
  assert.equal(R("5", "100m", "5", "10")[4].value, "4.883 mA");
});

test("تحقق مستقل: الدقة × عدد المستويات = أقصى تيار", () => {
  for (const [I, V, N] of [[10, 0.1, 12], [2, 0.05, 16], [100, 0.075, 10]]) {
    const r = mod.solve({ Imax: String(I), Vsh: String(V), Vref: "3.3", N: String(N) }).results;
    const dI = parseFloat(r[4].value) * ({ "mA": 1e-3, "µA": 1e-6, "A": 1, "nA": 1e-9 }[r[4].value.split(" ")[1]]);
    assert.ok(Math.abs(dI * 2 ** N - I) / I < 2e-3);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ Imax: "10", Vsh: "0", Vref: "3.3", N: "12" }), "Vsh");
  throwsInput(() => mod.solve({ Imax: "-1", Vsh: "0.1", Vref: "3.3", N: "12" }), "Imax");
  throwsInput(() => mod.solve({ Imax: "1", Vsh: "0.1", Vref: "3.3", N: "0" }), "N");
  throwsInput(() => mod.solve({ Imax: "1", Vsh: "0.1", Vref: "", N: "12" }), "Vref");
});

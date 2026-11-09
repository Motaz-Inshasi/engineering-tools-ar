import { test } from "node:test";
import { assert, close, throwsInput, checkExample, rng } from "../helpers.js";
import * as mod from "../../../lib/sensors/adc.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const R = (o) => mod.solve({ N: "10", Vref: "5", mode: "v2c", xmin: "", xmax: "", ...o }).results;

test("قيم معروفة", () => {
  assert.equal(R({ Vin: "2.5" })[1].value, 512);
  assert.equal(R({ Vin: "0" })[1].value, 0);
  assert.equal(R({ Vin: "5" })[1].value, 1023);
  assert.equal(R({ N: "8", Vref: "2.56", Vin: "1" })[1].value, 100);
  assert.equal(R({ mode: "c2v", code: "1023" })[3].value, "4.99512 V");
  assert.equal(R({ N: "24", Vref: "2.5", Vin: "1e-6" })[0].value, "149 nV");
  assert.equal(R({ N: "16", Vin: "1" })[4].value, "98.08 dB");
});

test("تحقق مستقل: الكود ثم الجهد ثم الكود يعيد القيمة، وخطأ التكميم أقل من LSB", () => {
  const rand = rng(51);
  for (let t = 0; t < 200; t++) {
    const N = 4 + Math.floor(rand() * 20), Vref = 0.5 + rand() * 10, Vin = rand() * Vref;
    const a = mod.solve({ N: String(N), Vref: String(Vref), mode: "v2c", Vin: String(Vin) }).results;
    const code = a[1].value, lsb = Vref / 2 ** N;
    assert.ok(Vin - code * lsb >= -1e-9 * Vref && Vin - code * lsb < lsb * (1 + 1e-9));
    const b = mod.solve({ N: String(N), Vref: String(Vref), mode: "c2v", code: String(code) }).results;
    assert.equal(b[1].value, code);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ N: "12", Vref: "3.3", mode: "v2c", Vin: "4" }), "Vin");
  throwsInput(() => mod.solve({ N: "0", Vref: "3.3", mode: "v2c", Vin: "1" }), "N");
  throwsInput(() => mod.solve({ N: "12", Vref: "3.3", mode: "c2v", code: "4096" }), "code");
  throwsInput(() => mod.solve({ N: "12", Vref: "3.3", mode: "v2c", Vin: "1", xmin: "5", xmax: "5" }), "xmax");
});

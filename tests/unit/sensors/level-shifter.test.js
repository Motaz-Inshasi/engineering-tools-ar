import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/sensors/level-shifter.js";
import { parseNumber } from "../../../lib/core/format.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const L = (o) => mod.solve({ Vin: "5", Vout: "3.3", R1: "1k", series: "E24", ...o }).results;

test("قيم معروفة", () => {
  assert.equal(L({})[0].value, "1.941 kΩ");
  assert.equal(L({ Vout: "1.8", R1: "10k" })[1].value, "5.6 kΩ");
  assert.equal(L({ Vin: "3.3", Vout: "1.8", R1: "1k", series: "E96" })[1].value, "1.21 kΩ");
  assert.equal(L({ Vin: "12", Vout: "5", R1: "7k" })[1].value, "5.1 kΩ");
  assert.equal(L({ Vin: "24", Vout: "3.3", R1: "100k", Vmax: "3.6" })[1].value, "16 kΩ");
});

test("تحقق مستقل: الجهد الفعلي لا يتجاوز الحد الآمن عند تحديده", () => {
  for (const [Vin, Vt, Vmax] of [[5, 3.3, 3.4], [5, 3.3, 3.6], [12, 3.3, 3.45], [5, 1.8, 1.9]]) {
    for (const R1 of ["1k", "2.2k", "4.7k", "10k"]) {
      const r = mod.solve({ Vin: String(Vin), Vout: String(Vt), R1, series: "E12", Vmax: String(Vmax) }).results;
      const v = parseNumber(r[2].value.replace(" V", "").replace(" mV", "m").replace(/\s/g, ""));
      assert.ok(v <= Vmax + 1e-9, `${Vin}→${Vt} R1=${R1}: ${v}`);
    }
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ Vin: "3.3", Vout: "5", R1: "1k", series: "E24" }), "Vout");
  throwsInput(() => mod.solve({ Vin: "5", Vout: "3.3", R1: "0", series: "E24" }), "R1");
  throwsInput(() => mod.solve({ Vin: "5", Vout: "3.3", R1: "1k", series: "E7" }), "series");
  throwsInput(() => mod.solve({ Vin: "5", Vout: "3.3", R1: "1k", series: "E24", Cin: "-1" }), "Cin");
});

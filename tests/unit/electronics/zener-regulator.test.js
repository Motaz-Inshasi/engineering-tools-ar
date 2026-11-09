import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/electronics/zener-regulator.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const Z = (o) => mod.solve({ Vmin: "10", Vmax: "14", Vz: "5.1", ILmax: "50m", ILmin: "0", Izmin: "5m", ...o }).results;

test("قيم معروفة", () => {
  assert.equal(Z({})[0].value, "89.09 Ω");
  assert.equal(Z({})[1].value, "82 Ω");
  assert.equal(Z({})[2].value, "108.5 mA");
  assert.equal(Z({})[3].value, "553.5 mW");
  assert.match(Z({ Pz: "0.5" })[5].value, /سيحترق/);
  assert.match(Z({ Pz: "1" })[5].value, /مناسب/);
  assert.equal(Z({ ILmax: "0", Izmin: "1m", Vmin: "6", Vz: "5" })[0].value, "1 kΩ");
});

test("تحقق مستقل: عند المقاومة المختارة يبقى تيار الزينر ≥ الحد الأدنى في أسوأ حالة", () => {
  for (const [Vmin, Vz, IL, Izm] of [[10, 5.1, 0.05, 0.005], [7, 3.3, 0.2, 0.01], [20, 12, 0.001, 0.002], [5.5, 5.1, 0.01, 0.001]]) {
    const r = mod.solve({ Vmin: String(Vmin), Vmax: String(Vmin * 1.3), Vz: String(Vz), ILmax: String(IL), Izmin: String(Izm) });
    const Rs = parseFloat(r.results[1].value) * (r.results[1].value.includes("kΩ") ? 1e3 : 1);
    assert.ok((Vmin - Vz) / Rs - IL >= Izm * (1 - 1e-9), `${Vmin} ${Vz}`);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ Vmin: "4", Vmax: "14", Vz: "5.1", ILmax: "50m", Izmin: "5m" }), "Vmin");
  throwsInput(() => mod.solve({ Vmin: "10", Vmax: "8", Vz: "5.1", ILmax: "50m", Izmin: "5m" }), "Vmax");
  throwsInput(() => mod.solve({ Vmin: "10", Vmax: "14", Vz: "5.1", ILmax: "50m", ILmin: "60m", Izmin: "5m" }), "ILmin");
  throwsInput(() => mod.solve({ Vmin: "10", Vmax: "14", Vz: "5.1", ILmax: "50m", Izmin: "0" }), "Izmin");
});

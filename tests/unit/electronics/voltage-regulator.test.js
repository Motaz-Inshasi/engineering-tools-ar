import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/electronics/voltage-regulator.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const base = { Vin: "12", Vout: "5", IL: "500m", Vdo: "2", Iq: "5m", Ta: "40", Tj: "125", tja: "50", tjc: "5", tcs: "0.5" };
const R = (o) => mod.solve({ ...base, ...o }).results;

test("قيم معروفة", () => {
  assert.equal(R({})[0].value, "3.56 W");
  assert.equal(R({})[1].value, "41.25%");
  assert.equal(R({})[2].value, "218 °C");
  assert.equal(R({ IL: "10m", Iq: "0" })[4].value, "لا يحتاج مشتتاً");
  assert.match(R({ IL: "5", Vin: "30" })[4].value, /تبديلياً/);
  assert.equal(R({ Iq: "0", IL: "1", Vin: "5.3", Vout: "5", Vdo: "0.3" })[0].value, "300 mW");
});

test("تحقق مستقل: مع المشتت المحسوب تبلغ حرارة الوصلة الحد الأقصى تماماً", () => {
  for (const o of [{}, { IL: "1", Vin: "9", Vdo: "1" }, { Ta: "60", tjc: "2", tcs: "1" }]) {
    const r = mod.solve({ ...base, ...o });
    const tsaRes = r.results.find((x) => x.label === "أكبر θSA للمشتت");
    if (!tsaRes) continue;
    const tsa = parseFloat(tsaRes.value);
    const PD = parseFloat(r.results[0].value) * (r.results[0].value.includes("mW") ? 1e-3 : 1);
    const p = { ...base, ...o };
    const Tj = Number(p.Ta) + PD * (Number(p.tjc) + Number(p.tcs) + tsa);
    close(Tj, Number(p.Tj), 2e-3);
  }
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ ...base, Vin: "6" }), "Vin");
  throwsInput(() => mod.solve({ ...base, Tj: "30" }), "Tj");
  throwsInput(() => mod.solve({ ...base, tja: "0" }), "tja");
  throwsInput(() => mod.solve({ ...base, IL: "-1" }), "IL");
});

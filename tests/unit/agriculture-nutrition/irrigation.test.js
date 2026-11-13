import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/agriculture-nutrition/irrigation.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const base = { et0: "5", crop: "custom", kc: "1.2", rain: "0", area: "1000", areaUnit: "m2", system: "drip", flow: "" };
const run = (o) => mod.solve({ ...base, ...o }).values;

test("ET0 5 و Kc 1.2 و1000 م² بالتنقيط تعطي 6.667 mm و6667 L يومياً", () => {
  const v = run({});
  close(v.gross, 6.6666667, 1e-7);
  close(v.liters, 6666.6667, 1e-7);
});

test("الاحتياج الصافي يخصم المطر الفعال وتُقسم النتيجة على الكفاءة", () => {
  const v = run({ et0: "4", crop: "olive", kc: "", rain: "1", system: "sprinkler", area: "1", areaUnit: "ha" });
  close(v.etc, 2.8, 1e-9);
  close(v.net, 1.8, 1e-9);
  close(v.gross, 2.4, 1e-9);
  close(v.liters, 24000, 1e-9);
});

test("المطر الأكبر من الاحتياج يعطي صفراً", () => {
  const v = run({ et0: "2", crop: "citrus", kc: "", rain: "5" });
  assert.equal(v.net, 0);
  assert.equal(v.liters, 0);
});

test("الدونم يساوي 1000 م²", () => {
  close(run({ area: "1", areaUnit: "dunum" }).liters, 6666.6667, 1e-6);
});

test("الرش بكفاءة 0.75 يرفع الاحتياج الإجمالي إلى 8 mm", () => {
  close(run({ system: "sprinkler" }).gross, 8, 1e-9);
});

test("زمن الري يساوي الحجم مقسوماً على التدفق", () => {
  close(run({ flow: "1000" }).hours, 6.6666667, 1e-7);
  assert.equal(run({}).hours, null);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => mod.solve({ ...base, area: "0" }), "area");
  throwsInput(() => mod.solve({ ...base, et0: "-1" }), "et0");
  throwsInput(() => mod.solve({ ...base, kc: "-0.5" }), "kc");
  throwsInput(() => mod.solve({ ...base, flow: "0" }), "flow");
  throwsInput(() => mod.solve({ ...base, system: "xyz" }), "system");
  throwsInput(() => mod.solve({ ...base, crop: "xyz" }), "crop");
});

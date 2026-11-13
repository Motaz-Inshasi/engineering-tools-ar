import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/physics/gas-heat.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const run = (o) => mod.solve({ ...mod.meta.example.values, ...o });
const val = (res, key) => parseFloat(res.results.find((x) => x.label.includes(key)).value);

const gasBase = { mode: "gas", P: "", V: "", n: "", T: "" };

test("الغاز: n=1 و T=273.15 و P=101.325 تعطي V ≈ 22.41 L", () => {
  const r = run({ ...gasBase, P: "101.325", n: "1", T: "273.15", V: "" });
  close(val(r, "الحجم V"), 22.4127, 1e-3);
});

test("الغاز: حل الضغط من n=2 و V=44.8 و T=300", () => {
  const r = run({ ...gasBase, P: "", V: "44.8", n: "2", T: "300" });
  close(val(r, "الضغط P"), 2 * 8.314 * 300 / 44.8, 1e-3);
});

test("الغاز: حل درجة الحرارة من P=100 و V=24.942 و n=1", () => {
  const r = run({ ...gasBase, P: "100", V: "24.942", n: "1", T: "" });
  close(val(r, "درجة الحرارة"), 300, 1e-3);
});

test("الغاز: حل عدد المولات ثم التحقق من PV = nRT", () => {
  const r = run({ ...gasBase, P: "202.65", V: "22.4", n: "", T: "273.15" });
  const n = val(r, "عدد المولات");
  close(202.65 * 22.4, n * 8.314 * 273.15, 2e-3);
});

test("الحرارة: m=2 و c=4186 و ΔT=10 تعطي Q = 83720 J", () => {
  const r = run({ mode: "heat", Q: "", m: "2", c: "4186", dT: "10" });
  close(val(r, "الحرارة Q"), 83720, 1e-3);
});

test("الحرارة: حل الكتلة من Q و c و ΔT", () => {
  const r = run({ mode: "heat", Q: "83720", m: "", c: "4186", dT: "10" });
  close(val(r, "الكتلة"), 2, 1e-3);
});

test("الحرارة: ΔT سالب عند التبريد، وحل ΔT من Q و m و c", () => {
  const r = run({ mode: "heat", Q: "", m: "2", c: "4186", dT: "-10" });
  close(val(r, "الحرارة Q"), -83720, 1e-3);
  const s = run({ mode: "heat", Q: "-83720", m: "2", c: "4186", dT: "" });
  close(val(s, "التغير في الحرارة"), -10, 1e-3);
});

test("التمدد: فولاذ طوله 1 m و ΔT=100 يتمدد 1.2 mm", () => {
  const r = run({ mode: "expansion", alpha: "12e-6", L0: "1", dTx: "100" });
  assert.equal(r.results[0].value, "1.2 mm");
  close(val(r, "الطول النهائي"), 1.0012, 1e-9);
});

test("التمدد: التبريد ينقص الطول", () => {
  const r = run({ mode: "expansion", alpha: "12e-6", L0: "1", dTx: "-100" });
  assert.equal(r.results[0].value, "-1.2 mm");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => run({ ...gasBase, P: "101.325", n: "1" }), "V");
  throwsInput(() => run({ ...gasBase, P: "101.325", V: "22.4", n: "1", T: "273.15" }), "T");
  throwsInput(() => run({ mode: "heat", Q: "100", m: "", c: "4186", dT: "0" }), "dT");
  throwsInput(() => run({ mode: "heat", Q: "", m: "0", c: "4186", dT: "10" }), "m");
  throwsInput(() => run({ mode: "expansion", alpha: "0" }), "alpha");
  throwsInput(() => run({ mode: "bad" }), "mode");
});

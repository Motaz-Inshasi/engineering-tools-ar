import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/physics/circular-gravitation.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const run = (o) => mod.solve({ ...mod.meta.example.values, ...o });
const val = (res, key) => parseFloat(res.results.find((x) => x.label.includes(key)).value);

test("حركة دائرية: ω و a_c و F_c و f و T لقيم معروفة", () => {
  const r = run({ mode: "circular", speedBy: "v", rc: "2", vc: "3", mc: "0.5" });
  close(val(r, "السرعة الزاوية"), 1.5, 2e-3);
  close(val(r, "التسارع المركزي"), 4.5, 2e-3);
  close(val(r, "قوة الجذب المركزية"), 2.25, 2e-3);
  close(val(r, "التردد"), 0.238732, 2e-3);
  close(val(r, "الزمن الدوري"), 4.18879, 2e-3);
});

test("عكس: السرعة المحسوبة من الزمن الدوري تعطي النتيجة نفسها", () => {
  const T = 2 * Math.PI * 2 / 3;
  const r = run({ mode: "circular", speedBy: "T", rc: "2", Tc: String(T), mc: "0.5" });
  close(val(r, "السرعة الخطية"), 3, 2e-3);
  close(val(r, "قوة الجذب المركزية"), 2.25, 2e-3);
});

test("قانون الجذب العام: الأرض والقمر ≈ 1.98e20 N", () => {
  const r = run({ mode: "gravity", m1: "5.972e24", m2: "7.348e22", rg: "3.844e8" });
  close(val(r, "قوة الجذب"), 1.98e20, 2e-3);
});

test("المدار: محطة الفضاء الدولية على 400 km تعطي v ≈ 7.67 km/s و T ≈ 92.4 min", () => {
  const r = run({ mode: "orbit", orbBy: "h", ho: "400k" });
  close(val(r, "سرعة المدار"), 7670, 1e-3);
  close(val(r, "بالدقائق"), 92.4, 1e-3);
  close(val(r, "سرعة الإفلات"), Math.SQRT2 * 7672.3, 2e-3);
});

test("عند سطح الأرض: g ≈ 9.82 m/s² و v ≈ 7.91 km/s", () => {
  const r = run({ mode: "orbit", orbBy: "h", ho: "0" });
  close(val(r, "الجاذبية المحلية"), 9.82, 1e-3);
  close(val(r, "سرعة المدار"), 7910, 1e-3);
});

test("الارتفاع ونصف القطر من المركز يعطيان المدار نفسه", () => {
  const a = run({ mode: "orbit", orbBy: "r", ro: "6.771e6" });
  const b = run({ mode: "orbit", orbBy: "h", ho: "400k" });
  close(val(a, "سرعة المدار"), val(b, "سرعة المدار"), 1e-9);
  close(val(a, "الجاذبية المحلية"), val(b, "الجاذبية المحلية"), 1e-9);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => run({ mode: "circular", speedBy: "v", rc: "0" }), "rc");
  throwsInput(() => run({ mode: "circular", speedBy: "T", Tc: "" }), "Tc");
  throwsInput(() => run({ mode: "gravity", m1: "0" }), "m1");
  throwsInput(() => run({ mode: "orbit", orbBy: "h", ho: "-1" }), "ho");
  throwsInput(() => run({ mode: "orbit", orbBy: "r", ro: "1e6" }), "ro");
  throwsInput(() => run({ mode: "bad" }), "mode");
});

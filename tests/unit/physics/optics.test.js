import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/physics/optics.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const run = (o) => mod.solve({ ...mod.meta.example.values, ...o });
const val = (res, key) => parseFloat(res.results.find((x) => x.label.includes(key)).value);
const text = (res, key) => res.results.find((x) => x.label.includes(key)).value;

test("عدسة مجمعة: f=0.1 و do=0.3 تعطي di=0.15 m و m=-0.5 و P=10 D", () => {
  const r = run({ mode: "lens", ot: "lens", f: "0.1", do: "0.3" });
  close(val(r, "بعد الصورة"), 0.15, 1e-3);
  close(val(r, "التكبير"), -0.5, 1e-3);
  close(val(r, "القدرة"), 10, 1e-3);
  assert.equal(text(r, "نوع الصورة"), "حقيقية");
  assert.equal(text(r, "اتجاه الصورة"), "مقلوبة");
  assert.equal(text(r, "حجم الصورة"), "مصغّرة");
});

test("عدسة مجمعة والجسم داخل البؤرة: صورة افتراضية معتدلة مكبّرة", () => {
  const r = run({ mode: "lens", ot: "lens", f: "0.1", do: "0.05" });
  close(val(r, "بعد الصورة"), -0.1, 1e-3);
  close(val(r, "التكبير"), 2, 1e-3);
  assert.equal(text(r, "نوع الصورة"), "افتراضية");
  assert.equal(text(r, "اتجاه الصورة"), "معتدلة");
  assert.equal(text(r, "حجم الصورة"), "مكبّرة");
});

test("مرآة مقعرة: f=0.2 و do=0.5 تعطي di=1/3 m", () => {
  const r = run({ mode: "lens", ot: "mirror", f: "0.2", do: "0.5" });
  close(val(r, "بعد الصورة"), 1 / 3, 1e-3);
  assert.match(r.results[0].label, /المرآة/);
  assert.equal(text(r, "نوع الصورة"), "حقيقية");
  assert.equal(text(r, "اتجاه الصورة"), "مقلوبة");
});

test("عدسة مفرقة: f=-0.1 و do=0.3 تعطي صورة افتراضية معتدلة مصغّرة", () => {
  const r = run({ mode: "lens", ot: "lens", f: "-0.1", do: "0.3" });
  close(val(r, "بعد الصورة"), -0.075, 1e-3);
  close(val(r, "التكبير"), 0.25, 1e-3);
  assert.equal(text(r, "نوع الصورة"), "افتراضية");
  assert.equal(text(r, "حجم الصورة"), "مصغّرة");
});

test("الجسم في البؤرة: الصورة في اللانهاية بلا قيمة لا نهائية", () => {
  const r = run({ mode: "lens", ot: "lens", f: "0.1", do: "0.1" });
  assert.equal(text(r, "بعد الصورة"), "في اللانهاية");
  assert.ok(r.blocks.some((b) => b.type === "note"));
  assert.ok(!/Infinity|NaN/.test(r.copy));
});

test("سنل: n1=1 و θ1=30 و n2=1.5 تعطي θ2 = 19.47°", () => {
  const r = run({ mode: "snell", n1: "1", th1: "30", n2: "1.5" });
  close(val(r, "زاوية الانكسار"), 19.47, 1e-3);
  close(Math.sin(30 * Math.PI / 180), 1.5 * Math.sin(val(r, "زاوية الانكسار") * Math.PI / 180), 2e-3);
});

test("سنل: الزجاج إلى الهواء الزاوية الحرجة 41.81°", () => {
  const r = run({ mode: "snell", n1: "1.5", th1: "30", n2: "1" });
  close(val(r, "الزاوية الحرجة"), 41.81, 1e-3);
  close(val(r, "زاوية الانكسار"), 48.59, 1e-3);
});

test("سنل: زاوية أكبر من الحرجة تعطي انعكاساً كلياً داخلياً", () => {
  const r = run({ mode: "snell", n1: "1.5", th1: "50", n2: "1" });
  assert.match(text(r, "زاوية الانكسار"), /انعكاس كلي داخلي/);
  assert.match(r.copy, /انعكاس كلي داخلي/);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => run({ mode: "lens", f: "0" }), "f");
  throwsInput(() => run({ mode: "lens", do: "-0.3" }), "do");
  throwsInput(() => run({ mode: "snell", n1: "0" }), "n1");
  throwsInput(() => run({ mode: "snell", th1: "90" }), "th1");
  throwsInput(() => run({ mode: "bad" }), "mode");
});

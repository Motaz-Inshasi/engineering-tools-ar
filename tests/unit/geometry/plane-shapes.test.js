import { test } from "node:test";
import { assert, close, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/geometry/plane-shapes.js";

const run = (values) => mod.solve({ ...mod.meta.example.values, ...values });
const num = (s) => Number(s.split(" ")[0]);

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

test("المربع والدائرة: قيم معروفة", () => {
  const sq = run({ shape: "square", s: "5" });
  assert.equal(resultValue(sq, "المساحة"), "25 cm²");
  assert.equal(resultValue(sq, "المحيط"), "20 cm");
  close(num(resultValue(sq, "طول القطر")), 5 * Math.SQRT2, 1e-5);
  const c1 = run({ shape: "circle", cmode: "radius", cval: "1" });
  close(num(resultValue(c1, "المساحة")), Math.PI, 1e-5);
  const c2 = run({ shape: "circle", cmode: "diameter", cval: "10" });
  close(num(resultValue(c2, "المحيط")), 10 * Math.PI, 1e-5);
});

test("الإهليلج بتقريب رامانوجان ومحيطه المرجعي", () => {
  const e = run({ shape: "ellipse", ea: "5", eb: "3" });
  close(num(resultValue(e, "المساحة")), 15 * Math.PI, 1e-5);
  close(num(resultValue(e, "المحيط")), 25.52714, 1e-4);
});

test("المضلع المنتظم: سداسي ضلعه 2", () => {
  const h = run({ shape: "regular-polygon", npoly: "6", ns: "2" });
  close(num(resultValue(h, "المساحة")), 6 * Math.sqrt(3), 1e-5);
  close(num(resultValue(h, "المحيط")), 12, 1e-9);
  close(num(resultValue(h, "الأبوثيم")), Math.sqrt(3), 1e-5);
  close(num(resultValue(h, "المحيطة")), 2, 1e-9);
  assert.equal(resultValue(h, "الزاوية الداخلية"), "120°");
});

test("القطاع الدائري وتوافقه مع الدائرة عند 360 درجة", () => {
  const s = run({ shape: "sector", sr: "2", sang: "90" });
  close(num(resultValue(s, "المساحة")), Math.PI, 1e-5);
  close(num(resultValue(s, "المحيط")), 4 + Math.PI, 1e-5);
  const full = run({ shape: "sector", sr: "3", sang: "360" });
  const circ = run({ shape: "circle", cmode: "radius", cval: "3" });
  close(num(resultValue(full, "المساحة")), num(resultValue(circ, "المساحة")), 1e-5);
  close(num(resultValue(full, "طول القوس")), num(resultValue(circ, "المحيط")), 1e-5);
  close(num(resultValue(full, "المحيط")), 6 + 6 * Math.PI, 1e-5);
});

test("المثلثات: هيرون وقاعدة-ارتفاع والمثلث القائم", () => {
  const s = run({ shape: "triangle", tmode: "sss", t1: "3", t2: "4", t3: "5" });
  assert.equal(resultValue(s, "المساحة"), "6 cm²");
  assert.equal(resultValue(s, "المحيط"), "12 cm");
  assert.match(resultValue(s, "الزوايا"), /36\.87°، 53\.13°، 90°/);
  const bh = run({ shape: "triangle", tmode: "bh", tb: "10", th: "4" });
  assert.equal(resultValue(bh, "المساحة"), "20 cm²");
  assert.ok(!bh.results.some((r) => r.label === "المحيط"));
  const rt = run({ shape: "right-triangle", ra: "3", rb: "4" });
  assert.equal(resultValue(rt, "الوتر"), "5 cm");
  assert.equal(resultValue(rt, "الارتفاع على الوتر"), "2.4 cm");
});

test("شبه المنحرف والمعين والمتوازي", () => {
  const t = run({ shape: "trapezoid", pa: "4", pb: "10", ph: "3" });
  assert.equal(resultValue(t, "المساحة"), "21 cm²");
  const tl = run({ shape: "trapezoid", pa: "4", pb: "10", ph: "4", pl1: "5", pl2: "5" });
  assert.equal(resultValue(tl, "المساحة"), "28 cm²");
  assert.equal(resultValue(tl, "المحيط"), "24 cm");
  const r = run({ shape: "rhombus", d1: "6", d2: "8" });
  assert.equal(resultValue(r, "المساحة"), "24 cm²");
  assert.equal(resultValue(r, "المحيط"), "20 cm");
  const p = run({ shape: "parallelogram", qb: "10", qs: "6", qh: "4" });
  assert.equal(resultValue(p, "المساحة"), "40 cm²");
  assert.equal(resultValue(p, "المحيط"), "32 cm");
});

test("تحويل الوحدة يظهر في النتائج", () => {
  const m = run({ shape: "square", s: "2", unit: "m" });
  assert.equal(resultValue(m, "المساحة"), "4 m²");
  assert.equal(resultValue(m, "المحيط"), "8 m");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => run({ shape: "square", s: "0" }), "s");
  throwsInput(() => run({ shape: "triangle", tmode: "sss", t1: "1", t2: "2", t3: "10" }), "t3");
  throwsInput(() => run({ shape: "regular-polygon", npoly: "2", ns: "1" }), "npoly");
  throwsInput(() => run({ shape: "sector", sr: "2", sang: "400" }), "sang");
  throwsInput(() => run({ shape: "trapezoid", pa: "4", pb: "10", ph: "3", pl1: "5", pl2: "4" }), "pl2");
  throwsInput(() => run({ shape: "parallelogram", qb: "10", qs: "3", qh: "4" }), "qh");
  throwsInput(() => run({ shape: "triangle", tmode: "bh", tb: "10", th: "5", ta: "6", tc: "6" }), "th");
  throwsInput(() => run({ shape: "circle", cmode: "radius", cval: "" }), "cval");
  throwsInput(() => run({ shape: "right-triangle", ra: "-3", rb: "4" }), "ra");
});

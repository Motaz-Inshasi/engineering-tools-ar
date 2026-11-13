import { test } from "node:test";
import { assert, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/everyday-math/paint-tiles.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const paintBase = { mode: "paint", roomL: "4", roomW: "3", roomH: "2.7", doors: "1", doorArea: "2", windows: "2", windowArea: "1.5", ceiling: "1", coats: "2", coverage: "10", floorL: "4", floorW: "3", tileL: "60", tileW: "60", waste: "10", perBox: "" };
const paint = (values) => mod.solve({ ...paintBase, ...values });
const tilesBase = { ...paintBase, mode: "tiles" };
const tiles = (values) => mod.solve({ ...tilesBase, ...values });

test("غرفة 5×4×3 بلا فتحات أو سقف وطبقتين تحتاج 10.8 لتر، أي 3 عبوات 3.6 لتر", () => {
  const res = paint({ roomL: "5", roomW: "4", roomH: "3", doors: "0", windows: "0", ceiling: "" });
  assert.equal(resultValue(res, "مساحة الجدران الصافية"), "54 م²");
  assert.equal(resultValue(res, "كمية الدهان المطلوبة"), "10.8 لتر");
  assert.equal(resultValue(res, "العبوات المقترحة"), "3 × 3.6 لتر");
  assert.equal(resultValue(res, "الفائض"), "0 لتر");
});

test("40 لتر: المزيج 2×18 و2×3.6 يعطي أقل هدر ثم أقل عدد عبوات", () => {
  const res = paint({ roomL: "10", roomW: "10", roomH: "5", doors: "0", windows: "0", ceiling: "" });
  assert.equal(resultValue(res, "كمية الدهان المطلوبة"), "40 لتر");
  assert.equal(resultValue(res, "العبوات المقترحة"), "2 × 18 لتر + 2 × 3.6 لتر");
  assert.equal(resultValue(res, "إجمالي الكمية المشتراة"), "43.2 لتر");
});

test("السقف يضيف مساحته للدهان: الغرفة المثالية تعطي 44.8 م² للطبقة الواحدة", () => {
  const res = paint({});
  assert.equal(resultValue(res, "مساحة الدهان الإجمالية"), "44.8 م²");
  assert.equal(resultValue(res, "مساحة السقف"), "12 م²");
});

test("البلاط: أرضية 4×3 بلاطات 60×60 مع 10% هالك تحتاج 37 بلاطة و4 علب", () => {
  const res = tiles({ perBox: "10" });
  assert.equal(resultValue(res, "مساحة الأرضية"), "12 م²");
  assert.equal(resultValue(res, "عدد البلاط المطلوب"), "37 بلاطة");
  assert.equal(resultValue(res, "عدد العلب"), "4 علبة");
});

test("البلاط بدون هالك ولا علب: 3×3 بلاطات 30×30 تعطي 100 بلاطة بالضبط", () => {
  const res = tiles({ floorL: "3", floorW: "3", tileL: "30", tileW: "30", waste: "0", perBox: "" });
  assert.equal(resultValue(res, "عدد البلاط المطلوب"), "100 بلاطة");
  assert.equal(res.results.some((r) => r.label.includes("العلب")), false);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => paint({ roomL: "0" }), "roomL");
  throwsInput(() => paint({ doors: "1.5" }), "doors");
  throwsInput(() => paint({ coats: "6" }), "coats");
  throwsInput(() => paint({ coverage: "0" }), "coverage");
  throwsInput(() => paint({ roomL: "1", roomW: "1", roomH: "1", doors: "2", ceiling: "" }), "doors");
  throwsInput(() => tiles({ tileL: "0" }), "tileL");
  throwsInput(() => tiles({ waste: "101" }), "waste");
});

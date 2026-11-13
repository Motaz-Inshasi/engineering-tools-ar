import { test } from "node:test";
import { assert, close, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/geometry/solids.js";

const run = (values) => mod.solve({ ...mod.meta.example.values, ...values });
const num = (s) => Number(s.split(" ")[0]);

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

test("المكعب ومتوازي المستطيلات: قيم معروفة", () => {
  const cube = run({ shape: "cube", a: "2" });
  assert.equal(resultValue(cube, "الحجم"), "8 cm³");
  assert.equal(resultValue(cube, "المساحة السطحية"), "24 cm²");
  assert.equal(resultValue(cube, "المساحة الجانبية"), "16 cm²");
  const cub = run({ shape: "cuboid", l: "4", w: "3", h: "5" });
  assert.equal(resultValue(cub, "الحجم"), "60 cm³");
  assert.equal(resultValue(cub, "المساحة السطحية"), "94 cm²");
  assert.equal(resultValue(cub, "المساحة الجانبية"), "70 cm²");
});

test("المخروط: الارتفاع المائل وقيم الحجم والمساحة", () => {
  const cone = run({ shape: "cone", r: "3", h: "4" });
  assert.equal(resultValue(cone, "الارتفاع المائل"), "5 cm");
  close(num(resultValue(cone, "الحجم")), 12 * Math.PI, 1e-5);
  close(num(resultValue(cone, "المساحة الجانبية")), 15 * Math.PI, 1e-5);
  close(num(resultValue(cone, "المساحة السطحية")), 24 * Math.PI, 1e-5);
});

test("الكرة ونصف الكرة والطارة", () => {
  const sp = run({ shape: "sphere", r: "3" });
  close(num(resultValue(sp, "الحجم")), 36 * Math.PI, 1e-5);
  close(num(resultValue(sp, "المساحة السطحية")), 36 * Math.PI, 1e-5);
  const hs = run({ shape: "hemisphere", r: "1" });
  close(num(resultValue(hs, "الحجم")), (2 / 3) * Math.PI, 1e-5);
  close(num(resultValue(hs, "المساحة السطحية")), 3 * Math.PI, 1e-5);
  close(num(resultValue(hs, "المساحة الجانبية")), 2 * Math.PI, 1e-5);
  const tr = run({ shape: "torus", R: "5", r: "2" });
  close(num(resultValue(tr, "الحجم")), 40 * Math.PI * Math.PI, 1e-5);
  close(num(resultValue(tr, "المساحة السطحية")), 40 * Math.PI * Math.PI, 1e-5);
});

test("الهرم والموشور والمخروط المبتور", () => {
  const py = run({ shape: "square-pyramid", a: "6", h: "4" });
  assert.equal(resultValue(py, "الحجم"), "48 cm³");
  assert.equal(resultValue(py, "المساحة الجانبية"), "60 cm²");
  assert.equal(resultValue(py, "المساحة السطحية"), "96 cm²");
  const pr = run({ shape: "prism", n: "6", a: "2", h: "10" });
  close(num(resultValue(pr, "الحجم")), 60 * Math.sqrt(3), 1e-5);
  assert.equal(resultValue(pr, "المساحة الجانبية"), "120 cm²");
  const fr = run({ shape: "frustum", R: "4", r: "2", h: "3" });
  close(num(resultValue(fr, "الحجم")), 28 * Math.PI, 1e-5);
  close(num(resultValue(fr, "المساحة السطحية")), 20 * Math.PI + 6 * Math.sqrt(13) * Math.PI, 1e-5);
});

test("السعة باللتر: cm تقسم على 1000 و m تضرب في 1000", () => {
  assert.equal(resultValue(run({ shape: "cube", a: "2", unit: "cm" }), "السعة"), "0.008 لتر");
  assert.equal(resultValue(run({ shape: "cube", a: "2", unit: "m" }), "السعة"), "8000 لتر");
  assert.ok(!run({ shape: "cube", a: "2", unit: "mm" }).results.some((r) => r.label === "السعة"));
});

test("أخطاء الإدخال", () => {
  throwsInput(() => run({ shape: "cube", a: "0" }), "a");
  throwsInput(() => run({ shape: "cuboid", l: "4", w: "3", h: "-1" }), "h");
  throwsInput(() => run({ shape: "prism", n: "2", a: "2", h: "3" }), "n");
  throwsInput(() => run({ shape: "torus", R: "1", r: "2" }), "R");
  throwsInput(() => run({ shape: "frustum", R: "4", r: "", h: "3" }), "r");
});

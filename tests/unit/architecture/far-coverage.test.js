import { test } from "node:test";
import { assert, close, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/architecture/far-coverage.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const far = (over) => mod.solve({ plot: "500", footprint: "300", mode: "floors", floors: "4", totalArea: "", maxCov: "", maxFar: "", ...over });

test("قطعة 500 ومسقط 300 و4 طوابق: التغطية 60% وFAR = 2.4", () => {
  const v = far({}).values;
  close(v.cov, 60, 1e-9);
  close(v.far, 2.4, 1e-9);
  close(v.total, 1200, 1e-9);
  close(v.open, 200, 1e-9);
});

test("وضع المساحة الإجمالية مباشرة", () => {
  const v = far({ mode: "area", floors: "", totalArea: "1000" }).values;
  close(v.far, 2, 1e-9);
  close(v.total, 1000, 1e-9);
});

test("الحدود المسموحة: أقصى مسقط وأقصى مساحة وأقصى عدد طوابق", () => {
  const v = far({ maxCov: "50", maxFar: "2.5" }).values;
  assert.equal(v.covOk, false);
  assert.equal(v.farOk, true);
  close(v.maxFootprint, 250, 1e-9);
  close(v.maxTotal, 1250, 1e-9);
  assert.equal(v.maxFloors, 4);
});

test("الحكم يشير إلى التجاوز عند تجاوز التغطية", () => {
  const r = far({ maxCov: "50" });
  assert.equal(r.results.find((x) => x.label === "الحكم").value.includes("غير مطابق"), true);
  assert.equal(far({ maxCov: "60" }).values.covOk, true);
});

test("أخطاء الإدخال", () => {
  throwsInput(() => far({ footprint: "600" }), "footprint");
  throwsInput(() => far({ plot: "0" }), "plot");
  throwsInput(() => far({ floors: "0" }), "floors");
  throwsInput(() => far({ mode: "area", floors: "", totalArea: "" }), "totalArea");
  throwsInput(() => far({ maxCov: "120" }), "maxCov");
});

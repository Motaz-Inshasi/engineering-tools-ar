import { test } from "node:test";
import { assert, close, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/biology/hardy-weinberg.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const rec = (pheno, phenoUnit = "fraction") => mod.solve({ mode: "recessive", pheno, phenoUnit });
const counts = (nAA, nAa, naa) => mod.solve({ mode: "counts", nAA: String(nAA), nAa: String(nAa), naa: String(naa) });

test("تكرار الصفة 0.04: q = 0.2 و p = 0.8 و 2pq = 0.32 أي 320 حاملاً لكل 1000", () => {
  const res = rec("0.04");
  assert.equal(resultValue(res, "q"), "0.2");
  assert.equal(resultValue(res, "p"), "0.8");
  assert.equal(resultValue(res, "عدد الحاملين"), "320");
});

test("الصيغة المئوية 4٪ تعطي النتيجة نفسها", () => {
  assert.equal(resultValue(rec("4", "percent"), "عدد الحاملين"), resultValue(rec("0.04"), "عدد الحاملين"));
});

test("مرض وراثي 1/2500: q = 0.02 والحاملون ≈ 39.2 لكل 1000", () => {
  const res = rec(String(1 / 2500));
  assert.equal(resultValue(res, "q"), "0.02");
  close(Number(resultValue(res, "عدد الحاملين")), 39.2, 1e-3);
});

test("counts 30/50/20: p = 0.55 و χ² ≈ 0.0102 (مرجع يدوي)", () => {
  const res = counts(30, 50, 20);
  assert.equal(resultValue(res, "تكرار الأليل A"), "0.55");
  close(Number(resultValue(res, "قيمة χ²")), 0.0102030, 5e-3);
  assert.ok(resultValue(res, "الحكم").includes("لا يوجد"));
});

test("انحراف واضح: 0 / 100 / 0 يعطي χ² = 100 ويُرفض الاتزان", () => {
  const res = counts(0, 100, 0);
  close(Number(resultValue(res, "قيمة χ²")), 100, 1e-9);
  assert.equal(resultValue(res, "الحكم"), "انحراف معنوي");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => rec("1.5"), "pheno");
  throwsInput(() => rec("150", "percent"), "pheno");
  throwsInput(() => rec("-0.1"), "pheno");
  throwsInput(() => counts(-1, 2, 3), "nAA");
  throwsInput(() => counts(0, 0, 0), "nAA");
  throwsInput(() => counts(1.5, 2, 3), "nAA");
});

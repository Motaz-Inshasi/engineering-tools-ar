import { test } from "node:test";
import { assert, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/personal-finance/zakat.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const base = { cash: "0", goldG: "0", karat: "24", silverG: "0", trade: "0", receivables: "0", invest: "0", debts: "0", goldPrice: "", silverPrice: "1", basis: "silver" };
const calc = (values) => mod.solve({ ...base, ...values });

test("نصاب الفضة 595 غراماً والزكاة 2.5% من المال الصافي", () => {
  const res = calc({ cash: "10000" });
  assert.equal(resultValue(res, "قيمة النصاب"), "595.00");
  assert.equal(resultValue(res, "الزكاة المستحقة"), "250.00");
  assert.equal(resultValue(res, "الحالة"), "بلغ النصاب");
});

test("الذهب يُحوَّل إلى عيار 24 قبل التقويم: 100 غرام عيار 21 بسعر 60", () => {
  const res = calc({ goldG: "100", karat: "21", goldPrice: "60" });
  assert.equal(resultValue(res, "المال الزكوي الصافي"), "5,250.00");
  assert.equal(resultValue(res, "الزكاة المستحقة"), "131.25");
});

test("نصاب الذهب 85 غراماً من عيار 24 ومال دون النصاب فلا زكاة", () => {
  const res = calc({ cash: "5000", goldPrice: "100", basis: "gold", silverPrice: "" });
  assert.equal(resultValue(res, "قيمة النصاب"), "8,500.00");
  assert.equal(resultValue(res, "الحالة"), "دون النصاب");
  assert.equal(resultValue(res, "الزكاة المستحقة"), "0.00");
});

test("الديون المستحقة تُخصم من الأصول قبل حساب الزكاة", () => {
  const res = calc({ cash: "10000", debts: "2000" });
  assert.equal(resultValue(res, "المال الزكوي الصافي"), "8,000.00");
  assert.equal(resultValue(res, "الزكاة المستحقة"), "200.00");
});

test("حد نصاب الفضة: 600 غرام تجب فيها الزكاة و594 غراماً لا تجب", () => {
  assert.equal(resultValue(calc({ silverG: "600" }), "الزكاة المستحقة"), "15.00");
  assert.equal(resultValue(calc({ silverG: "594" }), "الحالة"), "دون النصاب");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => calc({ cash: "0" }), "cash");
  throwsInput(() => calc({ cash: "-5" }), "cash");
  throwsInput(() => calc({ goldG: "10", goldPrice: "" }), "goldPrice");
  throwsInput(() => calc({ cash: "10000", silverPrice: "" }), "silverPrice");
  throwsInput(() => calc({ silverG: "10", silverPrice: "0" }), "silverPrice");
  throwsInput(() => calc({ basis: "copper" }), "basis");
});

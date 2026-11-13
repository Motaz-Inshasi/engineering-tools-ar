import { test } from "node:test";
import { assert, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/everyday-math/discount-tax.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const base = { mode: "discount", price: "200", discount1: "20", discount2: "", vatPrice: "100", vatRate: "15", vatDir: "add", bill: "300", tip: "10", people: "3" };
const calc = (values) => mod.solve({ ...base, ...values });

test("خصم واحد: 1000 مع خصم 25% تصبح 750", () => {
  const res = calc({ price: "1000", discount1: "25" });
  assert.equal(resultValue(res, "السعر النهائي"), "750.00");
  assert.equal(resultValue(res, "المبلغ الموفر"), "250.00");
  assert.equal(resultValue(res, "إجمالي الخصم الفعلي"), "25%");
});

test("الخصمان المتتاليان لا يُجمعان: 50% ثم 50% تعني خصماً فعلياً 75%", () => {
  const res = calc({ price: "200", discount1: "50", discount2: "50" });
  assert.equal(resultValue(res, "السعر النهائي"), "50.00");
  assert.equal(resultValue(res, "إجمالي الخصم الفعلي"), "75%");
});

test("ضريبة مضافة: 100 مع 15% تعطي 115", () => {
  const res = calc({ mode: "vat", vatPrice: "100", vatRate: "15", vatDir: "add" });
  assert.equal(resultValue(res, "قيمة الضريبة"), "15.00");
  assert.equal(resultValue(res, "المبلغ شامل الضريبة"), "115.00");
});

test("استخراج الضريبة من سعر شامل: 230 مع 15% تعطي 200 قبل الضريبة", () => {
  const res = calc({ mode: "vat", vatPrice: "230", vatRate: "15", vatDir: "remove" });
  assert.equal(resultValue(res, "المبلغ قبل الضريبة"), "200.00");
  assert.equal(resultValue(res, "قيمة الضريبة"), "30.00");
});

test("تقسيم الفاتورة: 300 مع إكرامية 10% على 3 أشخاص", () => {
  const res = calc({ mode: "split" });
  assert.equal(resultValue(res, "إجمالي الفاتورة مع الإكرامية"), "330.00");
  assert.equal(resultValue(res, "نصيب كل شخص"), "110.00");
  assert.equal(resultValue(res, "فرق التقريب"), "0.00");
});

test("تقريب نصيب الفرد للأعلى: 100 على 3 أشخاص تعطي 33.34 ويظهر فرق 0.02", () => {
  const res = calc({ mode: "split", bill: "100", tip: "0", people: "3" });
  assert.equal(resultValue(res, "نصيب كل شخص"), "33.34");
  assert.equal(resultValue(res, "فرق التقريب"), "0.02");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => calc({ discount1: "120" }), "discount1");
  throwsInput(() => calc({ price: "" }), "price");
  throwsInput(() => calc({ mode: "vat", vatRate: "-1" }), "vatRate");
  throwsInput(() => calc({ mode: "split", people: "2.5" }), "people");
  throwsInput(() => calc({ mode: "split", bill: "0" }), "bill");
  throwsInput(() => calc({ mode: "tax" }), "mode");
});

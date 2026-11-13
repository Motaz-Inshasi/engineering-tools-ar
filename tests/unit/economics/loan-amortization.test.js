import { test } from "node:test";
import { assert, close, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/economics/loan-amortization.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const calc = (values) => mod.solve({ P: "100000", r: "6", t: "30", freq: "12", ...values });
const num = (s) => Number(String(s).replace(/,/g, ""));

test("قسط القرض العقاري المعروف", () => {
  const res = calc({});
  assert.equal(resultValue(res, "القسط الدوري"), "599.55");
  close(num(resultValue(res, "إجمالي المدفوع")), 215838.18, 1e-5);
  close(num(resultValue(res, "إجمالي الفائدة")), 115838.18, 1e-5);
  assert.equal(resultValue(res, "عدد الدفعات"), "360");
});

test("قرض سنوي بفائدة 10% لمدتين", () => {
  assert.equal(resultValue(calc({ P: "1000", r: "10", t: "2", freq: "1" }), "القسط الدوري"), "576.19");
});

test("معدل الفائدة الصفري يقسم المبلغ بالتساوي", () => {
  const res = calc({ P: "1200", r: "0", t: "1" });
  assert.equal(resultValue(res, "القسط الدوري"), "100.00");
  assert.equal(resultValue(res, "إجمالي الفائدة"), "0.00");
});

test("جدول السداد يسدد أصل الدين بالكامل ويطابق الفائدة الكلية", () => {
  const rows = calc({ t: "5" }).blocks[0].rows;
  const yearly = rows.slice(0, -1);
  const principal = yearly.reduce((s, r) => s + num(r[2]), 0);
  const interest = yearly.reduce((s, r) => s + num(r[1]), 0);
  assert.ok(Math.abs(principal - 100000) < 0.05, `principal ${principal}`);
  assert.ok(Math.abs(interest - num(resultValue(calc({ t: "5" }), "إجمالي الفائدة"))) < 0.05, `interest ${interest}`);
  assert.equal(yearly[yearly.length - 1][3], "0.00");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => calc({ P: "0" }), "P");
  throwsInput(() => calc({ r: "-1" }), "r");
  throwsInput(() => calc({ t: "0" }), "t");
  throwsInput(() => calc({ t: "1.01" }), "t");
  throwsInput(() => calc({ freq: "5" }), "freq");
});

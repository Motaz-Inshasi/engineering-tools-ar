import { test } from "node:test";
import { assert, close, throwsInput, checkExample, resultValue } from "../helpers.js";
import * as mod from "../../../lib/economics/compound-interest.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const calc = (values) => mod.solve({ P: "1000", r: "5", t: "10", mode: "compound", freq: "12", pmt: "0", ...values });
const num = (s) => Number(String(s).replace(/,/g, ""));

test("قيم معروفة للفائدة المركبة والمستمرة والبسيطة", () => {
  assert.equal(resultValue(calc({}), "القيمة المستقبلية"), "1,647.01");
  assert.equal(resultValue(calc({ freq: "1" }), "القيمة المستقبلية"), "1,628.89");
  assert.equal(resultValue(calc({ freq: "continuous" }), "القيمة المستقبلية"), "1,648.72");
  assert.equal(resultValue(calc({ mode: "simple" }), "القيمة المستقبلية"), "1,500.00");
  assert.equal(resultValue(calc({ mode: "simple" }), "إجمالي الفائدة"), "500.00");
});

test("المساهمات الدورية والمعدل الصفري", () => {
  assert.equal(resultValue(calc({ r: "0", pmt: "10", freq: "4", t: "2", P: "500" }), "القيمة المستقبلية"), "580.00");
  assert.equal(resultValue(calc({ r: "12", pmt: "100", freq: "12", t: "1", P: "0" }), "القيمة المستقبلية"), "1,268.25");
  assert.equal(resultValue(calc({ r: "12", pmt: "100", freq: "12", t: "1", P: "0" }), "إجمالي ما وُضع"), "1,200.00");
});

test("إجمالي الفائدة يساوي القيمة المستقبلية ناقص ما وُضع", () => {
  const res = calc({ r: "7", pmt: "50", freq: "4", t: "3.5", P: "2000" });
  const FV = num(resultValue(res, "القيمة المستقبلية"));
  const contrib = num(resultValue(res, "إجمالي ما وُضع"));
  const interest = num(resultValue(res, "إجمالي الفائدة"));
  assert.equal(contrib, 2700);
  close(FV - contrib, interest, 1e-9);
});

test("جدول الأرقام السنوية يتضمن الكسر الأخير ويطابق النتيجة", () => {
  const rows = calc({ t: "2.5" }).blocks[0].rows;
  assert.equal(rows.length, 3);
  assert.equal(rows[2][0], "2.5");
  assert.equal(rows[0][1], "1,051.16");
  assert.equal(rows[1][1], "1,104.94");
});

test("أخطاء الإدخال", () => {
  throwsInput(() => calc({ P: "-5" }), "P");
  throwsInput(() => calc({ r: "-1" }), "r");
  throwsInput(() => calc({ t: "0" }), "t");
  throwsInput(() => calc({ t: "101" }), "t");
  throwsInput(() => calc({ freq: "continuous", pmt: "5" }), "pmt");
  throwsInput(() => calc({ t: "1.3", pmt: "10" }), "t");
  throwsInput(() => calc({ mode: "weird" }), "mode");
  assert.doesNotThrow(() => calc({ mode: "simple", freq: "continuous", pmt: "5" }));
});
